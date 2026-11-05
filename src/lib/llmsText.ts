/**
 * The text of /llms.txt and /llms-full.txt — the plain-text map of the site that AI assistants and agents read
 * (llmstxt.org), built from live data.
 *
 * /llms.txt (2026-10-21) replaced a hand-typed file that still described the predictor as showing "every seat it
 * reached, by round" — untrue since the 2026-10-12 chance-view rule, and an assistant repeats what it reads here to
 * students. Since 2026-11-05 it also names every state with NMC's MBBS seats, every PG state and branch, and the state
 * counsellings whose round of the running year is out, so an assistant answering "mbbs seats in karnataka" or "md
 * radiology cutoff rajasthan" finds the figure and the page it comes from. /llms-full.txt adds every MBBS college
 * (NMC's seats and ownership) and every MD/MS college.
 *
 * Words: Admin → Content → "AI summary (llms.txt)". Figures and links: live. Nothing here states a single college's
 * closing rank (the chance-view rule).
 */
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getContactInfo, getSettings, getUgColleges } from "@/lib/content";
import { PAGE_COPY } from "@/lib/pageCopyDefaults";
import { getDataStats } from "@/lib/dataStats";
import { getSeatMatrixOverview } from "@/lib/pgSeatData";
import { getStipends } from "@/lib/cutoffHubQueries";
import { ROUNDS, getCounsellingYear, getCounsellingYears, getRoundResult, getRoundState, roundPath } from "@/lib/mccResults";
import { getMbbsStateSeats } from "@/lib/stateQueries";
import { getPgStates } from "@/lib/pgStateQueries";
import { getBranches } from "@/lib/branchQueries";
import { SEARCH_NAME } from "@/lib/branchStateQueries";
import { getStateRound } from "@/lib/stateRoundQueries";
import { getNmcUgIndex } from "@/lib/nmcData";
import { CONTACT_INFO } from "@/lib/constants";

export const SITE = "https://www.admissionhands.com";
const n = (v: number) => v.toLocaleString("en-IN");
/** +91 93103 01949, as people write it. */
const phone = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 10 ? d : null;
  return ten ? `+91 ${ten.slice(0, 5)} ${ten.slice(5)}` : raw;
};

function copy(settings: Record<string, string>, tokens: Record<string, string | number | undefined>) {
  const fields = PAGE_COPY["site.llms"].fields as Record<string, { value: string }>;
  const out: Record<string, string> = {};
  for (const [field, def] of Object.entries(fields)) {
    const text = (settings[`site.llms.${field}`] ?? "").trim() || def.value;
    out[field] = text.replace(/\{(\w+)\}/g, (whole, k: string) => (k in tokens && tokens[k] !== undefined ? String(tokens[k]) : whole)).trim();
  }
  return out;
}

const link = (title: string, path: string, about?: string) => `- [${title}](${SITE}${path})${about ? `: ${about}` : ""}`;
const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join("\n");

/** Every MD/MS college (not a DNB-only hospital), with NMC's MD/MS seats where NMC lists it. */
async function mdmsColleges(): Promise<{ name: string; slug: string; state: string | null; seats: number | null }[]> {
  const r = (await db.execute(sql`
    WITH nmc AS (
      SELECT m.institute_id, SUM(c.approved_seat)::int AS seats
        FROM nmc_institutes m
        JOIN nmc_courses c ON c.college_code = m.college_code AND c.course_type IN ('MD', 'MS')
       WHERE m.institute_id IS NOT NULL
       GROUP BY m.institute_id
    )
    SELECT i.name, i.slug, st.name AS state, nmc.seats
      FROM institutes i
      LEFT JOIN states st ON st.id = i.state_id
      LEFT JOIN nmc ON nmc.institute_id = i.id
     WHERE i.level = 'pg' AND i.is_active
       AND EXISTS (SELECT 1 FROM seat_options so JOIN courses co ON co.id = so.course_id
                    WHERE so.institute_id = i.id AND co.name !~* '^(DNB|DrNB|FNB|Diploma|PG Diploma)')
     ORDER BY st.name, i.name`)) as unknown as { name: string; slug: string; state: string | null; seats: number | null }[];
  return r.map((x) => ({ name: String(x.name), slug: String(x.slug), state: x.state ? String(x.state) : null, seats: x.seats == null ? null : Number(x.seats) }));
}

