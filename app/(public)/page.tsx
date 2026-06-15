import Link from "next/link";
import { getProducts, getProductsByAudience } from "@/lib/catalog/products";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Spell a small count as a capitalized word so the landing copy reads naturally
// while staying DERIVED from the catalog (never a typed number). Falls back to
// the digit above the table — the catalog stays well within range.
const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export default function Home() {
  const totalCount = getProducts().length;
  const livingCount = getProductsByAudience("living").length;
  const lossCount = getProductsByAudience("loss").length;

  return (
    <div className="page-wrap">
      <SiteHeader />

      <main>
        <section className="hero">
          <div className="hero__ornament fade-in fade-in-1">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 8 C 22 14, 20 18, 14 20 C 20 22, 22 26, 24 32 C 26 26, 28 22, 34 20 C 28 18, 26 14, 24 8 Z"
                fill="currentColor"
                opacity="0.8"
              />
              <circle cx="24" cy="40" r="1.5" fill="currentColor" opacity="0.5" />
            </svg>
          </div>

          <h1 className="display-xl hero__title fade-in fade-in-2">
            Custom illustrated books starring <em>your</em> pet.
          </h1>

          <p className="lede hero__lede fade-in fade-in-3">
            Personalized keepsakes, illustrated from a photo of your own pet and
            written with care — a joyful adventure for a child, the story of the
            day they came home, a living tribute while they&apos;re still beside
            you, or a gentle goodbye. Painted by hand, made for you.
          </p>

          <div className="hero__cta fade-in fade-in-3">
            <Link href="/books" className="btn btn--primary">
              See the books
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                <path
                  d="M1 6h16m0 0L12 1m5 5l-5 5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
            <p className="hero__cta-meta">
              {numberWord(totalCount)} keepsakes, each made to order. Delivered as
              a print-quality PDF.
            </p>
          </div>
        </section>

        <section className="worlds fade-in fade-in-4">
          <Link href="/books#living" className="world world--living">
            <span className="world__kicker">For the days you have</span>
            <h2 className="world__title">
              A book to <em>celebrate</em> them.
            </h2>
            <p className="world__body">
              Joyful, living titles — a kids&apos; adventure where your pet is the
              hero, the story of their gotcha day, a letter in their happy voice,
              or a keepsake for the new big sibling. For a birthday, an adoption,
              or no reason at all.
            </p>
            <span className="world__count">
              {numberWord(livingCount)} celebration titles
            </span>
            <span className="world__link">
              See the celebration books
              <svg width="16" height="11" viewBox="0 0 18 12" fill="none">
                <path
                  d="M1 6h16m0 0L12 1m5 5l-5 5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </Link>

          <Link href="/books#loss" className="world">
            <span className="world__kicker">For the goodbye</span>
            <h2 className="world__title">
              A book to <em>remember</em> them.
            </h2>
            <p className="world__body">
              Gentle memorial titles — a story to help a child grieve, and a pair
              of goodbye letters: one in your pet&apos;s voice, one in yours. Made
              slowly, with care.
            </p>
            <span className="world__count">
              {numberWord(lossCount)} memorial titles
            </span>
            <span className="world__link">
              See the memorial books
              <svg width="16" height="11" viewBox="0 0 18 12" fill="none">
                <path
                  d="M1 6h16m0 0L12 1m5 5l-5 5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </Link>
        </section>

        <section className="how fade-in fade-in-5">
          <div className="how__step">
            <span className="how__num">01</span>
            <h3 className="how__title">Tell us about them</h3>
            <p className="how__body">
              A few gentle questions, your pet&apos;s name and quirks, and one
              photo you love.
            </p>
          </div>
          <div className="how__step">
            <span className="how__num">02</span>
            <h3 className="how__title">We paint it by hand</h3>
            <p className="how__body">
              Every illustration is made to look like your actual pet — not a
              breed picked from a list — and reviewed by a person.
            </p>
          </div>
          <div className="how__step">
            <span className="how__num">03</span>
            <h3 className="how__title">Your book arrives</h3>
            <p className="how__body">
              A print-quality PDF, emailed within 24–48 hours, ready to keep or
              print and frame.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
