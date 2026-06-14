// Single source of truth for the user-facing brand wordmark. Importing this
// everywhere the wordmark renders (header/footer chrome, per-page <title>
// suffixes, the delivery email) keeps the brand from drifting across the ~16
// pages it appears on — change it here, not in 16 files. Plain string constant,
// safe in both Server and Client Components.
export const BRAND = "Dearbound";
