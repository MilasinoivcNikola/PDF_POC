import { describe, it, expect } from "vitest";

import { isValidEmail } from "./email";

// The email validator is the pure boundary guard for the order route: a malformed
// delivery address must be rejected before an order is created. These cases pin
// the pragmatic shape (single `@`, non-empty local part, dotted TLD, no
// whitespace, sane length) without claiming full RFC 5322.

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmail("sarah@example.com")).toBe(true);
    expect(isValidEmail("a.b+tag@sub.domain.co.uk")).toBe(true);
    expect(isValidEmail("first_last@example.io")).toBe(true);
    expect(isValidEmail("buyer123@quietly-kept.com")).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidEmail("  sarah@example.com  ")).toBe(true);
    expect(isValidEmail("\tsarah@example.com\n")).toBe(true);
  });

  it("rejects addresses missing the @", () => {
    expect(isValidEmail("sarahexample.com")).toBe(false);
  });

  it("rejects addresses missing a dotted TLD", () => {
    expect(isValidEmail("sarah@example")).toBe(false);
    expect(isValidEmail("sarah@example.")).toBe(false);
    expect(isValidEmail("sarah@example.c")).toBe(false);
  });

  it("rejects an empty local part", () => {
    expect(isValidEmail("@example.com")).toBe(false);
  });

  it("rejects internal whitespace and multiple @", () => {
    expect(isValidEmail("sa rah@example.com")).toBe(false);
    expect(isValidEmail("sarah@exam ple.com")).toBe(false);
    expect(isValidEmail("a@b@example.com")).toBe(false);
  });

  it("rejects empty / whitespace-only input", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("   ")).toBe(false);
  });

  it("rejects an over-length address", () => {
    const local = "a".repeat(250);
    expect(isValidEmail(`${local}@example.com`)).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
    expect(isValidEmail({})).toBe(false);
  });
});
