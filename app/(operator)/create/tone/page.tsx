"use client";

// Step 5 of 6 (Story 1/2/4/5) or step 4 of 5 (Story 6) — the sensitivity / belief /
// gift / frame toggles. The toggle set differs by product:
//   - Story 2 (the grief letter): how the pet died (Page 4), the comfort frame
//     (Page 5), whether it's a gift, and whether another pet has come home (Page
//     6). All have defaults, so it never gates Continue. Story 1 uses /create/style.
//   - Story 4 ("If [PET_NAME] Could Talk", the celebration twin): the HEADLINE
//     `livingOrMemorial` toggle — living (default, present tense, celebration) vs
//     memorial (past tense, grief). Choosing memorial REVEALS the memorial-only
//     fields (how they died, the comfort frame, and an optional "until" date);
//     they stay hidden in the living path. Plus the gift toggle. No `newPet`.
//   - Story 5 (the letter TO the pet): how they died + the comfort frame only.
//   - Story 6 (the living tribute): the `transitionFrame` toggle (still-here vs
//     road-ahead) + `otherPetsInHome` only — NO death/belief/gift toggles (the
//     memorial path is dropped). Its previous step is /create/tribute, not /letter.
//   - Story 7 (the homecoming book): the `occasion` toggle (new-arrival vs
//     gotcha-day-anniversary) with a CONDITIONAL `yearsHome` reveal on the
//     anniversary path, plus `adoptionSource` and `lifeStage` — NO grief toggles.
//     Its previous step is /create/homecoming.
//   - Story 8 (the kids' adventure): the `adventureTheme` choice (only the
//     backyard-mystery is authored — shown as a single fixed choice with a "more
//     coming soon" note), the `heroCount` toggle (pet-plus default vs pet-solo,
//     which makes the child the reader and the childName optional), and the
//     `childAgeBracket` reading level. NO grief toggles. Its previous step is
//     /create/adventure.

