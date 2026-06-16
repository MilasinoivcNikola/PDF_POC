import { describe, it, expect } from "vitest";
import { wrapIndex, captionForImage } from "./galleryCaption";

describe("wrapIndex", () => {
  it("returns the index unchanged when in range", () => {
    expect(wrapIndex(0, 13)).toBe(0);
    expect(wrapIndex(5, 13)).toBe(5);
    expect(wrapIndex(12, 13)).toBe(12);
  });

  it("wraps forward past the end (next from last → first)", () => {
    expect(wrapIndex(13, 13)).toBe(0);
    expect(wrapIndex(14, 13)).toBe(1);
  });

  it("wraps backward below zero (prev from first → last)", () => {
    expect(wrapIndex(-1, 13)).toBe(12);
    expect(wrapIndex(-2, 13)).toBe(11);
  });

  it("wraps a 2-stop carousel", () => {
    expect(wrapIndex(2, 2)).toBe(0);
    expect(wrapIndex(-1, 2)).toBe(1);
  });

  it("collapses to 0 when there are no images", () => {
    expect(wrapIndex(0, 0)).toBe(0);
    expect(wrapIndex(3, 0)).toBe(0);
    expect(wrapIndex(-1, 0)).toBe(0);
  });
});

describe("captionForImage", () => {
  it("labels index 0 as the cover regardless of filename", () => {
    expect(captionForImage("/samples/story-1-book/cover.jpg", 0)).toBe(
      "The cover",
    );
    expect(captionForImage("/samples/story-9-newbaby/baby-cover.jpg", 0)).toBe(
      "The cover",
    );
  });

  it("reads a trailing page-N stem as 'Page N' across prefixes", () => {
    expect(captionForImage("/samples/story-1-book/page-1.jpg", 1)).toBe(
      "Page 1",
    );
    expect(captionForImage("/samples/story-1-book/page-12.jpg", 12)).toBe(
      "Page 12",
    );
    expect(
      captionForImage("/samples/story-9-newbaby/baby-page-2.jpg", 1),
    ).toBe("Page 2");
    expect(
      captionForImage("/samples/story-7-welcome/welcome-page-5.jpg", 5),
    ).toBe("Page 5");
    // Reads the real slot stem, not the sequential position: Story 2's second
    // sample is letter-page-5, so it labels "Page 5" at gallery index 1.
    expect(
      captionForImage("/samples/story-2-letter/letter-page-5.jpg", 1),
    ).toBe("Page 5");
  });

  it("falls back to 'Illustration {i+1}' for non-page stems", () => {
    expect(captionForImage("/samples/story-8-adventure/climax.jpg", 4)).toBe(
      "Illustration 5",
    );
  });
});
