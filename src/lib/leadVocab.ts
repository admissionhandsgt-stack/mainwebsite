/**
 * The words a lead's status, call outcome and follow-up time can take — shared
 * by the admin screens (client) and the sheet sync (server), so the two always
 * offer the same choices. No imports: client components load this.
 *
 * The database stores "New" for a lead nobody has contacted; everywhere a
 * person reads it, it says "Not contacted".
 */

export const LEAD_STATUSES = ["New", "Contacted", "Interested", "Follow-up", "Converted", "Not interested", "Wrong number"] as const;
export const STATUS_LABELS = ["Not contacted", "Contacted", "Interested", "Follow-up", "Converted", "Not interested", "Wrong number"];
export const CLOSED = ["Converted", "Not interested", "Wrong number"];
export const statusLabel = (s: string | null | undefined) =>
  !s || s === "New" ? "Not contacted" : s === "Qualified" ? "Interested" : s === "Lost" ? "Not interested" : s;

export const OUTCOMES = ["Picked up — talked", "Not reachable", "Busy — call later", "Switched off", "Asked to WhatsApp", "Parent spoke", "Wrong number"];

/** 9:00 AM to 9:00 PM in half hours — the window the team calls in. */
export const FOLLOW_TIMES = Array.from({ length: 25 }, (_, i) => {
  const mins = 9 * 60 + i * 30;
  const h = Math.floor(mins / 60);
  return `${((h + 11) % 12) + 1}:${mins % 60 ? "30" : "00"} ${h < 12 ? "AM" : "PM"}`;
});
