/**
 * POST /api/heartbeat
 *
 * Called by the ESP32 every 5 minutes (HEARTBEAT_MS = 300000).
 * Updates the bin's online status and last-seen timestamp.
 *
 * This lets the dashboard show a green "Online" badge when the
 * ESP32 is actively sending heartbeats, and a red "Offline" badge
 * when heartbeats stop (handled by /api/mark-offline cron).
 *
 * The ESP32 sends:
 *   POST /api/heartbeat
 *   Headers: { "x-api-key": "bin_api_key_here" }
 *   Body: {} (empty JSON)
 */

import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase/service";

interface HeartbeatResponse {
  status: "ok" | "error";
  timestamp: string;
  message?: string;
}

export async function POST(request: Request): Promise<NextResponse<HeartbeatResponse>> {
  try {
    // Authenticate the ESP32 device
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

    // Update bin status: mark as online and refresh last_seen_at
    const { error } = await serviceClient
      .from("bins")
      .update({
        is_online: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", auth.binId);

    if (error) {
      console.error("[heartbeat] Update error:", error);
      return NextResponse.json(
        {
          status: "error",
          timestamp: new Date().toISOString(),
          message: "Failed to update bin status",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[heartbeat] Unexpected error:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
