/**
 * Service Role Supabase client — BYPASSES all Row Level Security.
 *
 * ⚠️  ONLY use this in API routes (route.ts) that run on the server.
 *     NEVER import this in client components or expose the key to the browser.
 *
 * This client is used by the ESP32 API endpoints (/api/sensor-data, /api/heartbeat)
 * to write data into tables that have no client INSERT policies.
 *
 * Usage:  import { serviceClient } from '@/lib/supabase/service'
 *         await serviceClient.rpc('process_sensor_data', { ... })
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
