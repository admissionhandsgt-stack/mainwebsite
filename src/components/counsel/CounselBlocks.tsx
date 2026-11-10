import Link from "@/components/ui/Link";
import { ArrowRight, Building2, Landmark, MessageCircle, Phone } from "lucide-react";
import SectionHead from "@/components/ui/SectionHead";

/**
 * The blocks the counselling-guidance pages by state share (/counselling/neet-pg/<state>, /counselling/mbbs/<state>).
 * Server components; every word arrives from Admin → Content through the page.
 */

/** "Title | text" lines. */
export const pairs = (v: string) =>
  v
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x[0] && x[1]) as [string, string][];

/** The two counsellings that fill a state's seats, side by side. */
export function RouteCards({ title, cards, children }: { title: string; cards: [string, string][]; children?: React.ReactNode }) {
  const ICON = [Landmark, Building2];
  return (
    <section className="container-custom py-10 md:py-14">
      <SectionHead icon="map" title={title} />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {cards.map(([t, d], i) => {
          const Icon = ICON[i % ICON.length];
          return (
            <div key={t} className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-strong ring-1 ring-primary/15">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-heading text-[17px] font-bold leading-snug text-foreground">{t}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{d}</p>
            </div>
          );
        })}
      </div>
      {children}
    </section>
  );
}

/** How the team works with a student of this state: numbered steps and the two ways to start. */
export function HowWeWork({ title, steps, wa, phone }: { title: string; steps: [string, string][]; wa: string; phone: string }) {
  if (!steps.length) return null;
  return (
    <section className="border-y border-border bg-surface-1 py-10 md:py-14">
      <div className="container-custom">
        <SectionHead icon="route" title={title} />
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-border bg-card p-5">
              <span className="tnum flex h-8 w-8 items-center justify-center rounded-full bg-primary-strong text-sm font-bold text-primary-foreground">{i + 1}</span>
              <h3 className="mt-3 font-heading text-[15.5px] font-bold leading-snug text-foreground">{t}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={wa}
            target="_blank"
            rel="noopener"
            data-placement="counsel_state_how"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-bold text-accent-foreground hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp a counsellor
          </a>
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            data-placement="counsel_state_how"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-[15px] font-bold text-foreground hover:border-primary/40"
          >
            <Phone className="h-4 w-4" aria-hidden="true" /> Call
          </a>
        </div>
      </div>
    </section>
  );
}

export function FaqList({ title, faqs }: { title: string; faqs: { question: string; answer: string }[] }) {
  return (
    <section className="container-custom py-10 md:py-14">
      <SectionHead icon="help" title={title} />
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {faqs.map((f) => (
          <details key={f.question} className="rounded-2xl border border-border bg-card p-5" open>
            <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
            <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function LinkCards({ title, links }: { title: string; links: { label: string; href: string; note?: string }[] }) {
  if (!links.length) return null;
  return (
    <section className="container-custom pb-10 md:pb-14">
      <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="group flex h-full items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary"
            >
              <span>
                <span className="block font-semibold text-foreground">{l.label}</span>
                {l.note && <span className="mt-0.5 block text-[13px] text-muted-foreground">{l.note}</span>}
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StateChips({ title, items }: { title: string; items: { name: string; href: string }[] }) {
  if (!items.length) return null;
  return (
    <section className="container-custom border-t border-border py-10">
      <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
