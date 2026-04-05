/**
 * POST /api/gas-alert
 *
 * Called by the ESP32 whenever the gas danger state changes
 * (danger activates OR clears). This is a dedicated, fast endpoint
 * so danger alerts appear on the dashboard immediately without
 * waiting for the next waste drop cycle.
 *
 * Body: { "gas_level": number, "gas_danger": boolean }
 * Headers: x-api-key (same API key as other endpoints)
 *
 * Actions:
 *  - If gas_danger = true:  Creates a "gas_danger" alert in the alerts table
 *  - If gas_danger = false: Marks all unread gas_danger alerts as read (auto-clear)
 *  - Updates bins.gas_level and bins.gas_danger columns
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase/service";

interface GasAlertBody {
  gas_level: number;
  gas_danger: boolean;
}

export async function POST(request: Request) {
  try {
    // Authenticate the ESP32 device
    const auth = await validateApiKey(request);
    if (!auth.valid || !auth.binId) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.error?.includes("Rate limit") ? 429 : 401 }
      );
    }

    const binId = auth.binId;

    let body: GasAlertBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { status: "error", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const gasLevel  = typeof body.gas_level  === "number" ? body.gas_level  : 0;
    const gasDanger = typeof body.gas_danger === "boolean" ? body.gas_danger : false;

    // ── Update bins table with latest gas status ──
    await serviceClient
      .from("bins")
      .update({
        gas_level:       gasLevel,
        gas_danger:      gasDanger,
        is_online:       true,
        last_seen_at:    new Date().toISOString(),
      })
      .eq("id", binId);

    if (gasDanger) {
      // ── Create gas_danger alert (only if no unread one already exists) ──
      const { data: existing } = await serviceClient
        .from("alerts")
        .select("id")
        .eq("bin_id", binId)
        .eq("alert_type", "gas_danger")
        .eq("is_read", false)
        .single();

      if (!existing) {
        await serviceClient.from("alerts").insert({
          bin_id:       binId,
          sector_type:  "organic",   // Required FK — gas affects all bins
          alert_type:   "gas_danger",
          is_read:      false,
        });
        console.log("[gas-alert] Created gas_danger alert for bin:", binId);
      }
    } else {
      // ── Auto-clear all unread gas_danger alerts for this bin ──
      await serviceClient
        .from("alerts")
        .update({ is_read: true })
        .eq("bin_id", binId)
        .eq("alert_type", "gas_danger")
        .eq("is_read", false);

      console.log("[gas-alert] Cleared gas_danger alerts for bin:", binId);
    }

    return NextResponse.json({
      status:     "ok",
      gas_danger: gasDanger,
      gas_level:  gasLevel,
      timestamp:  new Date().toISOString(),
    });
  } catch (error) {
    console.error("[gas-alert] Unexpected error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
