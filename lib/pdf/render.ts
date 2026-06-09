// The Puppeteer step (feature 05): turn the self-contained HTML from feature 04
// into a real, print-quality PDF via headless Chrome. The pipeline is the whole
// craft-area-1 chain in one call:
//
//   StorySession → resolveStory (03) → renderStoryHtml (04) → page.setContent
//   → page.pdf({ Letter, printBackground, preferCSSPageSize, margin: 0 })
//
// This module is deliberately free of any Next.js request types so the same
// function is callable from the CLI (scripts/render-test.ts) and the future
// /api/render-pdf route (feature 10). Its only IO is launching/closing Chrome —
// the HTML/CSS/fonts are already inlined by feature 04, so `setContent` makes no
// relative-asset requests and the PDF renders identically on any machine.

import puppeteer from "puppeteer";

import type { PageImageMap } from "@/lib/pdf/template";
import { renderStoryHtml } from "@/lib/pdf/template";
import type { StorySession } from "@/lib/session/types";
import { getStory } from "@/lib/story/registry";

// ---------------------------------------------------------------------------
// Filename
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// In-page readiness
// ---------------------------------------------------------------------------

/**
 * Run inside the page (via page.evaluate) to guarantee that everything the PDF
 * captures is fully painted before `page.pdf()`: the embedded @font-face fonts
 * are loaded (`document.fonts.ready`) and every <img> has finished decoding.
 * `setContent`'s `load` event fires once the inlined markup is parsed, but font
 * shaping and image decode can still be pending — this closes that gap so the
 * first page never renders with fallback metrics or a half-decoded illustration.
 */
async function waitForAssets(): Promise<void> {
  await document.fonts.ready;
  const images = Array.from(document.images);
  await Promise.all(
    images.map((img) =>
      img.complete && img.naturalWidth > 0
        ? img.decode().catch(() => undefined)
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Render a finalized `StorySession` to PDF bytes. Resolves the story text +
 * variants (03), builds the self-contained HTML (04), then prints it with
 * headless Chrome at Letter size honoring the template's `@page` rules.
 *
 * `images` maps page slots to image sources (data URLs preferred); any omitted
 * slot renders the template's inline placeholder, so the call succeeds with an
 * empty map before feature 07 generates real illustrations.
 *
 * Returns a Node `Buffer` (Chrome's `page.pdf()` yields a `Uint8Array`; we wrap
 * it so callers — the CLI's `fs.writeFile`, the future API route's response —
 * get the familiar Buffer view).
 *
 * One browser is launched and torn down per call (in a `finally`, so a render
 * error never leaks a Chrome process). A warm browser pool would cut per-render
 * latency for batch/API use — deferred as a future optimization (feature 10+).
 */
export async function renderStoryPdf(
  session: StorySession,
  images: PageImageMap = {},
): Promise<Buffer> {
  const story = getStory(session.storyType ?? "story-1").resolve(session);
  const html = renderStoryHtml(story, images);

  // TODO(feature 10): containerized/CI runs will likely need launch args —
  // `{ args: ["--no-sandbox"] }` and a resolved executable path. Local dev uses
  // the Chrome that the `puppeteer` package installs under ~/.cache/puppeteer.
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    // `setContent`'s waitUntil excludes the networkidle events (those are for
    // page.goto). The HTML is fully self-contained anyway — CSS, fonts and
    // images are inlined as data URLs / inline SVG, so there are no network
    // requests to idle on. "load" + the explicit font/image wait below is what
    // actually guarantees a fully-painted page before printing.
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(waitForAssets);

    const pdf = await page.pdf({
      format: "Letter", // 8.5in × 11in
      printBackground: true, // include the warm background washes
      preferCSSPageSize: true, // honor the template's @page size + breaks
      margin: { top: 0, right: 0, bottom: 0, left: 0 }, // CSS owns the margins
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
