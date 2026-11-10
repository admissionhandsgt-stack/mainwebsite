import Image from "next/image";
import { BadgeCheck, Bell, Check, FileText, MessageCircle, Phone, Upload } from "lucide-react";
import { CHANCE, CHANCE_ORDER, type ChanceBand } from "@/lib/chance";

/**
 * The brand panel of /login (2026-11-10, owner: "bade bade brands ke design se idea leke kuch innovative"). Instead of a
 * list of features, the account is shown as it looks: four small preview cards — the colleges with chance words (names
 * left as placeholders: a preview, never a result), the newest official notice as it reaches an account (live, from the
 * alerts bar), a counsellor (a real person, real links) and the document checklist. A line under the cards says it is a
 * preview. Every word comes from Admin → Content → "Page: sign in / create account" (owner, 2026-11-11: "ye sab admin
 * se manageable banao"), the counsellor by their card-page address. Server component; the float is CSS and stops under
 * reduced motion.
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

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export interface ShowcaseCopy {
  eyebrow: string;
  title: string;
  accent: string;
  subtitle: string;
  card_colleges_title: string;
  card_colleges_tag: string;
  card_colleges_note: string;
  card_notice_title: string;
  card_notice_note: string;
  card_counsellor_hours: string;
  card_counsellor_text: string;
  card_whatsapp_label: string;
  card_call_label: string;
  card_whatsapp_message: string;
  card_docs_title: string;
  card_docs_count: string;
  card_docs: string;
  preview_note: string;
}

export default function LoginShowcase({
  copy: c,
  stats,
  steps,
  notice,
  counsellor,
  phone,
  whatsapp,
}: {
  copy: ShowcaseCopy;
  stats: { v: string; w: string }[];
  steps: string[];
  notice: { title: string; link: string | null } | null;
  counsellor: { name: string; title: string; photo?: string } | null;
  /** The public numbers, from Admin → Contacts. */
  phone: string;
  whatsapp: string;
}) {
  // "Document | status" — a status that says upload or pending is grey, anything else a green tick.
  const docs = c.card_docs
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x[0])
    .map(([label, status = ""]) => ({ label, status, done: !/upload|pending/i.test(status) }));
  const wa = `https://wa.me/${whatsapp.replace(/\D/g, "")}${c.card_whatsapp_message ? `?text=${encodeURIComponent(c.card_whatsapp_message)}` : ""}`;
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
        {c.eyebrow && (
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-card/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary-strong backdrop-blur sm:text-[11.5px] sm:tracking-[0.12em]">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> {c.eyebrow}
          </p>
        )}
        <h1 id="login-h1" className="mt-4 font-heading text-[clamp(2rem,3.4vw,3.25rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-foreground">
          {c.title} <span className="text-primary-strong">{c.accent}</span>
        </h1>
        {c.subtitle && <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">{c.subtitle}</p>}

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
                <p className="font-heading text-[14.5px] font-bold text-foreground">{c.card_colleges_title}</p>
                {c.card_colleges_tag && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{c.card_colleges_tag}</span>
                )}
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
              {c.card_colleges_note && <p className="mt-3 border-t border-border pt-2.5 text-[12px] text-muted-foreground">{c.card_colleges_note}</p>}
            </div>

            {/* The document checklist. */}
            {docs.length > 0 && (
              <div className={card} style={{ animationDelay: "1.6s" }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-heading text-[14.5px] font-bold text-foreground">
                    <FileText className="h-4 w-4 text-primary-strong" aria-hidden="true" /> {c.card_docs_title}
                  </p>
                  {c.card_docs_count && <span className="tnum text-[11.5px] font-semibold text-muted-foreground">{c.card_docs_count}</span>}
                </div>
                <ul className="mt-3 space-y-2">
                  {docs.map((d) => (
                    <li key={d.label} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="min-w-0 truncate text-foreground">{d.label}</span>
                      {d.status &&
                        (d.done ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                            <Check className="h-3 w-3" aria-hidden="true" /> {d.status}
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                            <Upload className="h-3 w-3" aria-hidden="true" /> {d.status}
                          </span>
                        ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                  {c.card_notice_title}
                </p>
                <p className="mt-2 break-words text-[13.5px] font-semibold leading-snug text-foreground">{notice.title}</p>
                {c.card_notice_note && <p className="mt-2 text-[12px] text-muted-foreground">{c.card_notice_note}</p>}
              </div>
            )}

            {/* A counsellor — a real person, the public numbers. */}
            {counsellor && (
              <div className={card} style={{ animationDelay: "2.4s" }}>
                <div className="flex items-center gap-3">
                  {counsellor.photo ? (
                    <Image src={`/card/${counsellor.photo}`} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-card" />
                  ) : (
                    <span className="font-heading flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[14px] font-extrabold text-white" aria-hidden="true">
                      {initials(counsellor.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold leading-tight text-foreground">{counsellor.name}</p>
                    {counsellor.title && <p className="text-[12px] leading-snug text-muted-foreground">{counsellor.title}</p>}
                    {c.card_counsellor_hours && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" /> {c.card_counsellor_hours}
                      </p>
                    )}
                  </div>
                </div>
                {c.card_counsellor_text && <p className="mt-3 text-[13px] leading-snug text-foreground">{c.card_counsellor_text}</p>}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener"
                    data-placement="login_showcase"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-[13px] font-bold text-accent-foreground hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> {c.card_whatsapp_label}
                  </a>
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    data-placement="login_showcase"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-bold text-foreground hover:border-primary/40"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" /> {c.card_call_label}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        {c.preview_note && <p className="mt-3 text-[11.5px] text-muted-foreground">{c.preview_note}</p>}

        {/* How it works, in a line of three. */}
        {steps.length > 0 && (
          <ol className="mt-8 grid gap-4 border-t border-primary/15 pt-6 sm:grid-cols-3">
            {steps.map((st, i) => (
              <li key={st} className="flex gap-3 sm:block">
                <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-strong text-[13px] font-bold text-primary-foreground shadow-sm">
                  {i + 1}
                </span>
                <p className="text-[13px] leading-relaxed text-foreground sm:mt-2">{st}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
