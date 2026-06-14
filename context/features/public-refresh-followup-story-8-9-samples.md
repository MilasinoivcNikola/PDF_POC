# Feature Spec — Public Refresh Follow-up: Story 8 & 9 Sample Art

> **Series:** Public-pages refresh. **Non-blocking follow-up** — runs in parallel with
> PR-2/3/4 and does not gate them (the catalog/detail cards degrade gracefully without it).
> Owner: `ai-image-specialist` (illustration generation), not the UI track.

## Intent

The storefront cards and book-detail galleries render real sample art from
`public/samples/<productId>/`, referenced by `Product.sampleImages` in
[lib/catalog/products.ts](../../lib/catalog/products.ts). Six of eight books have sample
folders; **`story-8-adventure` and `story-9-newbaby` have none** — those two catalog cards
and detail galleries fall back to an empty placeholder block. This follow-up generates and
commits their web-optimized samples so all eight books show real art.

## Scope assessment → one PR

Asset generation + commit. No code change beyond confirming the already-declared
`sampleImages` paths resolve (the catalog already lists them — see lines for
`story-8-adventure` / `story-9-newbaby`). One PR on `feature/story-8-9-samples`.

---

## What the catalog already expects (paths to fill)

From `products.ts`, these paths are **already declared** and just need files:

- `public/samples/story-8-adventure/adventure-cover.jpg`
- `public/samples/story-8-adventure/adventure-leap.jpg`
- `public/samples/story-9-newbaby/newbaby-cover.jpg`
- `public/samples/story-9-newbaby/newbaby-page-7.jpg`

(Match the existing convention: a **cover** + one strong interior page, web-optimized
~800px JPEG, mirroring `story-6-tribute/` and `story-7-welcome/`.)

---

## Implementation plan (checklist)

- [ ] Generate the four images via the existing engine for each story
      (`generateStory8Illustrations` / Story 9's Approach-A path), using a representative
      test pet — **reuse a cached session if one exists** (the QA cost-control rule: free
      cache hit, ~$0, never a fresh Medium book just for marketing art).
- [ ] Pick the two strongest frames per book (a cover-quality portrait + one dynamic/
      representative interior — Story 8's "leap"/action beat; Story 9's page-7 family beat).
- [ ] Web-optimize to ~800px JPEG, matching the file size/quality of the existing
      `public/samples/*` so the cards stay fast and static.
- [ ] Place them at the four exact paths above. **No `products.ts` edit needed** — the
      paths already point here; this only makes them resolve.
- [ ] Eyeball against the live cards/detail to confirm framing reads well at card size.

---

## Out of scope (explicit)
- Any page / catalog / CSS code change — purely supplying the declared assets.
- Re-shooting or replacing the other six books' existing samples.
- Adding more than the two declared samples per book (keep the gallery counts as the
  catalog declares).

## Testing
- [ ] `npm run build` green (assets only; nothing imports them at build time).
- [ ] Manual QA: `/books` — Story 8 and Story 9 cards now show real art (no placeholder
      block); `/books/story-8-adventure` and `/books/story-9-newbaby` galleries show the
      cover + interior; images are crisp at card and detail size and reasonably sized on the
      wire.
- [ ] Confirm no other product's samples changed (this PR adds only the two new folders).

## Risks / notes
- **Cost:** follow the Low-tier / cached-session rule — marketing samples don't justify a
  fresh paid generation run. If no usable cached pet exists, flag before spending.
- Subjective quality bar: these are the storefront's first impression for two titles —
  prefer a clean, on-model frame over a busy one. Get a quick PM eyeball before committing
  if in doubt.
- This is the only place the refresh depends on the **engine**; keep it isolated from the
  public UI PRs so a slow/expensive generation never blocks the merge train.
