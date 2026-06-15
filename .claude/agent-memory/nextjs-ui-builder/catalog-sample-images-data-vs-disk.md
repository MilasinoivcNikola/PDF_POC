---
name: catalog-sample-images-data-vs-disk
description: products.ts declares sampleImages paths for every book incl. Story 8/9, but those files aren't on disk — `sampleImages[0] ?` placeholder fallbacks are dead code for them
metadata:
  type: project
---

Every product in `lib/catalog/products.ts` has non-empty `sampleImages` paths,
including `story-8-adventure` and `story-9-newbaby` — but `public/samples/` has
NO directory for those two (only stories 1, 2, 4, 5, 6, 7 ship real JPEGs).

**Why:** Story 8/9 sample art is a deferred follow-up (per the Public Refresh
PR-3 spec's "out of scope"). The catalog author pre-wired the paths anyway.

**How to apply:** Any storefront card that does `p.sampleImages[0] ? <img> : <placeholder>`
will render a BROKEN `<img>` (404) for Story 8/9, never the placeholder — the
truthy-string check passes even though the file is missing. So a spec that says
"Story 8/9 show the placeholder paw" is contradicted by the data, and a page-only
fix can't resolve it (no fs probe allowed in the client-safe static page; `onError`
needs `"use client"`). The real fix lives in `products.ts` (clear the dead paths)
or shipping the files — both outside a page-body PR's scope. Flag it to the PM
rather than guessing. See [[new-book-wizard-seams]] for the broader "data declares
a thing the engine/disk doesn't have yet" pattern.
