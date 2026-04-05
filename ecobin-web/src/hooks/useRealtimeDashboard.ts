"use client";

/**
 * useRealtimeDashboard — Polling-based dashboard data hook
 *
 * Since Supabase Realtime requires the Pro plan, this hook uses
 * periodic polling (every 10 seconds) to fetch the latest data
 * from Supabase. This provides near-real-time updates without
 * needing WebSocket subscriptions or Realtime replication enabled.
 *
 * How it works:
 * - On mount, uses the server-fetched initial data (instant first paint)
 * - Sets up a 10-second polling interval to fetch fresh data
 * - Polls sectors, waste_events, alerts AND bins (for live gas updates)
 * - Shows "● Live" indicator when polling is active
 * - Automatically handles errors and retries
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Bin, Sector, WasteEvent, Alert } from "@/lib/types";

interface RealtimeDashboardState {
  sectors: Sector[];
  recentEvents: WasteEvent[];
  unreadAlerts: Alert[];
  liveBin: Bin | null;   // Live-polled bin data (gas_level, gas_danger, is_online, etc.)
  isConnected: boolean;
}

interface UseRealtimeDashboardProps {
  binId: string;
  initialSectors: Sector[];
  initialEvents: WasteEvent[];
  initialAlerts: Alert[];
}

const POLL_INTERVAL_MS = 10_000; // Poll every 10 seconds

export function useRealtimeDashboard({
  binId,
  initialSectors,
  initialEvents,
  initialAlerts,
}: UseRealtimeDashboardProps): RealtimeDashboardState {
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [recentEvents, setRecentEvents] = useState<WasteEvent[]>(initialEvents);
  const [unreadAlerts, setUnreadAlerts] = useState<Alert[]>(initialAlerts);
  const [liveBin, setLiveBin] = useState<Bin | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Fetch latest data from Supabase — all 4 sources in parallel
  const fetchDashboardData = useCallback(async () => {
    if (!binId) return;

    try {
      // Fetch all four data sources in parallel for speed
      const [sectorsRes, eventsRes, alertsRes, binRes] = await Promise.all([
        supabase
          .from("sectors")
          .select("*")
          .eq("bin_id", binId),

        supabase
          .from("waste_events")
          .select("*")
          .eq("bin_id", binId)
          .order("created_at", { ascending: false })
          .limit(10),

        supabase
          .from("alerts")
          .select("*")
          .eq("bin_id", binId)
          .eq("is_read", false)
          .order("created_at", { ascending: false }),

        // Poll bins table to get live gas_level, gas_danger, is_online, last_seen_at
        supabase
          .from("bins")
          .select("*")
          .eq("id", binId)
          .single(),
      ]);

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      if (sectorsRes.data) {
        setSectors(sectorsRes.data as Sector[]);
      }

      if (eventsRes.data) {
        setRecentEvents(eventsRes.data as WasteEvent[]);
      }

      if (alertsRes.data) {
        setUnreadAlerts(alertsRes.data as Alert[]);
      }

      if (binRes.data) {
        setLiveBin(binRes.data as Bin);
      }

      setIsConnected(true);
    } catch (error) {
      console.error("[Polling] Error fetching dashboard data:", error);
      if (isMountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [binId]);

  // Set up polling interval
  useEffect(() => {
    if (!binId) return;

    isMountedRef.current = true;
    setIsConnected(true);

    // Start polling
    intervalRef.current = setInterval(fetchDashboardData, POLL_INTERVAL_MS);
    console.log(`[Polling] Started — refreshing every ${POLL_INTERVAL_MS / 1000}s`);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      console.log("[Polling] Stopped");
    };
  }, [binId, fetchDashboardData]);

  return { sectors, recentEvents, unreadAlerts, liveBin, isConnected };
}
