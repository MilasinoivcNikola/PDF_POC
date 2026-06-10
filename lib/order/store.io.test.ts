import { describe, it, expect, vi, beforeEach } from "vitest";

import type { OrderRow } from "./store";
import type { NewOrderInput } from "./types";
import type { StorySession } from "@/lib/session/types";

// The store's IO functions (create / get / update-status / list) talk to Supabase
// Postgres. The Supabase client is MOCKED here (vi.mock of @/lib/supabase/server)
// so NO network request is ever made — the suite passes fully offline, following
// the repo idiom of mocking `openai` (lib/ai/generate*.test.ts) and `fs`
// (lib/session disk tests). The query builder is a tiny chainable stub whose
// terminal calls (single/maybeSingle/order) resolve to a controlled
// `{ data, error }`.
//
// The point of these tests is the LOGIC the store owns on top of the client:
//   - createOrder seeds status: "pending_payment" and maps row → Order
//   - getOrder maps a row, returns null on not-found, rejects an unsafe id
//   - updateOrderStatus routes through assertTransition and NEVER calls the DB
//     update on an illegal move
//   - listOrdersByStatus filters by status and maps every row

const SAMPLE_INPUTS: StorySession = {
  id: "00000000-0000-0000-0000-000000000000",
  createdAt: "2026-06-10T00:00:00.000Z",
  status: "generating",
  pet: {
    name: "Otis",
    species: "dog",
    breedColor: "brown rescue mutt with floppy ears",
    pronoun: "he",
    illustrationStyle: "watercolor",
    photo: "uploads/abc/photo.jpg",
  },
  child: { name: "Emma", ageBracket: "6-8" },
  memories: {
    favoriteActivity: "chasing tennis balls in the backyard",
    sleepingSpot: "at the foot of the bed",
    favoriteMemory: "the day at the lake",
  },
  toggles: {
    deathType: "natural",
    beliefFrame: "rainbow-bridge",
    otherPetsInHome: "no",
  },
  images: [],
};

// ---------------------------------------------------------------------------
// A chainable query-builder stub. Each method returns `this` so the store's
// fluent chains resolve; the terminal awaited methods (single / maybeSingle /
// order) return a queued `{ data, error }` result. Every call is a spy so we can
// assert what the store did (e.g. that `.update()` was NOT called on an illegal
// transition).
// ---------------------------------------------------------------------------

type Result = { data: unknown; error: { message: string } | null };

function makeBuilder() {
  // Per-terminal queued results so create/get/update/list can each be primed.
  const results: { single: Result[]; maybeSingle: Result[]; order: Result[] } = {
    single: [],
    maybeSingle: [],
    order: [],
  };

  // Each method takes `...args: unknown[]` so `.mock.calls[i]` is `unknown[]`
  // (indexable for our assertions) rather than the zero-length tuple a no-arg
  // `vi.fn(() => x)` infers under `strict`.
  const chain = (..._args: unknown[]) => builder;
  const builder = {
    from: vi.fn(chain),
    insert: vi.fn(chain),
    select: vi.fn(chain),
    update: vi.fn(chain),
    eq: vi.fn(chain),
    single: vi.fn(async () => results.single.shift() ?? { data: null, error: null }),
    maybeSingle: vi.fn(
      async () => results.maybeSingle.shift() ?? { data: null, error: null },
    ),
    order: vi.fn(async (..._args: unknown[]) =>
      results.order.shift() ?? { data: [], error: null },
    ),
    _results: results,
  };
  return builder;
}

let builder = makeBuilder();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => builder,
}));

// Import the store AFTER the mock is registered.
const { createOrder, getOrder, updateOrderStatus, listOrdersByStatus } =
  await import("./store");

function rowWith(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: "order-1",
    product_id: "story-1-book",
    story_type: "story-1",
    status: "paid",
    customer_email: "buyer@example.com",
    inputs: SAMPLE_INPUTS,
    photo_key: "order-1/photo",
    pdf_key: null,
    ls_order_id: null,
    delivery_token: null,
    error: null,
    created_at: "2026-06-10T00:00:00.000Z",
    updated_at: "2026-06-10T00:00:00.000Z",
    ...overrides,
  };
}

function newOrderInput(): NewOrderInput {
  return {
    productId: "story-1-book",
    storyType: "story-1",
    customerEmail: "buyer@example.com",
    inputs: SAMPLE_INPUTS,
    photoKey: "order-1/photo",
  };
}

