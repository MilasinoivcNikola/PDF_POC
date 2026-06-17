---
name: favicon-ico-review-calibration
description: ui-chrome-cleanups Part A — hand-rolled ICO encoder review; how to verify a binary-asset PR and which proto-script deltas are non-issues
metadata:
  type: project
---

`fix/ui-chrome-cleanups` Part A: tuned multi-size `app/favicon.ico` (16/32/48) + throwaway `scripts/favicon-ico.ts` (sharp SVG→PNG + ~40-line pure-Node ICO encoder). Clean PASS.

**Why:** pays a low presentation-debt row (crisp small tabs + 200 on the `/favicon.ico` probe). `app/icon.svg` stays primary scalable icon; Next App Router auto-serves both from `app/`.

**How to apply (verifying a hand-rolled binary encoder):** don't eyeball the byte-writing code alone — *decode the committed artifact* and cross-check it against itself. The load-bearing check is a Python `struct` walk of `app/favicon.ico`: ICONDIR (reserved=0/type=1/count=3), each 16-byte ICONDIRENTRY, and crucially that **byteOffset is contiguous** (54→363→1007), **offset+byteSize never passes EOF**, image bytes **sum exactly to file size** (no slack), and each entry's dir dimensions **match the embedded PNG IHDR**. All held. The `size>=256→0` width-byte convention is correct-but-dead here (all sizes <256). `planes=1`/`bpp=32` standard for 32-bit RGBA PNG-in-ICO.

**Non-issues confirmed (don't flag these on a proto/asset script):**
- `proto:favicon` **omits** `--env-file-if-exists=.env.local` (unlike the other proto:* scripts) — CORRECT: this script touches no API key/env; loading it would be cargo-culting.
- `main().catch(...)` vs the repo's other proto scripts' `try/catch`+`void main()` — functionally identical (catch rejection + exit 1); cosmetic only.
- No unit test for `encodeIco` — repo convention (coding-standards) is proto/asset-gen verified by artifact inspection, not unit tests. Expected, not a gap.
- `file app/favicon.ico` summary lists only 2 of 3 icons in prose but says "3 icons" — cosmetic truncation in `file`'s own output; the struct walk proves the 48x48 entry is present and valid.

**Scope held:** HeartBookMark / icon.svg / BookPreview / lib/pdf all untouched; no dep added (sharp already resolves); package-lock untouched; no secrets in the script. Build passed.
