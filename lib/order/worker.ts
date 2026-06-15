// The local batch worker's orchestration logic (Commerce PR-07, Phase 3a).
//
// OPERATOR-ONLY. This module imports the generation engine (lib/ai/generate) and
// the service-role Supabase client (transitively via lib/order/store +
// lib/supabase/storage), so it must NEVER be imported by the public route graph
// (the PR-03 boundary test walks the public entries' import closures — none of
// them reach here). It is invoked only by the CLI in scripts/process-orders.ts.
//
// What it does: drain `queued` orders, generate each book with the existing engine,
// and park each at `awaiting_review` (success) or `failed` (error). No manual step.
//
// Why a library module (not just inline in the script): the orchestration logic —
// the atomic claim, the queued→generating→awaiting_review transition, the failed
// path, the idempotent re-claim skip — is the testable surface per the testing
// standard. Keeping it here with INJECTABLE dependencies lets the unit tests drive
// it with mocked store/storage/engine ($0, no network, no OpenAI). The script stays
// a thin wrapper that wires the real dependencies, mirroring scripts/render-test.ts.
//
// The dependencies are injected (not imported and called directly) so the tests can
// substitute mocks at the boundary — the same idiom as withRetry's injectable
// `sleep` and mapWithConcurrency. Production callers pass `defaultWorkerDeps`.

import { promises as fs } from "node:fs";
import path from "node:path";

import { listOrdersByStatus, updateOrderStatus } from "@/lib/order/store";
import { IllegalTransitionError } from "@/lib/order/state";
import { getPhoto } from "@/lib/supabase/storage";
import { writeSession } from "@/lib/session/disk";
import { generateAllIllustrations, PRODUCTION_QUALITY } from "@/lib/ai/generate";
import { mapWithConcurrency } from "@/lib/ai/retry";
import { isSafeSessionId } from "@/lib/ai/paths";
import type { Order } from "@/lib/order/types";
import type { GeneratedImage, StorySession } from "@/lib/session/types";

/**
 * The local scratch file the worker writes the downloaded photo to lives under
 * ./uploads/[orderId]/photo.<ext>. The extension is SNIFFED from the downloaded
 * bytes (see `detectImageExtension`), NOT assumed: intake accepts jpeg/png/webp
 * (`ALLOWED_TYPES` in the order route) and PR-05's deferred uploader runs
 * `downscaleImage`, which RE-ENCODES to JPEG only when it has to shrink the photo
 * and otherwise returns the ORIGINAL bytes untouched — so a small PNG/WebP reaches
 * Supabase (and the worker) as raw PNG/WebP. The engine derives the OpenAI
 * content-type from this extension (`extensionToMime` / `photoToFile`), so writing
 * the wrong extension would label a PNG/WebP as JPEG and can fail the paid run.
 * The intake route's `inputs.pet.photo` carries only the original file NAME (a
 * required-field placeholder, see ImageUploader's deferred branch) — NOT a usable
 * local path — so the worker always rewrites `pet.photo` to the sniffed name.
 */
export type ImageExtension = "jpg" | "png" | "webp";

/**
 * Detect the real image format from the leading bytes (magic numbers), so the
 * scratch file gets the extension the bytes actually are and the engine derives the
 * correct OpenAI content-type. The three results map cleanly through the engine's
 * `extensionToMime` allowlist (jpg→jpeg, png, webp). PURE — unit-testable, no IO.
 *
 *   - JPEG: `FF D8 FF`
 *   - PNG:  `89 50 4E 47 0D 0A 1A 0A`
 *   - WebP: bytes 0-3 = "RIFF" (`52 49 46 46`) AND bytes 8-11 = "WEBP" (`57 45 42 50`)
 *
 * Unknown or too-short bytes fall back to `"jpg"`: intake already validated the
 * MIME to one of the three, so this only triggers on a corrupt/empty buffer, and
 * jpeg is a sane deterministic default that `extensionToMime` accepts.
 */
export function detectImageExtension(bytes: Buffer): ImageExtension {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "webp";
  }
  return "jpg";
}

/** Per-run roll-up the CLI prints. No PII, no secrets — just counts + ids. */
export interface BatchSummary {
  /** Orders moved queued → generating → awaiting_review. */
  succeeded: string[];
  /** Orders moved to `failed` (engine/IO error; batch continued past them). */
  failed: string[];
  /**
   * Orders skipped because the atomic claim lost the race (already no longer
   * `queued` — another worker run claimed/processed it). Not a failure.
   */
  skipped: string[];
}

/**
 * The dependency surface the worker logic calls, injected so unit tests can mock
 * each at the boundary ($0, offline). Production wires `defaultWorkerDeps`.
 */
