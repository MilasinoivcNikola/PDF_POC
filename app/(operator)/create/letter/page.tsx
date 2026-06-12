"use client";

// Step 4 of 6 — the personal details the letter is woven from. Shared by all
// three letter products:
//   - Story 2 (grief letter, pet's voice) + Story 4 (celebration, pet's voice):
//     quirks (required), favorite ritual (required), favorite spots (required) —
//     each a live merge field, so a blank one would break the letter. Story 4 adds
//     ONE more required field, `favoriteActivity` (the Page-4 "daily joy" beat).
//   - Story 5 (letter TO the pet, owner's voice): favorite ritual (required) +
//     favorite spots (required) are the only required fields here — `quirks` is
//     optional-with-fallback (the variant layer supplies a stock Page-3 line when
//     blank). Story 5 adds two NEW optional fields — `lastGoodDay` (the chosen
//     last good memory) and `whatIKeep` (the thing(s) being kept) — and has NO
//     `favoriteActivity`.
// Plus optional nicknames and the dates you shared. The required free-text fields
// gate Continue; the rest stay optional. Story 1 uses /create/memories instead.

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { useWizard } from "@/components/wizard/WizardProvider";
import { getWizardConfig } from "@/lib/story/wizard-config";
import { isStory4Draft, isStory5Draft } from "@/lib/session/draft";