beforeEach(() => {
  builder = makeBuilder();
});

// ---------------------------------------------------------------------------
// createOrder
// ---------------------------------------------------------------------------

describe("createOrder", () => {
  it("inserts a row in pending_payment and returns the mapped Order", async () => {
    // The DB echoes back the inserted row (with the seeded status).
    builder._results.single.push({
      data: rowWith({ status: "pending_payment" }),
      error: null,
    });

    const order = await createOrder(newOrderInput());

    // The inserted row carried status pending_payment (generation never runs on
    // an unpaid order).
    expect(builder.insert).toHaveBeenCalledTimes(1);
    const insertedRow = builder.insert.mock.calls[0][0] as OrderRow;
    expect(insertedRow.status).toBe("pending_payment");
    expect(insertedRow.product_id).toBe("story-1-book");
    expect(insertedRow.customer_email).toBe("buyer@example.com");
    // A fresh id was minted (non-empty) and timestamps set.
    expect(insertedRow.id).toBeTruthy();
    expect(insertedRow.created_at).toBeTruthy();
    expect(insertedRow.updated_at).toBe(insertedRow.created_at);

    // The returned Order is the mapped echoed row.
    expect(order.status).toBe("pending_payment");
    expect(order.productId).toBe("story-1-book");
    expect(order.inputs).toEqual(SAMPLE_INPUTS);
  });

  it("uses a caller-supplied id when given (so photoKey can be keyed at it atomically)", async () => {
    const explicitId = "11112222-3333-4444-5555-666677778888";
    builder._results.single.push({
      data: rowWith({ id: explicitId, status: "pending_payment" }),
      error: null,
    });

    const order = await createOrder({ ...newOrderInput(), id: explicitId });

    const insertedRow = builder.insert.mock.calls[0][0] as OrderRow;
    expect(insertedRow.id).toBe(explicitId);
    expect(order.id).toBe(explicitId);
  });

  it("mints a fresh id when none is supplied", async () => {
    builder._results.single.push({
      data: rowWith({ status: "pending_payment" }),
      error: null,
    });

    await createOrder(newOrderInput());

    const insertedRow = builder.insert.mock.calls[0][0] as OrderRow;
    expect(insertedRow.id).toBeTruthy();
    // A UUID-shaped fresh id (not one we passed in).
    expect(insertedRow.id).toMatch(/^[A-Za-z0-9-]{8,}$/);
  });

  it("throws a readable error when the insert fails", async () => {
    builder._results.single.push({
      data: null,
      error: { message: "duplicate key" },
    });
    await expect(createOrder(newOrderInput())).rejects.toThrow(
      /failed to create order: duplicate key/i,
    );
  });
});

// ---------------------------------------------------------------------------
// getOrder
// ---------------------------------------------------------------------------

describe("getOrder", () => {
  it("maps a returned row to an Order", async () => {
    builder._results.maybeSingle.push({ data: rowWith(), error: null });

    const order = await getOrder("order-1");

    expect(order).not.toBeNull();
    expect(order!.id).toBe("order-1");
    expect(order!.customerEmail).toBe("buyer@example.com");
    expect(builder.eq).toHaveBeenCalledWith("id", "order-1");
  });

  it("returns null when no row matches (not found)", async () => {
    builder._results.maybeSingle.push({ data: null, error: null });
    expect(await getOrder("order-1")).toBeNull();
  });

  it("rejects an unsafe id before touching the database", async () => {
    await expect(getOrder("../../etc/passwd")).rejects.toThrow(
      /invalid order id/i,
    );
    // No query was issued.
    expect(builder.from).not.toHaveBeenCalled();
  });

  it("throws a readable error when the read fails", async () => {
    builder._results.maybeSingle.push({
      data: null,
      error: { message: "boom" },
    });
    await expect(getOrder("order-1")).rejects.toThrow(
      /failed to read order order-1: boom/i,
    );
  });
});

// ---------------------------------------------------------------------------
// updateOrderStatus — routes through assertTransition BEFORE any DB write
// ---------------------------------------------------------------------------

