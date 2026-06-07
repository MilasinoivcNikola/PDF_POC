# 06 — OpenAI Client & Reference Illustration

> **Craft Area:** 2 — AI illustration · **Owner agent:** `ai-image-specialist`
> **Milestone:** 2 · **Depends on:** 02
> **Branch:** `feature/ai-reference-illustration`

## Status

Not Started

## Goals

- Upload a real pet photo and get back **one** stylized "reference illustration" that looks like the same animal in the chosen style — **Milestone 2's "done" artifact**.
- Establish the OpenAI `gpt-image-2` integration (client, auth, image↔dataURL helpers, save-to-disk) that the full scene pipeline (feature 07) builds on.
- Keep iteration cheap: default to **Low** quality (~$0.006/image) while tuning prompts.

## Scope

**In scope**
- `lib/ai/client.ts` — OpenAI client setup (`openai` npm package), `OPENAI_API_KEY` from `.env.local`, and the `imageToDataUrl(filePath)` helper (base64 data URL, correct MIME).
- `lib/ai/generate.ts` — `generateReferenceIllustration(petPhotoPath, petDescription, style, quality)`:
  - model `gpt-image-2-2026-04-21`, 1024×1024, reference image = the uploaded photo, style-aware prompt ("Soft {style} children's-book illustration … maintain the pet's exact appearance — color, markings, breed — from the reference").
  - returns a `Buffer`; caller saves to `./generated/[session-id]/reference.png`.
- `app/api/upload/route.ts` — accept a posted photo (multipart), validate type/size, save to `./uploads/[session-id]/...`, return its path/URL. (Models only — the wizard's drag-drop UI is feature 08; here a minimal test page or curl/Postman is enough.)
- A minimal `app/test-ai/page.tsx` (or scratch route) to upload a photo and view the generated reference illustration end-to-end during development. Mark it clearly as a dev-only scaffold.
- A `quality` tier type (`low|medium|high`) defaulting to `low`.

**Out of scope**
- Per-scene prompt builders and the 10–12 scene orchestration (feature 07).
- Caching by prompt/image hash (feature 07).
- Wizard UI / the real upload step (feature 08).
- The blurry-photo warning UX (note for feature 08).

## Implementation notes

**Key decisions**
- **Verify the API surface against current docs (context7 / OpenAI SDK types) before coding** — the plan flags that the Images API has renamed params (`reference_images`, `quality`, response field) more than once. The SDK's TypeScript types are authoritative; trust them over the plan's sketch.
- Decode the API's base64 result to a `Buffer` for saving (`result.data[0].b64_json`).
- Keep all AI cost behind the Low tier by default; expose `quality` so feature 07 can bump to Medium for real books.
- Store generated images under `./generated/[session-id]/` (gitignored) and uploads under `./uploads/` (gitignored). Tie both to the session id from feature 02.
- Build `petDescription` from the session's `breedColor` + species; this is the same descriptive text the wizard collects.

**Files**
- `lib/ai/client.ts`
- `lib/ai/generate.ts`
- `app/api/upload/route.ts`
- dev-only test page (e.g. `app/test-ai/page.tsx`)

## References

- @context/local-prototype-plan.md — "Craft Area 2", the `generateReferenceIllustration` sketch, quality tiers, cost table, and Milestone 2 definition of done.
- @context/masterstories/story-1-master-template.md — "Illustration style guide" (watercolor default; palette; lock a reference image before generating page art).
- Use context7 / the `openai` SDK types for the authoritative `images.generate` signature and `gpt-image-2` params.

## Done when

- [ ] Posting a pet photo to `/api/upload` saves it and returns a usable path.
- [ ] `generateReferenceIllustration()` returns an illustration that recognizably matches the uploaded pet, in the chosen style.
- [ ] Dev test page renders the result; iterating at Low tier costs cents.
- [ ] API key is read from `.env.local`; nothing secret is committed.
- [ ] `npm run build` passes.

## Tests

- `test-author`: `imageToDataUrl` (MIME/extension mapping, base64 correctness on a tiny fixture), upload validation (type/size), the prompt-builder string for the reference illustration. **Mock the OpenAI call** — never hit the paid API in tests.
- `qa` / manual: the upload→reference loop with a real photo (the actual Milestone-2 check).
