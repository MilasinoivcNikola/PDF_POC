---
name: story4-reusable-fixture
description: The reusable ready Story-4 ("If [PET_NAME] Could Talk") book fixture for $0 preview/download QA
metadata:
  type: reference
---

`sessions/feat21-talk-otis.json` (+ `generated/feat21-talk-otis/talk-cover.png` + `talk-page-4.png`)
is the canonical **ready Story-4** book fixture (PR-21's Low run, living tense, Otis the Jack Russell).
Use it the same way `b41b8df0` (Story 1) and `dc34eb11` (Story 2, Murphy) are used: seed the wizard
draft id or hit `/api/preview?id=feat21-talk-otis` for **$0** preview/download/edit checks.

**Story-4 facts to assert against:**
- 2 illustration slots: `talk-cover` + `talk-page-4` (registry `TALK_SCENE_PAGE_IDS`); **both photo-anchored**
  (unlike Story 2's figure-free belief wash).
- 6-page letter PDF, filename `If-[PET_NAME]-Could-Talk.pdf`, all MediaBox `[0 0 612 792]`.
- Preview is **single-column** (`.preview-single`, NOT `.spread`), `letter-cover`+5×`letter` layouts.
- Editable fields (registry `editable`): petName, ownerNames, quirks, favoriteRitual, favoriteActivity, favoriteSpots.
- Session shape: `owner` group (no `child`), `toggles.livingOrMemorial`, `memories.favoriteActivity`.
- `livingOrMemorial="living"` hides death-type/belief-frame/second-date; `"memorial"` reveals them
  (conditional reveal on BOTH the operator `tone` step AND the public order form).
- Required set (wizard + `/api/order` server gate): petName, ownerNames, species, photo, quirks,
  favoriteRitual, favoriteSpots, **favoriteActivity** → missing → `missing_favorite_activity`.

Re-confirm the file is still on disk before relying on it (gitignored, can be cleaned).
See [[supabase-local-verify]] for the local-stack commerce checks and [[qa-low-tier-cost-control]].
