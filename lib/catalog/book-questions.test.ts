import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getAllBookQuestions,
  getBookQuestions,
} from "@/lib/catalog/book-questions";
import { getProducts } from "@/lib/catalog/products";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

// ---------------------------------------------------------------------------
// Example ⇄ fixture pinning (approach A — the anti-drift guarantee)
// ---------------------------------------------------------------------------
//
// Each `example` literal in book-questions.ts is hand-authored, but it MUST equal
// the corresponding field value in that title's sample fixture — the exact answers
// the sample PDF was generated from. We can't pin a composed string to one field,
// so each title declares a parallel map from a question LABEL to the fixture FIELD
// PATH whose value that example reproduces. The test reads the fixture, looks up
// each labelled example, and asserts equality. Edit an example to a value the
// fixture doesn't contain and this fails (mutation-verified once during the PR).

/** The fixture file + per-label field-path pins for one title. */
interface FixturePin {
  fixture: string;
  /** Question label → dotted field path in the fixture JSON. */
  pins: Record<string, string>;
}

const FIXTURE_PINS: Record<string, FixturePin> = {
  "story-1-book": {
    fixture: "fixtures/sample-story1-dog.json",
    pins: {
      "Their name": "pet.name",
      "What kind of animal": "pet.species",
      "How they look": "pet.breedColor",
      "He, she, or they": "pet.pronoun",
      "Illustration style": "pet.illustrationStyle",
      "The child's name": "child.name",
      "Their age": "child.ageBracket",
      "Their favorite thing to do": "memories.favoriteActivity",
      "Where they loved to sleep": "memories.sleepingSpot",
      "A favorite memory": "memories.favoriteMemory",
      "How they died": "toggles.deathType",
      "Where the book says they are now": "toggles.beliefFrame",
      "Other pets at home": "toggles.otherPetsInHome",
    },
  },
  "story-2-letter": {
    fixture: "fixtures/sample-story2-cat.json",
    pins: {
      "Their name": "pet.name",
      "What kind of animal": "pet.species",
      "How they look": "pet.breedColor",
      "Who the letter is written to": "owner.names",
      "A quirk or two that were only theirs": "memories.quirks",
      "A ritual that was the best part of the day": "memories.favoriteRitual",
      "The spots that were theirs": "memories.favoriteSpots",
      Nicknames: "memories.nicknames",
      "Together since…": "memories.dateAdopted",
      "The years you shared": "memories.datePassed",
      "How they died": "toggles.deathType",
      "Where the letter says they are now": "toggles.beliefFrame",
      "Is this for you, or a gift?": "toggles.giftFor",
      "Has another pet come home, or might one soon?": "toggles.newPet",
    },
  },
  "story-4-talk": {
    fixture: "fixtures/sample-story4-other.json",
    pins: {
      "Their name": "pet.name",
      "What kind of animal": "pet.species",
      "How they look": "pet.breedColor",
      "Who the letter is written to": "owner.names",
      "A quirk or two that are only theirs": "memories.quirks",
      "A ritual that's the best part of the day": "memories.favoriteRitual",
      "The spots that are theirs": "memories.favoriteSpots",
      "Their favorite thing to do": "memories.favoriteActivity",
      Nicknames: "memories.nicknames",
      "Together since…": "memories.dateAdopted",
      "Is your pet here with you, or is this a keepsake?":
        "toggles.livingOrMemorial",
      "Is this for you, or a gift?": "toggles.giftFor",
    },
  },
  "story-5-letter-to": {
    fixture: "fixtures/sample-story5-dog.json",
    pins: {
      "Their name": "pet.name",
      "What kind of animal": "pet.species",
      "How they look": "pet.breedColor",
      "Who signs the letter": "owner.names",
      "A daily ritual that was yours": "memories.favoriteRitual",
      "The spots that were theirs": "memories.favoriteSpots",
      "A quirk": "memories.quirks",
      "The last good day": "memories.lastGoodDay",
      "Something you're keeping": "memories.whatIKeep",
      "Nicknames · when adopted · when they passed": "memories.nicknames",
      "How they died": "toggles.deathType",
      "Where they are now": "toggles.beliefFrame",
    },
  },
  "story-6-tribute": {
    fixture: "fixtures/sample-story6-cat.json",
    pins: {
      "Their name": "pet.name",
      "What kind of animal": "pet.species",
      "How they look": "pet.breedColor",
      "Where they are in life right now": "memories.ageOrStage",
      "He, she, or they": "pet.pronoun",
      "Illustration style": "pet.illustrationStyle",
      "Who is this book dedicated by?": "owner.names",
      "Something you still do together": "memories.favoriteActivity",
      "A ritual that's the best part of the day": "memories.favoriteRitual",
      "What does your pet still love?": "memories.stillLoves",
      "A quirk or two that are only theirs": "memories.quirks",
      "The spots that are theirs": "memories.favoriteSpots",
      "Where do they love to sleep?": "memories.sleepingSpot",
      "A line for the dedication, if you'd like one": "memories.ownerMessage",
      Nicknames: "memories.nicknames",
      "Together since…": "memories.dateAdopted",
      "How should the book hold this time with your pet?":
        "toggles.transitionFrame",
      "Are there other pets at home?": "toggles.otherPetsInHome",
    },
  },
  "story-7-welcome": {
    fixture: "fixtures/sample-story7-bird.json",
    pins: {
      "Their name": "pet.name",
      "What kind of animal": "pet.species",
      "How they look": "pet.breedColor",
      "He, she, or they": "pet.pronoun",
      "Illustration style": "pet.illustrationStyle",
      "Who they came home to": "owner.names",
      "Their favorite thing in the world": "memories.favoriteActivity",
      "Where they love to sleep": "memories.sleepingSpot",
      "The day you brought them home": "memories.homecomingMemory",
      "A quirk that's all theirs": "memories.quirks",
      "A child in the family": "memories.childName",
      "Who else is in the home": "memories.familyMembers",
      Nicknames: "memories.nicknames",
      "A new arrival, or a gotcha-day anniversary": "toggles.occasion",
      "How many years ago did they come home?": "toggles.yearsHome",
      "Where they came from": "toggles.adoptionSource",
      "Their life stage": "toggles.lifeStage",
    },
  },
  "story-8-adventure": {
    fixture: "fixtures/sample-story8-dog.json",
    pins: {
      "Their name": "pet.name",
      "What kind of animal": "pet.species",
      "How they look": "pet.breedColor",
      "He, she, or they": "pet.pronoun",
      "Illustration style": "pet.illustrationStyle",
      "Their real-life superpower": "adventure.superpower",
      "Their favorite thing to do": "adventure.favoriteActivity",
      "A quirk or two that are only theirs": "adventure.quirks",
      "The child in the story": "adventure.childName",
      "A sidekick on the quest?": "adventure.sidekickName",
      Nicknames: "adventure.nicknames",
      "Which adventure?": "toggles.adventureTheme",
      "Does the child adventure along, or hear the legend?": "toggles.heroCount",
      "What reading level fits the child?": "toggles.childAgeBracket",
    },
  },
  "story-9-newbaby": {
    fixture: "fixtures/sample-story9-rabbit.json",
    pins: {
      "Their name": "pet.name",
      "What kind of animal": "pet.species",
      "How they look": "pet.breedColor",
      "He, she, or they": "pet.pronoun",
      "Illustration style": "pet.illustrationStyle",
      "Your family name, as the dedication should read": "owner.names",
      "Their favorite thing in the world": "memories.favoriteActivity",
      "Where they curl up at the end of the day": "memories.sleepingSpot",
      "A quirk or two that are only theirs": "memories.quirks",
      "The new baby's name, if you have one": "babyName",
      "When is the baby arriving?": "babyArrival",
      Nicknames: "memories.nicknames",
      "Is the baby on the way, or already here?": "toggles.babyStatus",
      "Are there other pets at home?": "toggles.otherPetsInHome",
    },
  },
};

