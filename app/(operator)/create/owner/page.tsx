"use client";

// Step 3 of 6 — the owner the letter involves: name(s) (required) and the
// relationship (single / couple), which drives the "you"/"I" vs "you both"/"we"
// letter voice. The owner names gate Continue (they are merged into every page of
// the letter). Shared by all three letter products: Story 2 (the grief letter
// *from* the pet), Story 4 ("If [PET_NAME] Could Talk", the celebration twin),
// and Story 5 (the letter *to* the pet, written in the owner's own voice — so the
// names are the signer, not the addressee). Story 1 uses /create/child instead.

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import type { Relationship } from "@/lib/session/types";

const RELATIONSHIP_OPTIONS: { value: Relationship; label: string }[] = [
  { value: "single", label: "just me" },
  { value: "couple", label: "the two of us" },
];

export default function OwnerPage() {
  const { draft, updateDraft } = useWizard();
  const [showGate, setShowGate] = useState(false);

  const storyType = draft?.storyType ?? "story-2";
  const isStory4 = storyType === "story-4";
  // Story 5 is the owner writing TO the pet, so the names are the signer (the
  // letter is from "you" to the pet), not the addressee of a pet's letter.
  const isStory5 = storyType === "story-5";
  const total = getWizardConfig(storyType).total;
  const owner = draft && "owner" in draft ? draft.owner : {};
  const names = owner.names ?? "";
  const relationship = owner.relationship ?? "single";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  function handleContinue(): boolean {
    if (!names.trim()) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={3}
      total={total}
      introQuote={
        isStory5 ? "And who is writing this letter?" : "And who is this letter for?"
      }
      introAttribution={
        isStory5
          ? "The one who loved them, and is putting it into words."
          : isStory4
            ? "The one they would tell, if they had the words."
            : "The one they would have written to, if they could."
      }
      sectionLabel="Section · Three"
      sectionHeading={
        <>
          The one {isStory5 ? "who " : "they "}
          <em>{isStory4 ? "love" : "loved"}</em>
          {isStory5 ? " them" : ""}.
        </>
      }
      sectionDescription={
        isStory5
          ? "The letter is written to your pet, in your own voice, and signed by you. Tell us the name to sign it with."
          : "The letter is addressed to you by name, in your pet's own voice. Tell us how it should reach you."
      }
      backHref="/create/pet"
      continueHref="/create/letter"
      footerNote="Step 03 · The letter is for"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label" htmlFor="owner-names">
          <span className="field__num">01</span>
          {isStory5
            ? "Who should the letter be signed by?"
            : "Who should the letter be written to?"}
        </label>
        <p className="field__hint">
          The name {petLabel} knew you by — your own name, both your names, or
          even &ldquo;Mom.&rdquo; <em>Sarah. Sarah and David.</em>
        </p>
        <input
          type="text"
          id="owner-names"
          value={names}
          onChange={(e) => updateDraft({ owner: { names: e.target.value } })}
          placeholder="Sarah"
        />
        {showGate && !names.trim() ? (
          <p className="notice notice--required">
            {isStory5
              ? "The letter is signed by you. Please add your name to continue."
              : "The letter is addressed to you by name. Please add it to continue."}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">02</span>
          {isStory4
            ? `Is ${petLabel} loved by one of you, or two?`
            : `Was ${petLabel} loved by one of you, or two?`}
        </label>
        <p className="field__hint">
          This gently shapes whether the letter speaks to &ldquo;you&rdquo; or
          &ldquo;you both.&rdquo;
        </p>
        <div className="radio-group">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="relationship"
                value={opt.value}
                checked={relationship === opt.value}
                onChange={() =>
                  updateDraft({ owner: { relationship: opt.value } })
                }
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </StepShell>
  );
}
