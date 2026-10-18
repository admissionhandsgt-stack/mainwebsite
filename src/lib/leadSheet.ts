/**
 * The counsellors' lead sheet (2026-10-16): every enquiry, mirrored into a
 * Google Sheet owned by Admissionhands.gt@gmail.com, kept in step both ways
 * every two minutes by `/api/cron/sheets`.
 *
 *   MBBS · PG (MD-MS) · BDS   one row per student (phone), newest on top. A
 *                             student who used the tools five times is still
 *                             one row: "Queries" says 5 and "Earlier answers"
 *                             lists what changed between visits, with dates.
 *   All enquiries             every submission, one line each, newest on top.
 *   Today                     due follow-ups, then hot students not yet
 *                             contacted — rewritten every run, read-only.
 *
 * The columns marked ✎ belong to the counsellors. An edit there reaches the
 * admin (status, contacted date, owner, follow-up date and time, outcome,
 * notes); an edit in the admin reaches the sheet. Which side moved is decided
 * against `sheet_people.team`, the values as they were at the last sync.
 * Everything else is written by us and overwritten — those columns warn
 * before an edit.
 *
 * Rows are found by the hidden ID column (the phone), never by position, so a
 * counsellor sorting or filtering the sheet cannot misdirect a write.
 *
 * Server only.
 */

import { createHash } from "node:crypto";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { getIntegration, setIntegration } from "@/lib/integrations";
import { sheets } from "@/lib/google";
import { logError } from "@/lib/logger";
import counsellors from "@/data/counsellors.json";
import { CLOSED, FOLLOW_TIMES, OUTCOMES, STATUS_LABELS, statusLabel } from "@/lib/leadVocab";

/* ------------------------------------------------------------------ vocab */

export const TABS = { MBBS: "MBBS", PG: "PG (MD-MS)", BDS: "BDS" } as const;
type TabKey = keyof typeof TABS;
const LOG_TAB = "All enquiries";
const TODAY_TAB = "Today";

const toLabel = statusLabel;
const fromLabel = (s: string) => {
  const t = s.trim();
  if (!t || /^not contacted$/i.test(t)) return "New";
  return STATUS_LABELS.find((x) => x.toLowerCase() === t.toLowerCase()) ?? t.slice(0, 40);
};
export { CLOSED };
const COUNSELLORS = (counsellors as { name: string }[]).map((c) => c.name);

/* ---------------------------------------------------------------- columns */

type ColKind = "text" | "team" | "date" | "time";
interface Col {
  key: string;
  header: string;
  width: number;
  kind?: ColKind;
  pgOnly?: boolean;
}

const BASE: Col[] = [
  { key: "serial", header: "S.No", width: 56 },
  { key: "priority", header: "Priority", width: 78 },
  { key: "name", header: "Name", width: 170 },
  { key: "phone", header: "Phone", width: 128 },
  { key: "whatsapp", header: "WhatsApp", width: 84 },
  { key: "status", header: "Status ✎", width: 130, kind: "team" },
  { key: "contacted", header: "Contacted on", width: 128 },
  { key: "counsellor", header: "Counsellor ✎", width: 130, kind: "team" },
  { key: "followDate", header: "Follow-up date ✎", width: 118, kind: "date" },
  { key: "followTime", header: "Follow-up time ✎", width: 112, kind: "time" },
  { key: "outcome", header: "Call outcome ✎", width: 160, kind: "team" },
  { key: "notes", header: "Notes ✎", width: 280, kind: "team" },
  { key: "seatFinder", header: "Seat finder", width: 96, pgOnly: true },
  { key: "first", header: "First query", width: 150 },
  { key: "last", header: "Last query", width: 150 },
  { key: "queries", header: "Queries", width: 66 },
  { key: "callback", header: "Call-back asked", width: 140 },
  { key: "rank", header: "Rank", width: 86 },
  { key: "category", header: "Category", width: 84 },
  { key: "score", header: "Score", width: 64 },
  { key: "domicile", header: "Domicile", width: 120 },
  { key: "gender", header: "Gender", width: 76 },
  { key: "pwd", header: "PwD", width: 56 },
  { key: "city", header: "City", width: 110 },
  { key: "guardian", header: "Parent phone", width: 120 },
  { key: "branches", header: "Branches", width: 220 },
  { key: "states", header: "States wanted", width: 200 },
  { key: "collegeTypes", header: "College types", width: 150 },
  { key: "seatTypes", header: "Seat types", width: 150 },
  { key: "budgetYear", header: "Budget / year", width: 112 },
  { key: "budgetTotal", header: "Budget total", width: 112 },
  { key: "mbbsCollege", header: "MBBS college", width: 220, pgOnly: true },
  { key: "mbbsState", header: "MBBS state", width: 110, pgOnly: true },
  { key: "internship", header: "Internship", width: 110, pgOnly: true },
  { key: "serviceQuota", header: "In-service", width: 84, pgOnly: true },
  { key: "bond", header: "Bond OK", width: 90, pgOnly: true },
  { key: "source", header: "Came from", width: 240 },
  { key: "complete", header: "Profile filled", width: 92 },
  { key: "history", header: "Earlier answers", width: 340 },
  { key: "id", header: "ID", width: 40 },
];

const colsFor = (tab: TabKey) => BASE.filter((c) => !c.pgOnly || tab === "PG");
const TEAM_KEYS = ["status", "counsellor", "followDate", "followTime", "outcome", "notes"] as const;
type Team = Record<(typeof TEAM_KEYS)[number], string>;

const letter = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const q = (tab: string) => `'${tab.replace(/'/g, "''")}'`;

/* --------------------------------------------------------------- people */

interface LeadRow {
  id: number;
  level: string | null;
  stream: string | null;
  name: string | null;
  phone: string;
  rank: number | null;
  category: string | null;
  neet_score: number | null;
  domicile_state: string | null;
  gender: string | null;
  pwd: boolean | null;
  city: string | null;
  guardian_phone: string | null;
  preferred_branch: string | null;
  preferred_states: string | null;
  preferred_state: string | null;
  college_types: string | null;
  seat_types: string | null;
  quota_interest: string | null;
  budget_max: string | number | null;
  budget_total_max: string | number | null;
  attempt: string | null;
  mbbs_college: string | null;
  mbbs_state: string | null;
  internship_status: string | null;
  service_quota: boolean | null;
  bond_ok: string | null;
  source_page: string | null;
  message: string | null;
  lead_status: string;
  assigned_to: string | null;
  follow_up_on: string | null;
  follow_up_time: string | null;
  call_outcome: string | null;
  admin_notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Person {
  tab: TabKey;
  phone: string;
  rows: LeadRow[]; // oldest first
  latest: Record<string, unknown>; // newest non-empty value per field
  team: Team;
  contactedAt: string | null;
  priority: "Hot" | "Warm" | "Cold" | "—";
  callbackAt: string | null;
}

export const normPhone = (p: string) => {
  const d = String(p ?? "").replace(/\D/g, "");
  if (d.length === 10) return `+91${d}`;
  if (d.length === 12 && d.startsWith("91")) return `+${d}`;
  return d ? `+${d}` : "";
};

function tabOf(r: LeadRow): TabKey {
  if (r.stream === "bds") return "BDS";
  if (r.stream === "pg") return "PG";
  if (r.stream === "mbbs") return "MBBS";
  if (r.level === "pg") return "PG";
  return /\bBDS\b/i.test(`${r.source_page ?? ""} ${r.message ?? ""}`) ? "BDS" : "MBBS";
}

const IST = "Asia/Kolkata";
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
const dayOnly = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" });
const yesNo = (v: unknown) => (v === null || v === undefined ? "" : v ? "Yes" : "No");
const money = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};
const isoDate = (v: unknown) => (v ? String(v).slice(0, 10) : "");

