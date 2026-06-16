"use client";

// The book-detail sample gallery (book-detail PR-2). Replaces the page's old flat
// sample grid with a SINGLE-image viewer that opens into a one-at-a-time carousel
// lightbox. Pure presentation — the only client island on an otherwise-static (●
// SSG) detail page, so it imports nothing engine-side / server-only (the public
// boundary test walks the page's import closure through here).
//
// On the page: one large featured illustration (index 0 = cover by default), with
// on-image prev/next arrows, an image counter, a floating page tag, and a "View
// all N illustrations" trigger. Clicking the stage or the trigger opens the
// lightbox overlay (selected image large, arrows + counter + a quick-jump thumb
// strip, ←/→/Esc keyboard nav, backdrop-click + close button, focus trap/restore,
// body scroll lock). Degrades across 13/10/8/2-image counts; a single image hides
// the arrows; an empty set renders the soft paw placeholder (no lightbox).

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { captionForImage, wrapIndex } from "./galleryCaption";
import styles from "./BookGallery.module.css";

interface BookGalleryProps {
  /** The existing /samples/<productId>/... public image paths. */
  sampleImages: string[];
  /** Resolved display title — alt text + the lightbox "Inside '{title}'" heading. */
  title: string;
  /** Carries the accent: gold celebrates a living pet, rose remembers one. */
  audience: "living" | "loss";
}

/** Chevron used by both the on-page and lightbox nav buttons. */
function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// The Dearbound paw — same path the catalog placeholder / page used. Drawn into
// the stage when a book has no sample art yet, so the gallery degrades to
// intentional placeholder art rather than a broken image.
function PawMark() {
  return (
    <svg className={styles.placeholderPaw} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M6 8 Q4 5 6 4 Q8 5 7 8 Z M13 8 Q15 5 13 4 Q11 5 12 8 Z M3 12 Q1 10 3 9 Q5 10 4 12 Z M16 12 Q18 10 16 9 Q14 10 15 12 Z M10 17 Q5 17 5 12 Q5 9 10 9 Q15 9 15 12 Q15 17 10 17 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BookGallery({
  sampleImages,
  title,
  audience,
}: BookGalleryProps) {
  const total = sampleImages.length;
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  // The lightbox is portaled to document.body so its fixed/z-index escapes the
  // sticky gallery's stacking context (Bug 1). Only portal once mounted so the
  // static (● SSG) prerender never reaches for document.body.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const labelId = useId();
  const lightboxRef = useRef<HTMLDivElement>(null);
  // The element that opened the lightbox — focus is restored to it on close.
  const triggerRef = useRef<HTMLElement | null>(null);

  const living = audience === "living";
  const galleryClass = [
    styles.gallery,
    living ? styles.joyful : "",
    total === 2 ? styles.pair : "",
  ]
    .filter(Boolean)
    .join(" ");

  // One step through the carousel; wrapIndex loops past either end.
  const step = useCallback(
    (delta: number) => setIndex((cur) => wrapIndex(cur + delta, total)),
    [total],
  );

  const openLightbox = useCallback(
    (e: React.MouseEvent) => {
      triggerRef.current = e.currentTarget as HTMLElement;
      setOpen(true);
    },
    [],
  );

  const closeLightbox = useCallback(() => {
    setOpen(false);
    // Restore focus to whatever opened the overlay.
    triggerRef.current?.focus();
  }, []);

  // Keyboard nav + body scroll lock while the lightbox is open.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Tab") {
        // Trap focus within the open overlay.
        const root = lightboxRef.current;
        if (!root) return;
        const focusable = root.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, step, closeLightbox]);

  // Move initial focus into the overlay when it opens.
  useEffect(() => {
    if (open) lightboxRef.current?.focus();
  }, [open]);

  // ── Empty: paw placeholder, no carousel, no lightbox ─────────────────────
  if (total === 0) {
    return (
      <div className={galleryClass}>
        <div className={`${styles.stage} ${styles.placeholder}`}>
          <PawMark />
        </div>
      </div>
    );
  }

  const showArrows = total > 1;
  const current = sampleImages[index];
  const caption = captionForImage(current, index);

  return (
    <div className={galleryClass}>
      <button
        type="button"
        className={styles.stage}
        onClick={openLightbox}
        aria-label={`Enlarge illustration ${index + 1} of ${total} from “${title}”`}
      >
        <span className={styles.tag}>{caption}</span>
        <img
          src={current}
          alt={`${caption} from “${title}”`}
          width={800}
          height={800}
          loading="eager"
        />
        <span className={styles.count}>
          {index + 1} / {total}
        </span>
      </button>

      {showArrows ? (
        <>
          <button
            type="button"
            className={`${styles.nav} ${styles.navPrev}`}
            aria-label="Previous illustration"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
          >
            <Chevron dir="prev" />
          </button>
          <button
            type="button"
            className={`${styles.nav} ${styles.navNext}`}
            aria-label="Next illustration"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
          >
            <Chevron dir="next" />
          </button>
        </>
      ) : null}

      <button type="button" className={styles.viewall} onClick={openLightbox}>
        <svg viewBox="0 0 14 14" aria-hidden>
          <path
            d="M2 5V2h3M12 5V2H9M2 9v3h3M12 9v3H9"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        View all {total} illustration{total === 1 ? "" : "s"}
      </button>

      {open && mounted
        ? createPortal(
            <div
              ref={lightboxRef}
              className={`${styles.lightbox} ${living ? styles.joyful : ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelId}
              tabIndex={-1}
            >
              <div className={styles.lightboxBar}>
                <span id={labelId} className={styles.lightboxTitle}>
                  Inside &ldquo;{title}&rdquo;
                </span>
                <span className={styles.lightboxHint}>
                  ← → to browse · Esc to close
                </span>
                <button
                  type="button"
                  className={styles.lightboxClose}
                  onClick={closeLightbox}
                  aria-label="Close gallery"
                >
                  Close ✕
                </button>
              </div>

              {/* The flex gutter around the image is the real backdrop — close
                  only when the click lands on the stage itself, not on a child
                  (figure / image / arrows), so those keep their own behavior
                  (Bug 2). */}
              <div
                className={styles.lightboxStage}
                onClick={(e) => {
                  if (e.target === e.currentTarget) closeLightbox();
                }}
              >
                {showArrows ? (
                  <button
                    type="button"
                    className={styles.lightboxNav}
                    aria-label="Previous illustration"
                    onClick={() => step(-1)}
                  >
                    <Chevron dir="prev" />
                  </button>
                ) : null}

                <figure className={styles.lightboxFigure}>
                  <img
                    className={styles.lightboxImg}
                    src={current}
                    alt={`${caption} from “${title}”`}
                  />
                  <figcaption className={styles.lightboxCaption}>
                    <span>{caption}</span>
                    <span className={styles.lightboxCounter}>
                      {index + 1} / {total}
                    </span>
                  </figcaption>
                </figure>

                {showArrows ? (
                  <button
                    type="button"
                    className={styles.lightboxNav}
                    aria-label="Next illustration"
                    onClick={() => step(1)}
                  >
                    <Chevron dir="next" />
                  </button>
                ) : null}
              </div>

              {showArrows ? (
                <div className={styles.lightboxStrip}>
                  {sampleImages.map((src, i) => (
                    <button
                      type="button"
                      key={src}
                      className={`${styles.lightboxDot} ${
                        i === index ? styles.lightboxDotActive : ""
                      }`}
                      aria-label={`Jump to illustration ${i + 1}`}
                      aria-current={i === index ? "true" : undefined}
                      onClick={() => setIndex(i)}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
