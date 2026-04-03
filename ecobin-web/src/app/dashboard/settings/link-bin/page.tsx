"use client";

/**
 * Link Bin Page — /dashboard/settings/link-bin
 *
 * Onboarding wizard for new users to register their first EcoBin device.
 *
 * Steps:
 * 1. Enter bin name → POST /api/bins/register → receive api_key
 * 2. Show api_key in copyable code block for Arduino config
 * 3. Flash instructions + "Done" redirect to /dashboard
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LinkBinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [binName, setBinName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Step 1: Register bin ──
  const handleRegister = async () => {
    if (!binName.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bins/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bin_name: binName.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== "ok") {
        setError(data.message || "Failed to register bin. Please try again.");
        setLoading(false);
        return;
      }

      setApiKey(data.bin.api_key);
      setStep(2);
    } catch {
      setError("Network error. Please check your connection.");
    }
    setLoading(false);
  };

  // ── Copy code ──
  const handleCopyCode = async () => {
    const code = `const char* API_KEY = "${apiKey}";`;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
            style={{
              background: step >= s ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              color: step >= s ? "#10B981" : "var(--text-muted)",
              border: `1px solid ${step >= s ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            {step > s ? "✓" : s}
          </div>
          {s < 3 && (
            <div
              className="w-12 h-0.5 rounded"
              style={{
                background: step > s ? "#10B981" : "rgba(255,255,255,0.08)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto py-8">
      <StepIndicator />

      {/* ═══ STEP 1: Name your bin ═══ */}
      {step === 1 && (
        <div
          className="glass-card p-8 text-center"
          style={{ animation: "slideUp 0.5s ease-out both" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
            style={{ background: "rgba(16,185,129,0.15)" }}
          >
            🗑️
          </div>
          <h2 className="font-heading text-xl font-bold mb-2">
            Name Your EcoBin
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Give your bin a name so you can identify it on the dashboard.
          </p>

          <input
            type="text"
            value={binName}
            onChange={(e) => setBinName(e.target.value)}
            placeholder="e.g. Kitchen Bin, Lab Bin"
            className="input-dark mb-4"
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          />

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm text-left"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#EF4444",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading || !binName.trim()}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="spinner" /> Registering...</>
            ) : (
              <>Register Bin →</>
            )}
          </button>
        </div>
      )}

      {/* ═══ STEP 2: Copy API key ═══ */}
      {step === 2 && (
        <div
          className="glass-card p-8"
          style={{ animation: "slideUp 0.5s ease-out both" }}
        >
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ background: "rgba(251,191,36,0.15)" }}
            >
              🔑
            </div>
            <h2 className="font-heading text-xl font-bold mb-2">
              Your API Key
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Copy this key into your Arduino <code style={{ color: "#10B981" }}>EcoBin.ino</code> file.
            </p>
          </div>

          {/* Code block */}
          <div
            className="relative rounded-xl p-4 mb-4 font-mono text-sm"
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "#64748B" }}>// WiFi & API config in EcoBin.ino</span>
            </div>
            <div className="mt-1">
              <span style={{ color: "#F59E0B" }}>const char*</span>{" "}
              <span style={{ color: "#10B981" }}>API_KEY</span>{" "}
              <span style={{ color: "var(--text-secondary)" }}>=</span>{" "}
              <span style={{ color: "#FBBF24" }}>&quot;{apiKey}&quot;</span>
              <span style={{ color: "var(--text-secondary)" }}>;</span>
            </div>

            <button
              onClick={handleCopyCode}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
                color: copied ? "#10B981" : "var(--text-secondary)",
              }}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>

          <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
            Replace <code style={{ color: "#10B981" }}>YOUR_API_KEY_HERE</code> in the
            WiFi & API Configuration section of your EcoBin.ino file.
          </p>

          <button
            onClick={() => setStep(3)}
            className="btn-primary"
          >
            I&apos;ve copied the key →
          </button>
        </div>
      )}

      {/* ═══ STEP 3: Flash & finish ═══ */}
      {step === 3 && (
        <div
          className="glass-card p-8"
          style={{ animation: "slideUp 0.5s ease-out both" }}
        >
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              ⚡
            </div>
            <h2 className="font-heading text-xl font-bold mb-2">
              Flash Your ESP32
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Follow these steps to get your EcoBin online:
            </p>
          </div>

          <div className="space-y-4 text-sm">
            {[
              { n: "1", text: "Open EcoBin.ino in Arduino IDE" },
              { n: "2", text: "Set your WiFi SSID and Password in the config section" },
              { n: "3", text: "Paste the API key you copied in step 2" },
              { n: "4", text: 'Select Board → "ESP32 Dev Module"' },
              { n: "5", text: "Click Upload (→) and wait for it to compile and flash" },
              { n: "6", text: "Open Serial Monitor at 115200 baud to verify connection" },
            ].map((item) => (
              <div key={item.n} className="flex items-start gap-3">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6" }}
                >
                  {item.n}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-primary"
            >
              ✅ Done — Go to Dashboard
            </button>
            <button
              onClick={() => setStep(2)}
              className="w-full py-2.5 rounded-lg text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              ← Back to API key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