const CALLBACK = /counselling request|exit offer|call ?back|contact page/i;

const FIELDS: { key: string; col: keyof LeadRow; label: string; fmt?: (v: unknown) => string }[] = [
  { key: "name", col: "name", label: "Name" },
  { key: "rank", col: "rank", label: "Rank", fmt: (v) => Number(v).toLocaleString("en-IN") },
  { key: "category", col: "category", label: "Category" },
  { key: "score", col: "neet_score", label: "Score" },
  { key: "domicile", col: "domicile_state", label: "Domicile" },
  { key: "gender", col: "gender", label: "Gender" },
  { key: "pwd", col: "pwd", label: "PwD", fmt: yesNo },
  { key: "city", col: "city", label: "City" },
  { key: "guardian", col: "guardian_phone", label: "Parent phone" },
  { key: "branches", col: "preferred_branch", label: "Branches" },
  { key: "states", col: "preferred_states", label: "States" },
  { key: "collegeTypes", col: "college_types", label: "College types" },
  { key: "seatTypes", col: "seat_types", label: "Seat types" },
  { key: "budgetYear", col: "budget_max", label: "Budget/yr", fmt: money },
  { key: "budgetTotal", col: "budget_total_max", label: "Budget total", fmt: money },
  { key: "attempt", col: "attempt", label: "Attempt" },
  { key: "mbbsCollege", col: "mbbs_college", label: "MBBS college" },
  { key: "mbbsState", col: "mbbs_state", label: "MBBS state" },
  { key: "internship", col: "internship_status", label: "Internship" },
  { key: "serviceQuota", col: "service_quota", label: "In-service", fmt: yesNo },
  { key: "bond", col: "bond_ok", label: "Bond" },
];

const PROFILE_KEYS = ["name", "rank", "category", "domicile", "gender", "branches", "states", "budgetYear", "budgetTotal", "city"];

function teamOf(r: LeadRow): Team {
  return {
    status: toLabel(r.lead_status),
    counsellor: r.assigned_to ?? "",
    followDate: isoDate(r.follow_up_on),
    followTime: r.follow_up_time ?? "",
    outcome: r.call_outcome ?? "",
    notes: r.admin_notes ?? "",
  };
}

