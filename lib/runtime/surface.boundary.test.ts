import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// THE LOAD-BEARING GUARD of commerce PR-03 (the public/operator split).
//
// The public surface (the always-on Vercel deploy) must never be able to
// generate. We enforce the engine gate at runtime via assertOperator() (API
// routes) and the (operator) layout (pages), but the *security* property — the
// OpenAI / service-role key path is unreachable from the public surface — only
// truly holds if the PUBLIC ROUTE GRAPH never even transitively IMPORTS the
// engine. A bare `import "@/lib/pdf/render"` anywhere in the public closure pulls
// Puppeteer (and the chain that reads OPENAI_API_KEY) into the public build's
// module graph; a regression there leaks the key path to Vercel.
//
// This test statically walks the import closure of the public entry modules and
// asserts none of the forbidden engine modules/packages appear. It is the same
// class of build-time guard the repo already uses to keep Puppeteer/fs out of the
// client bundle (feature 10/19) and out of lib/catalog/products.ts (PR-02) — but
// runnable in `npm run test:run` with no new dependency, by parsing import
// specifiers with a regex rather than spinning up a bundler.

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

// The public surface's entry modules — what a public Vercel deploy actually
// renders. The root layout (app/layout.tsx) wraps every route, so it is in the
// public graph too. Everything reachable from these (following only local source
// imports) is the public closure.
//
// Every public route page must be listed here so the guard actually walks it.
// PR-04 added the storefront routes: the product grid, the product detail and
// (stubbed) order dynamic routes, and the policy stubs.
const PUBLIC_ENTRIES = [
  "app/layout.tsx",
  "app/(public)/page.tsx",
  "app/(public)/books/page.tsx",
  "app/(public)/books/[productId]/page.tsx",
  "app/(public)/order/[productId]/page.tsx",
  "app/(public)/policies/page.tsx",
];

// Forbidden LOCAL modules — engine source the public graph must never import.
// Matched as a path substring against each resolved module's repo-relative path.
const FORBIDDEN_LOCAL = [
  "lib/ai/client", // reads OPENAI_API_KEY
  "lib/ai/generate", // the generation orchestrator
  "lib/ai/prompts",
  "lib/ai/story2-prompts",
  "lib/pdf/render", // Puppeteer
  "lib/pdf/template", // pulls react-dom/server via render path
  "lib/supabase/server", // reads SUPABASE_SERVICE_ROLE_KEY
  "lib/session/disk", // server-only fs session IO
];

// Forbidden bare PACKAGES — the engine's third-party deps. If any of these is
// imported anywhere in the public closure, the engine came with it.
const FORBIDDEN_PACKAGES = ["puppeteer", "openai", "@supabase/supabase-js"];

/** Extensions tried, in order, when resolving a local import with no extension. */
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

/**
 * Extract every import/export specifier from a source file: static
 * `import … from "X"`, side-effect `import "X"`, re-export `export … from "X"`,
 * and dynamic `import("X")`. Returns the raw specifiers (e.g. "@/lib/ai/generate",
 * "puppeteer", "./fonts").
 */
function readSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  // `import …from "X"` / `export …from "X"` (covers `import "X"` side-effects too,
  // since the `from` is optional in this pattern when the clause is empty).
  const fromRe = /(?:import|export)\s+(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/g;
  // `import("X")` dynamic imports.
  const dynamicRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const re of [fromRe, dynamicRe]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

/**
 * Resolve a local import specifier (a `@/…` alias or a `./`/`../` relative path)
 * to a repo-relative file path, trying source extensions and `/index`. Returns
 * null for a specifier that can't be resolved to a file on disk (e.g. a CSS module
 * or a bare package — those are handled separately).
 */
function resolveLocal(specifier: string, fromFile: string): string | null {
  let abs: string;
  if (specifier.startsWith("@/")) {
    abs = path.join(ROOT, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    abs = path.resolve(ROOT, path.dirname(fromFile), specifier);
  } else {
    return null; // bare package — not a local module
  }

  // Exact file?
  if (existsSync(abs) && !isDir(abs)) {
    return path.relative(ROOT, abs);
  }
  // With an extension?
  for (const ext of EXTENSIONS) {
    if (existsSync(abs + ext)) {
      return path.relative(ROOT, abs + ext);
    }
  }
  // As a directory index?
  for (const ext of EXTENSIONS) {
    const indexed = path.join(abs, `index${ext}`);
    if (existsSync(indexed)) {
      return path.relative(ROOT, indexed);
    }
  }
  return null;
}

function isDir(p: string): boolean {
  try {
    return readFileSync(p) && false;
  } catch {
    // readFileSync throws EISDIR for a directory; treat any read failure as "not a
    // plain file" so the extension/index resolution below runs instead.
    return true;
  }
}

interface Closure {
  /** Repo-relative paths of every local module reachable from the entries. */
  modules: Set<string>;
  /** Bare package names imported anywhere in the closure. */
  packages: Set<string>;
}

/** Walk the full transitive import closure of the given entry modules. */
function importClosure(entries: string[]): Closure {
  const modules = new Set<string>();
  const packages = new Set<string>();
  const queue = [...entries];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (modules.has(file)) {
      continue;
    }
    modules.add(file);

    let source: string;
    try {
      source = readFileSync(path.join(ROOT, file), "utf8");
    } catch {
      continue; // unreadable (e.g. an asset) — nothing to walk
    }

    for (const specifier of readSpecifiers(source)) {
      const resolved = resolveLocal(specifier, file);
      if (resolved) {
        if (!modules.has(resolved)) {
          queue.push(resolved);
        }
      } else if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
        // A bare specifier that isn't a local alias: record the package root
        // (e.g. "@supabase/supabase-js" from "@supabase/supabase-js/dist/...",
        // "openai" from "openai", "next/font" → "next").
        packages.add(packageRoot(specifier));
      }
    }
  }

  return { modules, packages };
}

/** The installable package name of a bare import (scoped or not). */
function packageRoot(specifier: string): string {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return name ? `${scope}/${name}` : scope;
  }
  return specifier.split("/")[0];
}

describe("public/operator boundary", () => {
  const closure = importClosure(PUBLIC_ENTRIES);

  it("resolves a non-trivial public import closure", () => {
    // Sanity check the walker actually traversed past the entries (so a silent
    // resolution failure can't make the forbidden-import checks vacuously pass).
    // Anchored on modules genuinely reachable from the storefront routes: the
    // landing entry itself, the catalog the /books grid renders, and the registry
    // chain it pulls in. (PR-04 reframed the landing to link to /books instead of
    // seeding a wizard draft, so the old StoryStartButton / lib/session/storage
    // anchors are no longer in the public closure — these replace them.)
    expect(closure.modules.has("app/(public)/page.tsx")).toBe(true);
    expect(closure.modules.has("app/(public)/books/page.tsx")).toBe(true);
    expect(closure.modules.has("lib/catalog/products.ts")).toBe(true);
    expect(closure.modules.has("lib/story/registry.ts")).toBe(true);
  });

  it("never imports an engine source module", () => {
    const leaked: string[] = [];
    for (const mod of closure.modules) {
      for (const forbidden of FORBIDDEN_LOCAL) {
        if (mod.includes(forbidden)) {
          leaked.push(`${mod} (matches "${forbidden}")`);
        }
      }
    }
    expect(leaked, "public graph transitively imports engine module(s)").toEqual(
      [],
    );
  });

  it("never pulls in an engine package", () => {
    const leaked = FORBIDDEN_PACKAGES.filter((pkg) => closure.packages.has(pkg));
    expect(
      leaked,
      "public graph transitively imports engine package(s)",
    ).toEqual([]);
  });
});
