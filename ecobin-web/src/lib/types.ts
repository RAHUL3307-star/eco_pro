/**
 * Shared TypeScript types for the EcoBin dashboard.
 * These mirror the Supabase database schema exactly.
 */

export type SectorType = "organic" | "inorganic" | "metal";
export type MemberRole = "owner" | "member";
export type AlertType = "bin_full" | "bin_cleared";

export interface Profile {
  id: string;
  display_name: string;
  coin_balance: number;
  created_at: string;
}

export interface Bin {
  id: string;
  bin_name: string;
  is_online: boolean;
  last_seen_at: string;
  api_key: string;
  created_at: string;
}

export interface BinMember {
  id: string;
  bin_id: string;
  user_id: string;
  rfid_uid: string;
  role: MemberRole;
  created_at: string;
}

export interface Sector {
  id: string;
  bin_id: string;
  sector_type: SectorType;
  fill_level_percent: number;
  weight_grams: number;
  is_full: boolean;
  updated_at: string;
}

export interface WasteEvent {
  id: string;
  bin_id: string;
  user_id: string | null;
  sector_type: SectorType;
  was_manual: boolean;
  was_correct: boolean;
  coins_earned: number;
  created_at: string;
}

export interface Alert {
  id: string;
  bin_id: string;
  sector_type: SectorType;
  alert_type: AlertType;
  is_read: boolean;
  created_at: string;
}

/** Sector display metadata */
export const SECTOR_CONFIG: Record<
  SectorType,
  { label: string; emoji: string; color: string; bgAlpha: string }
> = {
  organic: {
    label: "Organic",
    emoji: "🌿",
    color: "#10B981",
    bgAlpha: "rgba(16,185,129,0.15)",
  },
  inorganic: {
    label: "Inorganic",
    emoji: "📦",
    color: "#F59E0B",
    bgAlpha: "rgba(245,158,11,0.15)",
  },
  metal: {
    label: "Metal",
    emoji: "🔩",
    color: "#3B82F6",
    bgAlpha: "rgba(59,130,246,0.15)",
  },
};
