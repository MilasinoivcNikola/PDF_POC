import path from "node:path";

import { describe, it, expect, vi } from "vitest";

import {
  buildEngineSession,
  detectImageExtension,
  scratchPhotoRelPath,
  processOrder,
  processQueuedOrders,
  type WorkerDeps,
} from "./worker";
import { assertTransition } from "./state";
import { PRODUCTION_QUALITY } from "@/lib/ai/generate";
import { resolveUnder } from "@/lib/ai/paths";
import type { Order, OrderStatus } from "./types";
import type { GeneratedImage, StorySession, Story2Session } from "@/lib/session/types";

// The worker's orchestration logic is tested with INJECTED dependencies — the
// store, Supabase Storage, the engine, and the disk writer are all mocked at the
// boundary, so the suite makes NO network/OpenAI call and writes NO file ($0,
// fully offline). This follows the repo idiom of mocking the engine/IO rather than
// invoking it (lib/ai/generate*.test.ts mock `openai`; the store tests mock the
// Supabase client). The point here is the LOGIC the worker owns:
//   - the atomic claim (queued → generating) before any heavy await
//   - success → awaiting_review with the manifest persisted
//   - the failed path → failed + stored message, batch continues past it
//   - the idempotent re-claim skip (IllegalTransitionError → skipped, not failed,
//     and NO generation call)

const SAMPLE_INPUTS: StorySession = {
  id: "intake-session-id",
  createdAt: "2026-06-11T00:00:00.000Z",
  status: "generating",
  storyType: "story-1",
  pet: {
    name: "Otis",
    species: "dog",
    breedColor: "brown rescue mutt with floppy ears",
    pronoun: "he",
    illustrationStyle: "watercolor",
    // The intake-stored photo is just the original file NAME — not a usable engine
    // path. The worker must rewrite this to the scratch path.
    photo: "otis-by-the-window.jpg",
  },
  child: { name: "Emma", ageBracket: "6-8" },
  memories: {
    favoriteActivity: "chasing tennis balls in the backyard",
    sleepingSpot: "at the foot of the bed",
    favoriteMemory: "the day at the lake",
  },
  toggles: {
    deathType: "natural",
    beliefFrame: "rainbow-bridge",
    otherPetsInHome: "no",
  },
  images: [],
};

const ORDER_ID = "11111111-1111-1111-1111-111111111111";

function orderWith(overrides: Partial<Order> = {}): Order {
  return {
    id: ORDER_ID,
    productId: "story-1-book",
    storyType: "story-1",
    status: "queued",
    customerEmail: "buyer@example.com",
    inputs: SAMPLE_INPUTS,
    photoKey: `${ORDER_ID}/photo`,
    createdAt: "2026-06-11T00:00:00.000Z",
    updatedAt: "2026-06-11T00:00:00.000Z",
    ...overrides,
  };
}

const MANIFEST: GeneratedImage[] = [
  { page: "reference", path: "/x/reference.png", promptHash: "p", referenceHash: "r" },
  { page: "cover", path: "/x/cover.png", promptHash: "p2", referenceHash: "r2" },
];

/**
 * Build a fully-mocked `WorkerDeps`. `updateOrderStatus` enforces the real state
 * machine over a tiny in-memory status so the claim/skip behavior is exercised for
 * real (an illegal move throws `IllegalTransitionError`, exactly like the store).
 */
function makeDeps(
  orders: Order[],
  overrides: Partial<WorkerDeps> = {},
): {
  deps: WorkerDeps;
  status: Map<string, OrderStatus>;
  errors: Map<string, string>;
  generate: ReturnType<typeof vi.fn>;
} {
  const status = new Map<string, OrderStatus>(orders.map((o) => [o.id, o.status]));
  const errors = new Map<string, string>();

  const generate = vi.fn(async () => MANIFEST);

  const updateOrderStatus = vi.fn(
    async (id: string, to: OrderStatus, options?: { error?: string }) => {
      const from = status.get(id);
      if (from === undefined) {
        throw new Error(`Order not found: ${id}`);
      }
      // Mirror the real store: assert the transition (throws IllegalTransitionError
      // on an illegal move) before "writing". The read-assert-write is synchronous
      // here so the claim models the DB's per-row serialization point — exactly the
      // serialization the real UPDATE provides on a single row.
      assertTransition(from, to);
      status.set(id, to);
      if (options?.error !== undefined) {
        errors.set(id, options.error);
      }
      return orderWith({ id, status: to });
    },
  );

  const deps: WorkerDeps = {
    listOrdersByStatus: vi.fn(async (s: OrderStatus) =>
      orders.filter((o) => status.get(o.id) === s),
    ),
    updateOrderStatus,
    getPhoto: vi.fn(async () => Buffer.from("photo-bytes")),
    writeSession: vi.fn(async () => undefined),
    generateAllIllustrations: generate as unknown as WorkerDeps["generateAllIllustrations"],
    writePhotoToScratch: vi.fn(
      async (id: string, _bytes: Buffer, ext: string) => `/uploads/${id}/photo.${ext}`,
    ),
    ...overrides,
  };

  return { deps, status, errors, generate };
}

