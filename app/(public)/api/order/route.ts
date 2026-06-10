// POST /api/order — the FIRST public API route. A customer submits the order
// form (pet/letter inputs + photo + email) and this creates an `Order` in
// `pending_payment` — NO generation, NO charge. PR-06 wires the Lemon Squeezy
// checkout that moves the order to `paid` and lets the worker generate.
//
// PUBLIC SURFACE (runs on Vercel): it does NOT call assertOperator() — it must
// run on the always-on public host that takes orders. It MAY hold the service-role
// Supabase key in this server-side route to write the order row + upload the photo
// (that's how the public host persists intent, per the commerce roadmap diagram).
// What it must NEVER do is import the engine (lib/ai/*, Puppeteer, the local-disk
// session IO) — the boundary test asserts this route's import closure is
// engine-free. So the photo goes to the Supabase `order-photos` bucket via
// `putPhoto`, never the operator's local ./uploads/ path.
//
// Validation happens at the boundary (don't trust the client):
//   - the body must parse as multipart form-data carrying `inputs` (JSON), `email`,
//     and `photo` (a File);
//   - `inputs` is re-validated through the SAME required-field validators the
//     wizard/session route use (`missingRequiredFieldsForDraft` on a draft view of
//     the session, then the `draftToSession*` throw as a backstop) so a later PAID
//     order can never fail to render (`resolveStory*` won't MergeError);
//   - the email is checked with `isValidEmail`;
//   - the photo type/size is re-checked with the same constants/branches as the
//     operator upload route.
//
// Storage/order ordering (Decision B): we mint the order id once, upload the photo
// to `order-photos/<id>/photo`, then create the order carrying
// `photoKey: photoKeyFor(id)` — so `photoKey === photoKeyFor(id)` is atomic, no
// blank-then-patch.

import { NextResponse } from "next/server";
import { createSessionId } from "@/lib/session/storage";
import { isSafeOrderId } from "@/lib/supabase/ids";
import { putPhoto } from "@/lib/supabase/storage";
import { createOrder } from "@/lib/order/store";
import { isValidEmail } from "@/lib/order/email";
import { getProduct } from "@/lib/catalog/products";
import {
  missingRequiredFieldsForDraft,
  draftToSessionForDraft,
} from "@/lib/session/draft";
import type { WizardDraft } from "@/lib/session/types";

/** Accepted upload MIME types (mirrors the operator upload route). */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Max upload size: 10 MB (mirrors the operator upload route). */
const MAX_BYTES = 10 * 1024 * 1024;

/** A JSON error response in the house shape, with the given status. */
function fail(error: string, status = 400): Response {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Coerce the posted `inputs` (the assembled session from the client) into a
 * `WizardDraft` view so the shared required-field validators can run on it. A
 * finalized session is a superset of the draft shape (it has the same
 * `pet`/`child`|`owner`/`memories`/`toggles` groups + `storyType`), so the draft
 * validators read it directly — they only look at those groups.
 */
function asDraft(inputs: unknown): WizardDraft {
  return inputs as WizardDraft;
}

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid_form_data");
  }

  // --- Product (drives storyType + ties the order to the catalog) ----------
  const productId = form.get("productId");
  if (typeof productId !== "string") {
    return fail("missing_product");
  }
  const product = getProduct(productId);
  if (!product) {
    return fail("unknown_product", 404);
  }

  // --- Email ---------------------------------------------------------------
  const email = form.get("email");
  if (!isValidEmail(email)) {
    return fail("invalid_email");
  }
  const customerEmail = email.trim();

  // --- Inputs (the assembled session) --------------------------------------
  const inputsRaw = form.get("inputs");
  if (typeof inputsRaw !== "string") {
    return fail("missing_inputs");
  }
  let inputs: unknown;
  try {
    inputs = JSON.parse(inputsRaw);
  } catch {
    return fail("invalid_inputs");
  }
  if (typeof inputs !== "object" || inputs === null) {
    return fail("invalid_inputs");
  }

  // The posted inputs must declare the product they belong to (so the engine
  // routes them via the registry). Guard against a mismatch with the URL product.
  const draft = asDraft(inputs);
  const inputsStoryType = draft.storyType ?? "story-1";
  if (inputsStoryType !== product.storyType) {
    return fail("product_mismatch");
  }

  // Re-validate the FULL required set server-side (the feature-08 guarantee): a
  // paid order must always be renderable. Reuse the same validators the wizard
  // gates on. The `draftToSessionForDraft` throw is the backstop (it re-checks the
  // same set and assembles the canonical session shape).
  const missing = missingRequiredFieldsForDraft(draft);
  if (missing.length > 0) {
    return fail(`missing_${toSnake(missing[0])}`);
  }
  let session;
  try {
    session = draftToSessionForDraft(draft);
  } catch {
    return fail("invalid_inputs");
  }

  // --- Photo ---------------------------------------------------------------
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return fail("missing_photo");
  }
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return fail("unsupported_type", 415);
  }
  if (file.size === 0) {
    return fail("empty_file");
  }
  if (file.size > MAX_BYTES) {
    return fail("file_too_large", 413);
  }

  // --- Mint the id, upload the photo, then create the order ----------------
  // The id keys the photo's Storage object (`order-photos/<id>/photo`), so it must
  // be a safe single segment. `createSessionId()` always yields that shape; the
  // explicit guard keeps the contract honest before any Storage key is built.
  const orderId = createSessionId();
  if (!isSafeOrderId(orderId)) {
    return fail("write_failed", 500);
  }

  // `putPhoto` builds its key as `photoKeyFor(orderId)` and returns it, so the
  // `photoKey` we persist below is `photoKeyFor(orderId)` by construction — the
  // atomic relation of Decision B, with no blank-then-patch.
  let photoKey: string;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    photoKey = await putPhoto(orderId, bytes, file.type);
  } catch {
    return fail("photo_upload_failed", 500);
  }

  try {
    const order = await createOrder({
      id: orderId,
      productId: product.productId,
      storyType: product.storyType,
      customerEmail,
      // The assembled, server-validated session — the engine consumes it verbatim.
      inputs: session,
      photoKey,
    });
    return NextResponse.json({ ok: true, orderId: order.id });
  } catch {
    return fail("order_create_failed", 500);
  }
}

/** camelCase required-field name → snake_case error suffix (e.g. petName → pet_name). */
function toSnake(field: string): string {
  return field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
