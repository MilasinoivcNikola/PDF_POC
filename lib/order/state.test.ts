import { describe, it, expect } from "vitest";

import {
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
  assertTransition,
  canTransition,
  isTerminal,
  IllegalTransitionError,
  nextStatus,
} from "./state";
import type { OrderStatus } from "./types";

// The state machine is the single source of truth for legal status moves and is
// pure (no IO), so the whole legal/illegal graph is exhaustively unit-checkable.

const ALL_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "queued",
  "generating",
  "awaiting_review",
  "approved",
  "delivered",
  "failed",
  "refunded",
  "cancelled",
];

// ---------------------------------------------------------------------------
// The exact transition table (authored independently from ALLOWED_TRANSITIONS,
// so a silent edit to the map is caught by these expectations).
// ---------------------------------------------------------------------------

const EXPECTED: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["queued", "refunded", "cancelled"],
  queued: ["generating", "failed", "cancelled"],
  generating: ["awaiting_review", "failed"],
  awaiting_review: ["approved", "failed"],
  approved: ["delivered", "failed"],
  delivered: [],
  failed: ["queued", "refunded", "cancelled"],
  refunded: [],
  cancelled: [],
};

describe("ALLOWED_TRANSITIONS", () => {
  it("matches the independently-authored expected table exactly", () => {
    for (const from of ALL_STATUSES) {
      expect([...ALLOWED_TRANSITIONS[from]].sort()).toEqual(
        [...EXPECTED[from]].sort(),
      );
    }
  });

  it("covers every status (exhaustive map)", () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual(
      [...ALL_STATUSES].sort(),
    );
  });

  it("only ever transitions to a known status", () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALLOWED_TRANSITIONS[from]) {
        expect(ALL_STATUSES).toContain(to);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// canTransition — every legal move allowed, every illegal one rejected
// ---------------------------------------------------------------------------

describe("canTransition", () => {
  it("allows exactly the legal moves and rejects all others", () => {
    for (const from of ALL_STATUSES) {
      const legal = new Set<OrderStatus>(EXPECTED[from]);
      for (const to of ALL_STATUSES) {
        expect(canTransition(from, to)).toBe(legal.has(to));
      }
    }
  });

  it("walks the full happy path", () => {
    expect(canTransition("pending_payment", "paid")).toBe(true);
    expect(canTransition("paid", "queued")).toBe(true);
    expect(canTransition("queued", "generating")).toBe(true);
    expect(canTransition("generating", "awaiting_review")).toBe(true);
    expect(canTransition("awaiting_review", "approved")).toBe(true);
    expect(canTransition("approved", "delivered")).toBe(true);
  });

  it("rejects a no-op self-transition (status must actually change)", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("rejects skipping straight from pending_payment into generation", () => {
    // Guard rail: generation never runs on an unpaid order.
    expect(canTransition("pending_payment", "generating")).toBe(false);
    expect(canTransition("pending_payment", "queued")).toBe(false);
  });

  it("only ever enters `generating` from `queued` (the spend guard rail)", () => {
    // Security-critical invariant: we must never spend OpenAI credits on an order
    // that has not been paid + queued. Assert across EVERY status that the only
    // legal edge INTO `generating` is `queued → generating`.
    for (const from of ALL_STATUSES) {
      expect(canTransition(from, "generating")).toBe(from === "queued");
    }
  });

  it("only ever enters `queued` from `paid` or a `failed` retry", () => {
    // The only paths to `queued` (and thus to generation) are from a paid order
    // or a failed-order retry — never directly from `pending_payment`.
    for (const from of ALL_STATUSES) {
      expect(canTransition(from, "queued")).toBe(
        from === "paid" || from === "failed",
      );
    }
  });

  it("rejects moving backwards (e.g. delivered → approved)", () => {
    expect(canTransition("delivered", "approved")).toBe(false);
    expect(canTransition("approved", "generating")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Terminal states — no outgoing edges
// ---------------------------------------------------------------------------

describe("terminal states", () => {
  it("isTerminal is true exactly for delivered / refunded / cancelled", () => {
    expect(isTerminal("delivered")).toBe(true);
    expect(isTerminal("refunded")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("paid")).toBe(false);
    expect(isTerminal("generating")).toBe(false);
  });

  it("TERMINAL_STATUSES is exactly those three", () => {
    expect([...TERMINAL_STATUSES].sort()).toEqual(
      ["cancelled", "delivered", "refunded"].sort(),
    );
  });

  it("rejects every move out of a terminal state", () => {
    for (const terminal of TERMINAL_STATUSES) {
      for (const to of ALL_STATUSES) {
        expect(canTransition(terminal, to)).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// nextStatus — a safe copy of the legal next steps
// ---------------------------------------------------------------------------

describe("nextStatus", () => {
  it("returns the legal next statuses", () => {
    expect(nextStatus("paid").sort()).toEqual(
      ["queued", "refunded", "cancelled"].sort(),
    );
    expect(nextStatus("delivered")).toEqual([]);
  });

  it("returns a copy that cannot mutate the table", () => {
    const next = nextStatus("paid");
    next.push("delivered");
    expect(ALLOWED_TRANSITIONS.paid).not.toContain("delivered");
  });
});

// ---------------------------------------------------------------------------
// assertTransition — throws IllegalTransitionError on an illegal move
// ---------------------------------------------------------------------------

describe("assertTransition", () => {
  it("does not throw on a legal move", () => {
    expect(() => assertTransition("paid", "queued")).not.toThrow();
  });

  it("throws IllegalTransitionError on an illegal move, carrying from/to", () => {
    try {
      assertTransition("delivered", "approved");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(IllegalTransitionError);
      const e = error as IllegalTransitionError;
      expect(e.from).toBe("delivered");
      expect(e.to).toBe("approved");
      expect(e.message).toContain("delivered");
      expect(e.message).toContain("approved");
    }
  });
});
