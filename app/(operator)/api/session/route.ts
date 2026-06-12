// POST /api/session — persist a finalized session to ./sessions/[id].json so the
// generation pipeline (features 07/09) can pick it up by id. The wizard assembles
// the draft into a complete session client-side (draftToSession), then POSTs it
// here.
//
// Validation happens at the boundary even though the app is local-only: the id
// must be a safe single path segment (it becomes the filename), and the product's
// required fields must be present, mirroring the client-side gate. Which fields are
// required depends on `storyType`:
//   - Story 1 (default / missing storyType): pet name, child name, photo, plus the
//     four personal free-text fields (breedColor, favoriteActivity, sleepingSpot,
//     favoriteMemory) the master text merges as live placeholders.
//   - Story 2: pet name, species, photo, owner names, plus the three personal
//     free-text fields (quirks, favoriteRitual, favoriteSpots) the letter merges.
//   - Story 4: pet name, species, photo, owner names, plus the four personal
//     free-text fields (quirks, favoriteRitual, favoriteSpots, favoriteActivity)
//     the celebration letter merges.
// Anything else is trusted to have been defaulted by the assembler.

import { NextResponse } from "next/server";
import { writeSession, type AnySession } from "@/lib/session/disk";
import { isSafeSessionId } from "@/lib/ai/paths";
import { assertOperator } from "@/lib/runtime/surface";
import type {
  StorySession,
  Story2Session,
  Story4Session,
} from "@/lib/session/types";

/** Whether a value is a non-empty trimmed string. */
function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** A JSON error response in the house shape, with the given status. */
function fail(error: string, status = 400): Response {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Validate a Story-2 body. Required: pet name, species, photo, owner names, and
 * the three personal free-text fields (quirks, favoriteRitual, favoriteSpots).
 * Returns an error code (the missing field), or null when valid.
 */
function validateStory2(session: Partial<Story2Session>): string | null {
  if (!nonEmpty(session.pet?.name)) {
    return "missing_pet_name";
  }
  if (!nonEmpty(session.pet?.species)) {
    return "missing_species";
  }
  if (!nonEmpty(session.pet?.photo)) {
    return "missing_photo";
  }
  if (!nonEmpty(session.owner?.names)) {
    return "missing_owner_names";
  }
  if (!nonEmpty(session.memories?.quirks)) {
    return "missing_quirks";
  }
  if (!nonEmpty(session.memories?.favoriteRitual)) {
    return "missing_favorite_ritual";
  }
  if (!nonEmpty(session.memories?.favoriteSpots)) {
    return "missing_favorite_spots";
  }
  return null;
}

/**
 * Validate a Story-4 body ("If [PET_NAME] Could Talk"). Required: pet name,
 * species, photo, owner names, and the four personal free-text fields (quirks,
 * favoriteRitual, favoriteSpots, favoriteActivity). Returns an error code (the
 * missing field), or null when valid.
 */
function validateStory4(session: Partial<Story4Session>): string | null {
  if (!nonEmpty(session.pet?.name)) {
    return "missing_pet_name";
  }
  if (!nonEmpty(session.pet?.species)) {
    return "missing_species";
  }
  if (!nonEmpty(session.pet?.photo)) {
    return "missing_photo";
  }
  if (!nonEmpty(session.owner?.names)) {
    return "missing_owner_names";
  }
  if (!nonEmpty(session.memories?.quirks)) {
    return "missing_quirks";
  }
  if (!nonEmpty(session.memories?.favoriteRitual)) {
    return "missing_favorite_ritual";
  }
  if (!nonEmpty(session.memories?.favoriteSpots)) {
    return "missing_favorite_spots";
  }
  if (!nonEmpty(session.memories?.favoriteActivity)) {
    return "missing_favorite_activity";
  }
  return null;
}

/**
 * Validate a Story-1 body. Required: pet name, child name, photo, and the four
 * personal free-text fields (breedColor, favoriteActivity, sleepingSpot,
 * favoriteMemory). Returns an error code (the missing field), or null when valid.
 */
function validateStory1(session: Partial<StorySession>): string | null {
  if (!nonEmpty(session.pet?.name)) {
    return "missing_pet_name";
  }
  if (!nonEmpty(session.child?.name)) {
    return "missing_child_name";
  }
  if (!nonEmpty(session.pet?.photo)) {
    return "missing_photo";
  }
  if (!nonEmpty(session.pet?.breedColor)) {
    return "missing_breed_color";
  }
  if (!nonEmpty(session.memories?.favoriteActivity)) {
    return "missing_favorite_activity";
  }
  if (!nonEmpty(session.memories?.sleepingSpot)) {
    return "missing_sleeping_spot";
  }
  if (!nonEmpty(session.memories?.favoriteMemory)) {
    return "missing_favorite_memory";
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const gate = assertOperator();
  if (gate) return gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json");
  }

  if (typeof body !== "object" || body === null) {
    return fail("invalid_session");
  }

  const base = body as Partial<StorySession | Story2Session | Story4Session>;

  if (!nonEmpty(base.id) || !isSafeSessionId(base.id.trim())) {
    return fail("invalid_session_id");
  }

  // Branch on the product. A missing storyType is Story 1 (legacy default).
  const storyType = base.storyType ?? "story-1";
  let error: string | null;
  if (storyType === "story-2") {
    error = validateStory2(body as Partial<Story2Session>);
  } else if (storyType === "story-4") {
    error = validateStory4(body as Partial<Story4Session>);
  } else {
    error = validateStory1(body as Partial<StorySession>);
  }
  if (error) {
    return fail(error);
  }

  try {
    // writeSession serializes whichever shape it's handed (the same id-keyed JSON
    // write); both StorySession and Story2Session round-trip identically.
    await writeSession(body as AnySession);
  } catch {
    return fail("write_failed", 500);
  }

  return NextResponse.json({ ok: true, id: base.id });
}
