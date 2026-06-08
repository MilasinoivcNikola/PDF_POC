"use client";

// Step 6 of 6 — the kick-off / Generate step. This feature owns only the entry
// and the CTA that writes the finalized session to disk: it assembles the draft
// into a complete StorySession (filling skipped optionals with the master-template
// defaults), gates on the three required fields, POSTs it to /api/session, and on
// success records the written id. The actual generation progress animation and
// the orchestration call are feature 09 — out of scope here.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWizard } from "@/components/wizard/WizardProvider";
import {
  draftToSession,
  missingRequiredFields,
  type RequiredField,
} from "@/lib/session/draft";

/** Which step a missing required field lives on, for the "go fix it" link. */
const FIELD_FIX: Record<
  RequiredField,
  { label: string; href: string; step: string }
> = {
  petName: { label: "your pet's name", href: "/create/pet", step: "Step 2" },
  childName: { label: "your child's name", href: "/create/child", step: "Step 3" },
  photo: { label: "a photo of your pet", href: "/create/upload", step: "Step 1" },
  breedColor: {
    label: "a few words to describe your pet",
    href: "/create/pet",
    step: "Step 2",
  },
  favoriteActivity: {
    label: "their favorite thing to do",
    href: "/create/memories",
    step: "Step 4",
  },
  sleepingSpot: {
    label: "where they loved to sleep",
    href: "/create/memories",
    step: "Step 4",
  },
  favoriteMemory: {
    label: "a favorite memory to keep",
    href: "/create/memories",
    step: "Step 4",
  },
};

type Phase = "idle" | "writing" | "written" | "error";

export default function GeneratePage() {
  const { draft, hydrated } = useWizard();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const missing = useMemo<RequiredField[]>(
    () => (draft ? missingRequiredFields(draft) : []),
    [draft],
  );

  const petName = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";
  const description = draft?.pet.breedColor?.trim() ?? "";

  async function handleGenerate() {
    if (!draft) {
      return;
    }
    setErrorMessage(null);
    setPhase("writing");
    try {
      const session = draftToSession(draft);
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMessage(
          "We couldn't save your book just yet. Please try again in a moment.",
        );
        setPhase("error");
        return;
      }
      // Feature 09 will hand off into the live generation progress here.
      setPhase("written");
    } catch {
      setErrorMessage(
        "We couldn't save your book just yet. Please try again in a moment.",
      );
      setPhase("error");
    }
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
        <div className="label">Generate · Step 06 of 06</div>
      </header>

      <main
        className="wizard"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "640px",
          textAlign: "center",
        }}
      >
        {!hydrated ? (
          <p className="lede">Gathering your story…</p>
        ) : missing.length > 0 ? (
          <div className="fade-in">
            <span className="label label--gold">Almost there</span>
            <h1 className="display-md mt-4">
              A few things first, for <em>{petName}</em>.
            </h1>
            <p className="lede mt-4" style={{ margin: "1rem auto 0" }}>
              Before we can bring the book to life, we still need:
            </p>
            <ul
              style={{
                listStyle: "none",
                margin: "1.5rem auto",
                display: "inline-flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {missing.map((field) => (
                <li key={field}>
                  <Link href={FIELD_FIX[field].href} className="btn-link">
                    Add {FIELD_FIX[field].label} ({FIELD_FIX[field].step}) &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : phase === "written" ? (
          <div className="fade-in">
            <span className="label label--gold">Your story is saved</span>
            <h1 className="display-md mt-4">
              <em>{petName}</em> is ready to be painted.
            </h1>
            <p className="lede mt-4" style={{ margin: "1rem auto 0" }}>
              Your answers are saved. The illustration step picks up from here.
            </p>
            <p className="helper mt-8">
              (The live generation progress is the next step in the build.)
            </p>
          </div>
        ) : (
          <div className="fade-in">
            <span className="label label--gold">One last look</span>
            <h1 className="display-md mt-4">
              Ready to bring <em>{petName}</em> to life?
            </h1>
            <p className="lede mt-4" style={{ margin: "1rem auto 0" }}>
              We&apos;ll paint each illustration from the photo you shared and
              assemble the twelve-page book. This usually takes a minute or two.
            </p>

            {description ? (
              <p className="helper mt-8" style={{ maxWidth: "32em" }}>
                {description}
              </p>
            ) : null}

            <div className="mt-12">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleGenerate}
                disabled={phase === "writing"}
              >
                {phase === "writing" ? "Saving your story…" : "Generate my book"}
              </button>
            </div>

            {phase === "error" && errorMessage ? (
              <p className="notice" style={{ maxWidth: "32em", margin: "1.5rem auto 0" }}>
                {errorMessage}
              </p>
            ) : null}

            <p className="mt-8">
              <Link href="/create/style" className="btn-link">
                &larr; Back
              </Link>
            </p>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p className="label">Step 06 · Generate</p>
        <p className="label">Saved to this device only</p>
      </footer>
    </div>
  );
}
