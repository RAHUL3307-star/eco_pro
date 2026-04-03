"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

/**
 * Signup Page — /signup
 *
 * Same glassmorphism design as login page.
 * Collects display_name, email, password.
 * Passes display_name via user metadata so the auth trigger
 * can insert it into the profiles table automatically.
 */
export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState("");

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check if email confirmation is required
    // If session exists → auto-confirmed (hackathon/dev mode), go to dashboard
    // If no session → email confirmation required, show message
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      // Email confirmation is enabled — show success message
      setSuccess(
        "Account created! Check your email for a confirmation link, then come back and sign in."
      );
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* ── Animated Background Grid ── */}
      <div className="bg-grid-pattern fixed inset-0 opacity-40" />

      {/* ── Ambient Glow Orbs ── */}
      <div
        className="fixed top-1/3 -right-32 w-96 h-96 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)",
          animation: "floatAnim 9s ease-in-out infinite",
          willChange: "transform",
        }}
      />
      <div
        className="fixed bottom-1/3 -left-32 w-96 h-96 rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)",
          animation: "floatAnim 11s ease-in-out infinite 3s",
          willChange: "transform",
        }}
      />

      {/* ── Signup Card ── */}
      <div
        className="glass-card relative z-10 w-full max-w-md p-8"
        style={{ animation: "slideUp 0.6s ease-out forwards" }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Eco
            <span className="text-gradient-eco">Bin</span>
            <span
              className="inline-block w-2 h-2 rounded-full ml-1 align-super"
              style={{ backgroundColor: "var(--color-organic)" }}
            />
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Create your EcoBin account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "var(--color-danger)",
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "#10B981",
            }}
          >
            ✅ {success}
            <Link
              href="/login"
              className="block mt-2 font-medium underline"
              style={{ color: "#10B981" }}
            >
              Go to Sign In →
            </Link>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label
              htmlFor="signup-name"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Display Name
            </label>
            <input
              id="signup-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
              className="input-dark"
            />
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="input-dark"
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              autoComplete="new-password"
              minLength={6}
              className="input-dark"
            />
          </div>

          <button
            id="signup-submit"
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Creating account...</span>
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Login Link */}
        <p
          className="text-center text-sm mt-6"
          style={{ color: "var(--text-secondary)" }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--color-organic)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
