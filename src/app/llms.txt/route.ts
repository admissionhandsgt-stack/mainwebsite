import { getContactInfo, getSettings } from "@/lib/content";
import { PAGE_COPY } from "@/lib/pageCopyDefaults";
import { getDataStats } from "@/lib/dataStats";
import { getSeatMatrixOverview } from "@/lib/pgSeatData";
import { getStipends } from "@/lib/cutoffHubQueries";
import { ROUNDS, getCounsellingYear, getCounsellingYears, getRoundResult, getRoundState, roundPath } from "@/lib/mccResults";
import { CONTACT_INFO } from "@/lib/constants";
import { logError } from "@/lib/logger";

/**
 * /llms.txt — the plain-text map of the site that AI assistants and agents read (llmstxt.org), built
 * from live data (2026-10-21). It replaced a hand-typed file from 2026-10-08 that still described the
 * predictor as showing "every seat it reached, by round" and the site as publishing colleges' closing
 * ranks — both untrue since the 2026-10-12 chance-view rule, and an assistant repeats what it reads
 * here to students. The words are Admin → Content → "AI summary (llms.txt)"; figures and links are live.
 */
export const dynamic = "force-dynamic";

const SITE = "https://www.admissionhands.com";
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

export async function GET() {
  try {
    const [settings, stats, matrix, stipends, contact, current, years] = await Promise.all([
      getSettings(),
      getDataStats(),
      getSeatMatrixOverview(),
      getStipends(),
      getContactInfo(),
      getCounsellingYear(),
      getCounsellingYears(),
    ]);
    // This year's round to point at: the latest one with a result, else the next one awaited.
    const states = await Promise.all(ROUNDS.map((r) => getRoundState(current, r.round)));
    const liveIdx = states.map((s, i) => (s.status === "live" ? i : -1)).filter((i) => i >= 0).pop();
    const pendingIdx = ROUNDS.findIndex((r, i) => r.order <= 4 && states[i]?.status === "pending");
    const roundIdx = liveIdx ?? (pendingIdx >= 0 ? pendingIdx : -1);
    const roundSpec = roundIdx >= 0 ? ROUNDS[roundIdx] : null;
    const roundResult = roundSpec && states[roundIdx]?.status === "live" ? await getRoundResult(current, roundSpec.round) : null;
    const resultYears = years.filter((y) => y < current || (liveIdx !== undefined && y === current)).sort((a, b) => a - b);

    const c = copy(settings, {
      matrix_year: matrix?.year,
      matrix_total: matrix ? n(matrix.total) : undefined,
      round_years: resultYears.join(", ") || undefined,
      stipend_colleges: stipends.colleges ? n(stipends.colleges) : undefined,
      college_pages: n(stats.pgColleges + stats.ugColleges),
      phone: phone(contact?.phoneNumber ?? CONTACT_INFO.phone),
      whatsapp: phone(contact?.whatsappNumber ?? CONTACT_INFO.whatsapp),
      email: contact?.email ?? CONTACT_INFO.email,
      address: CONTACT_INFO.address,
    });
    const lines = (text: string) =>
      text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `- ${l}`)
        .join("\n");

    const roundLine = roundSpec
      ? link(
          `NEET PG ${current} ${roundSpec.label.toLowerCase()} result`,
          roundPath(current, roundSpec.slug),
          roundResult ? `${n(roundResult.total)} seats allotted, branch-wise last rank by category, quota, category and state` : "MCC's result as soon as it is published, with seats by branch, quota, category and state",
        )
      : null;

    const text = [
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
      `Talk to a counsellor: ${c.contact}`,
      "",
      "## Start here",
      link("NEET college predictor", "/neet-college-predictor", "a NEET UG rank, or a NEET PG score or rank, and a category give a free report of the seats and colleges it reaches; signed in, each college comes with its chance"),
      link(`NEET PG counselling ${current}`, `/neet-pg-counselling/${current}`, "every round of MCC's counselling, with MCC's dates and each round's result"),
      ...(roundLine ? [roundLine] : []),
      "",
      "## NEET PG — MD, MS, diploma, DNB",
      link(`NEET PG seat matrix ${matrix?.year ?? ""}`.trim(), "/neet-pg-seat-matrix", matrix ? `${n(matrix.total)} seats by matrix, branch, state and category` : undefined),
      link("NEET PG cutoff, branch wise by category", "/neet-pg-cutoff", "All India Quota, from MCC's published round results"),
      link("MD/MS branches", "/md-ms-india/branches", `${n(stats.pgBranches)} branches, each with its seats, colleges and cutoff by quota`),
      link("PG by state", "/md-ms-india/states", "every state's PG colleges, its counselling and its cutoff by quota"),
      link("PG stipend, state wise", "/md-ms-india/stipend", stipends.colleges ? `first-year stipends published by ${n(stipends.colleges)} colleges, with a page per state` : undefined),
      link("PG service bond by state", "/md-ms-india/bond", "bond years and penalties for government seats, a third-party compilation"),
      link("MD/MS fees in private colleges", "/md-ms-india/private-college-fees"),
      link("Deemed universities, MD/MS", "/md-ms-india/deemed-universities"),
      link("Management quota", "/management-quota"),
      link("NRI quota fees", "/nri-quota/fees"),
      link("NEET PG counselling process", "/neet-pg-process", "round by round, with MCC's schedule"),
      ...years
        .filter((y) => y !== current)
        .sort((a, b) => b - a)
        .map((y) => link(`NEET PG counselling ${y}`, `/neet-pg-counselling/${y}`, "every round's result")),
      "",
      "## NEET UG — MBBS, BDS, AYUSH",
      link("NEET UG cutoff", "/neet-ug-cutoff", "All India Quota MBBS and BDS by category"),
      link("MBBS in India", "/mbbs-india", "state by state, with every MBBS college"),
      link("MBBS colleges", "/mbbs-india/colleges"),
      link("BDS colleges", "/bds-india"),
      link("BAMS, BHMS and AYUSH colleges", "/ayush-colleges"),
      link("NEET UG counselling process", "/neet-ug-process"),
      link("NRI quota", "/nri-quota"),
      "",
      "## Super-speciality and dental PG",
      link("NEET SS cutoff", "/neet-ss-cutoff", "every DM, MCh and DrNB course, by group rank"),
      link("NEET MDS cutoff", "/neet-mds-cutoff", "every MDS speciality"),
      "",
      "## Open data",
      link("Open data", "/data", "summary datasets as CSV, free to use with a link"),
      link("NEET PG stipend report 2026", "/reports/neet-pg-stipend-2026"),
      "",
      "## About",
      link("About Admission Hands", "/know-us"),
      link("The team", "/team"),
      link("Counselling services", "/services"),
      link("Sitemap", "/sitemap.xml"),
      "",
    ].join("\n");

    return new Response(text, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    logError(error, { route: "llms.txt" });
    return new Response(`# Admission Hands\n\n> NEET counselling for India, built on the counselling authorities' own published results.\n\n- [Home](${SITE}/)\n- [Sitemap](${SITE}/sitemap.xml)\n`, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
    });
  }
}
