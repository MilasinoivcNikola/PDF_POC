// Data-access for orders against Supabase Postgres. SERVER-SIDE ONLY (it imports
// the service-role client). Every status change routes through the state machine
// in lib/order/state.ts, so an illegal transition can never reach the database.
//
// The row ↔ `Order` mapping (snake_case columns ↔ camelCase fields) is PURE and
// exported so it is unit-testable without a live database; the IO functions
// (create/get/update/list) are manual-verify per the testing standard.

import { createSessionId } from "@/lib/session/storage";
import { isSafeOrderId } from "@/lib/supabase/ids";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { assertTransition } from "@/lib/order/state";
import type { NewOrderInput, Order, OrderStatus } from "@/lib/order/types";
import type { StorySession, Story2Session } from "@/lib/session/types";

/** The Postgres table name. */
const ORDERS_TABLE = "orders";

/**
 * The shape of a row in the `orders` table (snake_case, as Postgres returns it).
 * `inputs` is a `jsonb` column carrying the captured session verbatim. Kept as a
 * distinct type so the mapping below is the only place column names appear.
 */
export interface OrderRow {
  id: string;
  product_id: string;
  story_type: Order["storyType"];
  status: OrderStatus;
  customer_email: string;
  inputs: StorySession | Story2Session;
  photo_key: string;
  pdf_key: string | null;
  ls_order_id: string | null;
  delivery_token: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Pure row ↔ Order mapping (unit-testable, no IO)
// ---------------------------------------------------------------------------

/** Map a DB row (snake_case, nullable optionals) to the camelCase `Order`. */
export function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    productId: row.product_id,
    storyType: row.story_type,
    status: row.status,
    customerEmail: row.customer_email,
    inputs: row.inputs,
    photoKey: row.photo_key,
    ...(row.pdf_key !== null ? { pdfKey: row.pdf_key } : {}),
    ...(row.ls_order_id !== null ? { lsOrderId: row.ls_order_id } : {}),
    ...(row.delivery_token !== null ? { deliveryToken: row.delivery_token } : {}),
    ...(row.error !== null ? { error: row.error } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map an `Order` to its DB row (camelCase → snake_case, absent optionals → null).
 * Used when writing a full order; partial updates build their own column subset.
 */
export function orderToRow(order: Order): OrderRow {
  return {
    id: order.id,
    product_id: order.productId,
    story_type: order.storyType,
    status: order.status,
    customer_email: order.customerEmail,
    inputs: order.inputs,
    photo_key: order.photoKey,
    pdf_key: order.pdfKey ?? null,
    ls_order_id: order.lsOrderId ?? null,
    delivery_token: order.deliveryToken ?? null,
    error: order.error ?? null,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// IO — create / read / update / list (server-side, against Supabase)
// ---------------------------------------------------------------------------

/**
 * Insert a new order in `pending_payment` and return the persisted `Order`.
 * `createdAt`/`updatedAt` are set to now. The id is the caller-supplied `input.id`
 * (so a caller that keyed Storage at the id before the row existed — e.g. intake's
 * `photoKey: photoKeyFor(id)` — stays atomic), or a fresh UUID when none is given.
 * Generation never runs for a `pending_payment` order — it only starts once the
 * paid webhook moves it to `paid` → `queued` (see the state machine).
 */
export async function createOrder(input: NewOrderInput): Promise<Order> {
  const now = new Date().toISOString();
  const order: Order = {
    id: input.id ?? createSessionId(),
    productId: input.productId,
    storyType: input.storyType,
    status: "pending_payment",
    customerEmail: input.customerEmail,
    inputs: input.inputs,
    photoKey: input.photoKey,
    ...(input.lsOrderId !== undefined ? { lsOrderId: input.lsOrderId } : {}),
    ...(input.deliveryToken !== undefined
      ? { deliveryToken: input.deliveryToken }
      : {}),
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await getSupabaseAdmin()
    .from(ORDERS_TABLE)
    .insert(orderToRow(order))
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }
  return rowToOrder(data as OrderRow);
}

/**
 * Read one order by id. Returns `null` if no row matches. Validates the id shape
 * first (it is also used as a storage-key segment elsewhere) so a malformed id is
 * rejected before it reaches the database.
 */
export async function getOrder(id: string): Promise<Order | null> {
  if (!isSafeOrderId(id)) {
    throw new Error(`Invalid order id: ${id}`);
  }
  const { data, error } = await getSupabaseAdmin()
    .from(ORDERS_TABLE)
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read order ${id}: ${error.message}`);
  }
  return data ? rowToOrder(data as OrderRow) : null;
}

/**
 * Move an order to a new status, enforcing the state machine. Reads the current
 * status, asserts the transition is legal (throws `IllegalTransitionError`
 * otherwise — BEFORE any write), then persists the new status + `updatedAt`.
 *
 * Optional fields written in the SAME patch (so they're guarded by the same legal
 * transition and never land on an illegal move):
 *   - `error`  — a human-readable failure reason (used when moving to `failed`).
 *   - `pdfKey` — the rendered PDF's Storage key (used when the admin moves
 *                `awaiting_review → approved`, PR-08): the final PDF and the
 *                `approved` status are written together, so an order is never
 *                `approved` without its `pdfKey`.
 *
 * Returns the updated `Order`.
 */
export async function updateOrderStatus(
  id: string,
  to: OrderStatus,
  options?: { error?: string; pdfKey?: string },
): Promise<Order> {
  const current = await getOrder(id);
  if (!current) {
    throw new Error(`Order not found: ${id}`);
  }

  // Single source of truth — throws on an illegal move before touching the DB.
  assertTransition(current.status, to);

  const patch: Partial<OrderRow> = {
    status: to,
    updated_at: new Date().toISOString(),
    ...(options?.error !== undefined ? { error: options.error } : {}),
    ...(options?.pdfKey !== undefined ? { pdf_key: options.pdfKey } : {}),
  };

  const { data, error } = await getSupabaseAdmin()
    .from(ORDERS_TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update order ${id}: ${error.message}`);
  }
  return rowToOrder(data as OrderRow);
}

/**
 * Link a Lemon Squeezy order id onto an order (PR-06). `lsOrderId` is part of the
 * `Order`/`OrderRow` contract but not writable via `updateOrderStatus` (which only
 * touches `status`), so the paid webhook sets it through this dedicated, status-
 * agnostic patch. Idempotent by construction: writing the same `lsOrderId` again is
 * a harmless overwrite, so a retried webhook can persist it without a guard. Callers
 * pass a real (non-empty) id — the webhook skips this write when LS gave none, so a
 * paid order never persists a blank `ls_order_id`.
 * Returns the updated `Order`.
 */
export async function setOrderLsId(id: string, lsOrderId: string): Promise<Order> {
  if (!isSafeOrderId(id)) {
    throw new Error(`Invalid order id: ${id}`);
  }

  const patch: Partial<OrderRow> = {
    ls_order_id: lsOrderId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabaseAdmin()
    .from(ORDERS_TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set ls_order_id for order ${id}: ${error.message}`);
  }
  return rowToOrder(data as OrderRow);
}

/**
 * List orders in a given status, oldest first (the worker drains `paid`/`queued`
 * and the admin queue reads `awaiting_review`). Backed by the `status` index in
 * the migration.
 */
export async function listOrdersByStatus(status: OrderStatus): Promise<Order[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(ORDERS_TABLE)
    .select()
    .eq("status", status)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list orders (${status}): ${error.message}`);
  }
  return (data as OrderRow[]).map(rowToOrder);
}
