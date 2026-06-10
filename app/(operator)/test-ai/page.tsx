"use client";

// DEV-ONLY SCAFFOLD — not part of the real wizard.
//
// A minimal harness to exercise the Craft-Area-2 pipeline end-to-end during
// development: pick a pet photo, POST it to /api/upload, then trigger
// /api/test-ai/generate-reference (which calls generateReferenceIllustration at
// the Low tier) and show the resulting reference illustration inline.
//
// Hitting "Generate" calls the PAID OpenAI API. The real wizard upload UI and
// the full scene pipeline are features 08 and 07 respectively.

import { useState } from "react";
import type { IllustrationStyle } from "@/lib/session/types";

type UploadResult = { sessionId: string; path: string };

const STYLES: readonly IllustrationStyle[] = ["watercolor", "storybook", "pencil"];

export default function TestAiPage() {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState(
    "a sweet rescue mutt, possibly part beagle, with floppy ears and the softest brown eyes",
  );
  const [style, setStyle] = useState<IllustrationStyle>("watercolor");
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) {
      return;
    }
    setBusy(true);
    setError(null);
    setResultUrl(null);
    try {
      const form = new FormData();
      form.set("photo", file);
      if (upload?.sessionId) {
        form.set("sessionId", upload.sessionId);
      }
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!data.ok) {
        setError(`Upload failed: ${data.error}`);
        return;
      }
      setUpload({ sessionId: data.sessionId, path: data.path });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload error");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!upload) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/test-ai/generate-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: upload.sessionId,
          photoPath: upload.path,
          petDescription: description,
          style,
          quality: "low",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(`Generation failed: ${data.error}${data.message ? ` — ${data.message}` : ""}`);
        return;
      }
      setResultUrl(data.dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: "44rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <p className="label label--gold">Dev-only scaffold · not the real wizard</p>
      <h1 className="display-md" style={{ margin: "0.5rem 0 1.5rem" }}>
        Reference illustration test
      </h1>
      <p className="lede" style={{ marginBottom: "2rem" }}>
        Upload a pet photo, then generate one stylized reference illustration at the
        Low quality tier. This calls the paid OpenAI API.
      </p>

      <div className="field">
        <label className="field__label" htmlFor="photo">
          Pet photo
        </label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="description">
          Appearance (breed + color)
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="style">
          Style
        </label>
        <select
          id="style"
          value={style}
          onChange={(e) => setStyle(e.target.value as IllustrationStyle)}
        >
          {STYLES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", margin: "1.5rem 0" }}>
        <button
          type="button"
          className="btn"
          onClick={handleUpload}
          disabled={!file || busy}
        >
          1 · Upload photo
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleGenerate}
          disabled={!upload || busy}
        >
          2 · Generate reference
        </button>
      </div>

      {busy && <p className="label">Working…</p>}
      {upload && (
        <p className="label">
          Uploaded → {upload.path} (session {upload.sessionId})
        </p>
      )}
      {error && (
        <p style={{ color: "var(--rose)", fontStyle: "italic" }}>{error}</p>
      )}

      {resultUrl && (
        <div style={{ marginTop: "2rem" }}>
          <p className="label label--gold">Reference illustration</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="Generated reference illustration"
            style={{ width: "100%", maxWidth: "32rem", borderRadius: "2px", marginTop: "0.75rem" }}
          />
        </div>
      )}
    </main>
  );
}
