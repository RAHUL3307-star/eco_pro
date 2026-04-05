"use client";

/**
 * DashboardClient — Main client-side dashboard composition.
 *
 * Receives server-fetched initial data as props and subscribes
 * to Supabase Realtime for live updates via useRealtimeDashboard.
 *
 * Layout:
 * - Alert banners at top (if any)
 * - Bin status bar (online/offline, last seen)
 * - 3 SectorCards in responsive grid
 * - CoinCounter + ActivityFeed side by side on desktop
 */

import { useState, useEffect } from "react";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import { useNotifications } from "@/hooks/useNotifications";
import SectorCard from "@/components/dashboard/SectorCard";
import CoinCounter from "@/components/dashboard/CoinCounter";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import AlertBanner from "@/components/dashboard/AlertBanner";
import GasDangerBanner from "@/components/dashboard/GasDangerBanner";
import NotificationToast from "@/components/dashboard/NotificationToast";
import type { Bin, Profile, Sector, WasteEvent, Alert, SectorType } from "@/lib/types";

interface DashboardClientProps {
  profile: Profile;
  bin: Bin;
  initialSectors: Sector[];
  initialEvents: WasteEvent[];
  initialAlerts: Alert[];
}

// Order sectors consistently
const SECTOR_ORDER: SectorType[] = ["organic", "inorganic", "metal"];

function formatLastSeen(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardClient({
  profile,
  bin,
  initialSectors,
  initialEvents,
  initialAlerts,
}: DashboardClientProps) {
  // Subscribe to real-time updates (polling every 10s)
  const { sectors, recentEvents, unreadAlerts, liveBin, isConnected } =
    useRealtimeDashboard({
      binId: bin.id,
      initialSectors,
      initialEvents,
      initialAlerts,
    });

  // Notification system: browser push + in-app toast for bin_full alerts
  const { toastAlert, dismissToast, permission, requestPermission } =
    useNotifications({ unreadAlerts });

  // Request browser notification permission on first dashboard load
  // (must be triggered by user interaction; this fires after mount)
  useEffect(() => {
    if (permission === "default") {
      // Small delay so the page is fully painted before the prompt
      const t = setTimeout(() => requestPermission(), 2000);
      return () => clearTimeout(t);
    }
  }, [permission, requestPermission]);

  // Track recently earned coins for the popup animation
  const [recentlyEarned, setRecentlyEarned] = useState<number | null>(null);
  const [coinBalance, setCoinBalance] = useState(profile.coin_balance);
  const [lastCountedEventId, setLastCountedEventId] = useState<string | null>(
    initialEvents.length > 0 ? initialEvents[0].id : null
  );

  // Watch for new coin-earning events — track by event ID to prevent double-counting
  // Works with polling: each poll returns the latest events, and we detect new ones
  useEffect(() => {
    if (recentEvents.length > 0) {
      const latestEvent = recentEvents[0];
      // Only count if this is a genuinely new event we haven't seen
      if (latestEvent.id !== lastCountedEventId) {
        if (latestEvent.coins_earned > 0) {
          setRecentlyEarned(latestEvent.coins_earned);
          setCoinBalance((prev) => prev + latestEvent.coins_earned);
        }
        setLastCountedEventId(latestEvent.id);
      }
    }
  }, [recentEvents, lastCountedEventId]);

  // Sort sectors by our defined order
  const orderedSectors = SECTOR_ORDER.map(
    (type) =>
      sectors.find((s) => s.sector_type === type) || {
        id: type,
        bin_id: bin.id,
        sector_type: type,
        fill_level_percent: 0,
        weight_grams: 0,
        is_full: false,
        updated_at: new Date().toISOString(),
      }
  );

  // Derive gas danger state from alerts or bin data
  // Use liveBin (updated every 10s via polling) if available, else fall back to server-side bin prop
  const effectiveBin = liveBin ?? bin;
  const gasDangerAlert = unreadAlerts.find((a) => a.alert_type === "gas_danger");
  const isGasDanger    = !!gasDangerAlert || !!(effectiveBin.gas_danger);
  const currentGasLevel = effectiveBin.gas_level ?? 0;

  // Filter out gas_danger alerts from the regular AlertBanner
  // (they are shown in the dedicated GasDangerBanner instead)
  const nonGasAlerts = unreadAlerts.filter((a) => a.alert_type !== "gas_danger");

  return (
    <div className="space-y-6">
      {/* ── Floating notification toast (top-right, bin_full alerts) ── */}
      <NotificationToast alert={toastAlert} onDismiss={dismissToast} />

      {/* ── Gas Danger Banner (shown prominently above everything when danger active) ── */}
      <GasDangerBanner
        gasDanger={isGasDanger}
        gasLevel={currentGasLevel}
        binName={bin.bin_name}
      />

      {/* ── Notification permission prompt (shown only when blocked/denied) ── */}
      {permission === "denied" && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3 text-xs"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <span style={{ fontSize: "16px" }}>🔔</span>
          <span style={{ color: "rgba(245,158,11,0.9)" }}>
            Browser notifications are blocked. Enable them in your browser settings
            to receive bin-full alerts.
          </span>
        </div>
      )}

      {/* ── Alert Banners (bin full / bin cleared — excludes gas_danger) ── */}
      <AlertBanner alerts={nonGasAlerts} />

      {/* ── Bin Status Bar ── */}
      <div
        className="glass-card px-5 py-4 flex items-center justify-between"
        style={{ animation: "slideUp 0.5s ease-out both" }}
      >
        <div className="flex items-center gap-3">
          {/* Online/Offline indicator */}
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{
              backgroundColor: bin.is_online ? "#10B981" : "#64748B",
              boxShadow: bin.is_online ? "0 0 8px rgba(16,185,129,0.6)" : "none",
              animation: bin.is_online ? "glowPulse 3s ease-in-out infinite" : "none",
            }}
          />
          <div>
            <h2 className="font-heading font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {bin.bin_name}
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {bin.is_online
                ? "Online — receiving data"
                : `Offline — last seen ${formatLastSeen(bin.last_seen_at)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Air Quality Status */}
          {!isGasDanger && (
            <span
              className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
              style={{
                background: "rgba(16,185,129,0.1)",
                color: "#10B981",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              Air Quality: Safe
            </span>
          )}
          {/* Realtime connection status */}
          <span
            className="text-xs px-2.5 py-1 rounded-full"
            style={{
              background: isConnected
                ? "rgba(16,185,129,0.1)"
                : "rgba(239,68,68,0.1)",
              color: isConnected ? "#10B981" : "#EF4444",
              border: `1px solid ${
                isConnected ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"
              }`,
            }}
          >
            {isConnected ? "● Live" : "○ Connecting..."}
          </span>
        </div>
      </div>

      {/* ── Sector Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {orderedSectors.map((sector, index) => (
          <SectorCard
            key={sector.sector_type}
            sectorType={sector.sector_type}
            fillPercent={sector.fill_level_percent}
            weightGrams={sector.weight_grams}
            isFull={sector.is_full}
            lastUpdated={sector.updated_at}
            animationDelay={index * 0.1}
          />
        ))}
      </div>

      {/* ── Bottom Row: CoinCounter + Activity Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2">
          <CoinCounter balance={coinBalance} recentlyEarned={recentlyEarned} />
        </div>
        <div className="lg:col-span-3">
          <ActivityFeed events={recentEvents} />
        </div>
      </div>
    </div>
  );
}
