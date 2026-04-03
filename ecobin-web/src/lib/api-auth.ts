/**
 * API Authentication & Rate Limiting
 *
 * Validates the x-api-key header sent by ESP32 hardware against the
 * bins table. Each physical EcoBin device has a unique 64-character
 * hex API key generated when the bin is registered.
 *
 * Also implements in-memory rate limiting (60 requests/min per key)
 * to prevent runaway ESP32 firmware from flooding the database.
 */

import { serviceClient } from "@/lib/supabase/service";

// ════════════════════════════════════════
// RATE LIMITER — In-Memory Sliding Window
// ════════════════════════════════════════
// Stores timestamps of recent requests per API key.
// In production with multiple serverless instances, you'd use Redis.
// For a hackathon single-instance deployment, in-memory is fine.

const MAX_REQUESTS_PER_MINUTE = 60;
const WINDOW_MS = 60 * 1000; // 1 minute in milliseconds

// Map<apiKey, timestamp[]> — stores request timestamps per key
const rateLimitMap = new Map<string, number[]>();

/**
 * Check if an API key has exceeded the rate limit.
 * Uses a sliding window: only counts requests within the last 60 seconds.
 */
function isRateLimited(apiKey: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(apiKey) || [];

  // Filter out timestamps older than the window
  const recentTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recentTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    // Update the map with filtered timestamps (cleanup old ones)
    rateLimitMap.set(apiKey, recentTimestamps);
    return true; // Rate limited!
  }

  // Record this request's timestamp
  recentTimestamps.push(now);
  rateLimitMap.set(apiKey, recentTimestamps);
  return false;
}

// Periodically clean up stale entries to prevent memory leaks
// Runs every 5 minutes, removes keys with no recent requests
if (typeof globalThis !== "undefined") {
  const cleanupKey = "__rateLimitCleanupInterval";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as Record<string, unknown>;
  if (!g[cleanupKey]) {
    g[cleanupKey] = setInterval(() => {
      const now = Date.now();
      const keys = Array.from(rateLimitMap.keys());
      for (const key of keys) {
        const timestamps = rateLimitMap.get(key);
        if (!timestamps) continue;
        const recent = timestamps.filter((t: number) => now - t < WINDOW_MS);
        if (recent.length === 0) {
          rateLimitMap.delete(key);
        } else {
          rateLimitMap.set(key, recent);
        }
      }
    }, 5 * 60 * 1000);
  }
}

// ════════════════════════════════════════
// API KEY VALIDATION
// ════════════════════════════════════════

interface ApiKeyResult {
  valid: boolean;
  binId: string | null;
  error?: string;
}

/**
 * Validate the x-api-key header from an incoming request.
 *
 * 1. Extracts the key from the header
 * 2. Checks rate limit (60 req/min)
 * 3. Queries the bins table for a matching api_key
 * 4. Returns the bin's UUID if valid
 *
 * @param request - The incoming HTTP request
 * @returns Object with { valid, binId, error? }
 */
export async function validateApiKey(request: Request): Promise<ApiKeyResult> {
  // Step 1: Extract the API key from headers
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey || apiKey.trim() === "") {
    return { valid: false, binId: null, error: "Missing x-api-key header" };
  }

  // Step 2: Check rate limit
  if (isRateLimited(apiKey)) {
    return {
      valid: false,
      binId: null,
      error: "Rate limit exceeded (max 60 requests/minute)",
    };
  }

  // Step 3: Look up the API key in the bins table
  // Uses serviceClient to bypass RLS (bins table has no public SELECT policy for API keys)
  const { data, error } = await serviceClient
    .from("bins")
    .select("id")
    .eq("api_key", apiKey)
    .single();

  if (error || !data) {
    return { valid: false, binId: null, error: "Invalid API key" };
  }

  // Step 4: Return the bin ID
  return { valid: true, binId: data.id };
}
