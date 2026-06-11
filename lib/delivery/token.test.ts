import { describe, it, expect } from "vitest";
import { mintDeliveryToken, isWellFormedToken } from "./token";

// The token is the only credential gating a customer's finished book, so the
// properties that matter are SHAPE (URL-path-safe base64url) + UNGUESSABILITY
// (uniqueness across calls — we never assert an exact value, since it's random) and
// the EXACT accept/reject behaviour of the cheap validator.

describe("mintDeliveryToken", () => {
  it("produces a 43-char unpadded base64url token (URL-path-safe)", () => {
    const token = mintDeliveryToken();
    // base64url charset only — no `/`, `+`, or `=` that would break a path segment.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token).not.toContain("/");
    expect(token).not.toContain("+");
    expect(token).not.toContain("=");
  });

  it("always returns a well-formed token (round-trips through the validator)", () => {
    for (let i = 0; i < 100; i++) {
      expect(isWellFormedToken(mintDeliveryToken())).toBe(true);
    }
  });

  it("is unique across calls (cryptographically random, not a counter)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      seen.add(mintDeliveryToken());
    }
    // 256 bits of entropy — a collision in 1000 draws is astronomically unlikely.
    expect(seen.size).toBe(1000);
  });
});

describe("isWellFormedToken", () => {
  it("accepts a token of the exact minted shape", () => {
    expect(isWellFormedToken("a".repeat(43))).toBe(true);
    expect(isWellFormedToken("A1b2-_C3".padEnd(43, "x"))).toBe(true);
  });

  it("rejects the wrong length (too short / too long)", () => {
    expect(isWellFormedToken("a".repeat(42))).toBe(false);
    expect(isWellFormedToken("a".repeat(44))).toBe(false);
    expect(isWellFormedToken("")).toBe(false);
  });

  it("rejects characters outside the base64url charset", () => {
    // Standard base64 padding / `+` / `/` are NOT path-safe and must be rejected.
    expect(isWellFormedToken("=".repeat(43))).toBe(false);
    expect(isWellFormedToken("+".padEnd(43, "a"))).toBe(false);
    expect(isWellFormedToken("/".padEnd(43, "a"))).toBe(false);
    // Path-traversal / separator garbage.
    expect(isWellFormedToken("../../etc/passwd".padEnd(43, "a"))).toBe(false);
    expect(isWellFormedToken(".".repeat(43))).toBe(false);
    expect(isWellFormedToken(`${"a".repeat(42)} `)).toBe(false);
  });

  it("rejects non-string inputs without throwing (defensive at the boundary)", () => {
    // The route resolves `token` from a URL path segment (always a string in
    // practice), but the validator must fail-closed — never throw, never accept —
    // if a non-string ever reaches it. RegExp coercion of these all fails the
    // length+charset test, so the answer is uniformly `false`.
    const nonStrings: unknown[] = [null, undefined, 123, {}, [], true, NaN];
    for (const value of nonStrings) {
      expect(isWellFormedToken(value as unknown as string)).toBe(false);
    }
  });
});
