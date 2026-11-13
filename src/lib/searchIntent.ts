/**
 * Searches the site must not answer or study (2026-11-13 audit of the research bot's 92 live answers, 11 wrong):
 *   - a patient looking for a doctor — "dermatologist fees near me" had been answered with MD Dermatology's PG fee;
 *   - another country's exam — "radiology msra cut off 2026" (MSRA is the UK's) had NEET PG's cut off;
 *   - a doctor's salary answered with the PG stipend — "md radiology salary in india".
 * Import-free, so the research bot (lib/serpSuggest.ts) and the answer placer (lib/searchFaq.ts) share it.
 */
const PATIENT = /\b(near me|nearby|clinic|consultation|appointment|treatment|opd)\b/i;
const DOCTOR = /\b(dermatologist|p(a)?ediatrician|gyn(a)?ecologist|radiologist|orthop(a)?edician|surgeon|physician|psychiatrist|ophthalmologist|cardiologist|neurologist|doctor)s?\b/i;
const COURSE = /\b(pg|md|ms|dnb|neet|seats?|course|admission|cut ?off|college|stipend|residency|resident)\b/i;
const FOREIGN = /\b(msra|plab|usmle|ukmla|mrcp|mrcs|frcs|dha|haad|dhamcq|prometric|nclex|fmge|nmle|step ?[123]|abroad|uk|usa|canada|australia|germany|nhs)\b/i;
const SALARY = /\bsalar(y|ies)\b/i;
const RESIDENT = /\b(pg|resident|residency|stipend|junior|jr|senior|sr)\b/i;

export function notOurs(q: string): boolean {
  if (PATIENT.test(q) || FOREIGN.test(q)) return true;
  if (DOCTOR.test(q) && !COURSE.test(q)) return true;
  return SALARY.test(q) && !RESIDENT.test(q);
}
