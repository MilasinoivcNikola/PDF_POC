---
name: heart-glyph-color-canonical
description: HeartBookMark heart-fill color is owned by the component's own comment, not by a standing doc; the prototype NOTES + history are frozen and don't drift
metadata:
  type: project
---

The `components/site/HeartBookMark.tsx` heart-wash fill changed `--rose-faint` →
`--rose-soft` (feature/landing-redesign-visual-proof, 2026-06-16; reason: `--rose-faint`
#F1DDD5 was too pale and read as an unfilled outline on cream).

**Where the heart-fill color lives (canonical):** the component's own top-of-file
comment. That comment was updated in-branch, so the source-of-truth is in sync.

**Why this is NOT drift in any in-scope standing doc:**
- `context/features/heart-book-logo.md` does **not** name the heart fill color — it
  specs the glyph *stroke* (`currentColor`) + the audience tint, not the wash. So a
  fill-color change can't contradict it.
- `context/coding-standards.md` `site/` gloss (~L59-61) names HeartBookMark as public
  chrome but says nothing about its colors → not affected by a color swap.
- `--rose-faint` for the heart appears only in **out-of-scope / frozen** files:
  `context/history.md` + `context/history/2026-06-16-heart-book-logo.md` (append-only
  log, correctly records what shipped *then*) and
  `context/prototypes/004-heart-book-lockup/NOTES.md:14` (a **frozen design-decision
  mockup note**, not a standing source-of-truth doc — superseded by live code).

**Rule for future glyph/visual-token audits:** prototype `NOTES.md` files under
`context/prototypes/*/` are frozen design records, NOT standing docs — don't flag them
as drift when live code moves past them. Only flag if an *in-scope* doc
(coding-standards / feature spec / CLAUDE.md) actually asserts the now-stale value.
See [[canonical-doc-map]] and [[components-dir-enumeration-lag]].
