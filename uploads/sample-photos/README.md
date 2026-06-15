# Sample reference photos (committed, royalty-free)

This is the one **tracked** location under `uploads/` (the rest of `uploads/` is
gitignored — see the negation in `.gitignore` and the note in
`context/coding-standards.md` → *Files, IO, and persistence*).

It holds the royalty-free stock reference photos that drive the **storefront
sample runs** — one photo per pet species, so every catalog title can ship a full
example book starring a different kind of pet. Committing them here makes each
sample run reproducible (unlike the Story-1 boxer photo, which lives in
gitignored `uploads/` and so cannot be re-run from a clean checkout).

## Photo-selection bar

- One clearly **front-facing** animal with distinctive coat/markings (a strong
  anchor for the reference-illustration step), no costume props that would bleed
  into scenes.
- **Free-to-use license, no attribution required** (Pexels / Unsplash). Record
  each source URL + license in the per-story spec's "Input photo" section when the
  photo is chosen.

## Species table — candidates (awaiting PM approval)

All photos below are from **Pexels** (Pexels License — free to use, no attribution
required, no sign-up). Downloaded at ~1024px long edge (the engine downscales input
anyway) to keep the committed set lean (~0.8 MB total). Swap any before its per-story
paid run by dropping a replacement at the same filename.

| Story | Title | Species | File | Source (Pexels) |
|-------|-------|---------|------|-----------------|
| 1 | Saying Goodbye | Dog (boxer) | *existing — keeps its own photo, not here* | — |
| 2 | A Letter from Your Pet | Cat | `cat.jpg` | https://www.pexels.com/photo/37787972/ |
| 4 | If Your Pet Could Talk | Other (guinea pig) | `other.jpg` | https://www.pexels.com/photo/4383759/ |
| 5 | A Letter to Your Pet | Dog (senior, non-boxer) | `dog-senior.jpg` | https://www.pexels.com/photo/12756122/ |
| 6 | While You're Still Here | Cat (senior) | `cat-senior.jpg` | https://www.pexels.com/photo/17644707/ |
| 7 | Welcome Home | Bird (cockatiel) | `bird.jpg` | https://www.pexels.com/photo/32654290/ |
| 8 | Amazing Adventures | Dog (corgi) | `dog-corgi.jpg` | https://www.pexels.com/photo/16613108/ |
| 9 | And the New Baby | Rabbit | `rabbit.jpg` | https://www.pexels.com/photo/19613749/ |

> **License:** Pexels License (https://www.pexels.com/license/) — free for commercial
> use, no attribution required. Record the same URL + license in each per-story spec's
> "Input photo" section when its sample PR runs.
