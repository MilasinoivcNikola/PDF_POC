// Pure auto-mappers for the master template's derived merge fields. These live
// in exactly one place — lib/session — and feature 03's merge layer imports them
// from here (no duplication). They are pure (no IO) so they unit-test without
// mocks. The string-literal unions give every `switch` exhaustive-check safety.

import type { Pronoun, Species } from "@/lib/session/types";

/** Object-pronoun form: [PRONOUN_OBJECT] (he → him, she → her, they → them). */
export function pronounObject(pronoun: Pronoun): string {
  switch (pronoun) {
    case "he":
      return "him";
    case "she":
      return "her";
    case "they":
      return "them";
  }
}

/** Possessive-pronoun form: [PRONOUN_POSSESSIVE] (he → his, she → her, they → their). */
export function pronounPossessive(pronoun: Pronoun): string {
  switch (pronoun) {
    case "he":
      return "his";
    case "she":
      return "her";
    case "they":
      return "their";
  }
}

/**
 * [SPECIES_DESCRIPTOR] — the affectionate noun used on Page 12 ("[PET_NAME] was
 * a good [SPECIES_DESCRIPTOR]"). Per the master template's example column, "dog"
 * is gendered by pronoun ("good boy" / "sweet girl"); other species map to a
 * fixed pet word. The returned value is just the noun — Page 12 supplies the
 * leading "good".
 *
 * Note: for "dog" the returned phrase already carries its own adjective
 * ("good boy" / "sweet girl") to match the template's examples; the neutral
 * "they" and non-dog cases return a bare noun that reads naturally after "good".
 */
export function speciesDescriptor(species: Species, pronoun: Pronoun): string {
  switch (species) {
    case "dog":
      switch (pronoun) {
        case "he":
          return "boy";
        case "she":
          return "girl";
        case "they":
          return "dog";
      }
      break;
    case "cat":
      return "kitty";
    case "rabbit":
      return "bunny";
    case "bird":
      return "bird";
    case "other":
      return "friend";
  }
  // Unreachable: the inner dog switch is exhaustive over Pronoun.
  return "friend";
}
