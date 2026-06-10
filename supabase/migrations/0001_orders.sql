-- 0001_orders.sql — the order data spine (PR-01).
--
-- Creates the `orders` table (one row per book purchase), its indexes, Row Level
-- Security (RLS) locked to the service role only, and the two PRIVATE Storage
-- buckets for an order's photo (input) and PDF (output).
--
-- SECURITY MODEL (defence in depth on top of the server-only service-role client
-- in lib/supabase/server.ts):
--   * RLS is ENABLED on `orders` with NO policies for the `anon` / `authenticated`
--     roles, so the public anon key cannot read or write a single row. The
--     service-role key bypasses RLS (by design) — it is the only thing that
--     touches this table, and it lives only on the operator/worker surface.
--   * Both Storage buckets are created with `public = false`, so objects are never
--     publicly readable; the app mints short-lived signed URLs for delivery.
--
-- Columns mirror lib/order/types.ts `Order` (snake_case here ↔ camelCase there;
-- the mapping lives in lib/order/store.ts `rowToOrder` / `orderToRow`).

-- ---------------------------------------------------------------------------
-- orders table
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  -- Primary key. The app supplies a crypto UUID (createSessionId); we also default
  -- one so a direct insert is well-formed. Stored as text to match the app's id
  -- shape (and the storage-key id guard `^[A-Za-z0-9_-]{1,200}$`).
  id              text        primary key default gen_random_uuid()::text,

  -- Catalog product id (e.g. "story-1-book"); set by the catalog PR.
  product_id      text        not null,

  -- Which engine product to generate: "story-1" | "story-2".
  story_type      text        not null,

  -- Fulfillment lifecycle. Constrained to the OrderStatus union; the legal
  -- transitions between these live in the app (lib/order/state.ts), not the DB.
  status          text        not null default 'pending_payment'
                  check (status in (
                    'pending_payment', 'paid', 'queued', 'generating',
                    'awaiting_review', 'approved', 'delivered',
                    'failed', 'refunded', 'cancelled'
                  )),

  -- Buyer email — delivery target.
  customer_email  text        not null,

  -- Captured wizard inputs (StorySession | Story2Session), consumed verbatim by
  -- the engine. jsonb so the worker reads the exact shape the wizard produced.
  inputs          jsonb       not null,

  -- Storage object keys (private buckets), not URLs.
  photo_key       text        not null,
  pdf_key         text,

  -- Lemon Squeezy order id, linked when the paid webhook fires.
  ls_order_id     text,

  -- Opaque token gating the delivery/download link.
  delivery_token  text,

  -- Human-readable failure reason when status = 'failed'.
  error           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.orders is
  'One book order moving through the fulfillment state machine. Service-role access only (RLS).';

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------

-- listOrdersByStatus() filters on status and orders by created_at (worker drains
-- 'paid'/'queued'; admin queue reads 'awaiting_review').
create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at);

-- The Lemon Squeezy webhook (PR-06) links payment → order by ls_order_id. Unique:
-- one LS order maps to at most one of ours. Partial so multiple NULLs are allowed
-- before payment.
create unique index if not exists orders_ls_order_id_key
  on public.orders (ls_order_id)
  where ls_order_id is not null;

-- The delivery page (PR-09) looks an order up by its delivery token. Unique +
-- partial for the same reason (tokens are minted late).
create unique index if not exists orders_delivery_token_key
  on public.orders (delivery_token)
  where delivery_token is not null;

-- ---------------------------------------------------------------------------
-- updated_at trigger — keep updated_at honest even for raw SQL writes
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — service role only; anon/authenticated denied
-- ---------------------------------------------------------------------------

-- Enable RLS. With NO policies granted to anon/authenticated, those roles can
-- neither read nor write any row. The service-role key bypasses RLS, so the
-- server-only data layer (lib/order/store.ts) is unaffected; the public anon key
-- is fully locked out. This is defence in depth behind the server-only client.
alter table public.orders enable row level security;

-- Belt-and-braces: force RLS so even the table owner is subject to it (the
-- service role still bypasses via its BYPASSRLS attribute).
alter table public.orders force row level security;

-- (No `create policy` statements: absence of a policy means deny for any
-- non-bypassing role. Documented explicitly so a future edit doesn't add an
-- over-broad public policy by accident.)

-- ---------------------------------------------------------------------------
-- Private Storage buckets
-- ---------------------------------------------------------------------------

-- order-photos: uploaded pet photos (order inputs). PRIVATE.
insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', false)
on conflict (id) do nothing;

-- order-pdfs: rendered book PDFs (order outputs). PRIVATE.
insert into storage.buckets (id, name, public)
values ('order-pdfs', 'order-pdfs', false)
on conflict (id) do nothing;

-- No storage RLS policies are created for anon/authenticated on these buckets, so
-- they are reachable only via the service-role client (uploads/downloads in
-- lib/supabase/storage.ts) and via short-lived signed URLs the app mints.
