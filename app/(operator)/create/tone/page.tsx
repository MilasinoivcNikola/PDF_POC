"use client";

// Step 5 of 6 — the sensitivity / belief / gift toggles. Shared by both letter
// products, with different toggle sets:
//   - Story 2 (the grief letter): how the pet died (Page 4), the comfort frame
//     (Page 5), whether it's a gift, and whether another pet has come home (Page
//     6). All have defaults, so it never gates Continue. Story 1 uses /create/style.
//   - Story 4 ("If [PET_NAME] Could Talk", the celebration twin): the HEADLINE
//     `livingOrMemorial` toggle — living (default, present tense, celebration) vs
//     memorial (past tense, grief). Choosing memorial REVEALS the memorial-only
//     fields (how they died, the comfort frame, and an optional "until" date);
//     they stay hidden in the living path. Plus the gift toggle. No `newPet`.

import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import {
  isStory2Draft,
  isStory4Draft,
  isStory5Draft,
} from "@/lib/session/draft";
import type {
  GiftFor,
  LetterBeliefFrame,
  LetterDeathType,
  LivingOrMemorial,
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

const LIVING_OR_MEMORIAL_OPTIONS: { value: LivingOrMemorial; label: string }[] = [
  { value: "living", label: "a celebration — they are here, now" },
  { value: "memorial", label: "a keepsake — they have died" },
];

export default function TonePage() {
  const { draft } = useWizard();

  const storyType = draft?.storyType ?? "story-2";
  const isStory4 = storyType === "story-4";
  const isStory5 = storyType === "story-5";
  const total = getWizardConfig(storyType).total;
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  if (isStory4) {
    return <Story4Tone draft={draft} total={total} petLabel={petLabel} />;
  }
  if (isStory5) {
    return <Story5Tone draft={draft} total={total} petLabel={petLabel} />;
  }
  return <Story2Tone draft={draft} total={total} petLabel={petLabel} />;
}

// ---------------------------------------------------------------------------
// Story 2 — the grief-letter toggles (unchanged from feature 18)
// ---------------------------------------------------------------------------

function Story2Tone({
  draft,
  total,
  petLabel,
}: {
  draft: ReturnType<typeof useWizard>["draft"];
  total: number;
  petLabel: string;
}) {
  const { updateDraft } = useWizard();
  // This route is the Story-2 wizard step; narrow precisely to a Story-2 draft
  // (Story 4 also has an `owner` group, but its toggles have no `newPet`).
  const toggles = draft && isStory2Draft(draft) ? draft.toggles : {};
  const deathType = toggles.deathType ?? "peaceful";
  const beliefFrame = toggles.beliefFrame ?? "rainbow-bridge";
  const giftFor = toggles.giftFor ?? "self";
  const newPet = toggles.newPet ?? "no";

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

// ---------------------------------------------------------------------------
// Story 4 — the living/memorial toggle (the headline conditional reveal)
// ---------------------------------------------------------------------------

function Story4Tone({
  draft,
  total,
  petLabel,
}: {
  draft: ReturnType<typeof useWizard>["draft"];
  total: number;
  petLabel: string;
}) {
  const { updateDraft } = useWizard();
  const toggles = draft && isStory4Draft(draft) ? draft.toggles : {};
  const memories = draft && isStory4Draft(draft) ? draft.memories : {};
  const livingOrMemorial = toggles.livingOrMemorial ?? "living";
  const giftFor = toggles.giftFor ?? "self";
  const deathType = toggles.deathType ?? "peaceful";
  const beliefFrame = toggles.beliefFrame ?? "rainbow-bridge";
  const datePassed = memories.datePassed ?? "";

  // The headline conditional reveal: the death-type / belief-frame / second-date
  // fields are consulted (and shown) ONLY on the memorial path. In the living
  // (default) path they lie dormant — hidden here, defaulted by the assembler.
  const isMemorial = livingOrMemorial === "memorial";

  return (
    <StepShell
      step={5}
      total={total}
      introQuote="One last choice, and then we'll bring it to life."
      introAttribution="The same letter, turned toward the light — or kept as a memory."
      sectionLabel="Section · Five"
      sectionHeading={
        <>
          A celebration, or a <em>keepsake</em>.
        </>
      }
      sectionDescription="Most letters are written for a pet who is here, now — a birthday, a gotcha day, or no reason at all. If yours has died, there's a quiet option to write it in the past tense, as a keepsake of them."
      backHref="/create/letter"
      continueHref="/create/generate"
      continueLabel="Continue to generate"
      footerNote="Step 05 · Living or memorial"
    >
      <div className="field">
        <label className="field__label">
          <span className="field__num">01</span>
          Is {petLabel} here with you, or is this a keepsake?
        </label>
        <p className="field__hint">
          This sets the whole letter&apos;s voice — present tense for a
          celebration, past tense for a memory.
        </p>
        <div className="radio-group">
          {LIVING_OR_MEMORIAL_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="livingOrMemorial"
                value={opt.value}
                checked={livingOrMemorial === opt.value}
                onChange={() =>
                  updateDraft({ toggles: { livingOrMemorial: opt.value } })
                }
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Memorial-only reveal: how they died, the comfort frame, the second date.
          Hidden entirely in the default living path. */}
      {isMemorial ? (
        <>
          <div className="field">
            <label className="field__label">
              <span className="field__num">02</span>
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
              <span className="field__num">03</span>
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
            <label className="field__label" htmlFor="date-passed">
              <span className="field__num">04</span>
              The day you said goodbye.{" "}
              <span className="field__optional">(optional)</span>
            </label>
            <p className="field__hint">
              If you&apos;d like both dates on the cover. We&apos;ll only print
              them if you gave the &ldquo;together since&rdquo; date too.
            </p>
            <input
              type="text"
              id="date-passed"
              value={datePassed}
              onChange={(e) =>
                updateDraft({ memories: { datePassed: e.target.value } })
              }
              placeholder="October 2025"
              aria-label="The year they died"
            />
          </div>
        </>
      ) : null}

      <div className="field">
        <label className="field__label">
          <span className="field__num">{isMemorial ? "05" : "02"}</span>
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
    </StepShell>
  );
}

// ---------------------------------------------------------------------------
// Story 5 — the simplest toggle set (how they died + the comfort frame)
// ---------------------------------------------------------------------------

function Story5Tone({
  draft,
  total,
  petLabel,
}: {
  draft: ReturnType<typeof useWizard>["draft"];
  total: number;
  petLabel: string;
}) {
  const { updateDraft } = useWizard();
  const toggles = draft && isStory5Draft(draft) ? draft.toggles : {};
  const deathType = toggles.deathType ?? "peaceful";
  const beliefFrame = toggles.beliefFrame ?? "rainbow-bridge";

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
    </StepShell>
  );
}
