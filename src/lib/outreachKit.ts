/**
 * The outreach kit (/admin/outreach): ready-to-send messages written from the
 * live data, for the team to send by hand — a journalist pitch, share posts,
 * YouTube descriptions, Quora answer drafts.
 *
 * Deliberately not automated beyond writing them. Auto-posting links across
 * forums, comments and profiles is what Google's spam policies call a link
 * scheme, and it is detected and penalised site-wide. A person sending a good
 * message to the right person is what earns a link that counts.
 */
import { getStipends, getUgAiqCuts, getPgAiqCuts, type YearCuts } from "@/lib/cutoffHubQueries";
import { getSsCourses } from "@/lib/ssQueries";

const SITE = "https://www.admissionhands.com";
const inr = (v: number | null | undefined) => (v == null ? "—" : `₹${v.toLocaleString("en-IN")}`);
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const complete = (years: YearCuts[]) => years.find((y) => y.rounds.includes("R3")) ?? years[0];

export interface KitItem {
  id: string;
  channel: string;
  title: string;
  /** Who to send it to, or where to post it. */
  where: string;
  body: string;
}

export async function buildOutreachKit(): Promise<KitItem[]> {
  const [st, ug, pg, ss] = await Promise.all([getStipends(), getUgAiqCuts("MBBS"), getPgAiqCuts(), getSsCourses()]);
  const top = st.states[0];
  const low = st.states[st.states.length - 1];
  const ugY = complete(ug);
  const ugUr = ugY?.categories.find((c) => c.category === "UR");
  const pgY = complete(pg);
  const pgGen = pgY?.categories.find((c) => c.category === "GEN");
  const cardio = ss.courses.find((c) => c.course === "DM Cardiology");

  const items: KitItem[] = [
    {
      id: "pitch-stipend",
      channel: "Email",
      title: "Journalist pitch — PG stipend report",
      where:
        "Education and health reporters: Times of India Education, Hindustan Times Education, Indian Express Education, Medical Dialogues, Edexlive, The Print (health), regional dailies' education desks. One reporter at a time, by name.",
      body: [
        `Subject: Data: PG residents' stipend ranges ${top && low ? `${(top.median / low.median).toFixed(1)}×` : "widely"} across states`,
        "",
        "Hi <name>,",
        "",
        `We compiled the first-year MD/MS stipends published by ${st.colleges.toLocaleString("en-IN")} medical colleges. A few findings that may be useful for your coverage of NEET PG counselling:`,
        "",
        `• National median: ${inr(st.median)} a month.`,
        ...(top && low ? [`• Highest state: ${top.state} (median ${inr(top.median)}); lowest: ${low.state} (${inr(low.median)}).`] : []),
        ...(st.govtMedian && st.privateMedian ? [`• Government colleges' median ${inr(st.govtMedian)} against ${inr(st.privateMedian)} in private and deemed colleges.`] : []),
        "",
        `The full table, method and a free CSV are here: ${SITE}/reports/neet-pg-stipend-2026`,
        "",
        "Happy to share the state-level data or answer questions.",
        "",
        "— AdmissionHands",
      ].join("\n"),
    },
    {
      id: "wa-ug-cutoff",
      channel: "WhatsApp / Telegram",
      title: "Share post — NEET UG cutoff",
      where: "NEET UG aspirant and parent groups the team is already part of. Post once, answer replies; never mass-forward.",
      body: [
        `📊 NEET UG ${ugY?.year ?? ""} — where MBBS All India Quota seats actually closed`,
        "",
        ...(ugUr ? [`General: round 1 closed at AIR ${n(ugUr.bestR1)}; the last seat went at AIR ${n(ugUr.widest)}.`] : []),
        "OBC, SC, ST and EWS — and BDS — in the table:",
        `${SITE}/neet-ug-cutoff`,
        "",
        `Know your rank? See every seat it reached: ${SITE}/neet-college-predictor`,
      ].join("\n"),
    },
    {
      id: "wa-pg-cutoff",
      channel: "WhatsApp / Telegram",
      title: "Share post — NEET PG branch-wise cutoff",
      where: "NEET PG aspirant groups, interns' groups, college alumni groups.",
      body: [
        `🩺 NEET PG ${pgY?.year ?? ""} branch-wise cutoff (All India Quota)`,
        "",
        ...(pgGen ? [`General category: seats were taken from AIR ${n(pgGen.bestR1)} to ${n(pgGen.widest)}.`] : []),
        "Every MD/MS/diploma branch, most competitive first — and every category:",
        `${SITE}/neet-pg-cutoff`,
        "",
        `Stipend in your state: ${SITE}/md-ms-india/stipend`,
      ].join("\n"),
    },
    {
      id: "wa-ss",
      channel: "WhatsApp / Telegram",
      title: "Share post — NEET SS (DM/MCh) cutoff",
      where: "Residents' and senior residents' groups — the NEET SS audience is doctors already in MD/MS.",
      body: [
        `NEET SS ${ss.year ?? ""} — where every DM, MCh and DrNB course closed`,
        ...(cardio ? [`DM Cardiology: round 1 closed at group rank ${n(cardio.r1Close)}, last seat at ${n(cardio.widest)}.`] : []),
        `All ${ss.courses.length} courses, with ${ss.prevYear ?? "last year"} beside them: ${SITE}/neet-ss-cutoff`,
      ].join("\n"),
    },
    {
      id: "yt-description",
      channel: "YouTube",
      title: "Video description template",
      where: "Paste under every counselling video on the channel; keep the link that matches the video's topic first.",
      body: [
        "<One line on what this video covers.>",
        "",
        "📊 The data in this video:",
        `NEET UG cutoff by category → ${SITE}/neet-ug-cutoff`,
        `NEET PG branch-wise cutoff → ${SITE}/neet-pg-cutoff`,
        `NEET SS (DM/MCh) cutoff → ${SITE}/neet-ss-cutoff`,
        `NEET MDS cutoff → ${SITE}/neet-mds-cutoff`,
        `PG stipend by state → ${SITE}/md-ms-india/stipend`,
        "",
        `🎯 Check which seats your rank reaches → ${SITE}/neet-college-predictor`,
        `📞 Free counselling call → ${SITE}`,
      ].join("\n"),
    },
    {
      id: "quora-stipend",
      channel: "Quora / Reddit",
      title: 'Answer draft — "What is the PG stipend in India / my state?"',
      where: "Quora questions on PG stipend; r/IndianMedschool. Answer the question fully in the post; the link is the source, not the answer.",
      body: [
        `It varies a lot by state and between government and private colleges. Across ${st.colleges.toLocaleString("en-IN")} colleges that publish their stipend, the median first-year figure is ${inr(st.median)} a month.`,
        ...(top && low ? [`The highest state median is ${top.state} (${inr(top.median)}) and the lowest ${low.state} (${inr(low.median)}).`] : []),
        ...(st.govtMedian && st.privateMedian ? [`Government colleges' median is ${inr(st.govtMedian)}; private and deemed colleges' ${inr(st.privateMedian)}.`] : []),
        "",
        "Before choosing a seat, set the stipend against the fee and any bond — a high fee with a low stipend changes the three-year cost a lot.",
        "",
        `State-by-state table (source): ${SITE}/md-ms-india/stipend`,
      ].join("\n"),
    },
    {
      id: "quora-ug-rank",
      channel: "Quora / Reddit",
      title: 'Answer draft — "What NEET rank do I need for a government MBBS seat?"',
      where: "Quora; r/NEET. Adjust to the asker's category and state.",
      body: [
        ...(ugUr && ugY
          ? [`For the All India Quota (15% of government seats), general category: in ${ugY.year} round 1 closed at AIR ${n(ugUr.bestR1)} and the last seat went at AIR ${n(ugUr.widest)} across all rounds.`]
          : []),
        "State quota seats (the other 85%) close on each state's own merit list, so your state rank matters as much as your AIR.",
        "",
        `Category-wise table: ${SITE}/neet-ug-cutoff`,
        `Every seat your rank reached last year: ${SITE}/neet-college-predictor`,
      ].join("\n"),
    },
  ];
  return items;
}
