import Link from "@/components/ui/Link";
import {
  ArrowRight,
  ClipboardList,
  Compass,
  FileCheck2,
  GraduationCap,
  MapPinned,
  MessageCircle,
  Plane,
  Repeat2,
  SearchCheck,
  Stethoscope,
  Target,
  Wallet,
} from "lucide-react";
import SectionHead from "@/components/ui/SectionHead";
import { pageCopy } from "@/lib/pageCopy";
import { getContactInfo } from "@/lib/content";
import { CONTACT_INFO } from "@/lib/constants";
import { getTelegramCue } from "@/lib/mccResults";

/**
 * "Where are you right now?" (owner, 2026-11-16): the counselling pages open with the situations families arrive in —
 * result out, a seat to decide on, no seat yet, a low rank, a budget, reporting — each with the free guide for it and a
 * WhatsApp chat already saying where the student stands, so the counsellor's first reply is about the case. Every card is
 * shown (no tabs: nothing hidden); each WhatsApp tap reaches GA4 and AutoLoom with its own placement
 * (`<placement>_where_<n>`), which says which situation brings people.
 *
 * Words: Admin → Content → "Counselling: where are you right now?" (`page.counsel_where`), one line per situation. The
 * running NEET PG round comes from the Telegram cue, so "No seat yet" points at the round in progress by itself.
 * No promise of a seat (the note under the cards says so).
 */

type Item = { situation: string; text: string; linkLabel: string; href: string | null; message: string };

const PG_ICONS = [ClipboardList, Repeat2, SearchCheck, Stethoscope, Wallet, FileCheck2];
const UG_ICONS = [Target, MapPinned, Repeat2, Wallet, Plane, GraduationCap];

/** Only an address on this site: the line is typed in the admin. */
const internal = (v: string) => (/^\/(?!\/)/.test(v) ? v : null);

const items = (v: string): Item[] =>
  v
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x[0] && x[1] && x[4])
    .map(([situation, text, linkLabel, href, message]) => ({ situation, text, linkLabel, href: internal(href ?? ""), message }));

/** The NEET UG coming up: this year's until its result (June), then next year's. */
function nextNeetUg(now = new Date()): number {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.getUTCMonth() >= 5 ? ist.getUTCFullYear() + 1 : ist.getUTCFullYear();
}

export default async function WhereNow({
  level,
  placement,
  stateName,
  stateSlug,
  feesHref,
  ugLink,
}: {
  level: "pg" | "ug";
  placement: string;
  stateName?: string;
  /** MBBS state pages: the state's /mbbs-india page. */
  stateSlug?: string;
  /** NEET PG state pages: the state's fee page when it has one. */
  feesHref?: string;
  /** /counselling: a line under the NEET PG cards pointing at the MBBS states. */
  ugLink?: string;
}) {
  const [cue, contact] = await Promise.all([level === "pg" ? getTelegramCue().catch(() => null) : null, getContactInfo().catch(() => null)]);
  const c = await pageCopy("page.counsel_where", {
    state: stateName ?? "",
    round: !cue ? "the next round" : /^stray/i.test(cue.label) ? "the stray round" : cue.label,
    round_page: cue ? `${cue.label} result` : "This year's MCC rounds",
    round_link: cue?.path ?? "/neet-pg-counselling",
    fees_link: feesHref ?? "/md-ms-india/fees",
    state_link: stateSlug ? `/mbbs-india/${stateSlug}` : "/mbbs-india",
    state_page: stateName ? `MBBS seats in ${stateName}` : "MBBS seats by state",
    next_year: nextNeetUg(),
  });
  const list = items(level === "pg" ? c.pg_items : c.ug_items);
  if (!list.length) return null;
  const icons = level === "pg" ? PG_ICONS : UG_ICONS;
  const waNumber = (contact?.whatsappNumber || CONTACT_INFO.whatsapp).replace(/\D/g, "");
  const id = `where-now-${placement}`;

  return (
    <section id="where-now" className="scroll-mt-32 border-y border-border bg-surface-1 py-10 md:py-14" aria-labelledby={id}>
      <div className="container-custom">
        <SectionHead icon="route" id={id} eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
        <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((x, i) => {
            const Icon = icons[i] ?? Compass;
            return (
              <li key={x.situation} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong ring-1 ring-primary/15 dark:text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="pt-1.5 font-heading text-[16px] font-bold leading-snug text-foreground">{x.situation}</h3>
                </div>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">
                  {x.text}
                  {x.href && x.linkLabel && (
                    <>
                      {" "}
                      <Link
                        href={x.href}
                        className="group whitespace-nowrap font-semibold text-primary-strong underline-offset-2 hover:underline dark:text-primary"
                      >
                        {x.linkLabel}
                        <ArrowRight className="ml-1 inline h-3.5 w-3.5 align-[-2px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </>
                  )}
                </p>
                <div className="mt-auto pt-4">
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(x.message)}`}
                    target="_blank"
                    rel="noopener"
                    data-placement={`${placement}_where_${i + 1}`}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-bold text-accent-foreground hover:opacity-90 sm:w-auto"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> {c.wa_label}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        {c.note && <p className="mt-5 max-w-[80ch] text-[13.5px] leading-relaxed text-muted-foreground">{c.note}</p>}
        {ugLink && c.ug_line && (
          <p className="mt-2">
            <Link href={ugLink} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-primary-strong underline-offset-2 hover:underline dark:text-primary">
              {c.ug_line}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