export interface WorkerDeps {
  /** List orders in a status, oldest first (the drain query). */
  listOrdersByStatus: typeof listOrdersByStatus;
  /** Move an order to a new status (enforces the state machine; stores `error`). */
  updateOrderStatus: typeof updateOrderStatus;
  /** Download the order's photo bytes from Supabase Storage. */
  getPhoto: typeof getPhoto;
  /** Write the engine session + manifest to ./sessions/[id].json (for PR-08). */
  writeSession: typeof writeSession;
  /** Generate the full book's illustrations (the engine; defaults to Low tier). */
  generateAllIllustrations: typeof generateAllIllustrations;
  /** Write the downloaded photo bytes to local scratch under ./uploads/[id]/. */
  writePhotoToScratch: (
    orderId: string,
    bytes: Buffer,
    ext: ImageExtension,
  ) => Promise<string>;
}

/** Production dependencies — the real store/storage/engine/disk functions. */
export const defaultWorkerDeps: WorkerDeps = {
  listOrdersByStatus,
  updateOrderStatus,
  getPhoto,
  writeSession,
  generateAllIllustrations,
  writePhotoToScratch,
};

/**
 * The path (relative to cwd, INCLUDING the `uploads/` segment) that the engine
 * resolves the photo from. The engine reads
 * `resolveUnder(process.cwd(), "uploads", session.pet.photo)`, which does
 * `path.resolve(cwd, session.pet.photo)` and requires the result to stay under
 * `cwd/uploads`. So the value MUST carry the `uploads/` prefix:
 * `"uploads/<orderId>/photo.png"` → `cwd/uploads/<orderId>/photo.png` (accepted).
 * Without the prefix, `path.resolve(cwd, "<orderId>/photo.png")` =
 * `cwd/<orderId>/photo.png` is OUTSIDE `cwd/uploads` → `resolveUnder` returns null
 * and the engine throws. This matches the operator upload route's `pet.photo`
 * contract (`path.join("uploads", sessionId, "photo.ext")`). The extension is the
 * sniffed image format so the engine derives the matching content-type. PURE
 * (string only), so the path reconciliation is unit-testable without fs.
 */
export function scratchPhotoRelPath(orderId: string, ext: ImageExtension): string {
  return `uploads/${orderId}/photo.${ext}`;
}

/**
 * Build the engine session for an order: the captured `inputs` with `id` set to the
 * orderId (a UUID — satisfies `isSafeSessionId`) and `pet.photo` REWRITTEN to the
 * relative scratch path the engine resolves under ./uploads, using `ext` (the
 * sniffed image format) so the engine derives the correct OpenAI content-type. The
 * intake-stored `pet.photo` (a bare file name) is never a usable engine path, so
 * this rewrite is the load-bearing reconciliation. PURE (no IO) so it is
 * unit-testable; throws if the orderId is not a safe session id (the engine would
 * reject it anyway).
 *
 * Typed `StorySession` to match the disk layer's `readSession` contract: a
 * Story-2 session is a structural superset on the fields the engine's pre-dispatch
 * code touches (id/pet), and `generateAllIllustrations` dispatches on `storyType`
 * internally — the exact pattern the operator generate route already relies on.
 */
export function buildEngineSession(order: Order, ext: ImageExtension): StorySession {
  if (!isSafeSessionId(order.id)) {
    throw new Error(`Unsafe order id for engine session: ${order.id}`);
  }
  // The captured inputs are StorySession | Story2Session; both carry `id` + `pet`.
  // We rewrite only those two reconciliation fields and keep everything else.
  const inputs = order.inputs as StorySession;
  return {
    ...inputs,
    id: order.id,
    pet: { ...inputs.pet, photo: scratchPhotoRelPath(order.id, ext) },
  };
}

/** Absolute scratch path ./uploads/[orderId]/photo.<ext> for a given order. */
function scratchPhotoAbsPath(orderId: string, ext: ImageExtension): string {
  return path.join(process.cwd(), "uploads", orderId, `photo.${ext}`);
}

/**
 * Write the downloaded photo bytes to local scratch under ./uploads/[orderId]/,
 * creating the directory. The `ext` (sniffed by the caller) decides the file's
 * extension so the engine derives the matching content-type. Returns the absolute
 * path written (for logging). The orderId is a validated UUID-shaped string by the
 * time the worker reaches here (it claimed the order, and the store validates the
 * id on read), so it is a single safe path segment — `path.join` keeps it
 * contained under ./uploads.
 */
