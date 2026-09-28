/**
 * What a category code on a seat actually means.
 *
 * The chips used to read `GEN SC OBC ST EWS GM MNG GEN-Female` and nothing
 * else, which assumes the reader already knows that GM is Karnataka's general
 * merit and MNG is a management seat costing several times more. A candidate
 * picking the wrong chip gets a confident answer about seats they cannot take.
 *
 * **Nothing here is guessed.** The counselling authorities publish 330 distinct
 * category codes across the states, many of them local (`S1B`, `UQ-OP`,
 * `P3BG`). A wrong expansion is worse than none on a site whose whole claim is
 * that the figures are the authority's own — so an unknown code keeps its code,
 * and only the suffix rules it genuinely follows are described.
 *
 * No imports: the predictor is a client component.
 */

export interface CategoryMeaning {
  /** Expanded name, or the code itself when we do not know. */
  label: string;
  /** One line a candidate can act on. Empty when we cannot say honestly. */
  hint: string;
}

/** Codes that mean the same thing wherever they appear. */
const EXACT: Record<string, CategoryMeaning> = {
  GEN: { label: "General", hint: "Open to everyone. No reservation applied." },
  UR: { label: "Unreserved", hint: "The general/open category, as UG counselling labels it." },
  OC: { label: "Open Category", hint: "The general/open category, as Andhra and Telangana label it." },
  GM: { label: "General Merit", hint: "Karnataka's open category — merit alone, no reservation." },

  OBC: { label: "OBC", hint: "Other Backward Classes, central list." },
  SC: { label: "SC", hint: "Scheduled Caste." },
  ST: { label: "ST", hint: "Scheduled Tribe." },
  EWS: { label: "EWS", hint: "Economically Weaker Section — general category, income-based." },
  "UR-EWS": { label: "UR-EWS", hint: "Unreserved seat under the EWS quota." },
  SEBC: { label: "SEBC", hint: "Socially and Educationally Backward Classes — Maharashtra and Gujarat." },
  MBC: { label: "MBC", hint: "Most Backward Classes — Tamil Nadu." },
  BC: { label: "BC", hint: "Backward Class, state list." },

  MNG: {
    label: "Management",
    hint: "A management-quota seat. Open to far larger ranks and costs several times a government seat — read the fee before the rank.",
  },
  MGT: {
    label: "Management",
    hint: "A management-quota seat. Open to far larger ranks and costs several times a government seat.",
  },
  NRI: {
    label: "NRI",
    hint: "An NRI-quota seat. The widest ranks and the highest fees — often tens of lakhs a year.",
  },
};

/**
 * Suffix rules the codes genuinely follow, checked in order.
 *
 * These describe a modifier on top of whatever the base code is, which is why
 * they are appended to the base meaning rather than replacing it.
 */
const SUFFIXES: [RegExp, string][] = [
  [/-?fem(ale)?\b/i, "Reserved for women."],
  [/-?(pwd|ph|pho|dpw)\b/i, "Reserved for candidates with a disability."],
  [/-?(ex-?serviceman|esm)\b/i, "Reserved for ex-servicemen and their dependants."],
  [/-?orphan\b/i, "Reserved for orphan candidates."],
  [/-?serv(ice)?\b/i, "An in-service seat — for doctors already in government service."],
];

/** Prefix rules, same idea. */
const PREFIXES: [RegExp, string][] = [
  [/^gq[-\s]/i, "A government-quota seat."],
  [/^mq[-\s]|^mq\d/i, "A management-quota seat — expect a much higher fee."],
  [/^uq[-\s]/i, "A university-quota seat."],
];

export function categoryMeaning(code: string): CategoryMeaning {
  const raw = String(code ?? "").trim();
  if (!raw) return { label: "—", hint: "" };

  const exact = EXACT[raw.toUpperCase()];
  if (exact) return exact;

  // A base code we know, wearing a modifier: "SC-Female", "GEN-PwD".
  const base = raw.split(/[-\s]/)[0]?.toUpperCase() ?? "";
  const known = EXACT[base];

  const notes: string[] = [];
  for (const [pattern, note] of PREFIXES) if (pattern.test(raw)) notes.push(note);
  for (const [pattern, note] of SUFFIXES) if (pattern.test(raw)) notes.push(note);

  if (known) {
    return {
      label: raw,
      hint: [known.hint, ...notes].join(" ").trim(),
    };
  }

  return {
    label: raw,
    // Say what we can and no more. "A state-specific code" is true and useful;
    // an invented expansion would not be.
    hint: notes.length
      ? notes.join(" ")
      : "A state-specific category code, as the counselling authority publishes it.",
  };
}
