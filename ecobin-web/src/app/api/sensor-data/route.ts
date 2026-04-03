/**
 * POST /api/sensor-data
 *
 * The main endpoint that the ESP32 EcoBin hardware calls after every
 * waste classification event. This route handles the ENTIRE data pipeline:
 *
 * 1. Authenticate the ESP32 via x-api-key header
 * 2. Validate the request body
 * 3. Look up the user by RFID UID (if card was tapped)
 * 4. Update the sector's fill level
 * 5. Award EcoCoins for valid manual sorts
 * 6. Log the waste event
 * 7. Create/clear alerts for full bins
 * 8. Return LED color instruction to the ESP32
 *
 * All database operations use the service role client (bypasses RLS)
 * because the ESP32 is not an authenticated Supabase user.
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase/service";

// ════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════

type SectorType = "organic" | "inorganic" | "metal";

interface SensorDataBody {
  rfid_uid: string | null;
  sector_type: SectorType;
  was_manual: boolean;
  fill_level_percent: number;
  weight_grams: number;
}

interface SensorDataResponse {
  status: "ok" | "error";
  led_color: "green" | "red";
  coins_awarded: number;
  message?: string;
}

const VALID_SECTOR_TYPES: SectorType[] = ["organic", "inorganic", "metal"];
const COINS_PER_CORRECT_SORT = 10;
const BIN_FULL_THRESHOLD = 85;

// ════════════════════════════════════════
// ROUTE HANDLER
// ════════════════════════════════════════

export async function POST(request: Request): Promise<NextResponse<SensorDataResponse>> {
  try {
    // ── Step A: Authenticate via API key ──
    const auth = await validateApiKey(request);
    if (!auth.valid || !auth.binId) {
      return NextResponse.json(
        { status: "error", led_color: "green", coins_awarded: 0, message: auth.error },
        { status: auth.error?.includes("Rate limit") ? 429 : 401 }
      );
    }

    const binId = auth.binId;

    // ── Step B: Parse and validate request body ──
    let body: SensorDataBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { status: "error", led_color: "green", coins_awarded: 0, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.sector_type || !VALID_SECTOR_TYPES.includes(body.sector_type)) {
      return NextResponse.json(
        {
          status: "error",
          led_color: "green",
          coins_awarded: 0,
          message: `Invalid sector_type. Must be one of: ${VALID_SECTOR_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (
      typeof body.fill_level_percent !== "number" ||
      body.fill_level_percent < 0 ||
      body.fill_level_percent > 100
    ) {
      return NextResponse.json(
        {
          status: "error",
          led_color: "green",
          coins_awarded: 0,
          message: "fill_level_percent must be a number between 0 and 100",
        },
        { status: 400 }
      );
    }

    const sectorType = body.sector_type;
    const fillPercent = Math.round(body.fill_level_percent);
    const weightGrams = typeof body.weight_grams === "number" ? body.weight_grams : 0;
    const wasManual = body.was_manual === true;
    const rfidUid = body.rfid_uid && body.rfid_uid.trim() !== "" ? body.rfid_uid.trim() : null;

    // ── Step C: Look up user by RFID UID ──
    let userId: string | null = null;

    if (rfidUid) {
      const { data: member } = await serviceClient
        .from("bin_members")
        .select("user_id")
        .eq("bin_id", binId)
        .eq("rfid_uid", rfidUid)
        .single();

      if (member) {
        userId = member.user_id;
      }
    }

    // ── Step D: Update sector fill level ──
    const isFull = fillPercent >= BIN_FULL_THRESHOLD;

    // First, get the previous is_full state to detect transitions
    const { data: previousSector } = await serviceClient
      .from("sectors")
      .select("is_full")
      .eq("bin_id", binId)
      .eq("sector_type", sectorType)
      .single();

    const wasPreviouslyFull = previousSector?.is_full ?? false;

    // Update the sector
    const { error: sectorError } = await serviceClient
      .from("sectors")
      .update({
        fill_level_percent: fillPercent,
        weight_grams: weightGrams,
        is_full: isFull,
        updated_at: new Date().toISOString(),
      })
      .eq("bin_id", binId)
      .eq("sector_type", sectorType);

    if (sectorError) {
      console.error("[sensor-data] Sector update error:", sectorError);
      // If the sector row doesn't exist, create it
      if (sectorError.code === "PGRST116") {
        await serviceClient.from("sectors").insert({
          bin_id: binId,
          sector_type: sectorType,
          fill_level_percent: fillPercent,
          weight_grams: weightGrams,
          is_full: isFull,
        });
      }
    }

    // ── Step E: Award coins for valid manual sort ──
    let coinsEarned = 0;

    if (wasManual && userId) {
      coinsEarned = COINS_PER_CORRECT_SORT;

      const { error: coinError } = await serviceClient.rpc("award_coins", {
        p_user_id: userId,
        p_amount: coinsEarned,
      });

      if (coinError) {
        console.error("[sensor-data] Coin award error:", coinError);
        coinsEarned = 0; // Don't report coins if award failed
      }
    }

    // ── Step F: Insert waste event ──
    const { error: eventError } = await serviceClient.from("waste_events").insert({
      bin_id: binId,
      user_id: userId,
      sector_type: sectorType,
      was_manual: wasManual,
      was_correct: true,
      coins_earned: coinsEarned,
    });

    if (eventError) {
      console.error("[sensor-data] Waste event insert error:", eventError);
    }

    // ── Step G: Create bin_full alert if sector just became full ──
    if (isFull) {
      // Check for existing unread bin_full alert for this sector
      const { data: existingAlert } = await serviceClient
        .from("alerts")
        .select("id")
        .eq("bin_id", binId)
        .eq("sector_type", sectorType)
        .eq("alert_type", "bin_full")
        .eq("is_read", false)
        .single();

      if (!existingAlert) {
        await serviceClient.from("alerts").insert({
          bin_id: binId,
          sector_type: sectorType,
          alert_type: "bin_full",
        });
      }
    }

    // ── Step H: Create bin_cleared alert if sector was full but now isn't ──
    if (!isFull && wasPreviouslyFull) {
      await serviceClient.from("alerts").insert({
        bin_id: binId,
        sector_type: sectorType,
        alert_type: "bin_cleared",
      });
    }

    // ── Step I: Determine LED color ──
    // Check if ANY sector in this bin is full → red LED
    const { data: fullSectors } = await serviceClient
      .from("sectors")
      .select("id")
      .eq("bin_id", binId)
      .eq("is_full", true)
      .limit(1);

    const ledColor: "green" | "red" =
      fullSectors && fullSectors.length > 0 ? "red" : "green";

    // ── Update bin last_seen ──
    await serviceClient
      .from("bins")
      .update({ is_online: true, last_seen_at: new Date().toISOString() })
      .eq("id", binId);

    // ── Step J: Return response to ESP32 ──
    return NextResponse.json({
      status: "ok",
      led_color: ledColor,
      coins_awarded: coinsEarned,
    });
  } catch (error) {
    console.error("[sensor-data] Unexpected error:", error);
    return NextResponse.json(
      {
        status: "error",
        led_color: "green",
        coins_awarded: 0,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
