import type { Metadata } from "next";
import Link from "next/link";
import { getPgStates } from "@/lib/pgStateQueries";
import { getStipends } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, webPage } from "@/components/seo/StructuredData";

/** Index of the PG state pages — and the link that makes them reachable. */

const PATH = "/md-ms-india/states";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata(PATH, {
    title: "PG Medical Seats by State: NEET PG Cutoff & Fees in Every State",
    description:
      "MD/MS colleges state by state — how many, government or private, the counselling that fills them, NEET PG closing ranks and fees by quota, and the stipend.",
    keywords: "PG seats state wise, NEET PG state quota, MD MS colleges state wise, state quota PG cutoff, PG medical seats in India",
  });
}

export default async function PgStatesIndex() {
  const [states, stipends] = await Promise.all([getPgStates(), getStipends()]);
  const stipendOf = new Map(stipends.states.map((s) => [s.state, s.median]));
  const total = states.reduce((a, s) => a + s.colleges, 0);

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG by state", path: PATH },
          ]),
          webPage({ name: "PG medical seats by state", description: "MD/MS colleges, cutoffs and fees in every state.", path: PATH }),
        ]}
      />
      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            PG medical seats, <span className="text-cyan-300">state by state</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            {total.toLocaleString("en-IN")} PG colleges across {states.length} states and union territories. Open one for its
            quotas, cutoffs, fees, branches and stipend.
          </p>
        </div>
      </section>
      <section className="container-custom py-10 md:py-14">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {states.map((s) => (
            <li key={s.slug}>
              <Link
                href={`${PATH}/${s.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary"
              >
                <span className="font-semibold text-foreground">PG in {s.name}</span>
                <span className="tnum shrink-0 text-right text-[12px] text-muted-foreground">
                  {s.colleges} colleges
                  {stipendOf.get(s.name) ? <span className="block">₹{stipendOf.get(s.name)!.toLocaleString("en-IN")}/mo stipend</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
