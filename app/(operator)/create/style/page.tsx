"use client";

// Step 5 of 6 — the sensitivity and belief toggles that adjust the gentlest pages
// of the book: how the pet died (Page 7), the comfort frame (Page 9), and whether
// other pets remain at home (Page 11). All have defaults, so this step never
// gates Continue; it leads into the Generate step.

import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import type {
  BeliefFrame,
  DeathType,
  OtherPetsInHome,
} from "@/lib/session/types";

const DEATH_OPTIONS: { value: DeathType; label: string }[] = [
  { value: "natural", label: "of old age" },
  { value: "illness", label: "after an illness" },
  { value: "sudden", label: "suddenly" },
  { value: "euthanasia", label: "with a doctor's help" },
];

const BELIEF_OPTIONS: { value: BeliefFrame; label: string }[] = [
  { value: "rainbow-bridge", label: "the Rainbow Bridge" },
  { value: "heaven", label: "a peaceful place / heaven" },
  { value: "secular", label: "kept in our hearts" },
  { value: "none", label: "no afterlife framing" },
];

const OTHER_PETS_OPTIONS: { value: OtherPetsInHome; label: string }[] = [
  { value: "no", label: "no" },
  { value: "yes", label: "yes" },
];

export default function StylePage() {
  const { draft, updateDraft } = useWizard();

  // This is a Story-1-only step; narrow the union to its Story-1 `toggles` shape.
  const toggles = draft && "child" in draft ? draft.toggles : {};
  const deathType = toggles.deathType ?? "natural";
  const beliefFrame = toggles.beliefFrame ?? "rainbow-bridge";
  const otherPetsInHome = toggles.otherPetsInHome ?? "no";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  return (
    <StepShell
      step={5}
      introQuote="A few gentle questions, so the words land softly."
      introAttribution="These shape the most tender pages of the book."
      sectionLabel="Section · Five"
      sectionHeading={
        <>
          The <em>tender</em> details.
        </>
      }
      sectionDescription="These choices adjust the hardest pages so they match your family's truth and beliefs. There are no wrong answers here."
      backHref="/create/memories"
      continueHref="/create/generate"
      continueLabel="Continue to generate"
      footerNote="Step 05 · Gentle choices"
    >
      <div className="field">
        <label className="field__label">
          <span className="field__num">01</span>
          How did {petLabel} die?
        </label>
        <p className="field__hint">
          This gently adjusts how the book explains what happened.
        </p>
        <div className="radio-group">
          {DEATH_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="deathType"
                value={opt.value}
                checked={deathType === opt.value}
                onChange={() =>
                  updateDraft({ toggles: { deathType: opt.value } })
                }
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">02</span>
          Where would you like the book to say {petLabel} is now?
        </label>
        <p className="field__hint">
          Choose the comfort frame that fits your family&apos;s beliefs.
        </p>
        <div className="radio-group">
          {BELIEF_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="beliefFrame"
                value={opt.value}
                checked={beliefFrame === opt.value}
                onChange={() =>
                  updateDraft({ toggles: { beliefFrame: opt.value } })
                }
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">03</span>
          Are there other pets still at home?
        </label>
        <p className="field__hint">
          If so, the book adds a gentle line about comforting one another.
        </p>
        <div className="radio-group">
          {OTHER_PETS_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="otherPetsInHome"
                value={opt.value}
                checked={otherPetsInHome === opt.value}
                onChange={() =>
                  updateDraft({ toggles: { otherPetsInHome: opt.value } })
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
