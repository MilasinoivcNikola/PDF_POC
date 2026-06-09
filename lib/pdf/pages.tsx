// The per-page book layout — the SINGLE source of the Story-1 page markup that
// BOTH render targets share:
//   - the PDF document (lib/pdf/template.tsx → renderStoryHtml, feature 05), and
//   - the in-browser preview (components/preview/*, feature 10).
//
// This module is deliberately IO-free: no `node:fs`/`node:path`, no
// `react-dom/server` — only React and the resolved-page types. That keeps it
// safe to import from a client-reachable component (the preview page is a client
// component for `useWizard`), while the fs-bound, document-wrapping concerns
// (inlining the print CSS + base64 fonts) stay in template.tsx where they belong.
//
// Copy is already final (feature 03's `ResolvedStory` — every `{placeholder}`
// merged), so there is NO text logic here. Each `.story-page` section mirrors the
// matching treatment in prototypes/preview.html; the difference between screen
// and print is entirely in the CSS (lib/pdf/styles.css for print, the ported
// preview screen styles in app/globals.css), never in this markup.

import type { ReactElement } from "react";

import type { PageId } from "@/lib/story/master-text";
import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";
import { renderLetterBody, renderLetterCover } from "@/lib/pdf/pages-story2";

// ---------------------------------------------------------------------------
// Image input contract
// ---------------------------------------------------------------------------

/**
 * Image source per book page, keyed by the stable `PageId`. A value is any
 * usable <img src> — a data URL (preferred for self-contained PDFs) or a path
 * Puppeteer can resolve. Pages omitted from the map render a graceful
 * placeholder (the prototype's inline SVG art over a warm wash), so the document
 * is always complete even before feature 07 generates real illustrations.
 */
export type PageImageMap = Partial<Record<PageId, string>>;

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

/** A petal/heart ornament used across the cover, dedication and back cover. */
function Ornament({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <path
        d="M18 5 C 16 11, 14 15, 9 17 C 14 19, 16 23, 18 29 C 20 23, 22 19, 27 17 C 22 15, 20 11, 18 5 Z"
        fill="currentColor"
        opacity="0.8"
      />
    </svg>
  );
}

/** The placeholder pet art shown in an image slot when no src was supplied. */
function PlaceholderPet() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="50" cy="60" rx="32" ry="26" fill="#5C544A" opacity="0.6" />
      <ellipse cx="32" cy="40" rx="9" ry="13" fill="#5C544A" opacity="0.6" />
      <ellipse cx="68" cy="40" rx="9" ry="13" fill="#5C544A" opacity="0.6" />
      <circle cx="42" cy="58" r="2.5" fill="#221C16" />
      <circle cx="58" cy="58" r="2.5" fill="#221C16" />
      <ellipse cx="50" cy="68" rx="3.5" ry="2.5" fill="#221C16" />
    </svg>
  );
}

/**
 * An illustration slot: the real image when `src` is present, otherwise the
 * placeholder art over the wash. `alt` comes from the page's illustration brief
 * so screen readers / the eventual preview have context.
 */
function ArtSlot({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className: string;
}) {
  return (
    <div className={className}>
      {src ? <img src={src} alt={alt} /> : <PlaceholderPet />}
    </div>
  );
}

/**
 * A small petal divider used to separate a page's art from its body so the
 * narrative pages don't read as a flat slab of type. Reuses the same petal
 * shape as `Ornament`, sized down. Purely decorative (aria-hidden); it carries
 * no copy, so it never touches the merged text or the "died" rule.
 */
function Divider() {
  return (
    <div className="story-divider" aria-hidden="true">
      <span className="story-divider__rule" />
      <Ornament size={16} />
      <span className="story-divider__rule" />
    </div>
  );
}

/**
 * Render resolved body paragraphs. Copy is already final — no text logic.
 *
 * When `dropCap` is set, the first character of the first paragraph is wrapped
 * in its own `<span class="story-page__dropcap">` so the stylesheet can render a
 * Fraunces initial against the Lora body. This is presentation-only: the letter
 * is the same character from the same merged copy, just split for styling, so
 * the rendered text (and the "died" rule) is unchanged.
 */
function Body({
  paragraphs,
  dropCap = false,
}: {
  paragraphs: string[];
  dropCap?: boolean;
}) {
  return (
    <div className="story-page__body">
      {paragraphs.map((text, i) => {
        if (dropCap && i === 0 && text.length > 0) {
          const initial = text.slice(0, 1);
          const rest = text.slice(1);
          return (
            <p key={i}>
              <span className="story-page__dropcap">{initial}</span>
              {rest}
            </p>
          );
        }
        return <p key={i}>{text}</p>;
      })}
    </div>
  );
}

/** Footer page number (numbered pages only). */
function PageNumber({ value }: { value: number | null }) {
  if (value === null) return null;
  return <div className="story-page__number">{String(value).padStart(2, "0")}</div>;
}

// ---------------------------------------------------------------------------
// Per-page treatments (mirror prototypes/preview.html)
// ---------------------------------------------------------------------------

function CoverPage({ page, src }: { page: ResolvedPage; src?: string }) {
  return (
    <section className="story-page story-page--cover" data-page={page.id}>
      <div>
        <div className="cover__ornament">
          <Ornament />
        </div>
        <h1 className="cover__title">{page.title}</h1>
      </div>
      <div className="cover__art">
        {src ? <img src={src} alt={page.illustrationBrief} /> : <PlaceholderPet />}
      </div>
      {page.subtitle ? <p className="cover__subtitle">{page.subtitle}</p> : null}
    </section>
  );
}

