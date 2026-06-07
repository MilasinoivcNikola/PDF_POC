import { NextResponse } from "next/server";

// Stub — GET/POST session JSON (./sessions/[id].json). Implemented in a later feature.
export async function GET() {
  return NextResponse.json({ ok: false, error: "not_implemented" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "not_implemented" }, { status: 501 });
}
