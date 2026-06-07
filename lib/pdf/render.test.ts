import { describe, it, expect } from "vitest";

import { storyPdfFilename } from "@/lib/pdf/render";

// `storyPdfFilename` is the one pure, fast-to-test surface in the renderer: it
// turns a pet name into the master template's exact output-file convention,
// `Saying-Goodbye-to-[PET_NAME].pdf`, with the pet name slugified to a single
// filesystem-safe path segment. The PDF byte generation itself (Puppeteer) is
// deliberately NOT unit-tested here — it's slow and binary, and is verified by
// the milestone-1 qa/manual check (page count, sizing, fonts, page breaks).

describe("storyPdfFilename", () => {
  it("follows the master template's Saying-Goodbye-to-[PET_NAME].pdf convention", () => {
    expect(storyPdfFilename("Otis")).toBe("Saying-Goodbye-to-Otis.pdf");
  });

  it("preserves a multi-word name as hyphen-joined segments", () => {
    expect(storyPdfFilename("Mr Biscuit")).toBe(
      "Saying-Goodbye-to-Mr-Biscuit.pdf",
    );
  });

  it("collapses runs of whitespace/punctuation into a single hyphen", () => {
    expect(storyPdfFilename("Sir  Barks --  a-lot")).toBe(
      "Saying-Goodbye-to-Sir-Barks-a-lot.pdf",
    );
  });

  it("folds diacritics to ASCII so the result is a safe path segment", () => {
    expect(storyPdfFilename("Renée")).toBe("Saying-Goodbye-to-Renee.pdf");
  });

  it("strips path separators so the name can never escape the segment", () => {
    expect(storyPdfFilename("../../etc/passwd")).toBe(
      "Saying-Goodbye-to-etc-passwd.pdf",
    );
  });

  it("trims leading and trailing hyphens from a symbol-padded name", () => {
    expect(storyPdfFilename("  *Otis*  ")).toBe("Saying-Goodbye-to-Otis.pdf");
  });

  it("falls back to 'Pet' for an empty name so a filename is always produced", () => {
    expect(storyPdfFilename("")).toBe("Saying-Goodbye-to-Pet.pdf");
  });

  it("falls back to 'Pet' for a symbol-only name with no usable characters", () => {
    expect(storyPdfFilename("✦✦✦")).toBe("Saying-Goodbye-to-Pet.pdf");
  });
});
