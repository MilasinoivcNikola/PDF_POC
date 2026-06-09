"use client";

// Step 6 of 6 — the kick-off / Generate step. It assembles the draft into a
// complete StorySession (filling skipped optionals with the master-template
// defaults), gates on the seven required fields, and POSTs it to /api/session.
// On success it hands off into the live illustration run (feature 09):
// <GenerationProgress> POSTs /api/generate-illustrations, polls progress, and
// auto-advances to /create/preview when the book is ready.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWizard } from "@/components/wizard/WizardProvider";
import { GenerationProgress } from "@/components/wizard/GenerationProgress";
import {
  draftToSessionForDraft,
  missingRequiredFieldsForDraft,
  type RequiredField,
  type Story2RequiredField,
} from "@/lib/session/draft";

interface FieldFix {
  label: string;
  href: string;
  step: string;
}

/** Which step a missing Story-1 required field lives on, for the "go fix it" link. */
const STORY1_FIELD_FIX: Record<RequiredField, FieldFix> = {
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

/** Which step a missing Story-2 required field lives on, for the "go fix it" link. */
const STORY2_FIELD_FIX: Record<Story2RequiredField, FieldFix> = {
  petName: { label: "your pet's name", href: "/create/pet", step: "Step 2" },
  species: { label: "what kind of pet they were", href: "/create/pet", step: "Step 2" },
  photo: { label: "a photo of your pet", href: "/create/upload", step: "Step 1" },
  ownerNames: { label: "who the letter is for", href: "/create/owner", step: "Step 3" },
  quirks: {
    label: "a quirk that was only theirs",
    href: "/create/letter",
    step: "Step 4",
  },
  favoriteRitual: {
    label: "a ritual you shared",
    href: "/create/letter",
    step: "Step 4",
  },
  favoriteSpots: {
    label: "the spots that were theirs",
    href: "/create/letter",
    step: "Step 4",
  },
};

type Phase = "idle" | "writing" | "generating" | "error";

export default function GeneratePage() {
  const { draft, hydrated } = useWizard();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // True until we've checked whether a run already exists for this session, so a
  // refresh mid-generation drops back into progress instead of the Generate CTA.
  // Gating the render on it avoids a flash of the wrong screen during the check.
  const [checkingResume, setCheckingResume] = useState(true);

  const storyType = draft?.storyType ?? "story-1";
  const isStory2 = storyType === "story-2";
  // The previous step differs by product (Story 1: style; Story 2: tone).
  const backHref = isStory2 ? "/create/tone" : "/create/style";
  const fieldFix = isStory2 ? STORY2_FIELD_FIX : STORY1_FIELD_FIX;

  const missing = useMemo<(RequiredField | Story2RequiredField)[]>(
    () => (draft ? missingRequiredFieldsForDraft(draft) : []),
    [draft],
  );

  const petName = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";
  const description = draft?.pet.breedColor?.trim() ?? "";

  // On load/refresh, resume an already-started run rather than showing the
  // Generate CTA again. Ask the orchestration API whether a run exists for this
  // draft's session: "generating" → re-enter the live progress screen (the POST
  // it fires is an idempotent no-op for an in-flight run, so no duplicate starts);
  // "ready" → the book is done, go straight to preview. Anything else (no session
  // yet, or a prior error) → fall through to the CTA.
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!draft?.id || phase !== "idle") {
      setCheckingResume(false);
      return;
    }
    const id = draft.id;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/generate-illustrations?id=${encodeURIComponent(id)}`,
        );
        if (cancelled) {
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as {
            ok: boolean;
            status?: "generating" | "ready" | "error";
          };
          if (cancelled) {
            return;
          }
          if (data.ok && data.status === "generating") {
            setSessionId(id);
            setPhase("generating");
            return;
          }
          if (data.ok && data.status === "ready") {
            router.replace("/create/preview");
            return;
          }
        }
      } catch {
        // No reachable run / network hiccup — fall through to the CTA.
      }
      if (!cancelled) {
        setCheckingResume(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, draft?.id, phase, router]);

  async function handleGenerate() {
    if (!draft) {
      return;
    }
    setErrorMessage(null);
    setPhase("writing");
    try {
      const session = draftToSessionForDraft(draft);
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
      // Session is on disk; hand off into the live illustration run. The
      // progress component kicks off generation and polls it from here.
      setSessionId(session.id);
      setPhase("generating");
    } catch {
      setErrorMessage(
        "We couldn't save your book just yet. Please try again in a moment.",
      );
      setPhase("error");
    }
  }

  // Once the session is on disk, hand the whole screen over to the live
  // generation progress (its own full-page layout); it auto-advances to preview.
  if (phase === "generating" && sessionId) {
    return (
      <GenerationProgress
        sessionId={sessionId}
        petName={petName}
        petDescription={description}
        storyType={storyType}
      />
    );
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
        {!hydrated || checkingResume ? (
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
              {missing.map((field) => {
                const fix = fieldFix[field as keyof typeof fieldFix];
                return (
                  <li key={field}>
                    <Link href={fix.href} className="btn-link">
                      Add {fix.label} ({fix.step}) &rarr;
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="fade-in">
            <span className="label label--gold">One last look</span>
            <h1 className="display-md mt-4">
              Ready to bring <em>{petName}</em> to life?
            </h1>
            <p className="lede mt-4" style={{ margin: "1rem auto 0" }}>
              {isStory2
                ? "We'll paint the cover portrait from the photo you shared and typeset the six-page letter. This usually takes a minute or two."
                : "We'll paint each illustration from the photo you shared and assemble the twelve-page book. This usually takes a minute or two."}
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
              <Link href={backHref} className="btn-link">
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
