import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { CheckCircle2, ClipboardCheck, ExternalLink, Landmark, Mail, ShieldCheck, Users } from "lucide-react";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import SectionHead from "@/components/ui/SectionHead";
import TelegramJoin from "@/components/engage/TelegramJoin";
import LeadCapture from "@/components/lead/LeadCapture";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import { getBlocks, resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { NRI_DOCUMENTS, NRI_DOCUMENT_GROUPS, type NriDocument } from "@/lib/nriDocuments";

/**
 * NRI-quota documents (rebuilt 2026-10-18). It was a skeleton — one item under
 * each heading of a "complete guide". Now it is MCC's own 2025 list, item by
 * item, with who may sponsor and how the papers are checked. The checklist is
 * the admin's `nri_documents` collection (one row per document, the subtitle is
 * its group) and every sentence is in Admin → Content ("Page: NRI documents"),
 * because these rules are re-issued each cycle.
 */

const PATH = "/nri-quota/documents";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata(PATH, {
    title: "NRI Quota Documents Checklist for MBBS, BDS & MD/MS (MCC)",
    description:
      "The documents MCC asks NRI-quota candidates for — NRI certificate, the sponsor's passport and visa, relationship certificate, sponsorship affidavit with NRE passbook — and who may sponsor you.",
    keywords:
      "NRI quota documents, NRI quota documents required for MBBS, NRI sponsored candidate documents, NRI certificate embassy MBBS, NRI quota affidavit, MCC NRI documents, NRI quota MD MS documents",
  });
}

