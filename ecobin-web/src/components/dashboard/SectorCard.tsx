"use client";

/**
 * SectorCard — Displays live fill level for one bin sector.
 *
 * Features:
 * - Animated fill bar that transitions from 0% to current level
 * - Pulsing green LED dot (not full) or blinking red LED (full)
 * - Sector-colored accent border glow when full
 * - Floating animation with unique delay per sector
 */

import { useEffect, useState } from "react";
import { SECTOR_CONFIG, type SectorType } from "@/lib/types";

interface SectorCardProps {
  sectorType: SectorType;
  fillPercent: number;
  weightGrams: number;
  isFull: boolean;
  lastUpdated: string;
  animationDelay?: number;
}

export default function SectorCard({
  sectorType,
  fillPercent,
  weightGrams,
  isFull,
  lastUpdated,
  animationDelay = 0,
}: SectorCardProps) {
  const config = SECTOR_CONFIG[sectorType];

  // Animate fill bar from 0 on mount
  const [animatedFill, setAnimatedFill] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedFill(fillPercent), 100);
    return () => clearTimeout(timer);
  }, [fillPercent]);

  // Format weight: grams → kg if >= 1000
  const formatWeight = (grams: number): string => {
    if (grams >= 1000) return (grams / 1000).toFixed(1) + " kg";
    return grams + " g";
  };

  // Relative time formatting
  const formatRelativeTime = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div
      className="glass-card relative overflow-hidden p-6"
      style={{
        animation: `slideUp 0.6s ease-out ${animationDelay}s both`,
        willChange: "transform",
        borderColor: isFull ? "rgba(239,68,68,0.4)" : undefined,
        boxShadow: isFull
          ? "0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(239,68,68,0.2)"
          : undefined,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Sector icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
            style={{ background: config.bgAlpha }}
          >
            {config.emoji}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-base" style={{ color: config.color }}>
              {config.label}
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatRelativeTime(lastUpdated)}
            </p>
          </div>
        </div>

        {/* Status LED + Full badge */}
        <div className="flex items-center gap-2">
          {isFull && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold tracking-wide"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#EF4444",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              FULL
            </span>
          )}
          <span
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: isFull ? "#EF4444" : "#10B981",
              animation: isFull
                ? "glowPulse 0.8s ease-in-out infinite"
                : "glowPulse 3s ease-in-out infinite",
              boxShadow: isFull
                ? "0 0 8px rgba(239,68,68,0.6)"
                : "0 0 8px rgba(16,185,129,0.6)",
            }}
          />
        </div>
      </div>

      {/* Fill percentage */}
      <div className="flex items-end gap-2 mb-3">
        <span className="font-heading text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
          {fillPercent}
        </span>
        <span className="text-lg mb-1" style={{ color: "var(--text-secondary)" }}>
          %
        </span>
      </div>

      {/* Fill bar */}
      <div
        className="w-full h-3 rounded-full overflow-hidden mb-4"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${animatedFill}%`,
            background: `linear-gradient(90deg, ${config.color}, ${config.color}dd)`,
            transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: `0 0 12px ${config.color}66`,
          }}
        />
      </div>

      {/* Weight */}
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Weight
        </span>
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {formatWeight(weightGrams)}
        </span>
      </div>
    </div>
  );
}
