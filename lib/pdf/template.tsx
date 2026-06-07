// The print/screen template for Story 1 — the single React source of layout the
// PDF (feature 05) and the in-browser preview (feature 10) both render. It takes
// a fully-resolved story (feature 03's `ResolvedStory`, all `{placeholders}`
// already merged — this module does NO text logic) plus a per-page image map,
// and returns a complete, self-contained HTML document string.
//
// "Self-contained" matters: feature 05 hands this string to Puppeteer's
// `page.setContent`, which has no base URL and makes no relative-asset requests.
// So the print CSS (lib/pdf/styles.css) is inlined into <head>, and the three
// font families are embedded as base64 data URLs read from /public/fonts at
// render time. There are no Google Fonts / CDN links anywhere in the output.
//
// `renderStoryHtml` is pure apart from reading those static repo files (CSS +
// woff2). It is deterministic and unit-testable: same story + images in → same
// HTML out. Print-only concerns live in the CSS (@page / print media), so the
// same component markup serves screen reuse.

import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import type { PageId } from "@/lib/story/master-text";
import type { ResolvedPage, ResolvedStory } from "@/lib/story/merge";

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
// Embedded font assets
// ---------------------------------------------------------------------------

/**
 * The woff2 files (self-hosted under /public/fonts) and the `__FONT_*__` tokens
 * in styles.css they replace. Read once per render and inlined as base64 data
 * URLs so the returned HTML needs no font requests at render time.
 */
const FONT_FILES: ReadonlyArray<readonly [token: string, file: string]> = [
  ["__FONT_FRAUNCES_NORMAL__", "fraunces-latin-full-normal.woff2"],
  ["__FONT_FRAUNCES_ITALIC__", "fraunces-latin-full-italic.woff2"],
  ["__FONT_LORA_NORMAL__", "lora-latin-wght-normal.woff2"],
  ["__FONT_LORA_ITALIC__", "lora-latin-wght-italic.woff2"],
  ["__FONT_JETBRAINS_MONO__", "jetbrains-mono-latin-wght-normal.woff2"],
];

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const STYLES_PATH = path.join(process.cwd(), "lib", "pdf", "styles.css");

/**
 * Read the print CSS, strip its `/* *​/` comments (this also removes the
 * documentation token `__FONT_*__` so only the real `src: url(...)` tokens
 * remain), then replace each `__FONT_*__` token with a base64 data URL. Comments
 * are stripped before injection — the woff2 data URLs contain no `/​*` sequence,
 * so this is safe.
 */
function buildInlineCss(): string {
  let css = readFileSync(STYLES_PATH, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [token, file] of FONT_FILES) {
    const base64 = readFileSync(path.join(FONTS_DIR, file)).toString("base64");
    const dataUrl = `data:font/woff2;base64,${base64}`;
    css = css.split(token).join(dataUrl);
  }
  return css;
}

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

/** Render resolved body paragraphs. Copy is already final — no text logic. */
function Body({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="story-page__body">
      {paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
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
      <Body paragraphs={page.body} />
      <PageNumber value={page.pageNumber} />
    </section>
  );
}

function TruthPage({ page, src }: { page: ResolvedPage; src?: string }) {
  return (
    <section className="story-page story-page--truth" data-page={page.id}>
      <ArtSlot src={src} alt={page.illustrationBrief} className="story-art" />
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
 * Dispatch a resolved page to its treatment. Pages 2-6 and 8-9 and 11 use the
 * shared narrative layout (art + centered body); the cover, dedication, gentle
 * truth (7), love-stays (10), closing (12) and back cover get bespoke ones, to
 * match the prototype spreads.
 */
function renderPage(page: ResolvedPage, src?: string) {
  switch (page.id) {
    case "cover":
      return <CoverPage key={page.id} page={page} src={src} />;
    case "page-1":
      return <DedicationPage key={page.id} page={page} />;
    case "page-7":
      return <TruthPage key={page.id} page={page} src={src} />;
    case "page-10":
      return <LovePage key={page.id} page={page} />;
    case "page-12":
      return <ClosingPage key={page.id} page={page} src={src} />;
    case "back-cover":
      return <BackCoverPage key={page.id} page={page} />;
    default:
      // pages 2,3,4,5,6,8,9,11 — the standard narrative layout.
      return (
        <NarrativePage
          key={page.id}
          page={page}
          src={src}
          artClassName="story-art story-art--landscape"
        />
      );
  }
}

// ---------------------------------------------------------------------------
// The whole book
// ---------------------------------------------------------------------------

function StoryDocument({
  story,
  images,
  css,
}: {
  story: ResolvedStory;
  images: PageImageMap;
  css: string;
}) {
  const title = story.find((p) => p.id === "cover")?.title ?? "Saying Goodbye";
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        {story.map((page) => renderPage(page, images[page.id]))}
      </body>
    </html>
  );
}

/**
 * Render a fully-resolved story to a complete, self-contained HTML document
 * string (`<!DOCTYPE html>…`) for the PDF renderer (feature 05) or the screen
 * preview (feature 10). One `.story-page` section per resolved page, in order;
 * the print CSS turns each into exactly one printed sheet. Pet/child copy comes
 * entirely from `story`; image sources from `images` (missing → placeholder).
 */
export function renderStoryHtml(
  story: ResolvedStory,
  images: PageImageMap = {},
): string {
  const css = buildInlineCss();
  const markup = renderToStaticMarkup(
    <StoryDocument story={story} images={images} css={css} />,
  );
  return `<!DOCTYPE html>\n${markup}`;
}
