// Admin auth route (commerce PR-08) — sign IN / sign OUT for the single operator
// account, backed by Supabase Auth (email/password). OPERATOR-ONLY: it runs only on
// the local operator surface (assertOperator() 404s it under a public build) — the
// admin never deploys to Vercel.
//
// A Route Handler is the right place for this: unlike a Server Component, it can
// WRITE cookies, so the @supabase/ssr client's `setAll` actually persists the
// session cookie on sign-in and clears it on sign-out. The pages then read that
// cookie via `getOperatorUserId()`.
//
// House JSON shape ({ ok:true } / { ok:false, error:"snake_case" }). Auth failures
// return a single opaque `invalid_credentials` — we never reveal whether the email
// exists or the password was wrong, and never echo the Supabase error verbatim.

import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";
import { assertOperator } from "@/lib/runtime/surface";

/** Read `{ email, password }` strings from a parsed JSON body. */
function readCredentials(
  body: unknown,
): { email: string; password: string } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const { email, password } = record;
  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }
  if (email.trim() === "" || password === "") {
    return null;
  }
  return { email: email.trim(), password };
}

/** POST — sign in with email + password; sets the session cookie on success. */
export async function POST(request: Request): Promise<Response> {
  const gate = assertOperator();
  if (gate) return gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const credentials = readCredentials(body);
  if (!credentials) {
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseAuthClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    // Opaque — don't distinguish "no such user" from "wrong password", and don't
    // echo the provider's message.
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — sign out; clears the session cookie. */
export async function DELETE(): Promise<Response> {
  const gate = assertOperator();
  if (gate) return gate;

  const supabase = await createSupabaseAuthClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
