import { describe, it, expect } from "vitest";
import { formatPriceUsd } from "./price";

describe("formatPriceUsd", () => {
  it("renders whole dollars without trailing cents", () => {
    expect(formatPriceUsd(2900)).toBe("$29");
    expect(formatPriceUsd(1900)).toBe("$19");
    expect(formatPriceUsd(100)).toBe("$1");
  });

  it("renders amounts with cents to two decimals", () => {
    expect(formatPriceUsd(2950)).toBe("$29.50");
    expect(formatPriceUsd(2999)).toBe("$29.99");
    expect(formatPriceUsd(105)).toBe("$1.05");
  });

  it("handles zero", () => {
    expect(formatPriceUsd(0)).toBe("$0");
  });

  it("rounds fractional cents and clamps negatives", () => {
    expect(formatPriceUsd(2900.4)).toBe("$29");
    expect(formatPriceUsd(-500)).toBe("$0");
  });

  it("formats the live catalog placeholder price cleanly", () => {
    // Both products are PLACEHOLDER 2900 ($29) today (see products.ts).
    expect(formatPriceUsd(2900)).toBe("$29");
  });
});
