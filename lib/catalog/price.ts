// Price display helper for the storefront. Catalog prices are stored as US cents
// (`Product.priceUsd`, e.g. 2900); the customer-facing pages want a clean dollar
// string. Pure, client-safe, and unit-testable — no IO, no Intl locale surprises
// for whole-dollar prices (we render "$29", not "$29.00"). A price with cents
// (e.g. 2950) renders "$29.50".

/**
 * Format a US-cents amount as a display dollar string. Whole-dollar amounts drop
 * the ".00" ("$29"); amounts with cents show two decimals ("$29.50"). Negative
 * or fractional-cent inputs are guarded — the catalog only ever passes whole
 * positive cents, but the helper stays honest if reused.
 */
export function formatPriceUsd(cents: number): string {
  const safe = Math.max(0, Math.round(cents));
  const dollars = safe / 100;
  const hasCents = safe % 100 !== 0;
  return `$${hasCents ? dollars.toFixed(2) : String(dollars)}`;
}
