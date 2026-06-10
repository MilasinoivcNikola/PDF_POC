import { describe, it, expect } from "vitest";

import { rowToOrder, orderToRow, type OrderRow } from "./store";
import type { Order } from "./types";
import type { StorySession } from "@/lib/session/types";

// The row ↔ Order mapping is the pure, unit-testable seam of the store. The IO
// functions (create/get/update/list) talk to a live Supabase and are manual-verify
// per the testing standard — they are not exercised here (no network).

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

function fullRow(): OrderRow {
  return {
    id: "order-1",
    product_id: "story-1-book",
    story_type: "story-1",
    status: "paid",
    customer_email: "buyer@example.com",
    inputs: SAMPLE_INPUTS,
    photo_key: "order-1/photo",
    pdf_key: "order-1.pdf",
    ls_order_id: "ls-123",
    delivery_token: "tok-abc",
    error: "something went wrong",
    created_at: "2026-06-10T00:00:00.000Z",
    updated_at: "2026-06-10T01:00:00.000Z",
  };
}

// ---------------------------------------------------------------------------
// rowToOrder — snake_case row → camelCase Order
// ---------------------------------------------------------------------------

describe("rowToOrder", () => {
  it("maps every column to its camelCase field", () => {
    const order = rowToOrder(fullRow());
    expect(order).toEqual({
      id: "order-1",
      productId: "story-1-book",
      storyType: "story-1",
      status: "paid",
      customerEmail: "buyer@example.com",
      inputs: SAMPLE_INPUTS,
      photoKey: "order-1/photo",
      pdfKey: "order-1.pdf",
      lsOrderId: "ls-123",
      deliveryToken: "tok-abc",
      error: "something went wrong",
      createdAt: "2026-06-10T00:00:00.000Z",
      updatedAt: "2026-06-10T01:00:00.000Z",
    } satisfies Order);
  });

  it("omits optional fields that are null (does not surface them as undefined)", () => {
    const order = rowToOrder({
      ...fullRow(),
      pdf_key: null,
      ls_order_id: null,
      delivery_token: null,
      error: null,
    });
    expect(order).not.toHaveProperty("pdfKey");
    expect(order).not.toHaveProperty("lsOrderId");
    expect(order).not.toHaveProperty("deliveryToken");
    expect(order).not.toHaveProperty("error");
    // Required fields still present.
    expect(order.photoKey).toBe("order-1/photo");
    expect(order.inputs).toBe(SAMPLE_INPUTS);
  });
});

// ---------------------------------------------------------------------------
// orderToRow — camelCase Order → snake_case row
// ---------------------------------------------------------------------------

describe("orderToRow", () => {
  it("maps every field to its snake_case column", () => {
    const order: Order = rowToOrder(fullRow());
    expect(orderToRow(order)).toEqual(fullRow());
  });

  it("writes null for absent optional fields", () => {
    const order: Order = {
      id: "order-2",
      productId: "story-2-book",
      storyType: "story-2",
      status: "pending_payment",
      customerEmail: "buyer2@example.com",
      inputs: SAMPLE_INPUTS,
      photoKey: "order-2/photo",
      createdAt: "2026-06-10T00:00:00.000Z",
      updatedAt: "2026-06-10T00:00:00.000Z",
    };
    const row = orderToRow(order);
    expect(row.pdf_key).toBeNull();
    expect(row.ls_order_id).toBeNull();
    expect(row.delivery_token).toBeNull();
    expect(row.error).toBeNull();
    expect(row.story_type).toBe("story-2");
  });
});

// ---------------------------------------------------------------------------
// round-trip — row → Order → row is identity
// ---------------------------------------------------------------------------

describe("rowToOrder ∘ orderToRow round-trip", () => {
  it("preserves a fully-populated row", () => {
    expect(orderToRow(rowToOrder(fullRow()))).toEqual(fullRow());
  });
});
