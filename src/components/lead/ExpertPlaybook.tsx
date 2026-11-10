import { MessageCircle, Phone, Sparkles } from "lucide-react";
import { pageCopy } from "@/lib/pageCopy";
import { getCounsellingFacts } from "@/lib/counsellingFacts";
import { CONTACT_INFO } from "@/lib/constants";

/**
 * The counsellor's playbook (2026-11-10; owner: "hamari strategy ko sirf history allotment ranks par mat based banao,
 * experience and insights ke sath dalo… personalised strategy, expert strategy… complete website ko is hisab se audit
 * karke upgrade karo"). Data pages show what happened; this block says what a counsellor does with it — four insights
 * per page type, from the team's experience of the rounds, with live figures where a figure makes the point, then the
 * team's own figures and one action: a personal strategy.
 *
 * Every insight is a way of working or a counted fact — never a promise of a seat, never an invented student.
 * Words: Admin → Content → "Site: counsellor's playbook" (four lines per page type, "title | text").
 */
export type PlaybookKind = "branch" | "state" | "mbbs_state" | "stipend" | "fees" | "quota" | "cutoff" | "marks" | "college_pg" | "college_ug";

export default async function ExpertPlaybook({
  kind,
  name,
  placement,
  bare = false,
}: {
  kind: PlaybookKind;
  name?: string;
  placement: string;
  /** Inside a column that already has its own container: no container, no vertical padding. */
  bare?: boolean;
}) {
  const [facts, team] = await Promise.all([getCounsellingFacts().catch(() => null), pageCopy("page.services.figures")]);
  const ug = kind === "mbbs_state" || kind === "college_ug";
  const tokens = {
    name: name ?? (ug ? "MBBS" : "MD/MS"),
    moved_pct: facts ? (ug ? facts.movedAfterR1.ug : facts.movedAfterR1.pg) : undefined,
    counsellings: facts ? (ug ? facts.counsellings.ug : facts.counsellings.pg) : undefined,
    quota_types: facts?.quotaTypes,
    category_codes: facts?.categoryCodes,
    fee5x: facts?.feeFiveX,
    tighter: facts?.lastRoundTighter.seats ? facts.lastRoundTighter.seats.toLocaleString("en-IN") : undefined,
    years: team.years,
    students: team.students,
  };
  const c = await pageCopy("site.playbook", tokens);
  const title = c[`${kind}_title` as keyof typeof c] ?? c.cutoff_title;
  const raw = c[`${kind}_points` as keyof typeof c] ?? "";
  // A line whose figure is missing ("…% of seats") reads wrong without it: drop lines with an empty token's tell-tale gap.
  const points = raw
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x[0] && x[1] && !/(^|\s)%|\s{2}|\(\s*\)/.test(x[1]));
  if (!points.length) return null;
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(c.wa_text.replace("{topic}", tokens.name))}`;
  return (
    <section className={bare ? "mb-8" : "container-custom py-10 md:py-12"} aria-labelledby={`playbook-${kind}`}>
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-soft via-background to-background p-6 md:p-8">
        <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
          <Sparkles className="h-4 w-4" aria-hidden /> {c.eyebrow}
        </p>
        <h2 id={`playbook-${kind}`} className="mt-2 font-heading text-2xl font-bold text-foreground md:text-[1.7rem]">
          {title}
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {points.map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-strong text-sm font-bold text-primary-foreground">{i + 1}</span>
              <span>
                <span className="block font-semibold text-foreground">{t}</span>
                <span className="mt-1 block text-[14px] leading-relaxed text-muted-foreground">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 max-w-[75ch] text-[15px] leading-relaxed text-foreground">{c.claim}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={wa} target="_blank" rel="noopener noreferrer" data-placement={`playbook_${placement}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white">
            <MessageCircle className="h-4 w-4" aria-hidden /> {c.cta}
          </a>
          <a href={`tel:${CONTACT_INFO.phone}`} data-placement={`playbook_${placement}_call`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 font-semibold text-foreground">
            <Phone className="h-4 w-4" aria-hidden /> {c.call}
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{c.note}</p>
      </div>
    </section>
  );
}
