"use client";

// Step 2 — the pet's identity and look, shared by all products.
//   - Story 1: name (required), species, a few words of appearance (required),
//     pronoun, illustration style; name + description gate Continue (the
//     description is a live merge field, so a blank one would break generation);
//     continues to /create/child.
//   - Story 2 / Story 4 / Story 5 (the letters): name (required), species, a few
//     words of appearance (optional — feeds the cover portrait). Pronoun +
//     illustration style are dropped (a letter is first-person/owner-voice and
//     photo-led). Name gates Continue; continues to /create/owner.
//   - Story 6 (the living tribute, a NARRATIVE book): like Story 1 it KEEPS
//     pronoun + illustration style + a (required) appearance, plus the new
//     `ageOrStage` field — and uses present-tense, "celebrate not pre-bury" copy.
//     Name + description + age gate Continue; continues to /create/tribute.
//   - Story 7 (the homecoming book, a NARRATIVE book): like Story 1 it KEEPS
//     pronoun + illustration style + a (required) appearance, with present-tense,
//     joyful copy (the pet is newly home). No `ageOrStage`. Name + description gate
//     Continue; continues to /create/homecoming.
// Every field writes straight through to the draft so a refresh keeps it.

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import { isStory6Draft } from "@/lib/session/draft";
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

  const storyType = draft?.storyType ?? "story-1";
  // Story 2, Story 4 and Story 5 are all "letter" products: photo-led, no child,
  // no pronoun/style. They share the pet step's letter behavior. Story 4 is the
  // *celebration* (living) twin, so its copy is warm/present-tense; Story 2 and
  // Story 5 are grief-toned (the default copy). Story 6 is NOT a letter — it is a
  // narrative book (like Story 1), so it keeps pronoun + style and is excluded here.
  const isLetter =
    storyType === "story-2" ||
    storyType === "story-4" ||
    storyType === "story-5";
  const isStory4 = storyType === "story-4";
  // Story 6 (the living tribute): present-tense copy + the new ageOrStage field.
  const isStory6 = storyType === "story-6";
  // Story 7 (the homecoming book): narrative book like Story 1/6 (keeps pronoun +
  // style + a required appearance), but no ageOrStage. Present-tense, joyful copy.
  const isStory7 = storyType === "story-7";
  // Stories 4, 6 and 7 are about a pet who is alive (here / newly home) —
  // present-tense copy.
  const isLiving = isStory4 || isStory6 || isStory7;
  const total = getWizardConfig(storyType).total;
  // Story 1 → the child step; a letter (no child) → the owner step; Story 6 (the
  // narrative tribute) → the tribute step; Story 7 (the homecoming book) → the
  // homecoming step.
  const continueHref = isStory7
    ? "/create/homecoming"
    : isStory6
      ? "/create/tribute"
      : isLetter
        ? "/create/owner"
        : "/create/child";

  const name = draft?.pet.name ?? "";
  const species = draft?.pet.species ?? "dog";
  const breedColor = draft?.pet.breedColor ?? "";
  const pronoun = draft?.pet.pronoun ?? "he";
  const illustrationStyle = draft?.pet.illustrationStyle ?? "watercolor";
  const ageOrStage =
    draft && isStory6Draft(draft) ? draft.memories.ageOrStage ?? "" : "";

  // The pet's name personalizes the later labels; fall back to "your pet".
  const petLabel = name.trim() ? name.trim() : "your pet";

  function handleContinue(): boolean {
    // Story 1 + Story 6 gate the description (a live merge field for both). A letter
    // doesn't merge breedColor (it feeds only the cover portrait), so it gates only
    // the name. Story 6 additionally gates the new ageOrStage field.
    if (
      !name.trim() ||
      (!isLetter && !breedColor.trim()) ||
      (isStory6 && !ageOrStage.trim())
    ) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={2}
      total={total}
      introQuote={
        isStory7
          ? "Tell us about the one who just came home."
          : isStory6
            ? "Tell us about the one who is still here."
            : isStory4
              ? "Tell us about the one who fills your days."
              : "Tell us about the one who is gone."
      }
      introAttribution={
        isStory7
          ? "So the book paints them, exactly as they are."
          : isStory6
            ? "So the book holds them, exactly as they are right now."
            : isStory4
              ? "So the letter sounds like them — exactly as they are."
              : "So the story can hold them, exactly as they were."
      }
      sectionLabel="Section · Two"
      sectionHeading={
        <>
          The shape of <em>them</em>.
        </>
      }
      sectionDescription={
        isLiving
          ? "The details below help us paint the pet that is actually yours — not a stand-in. The more specific, the better the book."
          : "The details below help us draw the pet that was actually yours — not a stand-in. The more specific, the better the book."
      }
      backHref="/create/upload"
      continueHref={continueHref}
      footerNote="Step 02 · Pet details"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label" htmlFor="pet-name">
          <span className="field__num">01</span>
          {isLiving ? "What's their name?" : "What was their name?"}
        </label>
        <p className="field__hint">
          {isLiving
            ? "The name you call them by."
            : "The name you used when calling them home."}
        </p>
        <input
          type="text"
          id="pet-name"
          value={name}
          onChange={(e) => updateDraft({ pet: { name: e.target.value } })}
          placeholder="Otis"
        />
        {showGate && !name.trim() ? (
          <p className="notice notice--required">
            A name lets the {isStory4 ? "letter" : "story"} speak to them
            directly. Please add one to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">02</span>
          {isLiving
            ? `What kind of pet is ${petLabel}?`
            : `What kind of pet was ${petLabel}?`}
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
          {isLetter ? " Optional, but it helps us paint the cover." : ""}
        </p>
        <input
          type="text"
          id="pet-description"
          value={breedColor}
          onChange={(e) => updateDraft({ pet: { breedColor: e.target.value } })}
          placeholder="a sweet rescue mutt with floppy ears and soft brown eyes"
        />
        {!isLetter && showGate && !breedColor.trim() ? (
          <p className="notice notice--required">
            A few words here let us draw {petLabel} as they truly{" "}
            {isLiving ? "are" : "were"}. Please add a little to continue.
          </p>
        ) : null}
      </div>

      {/* Story 6 only — the new ageOrStage field (the present-tense "where they
          are in life now" beat the narrative tribute is built around). */}
      {isStory6 ? (
        <div className="field">
          <label className="field__label" htmlFor="age-or-stage">
            <span className="field__num">04</span>
            Where is {petLabel} in life right now?
          </label>
          <p className="field__hint">
            Their age or stage, in your own words.{" "}
            <em>13 years young. A grand old senior. Slowing down, but still here.</em>
          </p>
          <input
            type="text"
            id="age-or-stage"
            value={ageOrStage}
            onChange={(e) =>
              updateDraft({ memories: { ageOrStage: e.target.value } })
            }
            placeholder="13 years young"
          />
          {showGate && !ageOrStage.trim() ? (
            <p className="notice notice--required">
              A word or two about where {petLabel} is now lets the book speak to
              this moment. Please add a little to continue.
            </p>
          ) : null}
        </div>
      ) : null}

      {!isLetter ? (
        <>
          <div className="field">
            <label className="field__label">
              <span className="field__num">{isStory6 ? "05" : "04"}</span>
              {isStory6 ? (
                <>
                  Do you call {petLabel} <em>he</em>, <em>she</em>, or{" "}
                  <em>they</em>?
                </>
              ) : (
                <>
                  Did you call {petLabel} <em>he</em>, <em>she</em>, or{" "}
                  <em>they</em>?
                </>
              )}
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
              <span className="field__num">{isStory6 ? "06" : "05"}</span>
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
                    illustrationStyle === opt.value
                      ? " style-card--selected"
                      : ""
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
        </>
      ) : null}
    </StepShell>
  );
}
