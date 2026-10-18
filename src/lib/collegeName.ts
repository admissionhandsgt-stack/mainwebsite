/**
 * The name a college is searched by, and the place that tells it apart.
 *
 * The source names are addresses as much as names: "Madha Medical College and
 * Hospital, Thandalam, Chennai", "KIMS Saveera Hospital, Anantapuram, Andhra
 * Pradesh-515004", "ESIC MEDICAL COLLEGE AND HOSPITAL, NOIDA , A-3, TULSI
 * MARG…". People search "madha medical college chennai", and a title built on
 * the whole string was clipped to "Madha Medical College and Hospital… Chennai"
 * (Search Console, 7–15 Oct 2026: 0.5% CTR on the 790 MBBS college pages).
 *
 * `collegeName(raw)` returns the short name (H1, title) and the place (title,
 * snippet); the full official name stays on the page beneath the H1. No
 * imports, so a client component or a script can use it too.
 */

const STATES = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "chattisgarh", "goa", "gujarat",
  "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur",
  "meghalaya", "mizoram", "nagaland", "odisha", "orissa", "punjab", "rajasthan", "sikkim", "tamil nadu",
  "tamilnadu", "telangana", "telengana", "tripura", "uttar pradesh", "u.p.", "up", "uttarakhand", "west bengal",
  "jammu and kashmir", "jammu & kashmir", "j&k", "ladakh", "andaman and nicobar islands", "dadra and nagar haveli",
  "daman and diu", "lakshadweep", "india",
];
/** Union territories that are also the city — kept as the place when nothing else is named. */
const CITY_STATES = ["delhi", "new delhi", "chandigarh", "puducherry", "pondicherry"];

const SMALL = new Set(["of", "and", "the", "for", "in", "at", "to", "on", "by", "&"]);
/** Words that make a segment an address, not a place. */
const ADDRESS = /\b(road|rd\.?|marg|street|st\.|lane|sector|block|plot|no\.?|p\.?\s?o\.?|post|vill(age)?\.?|dist(rict)?\.?|tehsil|taluk|near|opp\.?|main|cross|floor|building|campus|colony|chowk|highway|nh-?\d*|pin(code)?)\b/i;
/** Words that make a segment part of an institution, not a place. */
const INSTITUTION = /\b(university|college|institute|hospital|trust|society|foundation|centre|center|academy|vidyapeeth|vidyapith|sciences?|medical|dental|ayurved\w*|homoeopath\w*|nursing|research|mission|charitable|memorial|limited|ltd|pvt)\b/i;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const isState = (s: string) => {
  const t = s.toLowerCase().replace(/[\s.-]*\d{6}$/, "").replace(/\s+/g, " ").trim();
  return STATES.some((st) => t === st || t.startsWith(st + " ") || t.startsWith(st + "-"));
};
const isCityState = (s: string) => CITY_STATES.includes(s.toLowerCase().trim());

/** A segment that reads as a town or city: letters only, one to three words, no address or institution words. */
function isPlace(s: string): boolean {
  const t = s.trim();
  if (!t || /\d/.test(t) || t.length > 32) return false;
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(t)) return false;
  if (words(t).length > 3) return false;
  return !ADDRESS.test(t) && !INSTITUTION.test(t);
}

