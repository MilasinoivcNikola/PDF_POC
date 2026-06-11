// POST /api/admin/requeue — re-queue a `failed` order for another worker run
// (commerce PR-08). Body: `{ orderId }`. Moves `failed → queued`, which is a legal
// transition in lib/order/state.ts; the worker (PR-07) drains `queued` orders and
// re-generates the book. NO generation happens here — this is just a status nudge.
//
// OPERATOR-ONLY + AUTH-GATED (the headline security property of PR-08): the admin
// lets the operator spend on a re-run, so the route requires BOTH the operator
// build gate (assertOperator() — 404 on a public deploy, where this never ships)
// AND a logged-in Supabase session (getOperatorUserId() — 401 to an
// unauthenticated visitor on the local surface). House JSON shape throughout.

import { NextResponse } from "next/server";
import { getOperatorUserId } from "@/lib/supabase/auth";
import { isSafeOrderId } from "@/lib/supabase/ids";
import { updateOrderStatus } from "@/lib/order/store";
import { IllegalTransitionError } from "@/lib/order/state";
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

  // Auth gate — a logged-in operator only. assertOperator() guarantees we're on
  // the local surface; this guarantees a real session is present.
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

  try {
    // The store reads the order, asserts `failed → queued` is legal (throws
    // otherwise — before any write), then persists. An order not in `failed`
    // (already re-queued, or never failed) is an illegal move → 409.
    await updateOrderStatus(orderId, "queued");
  } catch (error) {
    if (error instanceof IllegalTransitionError) {
      return NextResponse.json(
        { ok: false, error: "illegal_transition" },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("Order not found")) {
      return NextResponse.json(
        { ok: false, error: "order_not_found" },
        { status: 404 },
      );
    }
    console.error(`Re-queue failed for order ${orderId}:`, error);
    return NextResponse.json({ ok: false, error: "requeue_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "queued" });
}
