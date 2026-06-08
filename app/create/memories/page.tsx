"use client";

// Step 4 of 6 — the free-text memories that personalize the story: favorite
// activity, sleeping spot, a favorite memory (all required — each is a live merge
// field, so a blank one would break book generation), and an optional parent
// dedication. The three required fields gate Continue; the dedication stays
// optional.

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";

export default function MemoriesPage() {
  const { draft, updateDraft } = useWizard();
  const [showGate, setShowGate] = useState(false);

  const favoriteActivity = draft?.memories.favoriteActivity ?? "";
  const sleepingSpot = draft?.memories.sleepingSpot ?? "";
  const favoriteMemory = draft?.memories.favoriteMemory ?? "";
  const parentDedication = draft?.memories.parentDedication ?? "";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  function handleContinue(): boolean {
    if (
      !favoriteActivity.trim() ||
      !sleepingSpot.trim() ||
      !favoriteMemory.trim()
    ) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={4}
      introQuote="The small things that were only theirs."
      introAttribution="These details are what make the book feel like them."
      sectionLabel="Section · Four"
      sectionHeading={
        <>
          The life you <em>shared</em>.
        </>
      }
      sectionDescription="A few small memories shape the heart of the book — they let the story sound like the pet you actually loved."
      backHref="/create/child"
      continueHref="/create/style"
      footerNote="Step 04 · Memories"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label" htmlFor="favorite-activity">
          <span className="field__num">01</span>
          {petLabel}&apos;s favorite thing to do?
        </label>
        <p className="field__hint">
          A small everyday joy. <em>Chasing tennis balls in the backyard.</em>
        </p>
        <input
          type="text"
          id="favorite-activity"
          value={favoriteActivity}
          onChange={(e) =>
            updateDraft({ memories: { favoriteActivity: e.target.value } })
          }
          placeholder="chasing tennis balls in the backyard"
        />
        {showGate && !favoriteActivity.trim() ? (
          <p className="notice notice--required">
            One small joy helps the story remember {petLabel}. Please add one to
            continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="sleeping-spot">
          <span className="field__num">02</span>
          Where did {petLabel} love to sleep?
        </label>
        <p className="field__hint">
          The warm, safe place they always returned to.{" "}
          <em>At the foot of your bed.</em>
        </p>
        <input
          type="text"
          id="sleeping-spot"
          value={sleepingSpot}
          onChange={(e) =>
            updateDraft({ memories: { sleepingSpot: e.target.value } })
          }
          placeholder="at the foot of your bed"
        />
        {showGate && !sleepingSpot.trim() ? (
          <p className="notice notice--required">
            A warm, safe place gives the story somewhere to rest. Please add one
            to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-memory">
          <span className="field__num">03</span>
          A favorite memory to keep.
        </label>
        <p className="field__hint">
          One or two sentences — the day you&apos;ll always remember together.
        </p>
        <textarea
          id="favorite-memory"
          value={favoriteMemory}
          onChange={(e) =>
            updateDraft({ memories: { favoriteMemory: e.target.value } })
          }
          placeholder="The day Otis followed Emma to the lake, and they both came home soaking wet, laughing the whole way."
        />
        {showGate && !favoriteMemory.trim() ? (
          <p className="notice notice--required">
            Even one small moment gives the book its heart. Please share a memory
            to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="parent-dedication">
          <span className="field__num">04</span>
          A dedication, if you&apos;d like one.
        </label>
        <p className="field__hint">
          Optional. Printed on the dedication page, in your own words.
        </p>
        <textarea
          id="parent-dedication"
          value={parentDedication}
          onChange={(e) =>
            updateDraft({ memories: { parentDedication: e.target.value } })
          }
          placeholder="For Emma — may you always remember how much you were loved."
        />
      </div>
    </StepShell>
  );
}
