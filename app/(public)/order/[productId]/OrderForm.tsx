"use client";

// The public order form (PR-05). One scrollable page that reuses the wizard draft
// state + the existing field design system: it collects the product's pet/story
// inputs, a delivery email, and a photo, gates on the SAME required-field
// validators the operator wizard uses, and on submit assembles the session and
// POSTs to /api/order — creating a `pending_payment` order. NO generation, NO
// charge (that's PR-06's Lemon Squeezy checkout). "Continue to payment" is the
// submit; it lands the order and shows a gentle "we'll take you to checkout soon"
// confirmation stub.
//
// PUBLIC SURFACE: imports only client-safe modules (the wizard provider/uploader,
// the pure draft helpers, the catalog/wizard-config). The photo never goes to the
// local ./uploads/ engine path — the deferred uploader hands it back here and we
// ship it to Supabase with the order POST.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ImageUploader } from "@/components/wizard/ImageUploader";
import { useWizard } from "@/components/wizard/WizardProvider";
import { newDraft } from "@/lib/session/storage";
import { isValidEmail } from "@/lib/order/email";
import {
  draftToSessionForDraft,
  isStory1Draft,
  isStory2Draft,
  isStory4Draft,
  isStory5Draft,
  missingRequiredFieldsForDraft,
} from "@/lib/session/draft";
import type {
  IllustrationStyle,
  Pronoun,
  Species,
  StoryType,
} from "@/lib/session/types";

interface OrderFormProps {
  productId: string;
  storyType: StoryType;
  title: string;
}

const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: "dog", label: "a dog" },
  { value: "cat", label: "a cat" },
  { value: "rabbit", label: "a rabbit" },
  { value: "bird", label: "a bird" },
  { value: "other", label: "something else" },
];

const PRONOUN_OPTIONS: { value: Pronoun; label: string }[] = [
  { value: "he", label: "he" },
  { value: "she", label: "she" },
  { value: "they", label: "they" },
];

const STYLE_OPTIONS: { value: IllustrationStyle; label: string; modifier: string }[] =
  [
    { value: "watercolor", label: "Soft watercolor", modifier: "watercolor" },
    { value: "storybook", label: "Gentle storybook", modifier: "storybook" },
    { value: "pencil", label: "Pencil sketch", modifier: "pencil" },
  ];

const wordmark = (
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
);

