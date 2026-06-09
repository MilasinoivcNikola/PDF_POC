"use client";

// Story 2 · Step 5 of 6 — the sensitivity / belief / gift toggles that adjust the
// most tender pages of the letter: how the pet died (Page 4, the goodbye), the
// comfort frame (Page 5, where they are now), whether the letter is for you or a
// gift, and whether another pet has come home (Page 6). All have defaults, so this
// step never gates Continue; it leads into the Generate step. This route is
// Story-2 only — Story 1 uses /create/style here.

import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import type {
  GiftFor,
  LetterBeliefFrame,
  LetterDeathType,
  NewPet,
} from "@/lib/session/types";

const DEATH_OPTIONS: { value: LetterDeathType; label: string }[] = [
  { value: "peaceful", label: "peacefully, of old age" },
  { value: "illness", label: "after an illness" },
  { value: "sudden", label: "suddenly" },
  { value: "euthanasia", label: "with a doctor's help" },
];

const BELIEF_OPTIONS: { value: LetterBeliefFrame; label: string }[] = [
  { value: "rainbow-bridge", label: "the Rainbow Bridge" },
  { value: "heaven", label: "a peaceful place / heaven" },
  { value: "secular", label: "kept in memory and presence" },
];

const GIFT_OPTIONS: { value: GiftFor; label: string }[] = [
  { value: "self", label: "for myself" },
  { value: "friend", label: "as a gift for someone" },
];

const NEW_PET_OPTIONS: { value: NewPet; label: string }[] = [
  { value: "no", label: "no" },
  { value: "yes", label: "yes" },
];

export default function TonePage() {
  const { draft, updateDraft } = useWizard();

  const total = getWizardConfig("story-2").total;
  const toggles = draft && "owner" in draft ? draft.toggles : {};
  const deathType = toggles.deathType ?? "peaceful";
  const beliefFrame = toggles.beliefFrame ?? "rainbow-bridge";
  const giftFor = toggles.giftFor ?? "self";
  const newPet = toggles.newPet ?? "no";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  return (
    <StepShell
      step={5}
      total={total}
      introQuote="A few gentle questions, so the words land softly."
      introAttribution="These shape the most tender pages of the letter."
      sectionLabel="Section · Five"
      sectionHeading={
        <>
          The <em>tender</em> details.
        </>
      }
      sectionDescription="These choices adjust the hardest pages so they match your truth and your beliefs. There are no wrong answers here."
      backHref="/create/letter"
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
          This gently adjusts how the letter speaks about the goodbye.
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
          Where would you like the letter to say {petLabel} is now?
        </label>
        <p className="field__hint">
          Choose the comfort frame that fits your beliefs.
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
          Is this letter for you, or a gift?
        </label>
        <p className="field__hint">
          Many people keep one and give one. The letter is always written to the
          owner.
        </p>
        <div className="radio-group">
          {GIFT_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="giftFor"
                value={opt.value}
                checked={giftFor === opt.value}
                onChange={() => updateDraft({ toggles: { giftFor: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">04</span>
          Has another pet come home, or might one soon?
        </label>
        <p className="field__hint">
          If so, the letter adds a gentle blessing for the one who comes next.
        </p>
        <div className="radio-group">
          {NEW_PET_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="newPet"
                value={opt.value}
                checked={newPet === opt.value}
                onChange={() => updateDraft({ toggles: { newPet: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </StepShell>
  );
}
