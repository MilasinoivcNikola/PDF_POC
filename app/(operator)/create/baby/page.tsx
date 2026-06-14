"use client";

// Step 3 (Story 9 only) — the new-baby keepsake details. "[PET_NAME] and the New
// Baby" is a NARRATIVE book (not a letter), so it has no separate owner/letter step;
// this single step collects the inputs that personalize the keepsake:
//   - required: who the family is (owner names — the dedication signs it), the pet's
//     favorite activity, and where they sleep. Both free-text fields are live
//     `{placeholder}`s the Page-3 body merges with no fallback, so they gate Continue.
//   - optional-with-fallback: a quirk or two (the variant layer supplies a stock
//     Page-3 clause when blank).
//   - optional: the new baby's name and an arrival note. CRITICAL: babyName is NEVER
//     required — an `expecting` order (the default, chosen on the next step) degrades
//     it to "the new baby" throughout. The babyStatus toggle lives on the *next* step
//     (tone), so this step never hard-blocks on the baby name (that would trap a
//     would-be expecting user before they reach the toggle); the conditional is gated
//     at the generate step instead, by which point babyStatus is known. Mirrors Story
//     7's yearsHome and Story 8's childName, both collected here/earlier and gated
//     only at generate.
//   - optional-omit: the pet's nicknames — dropped when blank.
// The tone is warm and forward-looking — a happy, growing-family book.
// Continues to /create/tone (baby status / other pets).

import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import { isStory9Draft } from "@/lib/session/draft";

export default function BabyPage() {
  const { draft, updateDraft } = useWizard();

  const storyType = draft?.storyType ?? "story-9";
  const total = getWizardConfig(storyType).total;
  // This route is the Story-9 wizard step; narrow precisely to a Story-9 draft so the
  // owner/memories groups + the baby fields are the keepsake shape.
  const nine = draft && isStory9Draft(draft) ? draft : null;
  const owner = nine ? nine.owner : {};
  const memories = nine ? nine.memories : {};
  const ownerNames = owner.names ?? "";
  const favoriteActivity = memories.favoriteActivity ?? "";
  const sleepingSpot = memories.sleepingSpot ?? "";
  const quirks = memories.quirks ?? "";
  const nicknames = memories.nicknames ?? "";
  const babyName = nine?.babyName ?? "";
  const babyArrival = nine?.babyArrival ?? "";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  return (
    <StepShell
      step={3}
      total={total}
      introQuote="The first family member, and the one on the way."
      introAttribution="The little rituals that make this their home, too."
      sectionLabel="Section · Three"
      sectionHeading={
        <>
          The shape of your <em>family</em>.
        </>
      }
      sectionDescription="The more these come from your real days together, the more the book reads as theirs. The baby can stay un-named — leave it blank and the book gently says 'the new baby' throughout."
      backHref="/create/pet"
      continueHref="/create/tone"
      footerNote="Step 03 · Your family"
    >
      <div className="field">
        <label className="field__label" htmlFor="owner-names">
          <span className="field__num">01</span>
          Your family name, as the dedication should read.
        </label>
        <p className="field__hint">
          How the dedication signs — the family name, or both your names.{" "}
          <em>The Garcia family. Maria and James. Mom and Dad.</em>
        </p>
        <input
          type="text"
          id="owner-names"
          value={ownerNames}
          onChange={(e) => updateDraft({ owner: { names: e.target.value } })}
          placeholder="Maria and James"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-activity">
          <span className="field__num">02</span>
          {petLabel}&apos;s favorite thing in the world.
        </label>
        <p className="field__hint">
          The thing they love most — it anchors the &ldquo;our days together&rdquo;
          page. <em>Chasing tennis balls in the backyard.</em>
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
      </div>

      <div className="field">
        <label className="field__label" htmlFor="sleeping-spot">
          <span className="field__num">03</span>
          Where does {petLabel} curl up at the end of the day?
        </label>
        <p className="field__hint">
          The warm, safe place they always return to.{" "}
          <em>At the foot of the bed. In the sunny window.</em>
        </p>
        <input
          type="text"
          id="sleeping-spot"
          value={sleepingSpot}
          onChange={(e) =>
            updateDraft({ memories: { sleepingSpot: e.target.value } })
          }
          placeholder="at the foot of the bed"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="quirks">
          <span className="field__num">04</span>
          A quirk or two that are only theirs.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          The little things only {petLabel} does.{" "}
          <em>The head tilt at the doorbell, the sigh when they settle.</em> If
          you leave it blank, we&apos;ll write a warm line for you.
        </p>
        <textarea
          id="quirks"
          value={quirks}
          onChange={(e) => updateDraft({ memories: { quirks: e.target.value } })}
          placeholder="the way you tilt your head when the doorbell rings"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="baby-name">
          <span className="field__num">05</span>
          The new baby&apos;s name, if you have one.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Leave it blank and the book gently says &ldquo;the new baby&rdquo;
          throughout — perfect if you&apos;re still expecting. <em>Noah.</em>
        </p>
        <input
          type="text"
          id="baby-name"
          value={babyName}
          onChange={(e) => updateDraft({ babyName: e.target.value })}
          placeholder="Noah"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="baby-arrival">
          <span className="field__num">06</span>
          When is the baby arriving?{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          A gentle note for the &ldquo;something is changing&rdquo; page, if
          you&apos;re expecting. <em>This spring. In March.</em>
        </p>
        <input
          type="text"
          id="baby-arrival"
          value={babyArrival}
          onChange={(e) => updateDraft({ babyArrival: e.target.value })}
          placeholder="this spring"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="nicknames">
          <span className="field__num">07</span>
          Any nicknames? <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Up to three. <em>Biscuit-boy, the goblin.</em>
        </p>
        <input
          type="text"
          id="nicknames"
          value={nicknames}
          onChange={(e) =>
            updateDraft({ memories: { nicknames: e.target.value } })
          }
          placeholder="Biscuit-boy, the goblin"
        />
      </div>
    </StepShell>
  );
}
