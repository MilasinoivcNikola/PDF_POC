import { describe, it, expect } from "vitest";

import { renderStoryHtml, type PageImageMap } from "@/lib/pdf/template";
import { resolveStory } from "@/lib/story/variants";
import { otisSession, sessionWith } from "@/lib/story/fixtures";

// `renderStoryHtml` is pure (apart from reading the static repo CSS + woff2
// files, which are deterministic). These suites guard the things that can
// actually be wrong in feature 04's template-to-HTML step: a complete document,
// one .story-page section per resolved page, the resolved copy actually landing
// on the page, image-manifest wiring (real src vs. graceful placeholder), and
// the self-contained-fonts invariant (embedded @font-face, no Google Fonts, no
// leftover __FONT_*__ / {placeholder} tokens). Visual/print fidelity is out of
// scope here (feature 05 + qa).

// renderToStaticMarkup HTML-escapes quotes, so the master text's `"died"` lands
// as `&quot;died&quot;`. Assert against the escaped form (or escape-free text).
const ESCAPED_DIED = "&quot;died&quot;";

// Count rendered page sections. The template opens every page with
// `<section class="story-page ...>`. Match the element form (not the bare class
// name) so the inlined `.story-page { ... }` CSS rules in <head> don't inflate
// the count.
function storyPageCount(html: string): number {
  return (html.match(/<section class="story-page/g) ?? []).length;
}

// The PlaceholderPet SVG's signature first ellipse — unique to the fallback art
// rendered when an image slot has no src.
const PLACEHOLDER_MARKER = 'ellipse cx="50" cy="60" rx="32" ry="26"';

function placeholderCount(html: string): number {
  return (html.match(/ellipse cx="50" cy="60" rx="32" ry="26"/g) ?? []).length;
}

// ---------------------------------------------------------------------------
// Document completeness
// ---------------------------------------------------------------------------

describe("document completeness", () => {
  it("returns a complete HTML document", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<html lang=\"en\">");
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
    expect(html).toContain("<head>");
    expect(html).toContain("<body>");
  });

  it("puts the cover title in the document <title>", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(html).toContain("<title>Saying Goodbye to Otis</title>");
  });
});

// ---------------------------------------------------------------------------
// Page count
// ---------------------------------------------------------------------------

describe("page count", () => {
  it("renders exactly 14 .story-page sections (cover + 12 + back cover)", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(storyPageCount(html)).toBe(14);
  });

  it("renders one section per resolved page", () => {
    const story = resolveStory(otisSession());
    const html = renderStoryHtml(story);
    expect(storyPageCount(html)).toBe(story.length);
  });

  it("emits a data-page marker for every page id, in order", () => {
    const story = resolveStory(otisSession());
    const html = renderStoryHtml(story);
    const ids = [...html.matchAll(/data-page="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(story.map((p) => p.id));
  });
});

// ---------------------------------------------------------------------------
// Resolved copy present
// ---------------------------------------------------------------------------

describe("resolved copy present", () => {
  it("contains the cover title and child subtitle", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(html).toContain("Saying Goodbye to Otis");
    expect(html).toContain("A story for Emma");
  });

  it("contains body copy from a narrative page", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    // Page 2 opening, fully merged (no special chars to escape).
    expect(html).toContain(
      "Once, in a home full of love, there lived a dog named Otis.",
    );
    // Page 4 favorite-activity line.
    expect(html).toContain("chasing tennis balls in the backyard");
  });

  it("contains the Page 7 gentle-truth copy with escaped quotes", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    // renderToStaticMarkup escapes the double quotes around died.
    expect(html).toContain(ESCAPED_DIED);
    expect(html).not.toContain('"died"');
  });

  it("contains the hopeful Page 12 closing copy", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(html).toContain("And Otis will always, always be loved.");
  });

  it("renders the optional Page-1 parent dedication when supplied", () => {
    const dedication = "Run easy, sweet boy. We will miss you forever.";
    const html = renderStoryHtml(
      resolveStory(sessionWith({ memories: { parentDedication: dedication } })),
    );
    // Match the rendered element, not the `.dedication__parent` CSS rule that is
    // always present in the inlined <head> stylesheet.
    expect(html).toContain('<p class="dedication__parent">');
    expect(html).toContain(dedication);
  });

  it("omits the parent dedication block when none is supplied", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(html).not.toContain('<p class="dedication__parent">');
  });
});

// ---------------------------------------------------------------------------
// Image manifest wiring
// ---------------------------------------------------------------------------

describe("image manifest wiring", () => {
  it("uses the manifest src for a page that has one", () => {
    const images: PageImageMap = { cover: "/generated/cover.png" };
    const html = renderStoryHtml(resolveStory(otisSession()), images);
    expect(html).toContain('src="/generated/cover.png"');
  });

  it("wires distinct srcs to distinct pages", () => {
    const images: PageImageMap = {
      cover: "/generated/cover.png",
      "page-2": "/generated/p2.png",
      "page-7": "/generated/p7.png",
      "page-12": "/generated/p12.png",
    };
    const html = renderStoryHtml(resolveStory(otisSession()), images);
    expect(html).toContain('src="/generated/cover.png"');
    expect(html).toContain('src="/generated/p2.png"');
    expect(html).toContain('src="/generated/p7.png"');
    expect(html).toContain('src="/generated/p12.png"');
  });

  it("falls back to placeholder art for pages with no manifest entry", () => {
    // With no images at all, every image slot renders the placeholder.
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(html).toContain(PLACEHOLDER_MARKER);
    expect(html).not.toContain("<img");
  });

  it("renders one fewer placeholder for each page given a src", () => {
    const story = resolveStory(otisSession());
    const noImages = placeholderCount(renderStoryHtml(story));
    const withCover = placeholderCount(
      renderStoryHtml(story, { cover: "/x.png" }),
    );
    expect(noImages).toBeGreaterThan(0);
    // The cover slot switched from placeholder art to <img>.
    expect(withCover).toBe(noImages - 1);
  });

  it("ignores a manifest entry for a page with no image slot (love page)", () => {
    // page-10 (love-stays) has no <img> slot; supplying a src must not appear.
    const html = renderStoryHtml(resolveStory(otisSession()), {
      "page-10": "/generated/p10.png",
    });
    expect(html).not.toContain('src="/generated/p10.png"');
  });
});

// ---------------------------------------------------------------------------
// No leaked tokens
// ---------------------------------------------------------------------------

describe("no leaked tokens", () => {
  it("contains no surviving {placeholder} merge tokens", () => {
    const html = renderStoryHtml(resolveStory(otisSession()), {
      cover: "/x.png",
    });
    expect(/\{[a-zA-Z]+\}/.test(html)).toBe(false);
  });

  it("contains no internal __FONT_*__ substitution tokens", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(/__FONT_[A-Z_]+__/.test(html)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Self-contained fonts
// ---------------------------------------------------------------------------

describe("self-contained fonts", () => {
  it("embeds @font-face rules with base64 woff2 data URLs", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(html).toContain("@font-face");
    expect(html).toContain("data:font/woff2;base64,");
  });

  it("makes no external Google Fonts request", () => {
    const html = renderStoryHtml(resolveStory(otisSession()));
    expect(html).not.toContain("fonts.googleapis.com");
    expect(html).not.toContain("fonts.gstatic.com");
  });
});
