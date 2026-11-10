import Image from "next/image";
import { BadgeCheck, Bell, Check, FileText, MessageCircle, Phone, Upload } from "lucide-react";
import { CHANCE, CHANCE_ORDER, type ChanceBand } from "@/lib/chance";
import { DOCUMENT_TYPES } from "@/lib/documentCatalogue";
import { CONTACT_INFO } from "@/lib/constants";

/**
 * The brand panel of /login (2026-11-10, owner: "bade bade brands ke design se idea leke kuch innovative"). Instead of a
 * list of features, the account is shown as it looks: four small preview cards — the colleges with chance words (names
 * left as placeholders: a preview, never a result), the newest official notice as it reaches an account (live, from the
 * alerts bar), the counsellor who calls (a real person, real links) and the document checklist (the real catalogue).
 * A line under the cards says it is a preview. Server component; the float is CSS and stops under reduced motion.
 */

const TONE: Record<ChanceBand, string> = {
  safe: "bg-signal-safe/10 text-signal-safe ring-signal-safe/25",
  likely: "bg-signal-borderline/10 text-signal-borderline ring-signal-borderline/25",
  possible: "bg-primary/10 text-primary ring-primary/25",
  stretch: "bg-signal-stretch/10 text-signal-stretch ring-signal-stretch/25",
};
const BAR = ["w-[78%]", "w-[64%]", "w-[86%]", "w-[58%]"];
const SUB = ["w-[40%]", "w-[52%]", "w-[34%]", "w-[46%]"];

const card =
  "rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.45)] backdrop-blur motion-safe:animate-float";

export default function LoginShowcase({
  eyebrow,
  title,
  accent,
  subtitle,
  stats,
  steps,
  notice,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  subtitle: string;
  stats: { v: string; w: string }[];
  steps: string[];
  notice: { title: string; link: string | null } | null;
}) {
  // Three that every NEET student is asked for, MBBS or MD/MS — from the real catalogue.
  const docs = ["Result / rank letter", "Domicile certificate", "Category certificate"]
    .map((l) => DOCUMENT_TYPES.find((d) => d.label === l))
    .filter((d): d is (typeof DOCUMENT_TYPES)[number] => Boolean(d));
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent("Hi, I am creating my AdmissionHands account and would like to talk to a counsellor.")}`;
  return (
    <aside
      aria-labelledby="login-h1"
      className="relative isolate overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary-soft via-card to-accent-soft px-5 py-8 sm:px-8 lg:flex lg:items-center lg:rounded-[32px] lg:px-10 lg:py-12 xl:px-14"
    >
      {/* A faint grid and two glows — light, as every page here. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:linear-gradient(hsl(var(--primary)/0.08)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.08)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_75%_65%_at_60%_45%,#000,transparent)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 -z-10 h-96 w-96 rounded-full bg-secondary/25 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-10 -z-10 h-[26rem] w-[26rem] rounded-full bg-accent/15 blur-[110px]" />

      <div className="mx-auto flex w-full max-w-[46rem] flex-col 2xl:max-w-[50rem]">
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-card/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] sm:text-[11.5px] sm:tracking-[0.12em] text-primary-strong backdrop-blur">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> {eyebrow}
        </p>
        <h1 id="login-h1" className="mt-4 font-heading text-[clamp(2rem,3.4vw,3.25rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-foreground">
          {title} <span className="text-primary-strong">{accent}</span>
        </h1>
        <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {stats.map((s) => (
            <li key={s.w} className="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-card/85 px-3 py-1.5 backdrop-blur">
              <span className="tnum font-heading text-[15px] font-extrabold text-primary-strong">{s.v}</span>
              <span className="text-[12.5px] text-muted-foreground">{s.w}</span>
            </li>
          ))}
        </ul>

        {/* ------------------------------ the account, as it looks ------------------------------ */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            {/* Colleges with chance words — placeholders for names: this is a preview, not anybody's result. */}
            <div className={card}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-heading text-[14.5px] font-bold text-foreground">Your colleges</p>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">MBBS · BDS · MD/MS</span>
              </div>
              <ul className="mt-3 space-y-2.5" aria-label="Chance words used in your list">
                {CHANCE_ORDER.map((b, i) => (
                  <li key={b} className="flex items-center gap-3">
                    <span aria-hidden="true" className="min-w-0 flex-1 space-y-1.5">
                      <span className={`block h-2.5 rounded-full bg-foreground/15 ${BAR[i]}`} />
                      <span className={`block h-2 rounded-full bg-foreground/[0.07] ${SUB[i]}`} />
                    </span>
                    <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold ring-1 ${TONE[b]}`}>{CHANCE[b].label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-border pt-2.5 text-[12px] text-muted-foreground">An approximate fee beside every college.</p>
            </div>

            {/* The document checklist — the real catalogue. */}
            <div className={card} style={{ animationDelay: "1.6s" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-heading text-[14.5px] font-bold text-foreground">
                  <FileText className="h-4 w-4 text-primary-strong" aria-hidden="true" /> Your documents
                </p>
                <span className="tnum text-[11.5px] font-semibold text-muted-foreground">{DOCUMENT_TYPES.length} on the list</span>
              </div>
              <ul className="mt-3 space-y-2">
                {docs.map((d, i) => (
                  <li key={d.label} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 truncate text-foreground">{d.label}</span>
                    {i < 2 ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                        <Check className="h-3 w-3" aria-hidden="true" /> Checked
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        <Upload className="h-3 w-3" aria-hidden="true" /> Upload
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:pt-10">
            {/* The newest official notice, live — what reaches an account. */}
            {notice && (
              <div className={card} style={{ animationDelay: "0.8s" }}>
                <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-wide text-primary-strong">
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft">
                    <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                    <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-signal-stretch ring-2 ring-card" />
                  </span>
                  Latest notice
                </p>
                <p className="mt-2 break-words text-[13.5px] font-semibold leading-snug text-foreground">{notice.title}</p>
                <p className="mt-2 text-[12px] text-muted-foreground">MCC&apos;s and your home state&apos;s notices, on your account as they come out.</p>
              </div>
            )}

            {/* The counsellor who calls — a real person, real links. */}
            <div className={card} style={{ animationDelay: "2.4s" }}>
              <div className="flex items-center gap-3">
                <Image src="/card/akhtar-khan.jpg" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-card" />
                <div className="min-w-0">
                  <p className="text-[14px] font-bold leading-tight text-foreground">Akhtar Khan</p>
                  <p className="text-[12px] leading-snug text-muted-foreground">Senior Counsellor &amp; Founder</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" /> On WhatsApp, 10 AM – 10 PM
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-snug text-foreground">Your counsellor sees your rank, budget and branches before the first call.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener"
                  data-placement="login_showcase"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-[13px] font-bold text-accent-foreground hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                </a>
                <a
                  href={`tel:${CONTACT_INFO.phone}`}
                  data-placement="login_showcase"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-bold text-foreground hover:border-primary/40"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" /> Call
                </a>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11.5px] text-muted-foreground">A preview of the account — your own colleges, notices and documents appear once you sign in.</p>

        {/* How it works, in a line of three. */}
        <ol className="mt-8 grid gap-4 border-t border-primary/15 pt-6 sm:grid-cols-3">
          {steps.map((st, i) => (
            <li key={st} className="flex gap-3 sm:block">
              <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-strong text-[13px] font-bold text-primary-foreground shadow-sm">{i + 1}</span>
              <p className="text-[13px] leading-relaxed text-foreground sm:mt-2">{st}</p>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
