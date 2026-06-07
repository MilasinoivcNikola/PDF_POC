import { NextResponse } from "next/server";

// Stub — saves uploaded pet photo to ./uploads/. Implemented in a later feature.
export async function POST() {
  return NextResponse.json({ ok: false, error: "not_implemented" }, { status: 501 });
}
