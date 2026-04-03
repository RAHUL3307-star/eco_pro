import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RewardsClient from "@/components/rewards/RewardsClient";
import type { Profile, WasteEvent } from "@/lib/types";

/**
 * Rewards Page — /dashboard/rewards (Server Component)
 *
 * Fetches coin balance, waste events, and withdrawal history,
 * then passes everything to RewardsClient for interactive display.
 */

interface CoinWithdrawal {
  id: string;
  user_id: string;
  coins_amount: number;
  status: "pending" | "processed";
  requested_at: string;
  notes: string | null;
}

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile with coin balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // All waste events for this user (for stats)
  const { data: events } = await supabase
    .from("waste_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Withdrawal history
  const { data: withdrawals } = await supabase
    .from("coin_withdrawals")
    .select("*")
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false });

  return (
    <RewardsClient
      profile={profile as Profile}
      events={(events as WasteEvent[]) || []}
      withdrawals={(withdrawals as CoinWithdrawal[]) || []}
    />
  );
}
