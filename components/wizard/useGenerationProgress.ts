"use client";

// Drives a generation run from the client (feature 09). Owns:
//   1. POST /api/generate-illustrations to kick off (or no-op resume) the run,
//   2. a poll loop on GET /api/generate-illustrations?id=… (~1.8s) that reads the
//      disk-derived progress (which page slots are done) + the live status,
//   3. cleanup of the in-flight poll on unmount or restart.
//
// It talks to the server ONLY over fetch — the server-only ./disk + lib/ai code is
// never imported here, keeping this hook client-safe (the feature-08 module
// boundary rule). The page component stays thin: it renders whatever this returns.

import { useCallback, useEffect, useRef, useState } from "react";

/** Coarse phase the UI renders from. */
export type GenerationStatus = "starting" | "generating" | "ready" | "error";

interface PollResponse {
  ok: boolean;
  status?: "generating" | "ready" | "error";
  done?: number;
  total?: number;
  donePages?: string[];
  error?: string;
}

export interface GenerationProgress {
  status: GenerationStatus;
  /** Page slot ids with a saved PNG on disk (e.g. "cover", "page-1", "reference"). */
  donePages: string[];
  /** Total images the book will produce (reference + every scene). */
  total: number;
  /** A readable failure message when status === "error". */
  error: string | null;
  /** Re-kick the run after a failure (re-POST, then resume polling). */
  retry: () => void;
}

const POLL_INTERVAL_MS = 1800;

/**
 * Start generation for `sessionId` and poll its progress. Pass a falsy id to keep
 * the hook idle (e.g. before the session is written).
 */
export function useGenerationProgress(
  sessionId: string | null,
): GenerationProgress {
  const [status, setStatus] = useState<GenerationStatus>("starting");
  const [donePages, setDonePages] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Cleanup for the currently-active run. Calling it cancels that run's in-flight
  // poll loop; every (re)start replaces it so there's never more than one loop.
  const stopRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    if (!sessionId) {
      return;
    }
    // Tear down any prior run before starting a fresh one (retry safety).
    stopRef.current?.();

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stop = () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    stopRef.current = stop;

    setStatus("starting");
    setError(null);

    async function poll(): Promise<void> {
      if (cancelled) {
        return;
      }
      try {
        const res = await fetch(
          `/api/generate-illustrations?id=${encodeURIComponent(sessionId!)}`,
        );
        const data = (await res.json()) as PollResponse;
        if (cancelled) {
          return;
        }
        if (!res.ok || !data.ok) {
          setStatus("error");
          setError("We couldn't reach the illustration step. Please try again.");
          return;
        }
        if (typeof data.total === "number") {
          setTotal(data.total);
        }
        if (Array.isArray(data.donePages)) {
          setDonePages(data.donePages);
        }
        if (data.status === "error") {
          setStatus("error");
          setError(
            data.error ??
              "One of the illustrations couldn't be painted. Please try again.",
          );
          return;
        }
        if (data.status === "ready") {
          setStatus("ready");
          return;
        }
        setStatus("generating");
      } catch {
        if (cancelled) {
          return;
        }
        // Transient network hiccup — keep polling rather than failing the run.
        setStatus("generating");
      }
      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void (async () => {
      try {
        const res = await fetch("/api/generate-illustrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sessionId }),
        });
        const data = (await res.json()) as PollResponse;
        if (cancelled) {
          return;
        }
        if (typeof data.total === "number") {
          setTotal(data.total);
        }
        if (!res.ok || !data.ok) {
          setStatus("error");
          setError(
            "We couldn't start painting the book just yet. Please try again.",
          );
          return;
        }
      } catch {
        if (cancelled) {
          return;
        }
        setStatus("error");
        setError("We couldn't start painting the book just yet. Please try again.");
        return;
      }
      // POST accepted — begin polling for incremental progress.
      void poll();
    })();
  }, [sessionId]);

  // Auto-start (and restart on id change); clean up on unmount.
  useEffect(() => {
    start();
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [start]);

  const retry = useCallback(() => {
    start();
  }, [start]);

  return { status, donePages, total, error, retry };
}
