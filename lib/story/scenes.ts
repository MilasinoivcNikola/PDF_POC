// The Story-1 illustration slot identity — the page ids that carry a generated
// scene illustration, plus the manifest `SceneId` type.
//
// This lives in lib/story/ (not lib/ai/) on purpose: it is PURE data (a list of
// page ids + a type alias) consumed by both the engine (lib/ai/prompts.ts,
// lib/ai/generate.ts) AND the client-safe catalog/registry chain
// (lib/story/story-1.ts → lib/story/registry.ts → lib/catalog/products.ts →
// the public storefront). Keeping it in lib/story/ means the public route graph
// reaches this neutral module instead of a `lib/ai/*` engine module — so the
// public/operator boundary guard (lib/runtime/surface.boundary.test.ts) can keep
// banning `lib/ai/*` from the public closure outright. lib/ai/prompts.ts
// re-exports both symbols so every existing `@/lib/ai/prompts` import is
// unchanged.

import type { PageId } from "@/lib/story/master-text";

/**
 * A slot in the generated-image manifest. "reference" is the locked reference
 * illustration (feature 06); the rest map 1:1 to book pages that carry art. The
 * set matches the scene list shown in prototypes/generating.html — every page
 * with an illustration brief except the back cover (a writing page, no scene).
 */
export type SceneId = "reference" | PageId;

/**
 * The page slots that get a generated scene illustration, in book order. Cover
 * + pages 1–12 — i.e. every illustrated page. The back cover is intentionally
 * excluded: its brief is a decorative border around a writing space, not a pet
 * scene, so the template renders it without AI art.
 */
export const SCENE_PAGE_IDS: readonly PageId[] = [
  "cover",
  "page-1",
  "page-2",
  "page-3",
  "page-4",
  "page-5",
  "page-6",
  "page-7",
  "page-8",
  "page-9",
  "page-10",
  "page-11",
  "page-12",
];
