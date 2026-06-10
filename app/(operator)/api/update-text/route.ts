// POST /api/update-text — let the parent/owner correct THEIR OWN free-text input
// (or a name) from the preview (the `preview-text-edit` feature, Option A: edit
// inputs → re-merge). Body: `{ id, field, value }`.
//
// This is the regenerate-illustration route MINUS the AI call: validate the id
// (traversal-guarded), READ the session (so the product's editable-field allowlist
// is known — the `field` allowlist is per-story), validate the field + reject a
// blanked required field BEFORE writing, write the cleaned value into the session,
// then re-resolve via the registry (defense in depth — a MergeError is rejected
// without a write), persist, and return the freshly re-resolved `pages` so the
// client can swap its whole book state in place (global name edits propagate).
//
// The next PDF download reflects the edit automatically: /api/render-pdf re-reads
// the session from disk, so there is no template/render change here. House JSON
// shape throughout.

import { NextResponse } from "next/server";

import { readSession, writeSession } from "@/lib/session/disk";
import { isSafeSessionId } from "@/lib/ai/paths";
import { getStory } from "@/lib/story/registry";
import { MergeError } from "@/lib/story/merge";
import { isBlankAfterClean } from "@/lib/story/editable-fields";
import { assertOperator } from "@/lib/runtime/surface";

/** Read `{ id, field, value }` as strings — field is NOT narrowed to an editable
 *  field here: the per-story allowlist isn't known until the session is read. */
function readArgs(
  body: unknown,
): { id: string; field: string; value: string } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const id = record.id ?? record.sessionId;
  const field = record.field;
  const value = record.value;
  if (
    typeof id !== "string" ||
    typeof field !== "string" ||
    typeof value !== "string"
  ) {
    return null;
  }
  return { id, field, value };
}

export async function POST(request: Request): Promise<Response> {
  const gate = assertOperator();
  if (gate) return gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const args = readArgs(body);
  if (!args || !isSafeSessionId(args.id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400 },
    );
  }

  // Read FIRST: the editable-field allowlist + the resolver are per-story, so we
  // can't validate the field until we know the product. Reading is not a write,
  // so the "no write on bad input" guarantee still holds.
  const session = await readSession(args.id);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "session_not_found" },
      { status: 404 },
    );
  }

  const storyType = session.storyType ?? "story-1";
  const story = getStory(storyType);
  const { editable } = story;

  // The field must be one of THIS product's editable fields (the per-story
  // allowlist — no arbitrary session-field writes).
  if (!editable.isEditableField(args.field)) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400 },
    );
  }

  // A blanked required field would make re-merge throw; reject before any write.
  if (editable.isRequiredField(args.field) && isBlankAfterClean(args.value)) {
    return NextResponse.json(
      { ok: false, error: "field_required" },
      { status: 400 },
    );
  }

  // `setSessionField` returns the cross-product union; the impl already narrowed
  // to the right product internally (via the registry seam). The registry's
  // `resolve`/`writeSession` are typed on `StorySession` (the back-compat default)
  // and each impl re-narrows, so we hand them the union as a `StorySession`.
  const updated = editable.setSessionField(session, args.field, args.value) as typeof session;

  // Re-resolve via the registry BEFORE writing: a MergeError (defense in depth —
  // the required-field guard above should already prevent it) must not corrupt the
  // on-disk session.
  let pages;
  try {
    pages = story.resolve(updated);
  } catch (error) {
    if (error instanceof MergeError) {
      return NextResponse.json(
        { ok: false, error: "story_incomplete" },
        { status: 422 },
      );
    }
    console.error(`Update-text resolve failed for ${args.id}/${args.field}:`, error);
    return NextResponse.json(
      { ok: false, error: "update_failed" },
      { status: 500 },
    );
  }

  try {
    await writeSession(updated);
  } catch {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  // Return the re-resolved pages + the (cleaned) names so the client refreshes
  // its whole book state — a name edit changes every page. Story 2 has no child.
  const childName = storyType === "story-1" ? updated.child.name : undefined;

  return NextResponse.json({
    ok: true,
    field: args.field,
    pages,
    petName: updated.pet.name,
    childName,
  });
}
