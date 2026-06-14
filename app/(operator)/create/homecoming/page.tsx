"use client";

// Step 3 (Story 7 only) — the homecoming details. The homecoming book is a
// NARRATIVE book (not a letter), so it has no separate owner/letter step; this
// single step collects the family the pet came home to (owner names) and the
// present-tense story of the day they arrived and the life they've grown into:
//   - required: who the pet came home to (ownerNames), the favorite thing in the
//     world (favoriteActivity, Page 7), where they sleep (sleepingSpot, Pages 5 &
//     7). All three are live merge placeholders, so a blank one would break the
//     book.
//   - optional-with-fallback: the first-day memory (homecomingMemory, Pages 4-5)
//     and a quirk or two (quirks, Page 6) — the variant layer writes a warm line
//     if blank or sparse.
//   - optional-omit: a child's name (childName), the wider household
//     (familyMembers), nicknames, and the "home since" date — dropped when blank.
// The tone is warm and celebratory — the best day, not a goodbye. Continues to
// /create/tone (occasion / adoption source / life stage).

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import { isStory7Draft } from "@/lib/session/draft";

export default function HomecomingPage() {
  const { draft, updateDraft } = useWizard();
  const [showGate, setShowGate] = useState(false);

  const storyType = draft?.storyType ?? "story-7";
  const total = getWizardConfig(storyType).total;
  // This route is the Story-7 wizard step; narrow precisely to a Story-7 draft so
  // the memory/owner groups are the homecoming shape.
  const seven = draft && isStory7Draft(draft) ? draft : null;
  const owner = seven ? seven.owner : {};
  const memories = seven ? seven.memories : {};
  const ownerNames = owner.names ?? "";
  const favoriteActivity = memories.favoriteActivity ?? "";
  const sleepingSpot = memories.sleepingSpot ?? "";
  const homecomingMemory = memories.homecomingMemory ?? "";
  const quirks = memories.quirks ?? "";
  const childName = memories.childName ?? "";
  const familyMembers = memories.familyMembers ?? "";
  const nicknames = memories.nicknames ?? "";
  const dateAdopted = memories.dateAdopted ?? "";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  function handleContinue(): boolean {
    if (!ownerNames.trim() || !favoriteActivity.trim() || !sleepingSpot.trim()) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={3}
      total={total}
      introQuote="The day they came home — and everything since."
      introAttribution="The small, true things that made them yours."
      sectionLabel="Section · Three"
      sectionHeading={
        <>
          The story of <em>coming home</em>.
        </>
      }
      sectionDescription="This is the story of the best day — the day they finally came home. The smaller and truer the detail, the more the book will sound like your family telling it."
      backHref="/create/pet"
      continueHref="/create/tone"
      footerNote="Step 03 · Homecoming"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label" htmlFor="owner-names">
          <span className="field__num">01</span>
          Who did {petLabel} come home to?
        </label>
        <p className="field__hint">
          The name {petLabel} knows you by — your own name, both your names, or the
          family name. <em>Maria. Maria and James. The Rodriguez family.</em>
        </p>
        <input
          type="text"
          id="owner-names"
          value={ownerNames}
          onChange={(e) => updateDraft({ owner: { names: e.target.value } })}
          placeholder="Maria and James"
        />
        {showGate && !ownerNames.trim() ? (
          <p className="notice notice--required">
            The book is the story of {petLabel} coming home to you. Please add a
            name to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-activity">
          <span className="field__num">02</span>
          {petLabel}&apos;s favorite thing in the world.
        </label>
        <p className="field__hint">
          The thing they love most now that they&apos;re home.{" "}
          <em>Stealing socks and parading them around the kitchen.</em>
        </p>
        <input
          type="text"
          id="favorite-activity"
          value={favoriteActivity}
          onChange={(e) =>
            updateDraft({ memories: { favoriteActivity: e.target.value } })
          }
          placeholder="stealing socks and parading them around the kitchen"
        />
        {showGate && !favoriteActivity.trim() ? (
          <p className="notice notice--required">
            Their favorite thing gives the book its joy. Please add one to
            continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="sleeping-spot">
          <span className="field__num">03</span>
          Where does {petLabel} love to sleep?
        </label>
        <p className="field__hint">
          The warm, safe place they curl up — it&apos;s where the first night
          settled. <em>In the crook of the couch by the window.</em>
        </p>
        <input
          type="text"
          id="sleeping-spot"
          value={sleepingSpot}
          onChange={(e) =>
            updateDraft({ memories: { sleepingSpot: e.target.value } })
          }
          placeholder="in the crook of the couch by the window"
        />
        {showGate && !sleepingSpot.trim() ? (
          <p className="notice notice--required">
            Their spot anchors the quiet first-night page. Please add one to
            continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="homecoming-memory">
          <span className="field__num">04</span>
          The day you brought {petLabel} home.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          A sentence or two from that first day — the drive, the first night, the
          first moment.{" "}
          <em>
            He shook the whole car ride and then fell asleep on Leo&apos;s lap
            before we hit the driveway.
          </em>{" "}
          If you leave it blank, we&apos;ll write a warm line for you.
        </p>
        <textarea
          id="homecoming-memory"
          value={homecomingMemory}
          onChange={(e) =>
            updateDraft({ memories: { homecomingMemory: e.target.value } })
          }
          placeholder="He shook the whole car ride and then fell asleep before we hit the driveway."
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="quirks">
          <span className="field__num">05</span>
          A quirk or two that are only theirs.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          The small habits you learned along the way.{" "}
          <em>The head-tilt when you say &ldquo;walk.&rdquo; The sigh before sleep.</em>{" "}
          If you leave it blank, we&apos;ll write a warm line for you.
        </p>
        <textarea
          id="quirks"
          value={quirks}
          onChange={(e) => updateDraft({ memories: { quirks: e.target.value } })}
          placeholder="the head-tilt when you say 'walk'; the sigh before sleep"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="child-name">
          <span className="field__num">06</span>
          Is there a child in the family?{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          A child&apos;s name, if there&apos;s one who loves {petLabel} most.{" "}
          <em>Leo.</em>
        </p>
        <input
          type="text"
          id="child-name"
          value={childName}
          onChange={(e) =>
            updateDraft({ memories: { childName: e.target.value } })
          }
          placeholder="Leo"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="family-members">
          <span className="field__num">07</span>
          Who else is in the home?{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          The wider household — people and any pets already there.{" "}
          <em>Maria, James, and the cat Pepper.</em>
        </p>
        <input
          type="text"
          id="family-members"
          value={familyMembers}
          onChange={(e) =>
            updateDraft({ memories: { familyMembers: e.target.value } })
          }
          placeholder="Maria, James, and the cat Pepper"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="nicknames">
          <span className="field__num">08</span>
          Any nicknames? <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Up to three. <em>Biscuit-boy, the gremlin.</em>
        </p>
        <input
          type="text"
          id="nicknames"
          value={nicknames}
          onChange={(e) =>
            updateDraft({ memories: { nicknames: e.target.value } })
          }
          placeholder="Biscuit-boy, the gremlin"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="date-adopted">
          <span className="field__num">09</span>
          Home since… <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          If you&apos;d like a date on the dedication — the day they came home.
        </p>
        <input
          type="text"
          id="date-adopted"
          value={dateAdopted}
          onChange={(e) =>
            updateDraft({ memories: { dateAdopted: e.target.value } })
          }
          placeholder="March 2026"
          aria-label="The date they came home"
        />
      </div>
    </StepShell>
  );
}
