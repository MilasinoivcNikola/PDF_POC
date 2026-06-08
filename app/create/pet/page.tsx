"use client";

// Step 2 of 6 — the pet's identity and look: name (required), species, a few
// words of appearance (required), pronoun, and illustration style. Mirrors the
// prototype's pet form. Every field writes straight through to the draft so a
// refresh keeps it; the name and the description gate Continue (the description
// is a live merge field, so a blank one would break book generation).

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import type {
  IllustrationStyle,
  Pronoun,
  Species,
} from "@/lib/session/types";

const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: "dog", label: "a dog" },
  { value: "cat", label: "a cat" },
  { value: "rabbit", label: "a rabbit" },
  { value: "bird", label: "a bird" },
  { value: "other", label: "something else" },
];

const PRONOUN_OPTIONS: { value: Pronoun; label: string }[] = [
  { value: "he", label: "he" },
  { value: "she", label: "she" },
  { value: "they", label: "they" },
];

const STYLE_OPTIONS: {
  value: IllustrationStyle;
  label: string;
  modifier: string;
}[] = [
  { value: "watercolor", label: "Soft watercolor", modifier: "watercolor" },
  { value: "storybook", label: "Gentle storybook", modifier: "storybook" },
  { value: "pencil", label: "Pencil sketch", modifier: "pencil" },
];

export default function PetPage() {
  const { draft, updateDraft } = useWizard();
  const [showGate, setShowGate] = useState(false);

  const name = draft?.pet.name ?? "";
  const species = draft?.pet.species ?? "dog";
  const breedColor = draft?.pet.breedColor ?? "";
  const pronoun = draft?.pet.pronoun ?? "he";
  const illustrationStyle = draft?.pet.illustrationStyle ?? "watercolor";

  // The pet's name personalizes the later labels; fall back to "your pet".
  const petLabel = name.trim() ? name.trim() : "your pet";

  function handleContinue(): boolean {
    if (!name.trim() || !breedColor.trim()) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={2}
      introQuote="Tell us about the one who is gone."
      introAttribution="So the story can hold them, exactly as they were."
      sectionLabel="Section · Two"
      sectionHeading={
        <>
          The shape of <em>them</em>.
        </>
      }
      sectionDescription="The details below help us draw the pet that was actually yours — not a stand-in. The more specific, the better the book."
      backHref="/create/upload"
      continueHref="/create/child"
      footerNote="Step 02 · Pet details"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label" htmlFor="pet-name">
          <span className="field__num">01</span>
          What was their name?
        </label>
        <p className="field__hint">The name you used when calling them home.</p>
        <input
          type="text"
          id="pet-name"
          value={name}
          onChange={(e) => updateDraft({ pet: { name: e.target.value } })}
          placeholder="Otis"
        />
        {showGate && !name.trim() ? (
          <p className="notice notice--required">
            A name lets the story speak to them directly. Please add one to
            continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">02</span>
          What kind of pet was {petLabel}?
        </label>
        <div className="radio-group">
          {SPECIES_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="species"
                value={opt.value}
                checked={species === opt.value}
                onChange={() => updateDraft({ pet: { species: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="pet-description">
          <span className="field__num">03</span>
          A few words to describe {petLabel}.
        </label>
        <p className="field__hint">
          The kind of detail you&apos;d mention to a stranger.{" "}
          <em>
            A scruffy rescue mutt with one floppy ear. A black tabby with a
            white chest patch.
          </em>
        </p>
        <input
          type="text"
          id="pet-description"
          value={breedColor}
          onChange={(e) => updateDraft({ pet: { breedColor: e.target.value } })}
          placeholder="a sweet rescue mutt with floppy ears and soft brown eyes"
        />
        {showGate && !breedColor.trim() ? (
          <p className="notice notice--required">
            A few words here let us draw {petLabel} as they truly were. Please
            add a little to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">04</span>
          Did you call {petLabel} <em>he</em>, <em>she</em>, or <em>they</em>?
        </label>
        <div className="radio-group">
          {PRONOUN_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="pronoun"
                value={opt.value}
                checked={pronoun === opt.value}
                onChange={() => updateDraft({ pet: { pronoun: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">05</span>
          How should the illustrations feel?
        </label>
        <p className="field__hint">
          You can change this later. Most families choose watercolor.
        </p>
        <div className="style-grid">
          {STYLE_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`style-card style-card--${opt.modifier}${
                illustrationStyle === opt.value ? " style-card--selected" : ""
              }`}
              onClick={() =>
                updateDraft({ pet: { illustrationStyle: opt.value } })
              }
              aria-pressed={illustrationStyle === opt.value}
            >
              <div className="style-card__swatch" />
              <div className="style-card__name">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>
    </StepShell>
  );
}
