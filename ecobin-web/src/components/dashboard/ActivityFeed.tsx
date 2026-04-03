"use client";

/**
 * ActivityFeed — Live feed of recent waste classification events.
 *
 * Shows the last 10 events with:
 * - Sector color badge (organic/inorganic/metal)
 * - Manual vs auto sort tag
 * - Relative timestamp ("2 min ago")
 * - Coins earned badge (if any)
 * - Smooth slide-in animation for new entries
 */

import { SECTOR_CONFIG, type WasteEvent } from "@/lib/types";

interface ActivityFeedProps {
  events: WasteEvent[];
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div
      className="glass-card p-6"
      style={{ animation: "slideUp 0.6s ease-out 0.5s both" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-semibold text-base" style={{ color: "var(--text-primary)" }}>
          Recent Activity
        </h3>
        <span className="text-xs px-2 py-1 rounded-full" style={{
          background: "rgba(255,255,255,0.06)",
          color: "var(--text-secondary)",
        }}>
          Live
          <span
            className="inline-block w-1.5 h-1.5 rounded-full ml-1.5"
            style={{
              backgroundColor: "#10B981",
              animation: "glowPulse 2s ease-in-out infinite",
            }}
          />
        </span>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          No waste events yet. Drop some waste in your EcoBin!
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => {
            const config = SECTOR_CONFIG[event.sector_type];
            return (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  animation: `slideUp 0.4s ease-out ${index * 0.05}s both`,
                }}
              >
                {/* Sector badge */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: config.bgAlpha }}
                >
                  {config.emoji}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: config.color }}>
                      {config.label}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: event.was_manual
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(255,255,255,0.06)",
                        color: event.was_manual ? "#10B981" : "var(--text-muted)",
                      }}
                    >
                      {event.was_manual ? "Manual" : "Auto"}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {formatRelativeTime(event.created_at)}
                  </p>
                </div>

                {/* Coins earned */}
                {event.coins_earned > 0 && (
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{
                      background: "rgba(251,191,36,0.12)",
                      color: "#FBBF24",
                    }}
                  >
                    +{event.coins_earned} 🪙
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