const noop = () => {};

// ---------------------------------------------------------------------------
// Pure helpers — the photo reconciliation
// ---------------------------------------------------------------------------

describe("detectImageExtension", () => {
  // Build buffers that begin with each format's magic-number byte sequence.
  it("detects JPEG from FF D8 FF", () => {
    expect(detectImageExtension(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11]))).toBe(
      "jpg",
    );
  });

  it("detects PNG from the 8-byte PNG signature", () => {
    expect(
      detectImageExtension(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      ),
    ).toBe("png");
  });

  it("detects WebP from RIFF…WEBP", () => {
    // "RIFF" + 4 size bytes + "WEBP".
    const webp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // size (ignored)
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, // trailing VP8 marker bytes (ignored)
    ]);
    expect(detectImageExtension(webp)).toBe("webp");
  });

  it("falls back to jpg for unknown or too-short bytes", () => {
    expect(detectImageExtension(Buffer.from("photo-bytes"))).toBe("jpg");
    expect(detectImageExtension(Buffer.from([0xff, 0xd8]))).toBe("jpg"); // 2 bytes
    expect(detectImageExtension(Buffer.alloc(0))).toBe("jpg");
    // RIFF without the WEBP tag (e.g. a WAV) must NOT be mislabeled webp.
    expect(
      detectImageExtension(
        Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]),
      ),
    ).toBe("jpg");
  });
});

describe("scratchPhotoRelPath", () => {
  it("builds the uploads-prefixed path the engine resolves", () => {
    expect(scratchPhotoRelPath(ORDER_ID, "jpg")).toBe(`uploads/${ORDER_ID}/photo.jpg`);
  });

  it("uses the sniffed extension (png) in the path", () => {
    expect(scratchPhotoRelPath(ORDER_ID, "png")).toBe(`uploads/${ORDER_ID}/photo.png`);
  });
});

