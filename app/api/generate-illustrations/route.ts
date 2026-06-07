import { NextResponse } from "next/server";

// Stub — triggers AI illustration generation. Implemented in a later feature.
export async function POST() {
  return NextResponse.json({ ok: false, error: "not_implemented" }, { status: 501 });
}
