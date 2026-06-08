"use client";

// The wizard's shared state. A single `StoryDraft` lives in React Context and is
// mirrored to localStorage on every change so a refresh never loses progress
// (feature 02's loadDraft/saveDraft/newDraft helpers do the actual persistence).
//
// SSR-safe by design: the provider renders nothing draft-dependent until it has
// hydrated from localStorage in an effect, so the server and first client render
// agree (no hydration mismatch). `updateDraft` takes a partial-group patch and
// merges it shallowly per group, then bumps the "saved" timestamp the StepShell
// shows.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { StoryDraft } from "@/lib/session/types";
import {
  clearDraft as clearStoredDraft,
  loadDraft,
  newDraft,
  saveDraft,
} from "@/lib/session/storage";

/** A patch to the draft's input groups. Each group merges shallowly. */
export interface DraftPatch {
  pet?: Partial<StoryDraft["pet"]>;
  child?: Partial<StoryDraft["child"]>;
  memories?: Partial<StoryDraft["memories"]>;
  toggles?: Partial<StoryDraft["toggles"]>;
}

interface WizardContextValue {
  /** The current draft, or `null` until hydrated on the client. */
  draft: StoryDraft | null;
  /** True once the draft has been hydrated from localStorage. */
  hydrated: boolean;
  /** ISO timestamp of the last save, for the "Saved just now" indicator. */
  savedAt: string | null;
  /** Merge a partial-group patch into the draft and persist it. */
  updateDraft: (patch: DraftPatch) => void;
  /** Discard the draft (used after a successful Generate / to start fresh). */
  resetDraft: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Hydrate once on mount: reuse the saved draft if present, otherwise mint a
  // fresh one (and persist it so a refresh on step 1 keeps the same id).
  useEffect(() => {
    const existing = loadDraft();
    if (existing) {
      setDraft(existing);
      setSavedAt(existing.createdAt);
    } else {
      const fresh = newDraft();
      saveDraft(fresh);
      setDraft(fresh);
      setSavedAt(fresh.createdAt);
    }
    setHydrated(true);
  }, []);

  const updateDraft = useCallback((patch: DraftPatch) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const next: StoryDraft = {
        ...current,
        pet: { ...current.pet, ...patch.pet },
        child: { ...current.child, ...patch.child },
        memories: { ...current.memories, ...patch.memories },
        toggles: { ...current.toggles, ...patch.toggles },
      };
      saveDraft(next);
      return next;
    });
    setSavedAt(new Date().toISOString());
  }, []);

  const resetDraft = useCallback(() => {
    clearStoredDraft();
    const fresh = newDraft();
    saveDraft(fresh);
    setDraft(fresh);
    setSavedAt(fresh.createdAt);
  }, []);

  const value = useMemo<WizardContextValue>(
    () => ({ draft, hydrated, savedAt, updateDraft, resetDraft }),
    [draft, hydrated, savedAt, updateDraft, resetDraft],
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

/** Access the wizard draft + updater. Must be used under <WizardProvider>. */
export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return ctx;
}
