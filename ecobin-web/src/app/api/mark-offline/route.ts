/**
 * POST /api/mark-offline
 *
 * Internal cron endpoint called periodically to detect bins that
 * stopped sending heartbeats and mark them as offline.
 *
 * Security: Protected by x-cron-secret header matching CRON_SECRET env var.
 *
 * The mark_bins_offline() PostgreSQL function finds all bins where
 * last_seen_at is older than 10 minutes and is_online = true,
 * then sets is_online = false.
 *
 * Set up Vercel Cron in vercel.json with schedule every 10 minutes.
 */

import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

interface MarkOfflineResponse {
  status: "ok" | "error";
  marked_offline: number;
  message?: string;
}

export async function POST(request: Request): Promise<NextResponse<MarkOfflineResponse>> {
  try {
    // Validate the cron secret header
    const cronSecret = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json(
        {
          status: "error",
          marked_offline: 0,
          message: "Unauthorized — invalid or missing x-cron-secret",
        },
        { status: 401 }
      );
    }

    // Call the PostgreSQL function that marks stale bins as offline
    const { data, error } = await serviceClient.rpc("mark_bins_offline");

    if (error) {
      console.error("[mark-offline] RPC error:", error);
      return NextResponse.json(
        {
          status: "error",
          marked_offline: 0,
          message: "Database function call failed",
        },
        { status: 500 }
      );
    }

    const markedOffline = typeof data === "number" ? data : 0;

    if (markedOffline > 0) {
      console.log("[mark-offline] Marked " + markedOffline + " bin(s) as offline");
    }

    return NextResponse.json({
      status: "ok",
      marked_offline: markedOffline,
    });
  } catch (error) {
    console.error("[mark-offline] Unexpected error:", error);
    return NextResponse.json(
      {
        status: "error",
        marked_offline: 0,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
