## 2026-06-17 — Fix: Minor UI/chrome cleanups — multi-size favicon.ico (Part A)

**Branch:** `fix/ui-chrome-cleanups` (aa90d03, merge 952312e) · **Spec:** `context/fixes/ui-chrome-cleanups.md` · Tier-3, UI/chrome (Craft Area 3, nextjs-ui-builder).

### What this paid down

The **low**-severity debt row *"Favicon ships a single tuned SVG, no multi-size `.ico`."*
The heart-book logo PR (Milestone 19) shipped one favicon-tuned `app/icon.svg` (with a
`prefers-color-scheme: dark` block) and **no `.ico`**. Two consequences: the 004 mockup had
flagged the **16px** as near its legibility floor (the heart-book detail goes mushy when a
single SVG is auto-rasterized that small), and browsers' automatic `/favicon.ico` probe
returned a harmless **404**. This fix ships a tuned multi-size `app/favicon.ico` (16 / 32 /
48 px) so small tabs render crisply and the probe returns **200**, while `app/icon.svg`
stays the primary scalable / dark-mode icon (Next.js App Router serves **both** from `app/`
— `favicon.ico` is a supported metadata-file convention, no app code change).

**Part A only.** The spec also carried an optional **Part B** (derive the download-meta
"8.5 × 11 inches" string in `BookPreview.tsx` from the registry instead of hardcoding it).
It was **deferred**: it's not a live bug — the string is correct for every current title
(all Letter) — so building registry plumbing for a non-existent non-Letter size would be
speculative. Its debt row (*"Download-meta hardcoded size string"*) and the sibling
*"Alternate print sizes"* row stay open, keyed to the day an 8×8 / A4 / 5×7 toggle ships.

### How it was built (no new dependency)

The machine has **no ImageMagick / icotool / rsvg**, and adding an npm dep needs approval —
so neither was used. `sharp` (v8.17.3, already in `node_modules` transitively via Next.js's
image optimizer) rasterizes SVG → PNG, and a **~40-line pure-Node ICO encoder** packs the
PNGs into the container. New throwaway generator `scripts/favicon-ico.ts` (committed, kept
like `scripts/story8-prototype.ts` / `scripts/story1-high-run.ts`) + a `proto:favicon` npm
script. The committed deliverable is the **`app/favicon.ico`** asset; the script is how it's
reproduced.

- **32 / 48 px** reuse `app/icon.svg`'s exact light-variant geometry (same
  `translate(5 5.2) scale(0.478)` group + paths) at higher res — same brand art, not a
  scaled bitmap.
- **16 px** is a **genuinely simplified redraw**, not a downscale: the knocked-out spine
  notch is dropped and the two thin open-cover wedges are merged/fattened into one bold base,
  with the heart dropped to overlap it so heart + base read as **one connected mass** (the
  first pass left a light gap row that fractured the silhouette at tab scale; re-tuned to
  close it).
- The `.ico` is a **static raster** — it can't do `prefers-color-scheme`, so it renders the
  **light** variant only (cream `#FBF7EE` chip + dark `#221C16` ink). The SVG remains the
  primary icon and keeps handling dark mode. Light-only `.ico` is standard practice.

### Diff & verification

- New: `app/favicon.ico` (3-image PNG-in-ICO, 1948 bytes); `scripts/favicon-ico.ts`;
  `package.json` (+`proto:favicon`). Removed: the favicon row in `context/debt.md` (paid).
- **Untouched** (Part B + out-of-scope): `app/icon.svg`, `components/site/HeartBookMark.tsx`,
  `components/preview/BookPreview.tsx`, the PDF pipeline. PDFs byte-identical.
- `npm run build` → **clean** (favicon emitted to the build output, served at `/favicon.ico`);
  `npm run test:run` → **2152 passed / 96 files** (no logic added — pure asset generation,
  verified by artifact inspection per repo convention, so no unit test for the encoder).
- **Review — code-reviewer PASS:** decoded the committed `.ico` byte-for-byte — ICONDIR
  header (`reserved=0`/`type=1`/`count=3`), three contiguous-and-correct entry offsets
  (54 → 363 → 1007), image bytes summing exactly to the 1948-byte file, each entry's
  dimensions matching the embedded PNG IHDR; no new dependency, no secrets, scope clean. Two
  non-blocking cosmetic notes left as-is (`main().catch` vs sibling `try/catch + void main()`;
  `proto:favicon` omits `--env-file-if-exists`, which is *correct* here — no OpenAI call).
- **Context-auditor — DRIFT FOUND (one, expected):** the favicon debt row was paid and
  removed in this branch; the heart-book history entry + `app/icon.svg` doc descriptions stay
  accurate (they *predicted* this follow-up). Commerce-security reviewer **not dispatched**
  (no commerce surface).
- **QA — PASS 3/3** (Playwright MCP, $0): `/favicon.ico` → **200** `image/x-icon` (over-wire
  header `00 00 01 00 03 00`, count=3, sizes 16/32/48); `/icon.svg` still **200** (the `.ico`
  is additive — `<head>` carries both icon links); the asset is a real ~1.9 KB multi-size
  icon, not a placeholder. (Next.js advertises the `.ico` link as `sizes="16x16"` regardless
  of contents — framework default, no functional effect; browsers read the real directory.)

### Carried forward

- Part B (download-meta size string) + alternate print sizes remain in `context/debt.md`,
  unchanged — both deferred until a non-Letter size feature exists.
- A further **designer** tune on the 16px glyph is an optional nice-to-have (any 16px glyph
  sits near the legibility floor), **not** a blocker — the shipped 16px reads crisply as the
  heart-book brand. Not logged as debt (the actual debt — mushy/404 — is resolved).
