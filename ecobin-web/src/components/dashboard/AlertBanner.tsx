"use client";

/**
 * AlertBanner — Slide-down banner for unread bin alerts.
 *
 * Shows when sectors are full, with dismiss button that marks
 * the alert as read via Supabase update.
 *
 * Red glassmorphism background for urgency.
 */

import { supabase } from "@/lib/supabase/client";
import { SECTOR_CONFIG, type Alert } from "@/lib/types";

interface AlertBannerProps {
  alerts: Alert[];
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  const handleDismiss = async (alertId: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", alertId);

    if (error) {
      console.error("[AlertBanner] Failed to dismiss alert:", error);
    }
    // The realtime hook will automatically remove it from the unreadAlerts array
  };

  const handleDismissAll = async () => {
    const alertIds = alerts.map((a) => a.id);
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .in("id", alertIds);

    if (error) {
      console.error("[AlertBanner] Failed to dismiss all alerts:", error);
    }
  };

  return (
    <div className="space-y-2" style={{ animation: "slideUp 0.4s ease-out both" }}>
      {/* Pulse glow keyframe for bin_full banners */}
      <style>{`
        @keyframes alertPulseBorder {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); border-color: rgba(239,68,68,0.25); }
          50%       { box-shadow: 0 0 18px 4px rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.55); }
        }
        @keyframes alertClearedBorder {
          0%, 100% { box-shadow: none; }
          50%       { box-shadow: 0 0 14px 3px rgba(16,185,129,0.15); }
        }
      `}</style>
      {alerts.map((alert) => {
        // gas_danger alerts are rendered by GasDangerBanner — skip here
        if (alert.alert_type === "gas_danger") return null;

        const config = SECTOR_CONFIG[alert.sector_type];
        const isFull    = alert.alert_type === "bin_full";
        const isCleared = alert.alert_type === "bin_cleared";

        const bgColor     = isFull ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)";
        const borderColor = isFull ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)";
        const iconBg      = isFull ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)";
        const iconEmoji   = isFull ? "⚠️" : "✅";
        const sectionAnim = isFull ? "alertPulseBorder 2.5s ease-in-out infinite"
                                   : "alertClearedBorder 3s ease-in-out infinite";

        return (
          <div
            key={alert.id}
            className="relative overflow-hidden rounded-xl p-4 flex items-center gap-4"
            style={{
              background:     bgColor,
              backdropFilter: "blur(20px)",
              border:         `1px solid ${borderColor}`,
              animation:      sectionAnim,
            }}
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: iconBg }}
            >
              {iconEmoji}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {isFull
                  ? `${config.label} sector is full — please empty the bin`
                  : isCleared
                  ? `${config.label} sector has been cleared`
                  : `${config.label} alert`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {new Date(alert.created_at).toLocaleString()}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.06)",
                color:      "var(--text-secondary)",
                border:     "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Dismiss
            </button>
          </div>
        );
      })}

      {/* Dismiss all button if multiple */}
      {alerts.length > 1 && (
        <button
          onClick={handleDismissAll}
          className="w-full text-xs py-2 rounded-lg font-medium transition-colors"
          style={{
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-muted)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          Dismiss all ({alerts.length})
        </button>
      )}
    </div>
  );
}
