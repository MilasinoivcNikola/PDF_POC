// The cookie-based Supabase AUTH client — the operator's logged-in SESSION client
// (commerce PR-08, the admin gate). SERVER-SIDE ONLY.
//
// This is a SEPARATE client from the service-role admin client in
// lib/supabase/server.ts, with a different purpose and key:
//   - lib/supabase/server.ts  → the SERVICE-ROLE key. Bypasses Row Level Security.
//     Used for order data/Storage (reads/writes the orders the admin reviews).
//   - this module             → the ANON key + the logged-in user's session cookie.
//     Used ONLY to authenticate the operator (sign in/out, read `auth.getUser()`).
//     It cannot read or write orders — RLS denies the anon role — so it is purely
//     the gate, never the data path.
//
// Keeping the two apart is deliberate: the auth gate must never accidentally borrow
// service-role power, and the service-role client must never carry a user session.
//
// It imports a `node:` builtin + `next/headers` (server-only), so webpack will
// refuse to bundle it into a client component — same discipline as
// lib/session/disk.ts and lib/supabase/server.ts. The anon key is the only
// client-safe key (NEXT_PUBLIC_*), but this module still must not reach a client
// bundle because it touches the request's cookie store.

import process from "node:process";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Read a required env var or throw a readable error naming it. Mirrors the helper
 * in lib/supabase/server.ts. The value is never logged.
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
 * Build a per-request Supabase auth client bound to the current request's cookie
 * store. MUST be created fresh per server render/request (never cached across
 * requests) — the cookie store is request-scoped. Uses the public URL + anon key
 * (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`), the only keys
 * safe to pair with a user session.
 *
 * `setAll` writes refreshed session cookies back to the response. In a Server
 * Component the cookie store is read-only and a `set` throws; we swallow that
 * (a token refresh just won't persist for that render, which Next handles on the
 * next request), so reads (`auth.getUser()`) work from any server context.
 */
export async function createSupabaseAuthClient(): Promise<SupabaseClient> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where the cookie store is read-only.
          // Safe to ignore — session reads still work; a refresh persists on the
          // next request that runs through a route handler / server action.
        }
      },
    },
  });
}

/**
 * Whether the current request carries a valid logged-in Supabase user. The admin
 * pages and the admin mutation routes call this server-side as their auth gate: no
 * user → block (redirect to login / 401). Returns the user id when present so a
 * caller can log who approved an order, or `null` when there is no session.
 *
 * `auth.getUser()` re-validates the token with the Supabase auth server (unlike
 * `getSession()`, which only decodes the cookie), so a tampered/expired cookie does
 * not pass the gate.
 */
export async function getOperatorUserId(): Promise<string | null> {
  const supabase = await createSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
