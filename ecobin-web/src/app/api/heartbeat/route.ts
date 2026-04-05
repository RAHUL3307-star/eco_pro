/**
 * POST /api/heartbeat  (EcoBin v3.2)
 *
 * Called by the ESP32 every 5 minutes (HEARTBEAT_MS = 300000).
 * In v3.2, the heartbeat also carries current sensor data:
 *   - gas_level, gas_danger
 *   - organic_fill, inorganic_fill, metal_fill
 *
 * This keeps the dashboard updated with fill levels and gas status
 * even when no waste has been deposited recently.
 *
 * The ESP32 sends:
 *   POST /api/heartbeat
 *   Headers: { "x-api-key": "bin_api_key_here" }
 *   Body: {
 *     "gas_level": 350,
 *     "gas_danger": false,
 *     "organic_fill": 45,
 *     "inorganic_fill": 72,
 *     "metal_fill": 30
 *   }
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase/service";

type SectorType = "organic" | "inorganic" | "metal";

interface HeartbeatBody {
  gas_level?: number;
  gas_danger?: boolean;
  organic_fill?: number;
  inorganic_fill?: number;
  metal_fill?: number;
}

interface HeartbeatResponse {
  status: "ok" | "error";
  timestamp: string;
  message?: string;
}

const BIN_FULL_THRESHOLD = 85;

export async function POST(request: Request): Promise<NextResponse<HeartbeatResponse>> {
  try {
    const auth = await validateApiKey(request);

    if (!auth.valid || !auth.binId) {
      return NextResponse.json(
        {
          status: "error",
          timestamp: new Date().toISOString(),
          message: auth.error,
        },
        { status: auth.error?.includes("Rate limit") ? 429 : 401 }
      );
    }

    const binId = auth.binId;

    // Parse body — heartbeat now carries sensor data
    let body: HeartbeatBody = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine — old firmware may not send data
      body = {};
    }

    const gasLevel      = typeof body.gas_level      === "number"  ? body.gas_level  : null;
    const gasDanger     = typeof body.gas_danger     === "boolean" ? body.gas_danger : null;
    const organicFill   = typeof body.organic_fill   === "number"  ? Math.min(100, Math.max(0, Math.round(body.organic_fill)))   : null;
    const inorganicFill = typeof body.inorganic_fill === "number"  ? Math.min(100, Math.max(0, Math.round(body.inorganic_fill))) : null;
    const metalFill     = typeof body.metal_fill     === "number"  ? Math.min(100, Math.max(0, Math.round(body.metal_fill)))     : null;

    // ── Update bins table ──
    const binUpdatePayload: Record<string, unknown> = {
      is_online:   true,
      last_seen_at: new Date().toISOString(),
    };
    if (gasLevel   !== null) binUpdatePayload.gas_level  = gasLevel;
    if (gasDanger  !== null) binUpdatePayload.gas_danger = gasDanger;

    const { error: binError } = await serviceClient
      .from("bins")
      .update(binUpdatePayload)
      .eq("id", binId);

    if (binError) {
      console.error("[heartbeat] Bin update error:", binError);
    }

    // ── Update sector fill levels if provided ──
    if (organicFill !== null || inorganicFill !== null || metalFill !== null) {
      const fillMap: Partial<Record<SectorType, number>> = {};
      if (organicFill   !== null) fillMap.organic   = organicFill;
      if (inorganicFill !== null) fillMap.inorganic = inorganicFill;
      if (metalFill     !== null) fillMap.metal      = metalFill;

      const sectorUpdates = (Object.entries(fillMap) as [SectorType, number][]).map(
        async ([st, fill]) => {
          const isFull = fill >= BIN_FULL_THRESHOLD;
          await serviceClient
            .from("sectors")
            .upsert(
              {
                bin_id:             binId,
                sector_type:        st,
                fill_level_percent: fill,
                is_full:            isFull,
                updated_at:         new Date().toISOString(),
              },
              { onConflict: "bin_id,sector_type", ignoreDuplicates: false }
            );
        }
      );
      await Promise.all(sectorUpdates);
    }

    // ── Handle gas danger alert on heartbeat ──
    if (gasDanger !== null) {
      if (gasDanger) {
        const { data: existing } = await serviceClient
          .from("alerts")
          .select("id")
          .eq("bin_id", binId)
          .eq("alert_type", "gas_danger")
          .eq("is_read", false)
          .single();

        if (!existing) {
          await serviceClient.from("alerts").insert({
            bin_id:      binId,
            sector_type: "organic",
            alert_type:  "gas_danger",
            is_read:     false,
          });
        }
      } else {
        // Auto-clear
        await serviceClient
          .from("alerts")
          .update({ is_read: true })
          .eq("bin_id", binId)
          .eq("alert_type", "gas_danger")
          .eq("is_read", false);
      }
    }

    return NextResponse.json({
      status:    "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[heartbeat] Unexpected error:", error);
    return NextResponse.json(
      {
        status:    "error",
        timestamp: new Date().toISOString(),
        message:   "Internal server error",
      },
      { status: 500 }
    );
  }
}
