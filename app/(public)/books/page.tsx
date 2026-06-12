import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/lib/catalog/products";
import { formatPriceUsd } from "@/lib/catalog/price";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "The keepsakes — Quietly Kept",
  description:
    "Personalized pet-memorial books, made by hand from your own photo. Choose a gentle goodbye for a child, or a letter in your pet's own voice.",
};

export default function BooksPage() {
  const products = getProducts();

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
        <div className="label">The keepsakes</div>
      </header>

      <main className={styles.catalog}>
        <section className={`${styles.intro} fade-in fade-in-1`}>
          <span className="label label--gold">Made by hand</span>
          <h1 className={`display-lg ${styles.introTitle}`}>
            A keepsake for <em>every kind</em> of love.
          </h1>
          <p className="lede">
            Each keepsake is illustrated from a photo of your own pet and written
            with care. Choose the one that fits — a story to read with your
            child, a goodbye letter in your pet&apos;s own voice, or a joyful
            letter for the one still curled up beside you.
          </p>
        </section>

        <section className={`${styles.grid} fade-in fade-in-2`}>
          {products.map((product) => (
            <Link
              key={product.productId}
              href={`/books/${product.productId}`}
              className={styles.card}
            >
              <div className={styles.cardArt}>
                {product.sampleImages[0] ? (
                  <img
                    src={product.sampleImages[0]}
                    alt={`A sample illustration from “${product.title}”`}
                    width={800}
                    height={800}
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>{product.title}</h2>
                <p className={styles.cardTagline}>{product.tagline}</p>
                <div className={styles.cardMeta}>
                  <span className={styles.cardPrice}>
                    {formatPriceUsd(product.priceUsd)}
                  </span>
                  <span className={styles.cardArrow} aria-hidden>
                    <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                      <path
                        d="M1 6h16m0 0L12 1m5 5l-5 5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
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
