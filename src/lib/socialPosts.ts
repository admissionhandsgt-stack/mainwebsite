/**
 * Ready-to-post data posts for the owner to put up himself on Reddit, Quora, X, LinkedIn and our Telegram channel
 * (2026-11-13, owner: "stipend + alag alag muddo ko hum khud bhi reddit quora etc par post kar sakte interestingly facts
 * ke sath"). One topic a day in rotation — the cut off trend, MCC's added seats, NMC's new colleges, PG fees, the
 * stipend — each written for the platform: Reddit and Quora value first with the source and a disclosure, an X thread in
 * short parts, LinkedIn and Telegram brief. Every figure is live (lib/outreachAngles.ts, the stipend hub), group
 * figures or counts only, never a college's closing rank.
 *
 * Never posted by code: a person posts, by each community's rules (automated promotional posting is spam under Reddit's
 * rules and a link scheme under Google's — the line drawn on 2026-11-10).
 *
 * Server only.
 */
import { getStipends } from "@/lib/cutoffHubQueries";
import { angleFor, DATA_TOPICS, type Angle, type Topic } from "@/lib/outreachAngles";

const SITE = "https://www.admissionhands.com";
const n = (v: number) => Math.round(v).toLocaleString("en-IN");
const DISCLOSE = "Disclosure: I work with AdmissionHands, a NEET PG counselling team. The data is free to use.";

export const POST_TOPICS: Topic[] = [...DATA_TOPICS, "stipend"];

async function stipendAngle(): Promise<Angle | null> {
  const st = await getStipends().catch(() => null);
  if (!st || st.states.length < 3) return null;
  const byMedian = [...st.states].sort((a, b) => b.median - a.median);
  const top = byMedian[0];
  const low = byMedian[byMedian.length - 1];
  const govtTop = [...st.states].filter((x) => x.govtMedian != null).sort((a, b) => (b.govtMedian ?? 0) - (a.govtMedian ?? 0))[0];
  return {
    topic: "stipend",
    subject: `PG stipend in India, state by state: from ₹${n(low.median)} to ₹${n(top.median)} a month`,
    intro: `The first-year MD/MS stipend ${n(st.colleges)} medical colleges publish, state by state (median per state):`,
    points: [
      `Highest median: ${top.state}, ₹${n(top.median)} a month. Lowest: ${low.state}, ₹${n(low.median)}.`,
      ...(govtTop?.govtMedian ? [`In government colleges, ${govtTop.state} pays most: ₹${n(govtTop.govtMedian)} a month.`] : []),
      ...(st.govtMedian && st.privateMedian ? [`Government colleges' median ₹${n(st.govtMedian)} a month against ₹${n(st.privateMedian)} in private and deemed colleges.`] : []),
      `Across India the middle is ₹${n(st.median)} a month.`,
    ],
    links: [`Every state and college: ${SITE}/md-ms-india/stipend`],
  };
}

export async function angleForPost(topic: Topic): Promise<Angle | null> {
  return topic === "stipend" ? stipendAngle() : angleFor(topic);
}

export interface PostPack {
  topic: Topic;
  reddit: { title: string; body: string };
  quora: { questions: string[]; answer: string };
  x: string[];
  linkedin: string;
  telegram: string;
}

const QUESTIONS: Record<Topic, string[]> = {
  trend: ["How did the NEET PG 2026 cut off compare with 2025?", "Is the NEET PG cut off going up or down this year?"],
  seats: ["How many seats were added in NEET PG 2026 counselling?", "Did NEET PG seats increase in 2026?"],
  colleges: ["How many new medical colleges were approved for 2026-27?", "Which states got new MBBS colleges this year?"],
  fees: ["What is the fee for MD/MS in private medical colleges in India?", "How much does a PG seat cost in a deemed university?"],
  stipend: ["Which state pays the highest PG stipend in India?", "What is the PG resident stipend in government vs private colleges?"],
};
const SOURCES: Record<Topic, string> = {
  trend: "Source: MCC's round result PDFs, 2025 and 2026 — the last seat admitted across every college that took the branch (no college's rank).",
  seats: "Source: MCC's NEET PG seat matrix and its \"newly added seats\" notices; NMC's college and course register.",
  colleges: "Source: NMC's college and course register (letter-of-permission dates as NMC prints them).",
  fees: "Source: colleges' own 2026-27 fee notices, and last year's counselling listing where a college has none out yet.",
  stipend: "Source: the first-year stipend colleges publish, as listed for the counselling; a state's figure is the middle of its colleges.",
};
const TAGS: Record<Topic, string> = {
  trend: "#NEETPG #NEETPG2026 #Cutoff #MedicalEducation",
  seats: "#NEETPG #NEETPG2026 #MCC #MedicalSeats",
  colleges: "#NMC #MBBS #MedicalColleges #NEET2026",
  fees: "#NEETPG #MDMS #MedicalFees #MedicalEducation",
  stipend: "#NEETPG #ResidentDoctors #Stipend #MedicalEducation",
};

/** Splits points into tweets of at most 270 characters, the first carrying the subject. */
function thread(a: Angle): string[] {
  const parts = [`${a.subject} 🧵`, ...a.points];
  const out: string[] = [];
  for (const p of parts) out.push(p.length > 270 ? `${p.slice(0, 266)}…` : p);
  out.push(`Full data, free: ${a.links[0]?.split(": ").pop() ?? SITE}`);
  return out.map((t, i) => `${i + 1}/${out.length} ${t}`);
}

export function packFor(a: Angle): PostPack {
  const bullets = a.points.map((p) => `• ${p}`).join("\n");
  const links = a.links.join("\n");
  return {
    topic: a.topic,
    reddit: {
      title: a.subject,
      body: [a.intro, "", bullets, "", SOURCES[a.topic], "", links, "", DISCLOSE].join("\n"),
    },
    quora: {
      questions: QUESTIONS[a.topic],
      answer: [`Short answer: ${a.points[0]}`, "", a.intro, "", bullets, "", links, "", DISCLOSE].join("\n"),
    },
    x: thread(a),
    linkedin: [a.subject, "", bullets, "", links, "", TAGS[a.topic]].join("\n"),
    telegram: [`📊 ${a.subject}`, "", bullets, "", links].join("\n"),
  };
}

/** Today's topic in rotation, falling through to the next topic that has data. */
export async function todaysPack(prefer?: Topic | null): Promise<PostPack | null> {
  const day = Math.floor(Date.now() / 86_400_000);
  const order = prefer ? [prefer, ...POST_TOPICS.filter((t) => t !== prefer)] : [...POST_TOPICS.slice(day % POST_TOPICS.length), ...POST_TOPICS.slice(0, day % POST_TOPICS.length)];
  for (const t of order) {
    const a = await angleForPost(t).catch(() => null);
    if (a) return packFor(a);
  }
  return null;
}

/** The pack as Telegram messages for the owner to copy, one per platform. */
export function packMessages(p: PostPack): string[] {
  return [
    `🗞 Today's data post (${p.topic}) — post it yourself; check each community's rules first (many subreddits allow no links: drop the link lines there).`,
    `REDDIT (r/NEETPG, r/IndianMedschool)\n\nTitle: ${p.reddit.title}\n\n${p.reddit.body}`,
    `QUORA — answer one of:\n${p.quora.questions.map((q) => `• ${q}`).join("\n")}\n\n${p.quora.answer}`,
    `X / TWITTER (thread)\n\n${p.x.join("\n\n")}`,
    `LINKEDIN\n\n${p.linkedin}`,
    `TELEGRAM CHANNEL\n\n${p.telegram}`,
  ];
}
