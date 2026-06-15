import { describe, it, expect } from "vitest";

import { renderStoryHtml, type PageImageMap } from "@/lib/pdf/template";
import { resolveStory6 } from "@/lib/story/story6/variants";
import { biscuitSession6 } from "@/lib/story/story6/fixtures";

// Story 6 ("While You're Still Here, [PET_NAME]") reuses Story 1's narrative-book
// layouts, but unlike Story 1 its `dedication` page (`tribute-page-1`) and BOTH of
// its `love` pages (`tribute-page-5` / `tribute-page-6`) ARE illustration slots —
// Story 1's same-layout pages (`page-1` / `page-10`) carry no image, by design.
// These guard the dropped-image fix: a supplied src on those three Story-6 ids
// renders as an <img> in its dedication/love wrapper, never an empty slot when no
// src is supplied, and never leaks onto a text-only page. The disjoint allow-lists
// (DEDICATION_ART_PAGE_IDS / LOVE_ART_PAGE_IDS in pages.tsx) hold Story 1's output
// byte-identical — that direction is locked in template.test.tsx (page-10 ignores
// a src); here we lock that Story 6 DOES place all three.

// Distinct, recognizable sentinel data URLs so a match is unambiguous about the
// slot it came from. Not real PNGs; we assert only on their placement in the HTML.
const COVER_SRC = "data:image/png;base64,TRIBUTECOVERSENTINEL0001==";
const DEDICATION_SRC = "data:image/png;base64,TRIBUTEDEDSENTINEL0002==";
const LOVE5_SRC = "data:image/png;base64,TRIBUTELOVE5SENTINEL0003==";
const LOVE6_SRC = "data:image/png;base64,TRIBUTELOVE6SENTINEL0004==";

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

function fullImageMap(): PageImageMap {
  return {
    "tribute-cover": COVER_SRC,
    "tribute-page-1": DEDICATION_SRC,
    "tribute-page-5": LOVE5_SRC,
    "tribute-page-6": LOVE6_SRC,
  };
}

// ---------------------------------------------------------------------------
// Structure (the layout dispatch is unchanged; the tribute reuses Story 1's)
// ---------------------------------------------------------------------------

describe("Story-6 tribute — structure", () => {
  it("renders 8 .story-page sections (cover + 6 + back cover)", () => {
    const story = resolveStory6(biscuitSession6());
    const html = renderStoryHtml(story);
    expect(storyPageCount(html)).toBe(8);
    expect(storyPageCount(html)).toBe(story.length);
  });

  it("emits a data-page marker for every tribute page id, in order", () => {
    const story = resolveStory6(biscuitSession6());
    const html = renderStoryHtml(story);
    const ids = [...html.matchAll(/data-page="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(story.map((p) => p.id));
  });

  it("puts the cover title in the document <title>", () => {
    const html = renderStoryHtml(resolveStory6(biscuitSession6()));
    expect(html).toContain("<title>While You&#x27;re Still Here, Biscuit</title>");
  });
});

// ---------------------------------------------------------------------------
// Dedication page art (tribute-page-1)
// ---------------------------------------------------------------------------

describe("Story-6 tribute — dedication page illustration", () => {
  it("renders the dedication src inside tribute-page-1, wrapped in .dedication__art", () => {
    const html = renderStoryHtml(resolveStory6(biscuitSession6()), fullImageMap());
    const page1 = sectionFor(html, "tribute-page-1");
    expect(page1).toContain('class="dedication__art"');
    expect(page1).toContain(`src="${DEDICATION_SRC}"`);
    // With art present, the petal ornament is replaced (no ornament div on this page).
    expect(page1).not.toContain('class="dedication__ornament"');
  });

  it("renders the verse ornament and no art on tribute-page-1 when no src is supplied", () => {
    const html = renderStoryHtml(resolveStory6(biscuitSession6()), {});
    const page1 = sectionFor(html, "tribute-page-1");
    expect(page1).toContain('class="dedication__ornament"');
    expect(page1).not.toContain("dedication__art");
    expect(page1).not.toContain("<img");
  });
});

// ---------------------------------------------------------------------------
// Love page art (tribute-page-5 / tribute-page-6)
// ---------------------------------------------------------------------------

describe("Story-6 tribute — love page illustrations", () => {
  it("renders the love src inside tribute-page-5, wrapped in .love__art", () => {
    const html = renderStoryHtml(resolveStory6(biscuitSession6()), fullImageMap());
    const page5 = sectionFor(html, "tribute-page-5");
    expect(page5).toContain('class="love__art"');
    expect(page5).toContain(`src="${LOVE5_SRC}"`);
  });

  it("renders the love src inside tribute-page-6, wrapped in .love__art", () => {
    const html = renderStoryHtml(resolveStory6(biscuitSession6()), fullImageMap());
    const page6 = sectionFor(html, "tribute-page-6");
    expect(page6).toContain('class="love__art"');
    expect(page6).toContain(`src="${LOVE6_SRC}"`);
  });

  it("renders no love art on a love page when no src is supplied", () => {
    const html = renderStoryHtml(resolveStory6(biscuitSession6()), {});
    const page5 = sectionFor(html, "tribute-page-5");
    const page6 = sectionFor(html, "tribute-page-6");
    expect(page5).not.toContain("love__art");
    expect(page5).not.toContain("<img");
    expect(page6).not.toContain("love__art");
    expect(page6).not.toContain("<img");
  });

  it("does not leak a love src onto the other love page", () => {
    const html = renderStoryHtml(resolveStory6(biscuitSession6()), fullImageMap());
    const page5 = sectionFor(html, "tribute-page-5");
    const page6 = sectionFor(html, "tribute-page-6");
    expect(page5).not.toContain(LOVE6_SRC);
    expect(page6).not.toContain(LOVE5_SRC);
  });
});

// ---------------------------------------------------------------------------
// All seven slots place an image (the fix's headline guarantee)
// ---------------------------------------------------------------------------

describe("Story-6 tribute — all 7 illustration slots are placed", () => {
  it("renders an <img> for every illustrated slot, none dropped", () => {
    const images: PageImageMap = {
      "tribute-cover": COVER_SRC,
      "tribute-page-1": DEDICATION_SRC,
      "tribute-page-2": "data:image/png;base64,TRIBUTEP2==",
      "tribute-page-3": "data:image/png;base64,TRIBUTEP3==",
      "tribute-page-4": "data:image/png;base64,TRIBUTEP4==",
      "tribute-page-5": LOVE5_SRC,
      "tribute-page-6": LOVE6_SRC,
    };
    const html = renderStoryHtml(resolveStory6(biscuitSession6()), images);
    const imgCount = (html.match(/<img /g) ?? []).length;
    expect(imgCount).toBe(7);
    // No placeholder art remains for the illustrated slots.
    expect(html).not.toContain('ellipse cx="50" cy="60" rx="32" ry="26"');
  });
});
