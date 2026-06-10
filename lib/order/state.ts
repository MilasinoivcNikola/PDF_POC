// The order status state machine — the single source of truth for which status
// moves are legal. PURE: no IO, no network, no Supabase. Every status change in
// the system routes through `canTransition` (the store enforces it in
// `updateOrderStatus`), so the legal graph lives in exactly one place and is fully
// unit-testable.
//
// Derived from the commerce roadmap's state machine
// (context/commerce-roadmap.md → "Order state machine (the backbone)"):
//
//   pending_payment → paid → queued → generating → awaiting_review → approved → delivered
//   (+ failed from generating/awaiting_review → operator attention; refunded / cancelled)
//
// Guard rails baked in:
//   - Generation only ever begins from a PAID order — the only path into
//     `generating` is `queued → generating`, and the only path to `queued` is
//     from `paid` (or a `failed` retry). There is no `pending_payment → *`
//     shortcut into generation, so we never spend on an unpaid order.
//   - Terminal states (`delivered`, `refunded`, `cancelled`) have no outgoing
//     edges — once an order is done/voided it cannot move again.

import type { OrderStatus } from "@/lib/order/types";

/**
 * For each status, the set of statuses it may legally move to. A status mapped to
 * `[]` is terminal. This map is exhaustive over `OrderStatus` (a `Record`), so
 * adding a new status without giving it transitions is a compile error.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  // Awaiting the Lemon Squeezy paid webhook. Can be paid, or abandoned.
  pending_payment: ["paid", "cancelled"],
  // Paid (webhook verified). Enters the work queue; may be refunded/cancelled
  // before any generation work begins.
  paid: ["queued", "refunded", "cancelled"],
  // Queued for the batch worker. The worker picks it up (→ generating); a
  // pre-flight problem can fail it; it can still be cancelled before work starts.
  queued: ["generating", "failed", "cancelled"],
  // The engine is producing the book. Succeeds into review, or fails.
  generating: ["awaiting_review", "failed"],
  // In the operator's review queue. Approve to ship, or fail (e.g. unfixable drift).
  awaiting_review: ["approved", "failed"],
  // Operator approved. Final PDF render + delivery email; can still fail at render.
  approved: ["delivered", "failed"],
  // Delivered to the customer — terminal.
  delivered: [],
  // Needs operator attention. Can be retried (back into the queue) or resolved
  // by refunding / cancelling.
  failed: ["queued", "refunded", "cancelled"],
  // Money returned — terminal.
  refunded: [],
  // Voided before delivery — terminal.
  cancelled: [],
};

/** The terminal statuses — no further moves are legal from these. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = (
  Object.keys(ALLOWED_TRANSITIONS) as OrderStatus[]
).filter((status) => ALLOWED_TRANSITIONS[status].length === 0);

/** Whether `status` is terminal (delivered / refunded / cancelled). */
export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/**
 * Whether moving an order from `from` to `to` is a legal transition. A no-op move
 * (`from === to`) is NOT legal — a status change must actually change the status,
 * which keeps the audit trail and `updatedAt` bumps meaningful.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * The statuses reachable from `from` in one legal step (a copy, so callers can't
 * mutate the table). Useful for the admin UI (PR-08) to render the valid actions.
 */
export function nextStatus(from: OrderStatus): OrderStatus[] {
  return [...ALLOWED_TRANSITIONS[from]];
}

/**
 * Error thrown when an illegal status transition is attempted. Carries `from`/`to`
 * so the caller (and logs) can see exactly which move was rejected.
 */
export class IllegalTransitionError extends Error {
  readonly from: OrderStatus;
  readonly to: OrderStatus;

  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Illegal order status transition: ${from} → ${to}`);
    this.name = "IllegalTransitionError";
    this.from = from;
    this.to = to;
  }
}

/**
 * Assert that `from → to` is legal, throwing `IllegalTransitionError` if not. The
 * store calls this before writing a status change, so an illegal move never
 * reaches the database.
 */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}
