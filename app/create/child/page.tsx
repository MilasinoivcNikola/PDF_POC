"use client";

// Step 3 of 6 — the child the book is for: name (required) and age bracket (which
// drives the master template's tone variant). Name gates Continue.

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import type { AgeBracket } from "@/lib/session/types";

const AGE_OPTIONS: { value: AgeBracket; label: string }[] = [
  { value: "3-5", label: "3 – 5 years" },
  { value: "6-8", label: "6 – 8 years" },
  { value: "9-12", label: "9 – 12 years" },
];

export default function ChildPage() {
  const { draft, updateDraft } = useWizard();
  const [showGate, setShowGate] = useState(false);

  const name = draft?.child.name ?? "";
  const ageBracket = draft?.child.ageBracket ?? "6-8";
  const childLabel = name.trim() ? name.trim() : "your child";

  function handleContinue(): boolean {
    if (!name.trim()) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={3}
      introQuote="And who is this story for?"
      introAttribution="We'll write it gently, to them, in words they can hold."
      sectionLabel="Section · Three"
      sectionHeading={
        <>
          The child who <em>remembers</em>.
        </>
      }
      sectionDescription="The book speaks directly to your child. Their age helps us pitch every page in words that fit."
      backHref="/create/pet"
      continueHref="/create/memories"
      footerNote="Step 03 · Child details"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label" htmlFor="child-name">
          <span className="field__num">01</span>
          What is the child&apos;s name?
        </label>
        <p className="field__hint">
          The book is written to them, by name, on nearly every page.
        </p>
        <input
          type="text"
          id="child-name"
          value={name}
          onChange={(e) => updateDraft({ child: { name: e.target.value } })}
          placeholder="Emma"
        />
        {showGate && !name.trim() ? (
          <p className="notice notice--required">
            The story is written to your child by name. Please add it to
            continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">02</span>
          How old is {childLabel}?
        </label>
        <p className="field__hint">
          This sets the tone — simpler and shorter for the youngest, a little
          more honest for older children.
        </p>
        <div className="radio-group">
          {AGE_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="ageBracket"
                value={opt.value}
                checked={ageBracket === opt.value}
                onChange={() =>
                  updateDraft({ child: { ageBracket: opt.value } })
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
