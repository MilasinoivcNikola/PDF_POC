"use client";

// Shared chrome for every wizard step (ported from prototypes/wizard.html): the
// site header with the wordmark + step counter, the centered intro quote, the
// two-column body (sticky section heading on the left, the step's fields on the
// right), and the footer nav (Back / "Saved just now" / Continue).
//
// Navigation and the save indicator are wired to real state: Back/Continue push
// routes via next/navigation, and the save status reads the WizardProvider's
// `savedAt`. A step can intercept Continue (e.g. to gate on required fields) by
// passing `onContinue` returning false to block navigation.

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProgressBar } from "@/components/wizard/ProgressBar";
import { useWizard } from "@/components/wizard/WizardProvider";

interface StepShellProps {
  /** Current step number, 1-based (drives the "Step NN of 06" counter). */
  step: number;
  /** Centered intro quote above the form. */
  introQuote: string;
  /** Italic line under the intro quote. */
  introAttribution: string;
  /** Small gold section label (e.g. "Section · One"). */
  sectionLabel: string;
  /** The sticky section heading (may include <em> for the rose accent). */
  sectionHeading: React.ReactNode;
  /** The sticky section description under the heading. */
  sectionDescription: React.ReactNode;
  /** The step's form fields. */
  children: React.ReactNode;
  /** Route the Back link goes to; omit to render Back to the landing page. */
  backHref: string;
  /** Route Continue navigates to. */
  continueHref: string;
  /** Label for the Continue button. */
  continueLabel?: string;
  /** Footer caption shown in the site footer. */
  footerNote: string;
  /**
   * Called when Continue is clicked. Return false to block navigation (e.g. a
   * required field is missing — the step shows its own gentle notice). Omit to
   * always proceed.
   */
  onContinue?: () => boolean;
}

const arrowRight = (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
    <path
      d="M1 6h16m0 0L12 1m5 5l-5 5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export function StepShell({
  step,
  introQuote,
  introAttribution,
  sectionLabel,
  sectionHeading,
  sectionDescription,
  children,
  backHref,
  continueHref,
  continueLabel = "Continue",
  footerNote,
  onContinue,
}: StepShellProps) {
  const router = useRouter();
  const { savedAt, hydrated } = useWizard();

  function handleContinue() {
    if (onContinue && !onContinue()) {
      return;
    }
    router.push(continueHref);
  }

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
        <ProgressBar step={step} />
      </header>

      <main className="wizard">
        <div className="wizard__intro fade-in">
          <p className="wizard__quote">{introQuote}</p>
          <p className="wizard__attribution">{introAttribution}</p>
        </div>

        <div className="form-layout">
          <div className="form-layout__heading fade-in fade-in-1">
            <span className="label label--gold">{sectionLabel}</span>
            <h2>{sectionHeading}</h2>
            <p>{sectionDescription}</p>
          </div>

          <div className="form-layout__fields fade-in fade-in-2">{children}</div>
        </div>

        <div className="wizard-footer">
          <Link href={backHref} className="btn-link">
            &larr; Back
          </Link>
          <div className="save-status">
            <span className="save-status__dot" />
            {hydrated && savedAt ? "Saved just now" : "Saving…"}
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleContinue}
          >
            {continueLabel}
            {arrowRight}
          </button>
        </div>
      </main>

      <footer className="site-footer">
        <p className="label">{footerNote}</p>
        <p className="label">Saved to this device only</p>
      </footer>
    </div>
  );
}
