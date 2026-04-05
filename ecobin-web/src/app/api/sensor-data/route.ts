/**
 * POST /api/sensor-data  (EcoBin v3.2)
 *
 * The main endpoint that the ESP32 EcoBin hardware calls after every
 * waste classification event. This route handles the ENTIRE data pipeline:
 *
 * 1. Authenticate the ESP32 via x-api-key header
 * 2. Validate the request body
 * 3. Look up the user by RFID UID (if card was tapped)
 * 4. Update ALL THREE sector fill levels (organic, inorganic, metal)
 * 5. Award EcoCoins for valid manual sorts
 * 6. Log the waste event
 * 7. Create/clear alerts for full bins AND gas danger
 * 8. Update bins.gas_level and bins.gas_danger
 * 9. Return LED color instruction to the ESP32
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
  fill_level_percent: number; // fill of the classified sector (backward compat)
  organic_fill: number;       // fill of organic sub-bin
  inorganic_fill: number;     // fill of inorganic sub-bin
  metal_fill: number;         // fill of metal sub-bin
  weight_grams: number;
  gas_level: number;          // raw ESP32 ADC value 0–4095
  gas_danger: boolean;        // true = harmful gas detected
}

interface SensorDataResponse {
  status: "ok" | "error";
  led_color: "green" | "red";
  coins_awarded: number;
  message?: string;
}

const VALID_SECTOR_TYPES: SectorType[] = ["organic", "inorganic", "metal"];
const COINS_MANUAL_SORT = 10;
const COINS_AUTO_SORT = 1;
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

    const sectorType      = body.sector_type;
    const weightGrams     = typeof body.weight_grams === "number" ? body.weight_grams : 0;
    const wasManual       = body.was_manual === true;
    const rfidUid         = body.rfid_uid && body.rfid_uid.trim() !== "" ? body.rfid_uid.trim() : null;

    // Per-bin fill levels (default to fill_level_percent for backward compat)
    const organicFill    = typeof body.organic_fill    === "number" ? Math.round(body.organic_fill)    : Math.round(body.fill_level_percent ?? 0);
    const inorganicFill  = typeof body.inorganic_fill  === "number" ? Math.round(body.inorganic_fill)  : Math.round(body.fill_level_percent ?? 0);
    const metalFill      = typeof body.metal_fill      === "number" ? Math.round(body.metal_fill)      : Math.round(body.fill_level_percent ?? 0);

    // Gas data
    const gasLevel   = typeof body.gas_level   === "number"  ? body.gas_level  : 0;
    const gasDanger  = typeof body.gas_danger  === "boolean" ? body.gas_danger : false;

    // Clamp fill percentages
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    const fillMap: Record<SectorType, number> = {
      organic:   clamp(organicFill),
      inorganic: clamp(inorganicFill),
      metal:     clamp(metalFill),
    };

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

    // ── Step D: Update ALL THREE sector fill levels ──
    // This is the key change in v3.2 — we now update all sectors on every event,
    // not just the classified one. This keeps the dashboard accurate.
    const sectorUpdates = (["organic", "inorganic", "metal"] as SectorType[]).map(async (st) => {
      const fillPct = fillMap[st];
      const isFull  = fillPct >= BIN_FULL_THRESHOLD;

      // Get previous state to detect transitions
      const { data: prev } = await serviceClient
        .from("sectors")
        .select("is_full")
        .eq("bin_id", binId)
        .eq("sector_type", st)
        .single();

      const wasFull = prev?.is_full ?? false;

      // Update or insert sector
      const { error: upsertErr } = await serviceClient
        .from("sectors")
        .upsert(
          {
            bin_id:             binId,
            sector_type:        st,
            fill_level_percent: fillPct,
            weight_grams:       st === sectorType ? weightGrams : undefined,
            is_full:            isFull,
            updated_at:         new Date().toISOString(),
          },
          { onConflict: "bin_id,sector_type", ignoreDuplicates: false }
        );

      if (upsertErr) {
        console.error(`[sensor-data] Sector upsert error (${st}):`, upsertErr);
      }

      // Create bin_full alert if newly full
      if (isFull && !wasFull) {
        const { data: existingAlert } = await serviceClient
          .from("alerts")
          .select("id")
          .eq("bin_id", binId)
          .eq("sector_type", st)
          .eq("alert_type", "bin_full")
          .eq("is_read", false)
          .single();

        if (!existingAlert) {
          await serviceClient.from("alerts").insert({
            bin_id:      binId,
            sector_type: st,
            alert_type:  "bin_full",
          });
        }
      }

      // Create bin_cleared alert if was full but now isn't
      if (!isFull && wasFull) {
        await serviceClient.from("alerts").insert({
          bin_id:      binId,
          sector_type: st,
          alert_type:  "bin_cleared",
        });
      }
    });

    // Run all 3 sector updates concurrently
    await Promise.all(sectorUpdates);

    // ── Step E: Award coins for valid manual sort ──
    let coinsEarned = 0;

    if (userId) {
      coinsEarned = wasManual ? COINS_MANUAL_SORT : COINS_AUTO_SORT;

      const { error: coinError } = await serviceClient.rpc("award_coins", {
        p_user_id: userId,
        p_amount:  coinsEarned,
      });

      if (coinError) {
        console.error("[sensor-data] Coin award error:", coinError);
        coinsEarned = 0;
      }
    }

    // ── Step F: Insert waste event ──
    const { error: eventError } = await serviceClient.from("waste_events").insert({
      bin_id:      binId,
      user_id:     userId,
      sector_type: sectorType,
      was_manual:  wasManual,
      was_correct: true,
      coins_earned: coinsEarned,
    });

    if (eventError) {
      console.error("[sensor-data] Waste event insert error:", eventError);
    }

    // ── Step G: Handle gas danger alert ──
    if (gasDanger) {
      const { data: existingGasAlert } = await serviceClient
        .from("alerts")
        .select("id")
        .eq("bin_id", binId)
        .eq("alert_type", "gas_danger")
        .eq("is_read", false)
        .single();

      if (!existingGasAlert) {
        await serviceClient.from("alerts").insert({
          bin_id:      binId,
          sector_type: sectorType,
          alert_type:  "gas_danger",
        });
      }
    } else {
      // Auto-clear any existing gas danger alerts
      await serviceClient
        .from("alerts")
        .update({ is_read: true })
        .eq("bin_id", binId)
        .eq("alert_type", "gas_danger")
        .eq("is_read", false);
    }

    // ── Step H: Update bins table (gas + online status) ──
    await serviceClient
      .from("bins")
      .update({
        is_online:   true,
        last_seen_at: new Date().toISOString(),
        gas_level:   gasLevel,
        gas_danger:  gasDanger,
      })
      .eq("id", binId);

    // ── Step I: Determine LED color ──
    // Red if ANY sector is full OR gas danger is active
    const { data: fullSectors } = await serviceClient
      .from("sectors")
      .select("id")
      .eq("bin_id", binId)
      .eq("is_full", true)
      .limit(1);

    const ledColor: "green" | "red" =
      (fullSectors && fullSectors.length > 0) || gasDanger ? "red" : "green";

    // ── Step J: Return response to ESP32 ──
    return NextResponse.json({
      status:       "ok",
      led_color:    ledColor,
      coins_awarded: coinsEarned,
    });
  } catch (error) {
    console.error("[sensor-data] Unexpected error:", error);
    return NextResponse.json(
      {
        status:       "error",
        led_color:    "green",
        coins_awarded: 0,
        message:      "Internal server error",
      },
      { status: 500 }
    );
  }
}