/** "PRAGJYOTISHPUR MEDICAL COLLEGE" → "Pragjyotishpur Medical College"; short acronyms (ESIC, SMS, KIMS) stay. */
function titleCase(s: string): string {
  return s
    .split(/(\s+|-)/)
    .map((w, i) => {
      if (/^\s+$|^-$/.test(w) || !w) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      if (/^[A-Z]{2,4}$/.test(w) && !SMALL.has(lower)) return w; // an acronym
      if (/\./.test(w)) return w; // initials: R.V., D.A.
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/** Spacing and casing fixed; nothing removed. The official name as it should read. */
export function tidyName(raw: string): string {
  let s = (raw ?? "").replace(/\s+/g, " ").trim();
  s = s.replace(/\s*,\s*/g, ", ").replace(/,\s*$/, "");
  s = s.replace(/\bof(?=[A-Z])/g, "of ").replace(/([a-z])(College|Hospital|Institute|Medical|Dental)\b/g, "$1 $2");
  const letters = s.replace(/[^A-Za-z]/g, "");
  const upper = s.replace(/[^A-Z]/g, "");
  if (letters.length > 8 && upper.length / letters.length > 0.7) s = titleCase(s);
  return s;
}

export interface CollegeName {
  /** The name people search: "Madha Medical College". */
  short: string;
  /** The town or city, when the name says one: "Chennai". Null when it does not. */
  place: string | null;
  /** Every place the name gives, in order: ["Hebbal", "Bangalore"]. Used when two colleges share a short name and a city. */
  places: string[];
  /** The whole official name, tidied: shown under the H1. */
  official: string;
}

export function collegeName(raw: string): CollegeName {
  const official = tidyName(raw);
  // Notes in brackets are not the name: "(Prev. …)", "(Joint Programme with …)",
  // "(A Fortis Associate)", "(DNB)". A bracketed acronym stays: "(CAPFIMS)".
  let s = official
    .replace(/\s*\((?:prev\.?|previously|former|formerly|earlier|old|joint programme|a fortis|dnb|nbe|deemed|govt)[^)]*\)/gi, "")
    .replace(/\s*\(([^)]*)\)/g, (m, inner: string) => (/^[A-Z][A-Z.&-]{1,9}$/.test(inner.trim()) ? m : ""))
    .replace(/\s*\([^)]*$/, "")
    .trim();
  s = s.split(/\s+\/\s+/)[0];

  const segs = s.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
  let name = segs[0] ?? official;
  let rest = segs.slice(1);
  // "Faculty of Dental Sciences, Banaras Hindu University" — the first part alone says nothing.
  if (/^(faculty|department|dept\.?|school|college|institute|centre|center|division) of\b/i.test(name) && rest[0] && !isPlace(rest[0]) && !isState(rest[0])) {
    name = `${name}, ${rest[0]}`;
    rest = rest.slice(1);
  }
  // An address glued on without a comma: "… Hospital VILL- HASHAMPUR JHALU".
  name = name.replace(/\s+(vill(age)?\.?|p\.?o\.?|dist(rict)?\.?|near|opp\.?)\s*[-.:]?\s.*$/i, "");
  name = name.replace(/[\s,-]*\b\d{6}\b\s*$/, "").trim();
  // "NKP Salve Institute of Medical Sciences and Research Centre and Lata
  // Mangeshkar Hospital" is searched as the part before the research centre.
  const mid = name.replace(/\s+(?:and|&)\s+(?:medical\s+)?research\s+(?:centre|center|institute)\s+(?:and|&)\s+.*$/i, "");
  if (mid !== name && words(mid).length >= 3) name = mid;
  // The trailing hospital or research centre is not what anybody types.
  for (let prev = ""; prev !== name; ) {
    prev = name;
    name = name
      .replace(/\s+(?:and|&)\s+(?:(?:general|super speciality|super specialty|multi ?speciality|teaching|district)\s+)?hospitals?$/i, "")
      .replace(/\s+(?:and|&)\s+(?:medical\s+)?research\s+(?:centre|center|institute|foundation)$/i, "")
      .replace(/\s+(?:and|&)\s+(?:research|polyclinic)$/i, "")
      .replace(/\s+(?:private limited|pvt\.?\s*ltd\.?|limited|ltd\.?)$/i, "")
      .trim();
  }
  if (words(name).length < 2) name = segs[0] ?? official;

  // The place: the last town named before the state (or an address) begins.
  const places: string[] = [];
  for (const raw of rest.slice(0, 5)) {
    const seg = raw.replace(/[\s.-]*\b\d{6}\b/g, "").replace(/^(dist\.?|district|p\.?o\.?-?|vill\.?-?)\s*/i, "").trim();
    if (!seg) continue;
    if (isCityState(seg)) {
      if (!places.length) places.push(seg);
      break;
    }
    if (isState(seg)) break;
    if (isPlace(seg)) places.push(seg);
  }
  const cased = places.map((p) => (p === p.toUpperCase() ? titleCase(p) : p)).filter((p) => !name.toLowerCase().includes(p.toLowerCase()));
  return { short: name, place: cased.length ? cased[cased.length - 1] : null, places: cased, official };
}

/**
 * A PG "college" that offers only National Board courses — DNB, DrNB, FNB and the
 * NBE diplomas. 1,536 of the 2,168 PG pages are hospitals like this, and their
 * searches were patients' ("sadar hospital hajipur"); the title should speak to
 * the doctor choosing a DNB seat.
 */
export function isDnbOnly(courses: string[]): boolean {
  return courses.length > 0 && courses.every((c) => /^(DNB|DrNB|FNB|Diploma|PG Diploma)\b/i.test(c.trim()));
}
