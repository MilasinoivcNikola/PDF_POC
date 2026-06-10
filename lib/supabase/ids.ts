// Id-safety guard for order ids before they become Supabase Storage key segments.
//
// PURE (no IO) — mirrors the `isSafeSessionId` shape from lib/ai/paths.ts so the
// containment defense lives in one tested place. An order id is interpolated into
// storage object keys (`order-photos/<id>/photo`, `order-pdfs/<id>.pdf`), so a
// value containing `/` or `..` could point a put/get at an unintended object.
// Validating the id up front (it is a crypto UUID via `createSessionId()`) keeps
// every key build safe.

/**
 * Whether `id` is a safe single segment to embed in a storage object key — the
 * allowlist `^[A-Za-z0-9_-]{1,200}$`, the exact shape `createSessionId()` (a
 * crypto UUID) produces. A legitimate order id always passes while slashes, `..`,
 * dots, NUL, whitespace, etc. are rejected before they reach a storage key.
 *
 * Intentionally identical in shape to `isSafeSessionId` (lib/ai/paths.ts); kept as
 * a separate, order-named export so the commerce data layer doesn't reach across
 * into the AI craft area's path module for an unrelated concern.
 */
export function isSafeOrderId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,200}$/.test(id);
}
