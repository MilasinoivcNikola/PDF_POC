"use client";

// The live generation progress screen (feature 09), ported from
// prototypes/generating.html. It is driven entirely by `useGenerationProgress`:
// the rotating ornament stack, the "NN of MM illustrations complete" count, the
// progress bar, and the per-illustration checklist (done / current / pending),
// then it auto-advances to /create/preview when the run reports "ready". The
// prototype's hardcoded 12-item list is replaced by the REAL slot set, per product
// (Story 1: reference + SCENE_PAGE_IDS = 14; Story 2: the two Premium letter slots
// = 2), labelled in the same warm voice — feature 18 makes this story-aware.

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  illustrationSlotsFor,
  illustrationLabel,
  type IllustrationSlot,
} from "@/components/wizard/illustrationLabels";
import { useGenerationProgress } from "@/components/wizard/useGenerationProgress";
import type { StoryType } from "@/lib/session/types";
import { BRAND } from "@/lib/brand";

interface GenerationProgressProps {
  /** The written session id to generate for. */
  sessionId: string;
  /** Pet name, woven into the checklist labels + heading. */
  petName: string;
  /** Pet description (session.pet.breedColor), shown in the footer note. */
  petDescription: string;
  /** Which product is generating — drives the checklist slots + labels. */
  storyType?: StoryType;
}

type SlotState = "done" | "current" | "pending";

const checkIcon = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M2 6.5l3 3 5-7"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function GenerationProgress({
  sessionId,
  petName,
  petDescription,
  storyType = "story-1",
}: GenerationProgressProps) {
  const router = useRouter();
  const { status, donePages, total, error, retry } =
    useGenerationProgress(sessionId);

  const slots = illustrationSlotsFor(storyType);
  const name = petName.trim() || "your pet";
  const totalImages = total || slots.length;
  const done = donePages.length;
  const donePercent = totalImages > 0 ? (done / totalImages) * 100 : 0;

  // Auto-advance to the preview once the book is ready.
  useEffect(() => {
    if (status === "ready") {
      router.push("/create/preview");
    }
  }, [status, router]);

  const doneSet = new Set(donePages);
  // The first not-yet-done slot in book order is the one "painting" now.
  const currentSlot = slots.find((slot) => !doneSet.has(slot));

  function slotState(slot: IllustrationSlot): SlotState {
    if (doneSet.has(slot)) {
      return "done";
    }
    if (status === "generating" && slot === currentSlot) {
      return "current";
    }
    return "pending";
  }

  return (
    <div className="page-wrap">
      <header className="site-header">
        <Link href="/" className="wordmark">
          <svg
            className="wordmark__ornament"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 8 Q4 5 6 4 Q8 5 7 8 Z M13 8 Q15 5 13 4 Q11 5 12 8 Z M3 12 Q1 10 3 9 Q5 10 4 12 Z M16 12 Q18 10 16 9 Q14 10 15 12 Z M10 17 Q5 17 5 12 Q5 9 10 9 Q15 9 15 12 Q15 17 10 17 Z"
              fill="currentColor"
              opacity="0.7"
            />
          </svg>
          {BRAND}
        </Link>
        <div className="label">Generating · Step 06 of 06</div>
      </header>

      <main className="generating">
        <div className="gen-ornament-stack">
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#B8857A" strokeWidth="0.7" opacity="0.8">
              <ellipse cx="40" cy="40" rx="34" ry="14" />
              <ellipse cx="40" cy="40" rx="14" ry="34" />
            </g>
          </svg>
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="#7E8D6B" strokeWidth="0.7">
              <ellipse cx="40" cy="40" rx="30" ry="20" transform="rotate(45 40 40)" />
              <ellipse cx="40" cy="40" rx="30" ry="20" transform="rotate(-45 40 40)" />
            </g>
          </svg>
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="3" fill="#A88147" />
          </svg>
        </div>

        <h1 className="gen-title">
          Bringing <em>{name}</em> to life.
        </h1>
        <p className="gen-subtitle">
          {storyType === "story-2" || storyType === "story-5"
            ? "The cover portrait is painted from the photo you uploaded. This usually takes a minute or two — please don't close the window."
            : storyType === "story-4"
              ? "The cover portrait and the scene are painted from the photo you uploaded. This usually takes a minute or two — please don't close the window."
              : "Each illustration is painted from the photo you uploaded. This usually takes a few minutes — please don't close the window."}
        </p>
        {/* Story 6 (the living tribute) is a narrative book — same imagery shape as
            Story 1, so its subtitle is the shared "Each illustration…" branch above. */}

        {error ? (
          <div className="fade-in" style={{ textAlign: "center" }}>
            <p
              className="notice"
              style={{ maxWidth: "32em", margin: "0 auto var(--s-8)" }}
            >
              {error}
            </p>
            <button type="button" className="btn btn--primary" onClick={retry}>
              Try painting again
            </button>
          </div>
        ) : (
          <>
            <p className="gen-progress">
              <strong>{String(done).padStart(2, "0")}</strong> of {totalImages}{" "}
              illustrations complete
            </p>
            <div className="gen-bar">
              <span
                className="gen-bar__fill"
                style={{ width: `${donePercent}%` }}
              />
            </div>

            <ul className="gen-list">
              {slots.map((slot) => {
                const state = slotState(slot);
                return (
                  <li key={slot} className={`gen-item gen-item--${state}`}>
                    <span className="gen-item__status">
                      {state === "done" ? (
                        checkIcon
                      ) : state === "current" ? (
                        <span className="gen-dots">
                          <span className="gen-dot" />
                          <span className="gen-dot" />
                          <span className="gen-dot" />
                        </span>
                      ) : (
                        "○"
                      )}
                    </span>
                    <span className="gen-item__label">
                      {illustrationLabel(slot, name, storyType)}
                    </span>
                    <span className="gen-item__time">
                      {state === "done"
                        ? "done"
                        : state === "current"
                          ? "painting"
                          : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {petDescription ? (
              <p className="gen-note">{petDescription}</p>
            ) : null}
          </>
        )}
      </main>

      <footer className="site-footer">
        <p className="label">
          Using gpt-image-2-2026-04-21 · Low quality
        </p>
        <p className="label">
          {storyType === "story-2" || storyType === "story-5"
            ? "~$0.02 per letter · From your own credits"
            : storyType === "story-4"
              ? "~$0.01 per letter · From your own credits"
              : storyType === "story-6"
                ? "~$0.05 per book · From your own credits"
                : storyType === "story-7"
                  ? "~$0.06 per book · From your own credits"
                  : "~$0.07 per book · From your own credits"}
        </p>
      </footer>
    </div>
  );
}
