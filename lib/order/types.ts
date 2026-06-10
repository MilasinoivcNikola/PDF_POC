// The shared commerce contract: an `Order` is one paid (or pending) book purchase
// that moves through a fulfillment state machine (lib/order/state.ts), is persisted
// in Supabase Postgres (lib/order/store.ts), and references a photo + final PDF in
// Supabase Storage (lib/supabase/storage.ts). Every later commerce PR (catalog,
// storefront, intake, checkout, worker, admin, delivery) imports this.
//
// `OrderStatus` is a string-literal union — not a loose `string` — so the state
// machine and the worker get exhaustive `switch` safety, matching the
// `Species`/`SessionStatus` union style in lib/session/types.ts.

import type { StorySession, Story2Session, StoryType } from "@/lib/session/types";

// ---------------------------------------------------------------------------
// Order lifecycle (string-literal union — the state machine's alphabet)
// ---------------------------------------------------------------------------

/**
 * The fulfillment lifecycle of an order, per the commerce roadmap's state machine
 * (context/commerce-roadmap.md → "Order state machine"):
 *
 *   pending_payment → paid → queued → generating → awaiting_review → approved → delivered
 *
 * plus the off-happy-path states:
 *   - `failed`    — generation or review failed; needs operator attention.
 *   - `refunded`  — money returned (terminal).
 *   - `cancelled` — order abandoned/voided before delivery (terminal).
 *
 * Legal moves between these live in ONE place — `ALLOWED_TRANSITIONS` in
 * lib/order/state.ts — never re-encoded ad hoc by a caller.
 */
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "queued"
  | "generating"
  | "awaiting_review"
  | "approved"
  | "delivered"
  | "failed"
  | "refunded"
  | "cancelled";

// ---------------------------------------------------------------------------
// Order — the persisted row
// ---------------------------------------------------------------------------

/**
 * One book order. `inputs` reuses the existing session types VERBATIM
 * (`StorySession | Story2Session`) so the generation engine consumes a paid
 * order's captured inputs with no translation — the same shape the local wizard
 * already produces and `resolveStory*` already reads.
 *
 * Storage keys (`photoKey`, `pdfKey`) are object paths inside the private
 * Supabase buckets, not URLs — delivery mints a short-lived signed URL on demand
 * (lib/supabase/storage.ts `signedPdfUrl`).
 *
 * Field naming is camelCase here; the Postgres columns are snake_case. The
 * mapping lives in ONE place — `rowToOrder` / `orderToRow` in lib/order/store.ts.
 */
export interface Order {
  /** Primary key (a UUID; validated as a safe storage-key segment before use). */
  id: string;
  /** Catalog product id this order is for (e.g. "story-1-book"). Set by PR-02. */
  productId: string;
  /** Which engine product to generate — drives the registry (`resolveStory*`). */
  storyType: StoryType;
  /** Current lifecycle state. Only ever changed via `updateOrderStatus`. */
  status: OrderStatus;
  /** Buyer email — where the finished book is delivered (PR-09). */
  customerEmail: string;
  /** Captured wizard inputs, reused verbatim by the engine. */
  inputs: StorySession | Story2Session;
  /** Object key of the uploaded pet photo in the `order-photos` bucket. */
  photoKey: string;
  /** Object key of the rendered PDF in the `order-pdfs` bucket, once produced. */
  pdfKey?: string;
  /** Lemon Squeezy order id, linked when the paid webhook fires (PR-06). */
  lsOrderId?: string;
  /** Opaque token gating the delivery/download link (PR-09). */
  deliveryToken?: string;
  /** Human-readable failure reason when `status === "failed"`. */
  error?: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-update timestamp (bumped on every status change). */
  updatedAt: string;
}

/**
 * The fields a caller supplies to create an order. `id`, `status`, `createdAt`,
 * and `updatedAt` are assigned by the store; the rest are provided. Optional
 * fields default to absent.
 */
export type NewOrderInput = Pick<
  Order,
  "productId" | "storyType" | "customerEmail" | "inputs" | "photoKey"
> &
  Partial<Pick<Order, "lsOrderId" | "deliveryToken">>;
