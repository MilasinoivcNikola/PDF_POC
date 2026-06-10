import { describe, it, expect, afterEach } from "vitest";

import {
  deployTarget,
  isOperator,
  isPublic,
  assertOperator,
} from "@/lib/runtime/surface";

// The deploy-surface env gate (PR-03). The default is "operator" (fail-safe for
// local dev) — only an explicit DEPLOY_TARGET=public locks the surface down. These
// assertions pin both the default and the public lockdown, including the
// security-critical property: an operator route returns 404 under public mode.

const original = process.env.DEPLOY_TARGET;

afterEach(() => {
  if (original === undefined) {
    delete process.env.DEPLOY_TARGET;
  } else {
    process.env.DEPLOY_TARGET = original;
  }
});

describe("deployTarget", () => {
  it("defaults to operator when DEPLOY_TARGET is unset", () => {
    delete process.env.DEPLOY_TARGET;
    expect(deployTarget()).toBe("operator");
    expect(isOperator()).toBe(true);
    expect(isPublic()).toBe(false);
  });

  it("is public only for the exact string \"public\"", () => {
    process.env.DEPLOY_TARGET = "public";
    expect(deployTarget()).toBe("public");
    expect(isPublic()).toBe(true);
    expect(isOperator()).toBe(false);
  });

  it("treats any other value as operator (fail-safe)", () => {
    process.env.DEPLOY_TARGET = "preview";
    expect(deployTarget()).toBe("operator");
    process.env.DEPLOY_TARGET = "";
    expect(deployTarget()).toBe("operator");
    process.env.DEPLOY_TARGET = "operator";
    expect(deployTarget()).toBe("operator");
  });

  it("matches only the exact lowercase, untrimmed string \"public\"", () => {
    // The match is case-sensitive and untrimmed by design: a future "normalize the
    // env value" refactor must NOT silently start locking down "PUBLIC" / " public ".
    // Anything but the exact token "public" stays operator (the less-surprising
    // default for a developer who set the var loosely).
    for (const value of ["PUBLIC", "Public", " public", "public ", "public\n", "publi"]) {
      process.env.DEPLOY_TARGET = value;
      expect(deployTarget(), `${JSON.stringify(value)} should resolve to operator`).toBe(
        "operator",
      );
      expect(isPublic()).toBe(false);
    }
  });
});

describe("assertOperator", () => {
  it("returns null (allows the request) on the operator surface", () => {
    delete process.env.DEPLOY_TARGET;
    expect(assertOperator()).toBeNull();
  });

  it("returns a 404 Response on the public surface", () => {
    process.env.DEPLOY_TARGET = "public";
    const response = assertOperator();
    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBe(404);
  });
});