function DedicationPage({ page }: { page: ResolvedPage }) {
  // Page 1's title is the verse opening ("For X, and for Y,") and body[0] the
  // closing line ("who loved them so very much."). `dedication` is the parent's
  // optional message, shown in its own distinct typeface block.
  return (
    <section className="story-page story-page--dedication" data-page={page.id}>
      <div className="dedication__ornament">
        <Ornament size={28} />
      </div>
      <p className="dedication__verse">
        {page.title}
        {page.body.map((text, i) => (
          <span key={i}>
            <br />
            {text}
          </span>
        ))}
      </p>
      {page.dedication ? (
        <p className="dedication__parent">{page.dedication}</p>
      ) : null}
      <PageNumber value={page.pageNumber} />
    </section>
  );
}

function NarrativePage({
  page,
  src,
  artClassName,
}: {
  page: ResolvedPage;
  src?: string;
  artClassName: string;
}) {
  return (
    <section className="story-page story-page--narrative" data-page={page.id}>
      <ArtSlot src={src} alt={page.illustrationBrief} className={artClassName} />
      <Divider />
      <Body paragraphs={page.body} dropCap />
      <PageNumber value={page.pageNumber} />
    </section>
  );
}

function TruthPage({ page, src }: { page: ResolvedPage; src?: string }) {
  return (
    <section className="story-page story-page--truth" data-page={page.id}>
      <ArtSlot
        src={src}
        alt={page.illustrationBrief}
        className="story-art story-art--landscape"
      />
      <div className="truth__text">
        {page.body.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
      <PageNumber value={page.pageNumber} />
    </section>
  );
}

function LovePage({ page }: { page: ResolvedPage }) {
  // Page 10: lead line, then the hero statement, then the "It stays" closer.
  const [lead, ...rest] = page.body;
  const closer = rest.length > 1 ? rest[rest.length - 1] : undefined;
  const hero = closer ? rest.slice(0, -1) : rest;
  return (
    <section className="story-page story-page--love" data-page={page.id}>
      {lead ? <p className="love__lead">{lead}</p> : null}
      <p className="love__hero">
        {hero.map((text, i) => (
          <span key={i}>
            {i > 0 ? <br /> : null}
            {text}
          </span>
        ))}
      </p>
      {closer ? <p className="love__closer">{closer}</p> : null}
      <PageNumber value={page.pageNumber} />
    </section>
  );
}

function ClosingPage({ page, src }: { page: ResolvedPage; src?: string }) {
  return (
    <section className="story-page story-page--closing" data-page={page.id}>
      <div />
      <div className="closing__art">
        {src ? <img src={src} alt={page.illustrationBrief} /> : <PlaceholderPet />}
      </div>
      <div>
        <p className="closing__text">
          {page.body.map((text, i) => (
            <span key={i}>
              {i > 0 ? <br /> : null}
              {text}
            </span>
          ))}
        </p>
        <p className="closing__end">— end —</p>
      </div>
      <PageNumber value={page.pageNumber} />
    </section>
  );
}

function BackCoverPage({ page }: { page: ResolvedPage }) {
  return (
    <section className="story-page story-page--back-cover" data-page={page.id}>
      {page.title ? <h2 className="back-cover__title">{page.title}</h2> : null}
      <ul className="back-cover__lines">
        {page.body.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
      <div className="back-cover__ornament">
        <Ornament size={28} />
      </div>
    </section>
  );
}

/**
 * Dispatch a resolved page to its treatment by its `layout` tag — NOT by a
 * literal page id. Dispatching on `layout` is the seam that lets this one
 * renderer serve more than one product: a non-storybook product (the Story-2
 * letter) declares its own layout and gets its own case, instead of silently
 * falling through to the children's-book narrative treatment. For Story 1 the
 * layout→component mapping is identical to the previous per-id dispatch (the
 * narrative layout covers pages 2-6, 8, 9, 11), so the rendered markup is
 * byte-identical.
 *
 * This is the single per-page renderer both the PDF document and the in-browser
 * preview call, so the two targets can never drift in structure or copy.
 *
 * The Story-2 letter layouts (`letter-cover`/`letter`, feature 16) dispatch to the
 * sibling lib/pdf/pages-story2.tsx components — the switch stays exhaustive over
 * `PageLayout` with no `default`, so a future product's new layout that forgets a
 * case is a compile-time error, not a silent fall-through to the wrong treatment.
 */
export function renderPage(page: ResolvedPage, src?: string): ReactElement {
  switch (page.layout) {
    case "cover":
      return <CoverPage key={page.id} page={page} src={src} />;
    case "dedication":
      return <DedicationPage key={page.id} page={page} />;
    case "truth":
      return <TruthPage key={page.id} page={page} src={src} />;
    case "love":
      return <LovePage key={page.id} page={page} />;
    case "closing":
      return <ClosingPage key={page.id} page={page} src={src} />;
    case "back-cover":
      return <BackCoverPage key={page.id} page={page} />;
    case "narrative":
      return (
        <NarrativePage
          key={page.id}
          page={page}
          src={src}
          artClassName="story-art story-art--landscape"
        />
      );
    case "letter-cover":
      return renderLetterCover(page, src);
    case "letter":
      return renderLetterBody(page, src);
  }
}

/**
 * Render every page of a resolved story, in order, as a fragment of
 * `.story-page` sections. The PDF document (template.tsx) wraps this in its
 * `<html><body>`; the preview lays the same sections out as facing-page spreads.
 * Pet/child copy comes entirely from `story`; image sources from `images`
 * (a missing slot falls back to the placeholder art).
 */
export function StoryPages({
  story,
  images,
}: {
  story: ResolvedStory;
  images: PageImageMap;
}) {
  return <>{story.map((page) => renderPage(page, images[page.id]))}</>;
}
