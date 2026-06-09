"use client";

// The landing-page "begin" button for a chosen product. Seeding the draft is a
// client action because it writes localStorage: on click it mints a FRESH draft of
// the chosen `storyType` (replacing any prior in-progress draft) and persists it,
// then navigates into the wizard's first step. By the time the WizardProvider
// hydrates on /create, the seeded draft is already in localStorage, so the wizard
// loads the right product shape (the provider reuses an existing draft and only
// defaults to a fresh Story-1 draft when none is saved).
//
// Replacing the prior draft on each entry is deliberate: a user who began one
// product and returns to the landing to start the other gets a clean draft of the
// product they just picked, never a half-filled cross-product draft.

import { useRouter } from "next/navigation";
import { newDraft, saveDraft } from "@/lib/session/storage";
import type { StoryType } from "@/lib/session/types";

interface StoryStartButtonProps {
  /** Which product to start. */
  storyType: StoryType;
  /** Visible label. */
  children: React.ReactNode;
  /** Button class (e.g. "btn btn--primary"). */
  className?: string;
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

export function StoryStartButton({
  storyType,
  children,
  className = "btn btn--primary",
}: StoryStartButtonProps) {
  const router = useRouter();

  function handleStart() {
    const fresh = newDraft(storyType);
    saveDraft(fresh);
    router.push("/create/upload");
  }

  return (
    <button type="button" className={className} onClick={handleStart}>
      {children}
      {arrowRight}
    </button>
  );
}
