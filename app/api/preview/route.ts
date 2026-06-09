// GET /api/preview?id=… — the data the in-browser book preview (feature 10)
// renders. The preview page is a client component (it needs `useWizard` for the
// session id), so it can't itself read the session JSON or the generated PNGs off
// disk — those are server-only (fs). This endpoint does that work and returns a
// JSON payload the client renders with the SHARED per-page template (lib/pdf/pages):
//
//   - `pages`  : the fully-resolved story (feature 03's `resolveStory`) — the SAME
//                resolved copy the PDF renders, so screen and PDF never diverge.
//   - `images` : page id → a self-contained `data:image/png;base64,…` URL built
//                from the session's manifest (manifestToImageMap), so the preview
//                shows the REAL generated illustrations (a missing slot is simply
//                omitted, and the template falls back to placeholder art).
//   - `petName`/`childName`: small bits the preview header / download CTA use.
//   - `fields`: the current RAW value of each editable field (preview-text-edit
//                feature) so the inline "edit your own words" editors pre-fill.
//
// House JSON shape throughout. The id is validated with the same traversal guard
// the rest of the app uses before any disk access.

import { NextResponse } from "next/server";
import { readSession } from "@/lib/session/disk";
import { isSafeSessionId } from "@/lib/ai/paths";
import { manifestToImageMap } from "@/lib/ai/generate";
import { getStory } from "@/lib/story/registry";
import { MergeError } from "@/lib/story/merge";
import {
  EDITABLE_FIELDS,
  type EditableField,
  getSessionFieldValue,
} from "@/lib/story/editable-fields";

export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");
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

  let pages;
  try {
    pages = getStory(session.storyType ?? "story-1").resolve(session);
  } catch (error) {
    // A session that can't resolve (missing merge field) shouldn't reach preview,
    // but report it cleanly rather than 500-ing with a stack trace.
    if (error instanceof MergeError) {
      return NextResponse.json(
        { ok: false, error: "story_incomplete" },
        { status: 422 },
      );
    }
    // Any other resolve failure: report cleanly in the house shape rather than
    // surfacing an unstyled 500 with a stack trace.
    console.error(`Preview resolve failed for session ${id}:`, error);
    return NextResponse.json(
      { ok: false, error: "preview_failed" },
      { status: 500 },
    );
  }

  const images = await manifestToImageMap(session.images);

  // The current raw value of every editable field, so the inline editors on the
  // preview pre-fill with what the parent actually typed.
  const fields = Object.fromEntries(
    EDITABLE_FIELDS.map((field) => [field, getSessionFieldValue(session, field)]),
  ) as Record<EditableField, string>;

  return NextResponse.json({
    ok: true,
    pages,
    images,
    petName: session.pet.name,
    childName: session.child.name,
    fields,
  });
}
