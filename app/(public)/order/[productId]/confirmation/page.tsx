import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/catalog/products";
import { BRAND } from "@/lib/brand";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// The post-payment confirmation page (commerce PR-06) — the target Lemon Squeezy
// redirects the customer to after a successful checkout. It is PURELY
// INFORMATIONAL: it grants access to nothing, advances no order state, and trusts
// no query param as proof of payment. Only the verified LS webhook
// (/api/webhooks/lemonsqueezy) moves the order forward. So this is a static Server
// Component (SSG, one per catalog product) with no data fetch — exactly the gentle
// "we've got it, we're painting it from your photo, check your email" message.
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
      ? `Order received — ${product.title} · ${BRAND}`
      : `Order received — ${BRAND}`,
  };
}

export default async function ConfirmationPage({ params }: ConfirmationProps) {
  const { productId } = await params;
  const product = getProduct(productId);

  if (!product) {
    notFound();
  }

  return (
    <div className="page-wrap">
      <SiteHeader />

      <main className="wizard">
        <div
          className="wizard__intro fade-in"
          style={{ textAlign: "center", maxWidth: "34em" }}
        >
          <span className="label label--gold">Thank you</span>
          <h1 className="display-md mt-4">We&apos;ve got it.</h1>
          <p className="lede mt-4">
            Your payment came through, and your <em>{product.title}</em> is now in
            our hands. We paint every book from your photo and finish it by hand,
            so this takes a little time — usually a day or two.
          </p>
          <p className="lede mt-4">
            When it&apos;s ready, we&apos;ll email you a link to your finished PDF.
            There&apos;s nothing more you need to do — you can close this page.
          </p>
          <div className="mt-12">
            <Link href="/books" className="btn btn--primary">
              See all books
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
