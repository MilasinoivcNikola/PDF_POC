# Feature Spec — Rename the brand to **Dearbound**

## Intent

The catalog has outgrown its "pet keepsake / memorial" framing. With 9 stories now
spanning memorial (1, 2, 5), living tribute (4, 6), gotcha-day (7), adventure (8), and
new-baby (9) titles, the user-facing brand **"Quietly Kept — A gentle goodbye"** reads
too sad for the joyful half of the line, and the repo's working name ("POC loacl
project" / package `quietly-kept`) is stale.

Rebrand to **Dearbound** (exact-match domain **dearbound.com**, purchased 2026-06-14).
Coined from *dear* (warmth — spans grief and joy) + *bound* (bookbinding + the owner↔pet
bond). Species-neutral by design (no paw/tail/fur), so it covers every pet and every mood.

This is a **branding rename only** — no behavior, layout, pricing, or PDF-output change.
It must leave every product's generated PDF **byte-identical** except where the brand
string is literally printed (see Decision 3).

## Scope assessment → one PR

This is a wide but shallow string rename with no logic change, so it lands as **one PR**
on `feature/rename-dearbound`. The risk isn't complexity, it's *missing a spot* — so the
plan below is an explicit checklist and we add a guard test (see Testing) that fails if
the old brand string survives in the live surface.

---

## Open decisions (need your call before/while implementing)

**Decision 1 — The new tagline.** "A gentle goodbye" was memorial-specific and has to go.
Replacement (used in `<title>` and the hero). My recommendation:
> **"Dearbound — custom illustrated books starring your pet"**

Alternatives: *"…where your pet is the hero,"* *"…personalized keepsake books for the
pets you love."* The name is brandable not descriptive, so it leans on this line — worth
getting right. **Default if you don't pick: my recommendation above.**

**Decision 2 — What to do with the word "keepsake" (the common noun).** It appears ~60
files, but in two very different roles:
- **As a generic product descriptor** — `keepsakeNoun()` in the email, "the keepsake of a
  pet that died," masterstory prose, code comments. These are *accurate* (a memorial book
  *is* a keepsake) and not the brand. **Recommendation: keep them.** Purging "keepsake"
  everywhere would be a much larger, riskier edit for no brand benefit — "Dearbound" is the
  brand; "keepsake" stays a fine word for what the product *is*.
- **As a catalog/nav label** — e.g. the `/books` page title *"The keepsakes — Quietly
  Kept"* and any nav that calls the line "the keepsakes." With joyful titles in the
  catalog, "keepsakes" as the collective noun slightly under-describes too.
  **Recommendation: soften these to neutral wording** (e.g. *"The books — Dearbound"* /
  "our books"). Small, ~2–3 strings.

**Decision 3 — Scope of doc/history rewrites.** The brand also appears across internal
docs (`CLAUDE.md`, context docs, masterstories, **agent definitions** in `.claude/agents/`,
the **feature skill**), the **history archive**, and old feature specs.
- **Recommendation — rewrite the *live* set, leave the *historical* set as-is:**
  - **Rewrite:** `CLAUDE.md` title, `README.md`, `.env.local.example`, the always-loaded
    context docs where the brand is stated as current (`commerce-roadmap.md` design-system
    name), the `.claude/agents/*` + `.claude/skills/*` references (so future sessions use the
    new name), and the design-system header comments in `app/globals.css` / `lib/pdf/styles.css`.
  - **Leave unchanged:** `context/history.md` + `context/history/*` (a dated changelog of
    what shipped under the old name — rewriting it falsifies the record) and superseded
    feature specs under `context/features/`. They're historical; a one-line note in the new
    history entry that "Quietly Kept" was the prior brand is enough.
- Alternative if you'd rather a clean slate: rewrite history too. More churn, debatable value.

---

## Implementation plan (checklist)

### A. Identity / config
- [ ] `package.json` — `"name": "quietly-kept"` → `"dearbound"`.
- [ ] `app/layout.tsx` — `metadata.title` → new tagline (Decision 1); refresh `description`.
- [ ] `.env.local.example` — example `FROM_EMAIL` (`hello@quietlykept.example` →
      `hello@dearbound.com`), and add a comment that `PUBLIC_SITE_URL` is `https://dearbound.com`.

