// POST /api/checkout — create a Lemon Squeezy hosted checkout for an order
// (commerce PR-06). The order form calls this AFTER /api/order has created the
// `pending_payment` row; we look up the product's LS variant, create a checkout
// carrying `custom: { orderId }`, and return its hosted URL for the form to
// redirect the browser to. NO state change happens here — payment is trusted only
// via the verified webhook (/api/webhooks/lemonsqueezy).
//
// PUBLIC SURFACE (runs on Vercel): NO assertOperator() — checkout creation is part
// of taking payment on the public host. It holds the secret LEMONSQUEEZY_API_KEY
// but must NEVER import the engine. The boundary test asserts this route's import
// closure is engine-free (it reaches only the catalog + the pure LS helpers + the
// thin createCheckout fetch — no lib/ai/*, no Puppeteer, no local-disk session IO,
// and not even lib/supabase/server: it doesn't touch the DB).
//
// VARIANT ID CONFIG (see the catalog note): the LS variant id is a non-secret
// public identifier resolved SERVER-SIDE from a per-product env var
// (LEMONSQUEEZY_VARIANT_<PRODUCT>), set during the manual LS product setup. We
// don't commit a fake id into the catalog as if it were real, and we don't read
// process.env in the client-safe catalog module — checkout (server) does the
// lookup. The price the customer is charged is configured on the LS variant itself
// (the catalog `priceUsd` is the storefront DISPLAY price).

import process from "node:process";
import { NextResponse } from "next/server";
import { getProduct } from "@/lib/catalog/products";
import { isSafeOrderId } from "@/lib/supabase/ids";
import { createCheckout } from "@/lib/order/lemonsqueezy";

/** A JSON error response in the house shape, with the given status. */
function fail(error: string, status = 400): Response {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * The env var name holding a product's LS variant id. Per-product so each book
 * maps to its own LS variant: `LEMONSQUEEZY_VARIANT_STORY_1_BOOK`,
 * `LEMONSQUEEZY_VARIANT_STORY_2_LETTER`. The catalog `productId`
 * ("story-1-book") is upper-cased and `-` → `_` so it's a valid env key.
 */
function variantEnvName(productId: string): string {
  return `LEMONSQUEEZY_VARIANT_${productId.toUpperCase().replace(/-/g, "_")}`;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json");
  }
  if (typeof body !== "object" || body === null) {
    return fail("invalid_request");
  }
  const { orderId, productId } = body as Record<string, unknown>;

  // --- Order id (the link carried into checkout custom data) ---------------
  if (typeof orderId !== "string" || !isSafeOrderId(orderId)) {
    return fail("invalid_order_id");
  }

  // --- Product → its LS variant --------------------------------------------
  if (typeof productId !== "string") {
    return fail("missing_product");
  }
  const product = getProduct(productId);
  if (!product) {
    return fail("unknown_product", 404);
  }

  // --- Server-side config (secrets + non-secret variant id) ----------------
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env[variantEnvName(productId)];
  if (!apiKey || !storeId || !variantId) {
    // Not configured yet (no LS account/variant). Surface a clean error rather
    // than calling LS with empty creds. Never echo the missing var's value.
    return fail("checkout_unavailable", 503);
  }

  // --- Create the hosted checkout ------------------------------------------
  // The customer is redirected to `data.attributes.url`. We pass a redirect_url so
  // that after payment LS sends them to our confirmation page (derived from the
  // request origin so it's correct on any deploy, without baking the URL into the
  // LS product). That page grants NOTHING — only the verified webhook advances the
  // order, so the redirect is never trusted as proof of payment.
  const origin = new URL(request.url).origin;
  const redirectUrl = `${origin}/order/${product.productId}/confirmation`;
  try {
    const url = await createCheckout({
      apiKey,
      storeId,
      variantId,
      orderId,
      redirectUrl,
    });
    return NextResponse.json({ ok: true, url });
  } catch {
    return fail("checkout_failed", 502);
  }
}
