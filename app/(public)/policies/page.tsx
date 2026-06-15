import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: `How it's made · Policies — ${BRAND}`,
  description: `How ${BRAND} books are made, our honesty about AI illustration, and our refund and privacy policies.`,
};

// The Refunds & remakes section is FINAL (PM-approved, PR-09 — the deferred
// decision the commerce plan flagged blocking at delivery; the delivery email +
// download page link here for it).
// The other two sections are still PLACEHOLDER — PM sign-off before launch: the
// AI-honesty/disclosure wording (blocking at PR-04, a grief-context brand call)
// and the privacy policy. Those two are honest stubs, NOT final/legal copy.

export default function PoliciesPage() {
  return (
    <div className="page-wrap">
      <SiteHeader current="policies" />

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
              We make each book to order, from your own photos and words, and
              every one is looked over by a person before we send it — so it
              should feel right when it reaches you. If something still
              isn&apos;t — a detail we got wrong, or an illustration that just
              doesn&apos;t feel like your pet — tell us within 30 days of
              delivery and we&apos;ll remake it, at no cost. If we try and still
              can&apos;t make it something you&apos;re glad to keep, we&apos;ll
              refund you in full. You don&apos;t have to explain or justify;
              grief is hard enough.
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

      <SiteFooter />
    </div>
  );
}
