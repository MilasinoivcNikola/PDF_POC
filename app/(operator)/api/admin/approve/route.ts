// POST /api/admin/approve — the operator's approval gate (commerce PR-08, with
// PR-09 delivery chained on). Body: `{ orderId }`. Renders the reviewed book to a
// print-quality PDF, uploads it to the private `order-pdfs` bucket, moves the order
// `awaiting_review → approved` storing its `pdfKey`, then DELIVERS it: mint an
// unguessable delivery token → persist it (status stays `approved`) → email the
// customer the tokenized download link → move `approved → delivered`. This does NOT
// generate images (no OpenAI/spend) — it only renders the already-generated,
// possibly-repainted book with Puppeteer.
//
// DELIVERY FAILURE (PR-09 design call): if the email send fails, the order is LEFT
// at `approved` (the rendered PDF + the persisted token are safe — a finished book
// is never stranded) and the response says `{ ok:true, status:"approved",
// delivery:"failed" }` so the operator knows the book is done but wasn't emailed. A
// re-send/retry path is out of scope (post-MVP). The send error is logged server-
// side with NO PII (no customer email) and NO secret.
//
// The emailed link points at the PUBLIC tokenized page built from PUBLIC_SITE_URL —
// this route runs on the operator/localhost surface, so the request's own origin
// would be a useless `localhost` link in production; the public base must come from
// env.
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
import process from "node:process";
import { getOperatorUserId } from "@/lib/supabase/auth";
import { isSafeOrderId } from "@/lib/supabase/ids";
import {
  getOrder,
  setOrderDeliveryToken,
  updateOrderStatus,
} from "@/lib/order/store";
import { putPdf } from "@/lib/supabase/storage";
import { IllegalTransitionError } from "@/lib/order/state";
import { readSession } from "@/lib/session/disk";
import { manifestToImageMap } from "@/lib/ai/generate";
import { renderStoryPdf } from "@/lib/pdf/render";
import { MergeError } from "@/lib/story/merge";
import { assertOperator } from "@/lib/runtime/surface";
import { mintDeliveryToken } from "@/lib/delivery/token";
import { sendDeliveryEmail } from "@/lib/delivery/email";

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

  // --- Delivery (PR-09) ----------------------------------------------------
  // The book is approved + the PDF is uploaded. Now deliver it. Anything below
  // failing leaves the order at `approved` (the finished book is safe) — the
  // operator just sees that delivery didn't go out.

  // The absolute public base for the emailed link. This route runs on
  // operator/localhost, so we CANNOT derive the origin from the request (that would
  // email a localhost link in production). Read it from env.
  const siteUrl = process.env.PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error(
      `Approve: PUBLIC_SITE_URL is not set; cannot build a delivery link for order ${orderId}. Book is approved.`,
    );
    return NextResponse.json({
      ok: true,
      status: "approved",
      pdfKey,
      delivery: "failed",
    });
  }

  // Mint + persist the token while the order is still `approved`, so the download
  // link is valid the moment the email is sent (and a delivered order is never left
  // without a token to look it up by). This chain runs at most once per order — the
  // `status !== "awaiting_review"` gate above 409s a re-approve — so a fresh mint
  // here can't orphan a prior token. (A future re-send flow, out of scope for the
  // MVP, should REUSE the stored `order.deliveryToken` rather than mint a new one.)
  const token = mintDeliveryToken();
  try {
    await setOrderDeliveryToken(orderId, token);
  } catch (error) {
    console.error(`Approve: failed to persist delivery token for order ${orderId}:`, error);
    return NextResponse.json({
      ok: true,
      status: "approved",
      pdfKey,
      delivery: "failed",
    });
  }

  const downloadUrl = new URL(
    `/download/${token}`,
    siteUrl,
  ).toString();

  try {
    await sendDeliveryEmail({
      to: order.customerEmail,
      petName: order.inputs.pet.name,
      storyType: order.storyType,
      downloadUrl,
    });
  } catch (error) {
    // Leave the order at `approved` — the rendered PDF + token are safe; never
    // strand a finished book. Log without the customer email (the one PII) or any
    // secret.
    console.error(`Approve: delivery email failed for order ${orderId}:`, error);
    return NextResponse.json({
      ok: true,
      status: "approved",
      pdfKey,
      delivery: "failed",
    });
  }

  // Email sent — move to the terminal `delivered` state.
  try {
    await updateOrderStatus(orderId, "delivered");
  } catch (error) {
    // The customer already has a working link; the status just didn't advance.
    // Treat as delivered-but-not-recorded: the book is out, surface it cleanly.
    console.error(`Approve: status update to delivered failed for order ${orderId}:`, error);
    return NextResponse.json({
      ok: true,
      status: "approved",
      pdfKey,
      delivery: "sent",
    });
  }

  return NextResponse.json({ ok: true, status: "delivered", pdfKey });
}
