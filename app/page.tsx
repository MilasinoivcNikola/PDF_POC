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
        <div className="label">Story 1 · Prototype</div>
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
            A twelve-page personalized story to help your child understand and
            grieve the loss of a beloved pet. Written with care. Illustrated with
            your pet at its heart.
          </p>

          <div className={`${styles.landingCta} fade-in fade-in-4`}>
            <Link href="/create/upload" className="btn btn--primary">
              Begin your story
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
              About five minutes of gentle questions. A keepsake you can read
              tonight.
            </p>
          </div>
        </section>

        <section className={`${styles.toc} fade-in fade-in-5`}>
          <div className={styles.tocHeader}>
            <h2 className={styles.tocTitle}>What you will create</h2>
            <span className="label">A twelve-page book</span>
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
        <p className="label">Made slowly · Made by hand</p>
        <p className="label">Local prototype · No data leaves your device</p>
      </footer>
    </div>
  );
}