export async function llmsText(full: boolean): Promise<string> {
  const [settings, stats, matrix, stipends, contact, current, years, mbbsStates, pgStates, branches] = await Promise.all([
    getSettings(),
    getDataStats(),
    getSeatMatrixOverview(),
    getStipends(),
    getContactInfo(),
    getCounsellingYear(),
    getCounsellingYears(),
    getMbbsStateSeats().catch((): Awaited<ReturnType<typeof getMbbsStateSeats>> => []),
    getPgStates().catch((): Awaited<ReturnType<typeof getPgStates>> => []),
    getBranches().catch((): Awaited<ReturnType<typeof getBranches>> => []),
  ]);
  // This year's round to point at: the latest one with a result, else the next one awaited.
  const states = await Promise.all(ROUNDS.map((r) => getRoundState(current, r.round)));
  const liveIdx = states.map((s, i) => (s.status === "live" ? i : -1)).filter((i) => i >= 0).pop();
  const pendingIdx = ROUNDS.findIndex((r, i) => r.order <= 4 && states[i]?.status === "pending");
  const roundIdx = liveIdx ?? (pendingIdx >= 0 ? pendingIdx : -1);
  const roundSpec = roundIdx >= 0 ? ROUNDS[roundIdx] : null;
  const roundResult = roundSpec && states[roundIdx]?.status === "live" ? await getRoundResult(current, roundSpec.round) : null;
  const resultYears = years.filter((y) => y < current || (liveIdx !== undefined && y === current)).sort((a, b) => a - b);

  // States whose own counselling's round of the running year is on their PG page (figures over 3+ colleges only).
  const mdmsStates = pgStates.filter((s) => s.mdms > 0);
  const stateRounds = (
    await Promise.all(mdmsStates.map(async (s) => ({ s, r: await getStateRound(s.slug).catch(() => null) })))
  ).filter((x) => x.r);

  const c = copy(settings, {
    matrix_year: matrix?.year,
    matrix_total: matrix ? n(matrix.total) : undefined,
    round_years: resultYears.join(", ") || undefined,
    stipend_colleges: stipends.colleges ? n(stipends.colleges) : undefined,
    phone: phone(contact?.phoneNumber ?? CONTACT_INFO.phone),
    whatsapp: phone(contact?.whatsappNumber ?? CONTACT_INFO.whatsapp),
    email: contact?.email ?? CONTACT_INFO.email,
    address: CONTACT_INFO.address,
  });

  const roundLine = roundSpec
    ? link(
        `NEET PG ${current} ${roundSpec.label.toLowerCase()} result`,
        roundPath(current, roundSpec.slug),
        roundResult ? `${n(roundResult.total)} seats allotted, branch-wise last rank by category, quota, category and state` : "MCC's result as soon as it is published, with seats by branch, quota, category and state",
      )
    : null;

  const nmcStates = mbbsStates.filter((s) => s.nmc);
  const mbbsTotal = nmcStates.reduce((a, s) => ({ colleges: a.colleges + s.nmc!.colleges, seats: a.seats + s.nmc!.seats }), { colleges: 0, seats: 0 });

  const out: string[] = [
    "# Admission Hands",
    "",
    `> ${c.summary}`,
    "",
    c.about,
    "",
    "What the site publishes:",
    lines(c.publishes),
    "",
    c.not_published,
    "",
    "How to read the numbers:",
    lines(c.how_to_read),
    "",
    "Where the figures come from:",
    lines(c.sources),
    "",
    c.cite,
    "",
    `Talk to a counsellor: ${c.contact}`,
    "",
    "## Start here",
    link("NEET college predictor", "/neet-college-predictor", "a NEET UG rank, or a NEET PG score or rank, and a category give a free report of the seats and colleges it reaches; signed in, each college comes with its chance"),
    link(`NEET PG counselling ${current}`, `/neet-pg-counselling/${current}`, "every round of MCC's counselling, with MCC's dates and each round's result"),
    ...(roundLine ? [roundLine] : []),
    link("NEET PG marks vs rank", "/neet-pg-marks-vs-rank", "the rank range each score held in NBEMS's own result, and the branches that rank reached in MCC's latest round"),
    ...(full ? [] : [link("Everything, college by college", "/llms-full.txt", "this file plus every MBBS and MD/MS college page")]),
    "",
    "## NEET PG — MD, MS, diploma, DNB",
    link(`NEET PG seat matrix ${matrix?.year ?? ""}`.trim(), "/neet-pg-seat-matrix", matrix ? `${n(matrix.total)} seats by matrix, branch, state and category` : undefined),
    link("NEET PG cutoff, branch wise by category", "/neet-pg-cutoff", "All India Quota, from MCC's published round results"),
    link("MD/MS branches", "/md-ms-india/branches", `${n(stats.pgBranches)} PG courses, each with its colleges, seat options and cutoff band`),
    link("PG by state", "/md-ms-india/states", "every state's MD/MS colleges and DNB hospitals, its counselling and its cutoff by quota"),
    link("PG stipend, state wise", "/md-ms-india/stipend", stipends.colleges ? `first-year stipends published by ${n(stipends.colleges)} colleges and DNB hospitals, with a page per state` : undefined),
    link("PG service bond by state", "/md-ms-india/bond", "bond years and penalties on government seats, as listed for the counselling; confirm with the state's notice before signing"),
    link("MD fees in private medical colleges", "/md-ms-india/private-college-fees", "state by state, as the median and the middle 80%"),
    link("Deemed university PG fees", "/md-ms-india/deemed-universities"),
    link("Management quota", "/management-quota"),
    link("NRI quota fees", "/nri-quota/fees"),
    link("NEET PG counselling process and choice filling", "/neet-pg-process", "round by round, with MCC's schedule"),
    ...years
      .filter((y) => y !== current)
      .sort((a, b) => b - a)
      .map((y) => link(`NEET PG counselling ${y}`, `/neet-pg-counselling/${y}`, "every round's result")),
    "",
    ...(stateRounds.length
      ? [
          `## NEET PG ${stateRounds[0].r!.year} state counselling — rounds out so far`,
          "Each state's own allotment, in All India Rank, as group figures over three or more colleges; in-service seats left out.",
          ...stateRounds.map(({ s, r }) =>
            link(`${s.name} NEET PG ${r!.year} ${r!.round} cutoff`, `/md-ms-india/states/${s.slug}`, `${r!.counselling}; ${n(r!.colleges)} colleges${r!.note ? ` — ${r!.note}` : ""}`),
          ),
          "",
        ]
      : []),
    "## MD/MS by state",
    ...mdmsStates.map((s) =>
      link(`NEET PG cutoff, seats and fees in ${s.name}`, `/md-ms-india/states/${s.slug}`, `${n(s.mdms)} MD/MS ${s.mdms === 1 ? "college" : "colleges"}${s.dnb ? ` and ${n(s.dnb)} DNB ${s.dnb === 1 ? "hospital" : "hospitals"}` : ""}`),
    ),
    "",
    "## MD/MS branches",
    ...branches
      .filter((b) => b.colleges >= 3)
      .map((b) => link(`${SEARCH_NAME[b.name] && SEARCH_NAME[b.name] !== b.name ? `${b.name} (${SEARCH_NAME[b.name]})` : b.name} cutoff`, `/md-ms-india/branches/${b.slug}`, `${n(b.colleges)} colleges`)),
    "",
    "## NEET UG — MBBS, BDS, AYUSH",
    link("NEET UG cutoff", "/neet-ug-cutoff", "All India Quota MBBS and BDS by category"),
    link("MBBS in India", "/mbbs-india", mbbsTotal.seats ? `${n(mbbsTotal.seats)} MBBS seats at ${n(mbbsTotal.colleges)} colleges on NMC's register, state by state` : "state by state, with every MBBS college"),
    link("MBBS colleges", "/mbbs-india/colleges"),
    link("BDS colleges", "/bds-india"),
    link("BAMS, BHMS and AYUSH colleges", "/ayush-colleges"),
    link("NEET UG counselling process", "/neet-ug-process"),
    link("NRI quota", "/nri-quota"),
    "",
    "## MBBS by state (NMC's register: colleges and approved MBBS seats)",
    ...mbbsStates.map((s) =>
      link(
        `MBBS seats in ${s.name}`,
        `/mbbs-india/${s.slug}`,
        s.nmc
          ? `${n(s.nmc.colleges)} ${s.nmc.colleges === 1 ? "college" : "colleges"}, ${n(s.nmc.seats)} MBBS seats — government ${n(s.nmc.govtColleges)} ${s.nmc.govtColleges === 1 ? "college" : "colleges"} with ${n(s.nmc.govtSeats)} seats`
          : "the state's MBBS colleges and counselling",
      ),
    ),
    "",
    "## Super-speciality and dental PG",
    link("NEET SS cutoff", "/neet-ss-cutoff", "every DM, MCh and DrNB course, by group rank, with its seats in India"),
    link("NEET MDS cutoff", "/neet-mds-cutoff", "every MDS speciality"),
    "",
    "## Open data",
    link("Open data", "/data", "summary datasets as CSV; the cutoff and rank tables are CC BY 4.0"),
    link("NEET PG stipend report 2026", "/reports/neet-pg-stipend-2026"),
    "",
    "## About",
    link("About Admission Hands", "/know-us"),
    link("The team", "/team"),
    link("Counselling services", "/services"),
    link("Contact", "/contact"),
    link("Sitemap", "/sitemap.xml"),
    "",
  ];

  if (full) {
    const [ug, nmcUg, pg] = await Promise.all([getUgColleges(), getNmcUgIndex(), mdmsColleges().catch(() => [])]);
    // MBBS colleges are the ones NMC lists for MBBS (the UG list also holds dental, AYUSH and nursing colleges).
    const mbbs = ug.filter((u) => nmcUg[u.slug]).sort((a, b) => (a.state ?? "").localeCompare(b.state ?? "") || a.name.localeCompare(b.name));
    out.push(
      "## Every MBBS college (seats and ownership from NMC's register)",
      ...mbbs.map((u) => {
        const f = nmcUg[u.slug];
        const facts = [u.state, f.seats ? `${n(f.seats)} MBBS seats` : null, f.management ? f.management.toLowerCase() : null].filter(Boolean).join(", ");
        return link(u.name, `/mbbs-india/colleges/${u.slug}`, facts || undefined);
      }),
      "",
      "## Every MD/MS college (MD and MS seats from NMC's register where it lists the college)",
      ...pg.map((p) => link(p.name, `/md-ms-india/colleges/${p.slug}`, [p.state, p.seats ? `${n(p.seats)} MD/MS seats` : null].filter(Boolean).join(", ") || undefined)),
      "",
    );
  }
  return out.join("\n");
}

/** What is served when the data cannot be read: still a valid llms.txt. */
export const LLMS_FALLBACK = `# Admission Hands\n\n> NEET counselling for India, built on the counselling authorities' own published results.\n\n- [Home](${SITE}/)\n- [Sitemap](${SITE}/sitemap.xml)\n`;
