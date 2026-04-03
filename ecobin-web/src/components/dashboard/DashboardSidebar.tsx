"use client";

/**
 * DashboardSidebar — Glassmorphism navigation sidebar.
 *
 * Features:
 * - EcoBin logo at top
 * - Navigation links with active state detection
 * - Notification bell with unread alert count badge
 * - Coin balance display at bottom with gold glow
 * - Collapses to hamburger menu on mobile
 * - Sign out button
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface DashboardSidebarProps {
  profile: Profile;
  alertCount: number;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/rewards", label: "Rewards", icon: "🪙" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardSidebar({
  profile,
  alertCount,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 pb-2">
        <Link href="/dashboard" className="block">
          <h1 className="font-heading text-xl font-bold tracking-tight">
            Eco
            <span className="text-gradient-eco">Bin</span>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full ml-0.5 align-super"
              style={{ backgroundColor: "var(--color-organic)" }}
            />
          </h1>
        </Link>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Smart Waste System
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? "rgba(16,185,129,0.1)" : "transparent",
                color: active ? "#10B981" : "var(--text-secondary)",
                border: active
                  ? "1px solid rgba(16,185,129,0.2)"
                  : "1px solid transparent",
              }}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {/* Alert badge on Dashboard */}
              {item.href === "/dashboard" && alertCount > 0 && (
                <span
                  className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{
                    background: "rgba(239,68,68,0.2)",
                    color: "#EF4444",
                  }}
                >
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section: Coin balance + Sign out */}
      <div className="p-4 space-y-3">
        {/* Coin balance card */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">🪙</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              EcoCoins
            </span>
          </div>
          <p className="font-heading text-2xl font-bold" style={{ color: "#FBBF24" }}>
            {profile.coin_balance.toLocaleString()}
          </p>
        </div>

        {/* User info + Sign out */}
        <div className="flex items-center gap-3 px-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: "rgba(16,185,129,0.15)",
              color: "#10B981",
            }}
          >
            {profile.display_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {profile.display_name || "User"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Sign out"
          >
            ↪
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          backdropFilter: "blur(12px)",
        }}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        style={{
          background: "rgba(10,10,14,0.92)",
          backdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ color: "var(--text-muted)" }}
        >
          ✕
        </button>

        {sidebarContent}
      </aside>
    </>
  );
}
