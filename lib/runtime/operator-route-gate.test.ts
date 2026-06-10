import { describe, it, expect, vi, beforeEach } from "vitest";

// Integration guard for PR-03: an operator API route returns 404 under a public
// deploy (DEPLOY_TARGET=public) — without ever touching its engine/disk work,
// because assertOperator() short-circuits before the handler body runs. We prove
// it on /api/upload (the lightest operator route) and gate the env BEFORE the
// route module is imported, since the route reads the surface per request via
// assertOperator(). The disk write is mocked so a regression that slipped past the
// gate would still write nothing here.

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

const ORIGINAL = process.env.DEPLOY_TARGET;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("operator route under public mode", () => {
  it("returns 404 from /api/upload when DEPLOY_TARGET=public", async () => {
    process.env.DEPLOY_TARGET = "public";
    try {
      const { POST } = await import(
        "@/app/(operator)/api/upload/route"
      );
      // A well-formed multipart request that WOULD succeed on the operator surface.
      const form = new FormData();
      form.append(
        "photo",
        new File([new Uint8Array([1, 2, 3])], "p.png", { type: "image/png" }),
      );
      const response = await POST(
        new Request("http://localhost/api/upload", {
          method: "POST",
          body: form,
        }),
      );
      expect(response.status).toBe(404);

      const fs = await import("node:fs/promises");
      expect(fs.writeFile).not.toHaveBeenCalled();
    } finally {
      if (ORIGINAL === undefined) {
        delete process.env.DEPLOY_TARGET;
      } else {
        process.env.DEPLOY_TARGET = ORIGINAL;
      }
    }
  });
});
