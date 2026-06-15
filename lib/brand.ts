// Single source of truth for the user-facing brand wordmark. Importing this
// everywhere the wordmark renders (header/footer chrome, per-page <title>
// suffixes, the delivery email) keeps the brand from drifting across the ~16
// pages it appears on — change it here, not in 16 files. Plain string constant,
// safe in both Server and Client Components.
export const BRAND = "Dearbound";

// The brand tagline — the wording dates to the Dearbound rename (Milestone 14);
// lifted into this shared constant in the public-pages refresh (Milestone 15) so
// the site footer (and any future hero/marketing reuse) single-sources it rather
// than re-typing the phrase. Plain string — safe in Server and Client Components
// alike.
export const TAGLINE = "Custom illustrated books starring your pet.";
