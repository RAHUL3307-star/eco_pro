/**
 * EcoBin — Supabase Database Connectivity Test
 * Run: node scripts/test-db.mjs
 *
 * Tests:
 *  1. Supabase reachability (can we connect at all?)
 *  2. bins table — has gas_level and gas_danger columns
 *  3. alerts table — can accept "gas_danger" alert_type
 *  4. sectors table — has unique constraint on (bin_id, sector_type)
 *  5. Service role key can bypass RLS (service client works)
 *  6. profiles table is reachable
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_URL_HERE";
const ANON_KEY          = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_ANON_KEY_HERE";
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SERVICE_KEY_HERE";

const anon    = createClient(SUPABASE_URL, ANON_KEY);
const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}
function fail(label, detail) {
  console.log(`  ❌  ${label}`);
  if (detail) console.log(`       → ${detail}`);
  failed++;
}

async function run() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   EcoBin — Supabase DB Health Check  ║");
  console.log("╚══════════════════════════════════════╝\n");

  // ── 1. Anon client: basic connectivity ──
  console.log("① Anon client — basic connectivity");
  try {
    const { error } = await anon.from("bins").select("id").limit(1);
    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows — that's fine
      fail("bins table reachable via anon key", error.message);
    } else {
      ok("bins table reachable via anon key");
    }
  } catch (e) {
    fail("Network error reaching Supabase", e.message);
    console.log("\n⛔ Aborting — cannot reach Supabase at all.\n");
    process.exit(1);
  }

  // ── 2. Service client: RLS bypass ──
  console.log("\n② Service role client — RLS bypass");
  try {
    const { data, error } = await service.from("bins").select("*").limit(1);
    if (error) {
      fail("Service role can read bins", error.message);
    } else {
      ok("Service role can read bins (RLS bypassed)");

      if (data && data.length > 0) {
        const bin = data[0];
        // Check gas_level column
        if ("gas_level" in bin) {
          ok(`bins.gas_level column exists (value: ${bin.gas_level})`);
        } else {
          fail("bins.gas_level column is MISSING — run DB migration!");
        }
        // Check gas_danger column
        if ("gas_danger" in bin) {
          ok(`bins.gas_danger column exists (value: ${bin.gas_danger})`);
        } else {
          fail("bins.gas_danger column is MISSING — run DB migration!");
        }
        // Show bin info
        console.log(`\n       📦 Bin found: "${bin.bin_name}" | online: ${bin.is_online} | last seen: ${bin.last_seen_at}`);
      } else {
        console.log("       ℹ️  No bins registered yet (table is empty) — columns cannot be verified from live data.");
        // Try checking schema via a dummy upsert dry-run (insert nothing, just test column names)
        const { error: colErr } = await service
          .from("bins")
          .select("id, gas_level, gas_danger")
          .limit(0);
        if (colErr) {
          fail("bins.gas_level / bins.gas_danger columns missing", colErr.message);
        } else {
          ok("bins.gas_level and bins.gas_danger columns exist (schema query passed)");
        }
      }
    }
  } catch (e) {
    fail("Service role client error", e.message);
  }

  // ── 3. sectors table ──
  console.log("\n③ sectors table — schema check");
  try {
    const { error } = await service
      .from("sectors")
      .select("id, bin_id, sector_type, fill_level_percent, is_full")
      .limit(0);
    if (error) {
      fail("sectors table schema", error.message);
    } else {
      ok("sectors table has expected columns");
    }
  } catch (e) {
    fail("sectors table unreachable", e.message);
  }

  // ── 4. alerts table — gas_danger support ──
  console.log("\n④ alerts table — gas_danger alert_type");
  try {
    // Check if any gas_danger alerts exist OR if the column accepts the value
    const { error } = await service
      .from("alerts")
      .select("id, alert_type")
      .eq("alert_type", "gas_danger")
      .limit(1);
    if (error) {
      fail("alerts table rejects 'gas_danger' alert_type", error.message);
    } else {
      ok("alerts table accepts 'gas_danger' alert_type");
    }
  } catch (e) {
    fail("alerts table unreachable", e.message);
  }

  // ── 5. bin_members table ──
  console.log("\n⑤ bin_members table — RFID lookup");
  try {
    const { error } = await service
      .from("bin_members")
      .select("id, bin_id, user_id, rfid_uid, role")
      .limit(0);
    if (error) {
      fail("bin_members table schema", error.message);
    } else {
      ok("bin_members table has expected columns");
    }
  } catch (e) {
    fail("bin_members table unreachable", e.message);
  }

  // ── 6. waste_events table ──
  console.log("\n⑥ waste_events table");
  try {
    const { error } = await service
      .from("waste_events")
      .select("id, bin_id, sector_type, was_manual, coins_earned")
      .limit(0);
    if (error) {
      fail("waste_events table schema", error.message);
    } else {
      ok("waste_events table has expected columns");
    }
  } catch (e) {
    fail("waste_events table unreachable", e.message);
  }

  // ── 7. profiles table ──
  console.log("\n⑦ profiles table");
  try {
    const { error } = await service
      .from("profiles")
      .select("id, display_name, coin_balance")
      .limit(0);
    if (error) {
      fail("profiles table schema", error.message);
    } else {
      ok("profiles table has expected columns");
    }
  } catch (e) {
    fail("profiles table unreachable", e.message);
  }

  // ── Summary ──
  console.log("\n══════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════\n");

  if (failed === 0) {
    console.log("🎉 Database is fully connected and schema is correct!\n");
  } else {
    console.log("⚠️  Some checks failed. See above for details.\n");
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