export async function writePhotoToScratch(
  orderId: string,
  bytes: Buffer,
  ext: ImageExtension,
): Promise<string> {
  const dest = scratchPhotoAbsPath(orderId, ext);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, bytes);
  return dest;
}

/**
 * The outcome of processing one order — drives the batch summary.
 *   - "succeeded": claimed and generated, now `awaiting_review`.
 *   - "failed":    claimed, but generation/IO threw → moved to `failed` + message.
 *   - "skipped":   the atomic claim lost the race (no longer `queued`) → left alone.
 */
export type OrderOutcome = "succeeded" | "failed" | "skipped";

/**
 * Process a single order end to end.
 *
 * 1. CLAIM it (`queued → generating`) BEFORE any heavy await (the photo download +
 *    generation) — the feature-09 TOCTOU lesson. `updateOrderStatus` asserts the
 *    transition before the DB write, so if the order is no longer `queued` by claim
 *    time, the claim throws `IllegalTransitionError` and we SKIP (not fail) — no
 *    double-generation, no spend. Generation only ever runs for an order we
 *    successfully claimed, so an unpaid/unqueued order is never generated.
 *
 *    Serialization note: `processQueuedOrders` defaults to processing ONE order at
 *    a time (concurrency 1), so two `processOrder` calls in the SAME process never
 *    interleave at the claim's `getOrder`-then-`UPDATE` window — the single-process
 *    risk the feature-09 lesson is about (double-mount / double-click / two tabs).
 *    `updateOrderStatus` issues `UPDATE … WHERE id = ?` (no status guard in the
 *    WHERE), so it is NOT a DB-level compare-and-swap; two SEPARATE OS processes
 *    racing the same row could both read `queued` and both write `generating`.
 *    That is out of the threat model here — the roadmap runs this as a batch
 *    command once or twice a day, not concurrently — and closing it would require a
 *    conditional `.eq("status","queued")` update in the store (a store change this
 *    PR's scope excludes). Flagged for the operator: don't run two `process:orders`
 *    against the same Supabase at once.
 * 2. Reconcile the photo: download from Supabase → local scratch ./uploads/[id]/
 *    (extension sniffed from the bytes so the engine gets the right content-type),
 *    and build the engine session whose `pet.photo` points at that scratch path.
 * 3. Run the engine at the locked MIXED production tier (PRODUCTION_QUALITY: HIGH
 *    hero slots + MEDIUM interiors + LOW reference, ~$1/book) — passed explicitly,
 *    since the engine default stays LOW for dev/iteration. A never-failed order
 *    generates exactly once; the per-page cache only saves a re-run when the engine
 *    sees a populated manifest, which the worker does NOT feed back into
 *    `order.inputs` — so an explicit `failed → queued` retry currently re-spends the
 *    full book (~$1). Acceptable for this PR (operator-initiated, low-frequency);
 *    improving retry cache reuse is a follow-up that belongs with the reject/retry flow.
 * 4. Persist the session + manifest to ./sessions/[id].json (the PR-08 admin reads
 *    the local book by id from there — the canonical source; no Supabase churn).
 *    The manifest is NOT written back to `order.inputs`, which is why a retry can't
 *    reuse the cache (see step 3).
 * 5. On success → `awaiting_review`. On any error AFTER the claim → `failed` with
 *    the message stored on the order (recoverable via the `failed → queued` retry).
 *
 * A thrown error here would only escape if even the `failed` write fails; the batch
 * loop isolates each order so one bad order never aborts the rest.
 */
