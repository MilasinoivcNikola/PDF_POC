import Link from "next/link";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "How it's made · Policies — Quietly Kept",
  description:
    "How Quietly Kept books are made, our honesty about AI illustration, and our refund and privacy policies.",
};

// PLACEHOLDER — PM sign-off before launch.
// The AI-honesty/disclosure wording in a grief context is a brand decision the
// commerce plan (context/features/00-overview.md) marks as blocking at PR-04.
// This is honest placeholder copy, NOT final/legal policy. Refund and privacy
// wording are likewise stubs to be settled (refund/remake policy is flagged
// blocking at PR-09). Do not treat any of this as approved.

export default function PoliciesPage() {
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
          ← The keepsakes
        </Link>
      </header>

      <main className={styles.policies}>
        <header className={`${styles.intro} fade-in fade-in-1`}>
          <span className="label label--gold">In progress</span>
          <h1 className={`display-md ${styles.introTitle}`}>
            How it&apos;s made.
          </h1>
          <p className={styles.draftNote}>
            {/* PLACEHOLDER — PM sign-off before launch */}
            Draft placeholder copy — these policies are being written and have
            not been finalized.
          </p>
        </header>

        <article className={`${styles.sections} fade-in fade-in-2`}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>How your book is made</h2>
            <p>
              {/* PLACEHOLDER — PM sign-off before launch */}
              Every book is illustrated with the help of AI image generation,
              guided from a photo of your own pet, and then reviewed by a person
              before it&apos;s sent to you. We believe in being honest about
              this: the art is made with a machine, finished by a human, and
              made for you. The exact wording of our AI-honesty statement is
              still being decided.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Refunds &amp; remakes</h2>
            <p>
              {/* PLACEHOLDER — PM sign-off before launch */}
              If the book doesn&apos;t feel right, we want to make it right. Our
              refund and remake policy is being finalized and will appear here
              before ordering opens.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Your privacy</h2>
            <p>
              {/* PLACEHOLDER — PM sign-off before launch */}
              Your photo and the details you share are used only to make your
              book. Our full privacy policy is being written and will appear
              here before ordering opens.
            </p>
          </section>
        </article>
      </main>

      <footer className="site-footer">
        <Link href="/books" className="label">
          The keepsakes
        </Link>
        <p className="label">Made slowly · Made by hand</p>
      </footer>
    </div>
  );
}
