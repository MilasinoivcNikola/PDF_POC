"use client";

// Step 3 (Story 6 only) — the living-tribute details. The narrative tribute is
// NOT a letter, so it has no separate owner/letter/memories steps; this single
// step collects the narrator (owner names + optional dedication message) and the
// present-tense day-to-day life of a pet who is STILL HERE:
//   - required: who the book is dedicated by (ownerNames), the ritual that's the
//     best part of the day (favoriteRitual), the slow thing you still do together
//     (favoriteActivity). All three are live merge placeholders, so a blank one
//     would break the tribute.
//   - optional-with-fallback: a quirk (quirks), the present-tense thing they still
//     love (stillLoves) — the variant layer writes a gentle line if blank.
//   - optional-omit: the spots/sleeping spot that feed the art briefs, an optional
//     dedication line (ownerMessage), nicknames, and the "together since" date.
// The tone is "celebrate, never pre-bury": present tense, gratitude for the time
// you have, never a goodbye. Continues to /create/tone.

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import { isStory6Draft } from "@/lib/session/draft";
import type { Relationship } from "@/lib/session/types";

const RELATIONSHIP_OPTIONS: { value: Relationship; label: string }[] = [
  { value: "single", label: "just me" },
  { value: "couple", label: "the two of us" },
];