export async function processOrder(
  order: Order,
  deps: WorkerDeps,
  log: (message: string) => void,
): Promise<OrderOutcome> {
  // --- 1. Atomic claim (before any heavy await) --------------------------------
  try {
    await deps.updateOrderStatus(order.id, "generating");
  } catch (err) {
    if (err instanceof IllegalTransitionError) {
      // Lost the claim race — another run already took this order. Skip, don't fail.
      log(`skip ${order.id}: already claimed (${err.from} → generating not legal)`);
      return "skipped";
    }
    // A real claim failure (e.g. DB error) — surface it; the batch loop catches it
    // and counts it as failed (we couldn't claim, so there's nothing to roll back).
    throw err;
  }

  // From here the order is OURS (status `generating`). Any failure routes to
  // `failed` so the order is recoverable and the batch continues.
  try {
    // --- 2. Reconcile the Supabase photo into local engine input ---------------
    // getPhoto returns bare bytes (no content-type), so sniff the real format from
    // the magic numbers ONCE and thread the extension to both the scratch write and
    // the engine session — so the file on disk and the path the engine resolves
    // agree, and the engine labels the OpenAI request with the correct content-type.
    const photoBytes = await deps.getPhoto(order.id);
    const ext = detectImageExtension(photoBytes);
    const scratchPath = await deps.writePhotoToScratch(order.id, photoBytes, ext);
    log(`order ${order.id}: photo (${ext}) → ${scratchPath}`);

    const session = buildEngineSession(order, ext);

    // --- 3. Generate the book (the locked mixed production tier) ----------------
    // Production runs the mixed-tier policy explicitly (PRODUCTION_QUALITY): HIGH for
    // hero slots (cover + emotional bookends), MEDIUM for interiors, LOW for the
    // never-printed reference anchor (~$1/book vs ~$3 all-HIGH). The engine DEFAULT
    // stays LOW for dev/prototype iteration — production opts in here, the one place
    // the policy is applied for a full book. generateAllIllustrations respects the
    // rate limit via its internal bounded worker pool + withRetry backoff. The engine
    // caches per page, but the worker only re-reaches generation for a COMPLETED order
    // via an explicit `failed → queued` retry, which currently re-spends the full book
    // (see the processOrder docblock); a never-failed order is generated exactly once.
    const manifest: GeneratedImage[] = await deps.generateAllIllustrations(
      session,
      PRODUCTION_QUALITY,
    );

    // --- 4. Persist session + manifest for the PR-08 admin ---------------------
    // The admin reads the local book by id from ./sessions/[id].json (same as the
    // local engine flow). The page PNGs stay in ./generated/[id]/ — only the final
    // approved PDF is uploaded later (PR-08/09); no Supabase storage churn here.
    await deps.writeSession({ ...session, status: "ready", images: manifest });

    // --- 5. Success → awaiting_review ------------------------------------------
    await deps.updateOrderStatus(order.id, "awaiting_review");
    log(`done ${order.id}: ${manifest.length} illustrations → awaiting_review`);
    return "succeeded";
  } catch (err) {
    // Record the failure on the order (recoverable via failed → queued). Store only
    // the message string — never a full error object that might echo a key.
    const message = err instanceof Error ? err.message : String(err);
    log(`fail ${order.id}: ${message}`);
    await deps.updateOrderStatus(order.id, "failed", { error: message });
    return "failed";
  }
}

/**
 * The in-flight ORDER cap for the batch. Fixed at 1 (one book at a time), routed
 * through `mapWithConcurrency` to reuse the existing bounded-concurrency primitive
 * rather than invent a new one. Why exactly 1: a single book is ALREADY ~14 image
 * calls that `generateAllIllustrations` runs through its own DEFAULT_CONCURRENCY
 * worker pool, which alone saturates the live ~5 image-input/min ceiling. Running
 * two books at once would multiply that into a 429 storm — so serialising at the
 * order level is what keeps the whole batch under the rate limit. It also serialises
 * the claims within this process, so two `processOrder` calls never interleave at
 * the claim window (see processOrder's serialization note).
 */
const ORDER_CONCURRENCY = 1;

/**
 * Drain every `queued` order: claim, generate, and park each at `awaiting_review`
 * or `failed`, ONE AT A TIME (see {@link ORDER_CONCURRENCY}), via
 * `mapWithConcurrency`. Each order's work is isolated in `processOrder`'s try/catch
 * so a single order's failure never crashes the batch. Returns the summary the CLI
 * prints.
 *
 * @param deps Injected dependencies (production: `defaultWorkerDeps`).
 * @param log  Where to write progress lines (default: console.log).
 */
export async function processQueuedOrders(
  deps: WorkerDeps = defaultWorkerDeps,
  log: (message: string) => void = (m) => console.log(m),
): Promise<BatchSummary> {
  const queued = await deps.listOrdersByStatus("queued");
  const summary: BatchSummary = { succeeded: [], failed: [], skipped: [] };

  if (queued.length === 0) {
    log("No queued orders to process.");
    return summary;
  }

  log(`Processing ${queued.length} queued order(s)…`);

  const outcomes = await mapWithConcurrency(
    queued,
    ORDER_CONCURRENCY,
    async (order) => {
      // Isolate each order so one bad order never aborts the batch. The only error
      // that escapes processOrder is a non-IllegalTransition CLAIM failure (e.g. a
      // transient DB error) — the order stays `queued` (naturally retried next run);
      // we count it "failed" here only so the run's summary + exit code flag it.
      try {
        return await processOrder(order, deps, log);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`fail ${order.id}: could not claim/process (order left queued) — ${message}`);
        return "failed" as OrderOutcome;
      }
    },
  );

  outcomes.forEach((outcome, i) => {
    summary[outcome].push(queued[i].id);
  });

  return summary;
}
