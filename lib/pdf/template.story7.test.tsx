import { describe, it, expect } from "vitest";

import { renderStoryHtml, type PageImageMap } from "@/lib/pdf/template";
import { resolveStory7 } from "@/lib/story/story7/variants";
import { biscuitSession7 } from "@/lib/story/story7/fixtures";

// Story 7 ("Welcome Home, [PET_NAME]") reuses Story 1's narrative-book layouts —
// cover + dedication + 7 narrative pages + a `closing` page + back cover. Unlike
// Story 1, its closing page (`welcome-closing`) is NOT one of its illustration
// slots (the scene list ends at `welcome-belong`), so the closing page has no own
// generated art. These guard the cover-fallback fix: on `welcome-closing` only,
// when no own src exists, the COVER illustration is reused in a circular vignette
// (`closing__art--circle`) instead of leaking the generic PlaceholderPet face.
//
// The disjoint allow-list (CLOSING_COVER_FALLBACK_PAGE_IDS in pages.tsx) holds
// every other product's closing byte-identical — Story 1's `page-12` has its own
// src (first branch), Story 8/9 closings are not in the set (placeholder unchanged).
// That direction is locked in template.test.tsx; here we lock that Story 7 DOES
// reuse the cover, circled, and still renders cleanly without a cover src.

// Distinct, recognizable sentinel data URLs so a match is unambiguous about the
// slot it came from. Not real PNGs; we assert only on their placement in the HTML.
const COVER_SRC = "data:image/png;base64,WELCOMECOVERSENTINEL0001==";

// Slice the HTML to just the section for `pageId`: from its `data-page="<id>"`
// marker up to the next `data-page=` boundary (or end of document for the last
// page) — lets us assert a src lands inside one specific page, not merely "somewhere".
function sectionFor(html: string, pageId: string): string {
  const start = html.indexOf(`data-page="${pageId}"`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = html.indexOf("data-page=", start + 1);
  return rest === -1 ? html.slice(start) : html.slice(start, rest);
}

function storyPageCount(html: string): number {
  return (html.match(/<section class="story-page/g) ?? []).length;
}

// ---------------------------------------------------------------------------
// Structure (the layout dispatch is unchanged; Welcome Home reuses Story 1's)
// ---------------------------------------------------------------------------

describe("Story-7 welcome — structure", () => {
  it("renders 11 .story-page sections (cover + dedication + 7 + closing + back cover)", () => {
    const story = resolveStory7(biscuitSession7());
    const html = renderStoryHtml(story);
    expect(storyPageCount(html)).toBe(11);
    expect(storyPageCount(html)).toBe(story.length);
  });

  it("emits a data-page marker for every welcome page id, in order", () => {
    const story = resolveStory7(biscuitSession7());
    const html = renderStoryHtml(story);
    const ids = [...html.matchAll(/data-page="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(story.map((p) => p.id));
  });

  it("puts the cover title in the document <title>", () => {
    const html = renderStoryHtml(resolveStory7(biscuitSession7()));
    expect(html).toContain("<title>Welcome Home, Biscuit</title>");
  });
});

// ---------------------------------------------------------------------------
// Closing page art (welcome-closing) — the cover-fallback fix
// ---------------------------------------------------------------------------

describe("Story-7 welcome — closing page reuses the cover, circled", () => {
  it("renders the cover src inside welcome-closing, circled, when a cover src is present", () => {
    const html = renderStoryHtml(resolveStory7(biscuitSession7()), {
      "welcome-cover": COVER_SRC,
    });
    const closing = sectionFor(html, "welcome-closing");
    expect(closing).toContain("closing__art--circle");
    expect(closing).toContain(`src="${COVER_SRC}"`);
    // The generic placeholder face must NOT leak onto the closing page anymore.
    expect(closing).not.toContain('ellipse cx="50" cy="60" rx="32" ry="26"');
  });

  it("renders cleanly (placeholder, no circle, no img) when no cover src is supplied", () => {
    const html = renderStoryHtml(resolveStory7(biscuitSession7()), {});
    const closing = sectionFor(html, "welcome-closing");
    expect(closing).not.toContain("closing__art--circle");
    expect(closing).not.toContain("<img");
    // Falls back to the placeholder art — the document is still complete.
    expect(closing).toContain('ellipse cx="50" cy="60" rx="32" ry="26"');
  });

  it("does not place the cover art on welcome-closing when the page itself has its own src", () => {
    // welcome-closing is not an illustration slot, but if a src were ever supplied
    // for it directly, that own src takes precedence over the cover fallback.
    const OWN_SRC = "data:image/png;base64,WELCOMECLOSINGOWN0002==";
    const html = renderStoryHtml(resolveStory7(biscuitSession7()), {
      "welcome-cover": COVER_SRC,
      "welcome-closing": OWN_SRC,
    });
    const closing = sectionFor(html, "welcome-closing");
    expect(closing).toContain(`src="${OWN_SRC}"`);
    expect(closing).not.toContain(COVER_SRC);
    expect(closing).not.toContain("closing__art--circle");
  });
});
