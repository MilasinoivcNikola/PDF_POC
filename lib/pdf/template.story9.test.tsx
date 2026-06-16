import { describe, it, expect } from "vitest";

import { renderStoryHtml } from "@/lib/pdf/template";
import { resolveStory9 } from "@/lib/story/story9/variants";
import { biscuitSession9 } from "@/lib/story/story9/fixtures";

// Story 9 ("[PET_NAME] and the New Baby") reuses Story 1's narrative-book layouts —
// cover + dedication + pages 2-8 + back cover. Its illustration slots end at
// `baby-page-7`, so the closing page (`baby-page-8`, `closing` layout) is NOT one of
// its slots and has no own generated art. These guard the cover-fallback fix: on
// `baby-page-8` only, when no own src exists, the COVER illustration is reused in a
// circular vignette (`closing__art--circle`) instead of leaking the generic
// PlaceholderPet face. The masterstory's closing brief asks the image to "echo the
// cover but feel fuller and more settled," so the cover medallion is exactly right.
//
// The disjoint allow-list (CLOSING_COVER_FALLBACK_PAGE_IDS in pages.tsx) holds every
// other product's closing byte-identical — Story 1's `page-12` has its own src (first
// branch), Story 8's `adventure-closing` is not in the set (placeholder unchanged).
// That direction is locked in template.test.tsx; here we lock that Story 9 DOES reuse
// the cover, circled, and still renders cleanly without a cover src.

// Distinct, recognizable sentinel data URLs so a match is unambiguous about the slot
// it came from. Not real PNGs; we assert only on their placement in the HTML.
const COVER_SRC = "data:image/png;base64,BABYCOVERSENTINEL0001==";

// Slice the HTML to just the section for `pageId`: from its `data-page="<id>"` marker
// up to the next `data-page=` boundary (or end of document for the last page) — lets
// us assert a src lands inside one specific page, not merely "somewhere".
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
// Structure (the layout dispatch is unchanged; New Baby reuses Story 1's)
// ---------------------------------------------------------------------------

describe("Story-9 new-baby — structure", () => {
  it("renders 10 .story-page sections (cover + dedication + pages 2-8 + back cover)", () => {
    const story = resolveStory9(biscuitSession9());
    const html = renderStoryHtml(story);
    expect(storyPageCount(html)).toBe(10);
    expect(storyPageCount(html)).toBe(story.length);
  });

  it("emits a data-page marker for every baby page id, in order", () => {
    const story = resolveStory9(biscuitSession9());
    const html = renderStoryHtml(story);
    const ids = [...html.matchAll(/data-page="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(story.map((p) => p.id));
  });

  it("puts the cover title in the document <title>", () => {
    const html = renderStoryHtml(resolveStory9(biscuitSession9()));
    expect(html).toContain("<title>Biscuit and the New Baby</title>");
  });
});

// ---------------------------------------------------------------------------
// Closing page art (baby-page-8) — the cover-fallback fix
// ---------------------------------------------------------------------------

describe("Story-9 new-baby — closing page reuses the cover, circled", () => {
  it("renders the cover src inside baby-page-8, circled, when a cover src is present", () => {
    const html = renderStoryHtml(resolveStory9(biscuitSession9()), {
      "baby-cover": COVER_SRC,
    });
    const closing = sectionFor(html, "baby-page-8");
    expect(closing).toContain("closing__art--circle");
    expect(closing).toContain(`src="${COVER_SRC}"`);
    // The generic placeholder face must NOT leak onto the closing page anymore.
    expect(closing).not.toContain('ellipse cx="50" cy="60" rx="32" ry="26"');
  });

  it("renders cleanly (placeholder, no circle, no img) when no cover src is supplied", () => {
    const html = renderStoryHtml(resolveStory9(biscuitSession9()), {});
    const closing = sectionFor(html, "baby-page-8");
    expect(closing).not.toContain("closing__art--circle");
    expect(closing).not.toContain("<img");
    // Falls back to the placeholder art — the document is still complete (the
    // text-only render:test path is unchanged).
    expect(closing).toContain('ellipse cx="50" cy="60" rx="32" ry="26"');
  });

  it("does not place the cover art on baby-page-8 when the page itself has its own src", () => {
    // baby-page-8 is not an illustration slot, but if a src were ever supplied for it
    // directly, that own src takes precedence over the cover fallback.
    const OWN_SRC = "data:image/png;base64,BABYCLOSINGOWN0002==";
    const html = renderStoryHtml(resolveStory9(biscuitSession9()), {
      "baby-cover": COVER_SRC,
      "baby-page-8": OWN_SRC,
    });
    const closing = sectionFor(html, "baby-page-8");
    expect(closing).toContain(`src="${OWN_SRC}"`);
    expect(closing).not.toContain(COVER_SRC);
    expect(closing).not.toContain("closing__art--circle");
  });
});