export default async function NriDocumentsPage() {
  const [blocks, copy, body, heroImage] = await Promise.all([
    getBlocks("nri_documents"),
    pageCopy("page.nri_documents.hero", { count: "" }),
    pageCopy("page.nri_documents.body"),
    pageHeroImage("page.nri_documents.hero"),
  ]);

  const docs: NriDocument[] = blocks.length
    ? blocks.map((b) => ({ title: (b.title ?? "").trim(), group: (b.subtitle ?? "").trim() || "Documents", body: (b.body ?? "").trim() }))
    : NRI_DOCUMENTS;
  const groups = [
    ...NRI_DOCUMENT_GROUPS.filter((g) => docs.some((d) => d.group === g)),
    ...Array.from(new Set(docs.map((d) => d.group))).filter((g) => !NRI_DOCUMENT_GROUPS.includes(g)),
  ];
  // The hero line counts what the checklist actually holds.
  const subtitle = copy.subtitle.replace(/\{count\}|\s{2,}/g, (m) => (m === "{count}" ? String(docs.length) : " "));

  const faqs = [1, 2, 3, 4, 5]
    .map((i) => ({ question: body[`faq${i}_q` as keyof typeof body], answer: body[`faq${i}_a` as keyof typeof body] }))
    .filter((f) => f.question && f.answer);

  const steps = [
    { icon: Mail, text: body.process_1 },
    { icon: ClipboardCheck, text: body.process_2 },
    { icon: ShieldCheck, text: body.process_3 },
  ].filter((s) => s.text);

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({ name: "NRI quota documents checklist", description: subtitle, path: PATH }),
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NRI quota", path: "/nri-quota" },
            { name: "Documents", path: PATH },
          ]),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NRI quota", href: "/nri-quota" }, { label: "Documents" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={subtitle}
        stats={[
          { label: "Documents", value: String(docs.length), note: "from MCC's 2025 notices" },
          { label: "Sent", value: "Every round", note: "one email, MCC's format" },
          { label: "Checked", value: "Twice", note: "the mission and the college" },
        ]}
        cta={{ label: copy.cta, href: "/contact" }}
        telegram="hero_nri_documents"
        source={copy.source}
        image={heroImage}
        topic="document"
        visual={
          <HeroFacts
            title={copy.visual_title}
            // Sentences, not figures: set lighter than the panel's number style.
            facts={[
              { label: "Who counts as an NRI", text: body.rule_nri },
              { label: "A ward (MBBS/BDS)", text: body.rule_ward },
              { label: "MD/MS priority", text: body.rule_pg },
              { label: "Sponsorship", text: body.rule_sponsor },
            ].map((f) => ({
              label: f.label,
              value: <span className="font-body text-[14px] font-medium leading-relaxed text-foreground">{f.text}</span>,
              wide: true,
            }))}
          />
        }
      />

      <div className="container-custom py-10 md:py-14">
        {/* ------------------------------ checklist ------------------------------ */}
        <section>
          <SectionHead icon="document" eyebrow="MCC · 2025" title={body.list_title} intro={body.list_intro} />
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {groups.map((g, gi) => (
              <div
                key={g}
                className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_40px_-26px_rgb(8_145_178/0.45)]"
              >
                <span className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-400/10 blur-2xl" aria-hidden="true" />
                <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-primary-strong">Part {gi + 1}</p>
                <h3 className="font-heading mt-1 text-lg font-bold text-foreground">{g}</h3>
                <ul className="mt-4 space-y-4">
                  {docs
                    .filter((d) => d.group === g)
                    .map((d) => (
                      <li key={d.title} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                        <div>
                          <p className="font-semibold leading-snug text-foreground">{d.title}</p>
                          {d.body && <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{d.body}</p>}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------ eligibility ----------------------------- */}
        <section className="mt-14">
          <SectionHead icon="people" eyebrow="Eligibility" title={body.eligibility_title} intro={body.rule_nri} />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {[
              { icon: Users, t: body.ug_title, d: body.ug_body },
              { icon: Landmark, t: body.pg_title, d: body.pg_body },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-3xl border border-border bg-surface-1 p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">{t}</h3>
                </div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------- process -------------------------------- */}
        {steps.length > 0 && (
          <section className="mt-14">
            <SectionHead icon="route" eyebrow="Verification" title={body.process_title} />
            <ol className="mt-6 grid gap-5 md:grid-cols-3">
              {steps.map(({ icon: Icon, text }, i) => (
                <li key={i} className="relative rounded-3xl border border-border bg-card p-6">
                  <span className="tnum absolute right-5 top-4 font-heading text-4xl font-black text-primary/10" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-glow" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-[14.5px] leading-relaxed text-foreground/85">{text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {body.states_note && (
          <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-primary/25 bg-primary-soft/50 p-6 md:flex-row md:items-center md:justify-between">
            <p className="max-w-[72ch] text-[14.5px] leading-relaxed text-foreground">{body.states_note}</p>
            <Link
              href="/nri-quota/colleges"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-5 text-[14px] font-semibold text-white shadow-glow"
            >
              Colleges with NRI seats
            </Link>
          </div>
        )}

        {/* --------------------------------- faq --------------------------------- */}
        {faqs.length > 0 && (
          <section className="mt-14">
            <SectionHead icon="help" eyebrow="FAQ" title="NRI documents: common questions" />
            <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
              {faqs.map((f) => (
                <div key={f.question} className="p-5">
                  <dt className="font-heading text-[15px] font-bold leading-snug text-foreground md:text-base">{f.question}</dt>
                  <dd className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <nav aria-label="Related" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/nri-quota", t: "NRI quota, explained", d: "How the quota works and the timeline" },
            { href: "/nri-quota/colleges", t: "Colleges with NRI seats", d: "MBBS, BDS and MD/MS, state by state" },
            { href: "/nri-quota/fees", t: "NRI quota fees", d: "What NRI seats cost" },
            { href: "https://mcc.nic.in", t: "MCC's notices", d: "The current year's rules, at the source", ext: true },
          ].map((l) =>
            l.ext ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <span className="font-heading flex items-center gap-1.5 text-[15px] font-bold text-foreground">
                  {l.t} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">{l.d}</span>
              </a>
            ) : (
              <Link key={l.href} href={l.href} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <span className="font-heading block text-[15px] font-bold text-foreground">{l.t}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">{l.d}</span>
              </Link>
            ),
          )}
        </nav>
      </div>

      <LeadCapture level="ug" source="NRI documents" />
      <TelegramJoin placement="nri_documents" />
    </main>
  );
}
