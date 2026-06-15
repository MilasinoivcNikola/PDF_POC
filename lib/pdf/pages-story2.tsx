// The Story-2 letter page layouts — the SINGLE source of the `.letter-page`
// markup that BOTH render targets share, exactly as lib/pdf/pages.tsx is for the
// Story-1 book:
//   - the PDF document (lib/pdf/template.tsx → renderStoryHtml), and
//   - the in-browser preview (feature 19, not built yet — same components).
//
// Like pages.tsx, this module is deliberately IO-free: no `node:fs`/`node:path`,
// no `react-dom/server` — only React and the resolved-page types. That keeps it
// safe to import from a client-reachable component when feature 19 builds the
// Story-2 preview; the fs-bound document-wrapping concerns stay in template.tsx.
//
// Copy is already final (feature 15's `resolveStory2` — every `{placeholder}`
// merged, every variant composed), so there is NO text logic here. The letter is
// a reverent typeset keepsake: "white space is the design." The split between
// screen and print is entirely in the CSS (lib/pdf/styles.css for print, the
// mirrored rules in app/globals.css for the preview), never in this markup.

import type { ResolvedPage } from "@/lib/story/merge";
import { LETTER_SIGNOFF } from "@/lib/story/story2/master-text";
import { TALK_SIGNOFF } from "@/lib/story/story4/master-text";
import { NOTE_SIGNOFF } from "@/lib/story/story5/master-text";

// The sign-off sentinels that mark the start of a letter's signature block, across
// every product that renders with the `letter` layout. The body is split at the
// first paragraph equal to one of these; everything from it onward is the signature
// block. Each is invariant across that product's variants (it carries no merge
// field). Story 2 signs "Yours, always,"; Story 4 signs "Yours,"; Story 5 signs
// "With all my love, always,". Each is distinct and never a standalone body
// paragraph in another product, so Story 2's and Story 4's bodies are unaffected —
// their sentinels are still found at the same index, so their output stays
// byte-identical.
const LETTER_SIGNOFFS: readonly string[] = [
  LETTER_SIGNOFF,
  TALK_SIGNOFF,
  NOTE_SIGNOFF,
];

/** The index of the signature sign-off in a body, or -1 if the page has none. */
function signoffIndexOf(body: string[]): number {
  return body.findIndex((line) => LETTER_SIGNOFFS.includes(line));
}

// The body pages that carry the optional belief-frame wash (master template Page
// 5, "Where I Am Now"), across every product that renders with the `letter`
// layout: Story 2's `letter-page-5` and Story 5's `note-page-5` (the letter TO the
// pet shares Story 2's imagery shape — reference cover + figure-free Page-5 wash).
// Only these pages render the wash slot; the other body pages stay text-only — no
// image, no empty box, no layout shift — keeping the letter's "white space is the
// design" feel. Story 4 has no wash slot, so adding `note-page-5` here cannot
// change Story 2's or Story 4's output (their page ids are not in the set / never
// carry a wash `src`), keeping their PDFs byte-identical.
const LETTER_WASH_PAGE_IDS: readonly string[] = ["letter-page-5", "note-page-5"];

// The body pages that carry a prominent FEATURE illustration — a full pet-in-scene
// watercolor, NOT the softened/clamped Page-5 wash. Story 4 ("If [PET_NAME] Could
// Talk") reuses the `letter` layout but its Page-4 "daily joy" slot (`talk-page-4`)
// is a full pet portrait like the cover, so it deserves the feature treatment, not
// the feathered wash mask. Keyed ONLY on `talk-page-4`, so it cannot touch Story 2's
// `letter-page-5` or Story 5's `note-page-5` (both still take the wash path), keeping
// their PDFs byte-identical. A body page is exactly one of: feature, wash, or
// text-only.
const LETTER_FEATURE_PAGE_IDS: readonly string[] = ["talk-page-4"];

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

/**
 * The cover's understated mark — a single watercolor-style paw print silhouette.
 * Stands in for the Premium cover illustration (feature 17) the same way Story 1
 * uses an inline placeholder SVG until real art arrives. Purely decorative.
 */
