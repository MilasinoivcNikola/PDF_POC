import { NextResponse } from "next/server";

// Stub — builds the PDF and streams it as a response. Implemented in a later feature.
export async function POST() {
  return NextResponse.json({ ok: false, error: "not_implemented" }, { status: 501 });
}
