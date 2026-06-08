"use client";

// Drag-drop + file-picker photo uploader for step 1. On a chosen file it:
//   1. reads the image's natural dimensions in-browser to show a preview and to
//      decide whether to surface a gentle "this might not work well" notice for
//      small photos (short edge under ~512px, or a tiny byte size) — non-blocking,
//      the family can proceed anyway (the plan's low-quality-photo handling);
//   2. POSTs the file to /api/upload with the current draft id as `sessionId`, so
//      the photo lands under ./uploads/[draft.id]/ and ties to the session the
//      Generate step will write under that same id;
//   3. stores the returned server path as `pet.photo` in the draft.
//
// The uploaded-photo card mirrors the prototype's `.photo-preview`, with a
// "replace" affordance that re-opens the file picker.

import { useCallback, useRef, useState } from "react";
import { useWizard } from "@/components/wizard/WizardProvider";

/** Short edge below this (px) earns the gentle low-res notice. */
const MIN_SHORT_EDGE = 512;
/** A file smaller than this (bytes) is likely too low-quality to illustrate well. */
const MIN_BYTES = 40 * 1024;
/** Client-side mirror of the upload route's accepted types. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface UploadResponse {
  ok: boolean;
  sessionId?: string;
  path?: string;
  error?: string;
}

interface PhotoMeta {
  name: string;
  sizeLabel: string;
  dimensionsLabel: string;
  previewUrl: string;
  lowQuality: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(0)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Read an image File's natural width/height via an object URL. */
function readDimensions(
  file: File,
): Promise<{ width: number; height: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, url });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode_failed"));
    };
    img.src = url;
  });
}

export function ImageUploader() {
  const { draft, updateDraft } = useWizard();
  const inputRef = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState<PhotoMeta | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPhoto = Boolean(draft?.pet.photo);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please choose a JPG, PNG, or WebP image.");
        return;
      }

      let dims: { width: number; height: number; url: string };
      try {
        dims = await readDimensions(file);
      } catch {
        setError("That image could not be read. Please try another photo.");
        return;
      }

      const shortEdge = Math.min(dims.width, dims.height);
      const lowQuality = shortEdge < MIN_SHORT_EDGE || file.size < MIN_BYTES;

      // Show the local preview immediately, before the upload round-trips.
      setMeta((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return {
          name: file.name,
          sizeLabel: formatBytes(file.size),
          dimensionsLabel: `${dims.width} × ${dims.height}`,
          previewUrl: dims.url,
          lowQuality,
        };
      });

      setUploading(true);
      try {
        const form = new FormData();
        form.append("photo", file);
        if (draft?.id) {
          form.append("sessionId", draft.id);
        }
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = (await res.json()) as UploadResponse;
        if (!res.ok || !data.ok || !data.path) {
          setError(
            "We couldn't save that photo. Please try again in a moment.",
          );
          return;
        }
        updateDraft({ pet: { photo: data.path } });
      } catch {
        setError("We couldn't save that photo. Please try again in a moment.");
      } finally {
        setUploading(false);
      }
    },
    [draft?.id, updateDraft],
  );

  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      // Reset so choosing the same file again still fires change.
      event.target.value = "";
    },
    [handleFile],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // A photo is "on file" if the draft references one. `meta` (the local blob
  // preview + dimensions) only exists this session — a returning user who
  // refreshed has the saved path but no blob, so we still show a confirmation
  // card, just with the placeholder portrait instead of a live thumbnail.
  const photoOnFile = hasPhoto;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onInputChange}
        style={{ display: "none" }}
      />

      {photoOnFile ? (
        <div className="photo-preview">
          <div className="photo-preview__img">
            {meta ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta.previewUrl} alt={`${meta.name} preview`} />
            ) : (
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <ellipse cx="50" cy="55" rx="32" ry="28" fill="#5C544A" opacity="0.6" />
                <ellipse cx="30" cy="32" rx="10" ry="14" fill="#5C544A" opacity="0.6" />
                <ellipse cx="70" cy="32" rx="10" ry="14" fill="#5C544A" opacity="0.6" />
                <circle cx="40" cy="52" r="3" fill="#221C16" />
                <circle cx="60" cy="52" r="3" fill="#221C16" />
                <ellipse cx="50" cy="65" rx="4" ry="3" fill="#221C16" />
              </svg>
            )}
          </div>
          <div>
            <div className="photo-preview__name">
              {meta ? meta.name : "Photo on file"}
            </div>
            <div className="photo-preview__meta">
              {meta
                ? `${meta.sizeLabel} · ${meta.dimensionsLabel}${uploading ? " · saving…" : ""}`
                : "Saved with your story · ready to illustrate"}
            </div>
          </div>
          <button
            type="button"
            className="photo-preview__replace"
            onClick={openPicker}
          >
            replace
          </button>
        </div>
      ) : (
        <div
          className="upload-zone"
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={
            dragOver
              ? { borderColor: "var(--rose)", background: "var(--rose-faint)" }
              : undefined
          }
        >
          <div className="upload-zone__icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
              <path
                d="M20 27V11m0 0l-6 6m6-6l6 6M8 31h24"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="upload-zone__primary">
            {uploading ? "Saving your photo…" : "Drop a photo here"}
          </p>
          <p className="upload-zone__secondary">
            or click to choose · JPG, PNG, or WebP
          </p>
        </div>
      )}

      {meta?.lowQuality && !error ? (
        <p className="notice">
          This photo is a little small, so the illustrations may come out
          softer or less true to life. You can use it anyway, or replace it with
          a larger, clearer photo of {""}
          {draft?.pet.name?.trim() ? draft.pet.name.trim() : "your pet"}.
        </p>
      ) : null}

      {error ? <p className="notice">{error}</p> : null}
    </div>
  );
}
