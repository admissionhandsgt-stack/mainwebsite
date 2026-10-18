import CounsellorFaces from "@/components/lead/CounsellorFaces";
import { BadgeCheck, LineChart, Route, Sparkles } from "lucide-react";
import { getDataStats, inr } from "@/lib/dataStats";

/**
 * The predictor's first screen, beside the form (ChanceFinder renders it).
 *
 * Three things above the fold: what the tool does, the three steps it takes,
 * and why the numbers are worth trusting — counted from the data, plus the
 * people a student ends up talking to.
 */

const STEPS = [
  { icon: Sparkles, title: "A free possibility report", body: "How many seats and colleges your rank reaches, and how they split by chance." },
  { icon: LineChart, title: "Your colleges, with your chance", body: "Sign in free and see each college in plain words — high, good, possible or reach." },
  { icon: Route, title: "A counsellor's roadmap", body: "When you are ready: the order to fill, when to float, and which quota is yours." },
];


export default async function PredictorHero() {
  const stats = await getDataStats();
  const figures: [string, string][] = [
    [inr(stats.pgColleges + stats.ugColleges), "colleges"],
    [inr(stats.seatOptions), "seat options"],
    [inr(stats.counsellings), "counsellings"],
  ];

  return (
    <div>
      <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> 15+ years of NEET counselling
      </p>
      <h1 className="font-heading mt-4 max-w-[16ch] text-[clamp(2rem,4.6vw,3.3rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-foreground">
        Where can your NEET rank <span className="text-gradient-brand">take you?</span>
      </h1>
      <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-muted-foreground">
        MBBS, BDS or MD/MS — see what your rank reaches in seconds, judged against where the official counselling cuts
        actually landed. Then let a counsellor turn it into a seat.
      </p>

      <ol className="mt-7 hidden space-y-4 lg:block">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3.5">
            <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <s.icon className="h-5 w-5" aria-hidden="true" />
              <span className="tnum absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-brand text-[10.5px] font-bold text-white">
                {i + 1}
              </span>
            </span>
            <span>
              <span className="block font-heading text-[15.5px] font-bold text-foreground">{s.title}</span>
              <span className="block text-[14px] leading-relaxed text-muted-foreground">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8 hidden flex-wrap items-center gap-x-8 gap-y-4 border-t border-border pt-6 lg:flex">
        <dl className="flex gap-6">
          {figures.map(([v, l]) => (
            <div key={l}>
              <dd className="tnum font-heading text-[1.6rem] font-extrabold leading-none text-foreground">{v}</dd>
              <dt className="mt-1 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{l}</dt>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-3">
          <CounsellorFaces />
          <p className="text-[13px] leading-snug text-muted-foreground">
            Expert counsellors,
            <br />
            <span className="font-semibold text-foreground">open daily 10 AM – 10 PM</span>
          </p>
        </div>
      </div>
    </div>
  );
}
