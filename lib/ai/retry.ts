// Retry-with-backoff for the rate-limited OpenAI Images calls (Craft Area 2).
//
// The live gpt-image-2 account caps image-input requests at ~5/min. A burst of
// scene generations therefore trips a 429 ("Please try again in 12s."). This
// helper wraps a single API call so a 429 is retried with exponential backoff
// that HONORS the API's suggested wait when present; any non-429 error fails
// fast (we never silently retry a bad request, auth failure, etc.).
//
// Kept SDK-free and testable: the 429 detection reads only the shape the OpenAI
// SDK's APIError exposes (`status`, `headers`) plus the message text, via
// structural narrowing — no `import OpenAI`. The delay function is injectable so
// unit tests can drive retries without real timers, and jitter is optional so a
// test can pin the exact backoff schedule.

/** Default maximum number of retry attempts after the first try fails on 429. */
export const DEFAULT_MAX_RETRIES = 5;

/** Base backoff (ms) for the first 429 retry; doubles each subsequent attempt. */
const DEFAULT_BASE_DELAY_MS = 2000;

/** Ceiling for a single computed backoff (ms), before honoring a longer Retry-After. */
const MAX_BACKOFF_MS = 60_000;

/** Tunable options for {@link withRetry}. All optional; production uses defaults. */
export interface RetryOptions {
  /** Max retries after the initial attempt (default 5). */
  maxRetries?: number;
  /** Base delay in ms for the first backoff (default 2000). */
  baseDelayMs?: number;
  /**
   * Sleep implementation. Injectable so tests can resolve instantly and assert
   * the requested delays. Defaults to a real `setTimeout` wait.
   */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Add random jitter (0–1× the computed backoff) to spread retries. On by
   * default in production; pass `false` from tests to pin the exact schedule.
   */
  jitter?: boolean;
}

/** Real timer-based sleep (the production default). */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Whether `err` is an OpenAI 429 rate-limit error. Structural — matches the SDK's
 * `RateLimitError` (an `APIError` with `status === 429`) without importing it, so
 * the helper stays decoupled and easy to fake in tests.
 */
export function isRateLimitError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status?: unknown }).status === 429
  );
}

/**
 * The wait the server suggests for a 429, in ms, or `null` if none is given.
 * Priority: the `retry-after-ms` header, then `retry-after` (seconds), then a
 * parse of the SDK message ("Please try again in 12s." / "1.5s" / "500ms").
 */
export function suggestedRetryMs(err: unknown): number | null {
  if (typeof err !== "object" || err === null) {
    return null;
  }
  const headers = (err as { headers?: unknown }).headers;
  const headerMs = retryAfterFromHeaders(headers);
  if (headerMs !== null) {
    return headerMs;
  }
  const message = (err as { message?: unknown }).message;
  if (typeof message === "string") {
    return retryAfterFromMessage(message);
  }
  return null;
}

/** Read `retry-after-ms` / `retry-after` from a Headers-like object. */
function retryAfterFromHeaders(headers: unknown): number | null {
  const get = headerGetter(headers);
  if (!get) {
    return null;
  }
  const ms = get("retry-after-ms");
  if (ms) {
    const parsed = Number(ms);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  const seconds = get("retry-after");
  if (seconds) {
    const parsed = Number(seconds);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed * 1000;
    }
  }
  return null;
}

/** Normalize a Headers instance OR a plain record into a case-insensitive getter. */
function headerGetter(headers: unknown): ((name: string) => string | null) | null {
  if (headers && typeof (headers as Headers).get === "function") {
    const h = headers as Headers;
    return (name) => h.get(name);
  }
  if (headers && typeof headers === "object") {
    const record = headers as Record<string, unknown>;
    const lower: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string") {
        lower[key.toLowerCase()] = value;
      }
    }
    return (name) => lower[name.toLowerCase()] ?? null;
  }
  return null;
}

