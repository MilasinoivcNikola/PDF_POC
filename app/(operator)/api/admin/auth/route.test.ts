import { describe, it, expect, vi, beforeEach } from "vitest";

// The /api/admin/auth boundary (commerce PR-08) — sign IN (POST) / sign OUT
// (DELETE) for the single operator account, backed by Supabase Auth. The COOKIE
// internals (`@supabase/ssr`'s setAll writing the session cookie to the response)
// are the SDK's job and aren't unit-testable here; what we CAN and MUST assert is
// the route's own contract:
//   - the house JSON shape ({ ok:true } / { ok:false, error:"snake_case" }),
//   - an OPAQUE `invalid_credentials` that never echoes the provider's raw error
//     and never reveals which field was wrong,
//   - the auth client is called with the right method + the trimmed credentials.
//
// `createSupabaseAuthClient` is MOCKED to a tiny fake whose `auth.signInWithPassword`
// / `auth.signOut` we control — so NO real Supabase, NO network, NO cookie store.
// DEPLOY_TARGET defaults to "operator" so assertOperator() passes (the public-build
// 404 is proven in lib/runtime/all-operator-routes-gate.test.ts).

const signInWithPasswordMock = vi.fn();
const signOutMock = vi.fn();
const createSupabaseAuthClientMock = vi.fn();

vi.mock("@/lib/supabase/auth", () => ({
  createSupabaseAuthClient: () => createSupabaseAuthClientMock(),
}));

const { POST, DELETE } = await import("./route");

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInWithPasswordMock.mockResolvedValue({ error: null });
  signOutMock.mockResolvedValue({ error: null });
  createSupabaseAuthClientMock.mockResolvedValue({
    auth: {
      signInWithPassword: (creds: unknown) => signInWithPasswordMock(creds),
      signOut: () => signOutMock(),
    },
  });
});

// ---------------------------------------------------------------------------
// POST — sign in
// ---------------------------------------------------------------------------

describe("POST /api/admin/auth — sign in", () => {
  it("signs in valid credentials and returns the house success shape", async () => {
    const res = await POST(
      jsonRequest({ email: "operator@example.com", password: "s3cret" }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    // The auth client was asked to sign in with exactly these credentials.
    expect(signInWithPasswordMock).toHaveBeenCalledTimes(1);
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "operator@example.com",
      password: "s3cret",
    });
  });

  it("trims the email before signing in (but never the password)", async () => {
    await POST(
      jsonRequest({ email: "  operator@example.com  ", password: " keep spaces " }),
    );
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "operator@example.com",
      password: " keep spaces ",
    });
  });

  it("returns an OPAQUE invalid_credentials on bad creds — no provider message, no field hint", async () => {
    // The provider says exactly which field was wrong; the route must NOT leak it.
    signInWithPasswordMock.mockResolvedValue({
      error: { message: "Invalid login: no user found for email operator@example.com" },
    });

    const res = await POST(
      jsonRequest({ email: "operator@example.com", password: "wrong" }),
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body).toEqual({ ok: false, error: "invalid_credentials" });

    // The opaque guarantee: nothing from the provider's message, no email echo, no
    // "user"/"password" hint about which field was wrong.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("no user found");
    expect(serialized).not.toContain("operator@example.com");
    expect(serialized.toLowerCase()).not.toContain("password");
  });

  it("rejects an unparseable body with 400 invalid_json (no auth client built)", async () => {
    const req = new Request("http://localhost/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_json" });
    expect(createSupabaseAuthClientMock).not.toHaveBeenCalled();
  });

  it("rejects a missing/blank field with 400 invalid_credentials and never calls the auth client", async () => {
    for (const body of [
      {},
      { email: "operator@example.com" }, // no password
      { password: "s3cret" }, // no email
      { email: "   ", password: "s3cret" }, // blank email
      { email: "operator@example.com", password: "" }, // blank password
      { email: 5, password: "s3cret" }, // wrong type
    ]) {
      vi.clearAllMocks();
      createSupabaseAuthClientMock.mockResolvedValue({
        auth: { signInWithPassword: signInWithPasswordMock, signOut: signOutMock },
      });

      const res = await POST(jsonRequest(body));
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        ok: false,
        error: "invalid_credentials",
      });
      // No round-trip to Supabase for a malformed request.
      expect(createSupabaseAuthClientMock).not.toHaveBeenCalled();
      expect(signInWithPasswordMock).not.toHaveBeenCalled();
    }
  });
});

// ---------------------------------------------------------------------------
// DELETE — sign out
// ---------------------------------------------------------------------------

describe("DELETE /api/admin/auth — sign out", () => {
  it("signs out and returns the house success shape", async () => {
    const res = await DELETE();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    // The sign-out (which clears the session cookie via the SSR client) was invoked.
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
