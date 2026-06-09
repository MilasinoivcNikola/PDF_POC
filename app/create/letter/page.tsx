"use client";

// Story 2 · Step 4 of 6 — the personal details the letter is woven from: the
// pet's quirks (required), your favorite shared ritual (required), and the spots
// that were theirs (required) — each is a live merge field, so a blank one would
// break the letter. Plus optional nicknames and the dates you shared them. The
// three required free-text fields gate Continue; the rest stay optional. This
// route is Story-2 only — Story 1 uses /create/memories here.

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";

export default function LetterPage() {
  const { draft, updateDraft } = useWizard();
  const [showGate, setShowGate] = useState(false);

  const total = getWizardConfig("story-2").total;
  const memories = draft && "owner" in draft ? draft.memories : {};
  const quirks = memories.quirks ?? "";
  const favoriteRitual = memories.favoriteRitual ?? "";
  const favoriteSpots = memories.favoriteSpots ?? "";
  const nicknames = memories.nicknames ?? "";
  const dateAdopted = memories.dateAdopted ?? "";
  const datePassed = memories.datePassed ?? "";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  function handleContinue(): boolean {
    if (!quirks.trim() || !favoriteRitual.trim() || !favoriteSpots.trim()) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={4}
      total={total}
      introQuote="The small, true things only you two knew."
      introAttribution="These are what make the letter sound like them."
      sectionLabel="Section · Four"
      sectionHeading={
        <>
          The life you <em>shared</em>.
        </>
      }
      sectionDescription="The letter is only as real as the specifics. The smaller and stranger the detail, the more it will sound like the one who is gone."
      backHref="/create/owner"
      continueHref="/create/tone"
      footerNote="Step 04 · The details"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label" htmlFor="quirks">
          <span className="field__num">01</span>
          A quirk or two that were only theirs.
        </label>
        <p className="field__hint">
          The small habits you&apos;d know anywhere.{" "}
          <em>The way you tilted your head when I said your name.</em>
        </p>
        <textarea
          id="quirks"
          value={quirks}
          onChange={(e) => updateDraft({ memories: { quirks: e.target.value } })}
          placeholder="the way you tilted your head when I said your name"
        />
        {showGate && !quirks.trim() ? (
          <p className="notice notice--required">
            One small quirk lets the letter sound like {petLabel}. Please add one
            to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-ritual">
          <span className="field__num">02</span>
          A ritual that was the best part of the day.
        </label>
        <p className="field__hint">
          The thing you did together, again and again.{" "}
          <em>Our walk before coffee, every morning.</em>
        </p>
        <input
          type="text"
          id="favorite-ritual"
          value={favoriteRitual}
          onChange={(e) =>
            updateDraft({ memories: { favoriteRitual: e.target.value } })
          }
          placeholder="our walk before coffee, every morning"
        />
        {showGate && !favoriteRitual.trim() ? (
          <p className="notice notice--required">
            A shared ritual gives the letter its heart. Please add one to
            continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-spots">
          <span className="field__num">03</span>
          The spots that were theirs.
        </label>
        <p className="field__hint">
          One to three places they loved.{" "}
          <em>The spot by the back door where the sun hit at 4pm.</em>
        </p>
        <input
          type="text"
          id="favorite-spots"
          value={favoriteSpots}
          onChange={(e) =>
            updateDraft({ memories: { favoriteSpots: e.target.value } })
          }
          placeholder="the spot by the back door where the sun hit at 4pm"
        />
        {showGate && !favoriteSpots.trim() ? (
          <p className="notice notice--required">
            A place that was theirs gives the letter somewhere to rest. Please
            add one to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="nicknames">
          <span className="field__num">04</span>
          Any nicknames? <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Printed under the signature, if you&apos;d like. Up to three.{" "}
          <em>Murph, Mr. Murph, the worst dog.</em>
        </p>
        <input
          type="text"
          id="nicknames"
          value={nicknames}
          onChange={(e) =>
            updateDraft({ memories: { nicknames: e.target.value } })
          }
          placeholder="Murph, Mr. Murph"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="date-adopted">
          <span className="field__num">05</span>
          The years you shared.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          If you&apos;d like the dates on the letter. We&apos;ll only print them
          if you give both.
        </p>
        <div className="field-row">
          <input
            type="text"
            id="date-adopted"
            value={dateAdopted}
            onChange={(e) =>
              updateDraft({ memories: { dateAdopted: e.target.value } })
            }
            placeholder="March 2014"
            aria-label="The year they came home"
          />
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
      </div>
    </StepShell>
  );
}
