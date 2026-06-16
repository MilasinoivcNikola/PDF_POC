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
        {/* 1. Hero with visual proof — copy + a fanned stack of real covers. */}
        <section className="hero--proof fade-in fade-in-2">
          <div className="hero__copy">
            <span className="hero__eyebrow">
              <span className="label">Custom illustrated keepsake books</span>
            </span>
            <h1 className="display-xl hero__title">
              Books that <em>look like</em> your actual pet.
            </h1>
            <p className="lede hero__lede">
              Upload one photo of your own pet, and we&rsquo;ll hand-finish an
              illustrated keepsake book where they&rsquo;re the star — their real
              face, their real coat, on every page. A joyful adventure, the story
              of the day they came home, a tribute while they&rsquo;re still beside
              you, or a gentle goodbye.
            </p>
            <div className="hero__cta-row">
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
                {numberWord(totalCount)} titles, each made to order. Delivered as a
                print-quality PDF in 24–48&nbsp;hours.
              </p>
            </div>
          </div>

          {/* Three real sample covers, lightly fanned (corgi adventure leads). */}
          <div className="hero__stack">
            <figure className="s-back">
              <img
                src="/samples/story-7-welcome/welcome-cover.jpg"
                alt="Welcome Home — a gotcha-day storybook cover painted from a pet's photo"
                width={800}
                height={800}
                loading="lazy"
              />
            </figure>
            <figure className="s-mid">
              <img
                src="/samples/story-6-tribute/tribute-cover.jpg"
                alt="While You're Still Here — a living-tribute cover painted from a pet's photo"
                width={800}
                height={800}
                loading="lazy"
              />
            </figure>
            <figure className="s-front">
              <img
                src="/samples/story-8-adventure/adventure-cover.jpg"
                alt="The Amazing Adventures — a corgi adventure storybook cover painted from a pet's photo"
                width={800}
                height={800}
              />
            </figure>
          </div>
        </section>

        {/* 2. The transformation — the literal photo → painted-page proof. */}
        <section className="proof fade-in fade-in-3">
          <div className="proof__head">
            <span className="label">The part everyone wonders about</span>
            <h2>
              Yes — it really <em>is</em> them.
            </h2>
            <p>
              Other personalized pet books pick a breed from a list. We don&rsquo;t.
              Every illustration is painted from the photo you upload, so the pet in
              the book has your pet&rsquo;s markings, their face, their particular
              look.
            </p>
          </div>

          <div className="proof__pair">
            {/* The original photo — a quiet polaroid. */}
            <div className="proof__side">
              <div className="proof__photo">
                <img
                  src="/samples/story-9-newbaby/source-photo.jpg"
                  alt="The original photo a customer uploaded of their rabbit"
                  width={1000}
                  height={750}
                  loading="lazy"
                />
              </div>
              <p className="proof__caption">
                From your photo
                <strong>What you upload</strong>
              </p>
            </div>

            {/* The arrow between the two. */}
            <div className="proof__arrow">
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
                <path
                  d="M1 10h36m0 0l-7-7m7 7l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              <span>painted by hand</span>
            </div>

            {/* The painted page — the keepsake frame, the payoff. */}
            <div className="proof__side">
              <div className="proof__art">
                <img
                  src="/samples/story-9-newbaby/baby-cover.jpg"
                  alt="The illustrated book page we painted from that rabbit photo"
                  width={800}
                  height={800}
                  loading="lazy"
                />
              </div>
              <p className="proof__caption">
                The page we painted
                <strong>What you keep</strong>
              </p>
            </div>
          </div>

          <p className="proof__note">
            This is a real sample, painted from the real photo beside it. Every book
            is reviewed by a person before it reaches you — if a page doesn&rsquo;t
            look like your pet, it doesn&rsquo;t go out.
          </p>
        </section>

        {/* 3. Two worlds — celebrate (gold) / remember (rose), counts derived. */}
        <div className="section-head fade-in fade-in-4">
          <span className="label">Two kinds of book</span>
          <h2>For the days you have — and the goodbye.</h2>
        </div>
        <section className="worlds fade-in fade-in-4">
          <Link href="/books#living" className="world world--living">
            <span className="world__kicker">For the days you have</span>
            <h2 className="world__title">
              A book to <em>celebrate</em> them.
            </h2>
            <p className="world__body">
              Joyful, living titles — a kids&apos; adventure where your pet is the
              hero, the story of their gotcha day, a letter in their happy voice, a
              tribute while they&apos;re still curled up beside you, or a keepsake for
              the new big sibling. For a birthday, an adoption, or no reason at all.
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
              Gentle memorial titles — a story to help a child grieve, and a pair of
              goodbye letters: one in your pet&apos;s voice, one in yours. Made
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

        {/* 4. How it works — the existing three steps, now below the proof. */}
        <section className="how fade-in fade-in-5">
          <div className="how__step">
            <span className="how__num">01</span>
            <h3 className="how__title">Tell us about them</h3>
            <p className="how__body">
              A few gentle questions, your pet&apos;s name and quirks, and one photo
              you love.
            </p>
          </div>
          <div className="how__step">
            <span className="how__num">02</span>
            <h3 className="how__title">We paint it by hand</h3>
            <p className="how__body">
              Every illustration is made to look like your actual pet — not a breed
              picked from a list — and reviewed by a person.
            </p>
          </div>
          <div className="how__step">
            <span className="how__num">03</span>
            <h3 className="how__title">Your book arrives</h3>
            <p className="how__body">
              A print-quality PDF, emailed within 24–48 hours, ready to keep or print
              and frame.
            </p>
          </div>
        </section>

        {/* 5. Trust / objections — six short, truthful Q&As. */}
        <section className="faq fade-in fade-in-5">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <span className="label">Before you order</span>
            <h2>The honest answers.</h2>
          </div>
          <div className="faq__grid">
            <div className="faq__item">
              <h3>
                Will it <em>really</em> look like my pet?
              </h3>
              <p>
                That&rsquo;s the whole point. We paint from the photo you upload —
                same markings, same face — not a generic breed picture. A person
                checks every book before it&rsquo;s sent; if a page doesn&rsquo;t look
                like your pet, it doesn&rsquo;t go out.
              </p>
            </div>
            <div className="faq__item">
              <h3>Is this just AI art?</h3>
              <p>
                We&rsquo;re honest about it: the art is made with the help of AI image
                generation, guided from your photo, and then finished and reviewed by
                a person before it reaches you. Made with a machine, finished by a
                human, made for you.
              </p>
            </div>
            <div className="faq__item">
              <h3>What if I&rsquo;m not happy with it?</h3>
              <p>
                Tell us within 30 days and we&rsquo;ll remake it, free. If we still
                can&rsquo;t make it something you&rsquo;re glad to keep, we&rsquo;ll
                refund you in full. You don&rsquo;t have to explain or justify.
              </p>
            </div>
            <div className="faq__item">
              <h3>How long does it take?</h3>
              <p>
                Each book is made to order and hand-finished, so it&rsquo;s not
                instant. You&rsquo;ll have it as a print-quality PDF within 24–48
                hours of ordering.
              </p>
            </div>
            <div className="faq__item">
              <h3>Can I print it?</h3>
              <p>
                Yes. You receive a print-quality PDF — keep it on your phone, print it
                at home, or take it to a print shop. The letter titles are designed to
                be printed on cardstock and framed.
              </p>
            </div>
            <div className="faq__item">
              <h3>What do you do with my photo?</h3>
              <p>
                Your photo and the details you share are used only to make your book —
                nothing else.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Closing CTA band — one warm final prompt for scrollers. */}
        <section className="closing-band fade-in fade-in-5">
          <svg
            className="closing-band__ornament"
            width="40"
            height="40"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M24 8 C 22 14, 20 18, 14 20 C 20 22, 22 26, 24 32 C 26 26, 28 22, 34 20 C 28 18, 26 14, 24 8 Z"
              fill="currentColor"
              opacity="0.8"
            />
            <circle cx="24" cy="40" r="1.5" fill="currentColor" opacity="0.5" />
          </svg>
          <h2>
            Start the book that looks like <em>them</em>.
          </h2>
          <p>
            One photo is all it takes. We&rsquo;ll do the rest — slowly, by hand, and
            made for you.
          </p>
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
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