/** Read a dotted path out of a parsed JSON object. */
function readPath(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function loadFixture(rel: string): unknown {
  return JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
}

/** Flatten a title's groups into a label → example lookup. */
function exampleByLabel(productId: string): Map<string, string | undefined> {
  const bq = getBookQuestions(productId);
  const map = new Map<string, string | undefined>();
  for (const group of bq?.groups ?? []) {
    for (const item of group.items) {
      map.set(item.label, item.example);
    }
  }
  return map;
}

describe("book-questions example ⇄ fixture pinning", () => {
  for (const [productId, { fixture, pins }] of Object.entries(FIXTURE_PINS)) {
    describe(productId, () => {
      const data = loadFixture(fixture);
      const examples = exampleByLabel(productId);

      for (const [label, fieldPath] of Object.entries(pins)) {
        it(`"${label}" matches ${fieldPath}`, () => {
          const example = examples.get(label);
          const fixtureValue = readPath(data, fieldPath);
          // Both must be present — the pin is meaningless if either side is blank.
          expect(example, `example for "${label}"`).toBeTypeOf("string");
          expect(fixtureValue, `${fieldPath} in ${fixture}`).toBeTypeOf("string");
          expect(example).toBe(fixtureValue);
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Coverage — every product has questions, no orphan entries
// ---------------------------------------------------------------------------

describe("book-questions coverage", () => {
  const productIds = new Set(getProducts().map((p) => p.productId));

  it("every catalog product has a getBookQuestions entry", () => {
    const missing = [...productIds].filter((id) => !getBookQuestions(id));
    expect(missing, "products without a questionnaire").toEqual([]);
  });

  it("every book-questions entry maps to a real product (no orphans)", () => {
    const orphans = getAllBookQuestions()
      .map((q) => q.productId)
      .filter((id) => !productIds.has(id));
    expect(orphans, "questionnaires with no matching product").toEqual([]);
  });

  it("every entry has at least one group with at least one item", () => {
    for (const q of getAllBookQuestions()) {
      expect(q.groups.length, `${q.productId} groups`).toBeGreaterThan(0);
      for (const group of q.groups) {
        expect(group.items.length, `${q.productId} / ${group.title}`).toBeGreaterThan(0);
      }
    }
  });

  it("every entry has a FIXTURE_PINS map (so its examples are anti-drift pinned)", () => {
    const unpinned = getAllBookQuestions()
      .map((q) => q.productId)
      .filter((id) => !FIXTURE_PINS[id]);
    expect(unpinned, "questionnaires without fixture pins").toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// sourcePhoto coverage — every product sets it and the asset exists on disk
// ---------------------------------------------------------------------------

describe("Product.sourcePhoto coverage", () => {
  for (const product of getProducts()) {
    it(`${product.productId} sets sourcePhoto and the asset exists`, () => {
      expect(product.sourcePhoto, `${product.productId}.sourcePhoto`).toBeTypeOf(
        "string",
      );
      const rel = product.sourcePhoto!.replace(/^\//, "");
      const onDisk = path.join(ROOT, "public", rel);
      expect(
        readFileSync(onDisk).length,
        `${onDisk} should be a non-empty file`,
      ).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Client-safety — book-questions.ts pulls in no engine module
// ---------------------------------------------------------------------------
//
// The public storefront's static build will import this module (PR-3). It must
// stay engine-free exactly like lib/catalog/products.ts. The shared boundary test
// (lib/runtime/surface.boundary.test.ts) only walks modules actually reachable
// from a public page — book-questions.ts is dead code until PR-3 wires it in — so
// we walk ITS import closure here and assert no forbidden engine module/package
// appears. Mirrors the boundary test's checks at module scope.

const FORBIDDEN_LOCAL = [
  "lib/ai/",
  "lib/pdf/render",
  "lib/pdf/template",
  "lib/supabase/server",
  "lib/session/disk",
];
const FORBIDDEN_PACKAGES = ["puppeteer", "openai", "@supabase/supabase-js"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

function readSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const fromRe = /(?:import|export)\s+(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/g;
  const dynamicRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const re of [fromRe, dynamicRe]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function resolveLocal(specifier: string, fromFile: string): string | null {
  let abs: string;
  if (specifier.startsWith("@/")) {
    abs = path.join(ROOT, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    abs = path.resolve(ROOT, path.dirname(fromFile), specifier);
  } else {
    return null;
  }
  for (const ext of ["", ...EXTENSIONS]) {
    const candidate = abs + ext;
    try {
      if (readFileSync(candidate)) return path.relative(ROOT, candidate);
    } catch {
      // not a plain file at this extension — keep trying
    }
  }
  for (const ext of EXTENSIONS) {
    const indexed = path.join(abs, `index${ext}`);
    try {
      if (readFileSync(indexed)) return path.relative(ROOT, indexed);
    } catch {
      // no index file — keep trying
    }
  }
  return null;
}

function packageRoot(specifier: string): string {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return name ? `${scope}/${name}` : scope;
  }
  return specifier.split("/")[0];
}

function importClosure(entry: string): {
  modules: Set<string>;
  packages: Set<string>;
} {
  const modules = new Set<string>();
  const packages = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (modules.has(file)) continue;
    modules.add(file);
    let source: string;
    try {
      source = readFileSync(path.join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    for (const specifier of readSpecifiers(source)) {
      const resolved = resolveLocal(specifier, file);
      if (resolved) {
        if (!modules.has(resolved)) queue.push(resolved);
      } else if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
        packages.add(packageRoot(specifier));
      }
    }
  }
  return { modules, packages };
}

describe("book-questions client-safety", () => {
  const closure = importClosure("lib/catalog/book-questions.ts");

  it("walks a non-trivial closure", () => {
    expect(closure.modules.has("lib/catalog/book-questions.ts")).toBe(true);
  });

  it("never imports an engine source module", () => {
    const leaked: string[] = [];
    for (const mod of closure.modules) {
      for (const forbidden of FORBIDDEN_LOCAL) {
        if (mod.includes(forbidden)) leaked.push(`${mod} (matches "${forbidden}")`);
      }
    }
    expect(leaked, "book-questions graph imports engine module(s)").toEqual([]);
  });

  it("never pulls in an engine package", () => {
    const leaked = FORBIDDEN_PACKAGES.filter((pkg) => closure.packages.has(pkg));
    expect(leaked, "book-questions graph imports engine package(s)").toEqual([]);
  });
});
