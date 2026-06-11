import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/catalog/products";

// The post-payment confirmation page (commerce PR-06) — the target Lemon Squeezy
// redirects the customer to after a successful checkout. It is PURELY
// INFORMATIONAL: it grants access to nothing, advances no order state, and trusts
// no query param as proof of payment. Only the verified LS webhook
// (/api/webhooks/lemonsqueezy) moves the order forward. So this is a static Server
// Component (SSG, one per catalog product) with no data fetch — exactly the gentle
// "we've got it, we're painting it by hand, check your email" message.
//
// PUBLIC SURFACE: imports only the client-safe catalog (for the title); engine-free
// like the rest of the public route graph.

interface ConfirmationProps {
  params: Promise<{ productId: string }>;
}

/** Prerender the confirmation page for each catalog product. */
export function generateStaticParams(): { productId: string }[] {
  return getProducts().map((product) => ({ productId: product.productId }));
}

export async function generateMetadata({
  params,
}: ConfirmationProps): Promise<Metadata> {
  const { productId } = await params;
  const product = getProduct(productId);
  return {
    title: product
      ? `Order received — ${product.title} · Quietly Kept`
      : "Order received — Quietly Kept",
  };
}

const wordmark = (
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
);

export default async function ConfirmationPage({ params }: ConfirmationProps) {
  const { productId } = await params;
  const product = getProduct(productId);

  if (!product) {
    notFound();
  }

  return (
    <div className="page-wrap">
      <header className="site-header">
        <Link href="/" className="wordmark">
          {wordmark}
          Quietly Kept
        </Link>
        <div className="label">Order received</div>
      </header>

      <main className="wizard">
        <div
          className="wizard__intro fade-in"
          style={{ textAlign: "center", maxWidth: "34em" }}
        >
          <span className="label label--gold">Thank you</span>
          <h1 className="display-md mt-4">We&apos;ve got it.</h1>
          <p className="lede mt-4">
            Your payment came through, and your <em>{product.title}</em> is now in
            our hands. We paint every book by hand, so this takes a little time —
            usually a day or two.
          </p>
          <p className="lede mt-4">
            When it&apos;s ready, we&apos;ll email you a link to your finished PDF.
            There&apos;s nothing more you need to do — you can close this page.
          </p>
          <div className="mt-12">
            <Link href="/books" className="btn btn--primary">
              See all keepsakes
            </Link>
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <Link href="/policies" className="label">
          How it&apos;s made · Policies
        </Link>
        <p className="label">Made slowly · Made by hand</p>
      </footer>
    </div>
  );
}
