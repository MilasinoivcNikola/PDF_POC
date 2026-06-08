import { describe, it, expect, vi } from "vitest";

import {
  withRetry,
  mapWithConcurrency,
  isRateLimitError,
  suggestedRetryMs,
  DEFAULT_MAX_RETRIES,
  DEFAULT_CONCURRENCY,
} from "./retry";

// Retry/backoff and bounded-concurrency logic for the rate-limited Images calls
// (the Milestone-3 QA bug: a parallel burst trips the live ~5 image-input/min
// limit and the whole run 429s). All tests use a FAKE call function + injected
// sleep — no real SDK, no real timers, no credits.

/**
 * Build a fake OpenAI-style 429 error: an object with `status: 429`, an optional
 * Retry-After header, and a message. Mirrors the SDK's APIError shape closely
 * enough for the structural narrowing in retry.ts.
 */
function rateLimitError(opts: { message?: string; headers?: Record<string, string> } = {}) {
  return {
    status: 429,
    message: opts.message ?? "Rate limit reached for gpt-image-2-2026-04-21",
    headers: opts.headers,
  };
}

/** A sleep stub that records every requested delay and resolves instantly. */
function recordingSleep() {
  const delays: number[] = [];
  const sleep = vi.fn(async (ms: number) => {
    delays.push(ms);
  });
  return { sleep, delays };
}

// ---------------------------------------------------------------------------
// isRateLimitError — structural 429 detection
// ---------------------------------------------------------------------------

describe("isRateLimitError", () => {
  it("is true for a 429-status error object", () => {
    expect(isRateLimitError(rateLimitError())).toBe(true);
  });

  it("is false for other statuses and non-objects", () => {
    expect(isRateLimitError({ status: 500 })).toBe(false);
    expect(isRateLimitError({ status: 400 })).toBe(false);
    expect(isRateLimitError(new Error("boom"))).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError("429")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// suggestedRetryMs — Retry-After header / message parsing
// ---------------------------------------------------------------------------

describe("suggestedRetryMs", () => {
  it("reads retry-after-ms from a plain headers record", () => {
    expect(suggestedRetryMs(rateLimitError({ headers: { "retry-after-ms": "1500" } }))).toBe(1500);
  });

  it("reads retry-after (seconds) and converts to ms", () => {
    expect(suggestedRetryMs(rateLimitError({ headers: { "retry-after": "12" } }))).toBe(12000);
  });

  it("reads from a Headers-like object via .get()", () => {
    const headers = new Headers({ "retry-after": "3" });
    expect(suggestedRetryMs({ status: 429, headers })).toBe(3000);
  });

  it("parses '...try again in 12s.' out of the message", () => {
    expect(
      suggestedRetryMs(rateLimitError({ message: "Limit 5, Used 5. Please try again in 12s." })),
    ).toBe(12000);
  });

  it("parses a millisecond hint out of the message", () => {
    expect(suggestedRetryMs(rateLimitError({ message: "Please try again in 500ms." }))).toBe(500);
  });

  it("returns null when no hint is present", () => {
    expect(suggestedRetryMs(rateLimitError({ message: "no hint here" }))).toBeNull();
    expect(suggestedRetryMs(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// withRetry — retry-on-429, fail-fast otherwise, honor the cap
// ---------------------------------------------------------------------------

describe("withRetry", () => {
  it("returns immediately on success without sleeping (one call, no retries)", async () => {
    const { sleep, delays } = recordingSleep();
    const fn = vi.fn(async () => "ok");

    const result = await withRetry(fn, { sleep, jitter: false });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(delays).toHaveLength(0);
  });

  it("retries a 429 then succeeds (call count = failures + 1)", async () => {
    const { sleep, delays } = recordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError())
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValue("done");

    const result = await withRetry(fn, { sleep, jitter: false });

    expect(result).toBe("done");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(delays).toHaveLength(2); // one sleep before each retry
  });

  it("honors the server's suggested wait when it exceeds the backoff floor", async () => {
    const { sleep, delays } = recordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError({ message: "Please try again in 12s." }))
      .mockResolvedValue("done");

    await withRetry(fn, { sleep, jitter: false, baseDelayMs: 1000 });

    // First retry backoff floor is baseDelayMs * 2^0 = 1000ms, but the server
    // suggested 12000ms — the larger wins.
    expect(delays[0]).toBe(12000);
  });

  it("uses exponential backoff when no suggested wait is present", async () => {
    const { sleep, delays } = recordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError({ message: "no hint" }))
      .mockRejectedValueOnce(rateLimitError({ message: "no hint" }))
      .mockResolvedValue("done");

    await withRetry(fn, { sleep, jitter: false, baseDelayMs: 1000 });

    // attempt 0 → 1000 * 2^0 = 1000; attempt 1 → 1000 * 2^1 = 2000.
    expect(delays).toEqual([1000, 2000]);
  });

  it("does NOT retry a non-429 error — fails fast", async () => {
    const { sleep } = recordingSleep();
    const fn = vi.fn().mockRejectedValue({ status: 400, message: "bad request" });

    await expect(withRetry(fn, { sleep, jitter: false })).rejects.toMatchObject({
      status: 400,
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("gives up after maxRetries 429s and throws a clear error", async () => {
    const { sleep } = recordingSleep();
    const fn = vi.fn().mockRejectedValue(rateLimitError());

    await expect(withRetry(fn, { sleep, jitter: false, maxRetries: 3 })).rejects.toThrow(
      /rate limit .*not cleared after 3 retries/i,
    );
    // initial attempt + 3 retries = 4 calls.
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("defaults to DEFAULT_MAX_RETRIES retries", async () => {
    const { sleep } = recordingSleep();
    const fn = vi.fn().mockRejectedValue(rateLimitError());

    await expect(withRetry(fn, { sleep, jitter: false })).rejects.toThrow(/not cleared/i);
    expect(fn).toHaveBeenCalledTimes(DEFAULT_MAX_RETRIES + 1);
  });
});

// ---------------------------------------------------------------------------
// mapWithConcurrency — respects the cap, runs all items, preserves order
// ---------------------------------------------------------------------------

describe("mapWithConcurrency", () => {
  it("runs every item and returns results in input order", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapWithConcurrency(items, 2, async (n) => n * 10);
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });

  it("never exceeds the concurrency cap", async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);

    await mapWithConcurrency(items, DEFAULT_CONCURRENCY, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      // Yield so other workers can start before this one finishes.
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return n;
    });

    expect(peak).toBeLessThanOrEqual(DEFAULT_CONCURRENCY);
    expect(peak).toBeGreaterThan(1); // it actually parallelized
  });

  it("propagates the first rejection (Promise.all semantics)", async () => {
    const items = [1, 2, 3];
    await expect(
      mapWithConcurrency(items, 2, async (n) => {
        if (n === 2) {
          throw new Error("item 2 failed");
        }
        return n;
      }),
    ).rejects.toThrow(/item 2 failed/);
  });

  it("handles an empty input set", async () => {
    const results = await mapWithConcurrency([], 3, async (n) => n);
    expect(results).toEqual([]);
  });
});
