"use client";

/**
 * NotificationToast — Floating in-app alert for bin-full events.
 *
 * Appears in the top-right corner with a glassmorphism panel.
 * Slides in from the right when an alert arrives.
 * Auto-dismisses after AUTO_DISMISS_MS (10 seconds) with a progress bar.
 * Can also be dismissed manually via the × button.
 *
 * Props:
 *  alert     — The Alert object to display (null = hidden)
 *  onDismiss — Callback fired when user dismisses or timer expires
 */

import { useEffect, useRef, useState } from "react";
import { SECTOR_CONFIG, type Alert } from "@/lib/types";

const AUTO_DISMISS_MS = 10_000; // 10 seconds

interface NotificationToastProps {
  alert: Alert | null;
  onDismiss: () => void;
}

export default function NotificationToast({
  alert,
  onDismiss,
}: NotificationToastProps) {
  // Controls the CSS slide-in / slide-out animation
  const [visible, setVisible] = useState(false);
  // Progress: 1.0 = full time remaining, 0.0 = auto-dismiss
  const [progress, setProgress] = useState(1);

  const timerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // ── Mount / unmount the toast when `alert` changes ──
  useEffect(() => {
    if (!alert) {
      // Slide out then clean up
      setVisible(false);
      setProgress(1);
      clearInterval(intervalRef.current ?? undefined);
      clearTimeout(timerRef.current  ?? undefined);
      return;
    }

    // Reset and slide in
    setProgress(1);
    setVisible(true);
    startTimeRef.current = Date.now();

    // Progress bar via rAF-based interval (60fps feel)
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 1 - elapsed / AUTO_DISMISS_MS);
      setProgress(remaining);
    }, 50);

    // Auto-dismiss timer
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      clearInterval(intervalRef.current ?? undefined);
      clearTimeout(timerRef.current  ?? undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert]);

  function handleDismiss() {
    clearInterval(intervalRef.current ?? undefined);
    clearTimeout(timerRef.current  ?? undefined);
    setVisible(false);
    // Small delay so the slide-out animation can play
    setTimeout(onDismiss, 300);
  }

  // Don't render anything if there's no alert
  if (!alert) return null;

  const config  = SECTOR_CONFIG[alert.sector_type];
  const isFull  = alert.alert_type === "bin_full";
  const accentColor = isFull ? "#EF4444" : "#10B981";
  const bgColor     = isFull ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)";
  const borderColor = isFull ? "rgba(239,68,68,0.3)"  : "rgba(16,185,129,0.3)";

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(120%); opacity: 0; }
        }
        @keyframes toastGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.15), 0 20px 60px rgba(0,0,0,0.5); }
          50%       { box-shadow: 0 0 35px rgba(239,68,68,0.30), 0 20px 60px rgba(0,0,0,0.5); }
        }
      `}</style>

      {/* Fixed overlay anchor — top-right */}
      <div
        style={{
          position:  "fixed",
          top:       "80px",   // below the top bar
          right:     "24px",
          zIndex:    9999,
          maxWidth:  "380px",
          width:     "calc(100vw - 48px)",
          animation: visible
            ? "toastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both"
            : "toastSlideOut 0.3s ease-in both",
        }}
      >
        {/* Main card */}
        <div
          style={{
            background:    bgColor,
            backdropFilter:"blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border:        `1px solid ${borderColor}`,
            borderRadius:  "16px",
            padding:       "18px 20px",
            animation:     isFull ? "toastGlow 2s ease-in-out infinite" : "none",
            position:      "relative",
            overflow:      "hidden",
          }}
        >
          {/* Left accent bar */}
          <div
            style={{
              position:     "absolute",
              left:         0,
              top:          0,
              bottom:       0,
              width:        "4px",
              borderRadius: "16px 0 0 16px",
              background:   accentColor,
            }}
          />

          {/* Header row */}
          <div
            style={{
              display:        "flex",
              alignItems:     "flex-start",
              justifyContent: "space-between",
              gap:            "12px",
              marginLeft:     "8px",
            }}
          >
            {/* Icon + text */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
              {/* Sector icon */}
              <div
                style={{
                  width:          "44px",
                  height:         "44px",
                  borderRadius:   "12px",
                  background:     isFull ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  fontSize:       "22px",
                  flexShrink:     0,
                }}
              >
                {isFull ? "🚨" : "✅"}
              </div>

              {/* Message */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily:  "var(--font-space-grotesk, sans-serif)",
                    fontWeight:  700,
                    fontSize:    "0.9rem",
                    color:       accentColor,
                    marginBottom: "4px",
                  }}
                >
                  {isFull ? "⚠️ Bin Full Alert" : "✅ Bin Cleared"}
                </p>
                <p
                  style={{
                    fontSize:   "0.82rem",
                    color:      "rgba(241,245,249,0.85)",
                    lineHeight: 1.4,
                  }}
                >
                  {isFull
                    ? `${config.emoji} ${config.label} sector is full — please empty it!`
                    : `${config.emoji} ${config.label} sector has been cleared.`}
                </p>
                <p style={{ fontSize: "0.7rem", color: "rgba(148,163,184,0.7)", marginTop: "4px" }}>
                  {new Date(alert.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Dismiss × button */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              style={{
                width:           "28px",
                height:          "28px",
                borderRadius:    "8px",
                background:      "rgba(255,255,255,0.06)",
                border:          "1px solid rgba(255,255,255,0.08)",
                color:           "rgba(148,163,184,0.8)",
                fontSize:        "14px",
                cursor:          "pointer",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                flexShrink:      0,
                transition:      "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              ×
            </button>
          </div>

          {/* Auto-dismiss progress bar */}
          <div
            style={{
              marginTop:    "14px",
              marginLeft:   "8px",
              height:       "3px",
              borderRadius: "2px",
              background:   "rgba(255,255,255,0.08)",
              overflow:     "hidden",
            }}
          >
            <div
              style={{
                height:     "100%",
                width:      `${progress * 100}%`,
                borderRadius: "2px",
                background: accentColor,
                transition: "width 0.05s linear",
                boxShadow:  `0 0 6px ${accentColor}88`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
