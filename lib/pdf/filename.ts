// The PDF download-filename builders, kept in their own pure module so the story
// registry (lib/story/registry → story-1/story-2) can import them WITHOUT pulling
// in lib/pdf/render.ts's eager `puppeteer` import. The registry is reached from
// client components (the preview, feature 19), so its module graph must stay free
// of `node:`/server-only deps. These helpers are pure string functions with no IO,
// so they belong on the client-safe side of that boundary; render.ts re-exports
// them for its existing callers (scripts/render-test.ts, etc.) so nothing breaks.

/**
 * Lowercase, hyphenate and strip a pet name to filesystem-safe characters so it
 * can sit in the output filename without surprises (spaces, slashes, accents,
 * emoji). Diacritics are folded to ASCII; any remaining non-alphanumeric run
 * collapses to a single hyphen; leading/trailing hyphens are trimmed.
 */
function slugify(petName: string): string {
  return petName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The output filename for a rendered book, per the master template's production
 * checklist: `Saying-Goodbye-to-[PET_NAME].pdf`. The pet name is slugified so the
 * result is always a safe single path segment; an empty/symbol-only name falls
 * back to `Pet` so a filename is always produced.
 */
export function storyPdfFilename(petName: string): string {
  const slug = slugify(petName) || "Pet";
  return `Saying-Goodbye-to-${slug}.pdf`;
}

/**
 * The output filename for a rendered Story-2 letter, per that template's
 * production checklist: `Letter-from-[PET_NAME].pdf`. Same path-safe slugify as
 * `storyPdfFilename`, with the same `Pet` fallback for an empty/symbol-only name.
 */
export function letterPdfFilename(petName: string): string {
  const slug = slugify(petName) || "Pet";
  return `Letter-from-${slug}.pdf`;
}

/**
 * The output filename for a rendered Story-4 letter ("If [PET_NAME] Could Talk"),
 * per that template's production checklist: `If-[PET_NAME]-Could-Talk.pdf`. Same
 * path-safe slugify as `storyPdfFilename`, with the same `Pet` fallback for an
 * empty/symbol-only name.
 */
export function talkPdfFilename(petName: string): string {
  const slug = slugify(petName) || "Pet";
  return `If-${slug}-Could-Talk.pdf`;
}

/**
 * The output filename for a rendered Story-5 letter ("A Letter to [PET_NAME]" —
 * the owner writing TO the pet), per that template's production checklist:
 * `Letter-to-[PET_NAME].pdf`. Distinct from Story 2's `Letter-from-…`. Same
 * path-safe slugify as `storyPdfFilename`, with the same `Pet` fallback for an
 * empty/symbol-only name.
 */
export function letterToPdfFilename(petName: string): string {
  const slug = slugify(petName) || "Pet";
  return `Letter-to-${slug}.pdf`;
}
