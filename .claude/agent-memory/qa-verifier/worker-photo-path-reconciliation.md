---
name: worker-photo-path-reconciliation
description: The engine's pet.photo must be relative-to-CWD WITH the "uploads/" prefix ("uploads/<id>/photo.ext"), not relative-to-uploads — verify any worker/intake that builds it
metadata:
  type: project
---

The engine resolves the reference photo via `resolveUnder(process.cwd(), "uploads", session.pet.photo)`
(in `lib/ai/generate.ts`, four call sites: reference + scene + regenerate paths). `resolveUnder`
resolves `untrustedPath` against the **root (cwd)**, not against the subdir — so `session.pet.photo`
MUST already include the `uploads/` prefix and be relative to cwd, e.g. **`"uploads/<id>/photo.jpg"`**.
Every real on-disk session stores it that way (`b41b8df0` → `"uploads/b41b8df0…/photo.jpg"`), and the
operator-route tests use `"uploads/sess/photo.jpg"`.

A value WITHOUT the prefix (just `"<id>/photo.jpg"`) makes `resolveUnder` return `null` → the engine
throws `"Pet photo path is outside ./uploads: <id>/photo.jpg"` BEFORE any OpenAI call ($0, but the
whole book fails).

**Why this is a memory:** Commerce PR-07's batch worker (`lib/order/worker.ts`) shipped
`scratchPhotoRelPath(orderId, ext)` returning `"<orderId>/photo.<ext>"` (no `uploads/` prefix) and
`buildEngineSession` set `pet.photo` to it — so EVERY drained order failed at the photo guard and
never generated. Its unit test (`worker.test.ts`) asserted the buggy value, so `npm run test:run` +
`tsc --noEmit` were green while the integration was broken. Live QA caught it; a fix is a one-line
prefix in `scratchPhotoRelPath` (`uploads/${orderId}/photo.${ext}`) + updating the test assertion.

**How to apply:** When QA-ing any code that constructs `session.pet.photo` for the engine (the worker,
a future intake→engine bridge), assert the value resolves: `resolveUnder(cwd, "uploads", pet.photo)`
must be non-null. Cheap $0 check: `tsx` a one-liner calling `resolveUnder`. Don't trust unit-green —
the contract the engine enforces (prefix included) is the thing to verify against a real generate run
or this resolve check. See [[qa-low-tier-cost-control]] (this bug fails $0, before the paid call).
