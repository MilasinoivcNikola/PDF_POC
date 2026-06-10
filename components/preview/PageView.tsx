"use client";

// One book page in the in-browser preview. It renders the SAME per-page markup
// the PDF uses (the shared `renderPage` from lib/pdf/pages) so screen and print
// can't drift, then overlays screen-only affordances for the pages that support
// them:
//   - "Regenerate" — re-paint the page's illustration (owned by BookPreview), and
//   - "Edit the words" — correct the parent's OWN free-text inputs/names for this
//     page inline (preview-text-edit feature). The editor is local UI state; the
//     actual write + re-resolve is owned by BookPreview (it holds the session id
//     and the whole-book `pages` state a name edit refreshes).

import { useState, type ReactNode } from "react";

import { renderPage } from "@/lib/pdf/pages";
import type { ResolvedPage } from "@/lib/story/merge";
import { isBlankAfterClean } from "@/lib/story/editable-fields";

interface PageViewProps {
  /** The fully-resolved page (copy already merged). */
  page: ResolvedPage;
  /** Image src for this page's slot (a data URL), or undefined for placeholder. */
  src?: string;
  /** Whether this page has an illustration that can be regenerated. */
  canRegenerate: boolean;
  /** True while this page's illustration is being re-painted. */
  regenerating: boolean;
  /** Re-paint just this page's illustration. */
  onRegenerate: () => void;
  /** The editable free-text fields exposed on this page (empty for most pages). */
  editableFields: readonly string[];
  /** Current raw values for every editable field (the editor pre-fills from this). */
  fieldValues: Record<string, string>;
  /** Per-field inline-editor copy (label + hint), supplied per story. */
  fieldCopy: Record<string, { label: string; hint: string }>;
  /** Whether a field is required (blanking it is blocked), supplied per story. */
  isFieldRequired: (field: string) => boolean;
  /** True while ANY text save is in flight (disables the editors book-wide). */
  saving: boolean;
  /** Persist one edited field; resolves true on success, false on failure. */
  onSaveText: (field: string, value: string) => Promise<boolean>;
}

const regenerateIcon: ReactNode = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M12 7a5 5 0 1 1-1.46-3.54M12 1v3h-3"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const editIcon: ReactNode = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M9.5 1.5l3 3L5 12l-3.5.5L2 9l7.5-7.5z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function PageView({
  page,
  src,
  canRegenerate,
  regenerating,
  onRegenerate,
  editableFields,
  fieldValues,
  fieldCopy,
  isFieldRequired,
  saving,
  onSaveText,
}: PageViewProps) {
  const [editing, setEditing] = useState(false);
  // Local working copy of the field values while the editor is open.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const canEdit = editableFields.length > 0;

  function openEditor() {
    const initial: Record<string, string> = {};
    for (const field of editableFields) {
      initial[field] = fieldValues[field] ?? "";
    }
    setDrafts(initial);
    setEditing(true);
  }

  function cancelEditor() {
    setEditing(false);
    setDrafts({});
  }

  // A required field blanked in the editor blocks Save (the server rejects it too).
  const hasBlankRequired = editableFields.some(
    (field) => isFieldRequired(field) && isBlankAfterClean(drafts[field] ?? ""),
  );

  async function handleSaveAll() {
    if (saving || hasBlankRequired) {
      return;
    }
    // Persist each changed field in turn; a failure leaves the editor open so the
    // parent can retry without losing their other edits.
    for (const field of editableFields) {
      const next = drafts[field] ?? "";
      if (next === (fieldValues[field] ?? "")) {
        continue;
      }
      const ok = await onSaveText(field, next);
      if (!ok) {
        return;
      }
    }
    setEditing(false);
    setDrafts({});
  }

  return (
    <div className="preview-page">
      {renderPage(page, src)}

      {canRegenerate || canEdit ? (
        <div className="preview-page__controls">
          {canEdit ? (
            <button
              type="button"
              className="preview-page__control"
              onClick={editing ? cancelEditor : openEditor}
              disabled={saving && !editing}
            >
              {editIcon}
              {editing ? "Close" : "Edit the words"}
            </button>
          ) : null}
          {canRegenerate ? (
            <button
              type="button"
              className="preview-page__control"
              onClick={onRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
                <span className="gen-dots" aria-hidden>
                  <span className="gen-dot" />
                  <span className="gen-dot" />
                  <span className="gen-dot" />
                </span>
              ) : (
                regenerateIcon
              )}
              {regenerating ? "Painting…" : "Regenerate"}
            </button>
          ) : null}
        </div>
      ) : null}

      {canEdit && editing ? (
        <div className="preview-page__editor">
          {editableFields.map((field) => {
            const copy = fieldCopy[field];
            const value = drafts[field] ?? "";
            const blankRequired =
              isFieldRequired(field) && isBlankAfterClean(value);
            return (
              <div className="field" key={field}>
                <label className="field__label" htmlFor={`edit-${page.id}-${field}`}>
                  {copy.label}
                </label>
                <p className="field__hint">{copy.hint}</p>
                <textarea
                  id={`edit-${page.id}-${field}`}
                  value={value}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  disabled={saving}
                  rows={2}
                />
                {blankRequired ? (
                  <p className="notice notice--required" style={{ marginTop: "var(--s-2)" }}>
                    This is part of the story, so it can&apos;t be left empty.
                  </p>
                ) : null}
              </div>
            );
          })}
          <div className="preview-page__editor-actions">
            <button
              type="button"
              className="btn-link"
              onClick={cancelEditor}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSaveAll}
              disabled={saving || hasBlankRequired}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
