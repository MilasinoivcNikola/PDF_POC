---
name: story1-high-sample-review-calibration
description: Story-1 HIGH-fidelity sample/preview feature — fixture-photo-path "uploads/" prefix is correct (resolveUnder resolves against root not base), 31MB committed preview.pdf is the one real flag
metadata:
  type: feedback
---

Feature "Story 1 HIGH-Fidelity Sample Set + Preview PDF" (branch `feature/story1-high-sample-preview`, reviewed uncommitted in working tree). Catalog `previewPdf?: string` + 13 samples + detail-page conditional link + throwaway run script.

**Refuted concern — fixture `pet.photo` "uploads/..." prefix.** The spec text suggested the photo path should be relative to `./uploads` (i.e. `"high-run-candidates/test-image.jpg"`), but the shipped fixture uses `"uploads/high-run-candidates/test-image.jpg"`. This is CORRECT and matches the `fixtures/otis.json` precedent. **Why:** `resolveUnder(root, subdir, untrustedPath)` in `lib/ai/paths.ts` does `path.resolve(root, untrustedPath)` — resolves the untrusted path against **root (cwd)**, not against `root/subdir`. So the `"uploads/"` prefix is required for the relative form to land inside `<cwd>/uploads`. Don't flag the "uploads/" prefix as wrong — re-derive from `resolveUnder` if unsure.

**Validated — client-safe purity held.** `lib/catalog/products.ts` `previewPdf` is a plain string path; no engine / `lib/supabase/server` import added. `surface.boundary.test.ts` green (68 tests w/ catalog). The pure/client-safe boundary is the standing risk for this module and it stayed clean.

**Validated — quality bar.** Merged Story-1 output from the fixture: "died" present, "passed away" absent, zero surviving `[FIELD]` placeholders. Verified by running `getStory(s.storyType ?? "story-1").resolve(s)` over the fixture (the resolver entry is the `StoryDefinition.resolve` method, not a top-level `resolveStory` export).

**The one real flag — 31MB committed `public/samples/story-1-book/preview.pdf`.** NOT gitignored → enters git history permanently; can't be shrunk later without history rewrite. The 13 JPGs are fine (~330–400KB each, 1000px, web-optimized). This is a repo-hygiene/PM judgment call (Git LFS or accept the bloat), not a correctness blocker — surface it, let the PM decide.
