# Current Feature

## Status

Spec written — awaiting go-ahead to implement (paid run gated on PM approval).

## Goals

Story Samples PR-01: replace Story 1's placeholder **Bo the boxer / Liam** sample with a
real example painted from `uploads/sample-photos/story-1.jpg` (a **fawn pug**, "Mango",
with a child "Maya"), and graduate Story 1 off the flagship-HIGH exception onto the
standard mixed-`PRODUCTION_QUALITY` harness (~$1) used by the other 7 titles.

Full spec: `context/features/story-samples-01-saying-goodbye-pug.md`.

## Notes

- Locked with PM (2026-06-17): **replace** the Bo sample; **standard mixed tier** (~$1).
- Source photo contains a child as well as the pet — keep a QA gate on the reference
  (pet must be on-model, child absent from the locked reference). Child stays stylized.
- Touches: new `fixtures/sample-story1-dog.json`, `lib/catalog/book-questions.ts`
  (+ test pin repoint), regenerated `public/samples/story-1-book/` assets, a
  `coding-standards.md` doc line (retire the "full-res HIGH preview" Story-1 exception).
  No engine/route/layout/pricing change.
- The cost step (`npm run proto:sample`) is PAID and manual — do not run until approved.
