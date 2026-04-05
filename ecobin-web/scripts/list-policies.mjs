/**
 * List all RLS policies on bins and bin_members tables
 * so we can see exactly what needs dropping.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_URL_HERE";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SERVICE_KEY_HERE";

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log("\n🔍 Fetching all RLS policies on bins + bin_members...\n");

  const { data, error } = await service.rpc("list_rls_policies");

  if (error) {
    // rpc doesn't exist — use raw SQL via pg_policies view
    const { data: raw, error: rawErr } = await service
      .from("pg_policies")
      .select("*")
      .in("tablename", ["bins", "bin_members"]);

    if (rawErr) {
      console.log("Cannot query pg_policies via client (expected). Trying alternate...");

      // Use a direct SQL query approach
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/sql`,
        {
          method: "POST",
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `SELECT schemaname, tablename, policyname, cmd, qual, with_check 
                    FROM pg_policies 
                    WHERE tablename IN ('bins', 'bin_members')
                    ORDER BY tablename, policyname;`,
          }),
        }
      );
      const text = await res.text();
      console.log("Raw response:", text);
      return;
    }

    console.log("Policies found via pg_policies:", JSON.stringify(raw, null, 2));
    return;
  }

  console.log("Policies:", JSON.stringify(data, null, 2));
}

// Actually the cleanest approach: use Supabase Management API
async function runViaManagementApi() {
  console.log("🔍 Reading policies via pg_policies system view...\n");

  // Query via PostgREST — pg_policies is exposed in public schema on Supabase
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pg_policies?tablename=in.(bins,bin_members)&select=tablename,policyname,cmd,qual`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    console.log(`HTTP ${res.status}: ${await res.text()}`);

    // Fallback: try a direct SQL function
    console.log("\nTrying direct SQL approach...");
    const sqlRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: `SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename IN ('bins','bin_members') ORDER BY tablename, policyname`,
      }),
    });
    console.log(`SQL exec status: ${sqlRes.status}`);
    console.log(await sqlRes.text());
    return;
  }

  const policies = await res.json();
  if (!policies || policies.length === 0) {
    console.log("⚠️  No policies returned (pg_policies may not be exposed).\n");
    console.log("We'll generate DROP statements for ALL known policy name variants.");
    return;
  }

  console.log(`Found ${policies.length} policies:\n`);
  for (const p of policies) {
    console.log(`  Table: ${p.tablename}`);
    console.log(`  Name:  ${p.policyname}`);
    console.log(`  Cmd:   ${p.cmd}`);
    console.log(`  Rule:  ${p.qual}`);
    console.log("");
  }
}

runViaManagementApi().catch(console.error);
