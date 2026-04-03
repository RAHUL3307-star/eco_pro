import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "@/components/dashboard/DashboardClient";
import Link from "next/link";
import type { Profile, Bin, Sector, WasteEvent, Alert } from "@/lib/types";

/**
 * Dashboard Page — /dashboard (Server Component)
 *
 * Fetches all initial data server-side for fast first paint,
 * then hands off to DashboardClient for real-time updates.
 *
 * If the user has no bins linked, shows an onboarding card.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Fetch user's bins (via bin_members join)
  const { data: memberships } = await supabase
    .from("bin_members")
    .select("bin_id, role, bins(*)")
    .eq("user_id", user.id);

  // Check if user has any bins
  const firstMembership = memberships?.[0];
  const bin = firstMembership?.bins as unknown as Bin | null;

  // ── No bin linked: Show onboarding ──
  if (!bin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="glass-card max-w-md w-full p-8 text-center"
          style={{ animation: "slideUp 0.6s ease-out both" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
            style={{ background: "rgba(16,185,129,0.15)" }}
          >
            🗑️
          </div>
          <h2 className="font-heading text-xl font-bold mb-2">
            Link your EcoBin
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Register your EcoBin device to start monitoring fill levels,
            earning EcoCoins, and viewing live waste analytics.
          </p>
          <Link
            href="/dashboard/settings"
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            <span>Set Up Your Bin</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── Fetch dashboard data for the first bin ──
  const binId = bin.id;

  // Sectors
  const { data: sectors } = await supabase
    .from("sectors")
    .select("*")
    .eq("bin_id", binId);

  // Recent waste events (last 10)
  const { data: events } = await supabase
    .from("waste_events")
    .select("*")
    .eq("bin_id", binId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Unread alerts
  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("bin_id", binId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  return (
    <DashboardClient
      profile={profile as Profile}
      bin={bin}
      initialSectors={(sectors as Sector[]) || []}
      initialEvents={(events as WasteEvent[]) || []}
      initialAlerts={(alerts as Alert[]) || []}
    />
  );
}
