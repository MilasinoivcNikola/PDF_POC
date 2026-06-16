---
name: hand-finished-positioning-canonical
description: Who owns the "hand-finished" vs "painted by hand" positioning language, and the AI-honesty stance (now decided, roadmap line stale)
metadata:
  type: project
---

The product positioning language splits into two distinct claims that copy must keep separate — a public-copy change that touches either must be checked against the canonical owners.

- **"hand-finished" / "lovingly hand-finished" / "finished by hand"** = the human review+repaint approval gate. **True.** Canonical owner: `commerce-roadmap.md` (Fulfillment line ~L11, Turnaround row ~L21, "Why this model" ~L41 — `"lovingly hand-finished"`). Echoed verbatim in every masterstory back-cover blurb ("Delivered as a print-quality PDF, lovingly hand-finished within 24–48 hours" — stories 5/6/7/8/9). These are the documented positioning and are **fine** — `fix/ai-honesty-copy` standardized public copy ONTO this phrasing, so it is now *consistent* with the roadmap, not contradictory.
- **"painted by hand" / "we paint it by hand"** = implies a *human artist paints the art*. **False** (the art is AI-from-photo). This was the only claim removed site-wide by `fix/ai-honesty-copy` (2026-06-16). Replaced with "painted from your photo" (the AI-from-photo differentiator). The commerce-roadmap never made the false "painted by hand" claim, so no roadmap contradiction existed — the contradiction was internal to the public pages (false "by hand" vs honest FAQ/policies AI line).

**Why:** PM wants honest-but-understated; AI disclosed only in landing FAQ + `/policies`, warm craft language everywhere else. **How to apply:** on any public-copy branch, flag a *new* "painted/made by hand" that implies a human artist (false); do NOT flag "hand-finished"/"finished by hand" (true, roadmap-backed). The prototype HTML under `context/prototypes/001-*` and `005-*` still carries the old false "painted by hand" / "We paint it by hand" strings — those are frozen design mockups, not standing docs, so do not flag them as drift.

**AI-honesty stance is effectively decided (2026-06-16) but the roadmap still lists it deferred.** `commerce-roadmap.md:172` ("Deferred product decisions → AI-disclosure / honesty stance ... still an ethics + marketing choice") was written before the stance was settled. The `fix/ai-honesty-copy` spec records a PM decision (2026-06-16): be upfront about AI, disclose it plainly in FAQ + policies only. The live `/policies` copy still self-labels PLACEHOLDER ("exact wording ... still being decided", `app/(public)/policies/page.tsx:41-47`), so the *exact wording* is genuinely still open — the roadmap line is only mildly stale (the high-level stance is chosen; the wording isn't). Low-priority: worth a "Resolved" annotation on that bullet like the PR-08 admin-auth one, not a blocker. See [[deferred-decisions-blocking-prs]] for the sibling pattern (a deferred-decision line outliving its resolution).
