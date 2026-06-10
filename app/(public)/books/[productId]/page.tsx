import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/catalog/products";
import { formatPriceUsd } from "@/lib/catalog/price";
import styles from "./page.module.css";

interface DetailProps {
  params: Promise<{ productId: string }>;
}

/** Prerender both catalog products as static pages. */
export function generateStaticParams(): { productId: string }[] {
  return getProducts().map((product) => ({ productId: product.productId }));
}

export async function generateMetadata({
  params,
}: DetailProps): Promise<Metadata> {
  const { productId } = await params;
  const product = getProduct(productId);
  if (!product) {
    return { title: "Not found — Quietly Kept" };
  }
  return {
    title: `${product.title} — Quietly Kept`,
    description: product.tagline,
  };
}

export default async function BookDetailPage({ params }: DetailProps) {
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
        <Link href="/books" className="btn-link">
          ← All keepsakes
        </Link>
      </header>

      <main className={styles.detail}>
        <article className={`${styles.layout} fade-in fade-in-1`}>
          <div className={styles.gallery}>
            {product.sampleImages.map((src, i) => (
              <div
                key={src}
                className={`${styles.galleryItem} ${
                  i === 0 ? styles.galleryItemLead : ""
                }`}
              >
                <img
                  src={src}
                  alt={`Sample page ${i + 1} from “${product.title}”`}
                  width={800}
                  height={800}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>

          <div className={styles.info}>
            <span className="label label--gold">A keepsake book</span>
            <h1 className={`display-md ${styles.title}`}>{product.title}</h1>
            <p className={styles.tagline}>{product.tagline}</p>

            <p className={styles.description}>{product.description}</p>

            <ul className={styles.facts}>
              <li>
                <span className={styles.factLabel}>Price</span>
                <span className={styles.factValue}>
                  {formatPriceUsd(product.priceUsd)}
                </span>
              </li>
              <li>
                <span className={styles.factLabel}>Illustrations</span>
                <span className={styles.factValue}>
                  {product.illustrationCount} painted from your photo
                </span>
              </li>
              <li>
                <span className={styles.factLabel}>Made</span>
                <span className={styles.factValue}>By hand, in 24–48 hours</span>
              </li>
            </ul>

            <div className={styles.cta}>
              <Link
                href={`/order/${product.productId}`}
                className="btn btn--primary"
              >
                Order this book
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                  <path
                    d="M1 6h16m0 0L12 1m5 5l-5 5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>
              <p className={styles.ctaMeta}>
                A few gentle questions and a photo. We paint it and send you a
                print-quality PDF.
              </p>
            </div>
          </div>
        </article>
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
