import { describe, it, expect } from "vitest";

import { renderStoryHtml } from "@/lib/pdf/template";
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
