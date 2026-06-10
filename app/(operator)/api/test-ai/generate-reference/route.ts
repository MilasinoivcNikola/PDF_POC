// POST /api/test-ai/generate-reference — DEV-ONLY scaffold endpoint.
//
// Backs app/test-ai/page.tsx: takes an already-uploaded photo path (from
// /api/upload), runs generateReferenceIllustration() server-side at the Low tier,
// saves the result to ./generated/[session-id]/reference.png, and returns it as a
// data URL so the dev page can show it inline.
//
// This is NOT part of the real wizard. It calls the PAID OpenAI API when hit, so
// it is gated to development only. Production/real generation orchestration is
// feature 07.

import { NextResponse } from "next/server";
import type { IllustrationStyle } from "@/lib/session/types";
import { generateReferenceIllustration, type Quality } from "@/lib/ai/generate";
import { isSafeSessionId, resolveUnder } from "@/lib/ai/paths";
import { assertOperator } from "@/lib/runtime/surface";

const STYLES: readonly IllustrationStyle[] = ["watercolor", "storybook", "pencil"];
const QUALITIES: readonly Quality[] = ["low", "medium", "high"];

export async function POST(request: Request): Promise<Response> {
  // Operator-surface guard (PR-03) layered ahead of the existing dev-only gate:
  // 404 under a public deploy, then 404 in any production build.
  const gate = assertOperator();
  if (gate) return gate;

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "not_available_in_production" },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const {
    sessionId,
    photoPath,
    petDescription,
    style,
    quality,
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return NextResponse.json({ ok: false, error: "missing_session_id" }, { status: 400 });
  }
  // The id becomes a directory name under ./generated — guard it against
  // traversal (e.g. "../../tmp/evil") before it reaches any filesystem path.
  if (!isSafeSessionId(sessionId.trim())) {
    return NextResponse.json({ ok: false, error: "invalid_session" }, { status: 400 });
  }
  if (typeof photoPath !== "string" || !photoPath.trim()) {
    return NextResponse.json({ ok: false, error: "missing_photo_path" }, { status: 400 });
  }
  const chosenStyle: IllustrationStyle = STYLES.includes(style as IllustrationStyle)
    ? (style as IllustrationStyle)
    : "watercolor";
  const chosenQuality: Quality = QUALITIES.includes(quality as Quality)
    ? (quality as Quality)
    : "low";
  const description = typeof petDescription === "string" ? petDescription : "";

  const path = await import("node:path");
  const fs = await import("node:fs/promises");

  // Resolve the photo path strictly inside ./uploads, never outside it. A true
  // directory-boundary check (not a string prefix) so siblings like
  // `uploads_secrets/` can't slip through on the shared "uploads" prefix.
  const root = process.cwd();
  const resolvedPhoto = resolveUnder(root, "uploads", photoPath);
  if (!resolvedPhoto) {
    return NextResponse.json({ ok: false, error: "invalid_photo_path" }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = await generateReferenceIllustration(
      resolvedPhoto,
      description,
      chosenStyle,
      chosenQuality,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "generation_failed";
    return NextResponse.json({ ok: false, error: "generation_failed", message }, { status: 500 });
  }

  const outDir = path.join(root, "generated", sessionId.trim());
  const outPath = path.join(outDir, "reference.png");
  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, buffer);
  } catch {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    path: path.join("generated", sessionId.trim(), "reference.png"),
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
  });
}
