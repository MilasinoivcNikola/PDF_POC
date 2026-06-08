// POST /api/update-text — let the parent correct THEIR OWN free-text input (or a
// name) from the preview (the `preview-text-edit` feature, Option A: edit inputs
// → re-merge). Body: `{ id, field, value }`.
//
// This is the regenerate-illustration route MINUS the AI call: validate the id
// (traversal-guarded) and the field (a known editable field), reject a blanked
// required field BEFORE writing, write the cleaned value into the session, then
// re-run `resolveStory` (defense in depth — a MergeError is rejected without a
// write), persist, and return the freshly re-resolved `pages` so the client can
// swap its whole book state in place (global name edits propagate book-wide).
//
// The next PDF download reflects the edit automatically: /api/render-pdf re-reads
// the session from disk, so there is no template/render change here. House JSON
// shape throughout.

import { NextResponse } from "next/server";

import { readSession, writeSession } from "@/lib/session/disk";
import { isSafeSessionId } from "@/lib/ai/paths";
import { resolveStory } from "@/lib/story/variants";
import { MergeError } from "@/lib/story/merge";
import {
  type EditableField,
  isBlankAfterClean,
  isEditableField,
  isRequiredField,
  setSessionField,
} from "@/lib/story/editable-fields";

/** Read `{ id, field, value }`, narrowing `field` to a known editable field. */
function readArgs(
  body: unknown,
): { id: string; field: EditableField; value: string } | null {
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
    typeof value !== "string" ||
    !isEditableField(field)
  ) {
    return null;
  }
  return { id, field, value };
}

export async function POST(request: Request): Promise<Response> {
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

  // A blanked required field would make re-merge throw; reject before any write.
  if (isRequiredField(args.field) && isBlankAfterClean(args.value)) {
    return NextResponse.json(
      { ok: false, error: "field_required" },
      { status: 400 },
    );
  }

  const session = await readSession(args.id);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "session_not_found" },
      { status: 404 },
    );
  }

  const updated = setSessionField(session, args.field, args.value);

  // Re-resolve BEFORE writing: a MergeError (defense in depth — the required-field
  // guard above should already prevent it) must not corrupt the on-disk session.
  let pages;
  try {
    pages = resolveStory(updated);
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
  // its whole book state — a name edit changes every page.
  return NextResponse.json({
    ok: true,
    field: args.field,
    pages,
    petName: updated.pet.name,
    childName: updated.child.name,
  });
}
