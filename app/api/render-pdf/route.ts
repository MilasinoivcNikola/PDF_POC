// POST /api/render-pdf — render a finalized session's book to a print-quality
// Letter PDF and stream it back as an HTTP download (feature 10).
//
// Body: `{ id }` (or `{ sessionId }`). The route reads the session from disk,
// builds the per-page image map from its manifest, and calls the EXISTING
// `renderStoryPdf` (feature 05) — it does NOT reimplement Puppeteer or touch the
// print template. The bytes are returned with
//   Content-Type: application/pdf
//   Content-Disposition: attachment; filename="Saying-Goodbye-to-[PET_NAME].pdf"
// using the existing `storyPdfFilename` helper, so the browser downloads a
// correctly-named file. The byte length is exposed via Content-Length so the
// preview's download meta ("filename · size") can show the real size.
//
// Errors use the house JSON shape ({ ok:false, error:"snake_case" }); the id is
// validated with the shared traversal guard before any disk access.

import { NextResponse } from "next/server";
import { readSession } from "@/lib/session/disk";
import { isSafeSessionId } from "@/lib/ai/paths";
import { manifestToImageMap } from "@/lib/ai/generate";
import { renderStoryPdf, storyPdfFilename } from "@/lib/pdf/render";
import { MergeError } from "@/lib/story/merge";

/** Pull a string id from `{ id }` or `{ sessionId }` request bodies. */
function readId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const raw = record.id ?? record.sessionId;
  return typeof raw === "string" ? raw : null;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const id = readId(body);
  if (!id || !isSafeSessionId(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_session_id" },
      { status: 400 },
    );
  }

  const session = await readSession(id);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "session_not_found" },
      { status: 404 },
    );
  }

  const images = await manifestToImageMap(session.images);

  let pdf: Buffer;
  try {
    pdf = await renderStoryPdf(session, images);
  } catch (error) {
    // A session missing a merge field can't be rendered; report it cleanly.
    if (error instanceof MergeError) {
      return NextResponse.json(
        { ok: false, error: "story_incomplete" },
        { status: 422 },
      );
    }
    console.error(`PDF render failed for session ${id}:`, error);
    return NextResponse.json(
      { ok: false, error: "render_failed" },
      { status: 500 },
    );
  }

  const filename = storyPdfFilename(session.pet.name);

  // Stream the bytes as a download. `new Uint8Array(pdf)` gives the Response a
  // plain ArrayBuffer view (a Node Buffer is a valid BodyInit, but the typed
  // array is the portable contract).
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
    },
  });
}
