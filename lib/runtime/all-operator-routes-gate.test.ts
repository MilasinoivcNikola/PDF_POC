import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

// THE OPERATOR-SURFACE COVERAGE GUARD of commerce PR-03.
//
// assertOperator() is the first statement of every operator API route handler, so
// each one 404s under a public deploy (DEPLOY_TARGET=public) before its engine/disk
// body runs. operator-route-gate.test.ts proves that on /api/upload alone — which
// would NOT catch a future PR that adds an operator route and forgets the gate. That
// missing gate is exactly the security regression this PR exists to prevent: an
// ungated engine route shipped to the public Vercel surface.
//
// This test is table-driven over EVERY operator API route module and asserts each
// exported HTTP verb returns 404 under public mode. The table is checked against the
// route files actually present on disk (see "covers every operator API route file"),
// so adding a route without listing it here fails the suite — forcing the author to
// register it and confirm it 404s.
//
// Side-effect sinks are mocked so a regression that slipped PAST the gate still spends
// no OpenAI credits and writes nothing to ./uploads / ./generated / ./sessions: the
// two disk sinks (node:fs/promises, node:fs) are inert, getOpenAI() throws if ever
// reached, and puppeteer.launch() throws if ever reached. Under the expected (gated)
// path none of these is touched — the 404 returns first.

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("node:fs", () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

// The OpenAI network sink (lib/ai/generate → lib/ai/client.getOpenAI). If a gate
// regression ever let a handler reach generation, this throws instead of spending
// real credits.
vi.mock("@/lib/ai/client", () => ({
  getOpenAI: () => {
    throw new Error("getOpenAI() must not be called under the operator-route gate test");
  },
  extensionToMime: () => "image/png",
  imageToDataUrl: async () => "data:image/png;base64,",
  photoToFile: async () => {
    throw new Error("photoToFile() must not be called under the operator-route gate test");
  },
}));

// The Puppeteer/Chrome sink (lib/pdf/render). Launching Chrome from a unit test would
// be slow and is never expected here — the gate returns before render runs.
vi.mock("puppeteer", () => ({
  default: {
    launch: () => {
      throw new Error("puppeteer.launch() must not be called under the operator-route gate test");
    },
  },
}));

// Methods we treat as HTTP route handlers. A route module is allowed to export any
// subset; the table below records which it actually exports, and the suite asserts
// 404 for each.
type Verb = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface OperatorRoute {
  /** Route directory under app/(operator)/api/ (the /api/<name> the route serves). */
  readonly name: string;
  /** HTTP verbs the module exports as Route Handlers. */
  readonly verbs: readonly Verb[];
  /** Lazy importer — a fully-static specifier so Vite analyses it (no warning). */
  readonly load: () => Promise<Record<string, unknown>>;
}

// Every operator API route handler and the verb(s) it exports. Each `load` is a
// fully-literal dynamic import (Vite's dynamic-import-vars plugin can't span the
// nested test-ai/ path and warns on a templated specifier, so we keep them static).
// Kept in lockstep with the files on disk by the "covers every operator API route
// file" assertion below.
const cast = (p: Promise<unknown>) => p as Promise<Record<string, unknown>>;
const OPERATOR_ROUTES: readonly OperatorRoute[] = [
  {
    name: "admin/approve",
    verbs: ["POST"],
    load: () => cast(import("../../app/(operator)/api/admin/approve/route")),
  },
  {
    name: "admin/auth",
    verbs: ["POST", "DELETE"],
    load: () => cast(import("../../app/(operator)/api/admin/auth/route")),
  },
  {
    name: "admin/requeue",
    verbs: ["POST"],
    load: () => cast(import("../../app/(operator)/api/admin/requeue/route")),
  },
  {
    name: "generate-illustrations",
    verbs: ["POST", "GET"],
    load: () => cast(import("../../app/(operator)/api/generate-illustrations/route")),
  },
  {
    name: "preview",
    verbs: ["GET"],
    load: () => cast(import("../../app/(operator)/api/preview/route")),
  },
  {
    name: "regenerate-illustration",
    verbs: ["POST"],
    load: () => cast(import("../../app/(operator)/api/regenerate-illustration/route")),
  },
  {
    name: "render-pdf",
    verbs: ["POST"],
    load: () => cast(import("../../app/(operator)/api/render-pdf/route")),
  },
  {
    name: "session",
    verbs: ["POST"],
    load: () => cast(import("../../app/(operator)/api/session/route")),
  },
  {
    name: "test-ai/generate-reference",
    verbs: ["POST"],
    load: () => cast(import("../../app/(operator)/api/test-ai/generate-reference/route")),
  },
  {
    name: "update-text",
    verbs: ["POST"],
    load: () => cast(import("../../app/(operator)/api/update-text/route")),
  },
  {
    name: "upload",
    verbs: ["POST"],
    load: () => cast(import("../../app/(operator)/api/upload/route")),
  },
];

/**
 * A minimal request that WOULD be accepted on the operator surface for the given
 * verb — so a 404 must come from the gate, not from input validation. GET routes
 * read query params; the engine-touching POST routes read a JSON or multipart body.
 */
function requestFor(name: string, verb: Verb): Request {
  const url = `http://localhost/api/${name}`;
  if (verb === "GET") {
    // The GET routes (generate-illustrations status, preview) take ?id=…
    return new Request(`${url}?id=abc123`);
  }
  if (name === "upload") {
    const form = new FormData();
    form.append(
      "photo",
      new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }),
    );
    return new Request(url, { method: verb, body: form });
  }
  // The JSON POST routes — a plausible body that would pass parsing.
  return new Request(url, {
    method: verb,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "abc123", page: "page-3", field: "petName", value: "x" }),
  });
}