export async function loadPeople(): Promise<Person[]> {
  const rows = (await db.execute(sql`
    SELECT id, level::text AS level, stream, name, phone, rank, category, neet_score, domicile_state, gender, pwd,
           city, guardian_phone, preferred_branch, preferred_states, preferred_state, college_types, seat_types,
           quota_interest, budget_max, budget_total_max, attempt, mbbs_college, mbbs_state, internship_status,
           service_quota, bond_ok, source_page, message, lead_status, assigned_to, follow_up_on::text AS follow_up_on,
           follow_up_time, call_outcome, admin_notes, last_contacted_at, created_at, updated_at
      FROM leads ORDER BY created_at ASC
  `)) as unknown as LeadRow[];

  const groups = new Map<string, LeadRow[]>();
  for (const r of rows) {
    const phone = normPhone(r.phone);
    if (!phone) continue;
    const k = `${tabOf(r)}|${phone}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  const now = Date.now();
  return [...groups.entries()].map(([k, list]) => {
    const [tab, phone] = k.split("|") as [TabKey, string];
    const latest: Record<string, unknown> = {};
    for (const f of FIELDS) {
      for (let i = list.length - 1; i >= 0; i--) {
        const v = list[i][f.col];
        if (v !== null && v !== undefined && v !== "") {
          latest[f.key] = v;
          break;
        }
      }
    }
    if (!latest.states) latest.states = [...list].reverse().find((r) => r.preferred_state)?.preferred_state ?? undefined;
    if (!latest.seatTypes) latest.seatTypes = [...list].reverse().find((r) => r.quota_interest)?.quota_interest ?? undefined;

    // The team's fields come from whichever enquiry the team touched last.
    const teamRow = [...list].sort((a, b) => +new Date(b.updated_at ?? b.created_at) - +new Date(a.updated_at ?? a.created_at))[0];
    const team = teamOf(teamRow);
    const contactedAt = list.map((r) => r.last_contacted_at).filter(Boolean).sort().pop() ?? null;
    const callbackRows = list.filter((r) => CALLBACK.test(r.source_page ?? ""));
    const callbackAt = callbackRows.length ? callbackRows[callbackRows.length - 1].created_at : null;

    // Hot / Warm / Cold: who a counsellor should ring first.
    const last = +new Date(list[list.length - 1].created_at);
    const filled = PROFILE_KEYS.filter((key) => latest[key] !== undefined).length / PROFILE_KEYS.length;
    let score = 0;
    if (callbackAt && now - +new Date(callbackAt) < 3 * 86400_000) score += 3;
    if (list.length >= 3) score += 2;
    else if (list.length === 2) score += 1;
    if (now - last < 86400_000) score += 2;
    else if (now - last < 3 * 86400_000) score += 1;
    if (filled >= 0.7) score += 1;
    if (latest.budgetYear || latest.budgetTotal) score += 1;
    if (team.status === "Interested" || team.status === "Follow-up") score += 1;
    const priority = CLOSED.includes(team.status) ? "—" : score >= 4 ? "Hot" : score >= 2 ? "Warm" : "Cold";

    return { tab, phone, rows: list, latest, team, contactedAt, priority, callbackAt };
  });
}

/** What changed between visits, field by field, in the order it happened. */
function history(p: Person): string {
  if (p.rows.length < 2) return "";
  const parts: string[] = [];
  for (const f of FIELDS) {
    const seen: { v: string; at: string }[] = [];
    for (const r of p.rows) {
      const raw = r[f.col];
      if (raw === null || raw === undefined || raw === "") continue;
      const v = f.fmt ? f.fmt(raw) : String(raw);
      if (seen[seen.length - 1]?.v !== v) seen.push({ v, at: r.created_at });
    }
    if (seen.length > 1) parts.push(`${f.label}: ${seen.map((s) => `${s.v} (${dayOnly(s.at)})`).join(" → ")}`);
  }
  const visits = p.rows.map((r) => `${dayOnly(r.created_at)} ${(r.source_page ?? "").replace(/^\//, "") || "—"}`);
  parts.push(`Visits: ${visits.join(" · ")}`);
  return parts.join("\n");
}

const RAW = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function studentValues(p: Person, serial: number, seatUrl: string | null): Record<string, string | number> {
  const L = p.latest;
  const fmt = (key: string) => {
    const f = FIELDS.find((x) => x.key === key)!;
    const v = L[key];
    return v === undefined ? "" : f.fmt ? f.fmt(v) : String(v);
  };
  const digits = p.phone.replace(/\D/g, "");
  const filled = PROFILE_KEYS.filter((key) => L[key] !== undefined).length;
  const sources = [...new Set(p.rows.map((r) => r.source_page).filter(Boolean))];
  return {
    serial,
    priority: p.priority,
    name: fmt("name") || "Not given",
    phone: `=HYPERLINK("tel:${p.phone}","${p.phone}")`,
    whatsapp: `=HYPERLINK("https://wa.me/${digits}","Chat")`,
    contacted: when(p.contactedAt),
    seatFinder: seatUrl ? `=HYPERLINK("${seatUrl}","Find seats")` : "",
    first: when(p.rows[0].created_at),
    last: when(p.rows[p.rows.length - 1].created_at),
    queries: p.rows.length,
    callback: when(p.callbackAt),
    rank: fmt("rank"),
    category: fmt("category"),
    score: fmt("score"),
    domicile: fmt("domicile"),
    gender: fmt("gender"),
    pwd: fmt("pwd"),
    city: fmt("city"),
    guardian: fmt("guardian") ? `'${fmt("guardian")}` : "",
    branches: fmt("branches"),
    states: fmt("states"),
    collegeTypes: fmt("collegeTypes"),
    seatTypes: fmt("seatTypes"),
    budgetYear: fmt("budgetYear"),
    budgetTotal: fmt("budgetTotal"),
    mbbsCollege: fmt("mbbsCollege"),
    mbbsState: fmt("mbbsState"),
    internship: fmt("internship"),
    serviceQuota: fmt("serviceQuota"),
    bond: fmt("bond"),
    source: sources.join(" · "),
    complete: `${Math.round((filled / PROFILE_KEYS.length) * 100)}%`,
    history: history(p),
    // The leading apostrophe keeps it text: entered as "+9193…", Sheets stores the
    // number 9193… and the row is never found again — which on 2026-10-16 wrote
    // every student once per run until it was caught.
    id: `'${p.phone}`,
  };
}

/* ------------------------------------------------------- reading the sheet */

/** Google's serial day (1899-12-30 = 0) to YYYY-MM-DD; a typed date string passes through. */
function sheetDate(v: unknown): string {
  if (typeof v === "number" && v > 20000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400_000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); // 17/10/2026, as India writes it
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const t = Date.parse(s);
  return Number.isNaN(t) ? "" : new Date(t + 6 * 3600_000).toISOString().slice(0, 10);
}

/** A time cell may come back as a fraction of a day or as the text that was chosen. */
function sheetTime(v: unknown): string {
  if (typeof v === "number" && v >= 0 && v < 1) {
    const mins = Math.round(v * 1440);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  }
  const s = String(v ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  return m ? `${Number(m[1])}:${m[2] ?? "00"} ${m[3]}` : s ? String(v).trim().slice(0, 12) : "";
}

const sameTeam = (a: Team | null | undefined, b: Team) => !!a && TEAM_KEYS.every((k) => (a[k] ?? "") === (b[k] ?? ""));
const hash = (v: unknown) => createHash("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 16);

/* ------------------------------------------------------------- the layout */

interface SheetProps {
  sheetId: number;
  title: string;
  gridProperties?: { rowCount?: number; columnCount?: number };
}

async function spreadsheet(id: string) {
  return sheets<{
    sheets: { properties: SheetProps; conditionalFormats?: unknown[]; protectedRanges?: { protectedRangeId: number; description?: string }[] }[];
  }>(`${id}?fields=sheets(properties(sheetId,title,gridProperties),conditionalFormats,protectedRanges(protectedRangeId,description))`);
}

const AUTO_NOTE = "AdmissionHands: filled automatically";

/**
 * A warning (not a lock) on every column we write: a counsellor typing there is
 * told the next sync will overwrite it. Replaces its own earlier ranges.
 */
function protectRequests(props: SheetProps, cols: Col[], existing: { protectedRangeId: number; description?: string }[]) {
  const req: unknown[] = existing
    .filter((r) => r.description === AUTO_NOTE)
    .map((r) => ({ deleteProtectedRange: { protectedRangeId: r.protectedRangeId } }));
  let start = -1;
  cols.forEach((c, i) => {
    const auto = !c.kind;
    if (auto && start < 0) start = i;
    if ((!auto || i === cols.length - 1) && start >= 0) {
      const end = auto ? i + 1 : i;
      req.push({
        addProtectedRange: {
          protectedRange: { range: { sheetId: props.sheetId, startColumnIndex: start, endColumnIndex: end }, description: AUTO_NOTE, warningOnly: true },
        },
      });
      start = -1;
    }
  });
  return req;
}

const HEADER_BG = { red: 0.04, green: 0.45, blue: 0.56 };
const TEAM_BG = { red: 0.08, green: 0.55, blue: 0.33 };
const WHITE = { red: 1, green: 1, blue: 1 };

/** Header, widths, frozen panes, dropdowns, colours. Safe to run again; it replaces its own rules. */
function layoutRequests(props: SheetProps, cols: Col[], rows: number, cfCount: number) {
  const sid = props.sheetId;
  const idx = (k: string) => cols.findIndex((c) => c.key === k);
  const req: unknown[] = [];
  const range = (k: string) => ({ sheetId: sid, startRowIndex: 1, endRowIndex: Math.max(rows + 200, 1000), startColumnIndex: idx(k), endColumnIndex: idx(k) + 1 });
  const list = (values: string[]) => ({ condition: { type: "ONE_OF_LIST", values: values.map((v) => ({ userEnteredValue: v })) }, showCustomUi: true, strict: false });

  req.push({
    updateSheetProperties: {
      properties: { sheetId: sid, gridProperties: { frozenRowCount: 1, frozenColumnCount: 4 } },
      fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount",
    },
  });
  cols.forEach((c, i) => {
    req.push({
      updateDimensionProperties: {
        range: { sheetId: sid, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: c.width, hiddenByUser: c.key === "id" },
        fields: "pixelSize,hiddenByUser",
      },
    });
    req.push({
      repeatCell: {
        range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1, startColumnIndex: i, endColumnIndex: i + 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: c.kind ? TEAM_BG : HEADER_BG,
            textFormat: { bold: true, foregroundColor: WHITE },
            wrapStrategy: "WRAP",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment)",
      },
    });
  });
  req.push({
    updateDimensionProperties: { range: { sheetId: sid, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 40 }, fields: "pixelSize" },
  });
  // Notes and the history wrap; everything else stays one line.
  for (const k of ["notes", "history"]) {
    req.push({ repeatCell: { range: range(k), cell: { userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP" } }, fields: "userEnteredFormat(wrapStrategy,verticalAlignment)" } });
  }
  req.push({ setDataValidation: { range: range("status"), rule: { ...list(STATUS_LABELS), strict: true } } });
  req.push({ setDataValidation: { range: range("counsellor"), rule: list(COUNSELLORS) } });
  req.push({ setDataValidation: { range: range("outcome"), rule: list(OUTCOMES) } });
  req.push({ setDataValidation: { range: range("followTime"), rule: list(FOLLOW_TIMES) } });
  req.push({ setDataValidation: { range: range("followDate"), rule: { condition: { type: "DATE_IS_VALID" }, strict: true } } });
  req.push({ repeatCell: { range: range("followDate"), cell: { userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd mmm yyyy" } } }, fields: "userEnteredFormat.numberFormat" } });
  // A time chosen from the list must stay the words "4:30 PM", not become a clock value.
  req.push({ repeatCell: { range: range("followTime"), cell: { userEnteredFormat: { numberFormat: { type: "TEXT" } } }, fields: "userEnteredFormat.numberFormat" } });

  // Colours: replace our own rules every time rather than piling them up.
  for (let i = 0; i < cfCount; i++) req.push({ deleteConditionalFormatRule: { sheetId: sid, index: 0 } });
  const whole = { sheetId: sid, startRowIndex: 1, endRowIndex: Math.max(rows + 200, 1000), startColumnIndex: 0, endColumnIndex: cols.length };
  const L = (k: string) => letter(idx(k));
  const rule = (r: unknown[], formula: string, bg: { red: number; green: number; blue: number }, fg?: { red: number; green: number; blue: number }, bold = false) => ({
    addConditionalFormatRule: {
      index: 0,
      rule: {
        ranges: r,
        booleanRule: {
          condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: formula }] },
          format: { backgroundColor: bg, ...(fg || bold ? { textFormat: { ...(fg ? { foregroundColor: fg } : {}), bold } } : {}) },
        },
      },
    },
  });
  const one = (k: string) => [{ ...whole, startColumnIndex: idx(k), endColumnIndex: idx(k) + 1 }];
  // Added in reverse priority (each goes in at index 0, the top).
  req.push(rule([whole], `=OR($${L("status")}2="Not interested",$${L("status")}2="Wrong number")`, { red: 0.95, green: 0.95, blue: 0.95 }, { red: 0.5, green: 0.5, blue: 0.5 }));
  req.push(rule([whole], `=$${L("status")}2="Converted"`, { red: 0.85, green: 0.95, blue: 0.87 }));
  req.push(rule(one("priority"), `=$${L("priority")}2="Cold"`, { red: 0.91, green: 0.93, blue: 0.96 }, { red: 0.3, green: 0.36, blue: 0.45 }, true));
  req.push(rule(one("priority"), `=$${L("priority")}2="Warm"`, { red: 1, green: 0.93, blue: 0.75 }, { red: 0.6, green: 0.38, blue: 0 }, true));
  req.push(rule(one("priority"), `=$${L("priority")}2="Hot"`, { red: 0.99, green: 0.82, blue: 0.82 }, { red: 0.7, green: 0.07, blue: 0.07 }, true));
  req.push(rule(one("status"), `=$${L("status")}2="Not contacted"`, { red: 1, green: 0.96, blue: 0.85 }, { red: 0.55, green: 0.35, blue: 0 }, true));
  req.push(rule(one("followDate"), `=AND($${L("followDate")}2<>"",$${L("followDate")}2=TODAY())`, { red: 1, green: 0.93, blue: 0.75 }, undefined, true));
  req.push(
    rule(
      one("followDate"),
      `=AND($${L("followDate")}2<>"",$${L("followDate")}2<TODAY(),$${L("status")}2<>"Converted",$${L("status")}2<>"Not interested",$${L("status")}2<>"Wrong number")`,
      { red: 0.99, green: 0.8, blue: 0.8 },
      { red: 0.7, green: 0.07, blue: 0.07 },
      true,
    ),
  );
  return req;
}

async function ensureTab(id: string, title: string, columnCount: number, existing: SheetProps[]) {
  const have = existing.find((s) => s.title === title);
  if (have) {
    if ((have.gridProperties?.columnCount ?? 0) < columnCount) {
      await sheets(`${id}:batchUpdate`, {
        method: "POST",
        body: { requests: [{ appendDimension: { sheetId: have.sheetId, dimension: "COLUMNS", length: columnCount - (have.gridProperties?.columnCount ?? 0) } }] },
      });
    }
    return have;
  }
  const r = await sheets<{ replies: { addSheet: { properties: SheetProps } }[] }>(`${id}:batchUpdate`, {
    method: "POST",
    body: { requests: [{ addSheet: { properties: { title, gridProperties: { rowCount: 1000, columnCount: Math.max(columnCount, 12) } } } }] },
  });
  return r.replies[0].addSheet.properties;
}

/* ------------------------------------------------------------------ sync */

export interface SheetReport {
  ok: boolean;
  skipped?: string;
  added: Record<string, number>;
  updated: Record<string, number>;
  fromSheet: number;
  toSheet: number;
  logged: number;
  counselor?: { sent: number; failed: number };
  error?: string;
}

/** Applies a counsellor's sheet edit to every enquiry of that student. */
async function applyTeam(p: Person, t: Team) {
  const ids = p.rows.map((r) => r.id);
  const status = fromLabel(t.status);
  const followChanged = t.followDate !== p.team.followDate || t.followTime !== p.team.followTime;
  await db.execute(sql`
    UPDATE leads SET
      lead_status    = ${status},
      assigned_to    = ${t.counsellor.trim() || null},
      follow_up_on   = ${t.followDate || null}::date,
      follow_up_time = ${t.followTime || null},
      call_outcome   = ${t.outcome.trim() || null},
      admin_notes    = ${t.notes.trim() || null},
      is_read        = true,
      last_contacted_at = CASE WHEN ${status} <> 'New' THEN COALESCE(last_contacted_at, now()) ELSE last_contacted_at END,
      follow_up_reminded_at = CASE WHEN ${followChanged} THEN NULL ELSE follow_up_reminded_at END,
      updated_at = now()
    WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
  `);
}

/** An admin edit to one enquiry is copied to the student's other enquiries. */
async function spreadTeam(p: Person) {
  if (p.rows.length < 2) return;
  const t = p.team;
  const ids = p.rows.map((r) => r.id);
  await db.execute(sql`
    UPDATE leads SET lead_status = ${fromLabel(t.status)}, assigned_to = ${t.counsellor || null},
           follow_up_on = ${t.followDate || null}::date, follow_up_time = ${t.followTime || null},
           call_outcome = ${t.outcome || null}, admin_notes = ${t.notes || null}
     WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
       AND (lead_status IS DISTINCT FROM ${fromLabel(t.status)} OR assigned_to IS DISTINCT FROM ${t.counsellor || null}
            OR follow_up_on IS DISTINCT FROM ${t.followDate || null}::date OR follow_up_time IS DISTINCT FROM ${t.followTime || null}
            OR call_outcome IS DISTINCT FROM ${t.outcome || null} OR admin_notes IS DISTINCT FROM ${t.notes || null})
  `);
}

export async function syncSheet(): Promise<SheetReport> {
  const report: SheetReport = { ok: true, added: {}, updated: {}, fromSheet: 0, toSheet: 0, logged: 0 };
  const id = await getIntegration("google.sheets.leads_id");
  if (!id) return { ...report, ok: false, skipped: "No spreadsheet id saved (google.sheets.leads_id)." };

  // One run at a time: a slow run must not overlap the next cron tick. A lease
  // row, not pg_advisory_lock — an advisory lock belongs to a connection, the
  // pool hands the next run that same connection, and the lock is re-entrant,
  // so two runs both "got" it on 2026-10-16 and every student was written twice.
  if (!(await takeLease())) return { ...report, ok: false, skipped: "Another sync is running." };

  try {
    let meta = await spreadsheet(id);
    const tabs: { key: TabKey; title: string; cols: Col[]; props: SheetProps }[] = [];
    for (const key of Object.keys(TABS) as TabKey[]) {
      const cols = colsFor(key);
      const props = await ensureTab(id, TABS[key], cols.length, meta.sheets.map((s) => s.properties));
      tabs.push({ key, title: TABS[key], cols, props });
    }
    const logProps = await ensureTab(id, LOG_TAB, LOG_COLS.length, meta.sheets.map((s) => s.properties));
    const todayProps = await ensureTab(id, TODAY_TAB, TODAY_COLS.length, meta.sheets.map((s) => s.properties));
    meta = await spreadsheet(id);

    const people = await loadPeople();
    const known = (await db.execute(sql`SELECT tab, phone, serial, team, row_hash, counselor_url FROM sheet_people`)) as unknown as {
      tab: TabKey; phone: string; serial: number; team: Team | string | null; row_hash: string | null; counselor_url: string | null;
    }[];
    const knownMap = new Map(known.map((k) => [`${k.tab}|${k.phone}`, { ...k, team: typeof k.team === "string" ? (JSON.parse(k.team) as Team) : k.team }]));

    for (const tab of tabs) {
      const cols = tab.cols;
      const ci = (k: string) => cols.findIndex((c) => c.key === k);
      const last = letter(cols.length - 1);
      const read = await sheets<{ valueRanges: { values?: unknown[][] }[] }>(
        `${id}/values:batchGet?ranges=${encodeURIComponent(`${q(tab.title)}!A1:${last}`)}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
      );
      const grid = read.valueRanges[0]?.values ?? [];
      const headerOk = cols.every((c, i) => (grid[0]?.[i] ?? "") === c.header);
      const rowOf = new Map<string, { row: number; team: Team }>();
      grid.slice(1).forEach((r, i) => {
        const key = normPhone(String(r[ci("id")] ?? "").trim());
        if (!key) return;
        rowOf.set(key, {
          row: i + 2,
          team: {
            status: String(r[ci("status")] ?? "").trim() || "Not contacted",
            counsellor: String(r[ci("counsellor")] ?? "").trim(),
            followDate: sheetDate(r[ci("followDate")]),
            followTime: sheetTime(r[ci("followTime")]),
            outcome: String(r[ci("outcome")] ?? "").trim(),
            notes: String(r[ci("notes")] ?? "").trim(),
          },
        });
      });

      const mine = people.filter((p) => p.tab === tab.key);
      const writes: { range: string; values: unknown[][] }[] = [];
      const fresh: Person[] = [];
      let updated = 0;
      let maxSerial = Math.max(0, ...known.filter((k) => k.tab === tab.key).map((k) => k.serial));

      for (const p of mine) {
        const k = knownMap.get(`${tab.key}|${p.phone}`);
        const at = rowOf.get(p.phone);
        if (!at) {
          fresh.push(p);
          continue;
        }
        // Which side moved since the last sync?
        let team = p.team;
        if (k?.team && !sameTeam(k.team, at.team)) {
          await applyTeam(p, at.team);
          team = at.team;
          report.fromSheet++;
        } else if (!sameTeam(at.team, p.team)) {
          if (k?.team && !sameTeam(k.team, p.team)) {
            // The admin changed it: send it to the sheet.
            const row = cols.slice(ci("status"), ci("notes") + 1).map((c) => (TEAM_KEYS as readonly string[]).includes(c.key) ? p.team[c.key as keyof Team] : null);
            writes.push({ range: `${q(tab.title)}!${letter(ci("status"))}${at.row}:${letter(ci("notes"))}${at.row}`, values: [row] });
            report.toSheet++;
          } else {
            // First sight of a row that pre-dates our snapshot: the sheet is the counsellor's word.
            await applyTeam(p, at.team);
            team = at.team;
            report.fromSheet++;
          }
        }
        await spreadTeam({ ...p, team });

        const serial = k?.serial ?? ++maxSerial;
        const values = studentValues({ ...p, team }, serial, k?.counselor_url ?? null);
        const h = hash(values);
        if (h !== k?.row_hash || !headerOk) {
          // Our columns only, in the runs either side of the counsellor's.
          const run = (from: string, to: string) => ({
            range: `${q(tab.title)}!${letter(ci(from))}${at.row}:${letter(ci(to))}${at.row}`,
            values: [cols.slice(ci(from), ci(to) + 1).map((c) => values[c.key] ?? "")],
          });
          writes.push(run("serial", "whatsapp"), run("contacted", "contacted"), run(cols[ci("notes") + 1].key, "id"));
          updated++;
        }
        if (!k || k.row_hash !== h || !sameTeam(k.team, team)) {
          await db.execute(sql`
            INSERT INTO sheet_people (tab, phone, serial, team, row_hash, synced_at)
            VALUES (${tab.key}, ${p.phone}, ${serial}, ${JSON.stringify(team)}::jsonb, ${h}, now())
            ON CONFLICT (tab, phone) DO UPDATE SET serial = EXCLUDED.serial, team = EXCLUDED.team, row_hash = EXCLUDED.row_hash, synced_at = now()
          `);
        }
      }

      if (!headerOk) writes.push({ range: `${q(tab.title)}!A1:${last}1`, values: [cols.map((c) => c.header)] });
      if (writes.length) {
        await sheets(`${id}/values:batchUpdate`, { method: "POST", body: { valueInputOption: "USER_ENTERED", data: writes } });
      }

      // New students go in at the top, newest first, below the header.
      if (fresh.length) {
        fresh.sort((a, b) => +new Date(a.rows[0].created_at) - +new Date(b.rows[0].created_at));
        const serials = new Map(fresh.map((p) => [p.phone, knownMap.get(`${tab.key}|${p.phone}`)?.serial ?? ++maxSerial]));
        const ordered = [...fresh].reverse();
        await sheets(`${id}:batchUpdate`, {
          method: "POST",
          body: { requests: [{ insertDimension: { range: { sheetId: tab.props.sheetId, dimension: "ROWS", startIndex: 1, endIndex: 1 + ordered.length }, inheritFromBefore: false } }] },
        });
        const rows = ordered.map((p) => {
          const v = studentValues(p, serials.get(p.phone)!, null);
          return cols.map((c) => ((TEAM_KEYS as readonly string[]).includes(c.key) ? p.team[c.key as keyof Team] : v[c.key] ?? ""));
        });
        await sheets(`${id}/values:batchUpdate`, {
          method: "POST",
          body: { valueInputOption: "USER_ENTERED", data: [{ range: `${q(tab.title)}!A2:${last}${1 + rows.length}`, values: rows }] },
        });
        for (const p of ordered) {
          const v = studentValues(p, serials.get(p.phone)!, null);
          await db.execute(sql`
            INSERT INTO sheet_people (tab, phone, serial, team, row_hash, synced_at)
            VALUES (${tab.key}, ${p.phone}, ${serials.get(p.phone)!}, ${JSON.stringify(p.team)}::jsonb, ${hash(v)}, now())
            ON CONFLICT (tab, phone) DO UPDATE SET serial = EXCLUDED.serial, team = EXCLUDED.team, row_hash = EXCLUDED.row_hash, synced_at = now()
          `);
        }
      }

      // Formats and dropdowns when the shape changed (a new tab, a new column, new rows).
      const live = meta.sheets.find((s) => s.properties.sheetId === tab.props.sheetId);
      const unprotected = !(live?.protectedRanges ?? []).some((r) => r.description === AUTO_NOTE);
      if (fresh.length || !headerOk || unprotected) {
        await sheets(`${id}:batchUpdate`, {
          method: "POST",
          body: {
            requests: [
              ...layoutRequests(tab.props, cols, rowOf.size + fresh.length, live?.conditionalFormats?.length ?? 0),
              ...(headerOk && !unprotected ? [] : protectRequests(tab.props, cols, live?.protectedRanges ?? [])),
            ],
          },
        });
      }
      report.added[tab.key] = fresh.length;
      report.updated[tab.key] = updated;
    }

    await writeGuide(id, meta.sheets.map((s) => s.properties));
    report.logged = await syncLog(id, logProps);
    await writeToday(id, todayProps, await loadPeople());
    return report;
  } catch (error) {
    logError(error, { route: "leadSheet.sync" });
    return { ...report, ok: false, error: String((error as Error)?.message ?? error).slice(0, 300) };
  } finally {
    await db.execute(sql`UPDATE integrations SET updated_at = now() - interval '1 hour' WHERE key = ${LEASE}`);
  }
}

const LEASE = "lease.sheet-sync";

/** Taken only if free or stale (a run that died holding it frees it after 4 minutes). */
async function takeLease(): Promise<boolean> {
  const got = (await db.execute(sql`
    INSERT INTO integrations (key, value, is_secret, updated_at) VALUES (${LEASE}, 'held', false, now())
    ON CONFLICT (key) DO UPDATE SET value = 'held', updated_at = now()
      WHERE integrations.updated_at < now() - interval '4 minutes'
    RETURNING key
  `)) as unknown as unknown[];
  return got.length > 0;
}

/* ------------------------------------------------------ the enquiry log */

const LOG_COLS = ["Enquiry #", "Date & time", "Course", "Name", "Phone", "Rank", "Category", "Branches", "States", "Budget / year", "Came from", "Message"];

async function syncLog(id: string, props: SheetProps): Promise<number> {
  const since = Number((await getIntegration("google.sheets.last_lead_id")) ?? 0);
  const rows = (await db.execute(sql`
    SELECT id, level::text AS level, stream, name, phone, rank, category, preferred_branch, preferred_states, preferred_state,
           budget_max, source_page, message, created_at
      FROM leads WHERE id > ${since} ORDER BY id DESC LIMIT 2000
  `)) as unknown as (LeadRow & { id: number })[];

  const head = await sheets<{ values?: unknown[][] }>(`${id}/values/${encodeURIComponent(`${q(LOG_TAB)}!A1:L1`)}`);
  const requests: unknown[] = [];
  if ((head.values?.[0]?.[0] ?? "") !== LOG_COLS[0]) {
    await sheets(`${id}/values/${encodeURIComponent(`${q(LOG_TAB)}!A1:L1`)}?valueInputOption=RAW`, { method: "PUT", body: { values: [LOG_COLS] } });
    requests.push(
      { updateSheetProperties: { properties: { sheetId: props.sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
      {
        repeatCell: {
          range: { sheetId: props.sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { backgroundColor: HEADER_BG, textFormat: { bold: true, foregroundColor: WHITE } } },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      ...[80, 150, 70, 170, 130, 86, 84, 220, 200, 110, 260, 320].map((w, i) => ({
        updateDimensionProperties: { range: { sheetId: props.sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: w }, fields: "pixelSize" },
      })),
    );
  }
  if (!rows.length) {
    if (requests.length) await sheets(`${id}:batchUpdate`, { method: "POST", body: { requests } });
    return 0;
  }
  requests.push({ insertDimension: { range: { sheetId: props.sheetId, dimension: "ROWS", startIndex: 1, endIndex: 1 + rows.length }, inheritFromBefore: false } });
  await sheets(`${id}:batchUpdate`, { method: "POST", body: { requests } });
  const values = rows.map((r) => [
    r.id,
    when(r.created_at),
    TABS[tabOf(r)],
    r.name ?? "",
    normPhone(r.phone),
    r.rank != null ? Number(r.rank).toLocaleString("en-IN") : "",
    r.category ?? "",
    r.preferred_branch ?? "",
    r.preferred_states ?? r.preferred_state ?? "",
    money(r.budget_max),
    r.source_page ?? "",
    (r.message ?? "").slice(0, 500),
  ]);
  await sheets(`${id}/values:batchUpdate`, {
    method: "POST",
    body: { valueInputOption: "RAW", data: [{ range: `${q(LOG_TAB)}!A2:L${1 + values.length}`, values }] },
  });
  await setIntegration("google.sheets.last_lead_id", String(rows[0].id));
  return rows.length;
}

/* ------------------------------------------------------------ the Today tab */

const TODAY_COLS = ["Why now", "Priority", "Course", "Name", "Phone", "Counsellor", "Status", "Follow-up", "Notes", "Rank", "Last query"];

export function followAt(date: string, time: string): Date | null {
  if (!date) return null;
  const m = time.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  let h = 10;
  let min = 0;
  if (m) {
    h = (Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0);
    min = Number(m[2]);
  }
  return new Date(`${date}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00+05:30`);
}

async function writeToday(id: string, props: SheetProps, people: Person[]) {
  const now = Date.now();
  const todayIst = new Date(now + 5.5 * 3600_000).toISOString().slice(0, 10);
  const open = people.filter((p) => !CLOSED.includes(p.team.status));
  const due = open
    .filter((p) => p.team.followDate && p.team.followDate <= todayIst)
    .map((p) => ({ p, at: followAt(p.team.followDate, p.team.followTime)! }))
    .sort((a, b) => +a.at - +b.at);
  const dueSet = new Set(due.map((d) => d.p));
  const fresh = open
    .filter((p) => !dueSet.has(p) && p.team.status === "Not contacted" && p.priority !== "Cold")
    .sort((a, b) => (a.priority === b.priority ? +new Date(b.rows[b.rows.length - 1].created_at) - +new Date(a.rows[a.rows.length - 1].created_at) : a.priority === "Hot" ? -1 : 1))
    .slice(0, 60);

  const line = (p: Person, why: string) => [
    why,
    p.priority,
    TABS[p.tab],
    String(p.latest.name ?? "Not given"),
    `=HYPERLINK("tel:${p.phone}","${p.phone}")`,
    p.team.counsellor,
    p.team.status,
    p.team.followDate ? `${p.team.followDate.split("-").reverse().join("-")} ${p.team.followTime}`.trim() : "",
    p.team.notes,
    p.latest.rank != null ? Number(p.latest.rank).toLocaleString("en-IN") : "",
    when(p.rows[p.rows.length - 1].created_at),
  ];
  const rows = [
    ...due.map(({ p, at }) => line(p, +at < now - 3600_000 ? "Overdue follow-up" : "Follow-up today")),
    ...fresh.map((p) => line(p, p.priority === "Hot" ? "Hot — not contacted" : "Warm — not contacted")),
  ];
  const stamp = `Updated ${new Date().toLocaleString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })} — read-only, work in the course tabs`;

  await sheets(`${id}/values/${encodeURIComponent(`${q(TODAY_TAB)}!A1:K2000`)}:clear`, { method: "POST", body: {} });
  await sheets(`${id}/values:batchUpdate`, {
    method: "POST",
    body: {
      valueInputOption: "USER_ENTERED",
      data: [{ range: `${q(TODAY_TAB)}!A1:K${2 + rows.length}`, values: [TODAY_COLS, ...rows, ...(rows.length ? [] : [["Nothing due right now."]]), [stamp]] }],
    },
  });
  await sheets(`${id}:batchUpdate`, {
    method: "POST",
    body: {
      requests: [
        { updateSheetProperties: { properties: { sheetId: props.sheetId, index: 0, gridProperties: { frozenRowCount: 1 } }, fields: "index,gridProperties.frozenRowCount" } },
        {
          repeatCell: {
            range: { sheetId: props.sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { backgroundColor: HEADER_BG, textFormat: { bold: true, foregroundColor: WHITE } } },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
        ...[150, 70, 90, 170, 130, 120, 110, 130, 280, 86, 150].map((w, i) => ({
          updateDimensionProperties: { range: { sheetId: props.sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: w }, fields: "pixelSize" },
        })),
      ],
    },
  });
}

/** The sheet's address, for messages to the team. */
export async function sheetUrl(): Promise<string | null> {
  const id = await getIntegration("google.sheets.leads_id");
  return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : null;
}

/* ------------------------------------------------- the AH Counselor app */

/** The sheet's status, in the words the counsellor app's sync endpoint accepts. */
const COUNSELOR_STATUS: Record<string, string> = {
  "Not contacted": "new",
  Contacted: "contacted",
  Interested: "interested",
  "Follow-up": "follow-up",
  Converted: "converted",
  "Not interested": "not-interested",
  "Wrong number": "wrong-number",
};

const list = (v: unknown) =>
  String(v ?? "")
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
const inRange = (v: unknown, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : undefined;
};

function counselorPayload(p: Person) {
  const L = p.latest;
  const attempt = inRange(String(L.attempt ?? "").match(/\d+/)?.[0], 1, 10);
  const body: Record<string, unknown> = {
    // The app is the NEET PG seat finder and refuses anything else (zyn-4a, 2026-10-16).
    exam: "NEET PG",
    phone: p.phone,
    name: L.name,
    guardian_phone: L.guardian,
    city: L.city,
    sex: L.gender,
    category: L.category,
    is_pwd: L.pwd === true ? true : undefined,
    neet_air: inRange(L.rank, 1, 300000),
    neet_score: inRange(L.score, -200, 800),
    attempt,
    domicile_state: L.domicile,
    mbbs_state: L.mbbsState,
    mbbs_college: L.mbbsCollege,
    internship_done: L.internship,
    is_inservice: L.serviceQuota === true ? true : undefined,
    branch_prefs: list(L.branches),
    state_prefs: list(L.states),
    budget_max: inRange(L.budgetYear, 1, 1e10),
    budget_total: inRange(L.budgetTotal, 1, 1e11),
    bond_ok: L.bond,
    status: COUNSELOR_STATUS[p.team.status] ?? "new",
    counsellor: p.team.counsellor || null,
    first_query_at: p.rows[0].created_at,
    last_query_at: p.rows[p.rows.length - 1].created_at,
    query_count: p.rows.length,
    source: "website",
  };
  for (const k of Object.keys(body)) {
    const v = body[k];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) delete body[k];
  }
  return body;
}

/**
 * Every NEET PG student into the AH Counselor app (ah.aismartscan.in) as a
 * client, kept in step: details sparse (a blank never overwrites what a
 * counsellor typed there), status always. The id and Find-seats link it
 * returns become the sheet's "Seat finder" column. MBBS and BDS are not sent —
 * that app is the PG seat finder. At most 50 calls a run; the rest follow.
 */
export async function syncCounselor(): Promise<{ sent: number; failed: number; skipped?: string }> {
  const [url, key] = await Promise.all([getIntegration("counselor.sync_url"), getIntegration("counselor.sync_key")]);
  if (!url || !key) return { sent: 0, failed: 0, skipped: "counselor sync not configured" };

  const known = (await db.execute(sql`
    SELECT phone, counselor_hash FROM sheet_people WHERE tab = 'PG'
  `)) as unknown as { phone: string; counselor_hash: string | null }[];
  const seen = new Map(known.map((k) => [k.phone, k.counselor_hash]));

  const out = { sent: 0, failed: 0 };
  // Only students the sheet already has a row for, so the link has somewhere to go.
  const due = (await loadPeople())
    .filter((p) => p.tab === "PG" && seen.has(p.phone))
    .map((p) => ({ p, body: counselorPayload(p) }))
    .filter(({ p, body }) => seen.get(p.phone) !== hash(body))
    .slice(0, 50);

  for (const { p, body } of due) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ah-sync-key": key },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; id?: number; url?: string; detail?: string };
      if (r.status === 401 || r.status === 503) {
        // A bad key or their database down: every call would fail the same way.
        logError(new Error(`Counselor sync stopped: ${r.status} ${j.detail ?? ""}`), { route: "leadSheet.counselor" });
        out.failed++;
        break;
      }
      if (!r.ok || !j.ok || !j.id) {
        out.failed++;
        logError(new Error(`Counselor sync refused ${p.phone.slice(-4)}: ${r.status} ${j.detail ?? ""}`), { route: "leadSheet.counselor" });
        // Remember the refusal so a bad record is not retried every two minutes.
        await db.execute(sql`UPDATE sheet_people SET counselor_hash = ${hash(body)} WHERE tab = 'PG' AND phone = ${p.phone}`);
        continue;
      }
      await db.execute(sql`
        UPDATE sheet_people SET counselor_id = ${j.id}, counselor_url = ${j.url ?? null}, counselor_hash = ${hash(body)}
         WHERE tab = 'PG' AND phone = ${p.phone}
      `);
      out.sent++;
    } catch (error) {
      out.failed++;
      logError(error, { route: "leadSheet.counselor" });
      break;
    }
  }
  return out;
}

/* ------------------------------------------------------- the guide tab */

const GUIDE_TAB = "How to use";
const GUIDE = [
  ["How this sheet works"],
  [""],
  ["One row per student, per course", "MBBS, PG (MD-MS) and BDS each have a tab. A student who used the website five times is still one row: 'Queries' says 5, and 'Earlier answers' shows what they changed, with dates. New students appear at the top within 2 minutes."],
  ["Your columns (green headers, ✎)", "Status, Counsellor, Follow-up date, Follow-up time, Call outcome, Notes. Everything else is filled in automatically — editing it shows a warning, and the next sync puts it back."],
  ["Status", "Starts as 'Not contacted'. Change it after the call: 'Contacted on' fills itself, and the admin panel updates within 2 minutes. Converted / Not interested / Wrong number take the student off the call lists."],
  ["Follow-up reminders", "Pick a date AND a time: a WhatsApp reminder goes out at that time — to the counsellor chosen (Gulshan or Dev), to both if it is anyone else. A date without a time shows up in the 10 AM message instead."],
  ["10 AM message", "Every morning Gulshan and Dev get today's follow-ups, anything overdue, and the hot students nobody has called yet."],
  ["Priority", "Hot = call first (asked for a call-back, came back several times, or came in today with a full profile). Warm = call today. Cold = call when free."],
  ["Colours", "Red priority = Hot · Yellow = Warm · Grey = Cold. Yellow status = not contacted yet. Yellow follow-up date = today, red = overdue. Green row = converted, grey row = closed."],
  ["Today tab", "Who to call now: due follow-ups first, then hot and warm students not yet contacted. Rewritten every 2 minutes — do the work in the course tabs."],
  ["All enquiries tab", "Every form a student submitted, one line each, newest first. Nothing to edit there."],
  ["Seat finder (PG tab)", "Opens the student in the AH Counselor seat finder with their profile filled in. New students there belong to the AdmissionHands admin login."],
  ["Sorting and filters", "Sort or filter freely — rows are matched by phone, not by position. To remove a lead, do it in the admin panel; a row deleted here comes back."],
  ["Privacy", "This sheet holds students' phone numbers. Share it only with the team, by email — never 'Anyone with the link'."],
];

async function writeGuide(id: string, tabs: SheetProps[]) {
  let tab = tabs.find((t) => t.title === GUIDE_TAB);
  if (!tab) {
    // Reuse the spreadsheet's empty starter tab rather than leave it lying about.
    const starter = tabs.find((t) => /^sheet\s?1$/i.test(t.title));
    if (starter) {
      const r = await sheets<{ values?: unknown[][] }>(`${id}/values/${encodeURIComponent(`${q(starter.title)}!A1:Z20`)}`);
      if (!(r.values ?? []).some((row) => row.some((c) => String(c ?? "").trim()))) {
        await sheets(`${id}:batchUpdate`, {
          method: "POST",
          body: { requests: [{ updateSheetProperties: { properties: { sheetId: starter.sheetId, title: GUIDE_TAB }, fields: "title" } }] },
        });
        tab = { ...starter, title: GUIDE_TAB };
      }
    }
    if (!tab) tab = await ensureTab(id, GUIDE_TAB, 2, tabs);
  }
  const head = await sheets<{ values?: unknown[][] }>(`${id}/values/${encodeURIComponent(`${q(GUIDE_TAB)}!A1:A1`)}`);
  if ((head.values?.[0]?.[0] ?? "") === GUIDE[0][0]) return;
  await sheets(`${id}/values/${encodeURIComponent(`${q(GUIDE_TAB)}!A1:B${GUIDE.length}`)}?valueInputOption=RAW`, { method: "PUT", body: { values: GUIDE } });
  await sheets(`${id}:batchUpdate`, {
    method: "POST",
    body: {
      requests: [
        { updateSheetProperties: { properties: { sheetId: tab.sheetId, index: 1 }, fields: "index" } },
        { updateDimensionProperties: { range: { sheetId: tab.sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 230 }, fields: "pixelSize" } },
        { updateDimensionProperties: { range: { sheetId: tab.sheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 720 }, fields: "pixelSize" } },
        {
          repeatCell: {
            range: { sheetId: tab.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
            cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14 } } },
            fields: "userEnteredFormat.textFormat",
          },
        },
        {
          repeatCell: {
            range: { sheetId: tab.sheetId, startRowIndex: 2, endRowIndex: GUIDE.length, startColumnIndex: 0, endColumnIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true }, verticalAlignment: "TOP" } },
            fields: "userEnteredFormat(textFormat,verticalAlignment)",
          },
        },
        {
          repeatCell: {
            range: { sheetId: tab.sheetId, startRowIndex: 2, endRowIndex: GUIDE.length, startColumnIndex: 1, endColumnIndex: 2 },
            cell: { userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP" } },
            fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
          },
        },
      ],
    },
  });
}
