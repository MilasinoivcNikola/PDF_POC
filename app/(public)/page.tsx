import Link from "next/link";
import styles from "./page.module.css";

const tocEntries: { num: string; page: string; title: React.ReactNode }[] = [
  { num: "i", page: "01", title: "Cover & dedication" },
  { num: "ii", page: "02", title: "Once, in a home full of love…" },
  { num: "iii", page: "03", title: <em>The two of you</em> },
  { num: "iv", page: "04", title: "Every day was an adventure" },
  { num: "v", page: "05", title: "A favorite, quiet place" },
  { num: "vi", page: "06", title: <em>The day to remember</em> },
  { num: "vii", page: "07", title: "The gentle truth" },
  { num: "viii", page: "08", title: "All of your feelings" },
  { num: "ix", page: "09", title: <em>A comforting place</em> },
  { num: "x", page: "10", title: "Love stays" },
  { num: "xi", page: "11", title: "Things to do" },
  { num: "xii", page: "12", title: <em>Always, always loved</em> },
];

export default function Home() {
  return (
    <div className="page-wrap">
      <header className="site-header">
        <div className="wordmark">
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
        </div>
        <Link href="/books" className="label">
          The keepsakes
        </Link>
      </header>

      <main className={styles.landing}>
        <section className={styles.landingHero}>
          <div className={`${styles.landingOrnament} fade-in fade-in-1`}>
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

          <h1 className={`display-xl ${styles.landingTitle} fade-in fade-in-2`}>
            A gentle goodbye,
            <br />
            made for <em>your</em> family.
          </h1>

          <p className={`lede ${styles.landingLede} fade-in fade-in-3`}>
            Personalized pet keepsakes, illustrated from a photo of your own pet
            and written with care. A story to read with your child, a pair of
            goodbye letters — one in your pet&apos;s voice, one in yours — a joyful
            letter for the one still curled up beside you, a living tribute made
            while they&apos;re still here, or the story of the day they came home.
            Made by hand, for you.
          </p>

          <div className={`${styles.landingCta} fade-in fade-in-3`}>
            <Link href="/books" className="btn btn--primary">
              See the keepsakes
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                <path
                  d="M1 6h16m0 0L12 1m5 5l-5 5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
            <p className={styles.landingCtaMeta}>
              Six keepsakes, each made to order. Delivered as a print-quality
              PDF.
            </p>
          </div>

          <div className={`${styles.chooser} fade-in fade-in-4`}>
            <Link href="/books/story-1-book" className={styles.chooserCard}>
              <span className={styles.chooserKicker}>For a child</span>
              <h2 className={styles.chooserTitle}>
                A story for <em>your child</em>.
              </h2>
              <p className={styles.chooserBody}>
                A twelve-page illustrated book to help a child understand and
                grieve the loss of a pet — gentle, honest, and read aloud
                together.
              </p>
              <span className={styles.chooserLink}>
                See the book
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

            <Link href="/books/story-2-letter" className={styles.chooserCard}>
              <span className={styles.chooserKicker}>In memory · from them</span>
              <h2 className={styles.chooserTitle}>
                A goodbye, in <em>their voice</em>.
              </h2>
              <p className={styles.chooserBody}>
                A keepsake letter written from your pet&apos;s perspective at the
                Rainbow Bridge, addressed to you by name. Made to be printed,
                framed, and kept.
              </p>
              <span className={styles.chooserLink}>
                See the letter
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

            <Link href="/books/story-5-letter-to" className={styles.chooserCard}>
              <span className={styles.chooserKicker}>In memory · from you</span>
              <h2 className={styles.chooserTitle}>
                A goodbye, in <em>your voice</em>.
              </h2>
              <p className={styles.chooserBody}>
                The companion letter — written this time by you, to the pet who is
                gone. The thank-you, the apology, the last good day. One from them,
                one from you.
              </p>
              <span className={styles.chooserLink}>
                See the letter
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

            <Link href="/books/story-4-talk" className={styles.chooserCard}>
              <span className={styles.chooserKicker}>For a good day</span>
              <h2 className={styles.chooserTitle}>
                If they <em>could talk</em>.
              </h2>
              <p className={styles.chooserBody}>
                A joyful letter in your living pet&apos;s own voice — the things
                they&apos;d say if they had the words for one afternoon. For a
                birthday, a gotcha day, or no reason at all.
              </p>
              <span className={styles.chooserLink}>
                See the letter
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

            {/* Story 6 — the one LIVING tribute, made before a pet dies. Set apart
                from the four after-loss titles with its own accent. */}
            <Link
              href="/books/story-6-tribute"
              className={`${styles.chooserCard} ${styles.chooserCardLiving}`}
            >
              <span className={styles.chooserKicker}>
                Still here · a living tribute
              </span>
              <h2 className={styles.chooserTitle}>
                While they&apos;re <em>still here</em>.
              </h2>
              <p className={styles.chooserBody}>
                The one book made before goodbye — an illustrated tribute to a pet
                who is still with you, a senior companion or one facing a hard
                diagnosis. For the time you have, not the time you&apos;re afraid
                of losing.
              </p>
              <span className={styles.chooserLink}>
                See the book
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

            {/* Story 7 — the catalog's FIRST joyful, non-memorial title. Set apart
                from the grief titles with its own bright golden accent — a beginning,
                not a goodbye. */}
            <Link
              href="/books/story-7-welcome"
              className={`${styles.chooserCard} ${styles.chooserCardJoyful}`}
            >
              <span className={styles.chooserKicker}>
                Welcome home · a gotcha-day book
              </span>
              <h2 className={styles.chooserTitle}>
                The day they <em>came home</em>.
              </h2>
              <p className={styles.chooserBody}>
                A joyful storybook of your pet&apos;s origin — the empty house
                before, the day you found each other, the first night, and all the
                ways they became family. For a new arrival or an annual Gotcha Day.
              </p>
              <span className={styles.chooserLink}>
                See the book
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

            {/* Story 8 — the catalog's most PLAYFUL title: a kids' adventure with
                your actual pet as the hero. Set apart even from Story 7's gentle
                joy with its own bright adventurous accent. */}
            <Link
              href="/books/story-8-adventure"
              className={`${styles.chooserCard} ${styles.chooserCardAdventure}`}
            >
              <span className={styles.chooserKicker}>
                A joyful adventure starring your pet
              </span>
              <h2 className={styles.chooserTitle}>
                Their amazing <em>adventure</em>.
              </h2>
              <p className={styles.chooserBody}>
                A playful picture book where your <em>actual</em> pet — painted
                from your photo, not a breed picker — is the hero of a save-the-day
                quest alongside your child. Tell us their real quirk and we&apos;ll
                make it their superpower. The gift for the kid who thinks their dog
                is already a legend.
              </p>
              <span className={styles.chooserLink}>
                See the book
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
          </div>
        </section>

        <section className={`${styles.toc} fade-in fade-in-5`}>
          <div className={styles.tocHeader}>
            <h2 className={styles.tocTitle}>Inside the story</h2>
            <span className="label">A story for your child · Twelve pages</span>
          </div>

          <div className={styles.tocGrid}>
            {tocEntries.map((entry) => (
              <div className={styles.tocEntry} key={entry.page}>
                <span className={styles.tocNum}>{entry.num}</span>
                <span className={styles.tocEntryTitle}>{entry.title}</span>
                <span className={styles.tocEntryDots}></span>
                <span className={styles.tocEntryPage}>{entry.page}</span>
              </div>
            ))}
          </div>
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
