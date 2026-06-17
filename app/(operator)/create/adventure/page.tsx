"use client";

// Step 3 (Story 8 only) — the adventure details. "The Amazing Adventures of
// [PET_NAME]" is a NARRATIVE book (not a letter), so it has no separate
// owner/letter step; this single step collects the inputs that personalize the
// quest:
//   - optional-with-fallback: the pet's superpower (the engine of the plot — the
//     real quirk reframed as a hero's power), the favorite activity, and a quirk
//     or two. All three feed the superpower fallback chain (the variant layer
//     invents a delightful power if all are blank), so none are required.
//   - conditional-required: the child's name (childName) — required when the
//     hero-count toggle (collected on the tone step, default "pet-plus") makes the
//     child a character in the quest; optional in "pet-solo" (the child is the
//     reader). Because the heroCount toggle lives on the *next* step (tone), this
//     step never hard-blocks on childName — that would trap a would-be pet-solo
//     user before they can reach the toggle. The conditional requirement is
//     enforced at the generate step instead (missingRequiredFieldsStory8), by
//     which point heroCount is actually known. Mirrors Story 7's yearsHome, which
//     is likewise collected on tone and gated only at generate.
//   - optional-omit: a sidekick (a sibling or second pet who joins the quest —
//     pet-plus only), and the pet's nicknames — dropped when blank.
// The tone is joyful and playful — a "save the day" romp, not a keepsake.
// Continues to /create/tone (adventure theme / hero count / reading level).

import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import { isStory8Draft } from "@/lib/session/draft";

export default function AdventurePage() {
  const { draft, updateDraft } = useWizard();

  const storyType = draft?.storyType ?? "story-8";
  const total = getWizardConfig(storyType).total;
  // This route is the Story-8 wizard step; narrow precisely to a Story-8 draft so
  // the adventure/toggles groups are the adventure shape.
  const eight = draft && isStory8Draft(draft) ? draft : null;
  const adventure = eight ? eight.adventure : {};
  const toggles = eight ? eight.toggles : {};
  const superpower = adventure.superpower ?? "";
  const favoriteActivity = adventure.favoriteActivity ?? "";
  const quirks = adventure.quirks ?? "";
  const childName = adventure.childName ?? "";
  const sidekickName = adventure.sidekickName ?? "";
  const nicknames = adventure.nicknames ?? "";
  // The hero-count toggle (default "pet-plus") decides whether childName is
  // ultimately required; in "pet-solo" the child is the reader, so the name is
  // optional and the sidekick is hidden (the pet adventures alone). The toggle
  // itself lives on the next step (tone), so this step only uses heroCount to
  // shape the sidekick field and copy — it never gates progression on childName.
  const heroCount = toggles.heroCount ?? "pet-plus";
  const isPetPlus = heroCount === "pet-plus";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  return (
    <StepShell
      step={3}
      total={total}
      introQuote="Every great hero needs a quest."
      introAttribution="And a superpower that's all their own."
      sectionLabel="Section · Three"
      sectionHeading={
        <>
          The makings of a <em>hero</em>.
        </>
      }
      sectionDescription="The more these come from your real pet — their goofy talent, their favorite game — the more the adventure feels like theirs. Leave the superpower blank and we'll invent a delightful one."
      backHref="/create/pet"
      continueHref="/create/tone"
      footerNote="Step 03 · The adventure"
    >
      <div className="field">
        <label className="field__label" htmlFor="superpower">
          <span className="field__num">01</span>
          {petLabel}&apos;s real-life superpower.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          A real quirk we&apos;ll turn into the hero&apos;s power.{" "}
          <em>
            Always finds the tennis ball → &ldquo;the World&apos;s Greatest
            Nose.&rdquo;
          </em>{" "}
          Leave it blank and we&apos;ll invent one from the details below.
        </p>
        <input
          type="text"
          id="superpower"
          value={superpower}
          onChange={(e) =>
            updateDraft({ adventure: { superpower: e.target.value } })
          }
          placeholder="the World's Greatest Nose"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-activity">
          <span className="field__num">02</span>
          {petLabel}&apos;s favorite thing to do.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          The game or habit they love most — it helps us shape the superpower.{" "}
          <em>digging giant holes in the garden</em>
        </p>
        <input
          type="text"
          id="favorite-activity"
          value={favoriteActivity}
          onChange={(e) =>
            updateDraft({ adventure: { favoriteActivity: e.target.value } })
          }
          placeholder="digging giant holes in the garden"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="quirks">
          <span className="field__num">03</span>
          A quirk or two that are only theirs.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          The funny little habits that make {petLabel} themselves.{" "}
          <em>barks at the vacuum like it&apos;s a dragon</em>
        </p>
        <textarea
          id="quirks"
          value={quirks}
          onChange={(e) =>
            updateDraft({ adventure: { quirks: e.target.value } })
          }
          placeholder="barks at the vacuum like it's a dragon"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="child-name">
          <span className="field__num">04</span>
          The child in the story.
        </label>
        <p className="field__hint">
          The child who shares the adventure with {petLabel}. Needed if they
          adventure together — you&apos;ll choose that on the next step (or make{" "}
          {petLabel} the lone hero, where it&apos;s optional). <em>Emma.</em>{" "}
          Your photo captures your pet. The child is illustrated as a playful,
          stylized character — not a likeness of a specific child.
        </p>
        <input
          type="text"
          id="child-name"
          value={childName}
          onChange={(e) =>
            updateDraft({ adventure: { childName: e.target.value } })
          }
          placeholder="Emma"
        />
      </div>

      {/* sidekickName only applies in pet-plus; the pet adventures alone in
          pet-solo, so the field is hidden (and dropped from the session). */}
      {isPetPlus ? (
        <div className="field">
          <label className="field__label" htmlFor="sidekick-name">
            <span className="field__num">05</span>
            A sidekick on the quest?{" "}
            <span className="field__optional">(optional)</span>
          </label>
          <p className="field__hint">
            A sibling or a second pet who joins the adventure.{" "}
            <em>Leo. Pepper the cat.</em>
          </p>
          <input
            type="text"
            id="sidekick-name"
            value={sidekickName}
            onChange={(e) =>
              updateDraft({ adventure: { sidekickName: e.target.value } })
            }
            placeholder="Leo"
          />
        </div>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="nicknames">
          <span className="field__num">{isPetPlus ? "06" : "05"}</span>
          Any nicknames? <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Up to three. <em>Biscey, the goblin.</em>
        </p>
        <input
          type="text"
          id="nicknames"
          value={nicknames}
          onChange={(e) =>
            updateDraft({ adventure: { nicknames: e.target.value } })
          }
          placeholder="Biscey, the goblin"
        />
      </div>
    </StepShell>
  );
}
