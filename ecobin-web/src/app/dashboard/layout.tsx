import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import type { Profile } from "@/lib/types";

/**
 * Dashboard Layout — Server Component
 *
 * Wraps all /dashboard/* pages with:
 * - Glassmorphism sidebar (collapsible on mobile)
 * - Top bar with welcome message + notification bell
 * - Auth guard (redirects to /login if not authenticated)
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile for sidebar display
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch user's first bin membership to get bin_id for alert filtering
  const { data: membership } = await supabase
    .from("bin_members")
    .select("bin_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  // Fetch unread alert count for notification badge — filtered by user's bin
  let alertCount = 0;
  if (membership) {
    const { count } = await supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("bin_id", membership.bin_id)
      .eq("is_read", false);
    alertCount = count || 0;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <DashboardSidebar
        profile={profile as Profile}
        alertCount={alertCount || 0}
      />

      {/* Main content area */}
      <main className="flex-1 md:ml-64">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
          style={{
            background: "rgba(6,6,8,0.8)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div>
            <h1 className="font-heading text-lg font-semibold">
              Welcome back
              {profile?.display_name ? `, ${profile.display_name}` : ""}
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Real-time waste monitoring dashboard
            </p>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
