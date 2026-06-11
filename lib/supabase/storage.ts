// Supabase Storage helpers for an order's two private artifacts: the uploaded pet
// photo (input) and the rendered PDF (output). SERVER-SIDE ONLY (imports the
// service-role client). Both buckets are PRIVATE — nothing is publicly readable;
// delivery mints a short-lived signed URL on demand (`signedPdfUrl`).
//
// Every key is built from a validated order id (`isSafeOrderId`) so an untrusted
// id can never point a put/get at an object outside the order's own prefix.

import { isSafeOrderId } from "@/lib/supabase/ids";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Private bucket holding uploaded pet photos (order inputs). */
export const PHOTOS_BUCKET = "order-photos";
/** Private bucket holding rendered book PDFs (order outputs). */
export const PDFS_BUCKET = "order-pdfs";

/** Default lifetime of a signed PDF download URL: 1 hour. */
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Validate the order id and return it, or throw. Centralizes the guard so every
 * key builder below is safe by construction.
 */
function assertSafeId(orderId: string): string {
  if (!isSafeOrderId(orderId)) {
    throw new Error(`Invalid order id: ${orderId}`);
  }
  return orderId;
}

/** Storage key of an order's photo: `order-photos/<id>/photo`. */
export function photoKeyFor(orderId: string): string {
  return `${assertSafeId(orderId)}/photo`;
}

/** Storage key of an order's PDF: `order-pdfs/<id>.pdf`. */
export function pdfKeyFor(orderId: string): string {
  return `${assertSafeId(orderId)}.pdf`;
}

/**
 * Upload an order's pet photo to the private `order-photos` bucket and return its
 * storage key (to persist as `Order.photoKey`). `upsert` so a re-upload for the
 * same order replaces cleanly. `contentType` defaults to a generic image type;
 * pass the real one (e.g. `image/jpeg`) when known.
 */
export async function putPhoto(
  orderId: string,
  body: Buffer,
  contentType = "application/octet-stream",
): Promise<string> {
  const key = photoKeyFor(orderId);
  const { error } = await getSupabaseAdmin()
    .storage.from(PHOTOS_BUCKET)
    .upload(key, body, { contentType, upsert: true });
  if (error) {
    throw new Error(`Failed to upload photo for order ${orderId}: ${error.message}`);
  }
  return key;
}

/**
 * Download an order's pet photo from the private `order-photos` bucket as a
 * `Buffer` (for the local worker to feed the engine). The id is validated by
 * `photoKeyFor`.
 */
export async function getPhoto(orderId: string): Promise<Buffer> {
  const key = photoKeyFor(orderId);
  const { data, error } = await getSupabaseAdmin()
    .storage.from(PHOTOS_BUCKET)
    .download(key);
  if (error || !data) {
    throw new Error(
      `Failed to download photo for order ${orderId}: ${error?.message ?? "no data"}`,
    );
  }
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Upload an order's rendered PDF to the private `order-pdfs` bucket and return its
 * storage key (to persist as `Order.pdfKey`). `upsert` so an approved re-render
 * replaces the previous file.
 */
export async function putPdf(orderId: string, body: Buffer): Promise<string> {
  const key = pdfKeyFor(orderId);
  const { error } = await getSupabaseAdmin()
    .storage.from(PDFS_BUCKET)
    .upload(key, body, { contentType: "application/pdf", upsert: true });
  if (error) {
    throw new Error(`Failed to upload PDF for order ${orderId}: ${error.message}`);
  }
  return key;
}

/**
 * Mint a short-lived signed URL for an order's PDF so the delivery/download path
 * (PR-09) can serve a private object without making the bucket public. Default
 * lifetime is one hour; pass `expiresIn` (seconds) to override. Pass `downloadName`
 * to set the signed URL's `Content-Disposition` filename so the browser saves the
 * correctly-named file (e.g. `Saying-Goodbye-to-Otis.pdf`) straight from the link.
 * The id is validated by `pdfKeyFor`.
 */
export async function signedPdfUrl(
  orderId: string,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
  downloadName?: string,
): Promise<string> {
  const key = pdfKeyFor(orderId);
  const { data, error } = await getSupabaseAdmin()
    .storage.from(PDFS_BUCKET)
    .createSignedUrl(
      key,
      expiresIn,
      downloadName !== undefined ? { download: downloadName } : undefined,
    );
  if (error || !data) {
    throw new Error(
      `Failed to sign PDF URL for order ${orderId}: ${error?.message ?? "no data"}`,
    );
  }
  return data.signedUrl;
}
