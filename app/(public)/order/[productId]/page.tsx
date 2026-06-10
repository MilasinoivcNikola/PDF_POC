import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/catalog/products";
import styles from "./page.module.css";

interface OrderProps {
  params: Promise<{ productId: string }>;
}

/** Prerender an order placeholder for each catalog product. */
export function generateStaticParams(): { productId: string }[] {
  return getProducts().map((product) => ({ productId: product.productId }));
}

export async function generateMetadata({
  params,
}: OrderProps): Promise<Metadata> {
  const { productId } = await params;
  const product = getProduct(productId);
  return {
    title: product ? `Order ${product.title} — Quietly Kept` : "Order — Quietly Kept",
  };
}

// PR-04 stub: this route exists only so the "Order this book" CTA resolves. The
// real order form, photo upload, and Lemon Squeezy checkout arrive in PR-05/06.
export default async function OrderPage({ params }: OrderProps) {
  const { productId } = await params;
  const product = getProduct(productId);

  if (!product) {
    notFound();
  }

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
        <div className="label">Ordering · {product.title}</div>
      </header>

      <main className={styles.order}>
        <div className={`${styles.card} fade-in fade-in-1`}>
          <div className={styles.ornament}>
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24 8 C 22 14, 20 18, 14 20 C 20 22, 22 26, 24 32 C 26 26, 28 22, 34 20 C 28 18, 26 14, 24 8 Z"
                fill="currentColor"
                opacity="0.8"
              />
              <circle cx="24" cy="40" r="1.5" fill="currentColor" opacity="0.5" />
            </svg>
          </div>

          <span className="label label--gold">Coming soon</span>
          <h1 className={`display-md ${styles.title}`}>
            Ordering opens <em>soon</em>.
          </h1>
          <p className={styles.body}>
            We&apos;re finishing the checkout for{" "}
            <strong>{product.title}</strong>. Very soon you&apos;ll be able to
            answer a few gentle questions, share a photo, and we&apos;ll paint
            your book by hand and send you a print-quality PDF.
          </p>
          <p className={styles.meta}>
            Thank you for your patience — this part is being made with the same
            care as the books.
          </p>

          <div className={styles.actions}>
            <Link href={`/books/${product.productId}`} className="btn btn--primary">
              Back to {product.title}
            </Link>
            <Link href="/books" className="btn-link">
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
