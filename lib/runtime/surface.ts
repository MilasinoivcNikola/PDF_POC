// The deploy-surface env gate (commerce PR-03).
//
// One codebase, two run modes (see context/commerce-roadmap.md, "two deployments
// of one codebase"):
//   - "operator" — the LOCAL surface. Holds the OpenAI key + Puppeteer + the
//     generation engine + the service-role Supabase client. The wizard, generation
//     orchestration, preview, PDF render, and the admin/review queue all live here.
//   - "public"   — the always-on Vercel surface. The storefront / order intake /
//     delivery pages. It must NEVER be able to generate, so the operator API routes
//     404 under it and (the load-bearing guard) the public route graph never even
//     transitively imports the engine. See lib/runtime/surface.boundary.test.ts.
//
// The most important security boundary in the whole build: a regression here leaks
// the OpenAI / service-role key path to a public host.
//
// DEFAULT = "operator" (fail-safe for local dev). A developer running `npm run dev`
// with no extra env gets today's full behaviour — the operator surface. The public
// Vercel build is the one that opts IN to the locked-down mode by setting
// `DEPLOY_TARGET=public` explicitly (see vercel.json). Defaulting the other way
// would silently break local `npm run dev` for anyone who forgot to set the var,
// which is the common case; an accidental "public" surface deployed without the
// env set would only ever be MORE restrictive, never less — so defaulting to
// "operator" can never widen the public surface's exposure.

import process from "node:process";

/** The two deploy surfaces one build can run as. */
export type DeployTarget = "public" | "operator";

/**
 * Resolve the active deploy surface from `DEPLOY_TARGET`. Anything other than the
 * explicit string "public" is treated as "operator" — only an intentional
 * `DEPLOY_TARGET=public` locks the surface down (see the default rationale above).
 */
export function deployTarget(): DeployTarget {
  return process.env.DEPLOY_TARGET === "public" ? "public" : "operator";
}

/** True when running as the local operator surface (the default). */
export function isOperator(): boolean {
  return deployTarget() === "operator";
}

/** True when running as the locked-down public surface. */
export function isPublic(): boolean {
  return deployTarget() === "public";
}

/**
 * Guard for operator-only API Route Handlers. Returns a 404 `Response` to return
 * early when running under the public surface, or `null` when the request is
 * allowed (operator surface) so the handler proceeds. Returning a plain 404
 * Response — rather than calling `notFound()` (which is for rendering page
 * segments, not Route Handlers) — keeps an operator endpoint indistinguishable
 * from a non-existent one on a public deploy.
 *
 * Usage at the top of an operator route handler:
 *   const gate = assertOperator();
 *   if (gate) return gate;
 */
export function assertOperator(): Response | null {
  if (isPublic()) {
    return new Response("Not Found", { status: 404 });
  }
  return null;
}
