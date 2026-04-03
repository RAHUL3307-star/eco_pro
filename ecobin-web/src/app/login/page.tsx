"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

/**
 * Login Page — /login
 *
 * Glassmorphism card centered on an animated grid background.
 * Handles Supabase email/password authentication.
 * Redirects to /dashboard on success.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Successful login — navigate to dashboard
    router.push("/dashboard");
    router.refresh(); // Refresh server components to pick up the new session
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* ── Animated Background Grid ── */}
      <div className="bg-grid-pattern fixed inset-0 opacity-40" />

      {/* ── Ambient Glow Orbs ── */}
      <div
        className="fixed top-1/4 -left-32 w-96 h-96 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)",
          animation: "floatAnim 8s ease-in-out infinite",
          willChange: "transform",
        }}
      />
      <div
        className="fixed bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
          animation: "floatAnim 10s ease-in-out infinite 2s",
          willChange: "transform",
        }}
      />

      {/* ── Login Card ── */}
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
            Smart Waste Segregation System
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

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Email
            </label>
            <input
              id="login-email"
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
              htmlFor="login-password"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              minLength={6}
              className="input-dark"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Signup Link */}
        <p
          className="text-center text-sm mt-6"
          style={{ color: "var(--text-secondary)" }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--color-organic)" }}
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