function PawPrint() {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="24" cy="32" rx="10" ry="8" fill="currentColor" opacity="0.7" />
      <ellipse cx="13" cy="20" rx="3.4" ry="4.6" fill="currentColor" opacity="0.7" />
      <ellipse cx="20" cy="14" rx="3.4" ry="4.6" fill="currentColor" opacity="0.7" />
      <ellipse cx="28" cy="14" rx="3.4" ry="4.6" fill="currentColor" opacity="0.7" />
      <ellipse cx="35" cy="20" rx="3.4" ry="4.6" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Per-page treatments
// ---------------------------------------------------------------------------

/**
 * PAGE 1 — the letter cover. "A Letter from [PET_NAME]" in a classical Fraunces
 * serif, the italic "for [OWNER_NAMES]" subtitle below, and the optional
 * adopted–passed date line at the bottom (present in `body` only when the
 * customer supplied both dates — merge appended it). A single understated paw
 * print is the only ornament. The cover should read like a book of poems.
 *
 * `src` is wired for feature 17's Premium cover portrait; until then the inline
 * paw print fills the mark slot, so the page is always complete.
 */
function LetterCoverPage({ page, src }: { page: ResolvedPage; src?: string }) {
  // body holds the optional "[date] — [date]" line (when both dates exist).
  const dateLine = page.body[0];
  return (
    <section className="letter-page letter-page--cover" data-page={page.id}>
      <div className="letter-cover__mark">
        {src ? <img src={src} alt={page.illustrationBrief} /> : <PawPrint />}
      </div>
      <div className="letter-cover__titles">
        {page.title ? <h1 className="letter-cover__title">{page.title}</h1> : null}
        {page.subtitle ? (
          <p className="letter-cover__subtitle">{page.subtitle}</p>
        ) : null}
      </div>
      {dateLine ? <p className="letter-cover__dates">{dateLine}</p> : null}
    </section>
  );
}

/**
 * A letter body page. The body paragraphs are already final prose (salutation,
 * the "I noticed" / "I know" passages, the closing). They render as plain
 * typeset paragraphs with generous leading — no art slot, no divider, no drop
 * cap (those are children's-book furniture; the letter's design is white space).
 *
 * The final letter page (Page 6) ends in a signature block. We find it WITHOUT
 * coupling to a page id or to literal resolved copy: split the body at the first
 * sign-off sentinel (one of `LETTER_SIGNOFFS`, single-sourced from each product's
 * master text; each carries no merge field, so it is invariant across that
 * product's variants). Everything before it is prose; the sign-off line, the
 * pet-name signature, and the optional nickname + date lines after it form the
 * signature block with its own hierarchy (sign-off italic, name in the serif,
 * nickname/date smaller). Pages without a sign-off (2–5) render every paragraph as
 * prose and have no signature block.
 */
function LetterBodyPage({ page, src }: { page: ResolvedPage; src?: string }) {
  const signoffIndex = signoffIndexOf(page.body);
  const hasSignature = signoffIndex !== -1;
  const prose = hasSignature ? page.body.slice(0, signoffIndex) : page.body;
  // Signature run: [sign-off, petName, (nickname?), (date?)].
  const signature = hasSignature ? page.body.slice(signoffIndex) : [];
  // The belief-frame wash (feature 17) renders ONLY on a wash page
  // (letter-page-5 / note-page-5) and only when present; every other body page
  // ignores `src`, staying text-only.
  const showWash = LETTER_WASH_PAGE_IDS.includes(page.id) && Boolean(src);
  // The Page-4 feature illustration (Story 4's `talk-page-4`) — a full pet-in-
  // scene portrait, rendered ONLY on a feature page and only when present. A body
  // page is exactly one of feature / wash / text-only; the id allow-lists are
  // disjoint, so these never both fire.
  const showFeature = LETTER_FEATURE_PAGE_IDS.includes(page.id) && Boolean(src);

  return (
    <section className="letter-page letter-page--body" data-page={page.id}>
      <div className="letter-page__prose">
        {prose.map((text, i) => (
          <p key={i} className="letter-page__para">
            {text}
          </p>
        ))}
      </div>
      {showWash ? <LetterWash src={src!} alt={page.illustrationBrief} /> : null}
      {showFeature ? (
        <LetterFeature src={src!} alt={page.illustrationBrief} />
      ) : null}
      {hasSignature ? <LetterSignature lines={signature} /> : null}
    </section>
  );
}

/**
 * The Page-5 belief-frame wash — a soft, full-width band the letter prose sits
 * above. Kept reverent and abstract on purpose (the master template's "white
 * space is the design"): a single gentle landscape/object image, not a full-
 * bleed photo that fights the typography. The CSS clamps its height and softens
 * its edges so it reads as a watercolor wash, not a feature illustration.
 * Rendered only when a `src` is present (see LetterBodyPage), so it never leaves
 * an empty slot.
 */
function LetterWash({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="letter-page__wash">
      <img src={src} alt={alt} />
    </div>
  );
}

/**
 * The Page-4 feature illustration — a prominent, full-content-width pet-in-scene
 * watercolor (Story 4's "daily joy" portrait, photo-anchored like the cover).
 * Unlike `LetterWash`, this is a real feature image: larger, no feathered mask,
 * rounded corners matching the cover art (`.letter-cover__mark img`). Its height is
 * clamped conservatively in CSS so it reads as a feature yet still fits below the
 * page's prose without forcing a 7th page (the section keeps `break-inside: avoid`).
 * Rendered only when a `src` is present (see LetterBodyPage), so it never leaves an
 * empty slot on a book without art.
 */
function LetterFeature({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="letter-page__feature">
      <img src={src} alt={alt} />
    </div>
  );
}

/**
 * The closing signature block. `lines[0]` is the sign-off ("Yours, always,",
 * italic), `lines[1]` is the pet-name signature (in the serif). Any further
 * lines are the optional nickname line then the optional date line (both small
 * italic) — merge appended them only when the customer supplied them, so this
 * renders exactly what is present, never an empty line.
 */
function LetterSignature({ lines }: { lines: string[] }) {
  const [signoff, name, ...extras] = lines;
  return (
    <div className="letter-signature">
      {signoff ? <p className="letter-signature__signoff">{signoff}</p> : null}
      {name ? <p className="letter-signature__name">{name}</p> : null}
      {extras.map((text, i) => (
        <p key={i} className="letter-signature__extra">
          {text}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatch (called from the shared renderPage switch in lib/pdf/pages.tsx)
// ---------------------------------------------------------------------------

/** Render the Story-2 letter cover. */
export function renderLetterCover(page: ResolvedPage, src?: string) {
  return <LetterCoverPage key={page.id} page={page} src={src} />;
}

/**
 * Render a Story-2 letter body page (signature block handled within). `src` is
 * the optional Premium illustration: the belief-frame wash on a wash page
 * (`letter-page-5` / `note-page-5`), or a full pet-in-scene feature on a feature
 * page (Story 4's `talk-page-4`). Every other body page ignores it (text-only).
 */
export function renderLetterBody(page: ResolvedPage, src?: string) {
  return <LetterBodyPage key={page.id} page={page} src={src} />;
}