export default function LetterPage() {
  const { draft, updateDraft } = useWizard();
  const [showGate, setShowGate] = useState(false);

  const storyType = draft?.storyType ?? "story-2";
  const isStory4 = storyType === "story-4";
  const isStory5 = storyType === "story-5";
  const total = getWizardConfig(storyType).total;
  // All three letter products keep their memories under the `owner`-bearing draft.
  // Only a Story-4 draft carries `favoriteActivity`; only a Story-5 draft carries
  // `lastGoodDay` / `whatIKeep` on its memories group.
  const memories = draft && "owner" in draft ? draft.memories : {};
  const quirks = memories.quirks ?? "";
  const favoriteRitual = memories.favoriteRitual ?? "";
  const favoriteSpots = memories.favoriteSpots ?? "";
  const nicknames = memories.nicknames ?? "";
  const dateAdopted = memories.dateAdopted ?? "";
  const datePassed = memories.datePassed ?? "";
  const favoriteActivity =
    draft && isStory4Draft(draft) ? draft.memories.favoriteActivity ?? "" : "";
  const lastGoodDay =
    draft && isStory5Draft(draft) ? draft.memories.lastGoodDay ?? "" : "";
  const whatIKeep =
    draft && isStory5Draft(draft) ? draft.memories.whatIKeep ?? "" : "";
  const petLabel = draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet";

  // Story 5 makes `quirks` optional (it has a fallback); Stories 2 & 4 require it.
  const requiresQuirks = !isStory5;

  function handleContinue(): boolean {
    if (
      (requiresQuirks && !quirks.trim()) ||
      !favoriteRitual.trim() ||
      !favoriteSpots.trim() ||
      (isStory4 && !favoriteActivity.trim())
    ) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={4}
      total={total}
      introQuote={
        isStory4
          ? "The small, true things only you two know."
          : "The small, true things only you two knew."
      }
      introAttribution={
        isStory5
          ? "These are what make the letter yours to give."
          : "These are what make the letter sound like them."
      }
      sectionLabel="Section · Four"
      sectionHeading={
        <>
          The life you <em>{isStory4 ? "share" : "shared"}</em>.
        </>
      }
      sectionDescription={
        isStory5
          ? "The letter is only as real as the specifics. The smaller and stranger the detail, the more it will sound like the words you'd say to them."
          : isStory4
            ? "The letter is only as real as the specifics. The smaller and stranger the detail, the more it will sound like the one beside you."
            : "The letter is only as real as the specifics. The smaller and stranger the detail, the more it will sound like the one who is gone."
      }
      backHref="/create/owner"
      continueHref="/create/tone"
      footerNote="Step 04 · The details"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label" htmlFor="quirks">
          <span className="field__num">01</span>
          {isStory4
            ? "A quirk or two that are only theirs."
            : "A quirk or two that were only theirs."}{" "}
          {isStory5 ? (
            <span className="field__optional">(optional)</span>
          ) : null}
        </label>
        <p className="field__hint">
          The small habits you&apos;d know anywhere.{" "}
          <em>
            {isStory4
              ? "The way you tilt your head when I say your name."
              : "The way you tilted your head when I said your name."}
          </em>
          {isStory5 ? " If you leave it blank, we'll write a gentle line for you." : ""}
        </p>
        <textarea
          id="quirks"
          value={quirks}
          onChange={(e) => updateDraft({ memories: { quirks: e.target.value } })}
          placeholder="the way you tilted your head when I said your name"
        />
        {requiresQuirks && showGate && !quirks.trim() ? (
          <p className="notice notice--required">
            One small quirk lets the letter sound like {petLabel}. Please add one
            to continue.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-ritual">
          <span className="field__num">02</span>
          {isStory4
            ? "A ritual that's the best part of the day."
            : "A ritual that was the best part of the day."}
        </label>
        <p className="field__hint">
          {isStory4
            ? "The thing you do together, again and again."
            : "The thing you did together, again and again."}{" "}
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
          {isStory4 ? "The spots that are theirs." : "The spots that were theirs."}
        </label>
        <p className="field__hint">
          {isStory4
            ? "One to three places they love."
            : "One to three places they loved."}{" "}
          <em>
            {isStory4
              ? "The spot by the back door where the sun lands at 4pm."
              : "The spot by the back door where the sun hit at 4pm."}
          </em>
        </p>
        <input
          type="text"
          id="favorite-spots"
          value={favoriteSpots}
          onChange={(e) =>
            updateDraft({ memories: { favoriteSpots: e.target.value } })
          }
          placeholder={
            isStory4
              ? "the spot by the back door where the sun lands at 4pm"
              : "the spot by the back door where the sun hit at 4pm"
          }
        />
        {showGate && !favoriteSpots.trim() ? (
          <p className="notice notice--required">
            A place that {isStory4 ? "is" : "was"} theirs gives the letter
            somewhere to rest. Please add one to continue.
          </p>
        ) : null}
      </div>

      {/* Story 4 only — the Page-4 "daily joy" beat the letter is built around. */}
      {isStory4 ? (
        <div className="field">
          <label className="field__label" htmlFor="favorite-activity">
            <span className="field__num">04</span>
            Their favorite thing to do.
          </label>
          <p className="field__hint">
            The ordinary joy they live for.{" "}
            <em>Stealing one sock and running a victory lap.</em>
          </p>
          <input
            type="text"
            id="favorite-activity"
            value={favoriteActivity}
            onChange={(e) =>
              updateDraft({ memories: { favoriteActivity: e.target.value } })
            }
            placeholder="stealing one sock and running a victory lap"
          />
          {showGate && !favoriteActivity.trim() ? (
            <p className="notice notice--required">
              One ordinary joy gives the letter its happiest page. Please add one
              to continue.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Story 5 only — the chosen last good memory and the thing(s) you're keeping.
          Both optional (the variant layer has a fallback for each). */}
      {isStory5 ? (
        <>
          <div className="field">
            <label className="field__label" htmlFor="last-good-day">
              <span className="field__num">04</span>
              The last good day, if you have one.{" "}
              <span className="field__optional">(optional)</span>
            </label>
            <p className="field__hint">
              An ordinary, good memory you&apos;d give anything to have again.{" "}
              <em>
                The last good Saturday, when you stole half my toast and slept in
                the sun all afternoon.
              </em>{" "}
              If you leave it blank, we&apos;ll write a gentle line for you.
            </p>
            <textarea
              id="last-good-day"
              value={lastGoodDay}
              onChange={(e) =>
                updateDraft({ memories: { lastGoodDay: e.target.value } })
              }
              placeholder="the last good Saturday, when you stole half my toast and slept in the sun all afternoon"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="what-i-keep">
              <span className="field__num">05</span>
              What you&apos;re keeping.{" "}
              <span className="field__optional">(optional)</span>
            </label>
            <p className="field__hint">
              The small things you&apos;re holding on to — one to three.{" "}
              <em>
                Your collar on the hook, the dent you left in the couch.
              </em>{" "}
              If you leave it blank, we&apos;ll lean on the ritual and the spots.
            </p>
            <input
              type="text"
              id="what-i-keep"
              value={whatIKeep}
              onChange={(e) =>
                updateDraft({ memories: { whatIKeep: e.target.value } })
              }
              placeholder="your collar on the hook, the dent you left in the couch"
            />
          </div>
        </>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="nicknames">
          <span className="field__num">
            {isStory4 ? "05" : isStory5 ? "06" : "04"}
          </span>
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

      {isStory4 ? (
        // Story 4 (living default): a single "together since" date for the cover.
        // The optional second date (datePassed) is collected later, only on the
        // memorial path, in the tone step.
        <div className="field">
          <label className="field__label" htmlFor="date-adopted">
            <span className="field__num">06</span>
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
            placeholder="March 2023"
            aria-label="The year they came home"
          />
        </div>
      ) : (
        <div className="field">
          <label className="field__label" htmlFor="date-adopted">
            <span className="field__num">{isStory5 ? "07" : "05"}</span>
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
      )}
    </StepShell>
  );
}
