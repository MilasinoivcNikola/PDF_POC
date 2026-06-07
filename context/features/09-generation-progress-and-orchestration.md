# 09 — Generation Progress & Orchestration API

> **Craft Area:** 3 + 2 — App/UI + AI · **Owner agents:** `nextjs-ui-builder` (lead), `ai-image-specialist` (support)
> **Milestone:** 4 · **Depends on:** 07, 08
> **Branch:** `feature/generation-progress`

## Status

Not Started

## Goals

- Wire the wizard's "Generate" to the real illustration pipeline and show honest, per-illustration progress — **the second half of Milestone 4**: complete the wizard, click Generate, watch the backend build the book, land on preview.
- The progress screen matches `prototypes/generating.html` (per-illustration checklist with done/current/pending states, count, progress bar, the pet description footer).

## Scope

**In scope**
- `app/api/generate-illustrations/route.ts` — reads the session from `./sessions/[id].json`, invokes `generateAllIllustrations` (feature 07), writes images to `./generated/[session-id]/`, updates the session manifest + status, and reports progress.
  - **Progress transport:** choose the simplest robust option and document it — either (a) streaming (SSE / a `ReadableStream`) emitting per-illustration events, or (b) a job-status file the client polls (`GET` returns which images are done). Given the local single-process scope, polling a status field on the session JSON is acceptable and simplest; streaming is nicer UX. Pick one, justify briefly.
- `app/create/generate/page.tsx` — the progress UI from `generating.html`, driven by real events/polling: marks each illustration done as it completes, shows count "NN of 12", advances the bar, then auto-advances to `/create/preview` when complete.
- Graceful handling: on an image failure, surface it (don't silently hang); allow the page to continue/retry. Don't block the whole book on one scene if avoidable.
- Cost/quality footer text (model + tier) as in the prototype.

**Out of scope**
- The illustration generation logic itself (feature 07 owns it; this feature only orchestrates + visualizes).
- Preview rendering and download (feature 10).
- Background job queues / multi-user concurrency (out of scope — single local user).

## Implementation notes

**Key decisions**
- **Don't block a serverless-style request for the whole book.** Full Medium generation can take a minute-plus. Kick off generation and report progress incrementally (stream or poll) rather than one long synchronous request that risks timeouts and gives no feedback.
- Reuse feature 07's manifest + cache: progress = "how many manifest entries have images." A resumed/regenerated run should reflect cache hits as instantly-done.
- Keep the API thin — it orchestrates feature 07 and persists state; all generation craft lives in `lib/ai/`.
- The prototype's `generating.html` already enumerates the scenes and states — mirror its structure and copy.

**Files**
- `app/api/generate-illustrations/route.ts` (+ a status `GET` if polling)
- `app/create/generate/page.tsx`
- small client hook for progress (`useGenerationProgress`).

## References

- @prototypes/generating.html — the progress UI to build (states, count, bar, footer).
- @context/local-prototype-plan.md — Milestone 4, the architecture diagram (`/generate-illustrations` route), and the "should illustrations be cached?" note.
- Feature 07 spec — the orchestrator + manifest this drives.

## Done when

- [ ] Clicking Generate in the wizard triggers real generation for the saved session.
- [ ] The progress screen updates per-illustration (done/current/pending) with an accurate count.
- [ ] On completion it auto-advances to the preview route; images are on disk + in the manifest.
- [ ] A failed image is surfaced, not hung; the run can recover.
- [ ] `npm run build` passes.

## Tests

- `test-author`: the orchestration route's pure helpers (progress computation from manifest, status transitions). **Mock the AI layer.**
- `qa`: full wizard → Generate → watch progress → arrive at preview with real images (the Milestone-4 check).