describe("buildEngineSession", () => {
  it("rewrites pet.photo to the scratch path and sets id to the orderId", () => {
    const session = buildEngineSession(orderWith(), "jpg");
    expect(session.id).toBe(ORDER_ID);
    expect(session.pet.photo).toBe(`uploads/${ORDER_ID}/photo.jpg`);
    // Everything else is carried verbatim.
    expect(session.pet.name).toBe("Otis");
    expect(session.child.name).toBe("Emma");
    expect(session.storyType).toBe("story-1");
  });

  it("uses the sniffed extension in pet.photo (png)", () => {
    const session = buildEngineSession(orderWith(), "png");
    expect(session.pet.photo).toBe(`uploads/${ORDER_ID}/photo.png`);
  });

  it("does not mutate the order's inputs (returns a fresh object)", () => {
    const order = orderWith();
    buildEngineSession(order, "jpg");
    expect(order.inputs.pet.photo).toBe("otis-by-the-window.jpg");
    expect((order.inputs as StorySession).id).toBe("intake-session-id");
  });

  it("rejects an unsafe order id", () => {
    expect(() =>
      buildEngineSession(orderWith({ id: "../../etc/passwd" }), "jpg"),
    ).toThrow(/unsafe order id/i);
  });

  it("handles a Story-2 order as a structural superset (preserves storyType, rewrites photo)", () => {
    // buildEngineSession is typed StorySession but treats Story2Session as a
    // structural superset on the fields it touches (id/pet) — the same dispatch
    // pattern the operator generate route uses. A Story-2 order must round-trip
    // with storyType preserved (generateAllIllustrations dispatches on it) and the
    // intake photo NAME rewritten to the scratch path, with nothing mutated.
    const story2Inputs: Story2Session = {
      id: "intake-story2-id",
      createdAt: "2026-06-11T00:00:00.000Z",
      status: "generating",
      storyType: "story-2",
      pet: {
        name: "Murphy",
        species: "dog",
        breedColor: "rescue mutt with the lopsided grin",
        pronoun: "he",
        illustrationStyle: "watercolor",
        photo: "murphy-by-the-door.jpg",
      },
      owner: { names: "Sarah", relationship: "single" },
      memories: {
        quirks: "the way you tilted your head when I said your name",
        favoriteRitual: "our walk before coffee, every morning",
        favoriteSpots: "the spot by the back door where the sun hit at 4pm",
      },
      toggles: {
        deathType: "peaceful",
        beliefFrame: "rainbow-bridge",
        giftFor: "self",
        newPet: "no",
      },
      images: [],
    };
    const order = orderWith({
      storyType: "story-2",
      productId: "story-2-letter",
      inputs: story2Inputs,
    });

    const session = buildEngineSession(order, "jpg");
    expect(session.id).toBe(ORDER_ID);
    expect(session.pet.photo).toBe(`uploads/${ORDER_ID}/photo.jpg`);
    // storyType is carried verbatim — the engine dispatches the 2-slot letter run on it.
    expect(session.storyType).toBe("story-2");
    expect(session.pet.name).toBe("Murphy");
    // The captured inputs are not mutated.
    expect((order.inputs as Story2Session).pet.photo).toBe("murphy-by-the-door.jpg");
    expect((order.inputs as Story2Session).id).toBe("intake-story2-id");
  });
});

// ---------------------------------------------------------------------------
// Engine-contract cross-check — the regression guard
// ---------------------------------------------------------------------------

describe("buildEngineSession output satisfies the engine's photo guard", () => {
  // This is the assertion that would have caught the missing `uploads/` prefix:
  // the prior unit tests asserted what the function RETURNS, not what the engine
  // REQUIRES, so they stayed green while the integration was broken. The engine
  // resolves the photo with `resolveUnder(process.cwd(), "uploads", pet.photo)`
  // (lib/ai/generate.ts) and throws when that returns null. Cross-check the
  // worker's actual output against that real, pure guard so the two contracts
  // can't silently drift again. Pure + $0 — resolveUnder does no IO.
  it.each(["jpg", "png", "webp"] as const)(
    "the engine WILL accept the rewritten pet.photo (ext=%s)",
    (ext) => {
      const session = buildEngineSession(orderWith(), ext);
      const resolved = resolveUnder(
        process.cwd(),
        "uploads",
        session.pet.photo,
      );
      // Non-null means resolveUnder kept the path strictly inside ./uploads —
      // i.e. the engine would NOT throw "Pet photo path is outside ./uploads".
      expect(resolved).not.toBeNull();
      // And it resolves to the order's own scratch file under ./uploads.
      expect(resolved).toBe(
        path.join(process.cwd(), "uploads", ORDER_ID, `photo.${ext}`),
      );
    },
  );
});

// ---------------------------------------------------------------------------
// processOrder — claim, generate, transitions
// ---------------------------------------------------------------------------

