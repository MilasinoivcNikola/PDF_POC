"use client";

// The wizard's shared state. A single `WizardDraft` (Story 1 or Story 2) lives in
// React Context and is mirrored to localStorage on every change so a refresh never
// loses progress (feature 02's loadDraft/saveDraft/newDraft helpers do the actual
// persistence).
//
// SSR-safe by design: the provider renders nothing draft-dependent until it has
// hydrated from localStorage in an effect, so the server and first client render
// agree (no hydration mismatch). `updateDraft` takes a partial-group patch and
// merges it shallowly per group, then bumps the "saved" timestamp the StepShell
// shows.
//
// Multi-product: the draft is discriminated by `storyType` (a missing one is Story
// 1 — legacy drafts had no field). `loadDraft()` returns the union; the provider
// reuses whatever shape is saved. A FRESH draft is minted with the product the
// caller asks for: the landing story picker seeds + persists the chosen-product
// draft BEFORE entering /create, so the provider hydrates the right shape on first
// load. The per-group merge below only touches the groups the patch names, so the
// shared `pet` group works for both products and the product-specific groups
// (`child`/`owner`/etc.) are merged only when present.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Child,
  LetterMemories,
  Memories,
  Owner,
  Pet,
  Story2Toggles,
  Story4Memories,
  Story4Toggles,
  Toggles,
  WizardDraft,
} from "@/lib/session/types";
import {
  clearDraft as clearStoredDraft,
  loadDraft,
  newDraft,
  saveDraft,
} from "@/lib/session/storage";

/**
 * A patch to the draft's input groups. Each named group merges shallowly. Story 1
 * uses `pet`/`child`/`memories: Memories`/`toggles: Toggles`; Story 2 uses
 * `pet`/`owner`/`memories: LetterMemories`/`toggles: Story2Toggles`; Story 4 uses
 * `pet`/`owner`/`memories: Story4Memories`/`toggles: Story4Toggles`. The union of
 * the per-group types is intentional — a step only ever patches the groups its own
 * product has, and the merge below applies only the named groups.
 */
export interface DraftPatch {
  pet?: Partial<Pet>;
  child?: Partial<Child>;
  owner?: Partial<Owner>;
  memories?: Partial<Memories> | Partial<LetterMemories> | Partial<Story4Memories>;
  toggles?: Partial<Toggles> | Partial<Story2Toggles> | Partial<Story4Toggles>;
}

interface WizardContextValue {
  /** The current draft, or `null` until hydrated on the client. */
  draft: WizardDraft | null;
  /** True once the draft has been hydrated from localStorage. */
  hydrated: boolean;
  /** ISO timestamp of the last save, for the "Saved just now" indicator. */
  savedAt: string | null;
  /** Merge a partial-group patch into the draft and persist it. */
  updateDraft: (patch: DraftPatch) => void;
  /** Discard the draft (used after a successful Generate / to start fresh). */
  resetDraft: () => void;
  /**
   * Replace the whole draft with the given one and persist it. Used when an entry
   * point needs a fresh draft of a specific product (e.g. the public order form
   * seeding the chosen book's shape), the same way the landing picker seeds a
   * draft into localStorage before /create — but for an already-mounted provider.
   */
  replaceDraft: (next: WizardDraft) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Hydrate once on mount: reuse the saved draft if present (either product),
  // otherwise mint a fresh Story-1 draft (the default; the landing picker seeds a
  // Story-2 draft into localStorage before entering /create, so a Story-2 wizard
  // reads it here as an existing draft). Persisting the fresh one keeps the same id
  // across a refresh on step 1.
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
      // Shallow-merge only the groups the patch names. `current` already carries
      // exactly the groups its product has (Story 1: pet/child/memories/toggles;
      // Story 2: pet/owner/memories/toggles), and each step only patches groups its
      // own product has — so we merge `pet`/`memories`/`toggles` (shared on both
      // shapes) plus whichever of `child`/`owner` the patch carries. An absent
      // group never invents the other product's group. The cast reconciles the
      // per-group union on `DraftPatch` with the concrete draft shape.
      const merged: Record<string, unknown> = {
        ...current,
        pet: { ...current.pet, ...patch.pet },
        memories: {
          ...(current.memories as object),
          ...(patch.memories as object | undefined),
        },
        toggles: {
          ...(current.toggles as object),
          ...(patch.toggles as object | undefined),
        },
      };
      if (patch.child) {
        merged.child = { ...(current as { child?: object }).child, ...patch.child };
      }
      if (patch.owner) {
        merged.owner = { ...(current as { owner?: object }).owner, ...patch.owner };
      }
      const next = merged as unknown as WizardDraft;
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

  const replaceDraft = useCallback((next: WizardDraft) => {
    saveDraft(next);
    setDraft(next);
    setSavedAt(next.createdAt);
  }, []);

  const value = useMemo<WizardContextValue>(
    () => ({
      draft,
      hydrated,
      savedAt,
      updateDraft,
      resetDraft,
      replaceDraft,
    }),
    [draft, hydrated, savedAt, updateDraft, resetDraft, replaceDraft],
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