const ORIGINAL = process.env.DEPLOY_TARGET;

beforeEach(() => {
  vi.clearAllMocks();
  // The gate reads the surface per request; set it before importing each module so
  // the public lockdown is unambiguous (matches operator-route-gate.test.ts).
  process.env.DEPLOY_TARGET = "public";
});

afterAll(() => {
  if (ORIGINAL === undefined) {
    delete process.env.DEPLOY_TARGET;
  } else {
    process.env.DEPLOY_TARGET = ORIGINAL;
  }
});

describe("every operator API route 404s under DEPLOY_TARGET=public", () => {
  for (const route of OPERATOR_ROUTES) {
    for (const verb of route.verbs) {
      it(`${verb} /api/${route.name} returns 404`, async () => {
        const mod = await route.load();
        const handler = mod[verb];
        expect(handler, `/api/${route.name} should export ${verb}`).toBeTypeOf(
          "function",
        );

        const response = await (handler as (r: Request) => Promise<Response>)(
          requestFor(route.name, verb),
        );
        expect(response.status).toBe(404);

        // And the gate short-circuited BEFORE the handler body: no disk write
        // happened. Mocks are reset per test (beforeEach), so this is scoped to this
        // one handler's run — a regression that dropped the gate would proceed into
        // readSession/writeSession (see the non-vacuity check) and trip these.
        const fsp = await import("node:fs/promises");
        const fs = await import("node:fs");
        expect(fsp.writeFile).not.toHaveBeenCalled();
        expect(fsp.mkdir).not.toHaveBeenCalled();
        expect(
          fs.promises.writeFile as ReturnType<typeof vi.fn>,
        ).not.toHaveBeenCalled();
      });
    }
  }
});

describe("the gate table is non-vacuous", () => {
  it("covers every operator API route file on disk", async () => {
    // node:fs is mocked above, so pull the real implementations for this
    // filesystem audit rather than the inert mock.
    const realFs = await vi.importActual<typeof import("node:fs")>("node:fs");
    const realPath = await vi.importActual<typeof import("node:path")>("node:path");
    const realUrl = await vi.importActual<typeof import("node:url")>("node:url");

    const root = realUrl.fileURLToPath(new URL("../../", import.meta.url));
    const apiDir = realPath.join(root, "app/(operator)/api");

    // Recursively collect every route.ts under app/(operator)/api, recorded as the
    // /api/<name> the route serves (the dir path relative to api/, sans /route.ts).
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of realFs.readdirSync(dir, { withFileTypes: true })) {
        const full = realPath.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name === "route.ts") {
          found.push(realPath.relative(apiDir, realPath.dirname(full)));
        }
      }
    };
    walk(apiDir);

    const tabled = OPERATOR_ROUTES.map((r) => r.name).sort();
    expect(found.sort()).toEqual(tabled);
  });
});
