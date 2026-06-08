import { describe, it, expect } from "vitest";
import path from "node:path";

import { isSafeSessionId, resolveUnder } from "./paths";
import { createSessionId } from "@/lib/session/storage";

// Security-relevant pure logic: both helpers are the single traversal defense for
// the Craft-Area-2 file IO (the upload route + the dev reference endpoint). They
// do no IO, so the whole surface is unit-checkable without touching the disk.

// ---------------------------------------------------------------------------
// isSafeSessionId — allowlist `^[A-Za-z0-9_-]{1,200}$`
// ---------------------------------------------------------------------------

describe("isSafeSessionId", () => {
  it("accepts a real createSessionId() output", () => {
    // The allowlist must never reject a legitimately-minted id, or a valid
    // upload would needlessly fall back to a fresh session.
    expect(isSafeSessionId(createSessionId())).toBe(true);
  });

  it("accepts plain alphanumerics", () => {
    expect(isSafeSessionId("abc123")).toBe(true);
    expect(isSafeSessionId("ABC")).toBe(true);
    expect(isSafeSessionId("0")).toBe(true);
  });

  it("accepts hyphens and underscores", () => {
    expect(isSafeSessionId("with-hyphen")).toBe(true);
    expect(isSafeSessionId("with_underscore")).toBe(true);
    expect(isSafeSessionId("a-b_c-1")).toBe(true);
  });

  it("accepts a 200-char id (the length cap, inclusive)", () => {
    expect(isSafeSessionId("a".repeat(200))).toBe(true);
  });

  it("rejects the bare traversal token '..'", () => {
    expect(isSafeSessionId("..")).toBe(false);
  });

  it("rejects a traversal path '../../etc'", () => {
    expect(isSafeSessionId("../../etc")).toBe(false);
  });

  it("rejects a forward slash 'a/b'", () => {
    expect(isSafeSessionId("a/b")).toBe(false);
  });

  it("rejects a backslash 'a\\b'", () => {
    expect(isSafeSessionId("a\\b")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSafeSessionId("")).toBe(false);
  });

  it("rejects a string containing a dot 'a.b'", () => {
    expect(isSafeSessionId("a.b")).toBe(false);
  });

  it("rejects a leading-dot dotfile '.hidden'", () => {
    expect(isSafeSessionId(".hidden")).toBe(false);
  });

  it("rejects an embedded NUL byte 'a\\x00b'", () => {
    expect(isSafeSessionId("a\x00b")).toBe(false);
  });

  it("rejects internal whitespace 'a b'", () => {
    expect(isSafeSessionId("a b")).toBe(false);
  });

  it("rejects an over-length string (201 chars)", () => {
    expect(isSafeSessionId("a".repeat(201))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveUnder — return the absolute path only if it stays strictly inside
// `root/subdir`, else null. Pure string resolution against `root` (no IO), so a
// fixed fake root that need not exist is enough.
//
// `untrustedPath` is resolved against `root` (not `base`), mirroring how the
// dev reference route passes the stored relative path that already carries the
// `uploads/` prefix (e.g. "uploads/<id>/photo.jpg").
// ---------------------------------------------------------------------------

describe("resolveUnder", () => {
  const root = "/tmp/qa-root";

  it("allows a child file under root/subdir and returns its absolute path", () => {
    const result = resolveUnder(root, "uploads", "uploads/abc/photo.jpg");
    expect(result).not.toBeNull();
    expect(path.isAbsolute(result!)).toBe(true);
    expect(result).toBe(path.join(root, "uploads", "abc", "photo.jpg"));
    expect(result!.endsWith(path.join("uploads", "abc", "photo.jpg"))).toBe(true);
    // It is genuinely contained under root/uploads (not just a prefix match).
    const base = path.join(root, "uploads");
    const rel = path.relative(base, result!);
    expect(rel.startsWith("..")).toBe(false);
    expect(path.isAbsolute(rel)).toBe(false);
  });

  it("rejects an escaping path that climbs out with '..'", () => {
    expect(resolveUnder(root, "uploads", "uploads/../../tmp/evil")).toBeNull();
  });

  it("rejects a sibling dir sharing the prefix ('uploads_secrets/')", () => {
    // The prefix-match bug the fix closed: a string prefix check would have let
    // this through; the directory-boundary check rejects it.
    expect(resolveUnder(root, "uploads", "uploads_secrets/x.png")).toBeNull();
  });

  it("rejects a sibling dir sharing the prefix ('uploadsX/')", () => {
    expect(resolveUnder(root, "uploads", "uploadsX/y.png")).toBeNull();
  });

  it("rejects an absolute path pointing elsewhere", () => {
    expect(resolveUnder(root, "uploads", "/etc/passwd")).toBeNull();
  });

  it("rejects the bare directory itself (no child file)", () => {
    expect(resolveUnder(root, "uploads", "uploads")).toBeNull();
  });
});
