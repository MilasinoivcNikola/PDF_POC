// POST /api/admin/approve — the operator's approval gate (commerce PR-08). Body:
// `{ orderId }`. Renders the reviewed book to a print-quality PDF, uploads it to
// the private `order-pdfs` bucket, and moves the order `awaiting_review → approved`
// while storing its `pdfKey` — the single transition PR-09 (delivery email) reacts
// to. This does NOT generate images (no OpenAI/spend) — it only renders the already-
// generated, possibly-repainted book with Puppeteer.
//
// The orderId === sessionId bridge: PR-07's worker wrote the generated book to the
// operator's LOCAL disk keyed by the order id (`./sessions/[orderId].json` + the
// PNGs in `./generated/[orderId]/`), so the same `readSession`/`manifestToImageMap`/
// `renderStoryPdf` chain feature 10 uses for the wizard preview renders an admin
// order when handed the orderId. Any inline edits / per-page repaints the operator
// made on the detail page are already persisted to that session JSON, so this picks
// up the final reviewed book.
//
// OPERATOR-ONLY + AUTH-GATED (the headline security property of PR-08): the admin
// exposes customer photos and lets the operator spend; this route requires BOTH the
// operator build gate (assertOperator() — 404 on a public deploy, where the admin
// never ships) AND a logged-in Supabase session (getOperatorUserId() — 401 to an
// unauthenticated visitor on the local surface). House JSON shape throughout.

import { NextResponse } from "next/server";
import { getOperatorUserId } from "@/lib/supabase/auth";
import { isSafeOrderId } from "@/lib/supabase/ids";
import { getOrder, updateOrderStatus } from "@/lib/order/store";
import { putPdf } from "@/lib/supabase/storage";
import { IllegalTransitionError } from "@/lib/order/state";
import { readSession } from "@/lib/session/disk";
import { manifestToImageMap } from "@/lib/ai/generate";
import { renderStoryPdf } from "@/lib/pdf/render";
import { MergeError } from "@/lib/story/merge";
import { assertOperator } from "@/lib/runtime/surface";

/** Read `{ orderId }` from a parsed JSON body. */
function readOrderId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  return typeof record.orderId === "string" ? record.orderId : null;
}

export async function POST(request: Request): Promise<Response> {
  const gate = assertOperator();
  if (gate) return gate;

  // Auth gate — a logged-in operator only.
  if (!(await getOperatorUserId())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const orderId = readOrderId(body);
  if (!orderId || !isSafeOrderId(orderId)) {
    return NextResponse.json(
      { ok: false, error: "invalid_order_id" },
      { status: 400 },
    );
  }

  // The order must exist and be in the review queue. Reading it first lets us 404 a
  // bad id and 409 an order that isn't awaiting review (the transition assert below
  // would also reject the latter, but reading first gives a clearer error).
  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "order_not_found" },
      { status: 404 },
    );
  }
  if (order.status !== "awaiting_review") {
    return NextResponse.json(
      { ok: false, error: "not_awaiting_review" },
      { status: 409 },
    );
  }

  // The reviewed book lives on local disk keyed by the order id (PR-07 worker).
  const session = await readSession(orderId);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "session_not_found" },
      { status: 404 },
    );
  }

  // Render the final PDF (no generation — just Puppeteer over the existing book).
  let pdf: Buffer;
  try {
    const images = await manifestToImageMap(session.images);
    pdf = await renderStoryPdf(session, images);
  } catch (error) {
    if (error instanceof MergeError) {
      return NextResponse.json(
        { ok: false, error: "story_incomplete" },
        { status: 422 },
      );
    }
    console.error(`Approve render failed for order ${orderId}:`, error);
    return NextResponse.json(
      { ok: false, error: "render_failed" },
      { status: 500 },
    );
  }

  // Upload to the private order-pdfs bucket, then flip the status + store pdfKey in
  // one guarded write (so an order is never `approved` without its PDF).
  let pdfKey: string;
  try {
    pdfKey = await putPdf(orderId, pdf);
  } catch (error) {
    console.error(`Approve upload failed for order ${orderId}:`, error);
    return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 500 });
  }

  try {
    await updateOrderStatus(orderId, "approved", { pdfKey });
  } catch (error) {
    if (error instanceof IllegalTransitionError) {
      // Raced with another approval / status change since we read the order.
      return NextResponse.json(
        { ok: false, error: "illegal_transition" },
        { status: 409 },
      );
    }
    console.error(`Approve status update failed for order ${orderId}:`, error);
    return NextResponse.json({ ok: false, error: "approve_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "approved", pdfKey });
}
