import { describe, it, expect } from "vitest";

import { renderStoryHtml, type PageImageMap } from "@/lib/pdf/template";
import { resolveStory2 } from "@/lib/story/story2/variants";
import { murphySession, story2SessionWith } from "@/lib/story/story2/fixtures";

// `renderStoryHtml` is product-agnostic: it renders any `ResolvedStory`, so the
// Story-2 letter (feature 16) flows through the same self-contained-HTML path as
// Story 1. These suites guard the letter-specific things: 6 `.letter-page`
// sections in order, the cover title/subtitle + optional date line, the
// signature block (sign-off + pet-name), no surviving {placeholder}/__FONT_*__
// token, and the embedded-fonts/no-Google-Fonts invariant. Visual/print fidelity
// (6-page Letter pagination, typography) is verified by the qa render.

// Count the rendered letter-page sections (the element form, not the bare class
// so the inlined `.letter-page { ... }` CSS in <head> doesn't inflate the count).
function letterPageCount(html: string): number {
  return (html.match(/<section class="letter-page/g) ?? []).length;
}

describe("Story-2 letter — document + page count", () => {
  it("renders a complete, self-contained document", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<html lang=\"en\">");
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });

  it("puts the letter title in the document <title>", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    expect(html).toContain("<title>A Letter from Murphy</title>");
  });

  it("renders exactly 6 letter-page sections", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    expect(letterPageCount(html)).toBe(6);
  });

  it("renders the letter pages in book order via data-page", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    const order = [...html.matchAll(/<section class="letter-page[^"]*" data-page="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(order).toEqual([
      "letter-cover",
      "letter-page-2",
      "letter-page-3",
      "letter-page-4",
      "letter-page-5",
      "letter-page-6",
    ]);
  });

  it("renders no Story-1 story-page sections", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    expect(html).not.toContain('<section class="story-page');
  });
});

describe("Story-2 letter — copy on the page", () => {
  it("shows the cover title and the 'for [owner]' subtitle", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    expect(html).toContain("A Letter from Murphy");
    expect(html).toContain("for Sarah");
  });

  it("shows the salutation and the pet-name signature", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    expect(html).toContain("Dear Sarah,");
    expect(html).toContain("Yours, always,");
    expect(html).toContain('class="letter-signature__name">Murphy<');
  });

  it("includes the date line when both dates are present", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    expect(html).toContain("March 2014 — October 2025");
  });

  it("omits the date line when a date is absent", () => {
    const session = story2SessionWith({ memories: { dateAdopted: "" } });
    const html = renderStoryHtml(resolveStory2(session));
    expect(html).not.toContain("October 2025");
    // Sign-off still present (no empty trailing line where the date would be).
    expect(html).toContain("Yours, always,");
  });

  it("includes the nickname signature line when provided, omits it otherwise", () => {
    const withNick = renderStoryHtml(resolveStory2(murphySession()));
    expect(withNick).toContain("Murph, Mr. Murph, the worst dog");

    const withoutNick = renderStoryHtml(
      resolveStory2(story2SessionWith({ memories: { nicknames: "" } })),
    );
    expect(withoutNick).not.toContain("Murph, Mr. Murph, the worst dog");
  });
});

describe("Story-2 letter — belief-frame wash image (feature-17 regression)", () => {
  // Regression for the feature-17 gap: the belief-frame wash image (letter-page-5)
  // was generated + mapped to a data URL but the `case "letter":` path dropped the
  // `src` entirely, so it never rendered. These guard that a supplied wash src now
  // lands ONLY on letter-page-5 (wrapped in .letter-page__wash), the cover portrait
  // lands ONLY on letter-cover, and neither leaks onto a text-only body page.

  // Distinct, recognizable sentinel data URLs — a unique base64 tail per image so
  // a match is unambiguous about which slot it came from. Not real PNGs; we only
  // assert on their presence/placement in the HTML string.
  const COVER_SRC = "data:image/png;base64,COVERSENTINEL0001==";
  const WASH_SRC = "data:image/png;base64,WASHSENTINEL0002==";

  // Slice the HTML to just the section for `pageId`: from its `data-page="<id>"`
  // marker up to the next `data-page=` boundary (or end of document for the last
  // page). Lets us assert a src lands inside one specific page, not merely "somewhere".
  function sectionFor(html: string, pageId: string): string {
    const start = html.indexOf(`data-page="${pageId}"`);
    expect(start).toBeGreaterThanOrEqual(0);
    const rest = html.indexOf("data-page=", start + 1);
    return rest === -1 ? html.slice(start) : html.slice(start, rest);
  }

  function imageMap(): PageImageMap {
    return { "letter-cover": COVER_SRC, "letter-page-5": WASH_SRC };
  }

  // (1) The wash src appears within the letter-page-5 section, wrapped in
  // .letter-page__wash.
  it("renders the wash src inside letter-page-5, wrapped in .letter-page__wash", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()), imageMap());
    const page5 = sectionFor(html, "letter-page-5");
    expect(page5).toContain('class="letter-page__wash"');
    expect(page5).toContain(`src="${WASH_SRC}"`);
  });

  // (2) The wash src does NOT appear on a text-only body page (letter-page-4) —
  // that page stays text-only.
  it("does not render the wash src on a text-only body page (letter-page-4)", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()), imageMap());
    const page4 = sectionFor(html, "letter-page-4");
    expect(page4).not.toContain(WASH_SRC);
    expect(page4).not.toContain('class="letter-page__wash"');
  });

  // (3) The cover src appears in the letter-cover section and does not leak into
  // letter-page-5.
  it("renders the cover src in letter-cover and not in letter-page-5", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()), imageMap());
    const cover = sectionFor(html, "letter-cover");
    const page5 = sectionFor(html, "letter-page-5");
    expect(cover).toContain(`src="${COVER_SRC}"`);
    expect(page5).not.toContain(COVER_SRC);
  });

  // (4) Graceful degradation: with an empty image map, NO .letter-page__wash
  // ELEMENT is rendered. The inlined <head> stylesheet always contains the
  // `.letter-page__wash { ... }` CSS rule, so `html.includes("letter-page__wash")`
  // is a false positive. We dodge it by slicing off the <head> (so the <style>
  // block is excluded) before asserting the wash class is absent from the body.
  it("renders no .letter-page__wash element when the image map is empty", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()), {});
    const bodyStart = html.indexOf("<body>");
    expect(bodyStart).toBeGreaterThanOrEqual(0);
    const body = html.slice(bodyStart);
    expect(body).not.toContain("letter-page__wash");
    // And the belief-wash page itself carries no wash element / image.
    const page5 = sectionFor(html, "letter-page-5");
    expect(page5).not.toContain("<img");
  });
});

describe("Story-2 letter — self-contained, no leftover tokens", () => {
  it("leaves no {placeholder} or __FONT_*__ token in the output", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    expect(html).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(html).not.toContain("__FONT_");
  });

  it("embeds fonts as data URLs with no Google Fonts request", () => {
    const html = renderStoryHtml(resolveStory2(murphySession()));
    expect(html).toContain("data:font/woff2;base64,");
    expect(html).not.toContain("fonts.googleapis.com");
    expect(html).not.toContain("fonts.gstatic.com");
  });
});
