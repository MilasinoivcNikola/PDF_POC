# Current Feature

Commerce PR-09 — Delivery via Resend

## Status

In Progress

## Goals

- Approving an order (the PR-08 Approve action) **emails the customer** a working,
  tokenized download link in the *Quietly Kept* tone and moves the order
  `approved → delivered`.
- The email links to a **public tokenized download page** (`/download/[token]`),
  never a raw storage URL. The page verifies the token and serves the PDF via a
  **short-lived signed Supabase URL** (reuse `signedPdfUrl`), with the correct
  filename (`Saying-Goodbye-to-[PET_NAME].pdf` / `Letter-from-[PET_NAME].pdf`).
- The delivery **token is unguessable and scoped to one order**; stored on the
  order (`Order.deliveryToken`, already in the contract). Re-download works while
  the token is valid.
- An **expired/invalid token degrades gracefully** — a soft on-brand notice, no
  white-screen and no leak of why it failed.
- **Closes the MVP loop:** order → pay → generate → approve → email → download.
- Gates green: `npm run build`, `npm run test:run`, `tsc --noEmit`; qa PASS.

## Notes

**Craft Area 3 (UI / API / commerce) → `nextjs-ui-builder`.** This is the public
download page + an operator-side email-on-approve step + the `approved → delivered`
transition. No engine, no generation, no Puppeteer change.

**Deploy-surface split (the load-bearing boundary).** Two distinct surfaces:
- **Operator (local):** the Approve action sends the email. `lib/delivery/email.ts`
  (Resend client) is server-only and lives on the operator surface, chained off the
  existing `app/(operator)/api/admin/approve/route.ts` after the PDF is uploaded +
  status is `approved`.
- **Public (Vercel):** the new `app/(public)/download/[token]/page.tsx`. It uses the
  **service-role** Supabase client (to look up the order by token + mint the signed
  URL) but must stay **engine-free** — so it goes in `PUBLIC_*` entries of the
  boundary guard (`lib/runtime/surface.boundary.test.ts`), not the engine list.

**New code expected:**
- `lib/delivery/email.ts` — Resend client + the delivery email (warm copy, download
  link). Env: `RESEND_API_KEY`, `FROM_EMAIL` (server-only secrets; add to
  `.env.local.example`).
- `lib/delivery/token.ts` (or similar) — pure, testable token mint + the verify
  helper. Unguessable (crypto-random), scoped to one order.
- A **store lookup by token** — `getOrder` is by id only; the download page needs
  `getOrderByDeliveryToken(token)` (a unique partial index on `delivery_token`
  already exists from migration 0001). Returns `null` on no match → soft notice.
- A way to **persist the token + move to `delivered`** in one guarded write.
  `updateOrderStatus` currently patches `error`/`pdfKey` only — the cleanest parallel
  is to add a `deliveryToken` option to that same guarded patch (mirrors how `pdfKey`
  rides the `approved` move), writing token + `delivered` together. (Alternative: a
  dedicated `setOrderDeliveryToken` mirroring `setOrderLsId`.) Decide at `start`.

**Reuse (per spec):** `signedPdfUrl` (PR-01, already built — default 1h TTL, private
bucket), `storyPdfFilename`/`letterPdfFilename` for the download filename, the
soft-error preview pattern (no white-screen). State machine already allows
`approved → delivered`.

**Email-on-approve flow (the chain to wire):** Approve route already does render →
`putPdf` → `updateOrderStatus(…, "approved", { pdfKey })`. PR-09 extends it: after
`approved`, mint token → store it → send the email → `delivered`. Open design call
for `start`: whether a Resend/email failure should leave the order at `approved`
(operator retries delivery) vs. failing the whole approve — recommend **leaving it
`approved`** so a transient email outage never strands a rendered book, and surface
the failure to the operator. (Token can be minted before `approved → delivered` so
the link in the email is valid the moment it's stored.)

**Security (do not regress) — commerce diff, so `review` runs `commerce-security-reviewer`:**
- Never email or expose the permanent storage URL — only the tokenized page, which
  mints a short-lived signed URL on demand.
- Token must be unguessable + single-order-scoped (no IDOR/enumeration).
- Service-role key stays server-only; the public download page is engine-free.
- No PII/secret in logs or error bodies (the email address is the one piece of PII
  in play).

**Deferred PM decision to settle here (blocking per 00-overview):** the **refund /
remake policy copy** — surface it in the delivery email and/or download-page footer.
Flag for Nikola before `complete`.

**Out of scope:** re-send flow, customer order lookup, account history — all post-MVP.
This is the last MVP PR; PR-10 (new-book playbook) is the only thing after.
