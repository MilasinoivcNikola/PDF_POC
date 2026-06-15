import Link from "next/link";
import type { Metadata } from "next";
import {
  getProductsByAudience,
  productDisplayTitle,
  type Product,
} from "@/lib/catalog/products";
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

// Card copy — short persona/audience kicker + the count-line wording. This is
// MARKETING copy, not catalog data, so it lives here rather than in
// lib/catalog/products.ts (which stays pure/minimal). Keyed by productId.
//
// `countLabel` is the count line: `{n}` is substituted with the registry-derived
// `illustrationCount` (DERIVE the number, never type it) — so an illustration-led
// book reads "10 illustrations" and can't drift from the engine. The one exception
// is the page-framed storybook (Story 1 "12 pages"), whose page count is a fixed
// product fact, not a derivable catalog value, so it's a literal here (same as the
// kicker copy). Unknown ids fall back to no kicker + "{n} illustrations".
// Adding a new book = add one row here.
const FALLBACK_COPY = { kicker: "", countLabel: "{n} illustrations" };

const CARD_COPY: Record<string, { kicker: string; countLabel: string }> = {
  "story-8-adventure": { kicker: "A kids' adventure", countLabel: "{n} illustrations" },
  "story-7-welcome": { kicker: "A gotcha-day book", countLabel: "{n} illustrations" },
  "story-4-talk": { kicker: "For a good day", countLabel: "{n} illustrations" },
  "story-9-newbaby": { kicker: "A keepsake for the big sibling", countLabel: "{n} illustrations" },
  "story-6-tribute": { kicker: "Still here · a living tribute", countLabel: "{n} illustrations" },
  "story-1-book": { kicker: "A story for your child", countLabel: "12 pages" },
  "story-2-letter": { kicker: "In memory · from them", countLabel: "{n} illustrations" },
  "story-5-letter-to": { kicker: "In memory · from you", countLabel: "{n} illustrations" },
};

function cardKicker(productId: string): string {
  return (CARD_COPY[productId] ?? FALLBACK_COPY).kicker;
}

function cardCountLabel(product: Product): string {
  const template = (CARD_COPY[product.productId] ?? FALLBACK_COPY).countLabel;
  return template.replace("{n}", String(product.illustrationCount));
}

// The Dearbound paw — same path the SiteHeader wordmark / prototype use, drawn
// into the placeholder art for cards without sample images yet (Story 8 / 9).
function PawMark() {
  return (
    <svg className={styles.cardArtPaw} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M6 8 Q4 5 6 4 Q8 5 7 8 Z M13 8 Q15 5 13 4 Q11 5 12 8 Z M3 12 Q1 10 3 9 Q5 10 4 12 Z M16 12 Q18 10 16 9 Q14 10 15 12 Z M10 17 Q5 17 5 12 Q5 9 10 9 Q15 9 15 12 Q15 17 10 17 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ProductCard({ product, joyful }: { product: Product; joyful: boolean }) {
  const kicker = cardKicker(product.productId);
  const sample = product.sampleImages[0];

  return (
    <Link
      href={`/books/${product.productId}`}
      className={joyful ? `${styles.card} ${styles.cardJoyful}` : styles.card}
    >
      {sample ? (
        <div className={styles.cardArt}>
          <img
            src={sample}
            alt={`A sample illustration from “${product.title}”`}
            width={800}
            height={800}
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className={
            joyful
              ? `${styles.cardArt} ${styles.cardArtPlaceholder} ${styles.cardArtPlaceholderJoyful}`
              : `${styles.cardArt} ${styles.cardArtPlaceholder}`
          }
        >
          <PawMark />
        </div>
      )}
      <div className={styles.cardBody}>
        {kicker ? <span className={styles.cardKicker}>{kicker}</span> : null}
        <h2 className={styles.cardTitle}>{productDisplayTitle(product)}</h2>
        <p className={styles.cardTagline}>{product.tagline}</p>
        <div className={styles.cardMeta}>
          <span className={styles.cardPrice}>
            {formatPriceUsd(product.priceUsd)}
          </span>
          <span className={styles.cardDetail}>{cardCountLabel(product)}</span>
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
  );
}

export default function BooksPage() {
  const living = getProductsByAudience("living");
  const loss = getProductsByAudience("loss");

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
            Every book is illustrated from a photo of your own pet and written
            with care. Some celebrate the pet still curled up beside you — a
            kids&apos; adventure, a gotcha-day story, a letter in their voice.
            Others are made for a goodbye. Choose the one that fits.
          </p>
        </section>

        <section id="living" className={`${styles.catSection} fade-in fade-in-2`}>
          <div className={styles.sectionHead}>
            <h2>To celebrate them</h2>
            <span className="label label--gold">
              Joyful &amp; living · {living.length} titles
            </span>
          </div>
          <div className={styles.grid}>
            {living.map((product) => (
              <ProductCard key={product.productId} product={product} joyful />
            ))}
          </div>
        </section>

        <section id="loss" className={`${styles.catSection} fade-in fade-in-3`}>
          <div className={`${styles.sectionHead} ${styles.sectionHeadLoss}`}>
            <h2>To remember them</h2>
            <span className="label label--rose">
              Memorial &amp; tribute · {loss.length} titles
            </span>
          </div>
          <div className={styles.grid}>
            {loss.map((product) => (
              <ProductCard
                key={product.productId}
                product={product}
                joyful={false}
              />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
