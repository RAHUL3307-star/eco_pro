/**
 * Server-side Supabase client.
 *
 * Uses `createServerClient` from @supabase/ssr with Next.js cookies.
 * This client runs in Server Components, Server Actions, and Route Handlers.
 * It reads the user's session from cookies and enforces RLS.
 *
 * Usage:  import { createClient } from '@/lib/supabase/server'
 *         const supabase = await createClient()
 *         const { data } = await supabase.from('profiles').select('*')
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as { path?: string; domain?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "strict" | "lax" | "none" })
            );
          } catch {
            // setAll is called from a Server Component where cookies
            // cannot be modified. This is safe to ignore because
            // middleware will handle the refresh before it gets here.
          }
        },
      },
    }
  );
}
