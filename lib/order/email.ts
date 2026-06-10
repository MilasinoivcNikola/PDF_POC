// Pure, IO-free email validation for the order-intake boundary. The customer's
// email is where the finished book is delivered (PR-09), so a malformed address
// is rejected at the public /api/order boundary before an order is created. Kept
// in lib/order/ (the commerce contract layer) and pure so it unit-tests without
// mocks — same discipline as lib/session/draft.ts.
//
// Deliberately a pragmatic check, not full RFC 5322: a single `@`, a non-empty
// local part, a domain with at least one dot and a 2+-char TLD, no whitespace.
// This catches the common typos (missing `@`, missing TLD, trailing space) that
// would silently break delivery, without rejecting legitimate addresses.

/** Max length we accept — comfortably above any real address, below abuse. */
const MAX_EMAIL_LENGTH = 254;

/**
 * A pragmatic email shape: `local@domain.tld`, no whitespace, exactly one `@`,
 * a non-empty local part, and a domain with a dotted TLD of at least two chars.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Whether `value` is a plausible delivery email. Trims surrounding whitespace
 * first (a trailing space is a common paste error), then checks the shape and a
 * sane length. Returns false for non-strings, empty/whitespace-only input, and
 * anything missing the `@`/TLD structure.
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  return EMAIL_PATTERN.test(trimmed);
}
