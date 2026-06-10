// Orchestration + progress API for the illustration pipeline (feature 09).
//
// Transport = polling on disk state + an in-memory job registry. NOT streaming/SSE.
// Justification: generation runs for minutes (gpt-image-2 ≈ 5 image-input req/min,
// ~4–8 min/book), `generateAllIllustrations` writes each PNG to disk incrementally
// but exposes no per-image callback, so the most honest progress signal is the set
// of PNGs already on disk. Polling that disk state survives a page refresh (a held-
// open stream would not), and the single local process makes an in-memory job
// registry sufficient — no queue, no second process.
//
// POST kicks off a fire-and-forget background run and returns immediately; GET is
// the poll endpoint that derives progress from ./generated/[id]/*.png. The job
// registry only carries the live status + any transient error — the session JSON
// on disk only ever holds draft/generating/ready (SessionStatus has no "error").

import { NextResponse } from "next/server";
import { readSession, writeSession } from "@/lib/session/disk";
import { isSafeSessionId, resolveUnder } from "@/lib/ai/paths";
import { generateAllIllustrations } from "@/lib/ai/generate";
import { getStory } from "@/lib/story/registry";
import { assertOperator } from "@/lib/runtime/surface";
import type { StorySession } from "@/lib/session/types";

/**
 * The full set of images a book produces — the count the progress UI polls
 * against. The slots come from the session's story definition (the registry), so
 * the count is product-specific. Story 1 also writes a separate `reference.png`
 * anchor that is not one of its slots, so it is `slots + 1` (13 scenes + 1 = 14);
 * Story 2's two slots ARE the images (no separate reference), so it is exactly
 * `slots` (= 2). The `+ 1` is gated on the story actually having that anchor.
 */
function totalImages(session: StorySession): number {
  const storyType = session.storyType ?? "story-1";
  const slots = getStory(storyType).illustrationSlots.length;
  return storyType === "story-1" ? slots + 1 : slots;
}

/** Live status of a generation run. "error" lives here, never on the session. */
type JobStatus = "generating" | "ready" | "error";

interface JobState {
  status: JobStatus;
  /** Readable failure message, only set when status === "error". */
  error?: string;
}

// Module-level registry. Single local process ⇒ this is the source of truth for a
// run that is in flight. A server restart clears it, but the GET handler falls back
// to disk-derived progress + session.status, so a refresh-resume still works.
const jobs = new Map<string, JobState>();

/** Pull a string id from `{ id }` or `{ sessionId }` request bodies. */
function readId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const raw = record.id ?? record.sessionId;
  return typeof raw === "string" ? raw : null;
}

/**
 * List the page slots that already have a saved PNG on disk under
 * ./generated/[id]/. Filenames are "cover.png", "page-1.png", …, "reference.png";
 * we strip ".png" to get the slot id. Returns an empty array if the directory
 * doesn't exist yet (generation hasn't written anything). Traversal-guarded.
 */
async function listDonePages(sessionId: string): Promise<string[]> {
  const dir = resolveUnder(process.cwd(), "generated", `generated/${sessionId}`);
  if (!dir) {
    return [];
  }
  const fs = await import("node:fs/promises");
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    // ENOENT (or any read failure) ⇒ nothing generated yet.
    return [];
  }
  return entries
    .filter((name) => name.endsWith(".png"))
    .map((name) => name.slice(0, -".png".length));
}

/**
 * Start the background generation run for a session. Fire-and-forget: the POST
 * handler has already claimed the job (status "generating") and persisted the
 * session — this kicks off `generateAllIllustrations` WITHOUT awaiting it. On
 * resolve we persist the manifest + "ready"; on reject we record the error on the
 * in-memory job (so the GET surfaces it) and never let the rejection go unhandled.
 */
function startGeneration(session: StorySession): void {
  // generateAllIllustrations defaults: approach "A", sceneQuality "low",
  // referenceQuality "low" — exactly the cost/quality the footer advertises.
  generateAllIllustrations(session)
    .then(async (manifest) => {
      const finished: StorySession = {
        ...session,
        images: manifest,
        status: "ready",
      };
      await writeSession(finished);
      jobs.set(session.id, { status: "ready" });
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Illustration generation failed.";
      // Keep the run from crashing the process and leave a visible error for GET.
      console.error(`Generation failed for session ${session.id}:`, error);
      jobs.set(session.id, { status: "error", error: message });
    });
}

/**
 * POST — kick off (or no-op resume) a generation run for a saved session.
 * Body: `{ id }` or `{ sessionId }`.
 * Success: `{ ok: true, status: "generating", total }` (returns immediately).
 * Errors: `{ ok: false, error: "snake_case" }` with the matching status code.
 */
export async function POST(request: Request): Promise<Response> {
  const gate = assertOperator();
  if (gate) return gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const id = readId(body);
  if (!id || !isSafeSessionId(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_session_id" },
      { status: 400 },
    );
  }

  const session = await readSession(id);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "session_not_found" },
      { status: 404 },
    );
  }

  // Idempotency guard: if a run for this id is already in flight, don't start a
  // second one — just report it. (A fresh POST after an error or after "ready"
  // re-runs; feature 07's cache makes already-done images a cheap no-op.)
  // Claim the run SYNCHRONOUSLY — check-and-set with no await in between — so two
  // POSTs that interleave across the `await writeSession` below can't both pass
  // the guard and launch two concurrent (paid) runs. Node is single-threaded, so
  // this read-then-write is atomic; the claim is released if the write fails.
  if (jobs.get(id)?.status === "generating") {
    return NextResponse.json({
      ok: true,
      status: "generating",
      total: totalImages(session),
    });
  }
  jobs.set(id, { status: "generating" });

  // Mark the session generating and persist before kicking off the run, so a
  // refresh that lands before the first PNG still sees "generating".
  const generating: StorySession = { ...session, status: "generating" };
  try {
    await writeSession(generating);
  } catch {
    jobs.delete(id);
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  startGeneration(generating);

  return NextResponse.json({
    ok: true,
    status: "generating",
    total: totalImages(session),
  });
}

/**
 * GET — poll progress for a run. Query: `?id=…`.
 * Success: `{ ok: true, status, done, total, donePages, error? }` where
 *   - `status` is the in-memory job status if a job exists, else inferred from
 *     `session.status` ("ready" ⇒ ready; otherwise the disk-derived progress —
 *     the refresh-resume / cache-hit path after a server restart),
 *   - `done` / `donePages` come from the PNGs on disk (the honest signal),
 *   - `error` surfaces a failed image so the client shows it instead of hanging.
 * Errors: `{ ok: false, error: "snake_case" }`.
 */
export async function GET(request: Request): Promise<Response> {
  const gate = assertOperator();
  if (gate) return gate;

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !isSafeSessionId(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_session_id" },
      { status: 400 },
    );
  }

  const session = await readSession(id);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "session_not_found" },
      { status: 404 },
    );
  }

  const donePages = await listDonePages(id);
  const done = donePages.length;
  const total = totalImages(session);

  const job = jobs.get(id);
  let status: JobStatus;
  if (job) {
    status = job.status;
  } else if (session.status === "ready") {
    status = "ready";
  } else {
    // No live job (server restart, cache-hit resume) and the session isn't marked
    // ready yet: report what's on disk. Treat a complete disk set as ready so a
    // resumed run that already finished its writes can still advance.
    status = done >= total ? "ready" : "generating";
  }

  return NextResponse.json({
    ok: true,
    status,
    done,
    total,
    donePages,
    ...(job?.error ? { error: job.error } : {}),
  });
}
