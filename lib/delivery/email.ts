// Delivery email via Resend (commerce PR-09) — the final step that hands a finished
// book to the customer. SERVER-ONLY: it reads RESEND_API_KEY and constructs the
// Resend client, so it lives on the operator surface (chained off the Approve
// route) and must never reach a client/public bundle.
//
// Split, like lib/order/lemonsqueezy.ts, into a PURE builder + a thin sender:
//   - `buildDeliveryEmail(...)` returns `{ subject, html, text }` — no IO, no SDK,
//     unit-tested for the payload (download link present, Quietly Kept tone, the
//     /policies footer line). The download URL is the tokenized PUBLIC page, never a
//     raw storage URL.
//   - `sendDeliveryEmail(...)` builds the payload and calls Resend `.emails.send`.
//     The key is read lazily (mirrors lib/ai/client.ts) and never logged.
//
// Tone: warm, grief-appropriate, NOT salesy. This is a bereaved customer receiving
// the keepsake of a pet that died.

import { Resend } from "resend";
import type { StoryType } from "@/lib/session/types";

/** Lazily-constructed singleton so importing this module has no side effects. */
let cached: Resend | null = null;

/**
 * The shared Resend client. Throws a readable error if the key is missing so a
 * delivery attempt fails clearly instead of inside the SDK. The key is read from
 * `process.env.RESEND_API_KEY` and never logged. Mirrors `getOpenAI()`.
 */
export function getResend(): Resend {
  if (cached) {
    return cached;
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env.local (see .env.local.example).",
    );
  }
  cached = new Resend(apiKey);
  return cached;
}

/** Inputs the pure builder needs to compose the delivery email. */
export interface DeliveryEmailInput {
  /** The customer's email address (the recipient — the one piece of PII). */
  to: string;
  /** The pet's name, for warm, personal copy. */
  petName: string;
  /** Which product, so the copy reads "book" vs "letter". */
  storyType: StoryType;
  /** The tokenized PUBLIC download page URL (never a raw storage URL). */
  downloadUrl: string;
}

/** The composed email payload — exactly what Resend `.emails.send` needs (minus `from`). */
export interface DeliveryEmailPayload {
  subject: string;
  html: string;
  text: string;
}

/** "letter" (Story 2 / Story 4) or "book" (Story 1) — the noun the copy uses. */
function keepsakeNoun(storyType: StoryType): string {
  return storyType === "story-2" || storyType === "story-4" ? "letter" : "book";
}

/**
 * Compose the delivery email payload (PURE — no IO, no SDK). Returns the subject +
 * an HTML and a plain-text body. Both bodies link to `downloadUrl` (the tokenized
 * public page) and carry a gentle footer pointing at /policies for the refund /
 * remake promise.
 */
export function buildDeliveryEmail(input: DeliveryEmailInput): DeliveryEmailPayload {
  const { petName, storyType, downloadUrl } = input;
  const noun = keepsakeNoun(storyType);
  const policiesUrl = policiesUrlFrom(downloadUrl);

  const subject = `${petName}'s ${noun} is ready`;

  const text = [
    `Your ${noun} for ${petName} is finished.`,
    "",
    `We painted it by hand, and it's ready for you to keep.`,
    "",
    `Download it here:`,
    downloadUrl,
    "",
    `You can return to this link to download it again whenever you need it.`,
    "",
    `With care,`,
    `Quietly Kept`,
    "",
    `If something about your ${noun} isn't right, our refund and remake promise is here: ${policiesUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#FBF7EE;font-family:Georgia,'Times New Roman',serif;color:#3C2D1E;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7EE;">
      <tr>
        <td align="center" style="padding:40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#A88147;padding-bottom:16px;">
                Quietly Kept
              </td>
            </tr>
            <tr>
              <td style="font-size:26px;font-style:italic;line-height:1.3;padding-bottom:20px;">
                ${escapeHtml(petName)}&rsquo;s ${noun} is ready.
              </td>
            </tr>
            <tr>
              <td style="font-size:16px;line-height:1.7;color:#5A4F44;padding-bottom:24px;">
                We painted it by hand, and it&rsquo;s ready for you to keep.
                Take your time with it.
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <a href="${escapeHtml(downloadUrl)}"
                   style="display:inline-block;background:#3C2D1E;color:#FBF7EE;text-decoration:none;
                          font-size:15px;letter-spacing:0.04em;padding:14px 28px;border-radius:2px;">
                  Download your ${noun}
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;line-height:1.7;color:#7A6E5F;padding-bottom:32px;">
                You can return to this link to download it again whenever you need it.
              </td>
            </tr>
            <tr>
              <td style="font-size:14px;font-style:italic;color:#5A4F44;padding-bottom:32px;">
                With care,<br />Quietly Kept
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #E3D9C6;padding-top:20px;font-size:13px;line-height:1.6;color:#9A8E7D;">
                If something about your ${noun} isn&rsquo;t right, our
                <a href="${escapeHtml(policiesUrl)}" style="color:#9A8E7D;">refund and remake promise</a>
                is here for you.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

/**
 * Build the absolute /policies URL from the download URL's origin, so the footer
 * link always points at the same public site the download link does. Falls back to
 * a relative path if the download URL can't be parsed (it always can in practice —
 * the approve route builds it from PUBLIC_SITE_URL).
 */
function policiesUrlFrom(downloadUrl: string): string {
  try {
    return new URL("/policies", downloadUrl).toString();
  } catch {
    return "/policies";
  }
}

/** Minimal HTML escaping for the values interpolated into the email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send the delivery email via Resend. Builds the payload with `buildDeliveryEmail`
 * and sends it from `FROM_EMAIL`. Throws on a missing `FROM_EMAIL`, a missing key
 * (via `getResend`), or a Resend API error — the caller (the Approve route) catches
 * and leaves the order at `approved` so a finished book is never stranded.
 */
export async function sendDeliveryEmail(input: DeliveryEmailInput): Promise<void> {
  const from = process.env.FROM_EMAIL;
  if (!from) {
    throw new Error(
      "FROM_EMAIL is not set. Add it to .env.local (see .env.local.example).",
    );
  }

  const { subject, html, text } = buildDeliveryEmail(input);
  const { error } = await getResend().emails.send({
    from,
    to: input.to,
    subject,
    html,
    text,
  });

  // Resend returns `{ data, error }` rather than throwing on an API-level failure.
  // The message is the API's, not ours — it carries no secret (and never the key);
  // we don't include the recipient in it.
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
