import { describe, it, expect } from "vitest";

// Trivial smoke test proving Vitest runs. Coverage is expanded in later features.
describe("vitest smoke test", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
