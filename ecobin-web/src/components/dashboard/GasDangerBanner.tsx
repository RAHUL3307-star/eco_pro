"use client";

/**
 * GasDangerBanner
 *
 * A prominent full-width danger alert that appears at the top of the
 * dashboard when the EcoBin's gas sensor detects harmful gas concentrations.
 *
 * Features:
 *  - Animated red pulsing background (CSS keyframe animation)
 *  - Prominent ☣️ biohazard icon with shake animation
 *  - Clear danger message telling users NOT to open the bin
 *  - Live gas level display (ADC value + safety percentage)
 *  - Smooth slide-in/slide-out transition
 *  - Auto-hides when gas returns to safe levels
 */

import { useEffect, useState } from "react";

interface GasDangerBannerProps {
  gasDanger: boolean;
  gasLevel: number;     // ESP32 ADC value 0–4095
  binName: string;
}

export default function GasDangerBanner({
  gasDanger,
  gasLevel,
  binName,
}: GasDangerBannerProps) {
  const [visible, setVisible] = useState(false);
  const [animOut, setAnimOut] = useState(false);

  // Smooth entry/exit transitions
  useEffect(() => {
    if (gasDanger) {
      setAnimOut(false);
      // Small delay so the slide-in animation runs after mount
      const t = setTimeout(() => setVisible(true), 30);
      return () => clearTimeout(t);
    } else {
      // Slide out first, then hide
      setAnimOut(true);
      const t = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(t);
    }
  }, [gasDanger]);

  if (!gasDanger && !visible) return null;

  // Convert ADC reading (0–4095) to a human-readable "danger %" for display
  // 0 = no gas, 4095 = maximum sensor reading
  const dangerPercent = Math.min(100, Math.round((gasLevel / 4095) * 100));

  return (
    <>
      <style>{`
        @keyframes gas-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes gas-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px) rotate(-3deg); }
          20%, 40%, 60%, 80% { transform: translateX(3px) rotate(3deg); }
        }
        @keyframes gas-slidein {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes gas-slideout {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(-100%); opacity: 0; }
        }
        .gas-banner-enter { animation: gas-slidein 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .gas-banner-exit  { animation: gas-slideout 0.4s cubic-bezier(0.7, 0, 0.84, 0) both; }
        .gas-pulse-bg     { animation: gas-pulse 1.5s ease-in-out infinite; }
        .gas-icon-shake   { animation: gas-shake 0.8s ease-in-out infinite; }
      `}</style>

      <div
        className={`gas-banner-enter ${animOut ? "gas-banner-exit" : ""}`}
        style={{
          position:     "relative",
          zIndex:       100,
          marginBottom: "1.5rem",
          borderRadius: "1rem",
          overflow:     "hidden",
        }}
      >
        {/* Pulsing gradient background */}
        <div
          className="gas-pulse-bg"
          style={{
            position:   "absolute",
            inset:      0,
            background: "linear-gradient(135deg, rgba(220,38,38,0.95) 0%, rgba(185,28,28,0.98) 50%, rgba(239,68,68,0.95) 100%)",
            zIndex:     0,
          }}
        />

        {/* Glassy overlay pattern */}
        <div
          style={{
            position:   "absolute",
            inset:      0,
            background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)",
            zIndex:     1,
          }}
        />

        {/* Main content */}
        <div
          style={{
            position:       "relative",
            zIndex:         2,
            padding:        "1.25rem 1.5rem",
            display:        "flex",
            alignItems:     "center",
            gap:            "1.25rem",
            flexWrap:       "wrap",
          }}
        >
          {/* Biohazard Icon */}
          <div
            className="gas-icon-shake"
            style={{
              fontSize:         "2.5rem",
              flexShrink:       0,
              filter:           "drop-shadow(0 0 12px rgba(255,200,0,0.8))",
              textShadow:       "0 0 20px rgba(255,200,0,0.9)",
            }}
          >
            ☣️
          </div>

          {/* Text block */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            "0.5rem",
                marginBottom:   "0.25rem",
                flexWrap:       "wrap",
              }}
            >
              {/* DANGER label */}
              <span
                style={{
                  background:   "rgba(255,255,255,0.2)",
                  color:        "#fff",
                  fontWeight:   800,
                  fontSize:     "0.7rem",
                  letterSpacing:"0.12em",
                  padding:      "0.15rem 0.5rem",
                  borderRadius: "0.25rem",
                  textTransform:"uppercase",
                  border:       "1px solid rgba(255,255,255,0.3)",
                }}
              >
                ⚠ DANGER ALERT
              </span>
              <span
                style={{
                  color:       "rgba(255,220,220,0.9)",
                  fontSize:    "0.75rem",
                  fontWeight:  500,
                }}
              >
                {binName}
              </span>
            </div>

            <p
              style={{
                color:      "#fff",
                fontWeight: 700,
                fontSize:   "1.05rem",
                margin:     0,
                lineHeight: 1.3,
                textShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            >
              Harmful Gases Detected — Do NOT open the bin!
            </p>
            <p
              style={{
                color:      "rgba(255,204,204,0.9)",
                fontSize:   "0.82rem",
                marginTop:  "0.2rem",
                marginBottom: 0,
              }}
            >
              Keep the bin sealed until the alert clears. Ensure good ventilation in the area.
            </p>
          </div>

          {/* Gas Level Meter */}
          <div
            style={{
              background:   "rgba(0,0,0,0.25)",
              borderRadius: "0.75rem",
              padding:      "0.75rem 1rem",
              minWidth:     "120px",
              textAlign:    "center",
              border:       "1px solid rgba(255,255,255,0.15)",
              flexShrink:   0,
            }}
          >
            <div
              style={{
                color:       "rgba(255,220,220,0.8)",
                fontSize:    "0.65rem",
                fontWeight:  600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "0.35rem",
              }}
            >
              Gas Level
            </div>
            <div
              style={{
                color:      "#fff",
                fontSize:   "1.4rem",
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {dangerPercent}%
            </div>
            <div
              style={{
                color:      "rgba(255,200,200,0.7)",
                fontSize:   "0.6rem",
                marginTop:  "0.2rem",
              }}
            >
              ADC {gasLevel}/4095
            </div>

            {/* Mini gauge bar */}
            <div
              style={{
                marginTop:    "0.5rem",
                height:       "4px",
                borderRadius: "2px",
                background:   "rgba(255,255,255,0.15)",
                overflow:     "hidden",
              }}
            >
              <div
                style={{
                  height:       "100%",
                  width:        `${dangerPercent}%`,
                  background:   dangerPercent > 75 ? "#fbbf24" : "#f87171",
                  borderRadius: "2px",
                  transition:   "width 1s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            height:     "3px",
            background: "linear-gradient(90deg, #fbbf24, #ef4444, #fbbf24)",
            zIndex:     3,
          }}
        />
      </div>
    </>
  );
}