describe("processOrder", () => {
  it("claims a queued order (→ generating) BEFORE the first heavy await", async () => {
    const order = orderWith();
    const { deps, status, generate } = makeDeps([order]);

    // getPhoto is the first heavy await; it reads the shared status map, which must
    // already show "generating" (the claim happened synchronously before it).
    let statusAtFirstAwait: OrderStatus | undefined;
    const realGetPhoto = deps.getPhoto;
    deps.getPhoto = vi.fn(async (id: string) => {
      statusAtFirstAwait = status.get(id);
      return realGetPhoto(id);
    });

    await processOrder(order, deps, noop);

    // First updateOrderStatus call was the claim to "generating".
    expect(
      (deps.updateOrderStatus as ReturnType<typeof vi.fn>).mock.calls[0],
    ).toEqual([ORDER_ID, "generating"]);
    expect(statusAtFirstAwait).toBe("generating");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("on success → awaiting_review, generates exactly once, persists the manifest", async () => {
    const order = orderWith();
    const { deps, status, generate } = makeDeps([order]);

    const outcome = await processOrder(order, deps, noop);

    expect(outcome).toBe("succeeded");
    expect(status.get(ORDER_ID)).toBe("awaiting_review");
    expect(generate).toHaveBeenCalledTimes(1);
    // The engine was handed a session with the rewritten scratch photo path.
    const handed = generate.mock.calls[0][0] as StorySession;
    expect(handed.id).toBe(ORDER_ID);
    expect(handed.pet.photo).toBe(`uploads/${ORDER_ID}/photo.jpg`);
    // The session + manifest were written to ./sessions (for the PR-08 admin).
    expect(deps.writeSession).toHaveBeenCalledTimes(1);
    const written = (deps.writeSession as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as StorySession;
    expect(written.id).toBe(ORDER_ID);
    expect(written.status).toBe("ready");
    expect(written.images).toEqual(MANIFEST);
  });

  it("generates at the locked mixed production tier (medium / high / low), not bare", async () => {
    // The worker must opt the full-book run into PRODUCTION_QUALITY explicitly — the
    // engine default is LOW (dev/iteration). This is the one call that pays for the
    // mixed HIGH-hero / MEDIUM-interior / LOW-reference policy.
    const order = orderWith();
    const { deps, generate } = makeDeps([order]);

    await processOrder(order, deps, noop);

    expect(generate).toHaveBeenCalledTimes(1);
    const passedOptions = generate.mock.calls[0][1];
    expect(passedOptions).toEqual(PRODUCTION_QUALITY);
    expect(passedOptions).toMatchObject({
      sceneQuality: "medium",
      heroSceneQuality: "high",
      referenceQuality: "low",
    });
  });

  it("downloads the photo to scratch before generating", async () => {
    const order = orderWith();
    const { deps } = makeDeps([order]);

    await processOrder(order, deps, noop);

    expect(deps.getPhoto).toHaveBeenCalledWith(ORDER_ID);
    // The default mocked getPhoto returns non-magic bytes → the "jpg" fallback.
    expect(deps.writePhotoToScratch).toHaveBeenCalledWith(
      ORDER_ID,
      expect.any(Buffer),
      "jpg",
    );
  });

  it("sniffs PNG-magic bytes and hands the engine a .png scratch path", async () => {
    // A small PNG passes through intake's downscaler untouched (no JPEG re-encode),
    // so the worker downloads raw PNG bytes. The extension must be sniffed as "png"
    // so the engine derives image/png, not image/jpeg.
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01,
    ]);
    const order = orderWith();
    const { deps, generate } = makeDeps([order], {
      getPhoto: vi.fn(async () => pngBytes),
    });

    const outcome = await processOrder(order, deps, noop);

    expect(outcome).toBe("succeeded");
    expect(deps.writePhotoToScratch).toHaveBeenCalledWith(
      ORDER_ID,
      pngBytes,
      "png",
    );
    const handed = generate.mock.calls[0][0] as StorySession;
    expect(handed.pet.photo).toBe(`uploads/${ORDER_ID}/photo.png`);
  });

  it("on engine error → failed with the message stored, generation attempted once", async () => {
    const order = orderWith();
    const { deps, status, errors } = makeDeps([order], {
      generateAllIllustrations: vi
        .fn()
        .mockRejectedValue(
          new Error("OpenAI rate limit (429) not cleared after 5 retries."),
        ) as unknown as WorkerDeps["generateAllIllustrations"],
    });

    const outcome = await processOrder(order, deps, noop);

    expect(outcome).toBe("failed");
    expect(status.get(ORDER_ID)).toBe("failed");
    expect(errors.get(ORDER_ID)).toMatch(/rate limit/i);
    // No session written on a failed run.
    expect(deps.writeSession).not.toHaveBeenCalled();
  });

  it("on a photo-download error → failed before any generation", async () => {
    const order = orderWith();
    const { deps, status, errors, generate } = makeDeps([order], {
      getPhoto: vi.fn().mockRejectedValue(new Error("download failed")),
    });

    const outcome = await processOrder(order, deps, noop);

    expect(outcome).toBe("failed");
    expect(status.get(ORDER_ID)).toBe("failed");
    expect(errors.get(ORDER_ID)).toBe("download failed");
    expect(generate).not.toHaveBeenCalled();
  });

  it("skips an order that is no longer queued (lost claim race) — no generation, not failed", async () => {
    // The order is already "generating" (another run claimed it). The claim to
    // generating is now an illegal self-transition → IllegalTransitionError → skip.
    const order = orderWith({ status: "generating" });
    const { deps, status, generate } = makeDeps([order]);

    const outcome = await processOrder(order, deps, noop);

    expect(outcome).toBe("skipped");
    // Status untouched (still generating — the other run owns it).
    expect(status.get(ORDER_ID)).toBe("generating");
    // Critically: no generation call, and NOT marked failed.
    expect(generate).not.toHaveBeenCalled();
    // The only updateOrderStatus call was the rejected claim attempt.
    expect(deps.updateOrderStatus).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// processQueuedOrders — the drain + summary + isolation
// ---------------------------------------------------------------------------

describe("processQueuedOrders", () => {
  it("returns an empty summary when nothing is queued", async () => {
    const { deps } = makeDeps([]);
    const summary = await processQueuedOrders(deps, noop);
    expect(summary).toEqual({ succeeded: [], failed: [], skipped: [] });
  });

  it("processes every queued order and rolls up the outcomes", async () => {
    const ok1 = orderWith({ id: "aaaaaaaa-0000-0000-0000-000000000001" });
    const ok2 = orderWith({ id: "aaaaaaaa-0000-0000-0000-000000000002" });
    const { deps, status } = makeDeps([ok1, ok2]);

    const summary = await processQueuedOrders(deps, noop);

    expect(summary.succeeded.sort()).toEqual([ok1.id, ok2.id].sort());
    expect(summary.failed).toEqual([]);
    expect(summary.skipped).toEqual([]);
    expect(status.get(ok1.id)).toBe("awaiting_review");
    expect(status.get(ok2.id)).toBe("awaiting_review");
  });

  it("one order's failure does NOT crash the batch — the rest still process", async () => {
    const good = orderWith({ id: "aaaaaaaa-0000-0000-0000-00000000900d" });
    const bad = orderWith({ id: "bbbbbbbb-0000-0000-0000-0000000000ba0" });
    const { deps, status } = makeDeps([bad, good], {
      generateAllIllustrations: vi.fn(async (session: StorySession) => {
        if (session.id === bad.id) {
          throw new Error("boom");
        }
        return MANIFEST;
      }) as unknown as WorkerDeps["generateAllIllustrations"],
    });

    const summary = await processQueuedOrders(deps, noop);

    expect(summary.failed).toEqual([bad.id]);
    expect(summary.succeeded).toEqual([good.id]);
    expect(status.get(bad.id)).toBe("failed");
    expect(status.get(good.id)).toBe("awaiting_review");
  });

  it("a generic CLAIM failure is counted failed but the order is LEFT queued (not marked failed), batch continues", async () => {
    // Distinct from the post-claim failure above: here the very FIRST
    // updateOrderStatus (the queued → generating CLAIM) throws a GENERIC error — a
    // transient DB error, NOT an IllegalTransitionError. processOrder re-throws it,
    // and processQueuedOrders's own try/catch catches it: the order is counted in
    // summary.failed (so the run flags it + exits nonzero), but it was never moved
    // to `failed` — it stays `queued` so the next run naturally retries it.
    const good = orderWith({ id: "cccccccc-0000-0000-0000-00000000900d" });
    const bad = orderWith({ id: "dddddddd-0000-0000-0000-0000000000ba0" });
    const { deps, status, generate } = makeDeps([bad, good]);

    // Wrap the real mock: throw a generic error only on bad's CLAIM (the move to
    // generating); every other call (good's claim/transitions) delegates through.
    const realUpdate: WorkerDeps["updateOrderStatus"] = deps.updateOrderStatus;
    deps.updateOrderStatus = vi.fn(
      async (id: string, to: OrderStatus, options?: { error?: string }) => {
        if (id === bad.id && to === "generating") {
          throw new Error("transient DB error: connection reset");
        }
        return realUpdate(id, to, options);
      },
    ) as unknown as WorkerDeps["updateOrderStatus"];

    const summary = await processQueuedOrders(deps, noop);

    // Counted failed in the summary (flagged for the operator)…
    expect(summary.failed).toEqual([bad.id]);
    // …but NOT moved to `failed` — left queued for a natural retry next run.
    expect(status.get(bad.id)).toBe("queued");
    // The bad order's ONLY updateOrderStatus call was the (rejected) claim — there
    // was no second call marking it failed. The opposite of the post-claim path.
    const badCalls = (
      deps.updateOrderStatus as ReturnType<typeof vi.fn>
    ).mock.calls.filter((c) => c[0] === bad.id);
    expect(badCalls).toEqual([[bad.id, "generating"]]);
    // The rest of the batch still processed: good succeeded and was generated.
    expect(summary.succeeded).toEqual([good.id]);
    expect(status.get(good.id)).toBe("awaiting_review");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("buckets a skipped order into summary.skipped (not succeeded/failed)", async () => {
    // The skip is exercised at processOrder level elsewhere; this pins the DRAIN's
    // summary bucketing for it. The order is already `generating` (another run owns
    // it), so listOrdersByStatus returns nothing for "queued"… so we seed it as
    // `queued` for the listing but flip the in-memory status to `generating` before
    // the drain, making the claim an illegal self-transition → IllegalTransitionError
    // → skipped.
    const order = orderWith({ id: "eeeeeeee-0000-0000-0000-00000000050a0" });
    const { deps, status, generate } = makeDeps([order]);
    // Listed as queued, but already claimed by the time we claim → skip.
    deps.listOrdersByStatus = vi.fn(async () => [order]);
    status.set(order.id, "generating");

    const summary = await processQueuedOrders(deps, noop);

    expect(summary.skipped).toEqual([order.id]);
    expect(summary.succeeded).toEqual([]);
    expect(summary.failed).toEqual([]);
    // Not generated, status untouched (the owning run keeps it).
    expect(generate).not.toHaveBeenCalled();
    expect(status.get(order.id)).toBe("generating");
  });

  it("idempotent re-run: a second drain of the same orders generates nothing (already moved on)", async () => {
    const order = orderWith();
    const { deps, generate } = makeDeps([order]);

    const first = await processQueuedOrders(deps, noop);
    expect(first.succeeded).toEqual([ORDER_ID]);
    expect(generate).toHaveBeenCalledTimes(1);

    // Second run: the order is now awaiting_review, so listOrdersByStatus("queued")
    // returns nothing — no claim, no generation.
    const second = await processQueuedOrders(deps, noop);
    expect(second).toEqual({ succeeded: [], failed: [], skipped: [] });
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Interleaved double-run regression — the TOCTOU / atomic-claim guard
// ---------------------------------------------------------------------------

describe("interleaved double run (atomic claim)", () => {
  it("two interleaved drains over the same queued order generate it exactly once", async () => {
    const order = orderWith();
    // ONE shared dependency set (shared in-memory status map) so both drains race
    // over the same order. Both LIST it as queued, but the claim (queued →
    // generating) is the serialization point: only the first claim succeeds; the
    // second sees `generating` and throws IllegalTransitionError → SKIPPED, never
    // generated. (The mock's read-assert-write is synchronous, modeling the per-row
    // serialization the real DB UPDATE provides; see worker.ts's serialization note
    // on the separate-OS-process boundary.)
    const { deps, status } = makeDeps([order]);

    let genCalls = 0;
    deps.generateAllIllustrations = vi.fn(async () => {
      genCalls += 1;
      return MANIFEST;
    }) as unknown as WorkerDeps["generateAllIllustrations"];

    // Run both concurrently and let all microtasks settle.
    const [a, b] = await Promise.all([
      processQueuedOrders(deps, noop),
      processQueuedOrders(deps, noop),
    ]);

    // Exactly one generation call across both runs — no double-spend, the headline.
    expect(genCalls).toBe(1);
    expect(status.get(ORDER_ID)).toBe("awaiting_review");

    // Across the two runs: the order succeeded exactly once and was NEVER failed.
    // The losing run either saw nothing queued (listed after the claim) or skipped
    // on the claim (listed before the claim) — both are correct, neither generates.
    const succeeded = [...a.succeeded, ...b.succeeded];
    const failed = [...a.failed, ...b.failed];
    expect(succeeded).toEqual([ORDER_ID]);
    expect(failed).toEqual([]);
  });
});
