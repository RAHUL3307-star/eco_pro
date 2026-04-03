"use client";

/**
 * Settings Page — /dashboard/settings
 *
 * Three tabs:
 * 1. Profile — edit display name, view email
 * 2. My Bin — bin info, API key reveal/copy
 * 3. RFID Cards — manage bin members and RFID UIDs
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import type { Bin, BinMember, Profile } from "@/lib/types";

type TabId = "profile" | "bin" | "rfid";

interface BinMemberWithProfile extends BinMember {
  profiles?: { display_name: string } | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [loading, setLoading] = useState(true);

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Bin state
  const [bin, setBin] = useState<Bin | null>(null);
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // RFID members state
  const [members, setMembers] = useState<BinMemberWithProfile[]>([]);
  const [newRfidUid, setNewRfidUid] = useState("");
  const [addingRfid, setAddingRfid] = useState(false);
  const [rfidError, setRfidError] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  // ── Load data on mount ──
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      // Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (prof) {
        setProfile(prof as Profile);
        setDisplayName(prof.display_name);
      }

      // Bin membership
      const { data: membership } = await supabase
        .from("bin_members")
        .select("bin_id, role, bins(*)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (membership) {
        const binData = membership.bins as unknown as Bin;
        setBin(binData);
        setIsOwner(membership.role === "owner");

        // Load all members of this bin
        const { data: mems } = await supabase
          .from("bin_members")
          .select("*, profiles(display_name)")
          .eq("bin_id", binData.id);
        if (mems) setMembers(mems as BinMemberWithProfile[]);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // ── Save profile ──
  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", profile.id);

    if (error) {
      setSaveMsg("Failed to save. Please try again.");
    } else {
      setSaveMsg("Profile saved!");
      setTimeout(() => setSaveMsg(""), 3000);
    }
    setSaving(false);
  };

  // ── Copy API key ──
  const handleCopyApiKey = async () => {
    if (!bin) return;
    await navigator.clipboard.writeText(bin.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Remove member ──
  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase
      .from("bin_members")
      .delete()
      .eq("id", memberId);
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  };

  // ── Add RFID ──
  const handleAddRfid = async () => {
    if (!bin || !newRfidUid.trim()) return;
    setAddingRfid(true);
    setRfidError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update current user's RFID UID
    const { error } = await supabase
      .from("bin_members")
      .update({ rfid_uid: newRfidUid.trim().toUpperCase() })
      .eq("bin_id", bin.id)
      .eq("user_id", user.id);

    if (error) {
      setRfidError(error.message.includes("unique")
        ? "This RFID UID is already in use."
        : "Failed to add RFID card.");
    } else {
      setNewRfidUid("");
      // Reload members
      const { data: mems } = await supabase
        .from("bin_members")
        .select("*, profiles(display_name)")
        .eq("bin_id", bin.id);
      if (mems) setMembers(mems as BinMemberWithProfile[]);
    }
    setAddingRfid(false);
  };

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "bin", label: "My Bin", icon: "🗑️" },
    { id: "rfid", label: "RFID Cards", icon: "💳" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h2
        className="font-heading text-2xl font-bold"
        style={{ animation: "slideUp 0.5s ease-out both" }}
      >
        Settings
      </h2>

      {/* ── Tab selector ── */}
      <div
        className="flex gap-2 p-1 rounded-xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          animation: "slideUp 0.5s ease-out 0.1s both",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? "rgba(16,185,129,0.1)" : "transparent",
              color: activeTab === tab.id ? "#10B981" : "var(--text-secondary)",
              border: activeTab === tab.id ? "1px solid rgba(16,185,129,0.2)" : "1px solid transparent",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: PROFILE ═══ */}
      {activeTab === "profile" && (
        <div className="glass-card p-6 space-y-5" style={{ animation: "fadeIn 0.3s ease-out" }}>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-dark"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="input-dark opacity-60 cursor-not-allowed"
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Email cannot be changed here.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn-primary !w-auto px-6 flex items-center gap-2"
            >
              {saving ? <><span className="spinner" /> Saving...</> : "Save Changes"}
            </button>
            {saveMsg && (
              <span className="text-sm" style={{ color: saveMsg.includes("Failed") ? "#EF4444" : "#10B981" }}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB 2: MY BIN ═══ */}
      {activeTab === "bin" && (
        <div className="space-y-4" style={{ animation: "fadeIn 0.3s ease-out" }}>
          {!bin ? (
            <div className="glass-card p-8 text-center">
              <p className="text-lg mb-4" style={{ color: "var(--text-secondary)" }}>
                No bin linked yet.
              </p>
              <Link href="/dashboard/settings/link-bin" className="btn-primary !w-auto inline-flex px-6">
                ⚡ Link Your EcoBin
              </Link>
            </div>
          ) : (
            <div className="glass-card p-6 space-y-5">
              {/* Bin name + status */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold">{bin.bin_name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    ID: {bin.id.slice(0, 8)}...
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: bin.is_online ? "#10B981" : "#64748B",
                      boxShadow: bin.is_online ? "0 0 8px rgba(16,185,129,0.5)" : "none",
                    }}
                  />
                  <span className="text-sm" style={{ color: bin.is_online ? "#10B981" : "var(--text-muted)" }}>
                    {bin.is_online ? "Online" : "Offline"}
                  </span>
                </div>
              </div>

              <div
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Last seen: {new Date(bin.last_seen_at).toLocaleString()}
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  API Key
                </label>
                <div className="flex gap-2">
                  <div
                    className="input-dark flex-1 font-mono text-xs overflow-hidden"
                    style={{
                      filter: apiKeyRevealed ? "none" : "blur(6px)",
                      userSelect: apiKeyRevealed ? "auto" : "none",
                      transition: "filter 0.3s",
                    }}
                  >
                    {bin.api_key}
                  </div>
                  <button
                    onClick={() => setApiKeyRevealed(!apiKeyRevealed)}
                    className="px-3 py-2 rounded-lg text-xs font-medium"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {apiKeyRevealed ? "Hide" : "Reveal"}
                  </button>
                  <button
                    onClick={handleCopyApiKey}
                    className="px-3 py-2 rounded-lg text-xs font-medium"
                    style={{
                      background: copied ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${copied ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`,
                      color: copied ? "#10B981" : "var(--text-secondary)",
                    }}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  This key goes in your Arduino EcoBin.ino file as <code className="text-xs" style={{ color: "#10B981" }}>API_KEY</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 3: RFID CARDS ═══ */}
      {activeTab === "rfid" && (
        <div className="space-y-4" style={{ animation: "fadeIn 0.3s ease-out" }}>
          {!bin ? (
            <div className="glass-card p-8 text-center">
              <p style={{ color: "var(--text-secondary)" }}>
                Link a bin first to manage RFID cards.
              </p>
            </div>
          ) : (
            <>
              {/* Members list */}
              <div className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Bin Members</h3>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}
                        >
                          {(member.profiles?.display_name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.profiles?.display_name || "Unknown"}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            RFID: {member.rfid_uid || "Not set"}{" "}
                            <span
                              className="px-1.5 py-0.5 rounded text-xs ml-1"
                              style={{
                                background: member.role === "owner" ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.05)",
                                color: member.role === "owner" ? "#FBBF24" : "var(--text-muted)",
                              }}
                            >
                              {member.role}
                            </span>
                          </p>
                        </div>
                      </div>
                      {isOwner && member.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveMember(member.id!)}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            color: "#EF4444",
                            border: "1px solid rgba(239,68,68,0.2)",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add/Update RFID */}
              <div className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-2">Update Your RFID Card</h3>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                  Tap your RFID card on the EcoBin reader and note the UID shown on the OLED screen,
                  then enter it below. Format: 8 hex characters (e.g., A1B2C3D4).
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRfidUid}
                    onChange={(e) => setNewRfidUid(e.target.value)}
                    placeholder="e.g. A1B2C3D4"
                    maxLength={16}
                    className="input-dark flex-1 font-mono uppercase"
                  />
                  <button
                    onClick={handleAddRfid}
                    disabled={addingRfid || !newRfidUid.trim()}
                    className="btn-primary !w-auto px-5 flex items-center gap-2"
                  >
                    {addingRfid ? <span className="spinner" /> : "Save"}
                  </button>
                </div>
                {rfidError && (
                  <p className="text-xs mt-2" style={{ color: "#EF4444" }}>{rfidError}</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
