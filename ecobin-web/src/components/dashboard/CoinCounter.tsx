"use client";

/**
 * CoinCounter — Animated EcoCoin balance display.
 *
 * Features:
 * - Rolling number animation on balance change (requestAnimationFrame)
 * - "+10" popup that floats up and fades when coins are earned
 * - Gold coin icon with glow
 */

import { useEffect, useRef, useState } from "react";

interface CoinCounterProps {
  balance: number;
  recentlyEarned: number | null;
}

export default function CoinCounter({ balance, recentlyEarned }: CoinCounterProps) {
  const [displayedBalance, setDisplayedBalance] = useState(balance);
  const [showPopup, setShowPopup] = useState(false);
  const [popupAmount, setPopupAmount] = useState(0);
  const prevBalanceRef = useRef(balance);
  const animationRef = useRef<number>(0);

  // Rolling number animation
  useEffect(() => {
    const prevBalance = prevBalanceRef.current;
    const targetBalance = balance;
    prevBalanceRef.current = balance;

    if (prevBalance === targetBalance) {
      setDisplayedBalance(targetBalance);
      return;
    }

    const diff = targetBalance - prevBalance;
    const duration = 600; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(prevBalance + diff * eased);
      setDisplayedBalance(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [balance]);

  // Show "+X" popup when coins are earned
  useEffect(() => {
    if (recentlyEarned && recentlyEarned > 0) {
      setPopupAmount(recentlyEarned);
      setShowPopup(true);
      const timer = setTimeout(() => setShowPopup(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [recentlyEarned]);

  return (
    <div
      className="glass-card p-6 relative overflow-hidden"
      style={{ animation: "slideUp 0.6s ease-out 0.3s both" }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)",
          animation: "glowPulse 4s ease-in-out infinite",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "rgba(251,191,36,0.15)" }}
          >
            🪙
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            EcoCoins Balance
          </span>
        </div>

        {/* Balance display */}
        <div className="relative flex items-end gap-1">
          <span
            className="font-heading text-5xl font-bold tabular-nums"
            style={{ color: "#FBBF24" }}
          >
            {displayedBalance.toLocaleString()}
          </span>
          <span className="text-lg mb-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
            coins
          </span>

          {/* Popup animation */}
          {showPopup && (
            <span
              className="absolute -top-2 right-0 font-heading font-bold text-xl"
              style={{
                color: "#10B981",
                animation: "coinPopup 2s ease-out forwards",
              }}
            >
              +{popupAmount}
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
