// POST /api/upload — receive a pet photo (multipart/form-data), validate it, and
// save it under ./uploads/[session-id]/. Returns the saved path so the caller can
// hand it to generateReferenceIllustration() (feature 06) and store it as the
// session's pet.photo reference.
//
// Validation happens at the boundary even though the app is local-only — it keeps
// the errors readable and the code honest. The fancy drag-drop UI is feature 08;
// here a minimal page or curl is enough.

import { NextResponse } from "next/server";
import { createSessionId } from "@/lib/session/storage";
import { isSafeSessionId } from "@/lib/ai/paths";

/** Accepted upload MIME types. */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Map MIME type → saved-file extension. */
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** Max upload size: 10 MB. */
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_form_data" },
      { status: 400 },
    );
  }

  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "missing_photo" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json(
      { ok: false, error: "unsupported_type" },
      { status: 415 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "empty_file" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "file_too_large" },
      { status: 413 },
    );
  }

  // Reuse an existing session id if the caller supplied one (so the upload ties
  // to an in-progress draft); otherwise mint a fresh one. The provided id becomes
  // a directory name, so it must pass the `[A-Za-z0-9_-]` allowlist (the shape
  // `createSessionId()` already yields) — a value like "../../tmp/evil" would
  // otherwise escape ./uploads. On a bad id we silently fall back to a safe fresh
  // one rather than failing the upload over it.
  const provided = form.get("sessionId");
  const sessionId =
    typeof provided === "string" && isSafeSessionId(provided.trim())
      ? provided.trim()
      : createSessionId();

  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), "uploads", sessionId);
  const ext = EXTENSION_BY_TYPE[file.type];
  const filePath = path.join(dir, `photo.${ext}`);

  try {
    await fs.mkdir(dir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, bytes);
  } catch {
    return NextResponse.json(
      { ok: false, error: "write_failed" },
      { status: 500 },
    );
  }

  // Path is relative to the project root so it round-trips into session JSON.
  const relativePath = path.join("uploads", sessionId, `photo.${ext}`);
  return NextResponse.json({
    ok: true,
    sessionId,
    path: relativePath,
  });
}
