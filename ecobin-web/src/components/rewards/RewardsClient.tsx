"use client";

/**
 * RewardsClient — Full rewards and coin management page.
 *
 * Sections:
 * A. Hero with animated spinning coin + balance
 * B. Stats row (total, manual, auto, weekly coins)
 * C. Withdrawal request form
 * D. Transaction history table
 * E. Withdrawal history with status badges
 */

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { SECTOR_CONFIG, type Profile, type WasteEvent } from "@/lib/types";

interface CoinWithdrawal {
  id: string;
  user_id: string;
  coins_amount: number;
  status: "pending" | "processed";
  requested_at: string;
  notes: string | null;
}

interface RewardsClientProps {
  profile: Profile;
  events: WasteEvent[];
  withdrawals: CoinWithdrawal[];
}

export default function RewardsClient({
  profile,
  events,
  withdrawals: initialWithdrawals,
}: RewardsClientProps) {
  const [balance, setBalance] = useState(profile.coin_balance);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);

  // ── Computed Stats ──
  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const totalSorted = events.length;
    const manualSorts = events.filter((e) => e.was_manual).length;
    const autoSorts = events.filter((e) => !e.was_manual).length;
    const coinsThisWeek = events
      .filter((e) => new Date(e.created_at).getTime() > weekAgo)
      .reduce((sum, e) => sum + e.coins_earned, 0);

    return { totalSorted, manualSorts, autoSorts, coinsThisWeek };
  }, [events]);

  // ── Withdrawal Handler ──
  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (isNaN(amount) || amount < 100 || amount > balance) return;

    setWithdrawing(true);
    setWithdrawError("");
    setWithdrawSuccess(false);

    // Insert withdrawal request
    const { data: newWithdrawal, error: insertError } = await supabase
      .from("coin_withdrawals")
      .insert({ user_id: profile.id, coins_amount: amount })
      .select()
      .single();

    if (insertError) {
      setWithdrawError("Failed to submit withdrawal. Please try again.");
      setWithdrawing(false);
      return;
    }

    // Deduct coins from profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ coin_balance: balance - amount })
      .eq("id", profile.id);

    if (updateError) {
      setWithdrawError("Withdrawal logged but balance update failed. Contact support.");
      setWithdrawing(false);
      return;
    }

    setBalance((prev) => prev - amount);
    setWithdrawAmount("");
    setWithdrawSuccess(true);
    if (newWithdrawal) {
      setWithdrawals((prev) => [newWithdrawal as CoinWithdrawal, ...prev]);
    }
    setWithdrawing(false);
    setTimeout(() => setWithdrawSuccess(false), 5000);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ═══ SECTION A: Hero ═══ */}
      <div
        className="glass-card relative overflow-hidden p-8 text-center"
        style={{ animation: "slideUp 0.5s ease-out both" }}
      >
        {/* Background glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 60%)",
            animation: "glowPulse 4s ease-in-out infinite",
          }}
        />

        <div className="relative z-10">
          {/* Spinning coin */}
          <div
            className="inline-block text-6xl mb-4"
            style={{ animation: "coinSpin 4s linear infinite", willChange: "transform" }}
          >
            🪙
          </div>

          <h2
            className="font-heading text-5xl font-bold mb-2"
            style={{ color: "#FBBF24" }}
          >
            {balance.toLocaleString()}
          </h2>
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            EcoCoins Balance
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            = ₹{(balance / 10).toFixed(0)} equivalent
          </p>
          <p
            className="text-xs mt-4 max-w-sm mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Sort right. Earn EcoCoins. Redeem rewards.
          </p>
        </div>

      </div>

      {/* ═══ SECTION B: Stats Row ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sorted", value: stats.totalSorted, icon: "📊", color: "var(--text-primary)" },
          { label: "Manual Sorts", value: stats.manualSorts, icon: "🤚", color: "#10B981" },
          { label: "Auto Sorts", value: stats.autoSorts, icon: "⚡", color: "#3B82F6" },
          { label: "Coins This Week", value: stats.coinsThisWeek, icon: "🪙", color: "#FBBF24" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="glass-card p-5"
            style={{ animation: `slideUp 0.5s ease-out ${0.1 + i * 0.1}s both` }}
          >
            <div className="text-xl mb-2">{stat.icon}</div>
            <p className="font-heading text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value.toLocaleString()}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ═══ SECTION C: Withdrawal ═══ */}
      <div
        className="glass-card p-6"
        style={{ animation: "slideUp 0.5s ease-out 0.5s both" }}
      >
        <h3 className="font-heading font-semibold text-base mb-4">
          Request Withdrawal
        </h3>

        {balance < 100 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            You need at least <strong style={{ color: "#FBBF24" }}>100 EcoCoins</strong> to
            request a withdrawal. Keep sorting!
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="number"
                min={100}
                max={balance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Min 100, Max ${balance}`}
                className="input-dark"
              />
            </div>
            <button
              onClick={handleWithdraw}
              disabled={
                withdrawing ||
                !withdrawAmount ||
                parseInt(withdrawAmount) < 100 ||
                parseInt(withdrawAmount) > balance
              }
              className="btn-primary !w-auto px-6 flex items-center justify-center gap-2"
            >
              {withdrawing ? (
                <>
                  <span className="spinner" />
                  Processing...
                </>
              ) : (
                "Request Withdrawal"
              )}
            </button>
          </div>
        )}

        {withdrawSuccess && (
          <div
            className="mt-3 px-4 py-3 rounded-lg text-sm"
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              color: "#10B981",
            }}
          >
            ✅ Withdrawal requested! We&apos;ll process it soon.
          </div>
        )}

        {withdrawError && (
          <div
            className="mt-3 px-4 py-3 rounded-lg text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#EF4444",
            }}
          >
            {withdrawError}
          </div>
        )}

        {/* Coming soon note */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: "rgba(139,92,246,0.12)",
              color: "#A78BFA",
              animation: "glowPulse 3s ease-in-out infinite",
            }}
          >
            Coming Soon
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Crypto exchange — EcoCoin token
          </span>
        </div>
      </div>

      {/* ═══ SECTION D: Transaction History ═══ */}
      <div
        className="glass-card p-6"
        style={{ animation: "slideUp 0.5s ease-out 0.6s both" }}
      >
        <h3 className="font-heading font-semibold text-base mb-4">
          Transaction History
        </h3>

        {events.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            No activity yet — start sorting! 🗑️
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="text-left py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Date</th>
                  <th className="text-left py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Type</th>
                  <th className="text-left py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Sector</th>
                  <th className="text-right py-3 px-2 font-medium" style={{ color: "var(--text-muted)" }}>Coins</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 20).map((event) => {
                  const config = SECTOR_CONFIG[event.sector_type];
                  return (
                    <tr
                      key={event.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                    >
                      <td className="py-3 px-2" style={{ color: "var(--text-secondary)" }}>
                        {new Date(event.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: event.was_manual
                              ? "rgba(16,185,129,0.12)"
                              : "rgba(255,255,255,0.06)",
                            color: event.was_manual ? "#10B981" : "var(--text-muted)",
                          }}
                        >
                          {event.was_manual ? "Manual" : "Auto"}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span style={{ color: config.color }}>{config.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-medium" style={{
                        color: event.coins_earned > 0 ? "#FBBF24" : "var(--text-muted)",
                      }}>
                        {event.coins_earned > 0 ? `+${event.coins_earned}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ SECTION E: Withdrawal History ═══ */}
      {withdrawals.length > 0 && (
        <div
          className="glass-card p-6"
          style={{ animation: "slideUp 0.5s ease-out 0.7s both" }}
        >
          <h3 className="font-heading font-semibold text-base mb-4">
            Withdrawal History
          </h3>
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {w.coins_amount.toLocaleString()} coins
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {new Date(w.requested_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{
                    background:
                      w.status === "processed"
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(245,158,11,0.12)",
                    color: w.status === "processed" ? "#10B981" : "#F59E0B",
                    border: `1px solid ${
                      w.status === "processed"
                        ? "rgba(16,185,129,0.25)"
                        : "rgba(245,158,11,0.25)"
                    }`,
                  }}
                >
                  {w.status === "processed" ? "✅ Processed" : "⏳ Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
