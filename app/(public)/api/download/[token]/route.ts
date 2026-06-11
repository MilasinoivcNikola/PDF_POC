// GET /api/download/[token] — the public download endpoint (commerce PR-09). The
// tokenized download PAGE (app/(public)/download/[token]/page.tsx) fetches this on
// mount to resolve a valid delivery token into a short-lived signed PDF URL.
//
// PUBLIC SURFACE (runs on Vercel): NO assertOperator() — it runs on the always-on
// public host. Same tier as PR-05's /api/order and PR-06's webhook: it MAY hold the
// service-role Supabase key (to look the order up by token + mint the signed URL)
// but must NEVER import the engine (lib/ai/*, Puppeteer, local-disk session IO).
// The boundary test asserts this route's import closure is engine-free. The DB
// access lives HERE (not the page) precisely so the public PAGE stays client-safe —
// it never imports lib/supabase/server.
//
// SECURITY:
//   - The token is the only credential. `isWellFormedToken` cheap-rejects garbage
//     before any DB hit; `getOrderByDeliveryToken` then resolves the single order it
//     is scoped to (unguessable + single-order ⇒ no IDOR/enumeration).
//   - Never return the permanent storage URL — only a short-lived SIGNED URL minted
//     on demand. A reload re-fetches and mints a fresh one, so re-download works
//     while the token is valid.
//   - The invalid/expired response body is the SAME regardless of whether the token
//     never existed or the order has no PDF yet — no signal about which (no
//     enumeration). The customer email (the one PII) is never echoed or logged.

import { NextResponse } from "next/server";
import { isWellFormedToken } from "@/lib/delivery/token";
import { getOrderByDeliveryToken } from "@/lib/order/store";
import { signedPdfUrl } from "@/lib/supabase/storage";
import { getStory } from "@/lib/story/registry";
import type { StorySession } from "@/lib/session/types";

/** Lifetime of the signed download URL: 5 minutes. The page fetches it on demand
 *  (and on each reload), so it only needs to outlive the click, not the email. */
const SIGNED_URL_TTL_SECONDS = 5 * 60;

interface DownloadParams {
  params: Promise<{ token: string }>;
}

/** The single soft-fail body — identical for "never existed" and "no PDF yet" so
 *  the response leaks no signal about which (no enumeration). */
function invalidOrExpired(): Response {
  return NextResponse.json(
    { ok: false, error: "invalid_or_expired" },
    { status: 404 },
  );
}

export async function GET(
  _request: Request,
  { params }: DownloadParams,
): Promise<Response> {
  const { token } = await params;

  // Cheap-reject garbage before any DB hit.
  if (!isWellFormedToken(token)) {
    return invalidOrExpired();
  }

  let order;
  try {
    order = await getOrderByDeliveryToken(token);
  } catch (error) {
    console.error("Download: order lookup by token failed:", error);
    return NextResponse.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }

  // No matching order, or the order has no rendered PDF yet — same soft body.
  if (!order || !order.pdfKey) {
    return invalidOrExpired();
  }

  // The download filename is product-agnostic via the registry (Story 1 →
  // Saying-Goodbye-to-[PET].pdf, Story 2 → Letter-from-[PET].pdf). `order.inputs`
  // is the captured session the registry resolves; each impl narrows by storyType.
  const filename = getStory(order.storyType).pdfFilename(
    order.inputs as StorySession,
  );

  let downloadUrl: string;
  try {
    // Set the signed URL's Content-Disposition filename so the browser saves the
    // correctly-named file even if the anchor's `download` attr is ignored.
    downloadUrl = await signedPdfUrl(order.id, SIGNED_URL_TTL_SECONDS, filename);
  } catch (error) {
    console.error(`Download: failed to sign PDF URL for order ${order.id}:`, error);
    return NextResponse.json({ ok: false, error: "sign_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    downloadUrl,
    filename,
    petName: order.inputs.pet.name,
  });
}
