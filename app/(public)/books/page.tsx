import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/lib/catalog/products";
import { formatPriceUsd } from "@/lib/catalog/price";
import { BRAND } from "@/lib/brand";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: `The books — ${BRAND}`,
  description:
    "Personalized illustrated books starring your own pet, made by hand from your photo — joyful adventures and gotcha-day tales, or a gentle goodbye for a child.",
};

export default function BooksPage() {
  const products = getProducts();

  return (
    <div className="page-wrap">
      <SiteHeader current="books" />

      <main className={styles.catalog}>
        <section className={`${styles.intro} fade-in fade-in-1`}>
          <span className="label label--gold">Made by hand</span>
          <h1 className={`display-lg ${styles.introTitle}`}>
            A keepsake for <em>every kind</em> of love.
          </h1>
          <p className="lede">
            Each keepsake is illustrated from a photo of your own pet and written
            with care. Choose the one that fits — a story to read with your
            child, a pair of goodbye letters (one in your pet&apos;s voice, one in
            yours), or a joyful letter for the one still curled up beside you.
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

      <SiteFooter />
    </div>
  );
}