/** Parse a "try again in 12s" / "1.5s" / "500ms" hint out of an error message. */
function retryAfterFromMessage(message: string): number | null {
  const ms = message.match(/try again in\s+([\d.]+)\s*ms/i);
  if (ms) {
    const parsed = Number(ms[1]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  const seconds = message.match(/try again in\s+([\d.]+)\s*s/i);
  if (seconds) {
    const parsed = Number(seconds[1]);
    if (Number.isFinite(parsed)) {
      return parsed * 1000;
    }
  }
  return null;
}

/**
 * Run `fn`, retrying on a 429 with exponential backoff that honors the server's
 * suggested wait when present. Non-429 errors propagate immediately (fail fast).
 * After `maxRetries` exhausted 429s, the last error is rethrown with context.
 *
 * The cold-success path calls `fn` exactly once — retries only add calls on an
 * actual 429 — so happy-path API call counts are unchanged.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;
  const jitter = options.jitter ?? true;

  // One initial attempt plus up to `maxRetries` retries.
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      // Non-429 errors fail fast; a 429 on the final allowed attempt also gives up.
      if (!isRateLimitError(err)) {
        throw err;
      }
      if (attempt >= maxRetries) {
        throw new Error(
          `OpenAI rate limit (429) not cleared after ${maxRetries} retries. ` +
            "Reduce concurrency or wait before retrying.",
          { cause: err },
        );
      }
      await sleep(backoffDelay(err, attempt, baseDelayMs, jitter));
    }
  }
  // Unreachable: the loop either returns or throws on every path.
  throw new Error("withRetry: exhausted retries unexpectedly.");
}

/**
 * Compute the wait before the next retry: the larger of the server's suggested
 * wait and a capped exponential backoff (base * 2^attempt), plus optional jitter.
 */
function backoffDelay(
  err: unknown,
  attempt: number,
  baseDelayMs: number,
  jitter: boolean,
): number {
  const exponential = Math.min(baseDelayMs * 2 ** attempt, MAX_BACKOFF_MS);
  const suggested = suggestedRetryMs(err) ?? 0;
  const base = Math.max(exponential, suggested);
  if (!jitter) {
    return base;
  }
  // Full jitter on top of the floor: wait at least `base`, up to `base` extra.
  return base + Math.random() * base;
}

// ---------------------------------------------------------------------------
// Bounded-concurrency map — the worker pool for the Approach A/C parallel path
// ---------------------------------------------------------------------------

/**
 * Default in-flight cap for the parallel scene path, and the fallback when
 * `AI_SCENE_CONCURRENCY` is unset (see {@link resolveSceneConcurrency}).
 * Conservative on purpose: keeping only a few generations in flight (combined
 * with {@link withRetry}'s backoff) avoids a 429 storm while still overlapping
 * work. Operators on a higher tier (Tier 2's verified limit is 20 images/min)
 * can dial this up via the env var without a code change.
 */
export const DEFAULT_CONCURRENCY = 3;

/**
 * Upper bound for the env-tunable scene concurrency. Caps the in-flight burst at
 * the model's per-minute image-ceiling headroom so a fat-fingered
 * `AI_SCENE_CONCURRENCY=500` can't trigger a 429 storm. (Tier 2's verified limit
 * is 20 images/min; 16 leaves room for `withRetry`'s retried calls.)
 */
const MAX_SCENE_CONCURRENCY = 16;

/**
 * Resolve the in-flight cap for the Approach-A/C parallel scene path from the
 * environment. Reads `AI_SCENE_CONCURRENCY` (non-secret, operator-surface-only
 * runtime config — never `NEXT_PUBLIC_*`): missing / non-numeric / `< 1` falls
 * back to {@link DEFAULT_CONCURRENCY}, and anything above the ceiling clamps to
 * {@link MAX_SCENE_CONCURRENCY}. Floors fractional values (parsed via
 * `Number.parseInt`), matching `mapWithConcurrency`'s own `Math.floor` clamp.
 *
 * Pure (env is passed in, no IO) so it's unit-testable without touching
 * `process.env`.
 */
export function resolveSceneConcurrency(
  env: Record<string, string | undefined> = process.env,
): number {
  const parsed = Number.parseInt(env.AI_SCENE_CONCURRENCY ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_CONCURRENCY;
  }
  return Math.min(parsed, MAX_SCENE_CONCURRENCY);
}

/**
 * Like `Promise.all(items.map(fn))`, but never running more than `concurrency`
 * tasks at once. Results are returned in INPUT ORDER (so the manifest order is
 * preserved regardless of completion order). Each item's `fn` receives the item
 * and its original index. The first rejection rejects the whole map (matching
 * `Promise.all` semantics — a real error still fails the run).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
