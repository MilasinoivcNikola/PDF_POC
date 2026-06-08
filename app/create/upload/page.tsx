"use client";

// Step 1 of 6 — the pet photo. Drag-drop / file-picker upload with preview and a
// gentle low-res notice (the ImageUploader owns all of that and writes the saved
// path into the draft as pet.photo). A photo is required, so Continue gently
// gates until one is present.

import { useState } from "react";
import { StepShell } from "@/components/wizard/StepShell";
import { ImageUploader } from "@/components/wizard/ImageUploader";
import { useWizard } from "@/components/wizard/WizardProvider";

export default function UploadPage() {
  const { draft } = useWizard();
  const [showGate, setShowGate] = useState(false);

  function handleContinue(): boolean {
    if (!draft?.pet.photo) {
      setShowGate(true);
      return false;
    }
    return true;
  }

  return (
    <StepShell
      step={1}
      introQuote="First, a face we can hold onto."
      introAttribution="The photo you share becomes the pet in every illustration."
      sectionLabel="Section · One"
      sectionHeading={
        <>
          A photograph of <em>them</em>.
        </>
      }
      sectionDescription="We'll paint your pet from this photo across the whole book. A clear photo of the face works best, but any beloved photo will do."
      backHref="/"
      continueHref="/create/pet"
      footerNote="Step 01 · A photograph"
      onContinue={handleContinue}
    >
      <div className="field">
        <label className="field__label">
          <span className="field__num">01</span>
          Upload a photo
        </label>
        <p className="field__hint">
          Drag a photo here, or click to choose one from your device. It never
          leaves your machine.
        </p>
        <ImageUploader />
        {showGate && !draft?.pet.photo ? (
          <p className="notice notice--required">
            A photo is needed before we can illustrate the book. Please add one
            to continue.
          </p>
        ) : null}
      </div>
    </StepShell>
  );
}