import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import {
  isStory2Draft,
  isStory4Draft,
  isStory5Draft,
  isStory6Draft,
  isStory7Draft,
  isStory8Draft,
} from "@/lib/session/draft";
import type {
  AdoptionSource,
  AgeBracket,
  GiftFor,
  HeroCount,
  LetterBeliefFrame,
  LetterDeathType,
  LifeStage,
  LivingOrMemorial,
  NewPet,
  Occasion,
  OtherPetsInHome,
  TransitionFrame,
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

const TRANSITION_FRAME_OPTIONS: { value: TransitionFrame; label: string }[] = [
  {
    value: "still-here",
    label: "just celebrate the time we have",
  },
  {
    value: "road-ahead",
    label: "gently acknowledge the road ahead",
  },
];

const OTHER_PETS_OPTIONS: { value: OtherPetsInHome; label: string }[] = [
  { value: "no", label: "no" },
  { value: "yes", label: "yes" },
];

const OCCASION_OPTIONS: { value: Occasion; label: string }[] = [
  { value: "new-arrival", label: "a brand-new arrival" },
  { value: "gotcha-day-anniversary", label: "a gotcha-day anniversary" },
];

const ADOPTION_SOURCE_OPTIONS: { value: AdoptionSource; label: string }[] = [
  { value: "shelter", label: "from a shelter" },
  { value: "rescue", label: "from a rescue" },
  { value: "breeder", label: "from a breeder" },
  { value: "found-as-stray", label: "found as a stray" },
  { value: "other", label: "another way" },
];

const LIFE_STAGE_OPTIONS: { value: LifeStage; label: string }[] = [
  { value: "puppy-kitten", label: "a puppy or kitten" },
  { value: "adult", label: "an adult" },
  { value: "senior-adoption", label: "a senior" },
];

const HERO_COUNT_OPTIONS: { value: HeroCount; label: string }[] = [
  { value: "pet-plus", label: "together — the child joins the quest" },
  { value: "pet-solo", label: "the lone hero — the child hears the legend" },
];

const CHILD_AGE_BRACKET_OPTIONS: { value: AgeBracket; label: string }[] = [
  { value: "3-5", label: "3 to 5" },
  { value: "6-8", label: "6 to 8" },
  { value: "9-12", label: "9 to 12" },
];

export default function TonePage() {
  const { draft } = useWizard();

  const storyType = draft?.storyType ?? "story-2";
  const isStory4 = storyType === "story-4";
  const isStory5 = storyType === "story-5";
  const isStory6 = storyType === "story-6";
  const isStory7 = storyType === "story-7";
  const isStory8 = storyType === "story-8";
  const total = getWizardConfig(storyType).total;
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  if (isStory4) {
    return <Story4Tone draft={draft} total={total} petLabel={petLabel} />;
  }
  if (isStory5) {
    return <Story5Tone draft={draft} total={total} petLabel={petLabel} />;
  }
  if (isStory6) {
    return <Story6Tone draft={draft} total={total} petLabel={petLabel} />;
  }
  if (isStory7) {
    return <Story7Tone draft={draft} total={total} petLabel={petLabel} />;
  }
  if (isStory8) {
    return <Story8Tone draft={draft} total={total} petLabel={petLabel} />;
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

// ---------------------------------------------------------------------------
// Story 6 — the living-tribute toggles (transition frame + other pets)
// ---------------------------------------------------------------------------

function Story6Tone({
  draft,
  total,
  petLabel,
}: {
  draft: ReturnType<typeof useWizard>["draft"];
  total: number;
  petLabel: string;
}) {
  const { updateDraft } = useWizard();
  const toggles = draft && isStory6Draft(draft) ? draft.toggles : {};
  const transitionFrame = toggles.transitionFrame ?? "still-here";
  const otherPetsInHome = toggles.otherPetsInHome ?? "no";

  return (
    <StepShell
      step={4}
      total={total}
      introQuote="One gentle choice, and then we'll bring it to life."
      introAttribution="The same book, however you need it to hold this moment."
      sectionLabel="Section · Four"
      sectionHeading={
        <>
          How it <em>holds</em> the time.
        </>
      }
      sectionDescription="This book lives in the present — it celebrates the time you have. You can keep it entirely in the now, or let one quiet line acknowledge the road ahead. There are no wrong answers here."
      backHref="/create/tribute"
      continueHref="/create/generate"
      continueLabel="Continue to generate"
      footerNote="Step 04 · Gentle choices"
    >
      <div className="field">
        <label className="field__label">
          <span className="field__num">01</span>
          How should the book hold this time with {petLabel}?
        </label>
        <p className="field__hint">
          The book stays grateful and present either way. This only sets whether
          one closing line looks softly toward the days ahead.
        </p>
        <div className="radio-group">
          {TRANSITION_FRAME_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="transitionFrame"
                value={opt.value}
                checked={transitionFrame === opt.value}
                onChange={() =>
                  updateDraft({ toggles: { transitionFrame: opt.value } })
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
          Are there other pets at home with {petLabel}?
        </label>
        <p className="field__hint">
          If so, the book adds a gentle line about the company they keep.
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

// ---------------------------------------------------------------------------
// Story 7 — the homecoming toggles (occasion + conditional yearsHome reveal +
// adoption source + life stage)
// ---------------------------------------------------------------------------

function Story7Tone({
  draft,
  total,
  petLabel,
}: {
  draft: ReturnType<typeof useWizard>["draft"];
  total: number;
  petLabel: string;
}) {
  const { updateDraft } = useWizard();
  const toggles = draft && isStory7Draft(draft) ? draft.toggles : {};
  const occasion = toggles.occasion ?? "new-arrival";
  const adoptionSource = toggles.adoptionSource ?? "shelter";
  const lifeStage = toggles.lifeStage ?? "adult";
  const yearsHome = toggles.yearsHome ?? "";

  // The conditional reveal: `yearsHome` is asked (and required) ONLY on the
  // anniversary path. When the occasion is set back to a new arrival, the field is
  // hidden and its value cleared so a stale year can't leak into the book.
  const isAnniversary = occasion === "gotcha-day-anniversary";

  return (
    <StepShell
      step={4}
      total={total}
      introQuote="One last choice, and then we'll bring it to life."
      introAttribution="The story of the best day — told the way it happened."
      sectionLabel="Section · Four"
      sectionHeading={
        <>
          How you <em>found</em> each other.
        </>
      }
      sectionDescription="These choices shape the origin pages so the book tells your story — a brand-new arrival or a gotcha-day anniversary, and how they came home. There are no wrong answers here."
      backHref="/create/homecoming"
      continueHref="/create/generate"
      continueLabel="Continue to generate"
      footerNote="Step 04 · How you found each other"
    >
      <div className="field">
        <label className="field__label">
          <span className="field__num">01</span>
          Is this for a new arrival, or a gotcha-day anniversary?
        </label>
        <p className="field__hint">
          This sets the whole book&apos;s frame — &ldquo;the day you became
          ours&rdquo; for a new arrival, or &ldquo;[N] years ago today&rdquo; for an
          anniversary.
        </p>
        <div className="radio-group">
          {OCCASION_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="occasion"
                value={opt.value}
                checked={occasion === opt.value}
                onChange={() =>
                  updateDraft({
                    toggles:
                      opt.value === "gotcha-day-anniversary"
                        ? { occasion: opt.value }
                        : // Switching back to a new arrival clears any stale year.
                          { occasion: opt.value, yearsHome: "" },
                  })
                }
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Anniversary-only reveal: how many years ago they came home. Required on
          this path (the reframed cover/dedication/closing print the count); hidden
          and cleared on the default new-arrival path. */}
      {isAnniversary ? (
        <div className="field">
          <label className="field__label" htmlFor="years-home">
            <span className="field__num">02</span>
            How many years ago did {petLabel} come home?
          </label>
          <p className="field__hint">
            We&apos;ll print it on the cover and the closing —{" "}
            <em>&ldquo;3 years ago today&hellip;&rdquo;</em>
          </p>
          <input
            type="number"
            id="years-home"
            min={1}
            step={1}
            value={yearsHome}
            onChange={(e) =>
              updateDraft({ toggles: { yearsHome: e.target.value } })
            }
            placeholder="3"
            aria-label="Years home"
          />
        </div>
      ) : null}

      <div className="field">
        <label className="field__label">
          <span className="field__num">{isAnniversary ? "03" : "02"}</span>
          How did {petLabel} come to you?
        </label>
        <p className="field__hint">
          This shapes the &ldquo;day we found each other&rdquo; page — with a warm
          thank-you to whoever cared for them before, for a shelter, rescue, or
          stray.
        </p>
        <div className="radio-group">
          {ADOPTION_SOURCE_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="adoptionSource"
                value={opt.value}
                checked={adoptionSource === opt.value}
                onChange={() =>
                  updateDraft({ toggles: { adoptionSource: opt.value } })
                }
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">{isAnniversary ? "04" : "03"}</span>
          What was {petLabel} when they came home?
        </label>
        <p className="field__hint">
          This adds a tender beat or two — a little extra for a senior who waited a
          long time for a home.
        </p>
        <div className="radio-group">
          {LIFE_STAGE_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="lifeStage"
                value={opt.value}
                checked={lifeStage === opt.value}
                onChange={() =>
                  updateDraft({ toggles: { lifeStage: opt.value } })
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

// ---------------------------------------------------------------------------
// Story 8 — the adventure toggles (theme + hero count + reading level)
// ---------------------------------------------------------------------------

function Story8Tone({
  draft,
  total,
  petLabel,
}: {
  draft: ReturnType<typeof useWizard>["draft"];
  total: number;
  petLabel: string;
}) {
  const { updateDraft } = useWizard();
  const toggles = draft && isStory8Draft(draft) ? draft.toggles : {};
  const heroCount = toggles.heroCount ?? "pet-plus";
  const childAgeBracket = toggles.childAgeBracket ?? "6-8";

  // The conditional reveal lives on step 3 (childName/sidekickName), gated by this
  // hero-count toggle. We don't show those fields here — only the toggle that
  // controls them, with copy explaining the effect. `adventureTheme` is fixed to
  // the only authored arc (backyard-mystery); the others appear once authored.
  const isPetPlus = heroCount === "pet-plus";

  return (
    <StepShell
      step={4}
      total={total}
      introQuote="One last choice, and then the adventure begins."
      introAttribution="The shape of the quest, and who's along for the ride."
      sectionLabel="Section · Four"
      sectionHeading={
        <>
          The shape of the <em>adventure</em>.
        </>
      }
      sectionDescription="These choices set the quest and who stars in it. The child is always at least the reader — choose whether they join the adventure too."
      backHref="/create/adventure"
      continueHref="/create/generate"
      continueLabel="Continue to generate"
      footerNote="Step 04 · The adventure"
    >
      <div className="field">
        <label className="field__label">
          <span className="field__num">01</span>
          Which adventure?
        </label>
        <p className="field__hint">
          We&apos;re launching with the cozy <em>Backyard Mystery</em> — something
          keeps going missing in the garden, and only {petLabel} can crack the
          case. More adventures (a sea voyage, a space rescue, an enchanted forest)
          are coming soon.
        </p>
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              name="adventureTheme"
              value="backyard-mystery"
              checked
              readOnly
            />
            <span className="radio-option__label">The Backyard Mystery</span>
          </label>
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">02</span>
          Does the child adventure with {petLabel}, or hear the legend?
        </label>
        <p className="field__hint">
          {isPetPlus ? (
            <>
              {petLabel} and the child are heroes together — so the child&apos;s
              name is needed on the previous step.
            </>
          ) : (
            <>
              {petLabel} is the lone hero and the child is the reader being told the
              tale — so the child&apos;s name (and a sidekick) are optional.
            </>
          )}
        </p>
        <div className="radio-group">
          {HERO_COUNT_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="heroCount"
                value={opt.value}
                checked={heroCount === opt.value}
                onChange={() =>
                  updateDraft({ toggles: { heroCount: opt.value } })
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
          What reading level fits the child?
        </label>
        <p className="field__hint">
          This tunes the sentence length and how the big moments land — gentler and
          shorter for the youngest, with a wink of humor for the oldest.
        </p>
        <div className="radio-group">
          {CHILD_AGE_BRACKET_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="childAgeBracket"
                value={opt.value}
                checked={childAgeBracket === opt.value}
                onChange={() =>
                  updateDraft({ toggles: { childAgeBracket: opt.value } })
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
