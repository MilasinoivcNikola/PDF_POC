import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// BRAND GUARD (rename-to-Dearbound). The rebrand from "Quietly Kept" → "Dearbound"
// is a wide-but-shallow string rename whose only real risk is MISSING A SPOT. This
// test mitigates exactly that: it greps the LIVE surface (app/ + components/ + lib/)
// for the old wordmark and fails if any survives, so a future edit that reintroduces
// "Quietly Kept" — or a spot missed in the rename — is caught in `npm run test:run`.
//
// Same class of static, dependency-free guard as lib/runtime/surface.boundary.test.ts:
// it walks files on disk with node:fs and a substring check rather than a bundler.
//
// Excluded from the walk (by design):
//   - `*.test.*` / `*.spec.*` — test fixtures may legitimately reference the old
//     brand (e.g. an example FROM_EMAIL or example.com URL) and are not shipped copy.
//   - this guard file itself (it names the old string to assert its absence).
// History/superseded docs live OUTSIDE these dirs (context/) and are intentionally
// left as a record — see context/features/rename-to-dearbound.md (Decision 3).

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const FORBIDDEN = "Quietly Kept";
const SCAN_DIRS = ["app", "components", "lib"];
const SELF = "lib/brand.guard.test.ts";

function isTestFile(rel: string): boolean {
  return /\.(test|spec)\.[tj]sx?$/.test(rel);
}

/** Recursively collect every file under `dir` (repo-relative paths). */
function collectFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  const out: string[] = [];
  for (const entry of readdirSync(abs)) {
    const absEntry = path.join(abs, entry);
    const rel = path.relative(ROOT, absEntry);
    if (statSync(absEntry).isDirectory()) {
      out.push(...collectFiles(rel));
    } else {
      out.push(rel);
    }
  }
  return out;
}

describe("brand guard — no surviving 'Quietly Kept' in the live surface", () => {
  it("finds zero occurrences across app/, components/, lib/ (excluding tests)", () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const rel of collectFiles(dir)) {
        if (isTestFile(rel) || rel === SELF) continue;
        const source = readFileSync(path.join(ROOT, rel), "utf8");
        if (source.includes(FORBIDDEN)) {
          offenders.push(rel);
        }
      }
    }
    expect(
      offenders,
      `"${FORBIDDEN}" still appears in: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
