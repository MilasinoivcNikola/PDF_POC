import { describe, it, expect } from "vitest";

import { renderStoryHtml, type PageImageMap } from "@/lib/pdf/template";
import { resolveStory4 } from "@/lib/story/story4/variants";
import { biscuitSession } from "@/lib/story/story4/fixtures";

// Story 4 ("If [PET_NAME] Could Talk") reuses Story 2's `letter` layouts but its
// Page-4 slot (`talk-page-4`) is a full pet-in-scene FEATURE illustration, not the
// softened Page-5 wash. These guard the feature-image fix: a supplied src on
// `talk-page-4` renders as a `.letter-page__feature` <img> (not a wash), it never
// renders an empty slot when no src is supplied, and the feature path never leaks
// onto a text-only body page or steals the wash treatment.

// A distinct, recognizable sentinel data URL so a match is unambiguous about the
// slot it came from. Not a real PNG; we assert only on its placement in the HTML.
const COVER_SRC = "data:image/png;base64,TALKCOVERSENTINEL0001==";
const FEATURE_SRC = "data:image/png;base64,TALKFEATURESENTINEL0002==";

// Slice the HTML to just the section for `pageId`: from its `data-page="<id>"`
// marker up to the next `data-page=` boundary (or end of document for the last
// page) — lets us assert a src lands inside one specific page, not merely "somewhere".
function sectionFor(html: string, pageId: string): string {
  const start = html.indexOf(`data-page="${pageId}"`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = html.indexOf("data-page=", start + 1);
  return rest === -1 ? html.slice(start) : html.slice(start, rest);
}

function imageMap(): PageImageMap {
  return { "talk-cover": COVER_SRC, "talk-page-4": FEATURE_SRC };
}

describe("Story-4 letter — Page-4 feature illustration", () => {
  // (1) The feature src renders inside talk-page-4, wrapped in .letter-page__feature
  // (a real feature image), NOT the .letter-page__wash treatment.
  it("renders the feature src inside talk-page-4, wrapped in .letter-page__feature", () => {
    const html = renderStoryHtml(resolveStory4(biscuitSession()), imageMap());
    const page4 = sectionFor(html, "talk-page-4");
    expect(page4).toContain('class="letter-page__feature"');
    expect(page4).toContain(`src="${FEATURE_SRC}"`);
    // It must NOT get the softened wash treatment.
    expect(page4).not.toContain('class="letter-page__wash"');
  });

  // (2) With no src for talk-page-4, the page stays text-only: no feature element,
  // no <img> — never an empty slot.
  it("renders no feature element on talk-page-4 when no src is supplied", () => {
    const html = renderStoryHtml(resolveStory4(biscuitSession()), {});
    const page4 = sectionFor(html, "talk-page-4");
    expect(page4).not.toContain("letter-page__feature");
    expect(page4).not.toContain("<img");
  });

  // (3) The feature src never leaks onto another body page (talk-page-3 is text-only).
  it("does not render the feature src on a text-only body page (talk-page-3)", () => {
    const html = renderStoryHtml(resolveStory4(biscuitSession()), imageMap());
    const page3 = sectionFor(html, "talk-page-3");
    expect(page3).not.toContain(FEATURE_SRC);
    expect(page3).not.toContain("letter-page__feature");
  });

  // (4) The cover src lands on talk-cover and does not leak into talk-page-4.
  it("renders the cover src in talk-cover and not in talk-page-4", () => {
    const html = renderStoryHtml(resolveStory4(biscuitSession()), imageMap());
    const cover = sectionFor(html, "talk-cover");
    const page4 = sectionFor(html, "talk-page-4");
    expect(cover).toContain(`src="${COVER_SRC}"`);
    expect(page4).not.toContain(COVER_SRC);
  });
});
