// Admin review queue (commerce PR-08). Server Component, AUTH-GATED: no logged-in
// Supabase session → redirect to the login page. Lists the orders that need the
// operator's attention — `awaiting_review` (generated, ready for the ~30-second
// glance + Approve) and `failed` (errored, with the stored reason + a re-queue
// action). Each awaiting-review order links to its detail page (the reused preview).
//
// Data comes from the service-role store (`listOrdersByStatus`), which bypasses RLS
// — that's fine here: this page only ever renders on the local operator surface
// (the (operator) layout 404s it under a public build) AND behind the auth gate.

import { redirect } from "next/navigation";
import Link from "next/link";

import { getOperatorUserId } from "@/lib/supabase/auth";
import { listOrdersByStatus } from "@/lib/order/store";
import type { Order } from "@/lib/order/types";
import { getProduct } from "@/lib/catalog/products";
import { SignOutButton } from "@/app/(operator)/admin/SignOutButton";
import { RequeueButton } from "@/app/(operator)/admin/RequeueButton";

/** A short, locale-independent date for the queue ("2026-06-11"). */
function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Human product title for an order, falling back to its raw product id. */
function productLabel(order: Order): string {
  return getProduct(order.productId)?.title ?? order.productId;
}

export default async function AdminQueuePage() {
  if (!(await getOperatorUserId())) {
    redirect("/admin/login");
  }

  const [awaitingReview, failed] = await Promise.all([
    listOrdersByStatus("awaiting_review"),
    listOrdersByStatus("failed"),
  ]);

  return (
    <div className="page-wrap">
      <header className="site-header">
        <Link href="/" className="wordmark">
          <svg
            className="wordmark__ornament"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 8 Q4 5 6 4 Q8 5 7 8 Z M13 8 Q15 5 13 4 Q11 5 12 8 Z M3 12 Q1 10 3 9 Q5 10 4 12 Z M16 12 Q18 10 16 9 Q14 10 15 12 Z M10 17 Q5 17 5 12 Q5 9 10 9 Q15 9 15 12 Q15 17 10 17 Z"
              fill="currentColor"
              opacity="0.7"
            />
          </svg>
          Quietly Kept
        </Link>
        <SignOutButton />
      </header>

      <main className="admin">
        <div className="admin__intro">
          <h1 className="display-md">The review desk</h1>
          <p className="lede" style={{ marginTop: "var(--s-3)" }}>
            Each book is reviewed by hand before it ships. Open one, look it over,
            repaint anything that drifted, and approve it when it&apos;s right.
          </p>
        </div>

        <section className="admin__section">
          <div className="admin__section-head">
            <h2 className="display-sm">Waiting for review</h2>
            <span className="label">{awaitingReview.length} in queue</span>
          </div>
          {awaitingReview.length === 0 ? (
            <p className="admin__empty">Nothing waiting. The queue is clear.</p>
          ) : (
            <ul className="admin__list">
              {awaitingReview.map((order) => (
                <li className="admin__row" key={order.id}>
                  <Link href={`/admin/${order.id}`} className="admin__row-main">
                    <span className="admin__row-title">{productLabel(order)}</span>
                    <span className="admin__row-meta">
                      {order.customerEmail} · {shortDate(order.createdAt)}
                    </span>
                    <span className="admin__row-id">{order.id}</span>
                  </Link>
                  <span className="admin__row-action">
                    <Link href={`/admin/${order.id}`} className="btn btn--primary">
                      Review
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin__section">
          <div className="admin__section-head">
            <h2 className="display-sm">Failed</h2>
            <span className="label">{failed.length} need attention</span>
          </div>
          {failed.length === 0 ? (
            <p className="admin__empty">No failed orders.</p>
          ) : (
            <ul className="admin__list">
              {failed.map((order) => (
                <li className="admin__row admin__row--failed" key={order.id}>
                  <div className="admin__row-main">
                    <span className="admin__row-title">{productLabel(order)}</span>
                    <span className="admin__row-meta">
                      {order.customerEmail} · {shortDate(order.createdAt)}
                    </span>
                    <span className="admin__row-id">{order.id}</span>
                    {order.error ? (
                      <span className="admin__row-error">{order.error}</span>
                    ) : null}
                  </div>
                  <span className="admin__row-action">
                    <RequeueButton orderId={order.id} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p className="label">Operator only · Local</p>
        <p className="label">Reviewed by hand</p>
      </footer>
    </div>
  );
}