export function OrderForm({ productId, storyType, title }: OrderFormProps) {
  const { draft, hydrated, updateDraft, replaceDraft } = useWizard();
  const [email, setEmail] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Seed a fresh draft of THIS product on first entry, exactly once, when the
  // hydrated draft doesn't match the product being ordered (no draft, or a stale
  // cross-product draft from a prior session). This mirrors StoryStartButton
  // seeding the wizard before /create, but for the already-mounted provider:
  // replaceDraft swaps both localStorage and the in-memory draft so the form
  // immediately renders the right product's fields.
  const seeded = useRef(false);
  useEffect(() => {
    if (!hydrated || seeded.current) {
      return;
    }
    seeded.current = true;
    const currentType = draft?.storyType ?? "story-1";
    if (!draft || currentType !== storyType) {
      replaceDraft(newDraft(storyType));
    }
  }, [hydrated, draft, storyType, replaceDraft]);

  const isStory2 = storyType === "story-2";
  const isStory4 = storyType === "story-4";
  const isStory5 = storyType === "story-5";
  // All three letters (Story 2 / Story 4 / Story 5) drop pronoun/illustration-style
  // and are photo-led keepsakes.
  const isLetter = isStory2 || isStory4 || isStory5;

  // Narrow the draft per product for typed group access. A Story-4/5 draft narrows
  // to neither story1 nor story2.
  const story2 = draft && isStory2Draft(draft) ? draft : null;
  const story1 = draft && isStory1Draft(draft) ? draft : null;
  const story4 = draft && isStory4Draft(draft) ? draft : null;
  const story5 = draft && isStory5Draft(draft) ? draft : null;

  const petName = draft?.pet.name ?? "";
  const species = draft?.pet.species ?? "dog";
  const breedColor = draft?.pet.breedColor ?? "";
  const pronoun = draft?.pet.pronoun ?? "he";
  const illustrationStyle = draft?.pet.illustrationStyle ?? "watercolor";
  const petLabel = petName.trim() ? petName.trim() : "your pet";

  const missing = useMemo(
    () => (draft ? missingRequiredFieldsForDraft(draft) : []),
    [draft],
  );

  const emailValid = isValidEmail(email);
  const draftMatchesProduct = (draft?.storyType ?? "story-1") === storyType;

  async function handleSubmit() {
    if (!draft) {
      return;
    }
    setErrorMessage(null);
    // Gate client-side on the same required set the server re-checks.
    if (missing.length > 0 || !emailValid || !photoFile || !draftMatchesProduct) {
      setShowGate(true);
      return;
    }
    setSubmitting(true);
    try {
      // Step 1: create the pending_payment order (PR-05 flow, unchanged).
      const session = draftToSessionForDraft(draft);
      const form = new FormData();
      form.append("productId", productId);
      form.append("email", email.trim());
      form.append("inputs", JSON.stringify(session));
      form.append("photo", photoFile);
      const res = await fetch("/api/order", { method: "POST", body: form });
      const data = (await res.json()) as {
        ok: boolean;
        orderId?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.orderId) {
        setErrorMessage(
          "We couldn't save your order just yet. Please try again in a moment.",
        );
        setSubmitting(false);
        return;
      }

      // Step 2: create the Lemon Squeezy hosted checkout for this order and redirect
      // the browser to it. The order id is carried into the checkout's custom data,
      // so the verified paid webhook can tie the payment back to this order. The
      // order stays pending_payment until that webhook fires — the redirect is not
      // proof of payment.
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderId, productId }),
      });
      const checkout = (await checkoutRes.json()) as {
        ok: boolean;
        url?: string;
        error?: string;
      };
      if (!checkoutRes.ok || !checkout.ok || !checkout.url) {
        // The order is saved (pending_payment) but checkout couldn't be created.
        // Tell the customer their details are kept and we'll email a payment link —
        // matching the saved-order copy. (Checkout may simply be unconfigured yet.)
        setSubmitted(true);
        return;
      }

      // Leave the browser for the hosted checkout. (No further state changes here.)
      window.location.href = checkout.url;
    } catch {
      setErrorMessage(
        "We couldn't save your order just yet. Please try again in a moment.",
      );
      setSubmitting(false);
    }
  }

  // Don't render product-specific fields until the draft has hydrated to the right
  // shape — avoids a flash of the wrong product's fields on a cross-product entry.
  const ready = hydrated && draftMatchesProduct;

  if (submitted) {
    return (
      <div className="page-wrap">
        <Header title={title} />
        <main className="wizard">
          <div
            className="wizard__intro fade-in"
            style={{ textAlign: "center", maxWidth: "34em" }}
          >
            <span className="label label--gold">Order received</span>
            <h1 className="display-md mt-4">
              Thank you — we have <em>{petLabel}</em>.
            </h1>
            <p className="lede mt-4">
              Your order is saved. The next step is payment, and we&apos;re
              finishing that part now. We&apos;ll email{" "}
              <strong>{email.trim()}</strong> with a secure checkout link, then
              paint your book by hand and send you the finished PDF.
            </p>
            <div className="mt-12">
              <Link href="/books" className="btn btn--primary">
                See all keepsakes
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <Header title={title} />

      <main className="wizard">
        <div className="wizard__intro fade-in">
          <p className="wizard__quote">
            {isStory4
              ? "Tell us about the one curled up beside you."
              : isStory2
                ? "Tell us about the one you're writing for."
                : "Tell us about the one who is gone."}
          </p>
          <p className="wizard__attribution">
            A few gentle questions and a photo. We&apos;ll do the rest by hand.
          </p>
        </div>

        <div className="form-layout">
          <div className="form-layout__heading fade-in fade-in-1">
            <span className="label label--gold">Your order</span>
            <h2>
              {title}
              <em> · {isLetter ? "a letter" : "a storybook"}</em>
            </h2>
            <p>
              The more specific you are, the more the book sounds like the pet
              you actually loved. You can take your time — nothing is charged
              yet.
            </p>
          </div>

          <div className="form-layout__fields fade-in fade-in-2">
            {!ready ? (
              <p className="lede">Loading your order…</p>
            ) : (
              <>
                {/* ---- Photo ---- */}
                <div className="field">
                  <label className="field__label">
                    <span className="field__num">01</span>
                    A photograph of {petLabel}.
                  </label>
                  <p className="field__hint">
                    We&apos;ll paint your pet from this photo. A clear photo of
                    the face works best, but any beloved photo will do.
                  </p>
                  <ImageUploader onUpload={(file) => setPhotoFile(file)} />
                  {showGate && !photoFile ? (
                    <p className="notice notice--required">
                      A photo is needed before we can illustrate the book. Please
                      add one.
                    </p>
                  ) : null}
                </div>

                {/* ---- Pet name + species + description ---- */}
                <div className="field">
                  <label className="field__label" htmlFor="pet-name">
                    <span className="field__num">02</span>
                    What was their name?
                  </label>
                  <p className="field__hint">
                    The name you used when calling them home.
                  </p>
                  <input
                    type="text"
                    id="pet-name"
                    value={petName}
                    onChange={(e) =>
                      updateDraft({ pet: { name: e.target.value } })
                    }
                    placeholder="Otis"
                  />
                  {showGate && !petName.trim() ? (
                    <p className="notice notice--required">
                      A name lets the story speak to them directly. Please add
                      one.
                    </p>
                  ) : null}
                </div>

                <div className="field">
                  <label className="field__label">
                    <span className="field__num">03</span>
                    What kind of pet was {petLabel}?
                  </label>
                  <div className="radio-group">
                    {SPECIES_OPTIONS.map((opt) => (
                      <label className="radio-option" key={opt.value}>
                        <input
                          type="radio"
                          name="species"
                          value={opt.value}
                          checked={species === opt.value}
                          onChange={() =>
                            updateDraft({ pet: { species: opt.value } })
                          }
                        />
                        <span className="radio-option__label">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="pet-description">
                    <span className="field__num">04</span>
                    A few words to describe {petLabel}.
                    {isLetter ? (
                      <span className="field__optional"> (optional)</span>
                    ) : null}
                  </label>
                  <p className="field__hint">
                    The kind of detail you&apos;d mention to a stranger.{" "}
                    <em>
                      A scruffy rescue mutt with one floppy ear. A black tabby
                      with a white chest patch.
                    </em>
                    {isLetter ? " It helps us paint the cover." : ""}
                  </p>
                  <input
                    type="text"
                    id="pet-description"
                    value={breedColor}
                    onChange={(e) =>
                      updateDraft({ pet: { breedColor: e.target.value } })
                    }
                    placeholder="a sweet rescue mutt with floppy ears and soft brown eyes"
                  />
                  {!isLetter && showGate && !breedColor.trim() ? (
                    <p className="notice notice--required">
                      A few words here let us draw {petLabel} as they truly were.
                      Please add a little.
                    </p>
                  ) : null}
                </div>

                {/* ---- Story-1-only: pronoun + style ---- */}
                {!isLetter ? (
                  <>
                    <div className="field">
                      <label className="field__label">
                        <span className="field__num">05</span>
                        Did you call {petLabel} <em>he</em>, <em>she</em>, or{" "}
                        <em>they</em>?
                      </label>
                      <div className="radio-group">
                        {PRONOUN_OPTIONS.map((opt) => (
                          <label className="radio-option" key={opt.value}>
                            <input
                              type="radio"
                              name="pronoun"
                              value={opt.value}
                              checked={pronoun === opt.value}
                              onChange={() =>
                                updateDraft({ pet: { pronoun: opt.value } })
                              }
                            />
                            <span className="radio-option__label">
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <label className="field__label">
                        <span className="field__num">06</span>
                        How should the illustrations feel?
                      </label>
                      <p className="field__hint">
                        Most families choose watercolor.
                      </p>
                      <div className="style-grid">
                        {STYLE_OPTIONS.map((opt) => (
                          <button
                            type="button"
                            key={opt.value}
                            className={`style-card style-card--${opt.modifier}${
                              illustrationStyle === opt.value
                                ? " style-card--selected"
                                : ""
                            }`}
                            onClick={() =>
                              updateDraft({
                                pet: { illustrationStyle: opt.value },
                              })
                            }
                            aria-pressed={illustrationStyle === opt.value}
                          >
                            <div className="style-card__swatch" />
                            <div className="style-card__name">{opt.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {/* ---- Product-specific story fields ---- */}
                {story1 ? (
                  <Story1Fields
                    show={showGate}
                    petLabel={petLabel}
                    childName={story1.child.name ?? ""}
                    ageBracket={story1.child.ageBracket ?? "6-8"}
                    favoriteActivity={story1.memories.favoriteActivity ?? ""}
                    sleepingSpot={story1.memories.sleepingSpot ?? ""}
                    favoriteMemory={story1.memories.favoriteMemory ?? ""}
                    parentDedication={story1.memories.parentDedication ?? ""}
                    update={updateDraft}
                  />
                ) : null}

                {story2 ? (
                  <Story2Fields
                    show={showGate}
                    petLabel={petLabel}
                    ownerNames={story2.owner.names ?? ""}
                    relationship={story2.owner.relationship ?? "single"}
                    quirks={story2.memories.quirks ?? ""}
                    favoriteRitual={story2.memories.favoriteRitual ?? ""}
                    favoriteSpots={story2.memories.favoriteSpots ?? ""}
                    nicknames={story2.memories.nicknames ?? ""}
                    deathType={story2.toggles.deathType ?? "peaceful"}
                    beliefFrame={story2.toggles.beliefFrame ?? "rainbow-bridge"}
                    giftFor={story2.toggles.giftFor ?? "self"}
                    newPet={story2.toggles.newPet ?? "no"}
                    update={updateDraft}
                  />
                ) : null}

                {story4 ? (
                  <Story4Fields
                    show={showGate}
                    petLabel={petLabel}
                    ownerNames={story4.owner.names ?? ""}
                    relationship={story4.owner.relationship ?? "single"}
                    quirks={story4.memories.quirks ?? ""}
                    favoriteRitual={story4.memories.favoriteRitual ?? ""}
                    favoriteSpots={story4.memories.favoriteSpots ?? ""}
                    favoriteActivity={story4.memories.favoriteActivity ?? ""}
                    nicknames={story4.memories.nicknames ?? ""}
                    dateAdopted={story4.memories.dateAdopted ?? ""}
                    datePassed={story4.memories.datePassed ?? ""}
                    livingOrMemorial={
                      story4.toggles.livingOrMemorial ?? "living"
                    }
                    deathType={story4.toggles.deathType ?? "peaceful"}
                    beliefFrame={story4.toggles.beliefFrame ?? "rainbow-bridge"}
                    giftFor={story4.toggles.giftFor ?? "self"}
                    update={updateDraft}
                  />
                ) : null}

                {story5 ? (
                  <Story5Fields
                    show={showGate}
                    petLabel={petLabel}
                    ownerNames={story5.owner.names ?? ""}
                    relationship={story5.owner.relationship ?? "single"}
                    quirks={story5.memories.quirks ?? ""}
                    favoriteRitual={story5.memories.favoriteRitual ?? ""}
                    favoriteSpots={story5.memories.favoriteSpots ?? ""}
                    lastGoodDay={story5.memories.lastGoodDay ?? ""}
                    whatIKeep={story5.memories.whatIKeep ?? ""}
                    nicknames={story5.memories.nicknames ?? ""}
                    deathType={story5.toggles.deathType ?? "peaceful"}
                    beliefFrame={story5.toggles.beliefFrame ?? "rainbow-bridge"}
                    update={updateDraft}
                  />
                ) : null}

                {/* ---- Email ---- */}
                <div className="field">
                  <label className="field__label" htmlFor="email">
                    <span className="field__num">07</span>
                    Where should we send the finished book?
                  </label>
                  <p className="field__hint">
                    We&apos;ll email your secure checkout link here, then the
                    finished PDF.
                  </p>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  {showGate && !emailValid ? (
                    <p className="notice notice--required">
                      A working email lets us send your book. Please check it.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="wizard-footer">
          <Link href={`/books/${productId}`} className="btn-link">
            &larr; Back to {title}
          </Link>
          <div className="save-status">
            <span className="save-status__dot" />
            Saved to this device
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={!ready || submitting}
          >
            {submitting ? "Saving your order…" : "Continue to payment"}
          </button>
        </div>

        {errorMessage ? (
          <p
            className="notice"
            style={{ maxWidth: "32em", margin: "1.5rem auto 0" }}
          >
            {errorMessage}
          </p>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark">
        {wordmark}
        Quietly Kept
      </Link>
      <div className="label">Ordering · {title}</div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <Link href="/policies" className="label">
        How it&apos;s made · Policies
      </Link>
      <p className="label">Made slowly · Made by hand</p>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Story 1 — child + memories fields
// ---------------------------------------------------------------------------

interface Story1FieldsProps {
  show: boolean;
  petLabel: string;
  childName: string;
  ageBracket: "3-5" | "6-8" | "9-12";
  favoriteActivity: string;
  sleepingSpot: string;
  favoriteMemory: string;
  parentDedication: string;
  update: ReturnType<typeof useWizard>["updateDraft"];
}

const AGE_OPTIONS: { value: "3-5" | "6-8" | "9-12"; label: string }[] = [
  { value: "3-5", label: "3 – 5 years" },
  { value: "6-8", label: "6 – 8 years" },
  { value: "9-12", label: "9 – 12 years" },
];

function Story1Fields({
  show,
  petLabel,
  childName,
  ageBracket,
  favoriteActivity,
  sleepingSpot,
  favoriteMemory,
  parentDedication,
  update,
}: Story1FieldsProps) {
  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="child-name">
          <span className="field__num">A</span>
          Who is this story for?
        </label>
        <p className="field__hint">
          The book is written to your child, by name, on nearly every page.
        </p>
        <input
          type="text"
          id="child-name"
          value={childName}
          onChange={(e) => update({ child: { name: e.target.value } })}
          placeholder="Emma"
        />
        {show && !childName.trim() ? (
          <p className="notice notice--required">
            The story is written to your child by name. Please add it.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">B</span>
          How old are they?
        </label>
        <p className="field__hint">
          This sets the tone — simpler for the youngest, more honest for older
          children.
        </p>
        <div className="radio-group">
          {AGE_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="ageBracket"
                value={opt.value}
                checked={ageBracket === opt.value}
                onChange={() => update({ child: { ageBracket: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-activity">
          <span className="field__num">C</span>
          {petLabel}&apos;s favorite thing to do?
        </label>
        <p className="field__hint">
          A small everyday joy. <em>Chasing tennis balls in the backyard.</em>
        </p>
        <input
          type="text"
          id="favorite-activity"
          value={favoriteActivity}
          onChange={(e) =>
            update({ memories: { favoriteActivity: e.target.value } })
          }
          placeholder="chasing tennis balls in the backyard"
        />
        {show && !favoriteActivity.trim() ? (
          <p className="notice notice--required">
            One small joy helps the story remember {petLabel}. Please add one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="sleeping-spot">
          <span className="field__num">D</span>
          Where did {petLabel} love to sleep?
        </label>
        <p className="field__hint">
          The warm, safe place they always returned to.{" "}
          <em>At the foot of your bed.</em>
        </p>
        <input
          type="text"
          id="sleeping-spot"
          value={sleepingSpot}
          onChange={(e) =>
            update({ memories: { sleepingSpot: e.target.value } })
          }
          placeholder="at the foot of your bed"
        />
        {show && !sleepingSpot.trim() ? (
          <p className="notice notice--required">
            A warm, safe place gives the story somewhere to rest. Please add one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-memory">
          <span className="field__num">E</span>
          A favorite memory to keep.
        </label>
        <p className="field__hint">
          One or two sentences — the day you&apos;ll always remember together.
        </p>
        <textarea
          id="favorite-memory"
          value={favoriteMemory}
          onChange={(e) =>
            update({ memories: { favoriteMemory: e.target.value } })
          }
          placeholder="The day Otis followed Emma to the lake, and they both came home soaking wet, laughing the whole way."
        />
        {show && !favoriteMemory.trim() ? (
          <p className="notice notice--required">
            Even one small moment gives the book its heart. Please share a
            memory.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="parent-dedication">
          <span className="field__num">F</span>
          A dedication, if you&apos;d like one.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Printed on the dedication page, in your own words.
        </p>
        <textarea
          id="parent-dedication"
          value={parentDedication}
          onChange={(e) =>
            update({ memories: { parentDedication: e.target.value } })
          }
          placeholder="For Emma — may you always remember how much you were loved."
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Story 2 — owner + letter fields
// ---------------------------------------------------------------------------

interface Story2FieldsProps {
  show: boolean;
  petLabel: string;
  ownerNames: string;
  relationship: "single" | "couple";
  quirks: string;
  favoriteRitual: string;
  favoriteSpots: string;
  nicknames: string;
  deathType: "peaceful" | "illness" | "sudden" | "euthanasia";
  beliefFrame: "rainbow-bridge" | "heaven" | "secular";
  giftFor: "self" | "friend";
  newPet: "yes" | "no";
  update: ReturnType<typeof useWizard>["updateDraft"];
}

const RELATIONSHIP_OPTIONS: { value: "single" | "couple"; label: string }[] = [
  { value: "single", label: "just me" },
  { value: "couple", label: "the two of us" },
];

const LETTER_DEATH_OPTIONS: {
  value: "peaceful" | "illness" | "sudden" | "euthanasia";
  label: string;
}[] = [
  { value: "peaceful", label: "peacefully, of old age" },
  { value: "illness", label: "after an illness" },
  { value: "sudden", label: "suddenly" },
  { value: "euthanasia", label: "with a doctor's help" },
];

const LETTER_BELIEF_OPTIONS: {
  value: "rainbow-bridge" | "heaven" | "secular";
  label: string;
}[] = [
  { value: "rainbow-bridge", label: "the Rainbow Bridge" },
  { value: "heaven", label: "a peaceful place / heaven" },
  { value: "secular", label: "kept in memory and presence" },
];

const GIFT_OPTIONS: { value: "self" | "friend"; label: string }[] = [
  { value: "self", label: "for myself" },
  { value: "friend", label: "as a gift for someone" },
];

const NEW_PET_OPTIONS: { value: "yes" | "no"; label: string }[] = [
  { value: "no", label: "no" },
  { value: "yes", label: "yes" },
];

function Story2Fields({
  show,
  petLabel,
  ownerNames,
  relationship,
  quirks,
  favoriteRitual,
  favoriteSpots,
  nicknames,
  deathType,
  beliefFrame,
  giftFor,
  newPet,
  update,
}: Story2FieldsProps) {
  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="owner-names">
          <span className="field__num">A</span>
          Who should the letter be written to?
        </label>
        <p className="field__hint">
          The name {petLabel} knew you by — your own name, both your names, or
          even &ldquo;Mom.&rdquo; <em>Sarah. Sarah and David.</em>
        </p>
        <input
          type="text"
          id="owner-names"
          value={ownerNames}
          onChange={(e) => update({ owner: { names: e.target.value } })}
          placeholder="Sarah"
        />
        {show && !ownerNames.trim() ? (
          <p className="notice notice--required">
            The letter is addressed to you by name. Please add it.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">B</span>
          Was {petLabel} loved by one of you, or two?
        </label>
        <p className="field__hint">
          This shapes whether the letter speaks to &ldquo;you&rdquo; or
          &ldquo;you both.&rdquo;
        </p>
        <div className="radio-group">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="relationship"
                value={opt.value}
                checked={relationship === opt.value}
                onChange={() => update({ owner: { relationship: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="quirks">
          <span className="field__num">C</span>
          A quirk or two that were only theirs.
        </label>
        <p className="field__hint">
          The small habits you&apos;d know anywhere.{" "}
          <em>The way you tilted your head when I said your name.</em>
        </p>
        <textarea
          id="quirks"
          value={quirks}
          onChange={(e) => update({ memories: { quirks: e.target.value } })}
          placeholder="the way you tilted your head when I said your name"
        />
        {show && !quirks.trim() ? (
          <p className="notice notice--required">
            One small quirk lets the letter sound like {petLabel}. Please add
            one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-ritual">
          <span className="field__num">D</span>
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
            update({ memories: { favoriteRitual: e.target.value } })
          }
          placeholder="our walk before coffee, every morning"
        />
        {show && !favoriteRitual.trim() ? (
          <p className="notice notice--required">
            A shared ritual gives the letter its heart. Please add one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-spots">
          <span className="field__num">E</span>
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
            update({ memories: { favoriteSpots: e.target.value } })
          }
          placeholder="the spot by the back door where the sun hit at 4pm"
        />
        {show && !favoriteSpots.trim() ? (
          <p className="notice notice--required">
            A place that was theirs gives the letter somewhere to rest. Please
            add one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="nicknames">
          <span className="field__num">F</span>
          Any nicknames? <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Printed under the signature, if you&apos;d like.{" "}
          <em>Murph, Mr. Murph.</em>
        </p>
        <input
          type="text"
          id="nicknames"
          value={nicknames}
          onChange={(e) => update({ memories: { nicknames: e.target.value } })}
          placeholder="Murph, Mr. Murph"
        />
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">G</span>
          How did {petLabel} die?
        </label>
        <p className="field__hint">
          This gently adjusts how the letter speaks about the goodbye.
        </p>
        <div className="radio-group">
          {LETTER_DEATH_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="deathType"
                value={opt.value}
                checked={deathType === opt.value}
                onChange={() => update({ toggles: { deathType: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">H</span>
          Where would you like the letter to say {petLabel} is now?
        </label>
        <p className="field__hint">
          Choose the comfort frame that fits your beliefs.
        </p>
        <div className="radio-group">
          {LETTER_BELIEF_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="beliefFrame"
                value={opt.value}
                checked={beliefFrame === opt.value}
                onChange={() => update({ toggles: { beliefFrame: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">I</span>
          Is this letter for you, or a gift?
        </label>
        <div className="radio-group">
          {GIFT_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="giftFor"
                value={opt.value}
                checked={giftFor === opt.value}
                onChange={() => update({ toggles: { giftFor: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">J</span>
          Has another pet come home, or might one soon?
        </label>
        <div className="radio-group">
          {NEW_PET_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="newPet"
                value={opt.value}
                checked={newPet === opt.value}
                onChange={() => update({ toggles: { newPet: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Story 4 — "If [PET_NAME] Could Talk" owner + letter fields (the celebration twin)
// ---------------------------------------------------------------------------

interface Story4FieldsProps {
  show: boolean;
  petLabel: string;
  ownerNames: string;
  relationship: "single" | "couple";
  quirks: string;
  favoriteRitual: string;
  favoriteSpots: string;
  favoriteActivity: string;
  nicknames: string;
  dateAdopted: string;
  datePassed: string;
  livingOrMemorial: "living" | "memorial";
  deathType: "peaceful" | "illness" | "sudden" | "euthanasia";
  beliefFrame: "rainbow-bridge" | "heaven" | "secular";
  giftFor: "self" | "friend";
  update: ReturnType<typeof useWizard>["updateDraft"];
}

const LIVING_OR_MEMORIAL_OPTIONS: {
  value: "living" | "memorial";
  label: string;
}[] = [
  { value: "living", label: "a celebration — they are here, now" },
  { value: "memorial", label: "a keepsake — they have died" },
];

function Story4Fields({
  show,
  petLabel,
  ownerNames,
  relationship,
  quirks,
  favoriteRitual,
  favoriteSpots,
  favoriteActivity,
  nicknames,
  dateAdopted,
  datePassed,
  livingOrMemorial,
  deathType,
  beliefFrame,
  giftFor,
  update,
}: Story4FieldsProps) {
  // The headline conditional reveal: death-type / belief-frame / the second date
  // appear ONLY when the buyer chooses the memorial (past-tense) path. In the
  // default living path they stay hidden and are defaulted by the assembler.
  const isMemorial = livingOrMemorial === "memorial";

  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="owner-names">
          <span className="field__num">A</span>
          Who should the letter be written to?
        </label>
        <p className="field__hint">
          The name {petLabel} knows you by — your own name, both your names, or
          even &ldquo;Mom.&rdquo; <em>Sarah. Sarah and David.</em>
        </p>
        <input
          type="text"
          id="owner-names"
          value={ownerNames}
          onChange={(e) => update({ owner: { names: e.target.value } })}
          placeholder="Sarah"
        />
        {show && !ownerNames.trim() ? (
          <p className="notice notice--required">
            The letter is addressed to you by name. Please add it.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">B</span>
          Is {petLabel} loved by one of you, or two?
        </label>
        <p className="field__hint">
          This shapes whether the letter speaks to &ldquo;you&rdquo; or
          &ldquo;you both.&rdquo;
        </p>
        <div className="radio-group">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="relationship"
                value={opt.value}
                checked={relationship === opt.value}
                onChange={() => update({ owner: { relationship: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="quirks">
          <span className="field__num">C</span>
          A quirk or two that are only theirs.
        </label>
        <p className="field__hint">
          The small habits you&apos;d know anywhere.{" "}
          <em>The way you tilt your head when I say your name.</em>
        </p>
        <textarea
          id="quirks"
          value={quirks}
          onChange={(e) => update({ memories: { quirks: e.target.value } })}
          placeholder="the way you tilt your head when I say your name"
        />
        {show && !quirks.trim() ? (
          <p className="notice notice--required">
            One small quirk lets the letter sound like {petLabel}. Please add
            one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-ritual">
          <span className="field__num">D</span>
          A ritual that&apos;s the best part of the day.
        </label>
        <p className="field__hint">
          The thing you do together, again and again.{" "}
          <em>Our walk before coffee, every morning.</em>
        </p>
        <input
          type="text"
          id="favorite-ritual"
          value={favoriteRitual}
          onChange={(e) =>
            update({ memories: { favoriteRitual: e.target.value } })
          }
          placeholder="our walk before coffee, every morning"
        />
        {show && !favoriteRitual.trim() ? (
          <p className="notice notice--required">
            A shared ritual gives the letter its heart. Please add one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-spots">
          <span className="field__num">E</span>
          The spots that are theirs.
        </label>
        <p className="field__hint">
          One to three places they love.{" "}
          <em>The spot by the back door where the sun lands at 4pm.</em>
        </p>
        <input
          type="text"
          id="favorite-spots"
          value={favoriteSpots}
          onChange={(e) =>
            update({ memories: { favoriteSpots: e.target.value } })
          }
          placeholder="the spot by the back door where the sun lands at 4pm"
        />
        {show && !favoriteSpots.trim() ? (
          <p className="notice notice--required">
            A place that is theirs gives the letter somewhere to rest. Please
            add one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-activity">
          <span className="field__num">F</span>
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
            update({ memories: { favoriteActivity: e.target.value } })
          }
          placeholder="stealing one sock and running a victory lap"
        />
        {show && !favoriteActivity.trim() ? (
          <p className="notice notice--required">
            One ordinary joy gives the letter its happiest page. Please add one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="nicknames">
          <span className="field__num">G</span>
          Any nicknames? <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Printed under the signature, if you&apos;d like.{" "}
          <em>Biscy, the gremlin, sir.</em>
        </p>
        <input
          type="text"
          id="nicknames"
          value={nicknames}
          onChange={(e) => update({ memories: { nicknames: e.target.value } })}
          placeholder="Biscy, the gremlin"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="date-adopted">
          <span className="field__num">H</span>
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
            update({ memories: { dateAdopted: e.target.value } })
          }
          placeholder="March 2023"
          aria-label="The year they came home"
        />
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">I</span>
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
                  update({ toggles: { livingOrMemorial: opt.value } })
                }
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Memorial-only reveal: how they died, the comfort frame, the second
          date. Hidden entirely in the default living path. */}
      {isMemorial ? (
        <>
          <div className="field">
            <label className="field__label">
              <span className="field__num">J</span>
              How did {petLabel} die?
            </label>
            <p className="field__hint">
              This gently adjusts how the letter speaks about the goodbye.
            </p>
            <div className="radio-group">
              {LETTER_DEATH_OPTIONS.map((opt) => (
                <label className="radio-option" key={opt.value}>
                  <input
                    type="radio"
                    name="deathType"
                    value={opt.value}
                    checked={deathType === opt.value}
                    onChange={() =>
                      update({ toggles: { deathType: opt.value } })
                    }
                  />
                  <span className="radio-option__label">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label">
              <span className="field__num">K</span>
              Where would you like the letter to say {petLabel} is now?
            </label>
            <p className="field__hint">
              Choose the comfort frame that fits your beliefs.
            </p>
            <div className="radio-group">
              {LETTER_BELIEF_OPTIONS.map((opt) => (
                <label className="radio-option" key={opt.value}>
                  <input
                    type="radio"
                    name="beliefFrame"
                    value={opt.value}
                    checked={beliefFrame === opt.value}
                    onChange={() =>
                      update({ toggles: { beliefFrame: opt.value } })
                    }
                  />
                  <span className="radio-option__label">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="date-passed">
              <span className="field__num">L</span>
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
                update({ memories: { datePassed: e.target.value } })
              }
              placeholder="October 2025"
              aria-label="The year they died"
            />
          </div>
        </>
      ) : null}

      <div className="field">
        <label className="field__label">
          <span className="field__num">{isMemorial ? "M" : "J"}</span>
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
                onChange={() => update({ toggles: { giftFor: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Story 5 — "A Letter to [PET_NAME]" owner + letter fields (the owner→pet letter)
// ---------------------------------------------------------------------------

interface Story5FieldsProps {
  show: boolean;
  petLabel: string;
  ownerNames: string;
  relationship: "single" | "couple";
  quirks: string;
  favoriteRitual: string;
  favoriteSpots: string;
  lastGoodDay: string;
  whatIKeep: string;
  nicknames: string;
  deathType: "peaceful" | "illness" | "sudden" | "euthanasia";
  beliefFrame: "rainbow-bridge" | "heaven" | "secular";
  update: ReturnType<typeof useWizard>["updateDraft"];
}

function Story5Fields({
  show,
  petLabel,
  ownerNames,
  relationship,
  quirks,
  favoriteRitual,
  favoriteSpots,
  lastGoodDay,
  whatIKeep,
  nicknames,
  deathType,
  beliefFrame,
  update,
}: Story5FieldsProps) {
  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="owner-names">
          <span className="field__num">A</span>
          Who should the letter be signed by?
        </label>
        <p className="field__hint">
          The name {petLabel} knew you by — your own name, both your names, or
          even &ldquo;Mom.&rdquo; <em>Sarah. Sarah and David.</em>
        </p>
        <input
          type="text"
          id="owner-names"
          value={ownerNames}
          onChange={(e) => update({ owner: { names: e.target.value } })}
          placeholder="Sarah"
        />
        {show && !ownerNames.trim() ? (
          <p className="notice notice--required">
            The letter is signed by you. Please add your name.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">B</span>
          Was {petLabel} loved by one of you, or two?
        </label>
        <p className="field__hint">
          This shapes whether the letter speaks as &ldquo;I&rdquo; or
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
                onChange={() => update({ owner: { relationship: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="quirks">
          <span className="field__num">C</span>
          A quirk or two that were only theirs.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          The small habits you&apos;d know anywhere.{" "}
          <em>The way you tilted your head when I said your name.</em> If you
          leave it blank, we&apos;ll write a gentle line for you.
        </p>
        <textarea
          id="quirks"
          value={quirks}
          onChange={(e) => update({ memories: { quirks: e.target.value } })}
          placeholder="the way you tilted your head when I said your name"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-ritual">
          <span className="field__num">D</span>
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
            update({ memories: { favoriteRitual: e.target.value } })
          }
          placeholder="our walk before coffee, every morning"
        />
        {show && !favoriteRitual.trim() ? (
          <p className="notice notice--required">
            A shared ritual gives the letter its heart. Please add one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="favorite-spots">
          <span className="field__num">E</span>
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
            update({ memories: { favoriteSpots: e.target.value } })
          }
          placeholder="the spot by the back door where the sun hit at 4pm"
        />
        {show && !favoriteSpots.trim() ? (
          <p className="notice notice--required">
            A place that was theirs gives the letter somewhere to rest. Please
            add one.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="last-good-day">
          <span className="field__num">F</span>
          The last good day, if you have one.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          An ordinary, good memory you&apos;d give anything to have again.{" "}
          <em>
            The last good Saturday, when you stole half my toast and slept in the
            sun.
          </em>{" "}
          If you leave it blank, we&apos;ll write a gentle line for you.
        </p>
        <textarea
          id="last-good-day"
          value={lastGoodDay}
          onChange={(e) =>
            update({ memories: { lastGoodDay: e.target.value } })
          }
          placeholder="the last good Saturday, when you stole half my toast and slept in the sun"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="what-i-keep">
          <span className="field__num">G</span>
          What you&apos;re keeping.{" "}
          <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          The small things you&apos;re holding on to — one to three.{" "}
          <em>Your collar on the hook, the dent you left in the couch.</em> If
          you leave it blank, we&apos;ll lean on the ritual and the spots.
        </p>
        <input
          type="text"
          id="what-i-keep"
          value={whatIKeep}
          onChange={(e) => update({ memories: { whatIKeep: e.target.value } })}
          placeholder="your collar on the hook, the dent you left in the couch"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="nicknames">
          <span className="field__num">H</span>
          Any nicknames? <span className="field__optional">(optional)</span>
        </label>
        <p className="field__hint">
          Printed under the signature, if you&apos;d like.{" "}
          <em>Murph, Mr. Murph.</em>
        </p>
        <input
          type="text"
          id="nicknames"
          value={nicknames}
          onChange={(e) => update({ memories: { nicknames: e.target.value } })}
          placeholder="Murph, Mr. Murph"
        />
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">I</span>
          How did {petLabel} die?
        </label>
        <p className="field__hint">
          This gently adjusts how the letter speaks about the goodbye.
        </p>
        <div className="radio-group">
          {LETTER_DEATH_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="deathType"
                value={opt.value}
                checked={deathType === opt.value}
                onChange={() => update({ toggles: { deathType: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label">
          <span className="field__num">J</span>
          Where would you like the letter to say {petLabel} is now?
        </label>
        <p className="field__hint">
          Choose the comfort frame that fits your beliefs.
        </p>
        <div className="radio-group">
          {LETTER_BELIEF_OPTIONS.map((opt) => (
            <label className="radio-option" key={opt.value}>
              <input
                type="radio"
                name="beliefFrame"
                value={opt.value}
                checked={beliefFrame === opt.value}
                onChange={() => update({ toggles: { beliefFrame: opt.value } })}
              />
              <span className="radio-option__label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
