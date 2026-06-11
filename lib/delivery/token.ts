// Delivery-token minting + validation (commerce PR-09).
//
// A delivery token is the unguessable, single-order-scoped secret that gates the
// public download page (`/download/[token]`). It is the ONLY thing a customer needs
// to fetch their finished book — so it must be cryptographically random (no
// enumeration, no IDOR) and URL-PATH-safe (it lives in a path segment, so no `/`,
// `+`, or `=`).
//
// PURE — `mintDeliveryToken` is the one function with randomness (it reads
// `node:crypto`); `isWellFormedToken` is deterministic so the download route can
// cheap-reject garbage (length + charset) before a DB hit. Unit tests assert the
// SHAPE + UNIQUENESS of a minted token (never an exact value) and the exact
// accept/reject behaviour of the validator. `node:crypto` is a Node builtin — no
// new dependency.

import { randomBytes } from "node:crypto";

/**
 * Number of random bytes in a delivery token. 32 bytes = 256 bits of entropy,
 * which base64url-encodes to 43 characters — far beyond any feasible guess.
 */
const TOKEN_BYTES = 32;

/** The exact length a 32-byte value occupies in unpadded base64url (ceil(32*4/3)). */
const TOKEN_LENGTH = 43;

/**
 * The base64url charset: A–Z, a–z, 0–9, `-`, `_`. No `+`, `/`, or `=` padding, so
 * the token is safe as a single URL path segment with no escaping.
 */
const TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${TOKEN_LENGTH}}$`);

/**
 * Mint a fresh, unguessable delivery token (URL-path-safe base64url). The only
 * non-deterministic function here — each call returns a new value. Persist it on
 * the order (`Order.deliveryToken`) so the download route can resolve the order
 * from the token alone.
 */
export function mintDeliveryToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Whether `token` has the well-formed shape `mintDeliveryToken` produces (exact
 * length + base64url charset). PURE — used by the download route to reject obvious
 * garbage before any database lookup. A well-formed-but-unknown token still returns
 * `true` here (the DB lookup decides existence); a malformed one is rejected up
 * front, and the route's invalid/expired response never reveals which case it was.
 */
export function isWellFormedToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}