### B. User-facing brand string (wordmark) → "Dearbound"
The wordmark "Quietly Kept" renders in a header/footer on ~16 pages. Replace the literal
in each:
- [ ] Public: `app/(public)/page.tsx`, `books/page.tsx`, `books/[productId]/page.tsx`,
      `order/[productId]/page.tsx` (+ `OrderForm.tsx`, `confirmation/page.tsx`),
      `policies/page.tsx`, `download/[token]/page.tsx`. Update the per-page `<title>`
      metadata suffixes too (`— Quietly Kept` → `— Dearbound`).
- [ ] Operator: `admin/page.tsx`, `admin/[orderId]/page.tsx`, `admin/login/page.tsx`,
      `create/generate/page.tsx`, `create/preview/page.tsx`.
- [ ] Shared chrome: `components/wizard/GenerationProgress.tsx`, `StepShell.tsx`.
- [ ] Consider extracting the wordmark to a single `BRAND` constant (e.g. in a tiny
      `lib/brand.ts`) so this never has to be a 16-file edit again. **Recommendation: yes** —
      it's the one small refactor that earns its keep and prevents future drift.

### C. Delivery email
- [ ] `lib/delivery/email.ts` — signature/subject brand lines (`Quietly Kept` → `Dearbound`,
      3 spots) and the comment on line 8. Leave `keepsakeNoun()` as-is (Decision 2).
- [ ] `lib/delivery/email.test.ts` — `FROM_EMAIL` fixture + the two `payload.from`
      assertions → `Dearbound <hello@dearbound.com>`.

### D. PDF fallback title
- [ ] `lib/pdf/template.tsx:110` — fallback `"Quietly Kept"` → `"Dearbound"`. **This is the
      only string that can change PDF bytes**, and only for a story with no title (none in
      the catalog hit it). Confirm the template byte-identity tests still pass (they will —
      every real product supplies a title).

### E. Catalog/nav wording (Decision 2, second bullet)
- [ ] `books/page.tsx` title "The keepsakes — …" → neutral ("The books — Dearbound") and
      any matching on-page heading/nav.

### F. Design-system + comment headers (cosmetic)
- [ ] `app/globals.css:6`, `lib/pdf/styles.css:2` — design-system header comments.

### G. Live docs + agent/skill config (Decision 3, "rewrite" set)
- [ ] `CLAUDE.md` title "POC loacl project" → "Dearbound"; fix the "loacl" typo while here.
- [ ] `README.md`, `context/commerce-roadmap.md` (design-system name reference),
      `.claude/agents/*.md`, `.claude/skills/feature/*` where they name the brand/design system.

### H. Prototypes (optional)
- [ ] `prototypes/*.html` still say "Quietly Kept". They're design references, not shipped.
      **Recommendation: update for consistency** (cheap), but low priority.

---

## Out of scope (explicit)
- `context/history.md` + `context/history/*` and superseded `context/features/*` — left as a
  historical record (Decision 3).
- The word "keepsake" as a product descriptor in story/email/prose — kept (Decision 2).
- Any logic, pricing, layout, route, or state-machine change.
- Actual DNS / Vercel domain wiring and the real `FROM_EMAIL` mailbox — ops, not code.
- Updating Lemon Squeezy product names / Supabase project name — external dashboards.

## Testing
- [ ] **Guard test** (new): a small Vitest that greps the *live* surface (`app/`,
      `components/`, `lib/`, excluding `*.test.*` historical fixtures) and asserts zero
      surviving "Quietly Kept". Mirrors the boundary-test pattern; prevents a missed spot.
- [ ] `lib/delivery/email.test.ts` updated assertions pass.
- [ ] `lib/pdf/template.test.tsx` / `template.story2.test.tsx` still pass (byte-identity held).
- [ ] `npm run test:run` + `npm run build` green.
- [ ] Manual QA: load `/`, `/books`, an order page, the confirmation, the operator admin,
      and a generated preview — confirm the wordmark reads "Dearbound" and titles are right.

## Risks / notes
- **Missed-spot risk** is the only real one — the guard test is the mitigation.
- The `BRAND` constant (Step B) converts the riskiest part (16 scattered literals) into one
  edit + a re-export; recommended but optional.
- No customer data, payment, or generation path is touched — zero commerce risk.
