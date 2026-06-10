// The server-only Supabase admin client, built with the SERVICE-ROLE key.
//
// SECURITY-CRITICAL — SERVER-SIDE ONLY. The service-role key bypasses Row Level
// Security, so it must never reach a client/public bundle. This module is kept
// separate (the data-access layer in lib/order/store.ts and lib/supabase/storage.ts
// import it; no client component ever does) following the exact discipline of
// lib/session/disk.ts:
//   - It imports a `node:` builtin (`node:process`), which webpack's static
//     analysis treats as a server-only signal and refuses to bundle into client
//     code — so an accidental client import fails the build instead of leaking
//     the key. RLS (the migration) is defence-in-depth on top of this, not a
//     substitute.
//   - The key is read from the environment and NEVER logged or returned.
//
// The public site uses only the anon key behind RLS (a separate client added by a
// later commerce PR when there's a public surface); this module is for the
// operator/worker surface that legitimately needs full access.

import process from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Lazily-constructed singleton so importing this module has no side effects. */
let cached: SupabaseClient | null = null;

/**
 * Read a required env var or throw a readable error naming it (and pointing at
 * .env.local.example), so a misconfigured deploy fails clearly instead of inside
 * a Supabase request. The value is never logged.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.local (see .env.local.example).`,
    );
  }
  return value;
}

/**
 * The shared service-role Supabase client. Built from `SUPABASE_URL` +
 * `SUPABASE_SERVICE_ROLE_KEY`. Session persistence/refresh are disabled — this is
 * a stateless server client, not a logged-in user session, so there is nothing to
 * persist and no token to auto-refresh.
 *
 * Throws if either env var is missing. The key is never logged.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) {
    return cached;
  }
  const url = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  cached = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cached;
}