describe("updateOrderStatus", () => {
  it("writes only on a legal move and returns the updated Order", async () => {
    // getOrder() (maybeSingle) sees a paid order; the update echoes back queued.
    builder._results.maybeSingle.push({
      data: rowWith({ status: "paid" }),
      error: null,
    });
    builder._results.single.push({
      data: rowWith({ status: "queued" }),
      error: null,
    });

    const order = await updateOrderStatus("order-1", "queued");

    expect(order.status).toBe("queued");
    expect(builder.update).toHaveBeenCalledTimes(1);
    const patch = builder.update.mock.calls[0][0] as Partial<OrderRow>;
    expect(patch.status).toBe("queued");
    expect(patch.updated_at).toBeTruthy();
  });

  it("stores an error message when moving to failed", async () => {
    builder._results.maybeSingle.push({
      data: rowWith({ status: "generating" }),
      error: null,
    });
    builder._results.single.push({
      data: rowWith({ status: "failed", error: "pet drifted" }),
      error: null,
    });

    await updateOrderStatus("order-1", "failed", { error: "pet drifted" });

    const patch = builder.update.mock.calls[0][0] as Partial<OrderRow>;
    expect(patch.status).toBe("failed");
    expect(patch.error).toBe("pet drifted");
  });

  it("throws IllegalTransitionError WITHOUT calling the DB update on an illegal move", async () => {
    // A delivered order is terminal — paid is not reachable from it.
    builder._results.maybeSingle.push({
      data: rowWith({ status: "delivered" }),
      error: null,
    });

    await expect(updateOrderStatus("order-1", "paid")).rejects.toMatchObject({
      name: "IllegalTransitionError",
      from: "delivered",
      to: "paid",
    });

    // The crux: the write never happened.
    expect(builder.update).not.toHaveBeenCalled();
  });

  it("also blocks a no-op self-transition before any write", async () => {
    builder._results.maybeSingle.push({
      data: rowWith({ status: "paid" }),
      error: null,
    });
    await expect(updateOrderStatus("order-1", "paid")).rejects.toMatchObject({
      name: "IllegalTransitionError",
    });
    expect(builder.update).not.toHaveBeenCalled();
  });

  it("throws when the order does not exist (no write attempted)", async () => {
    builder._results.maybeSingle.push({ data: null, error: null });
    await expect(updateOrderStatus("order-1", "paid")).rejects.toThrow(
      /order not found: order-1/i,
    );
    expect(builder.update).not.toHaveBeenCalled();
  });

  it("rejects an unsafe id before any DB access (via getOrder's guard)", async () => {
    await expect(updateOrderStatus("../evil", "paid")).rejects.toThrow(
      /invalid order id/i,
    );
    expect(builder.update).not.toHaveBeenCalled();
  });

  it("throws a readable error when the update write fails", async () => {
    builder._results.maybeSingle.push({
      data: rowWith({ status: "paid" }),
      error: null,
    });
    builder._results.single.push({
      data: null,
      error: { message: "write failed" },
    });
    await expect(updateOrderStatus("order-1", "queued")).rejects.toThrow(
      /failed to update order order-1: write failed/i,
    );
  });
});

// ---------------------------------------------------------------------------
// listOrdersByStatus
// ---------------------------------------------------------------------------

describe("listOrdersByStatus", () => {
  it("filters by the given status and maps every row, oldest first", async () => {
    builder._results.order.push({
      data: [
        rowWith({ id: "order-1", status: "awaiting_review" }),
        rowWith({ id: "order-2", status: "awaiting_review" }),
      ],
      error: null,
    });

    const orders = await listOrdersByStatus("awaiting_review");

    expect(orders.map((o) => o.id)).toEqual(["order-1", "order-2"]);
    expect(orders.every((o) => o.status === "awaiting_review")).toBe(true);
    expect(builder.eq).toHaveBeenCalledWith("status", "awaiting_review");
    expect(builder.order).toHaveBeenCalledWith("created_at", {
      ascending: true,
    });
  });

  it("returns an empty array when no orders match", async () => {
    builder._results.order.push({ data: [], error: null });
    expect(await listOrdersByStatus("paid")).toEqual([]);
  });

  it("throws a readable error when the list query fails", async () => {
    builder._results.order.push({
      data: null,
      error: { message: "index missing" },
    });
    await expect(listOrdersByStatus("paid")).rejects.toThrow(
      /failed to list orders \(paid\): index missing/i,
    );
  });
});
