import { BedDouble, DoorOpen, Info, ScrollText, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import SectionHead from "@/components/ui/SectionHead";
import type { SeatFamily, SeatTerms as Terms } from "@/lib/pgSeatData";

/**
 * "Bond, stipend and seat-leaving rules" on a PG college page (2026-10-20): one card per type of
 * seat — the stipend each year, the service bond, what leaving the seat costs, the hostel.
 *
 * The figures are a third-party compilation (pg_seat_terms), so the caveat is part of the
 * component, not an option: it says what the source is and to confirm before paying. Words from
 * Admin → Content ("Page: PG college pages — MCC seats, bond and stipend").
 */
export interface SeatTermsCopy {
  eyebrow: string;
  title: string;
  intro: string;
  caveat: string;
  stipend: string;
  bond: string;
  exit: string;
  hostel: string;
  more: string;
  link: string;
}

const FAMILY: Record<SeatFamily, string> = {
  aiq: "All India Quota",
  state: "State quota",
  management: "Management seat",
  nri: "NRI seat",
  dnb: "DNB / NBE seat",
};
const SEAT_TYPE: Record<string, string> = {
  AIQ: "All India Quota",
  MNG: "Management (paid) seat",
  NRI: "NRI seat",
  "DNB Post MBBS": "DNB, after MBBS",
  "NBE Diploma": "NBE diploma",
};
const VARY: Record<string, string> = {
  "service status": "Different for in-service candidates",
  category: "Differs by category",
  "course type": "Differs by course",
  quota: "Differs by quota",
};

/** ₹12,34,567 for a monthly figure; ₹40 L / ₹1.2 Cr for a penalty. */
const rupees = (v: number) => `₹${v.toLocaleString("en-IN")}`;
const big = (v: number) => {
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return rupees(v);
};
const years = (y: number) => `${y} year${y === 1 ? "" : "s"}`;

function stipendText(s: Terms["stipend"]): ReactNode {
  const [y1, y2, y3] = s;
  if (!y1 && !y2 && !y3) return null;
  if (y1 && y1 === y2 && y2 === y3) return `${rupees(y1)}, all three years`;
  return [y1, y2, y3].map((v, i) => (v ? `Y${i + 1} ${rupees(v)}` : null)).filter(Boolean).join(" · ");
}

function bondText(t: Terms): { value: string; sub?: string } {
  if (t.bondUnknown) return { value: "Not stated" };
  const vary = t.bondVaries ? "Not the same for every course here" : t.bondVaryBy ? VARY[t.bondVaryBy] : undefined;
  if (!t.bondYears) return { value: "No bond listed", sub: vary };
  return { value: `${years(t.bondYears)}${t.bondPenalty ? ` · ${big(t.bondPenalty)} if not served` : ""}`, sub: vary };
}

function exitText(t: Terms): { value: string; sub?: string } {
  const sub = [t.exitFullCourseFee ? "The whole course fee is kept" : null, t.exitRefundStipend ? "Stipend received is paid back" : null]
    .filter(Boolean)
    .join(" · ");
  if (t.exitNoPenalty && !t.exitPenalty) return { value: "No penalty listed", sub: sub || undefined };
  const parts = [t.exitPenalty ? `${big(t.exitPenalty)} penalty` : null, t.exitDebarYears ? `barred ${years(t.exitDebarYears)}` : null].filter(Boolean);
  return { value: parts.length ? parts.join(" · ") : "Not stated", sub: sub || undefined };
}

function hostelText(t: Terms): string | null {
  if (!t.hostelPeriod || !t.hostelMin) return null;
  const range = t.hostelMax && t.hostelMax !== t.hostelMin ? `${rupees(t.hostelMin)}–${rupees(t.hostelMax)}` : rupees(t.hostelMin);
  return `${range} a ${t.hostelPeriod}${t.hostelMess ? " · mess included" : ""}`;
}

function Row({ icon: Icon, label, value, sub }: { icon: typeof Wallet; label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong dark:text-primary" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
        <dd className="tnum mt-0.5 text-[14.5px] font-semibold leading-snug text-foreground">{value}</dd>
        {sub && <dd className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{sub}</dd>}
      </div>
    </div>
  );
}

function Card({ t, copy }: { t: Terms; copy: SeatTermsCopy }) {
  const counselling = t.counselling && /^AIQ - MCC/i.test(t.counselling) ? "MCC" : t.counselling;
  const stipend = stipendText(t.stipend);
  const bond = bondText(t);
  const exit = exitText(t);
  const hostel = hostelText(t);
  const name = SEAT_TYPE[t.seatType] ?? t.seatType;
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      {FAMILY[t.family] !== name && (
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary-strong dark:text-primary">{FAMILY[t.family]}</p>
      )}
      <h3 className="font-heading mt-1 text-[16px] font-bold leading-snug text-foreground">{name}</h3>
      {counselling && <p className="mt-0.5 text-[12.5px] text-muted-foreground">Counselling: {counselling}</p>}
      <dl className="mt-4 space-y-3.5">
        {stipend && <Row icon={Wallet} label={copy.stipend} value={stipend} />}
        <Row icon={ScrollText} label={copy.bond} value={bond.value} sub={bond.sub} />
        <Row icon={DoorOpen} label={copy.exit} value={exit.value} sub={exit.sub} />
        {hostel && <Row icon={BedDouble} label={copy.hostel} value={hostel} />}
      </dl>
    </article>
  );
}

const SHOWN = 6;

export default function SeatTerms({ terms, copy }: { terms: Terms[]; copy: SeatTermsCopy }) {
  const first = terms.slice(0, SHOWN);
  const rest = terms.slice(SHOWN);
  return (
    <section id="seat-terms" className="scroll-mt-24">
      <SectionHead icon="document" eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {first.map((t) => (
          <Card key={`${t.counselling}|${t.seatType}`} t={t} copy={copy} />
        ))}
      </div>
      {rest.length > 0 && (
        <details className="group mt-4">
          <summary className="cursor-pointer list-none rounded-xl border border-border bg-card px-4 py-3 text-[14px] font-semibold text-primary-strong hover:border-primary/40 dark:text-primary">
            {copy.more}
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {rest.map((t) => (
              <Card key={`${t.counselling}|${t.seatType}`} t={t} copy={copy} />
            ))}
          </div>
        </details>
      )}
      <p className="mt-5 flex gap-3 rounded-2xl border border-border bg-surface-2 px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          {copy.caveat}{" "}
          <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline dark:text-primary">
            {copy.link}
          </Link>
        </span>
      </p>
    </section>
  );
}
