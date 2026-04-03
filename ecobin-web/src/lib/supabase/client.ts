/**
 * Browser-side Supabase client.
 *
 * Uses `createBrowserClient` from @supabase/ssr which automatically
 * handles cookie-based auth tokens in the browser. This client
 * respects Row Level Security — it can only access data the
 * currently logged-in user is allowed to see.
 *
 * Usage:  import { supabase } from '@/lib/supabase/client'
 *         const { data } = await supabase.from('profiles').select('*')
 */

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
