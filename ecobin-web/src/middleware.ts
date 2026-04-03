/**
 * Next.js Middleware — runs BEFORE every matching request.
 *
 * Purpose:
 * 1. Refreshes the Supabase auth session token (keeps users logged in)
 * 2. Protects /dashboard/* routes — redirects to /login if not authenticated
 * 3. Redirects logged-in users away from /login and /signup to /dashboard
 *
 * This runs on the Edge Runtime (fast, runs globally close to the user).
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Create a response object we can modify (add/update cookies)
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create a Supabase client that reads/writes cookies on the request/response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // Update cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Also update cookies on the response (sent back to browser)
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is CRITICAL.
  // Without this, the session token expires and the user gets logged out.
  // getUser() also validates the token with the Supabase server (secure).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Protected routes: /dashboard/* ──
  // If the user is NOT logged in and trying to access dashboard, redirect to login.
  if (!user && pathname.startsWith("/dashboard")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // ── Auth pages: redirect logged-in users to dashboard ──
  // If the user IS logged in and on /login or /signup, send them to dashboard.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  // ── Onboarding: redirect to link-bin if user has no bins ──
  // Skip this check if already on settings pages or link-bin (to avoid redirect loops)
  if (
    user &&
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/settings")
  ) {
    try {
      const { data: membership } = await supabase
        .from("bin_members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!membership) {
        const linkBinUrl = request.nextUrl.clone();
        linkBinUrl.pathname = "/dashboard/settings/link-bin";
        return NextResponse.redirect(linkBinUrl);
      }
    } catch {
      // If the query fails (e.g., RLS issue), don't block navigation
      // The dashboard page itself handles the "no bin" state
    }
  }

  return supabaseResponse;
}

// Only run middleware on these paths (skip static assets, images, API routes)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
