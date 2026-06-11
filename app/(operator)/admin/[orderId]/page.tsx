// Admin order review page (commerce PR-08). Server Component, AUTH-GATED: no
// logged-in Supabase session → redirect to login. Validates the order id, loads the
// order, and — for an order awaiting review — renders the REUSED preview stack
// against the order's on-disk book (orderId as the session id; see AdminBookReview),
// with an Approve action.
//
// An order not in `awaiting_review` (already approved, still generating, failed,
// etc.) has nothing to review here, so we send the operator back to the queue rather
// than render a stale/empty preview.

import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { getOperatorUserId } from "@/lib/supabase/auth";
import { isSafeOrderId } from "@/lib/supabase/ids";
import { getOrder } from "@/lib/order/store";
import { getProduct } from "@/lib/catalog/products";
import { SignOutButton } from "@/app/(operator)/admin/SignOutButton";
import { AdminBookReview } from "@/app/(operator)/admin/[orderId]/AdminBookReview";

interface ReviewProps {
  params: Promise<{ orderId: string }>;
}

export default async function AdminReviewPage({ params }: ReviewProps) {
  if (!(await getOperatorUserId())) {
    redirect("/admin/login");
  }

  const { orderId } = await params;
  if (!isSafeOrderId(orderId)) {
    notFound();
  }

  const order = await getOrder(orderId);
  if (!order) {
    notFound();
  }
  // Only an order in the review queue has a book to review + approve here.
  if (order.status !== "awaiting_review") {
    redirect("/admin");
  }

  const productTitle = getProduct(order.productId)?.title ?? order.productId;

  return (
    <div className="page-wrap">
      <header className="site-header">
        <Link href="/admin" className="wordmark">
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

      <div className="admin-review-bar">
        <Link href="/admin" className="btn-link">
          &larr; Back to the queue
        </Link>
        <span className="label">
          {productTitle} · {order.customerEmail}
        </span>
      </div>

      <AdminBookReview orderId={order.id} />

      <footer className="site-footer">
        <p className="label">Operator only · Local</p>
        <p className="label">Reviewed by hand</p>
      </footer>
    </div>
  );
}