export default function TributePage() {
  const { draft, updateDraft } = useWizard();
  const [showGate, setShowGate] = useState(false);

  const storyType = draft?.storyType ?? "story-6";
  const total = getWizardConfig(storyType).total;
  // This route is the Story-6 wizard step; narrow precisely to a Story-6 draft so
  // the memory/owner groups are the living-tribute shape.
  const six = draft && isStory6Draft(draft) ? draft : null;
  const owner = six ? six.owner : {};
  const memories = six ? six.memories : {};
  const ownerNames = owner.names ?? "";
  const relationship = owner.relationship ?? "single";
  const ownerMessage = memories.ownerMessage ?? "";
  const quirks = memories.quirks ?? "";
  const stillLoves = memories.stillLoves ?? "";
  const favoriteActivity = memories.favoriteActivity ?? "";
  const favoriteRitual = memories.favoriteRitual ?? "";
  const favoriteSpots = memories.favoriteSpots ?? "";
  const sleepingSpot = memories.sleepingSpot ?? "";
  const nicknames = memories.nicknames ?? "";
  const dateAdopted = memories.dateAdopted ?? "";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  function handleContinue(): boolean {
    if (
      !ownerNames.trim() ||
      !favoriteActivity.trim() ||
      !favoriteRitual.trim()
    ) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={3}
      total={total}
      introQuote="The ordinary, everyday life you share right now."
      introAttribution="The small things that make this the time worth keeping."
      sectionLabel="Section · Three"
      sectionHeading={
        <>
          The life you <em>share</em>.
        </>
      }
      sectionDescription="This is a book made while they're still here — so it lives in the present tense. The smaller and truer the detail, the more it will sound like the days you're in right now."
      backHref="/create/pet"
      continueHref="/create/tone"
      footerNote="Step 03 · The details"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label" htmlFor="owner-names">
          <span className="field__num">01</span>
          Who is this book dedicated by?
        </label>
        <p className="field__hint">
          The name {petLabel} knows you by — your own name, both your names, or
          even &ldquo;Mom.&rdquo; It signs the dedication.{" "}
          <em>Sarah. Sarah and David.</em>
        </p>
        <input
          type="text"
          id="owner-names"
          value={ownerNames}
          onChange={(e) => updateDraft({ owner: { names: e.target.value } })}
          placeholder="Sarah"
        />
        {showGate && !ownerNames.trim() ? (
          <p className="notice notice--required">
            The dedication is signed by you. Please add your name to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">02</span>
          Is {petLabel} loved by one of you, or two?
        </label>
        <p className="field__hint">
          This gently shapes whether the book speaks as &ldquo;I&rdquo; or
          &ldquo;we.&rdquo;
        </p>
        <div className="radio-group">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="relationship"
                value={opt.value}
                checked={relationship === opt.value}
                onChange={() =>
                  updateDraft({ owner: { relationship: opt.value } })
                }
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-activity">
          <span className="field__num">03</span>
          Something you still do together.
        </label>
        <p className="field__hint">
          The everyday thing you share now — a little slower, maybe, and still
          yours. <em>The slow morning walk we still take.</em>
        </p>
        <input
          type="text"
          id="favorite-activity"
          value={favoriteActivity}
          onChange={(e) =>
            updateDraft({ memories: { favoriteActivity: e.target.value } })
          }
          placeholder="the slow morning walk we still take"
        />
        {showGate && !favoriteActivity.trim() ? (
          <p className="notice notice--required">
            One thing you still do together gives the book its heart. Please add
            one to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-ritual">
          <span className="field__num">04</span>
          A ritual that&apos;s the best part of the day.
        </label>
        <p className="field__hint">
          The everyday thing, again and again.{" "}
          <em>The coffee I drink with my hand on your back.</em>
        </p>
        <input
          type="text"
          id="favorite-ritual"
          value={favoriteRitual}
          onChange={(e) =>
            updateDraft({ memories: { favoriteRitual: e.target.value } })
          }
          placeholder="the coffee I drink with my hand on your back"
        />
        {showGate && !favoriteRitual.trim() ? (
          <p className="notice notice--required">
            A shared ritual gives the book its rhythm. Please add one to
            continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="still-loves">
          <span className="field__num">05</span>
          What does {petLabel} still love?{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Something they still do, in the present.{" "}
          <em>Still waits at the window at four. Still chases the hose.</em> If
          you leave it blank, we&apos;ll write a gentle line for you.
        </p>
        <textarea
          id="still-loves"
          value={stillLoves}
          onChange={(e) =>
            updateDraft({ memories: { stillLoves: e.target.value } })
          }
          placeholder="still waits at the window at four"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="quirks">
          <span className="field__num">06</span>
          A quirk or two that are only theirs.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          The small habits you&apos;d know anywhere.{" "}
          <em>The way you sigh when you lie down. The head tilt at your name.</em>{" "}
          If you leave it blank, we&apos;ll write a gentle line for you.
        </p>
        <textarea
          id="quirks"
          value={quirks}
          onChange={(e) => updateDraft({ memories: { quirks: e.target.value } })}
          placeholder="the way you sigh when you lie down"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-spots">
          <span className="field__num">07</span>
          The spots that are theirs.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          One to three places they love — these help us paint the scenes.{" "}
          <em>The warm square of sun by the back door.</em>
        </p>
        <input
          type="text"
          id="favorite-spots"
          value={favoriteSpots}
          onChange={(e) =>
            updateDraft({ memories: { favoriteSpots: e.target.value } })
          }
          placeholder="the warm square of sun by the back door"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="sleeping-spot">
          <span className="field__num">08</span>
          Where do they love to sleep?{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          The warm, safe place they curl up — it helps us paint the quiet pages.{" "}
          <em>At the foot of the bed.</em>
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
        <label className="field__label" htmlFor="owner-message">
          <span className="field__num">09</span>
          A line for the dedication, if you&apos;d like one.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          A few words to say to them, printed on the dedication page.
        </p>
        <textarea
          id="owner-message"
          value={ownerMessage}
          onChange={(e) =>
            updateDraft({ memories: { ownerMessage: e.target.value } })
          }
          placeholder="For all the ordinary days. They were never ordinary to me."
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="nicknames">
          <span className="field__num">10</span>
          Any nicknames? <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Up to three. <em>Biscy, the gremlin, sir.</em>
        </p>
        <input
          type="text"
          id="nicknames"
          value={nicknames}
          onChange={(e) =>
            updateDraft({ memories: { nicknames: e.target.value } })
          }
          placeholder="Biscy, the gremlin"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="date-adopted">
          <span className="field__num">11</span>
          Together since…{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          If you&apos;d like a date on the cover — the day they came home.
        </p>
        <input
          type="text"
          id="date-adopted"
          value={dateAdopted}
          onChange={(e) =>
            updateDraft({ memories: { dateAdopted: e.target.value } })
          }
          placeholder="Spring 2013"
          aria-label="The year they came home"
        />
      </div>
    </StepShell>
  );
}
