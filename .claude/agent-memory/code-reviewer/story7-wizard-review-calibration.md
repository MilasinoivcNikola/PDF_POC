---
name: story7-wizard-review-calibration
description: feature 29 Story-7 "Welcome Home" wizard/storefront/order intake (PR-B) — PASS clean; conditional yearsHome reveal idiom, off-spec session-bridge additions validated, joyful-card rgba precedent
metadata:
  type: project
---

Feature 29 ("Welcome Home", PR-B of 2, Milestone 11) — makes Story 7 creatable +
sellable. Reviewed clean (PASS, zero blockers, zero nice-to-haves worth raising).
Mirrors Story 5/6 dispatch idiom exactly. Durable judgment calls:

**Conditional `yearsHome` reveal is the structural novelty — implemented correctly in BOTH surfaces.**
Required ONLY when `occasion = gotcha-day-anniversary`, in `missingRequiredFieldsStory7`
+ `validateStory7` (code `missing_years_home`) + the draft gate. Switching the radio
back to `new-arrival` patches `{ occasion, yearsHome: "" }` to clear stale year (both
tone/page.tsx and OrderForm Story7Fields). The bridge stores `yearsHome` only under
`occasion === "gotcha-day-anniversary" && present(yearsHome)`. Merge layer is defensive
on top (registers yearsHome only when anniversary+present; variant falls back to
new-arrival wording otherwise — from PR-A). `<input type="number">` yields a string;
`formatYearsHome` parses leading `/^\d+/` → "1 year"/"N years", never crashes on decimals/
stray input. Whitespace-only yearsHome treated as missing (tested). Don't flag any of this.

**Off-spec session-bridge additions are CORRECT + complete (not gaps):**
- `newStory7Draft` in `lib/session/storage.ts` (+ overload `newDraft(storyType:"story-7")`):
  seeds `pet:{species:"dog",illustrationStyle:"watercolor"}`, `toggles` with the three
  defaults (new-arrival/shelter/adult), yearsHome unset. Exact mirror of newStory6Draft.
- `AnySession` widening in `lib/session/disk.ts`: pure additive type-only union member.
  Both were "off-spec" only in that the spec didn't enumerate them; they are the
  mandatory plumbing every prior story added. Sound.

**WizardProvider merge is SHALLOW PER-GROUP — patching {memories:{favoriteActivity}}
preserves sibling memory fields** (updateDraft spreads `...current.memories`). So the
homecoming step's 9 separate updateDraft calls don't clobber each other. Verified, not a bug.

**Joyful landing card `.chooserCardJoyful` hardcoded `rgba(216,183,128,0.22)` is the
ESTABLISHED precedent, not a token violation.** `.chooserCardLiving` (Story 6) already
hardcodes `rgba(126,141,107,0.12)` (= --sage RGB) the same way — the token system can't
express alpha variants without color-mix. Same border-left/:hover/.chooserKicker structure.
Uses real --gold/--gold-soft tokens for the solid colors. Do NOT flag the rgba as a hardcode.

**PR-A nice-to-have was CLOSED in PR-B:** `lib/ai/story7-prompts` is now line 81 of
`surface.boundary.test.ts` FORBIDDEN_LOCAL (parity with story5/6). Boundary test 7 green.

**Verification baseline (feature 29):** tsc --noEmit clean; full suite 1617 passed/78 files
(~68 new tests over PR-A's 1549); next lint clean; npm run build succeeds (story-7-welcome
order page in the `[+3 more paths]` SSG group; /create/homecoming dynamic ƒ, public storefront
static ○/●). NO PDF pipeline / lib/story / lib/ai / generate.ts touched → byte-identity holds
by construction. Edge cases tested: optional-omit drops (absent + whitespace-only → ""), 
optional-with-fallback stores "", blank-quirks/homecomingMemory accepted by validateStory7.
