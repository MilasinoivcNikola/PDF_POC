import { describe, it, expect } from "vitest";

import { isSafeOrderId } from "./ids";
import { createSessionId } from "@/lib/session/storage";

// Security-relevant pure logic: the single guard between an untrusted order id and
// a Supabase Storage object key. Mirrors lib/ai/paths.ts `isSafeSessionId`; no IO,
// so the whole surface is unit-checkable.

describe("isSafeOrderId", () => {
  it("accepts a real createSessionId() output", () => {
    expect(isSafeOrderId(createSessionId())).toBe(true);
  });

  it("accepts plain alphanumerics, hyphens, underscores", () => {
    expect(isSafeOrderId("abc123")).toBe(true);
    expect(isSafeOrderId("with-hyphen")).toBe(true);
    expect(isSafeOrderId("with_underscore")).toBe(true);
    expect(isSafeOrderId("a-b_c-1")).toBe(true);
  });

  it("accepts a 200-char id (the length cap, inclusive)", () => {
    expect(isSafeOrderId("a".repeat(200))).toBe(true);
  });

  it("rejects traversal and separator characters", () => {
    expect(isSafeOrderId("..")).toBe(false);
    expect(isSafeOrderId("../../etc")).toBe(false);
    expect(isSafeOrderId("a/b")).toBe(false);
    expect(isSafeOrderId("a\\b")).toBe(false);
    expect(isSafeOrderId("a.b")).toBe(false);
    expect(isSafeOrderId(".hidden")).toBe(false);
  });

  it("rejects empty, whitespace, NUL, and over-length ids", () => {
    expect(isSafeOrderId("")).toBe(false);
    expect(isSafeOrderId("a b")).toBe(false);
    expect(isSafeOrderId("a\x00b")).toBe(false);
    expect(isSafeOrderId("a".repeat(201))).toBe(false);
  });
});
