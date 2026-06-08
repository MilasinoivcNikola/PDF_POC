// The print template for Story 1 — turns a fully-resolved story into a complete,
// self-contained HTML document string for the PDF renderer (feature 05).
//
// The per-page layout itself lives in lib/pdf/pages.tsx (the SINGLE source of the
// `.story-page` markup), which the in-browser preview (feature 10) also imports —
// so what the user sees on screen equals what the PDF contains. THIS module owns
// only the document wrapper and the things that make the output self-contained:
// inlining the print CSS (lib/pdf/styles.css) into <head> and embedding the three
// font families as base64 data URLs read from /public/fonts at render time. There
// are no Google Fonts / CDN links anywhere in the output.
//
// "Self-contained" matters: feature 05 hands this string to Puppeteer's
// `page.setContent`, which has no base URL and makes no relative-asset requests.
//
// `renderStoryHtml` is pure apart from reading those static repo files (CSS +
// woff2). It is deterministic and unit-testable: same story + images in → same
// HTML out. Print-only concerns live in the CSS (@page / print media), so the
// same page markup serves the screen preview unchanged.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type { ReactElement } from "react";

import type { ResolvedStory } from "@/lib/story/merge";
import { StoryPages, type PageImageMap } from "@/lib/pdf/pages";

// Re-exported so existing importers (render.ts, tests) keep their
// `import { ... type PageImageMap } from "@/lib/pdf/template"` path working; the
// type's home is now lib/pdf/pages.ts (the fs-free, client-safe module).
export type { PageImageMap };

// `react-dom/server` is loaded lazily through a runtime `require`, NOT a static
// `import`. Next.js webpack rejects any module in the route/server-component
// graph that statically imports `react-dom/server` (it can't tell a Node-only PDF
// route from a client component). renderStoryHtml is genuinely server-only Node
// code, so we sidestep that false positive without changing render.ts or the
// output: a runtime require isn't traced by the component-graph rule, and the
// resolved module's `renderToStaticMarkup` behaves exactly as a static import
// would. `createRequire` yields a synchronous `require` from this ESM module, so
// renderStoryHtml stays synchronous (render.ts calls it without `await`).
const nodeRequire = createRequire(import.meta.url);
type RenderToStaticMarkup = (element: ReactElement) => string;
let cachedRenderToStaticMarkup: RenderToStaticMarkup | null = null;
function getRenderToStaticMarkup(): RenderToStaticMarkup {
  if (!cachedRenderToStaticMarkup) {
    cachedRenderToStaticMarkup = (
      nodeRequire("react-dom/server") as {
        renderToStaticMarkup: RenderToStaticMarkup;
      }
    ).renderToStaticMarkup;
  }
  return cachedRenderToStaticMarkup;
}

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
        <StoryPages story={story} images={images} />
      </body>
    </html>
  );
}

/**
 * Render a fully-resolved story to a complete, self-contained HTML document
 * string (`<!DOCTYPE html>…`) for the PDF renderer (feature 05). One
 * `.story-page` section per resolved page, in order; the print CSS turns each
 * into exactly one printed sheet. Pet/child copy comes entirely from `story`;
 * image sources from `images` (missing → placeholder).
 */
export function renderStoryHtml(
  story: ResolvedStory,
  images: PageImageMap = {},
): string {
  const css = buildInlineCss();
  const markup = getRenderToStaticMarkup()(
    <StoryDocument story={story} images={images} css={css} />,
  );
  return `<!DOCTYPE html>\n${markup}`;
}
