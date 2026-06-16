import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProduct,
  getProducts,
  productDisplayTitle,
} from "@/lib/catalog/products";
import { formatPriceUsd } from "@/lib/catalog/price";
import { BRAND } from "@/lib/brand";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { BookGallery } from "@/components/site/BookGallery";
import styles from "./page.module.css";

interface DetailProps {
  params: Promise<{ productId: string }>;
}

/**
 * The Story 2 ↔ Story 5 companion pairing — "one letter from them, one from you."
 * Each maps to the OTHER product's id; the detail page surfaces a copy-only
 * cross-link (no bundle SKU, no combined-price cart — that is out of scope). Other
 * products have no companion.
 */
const COMPANION_PRODUCT_ID: Record<string, string> = {
  "story-2-letter": "story-5-letter-to",
  "story-5-letter-to": "story-2-letter",
};

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
    return { title: `Not found — ${BRAND}` };
  }
  return {
    title: `${productDisplayTitle(product)} — ${BRAND}`,
    description: product.tagline,
  };
}

export default async function BookDetailPage({ params }: DetailProps) {
  const { productId } = await params;
  const product = getProduct(productId);

  if (!product) {
    notFound();
  }

  const companion = COMPANION_PRODUCT_ID[product.productId]
    ? getProduct(COMPANION_PRODUCT_ID[product.productId])
    : null;

  // The detail accent follows the book's audience (PR-1): gold celebrates a living
  // pet, rose remembers one who has died — matching the catalog card's family tint.
  const living = product.audience === "living";
  const title = productDisplayTitle(product);

  return (
    <div className="page-wrap">
      <SiteHeader current="books" />

      <main className={styles.detail}>
        <article className={`${styles.layout} fade-in fade-in-1`}>
          <BookGallery
            sampleImages={product.sampleImages}
            title={title}
            audience={product.audience}
          />

          <div className={styles.info}>
            <span
              className={living ? `label ${styles.eyebrowGold}` : `label ${styles.eyebrowRose}`}
            >
              A keepsake book
            </span>
            <h1 className={`display-md ${styles.title}`}>{title}</h1>
            <p
              className={
                living ? `${styles.tagline} ${styles.taglineGold}` : styles.tagline
              }
            >
              {product.tagline}
            </p>

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
              {product.previewPdf ? (
                <a
                  href={product.previewPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--ghost"
                >
                  See the full book (PDF)
                </a>
              ) : null}
              <p className={styles.ctaMeta}>
                A few gentle questions and a photo. We paint it and send you a
                print-quality PDF.
              </p>
            </div>

            {companion ? (
              <div className={styles.companion}>
                <span className={styles.companionKicker}>
                  One from them, one from you
                </span>
                <p className={styles.companionBody}>
                  {product.storyType === "story-5"
                    ? "This is the letter you write to them. Its companion is the letter they write to you — at the Rainbow Bridge, in their own voice."
                    : "This is the letter they write to you. Its companion is the one you write to them — the thank-you, the apology, the last good day."}
                </p>
                <Link
                  href={`/books/${companion.productId}`}
                  className={styles.companionLink}
                >
                  See &ldquo;{productDisplayTitle(companion)}&rdquo;
                  <svg width="16" height="11" viewBox="0 0 18 12" fill="none">
                    <path
                      d="M1 6h16m0 0L12 1m5 5l-5 5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
