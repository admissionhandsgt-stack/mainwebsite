import type { Metadata } from "next";
import { BadgeCheck, CheckCircle2, ExternalLink, FileCheck2, Info, MessageCircle } from "lucide-react";
import Link from "@/components/ui/Link";
import { getBlocks, resolveMetadata } from "@/lib/content";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { PG_DOCUMENTS, type PgDocumentList } from "@/lib/pgDocuments";
import { CONTACT_INFO } from "@/lib/constants";
import { pairs } from "@/components/counsel/CounselBlocks";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import OpenOnHash from "@/components/ui/OpenOnHash";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import { FaqList } from "@/components/counsel/CounselBlocks";

/**
 * "Documents required for NEET PG counselling" (2026-11-12, the journey study: 160+ phrasings, MCC's and each state's,
 * and the site had only the NRI list). MCC's list first, then the states', each as its own authority prints it with the
 * document linked. Lists: Admin → Content → Sections & lists → "NEET PG · documents by authority" (`pg_documents_official`, one row
 * per authority), falling back to lib/pgDocuments.ts. Words: Admin → Content → "Page: NEET PG documents".
 */

const PATH = "/neet-pg-documents";
const anchorOf = (s: string) => s.toLowerCase().split(/\s+[—-]\s+/)[0].replace(/&/g, "and").replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const lines = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

async function lists(): Promise<PgDocumentList[]> {
  const blocks = await getBlocks("pg_documents_official").catch(() => []);
  if (!blocks.length) return PG_DOCUMENTS;
  return blocks
    .map((b) => ({
      title: (b.title ?? "").trim(),
      subtitle: (b.subtitle ?? "").trim(),
      body: (b.body ?? "").trim(),
      url: String(b.data?.url ?? b.linkUrl ?? "").trim(),
      notes: String(b.data?.notes ?? "").trim(),
      checked: String(b.data?.checked ?? "").trim(),
    }))
    .filter((l) => l.title && l.body);
}

export async function generateMetadata(): Promise<Metadata> {
  const c = await pageCopy("page.pg_documents");
  return resolveMetadata(PATH, {
    title: fitTitle(c.seo_title, "Documents Required for NEET PG Counselling 2026", "NEET PG Documents List"),
    description: fitDescription(c.seo_description),
    keywords:
      "documents required for neet pg counselling, neet pg documents list, neet pg reporting documents, mcc neet pg documents, neet pg counselling documents pdf, documents for pg admission, neet pg document verification",
  });
}

function Checklist({ body }: { body: string }) {
  const items = lines(body);
  let n = 0;
  return (
    <ol className="mt-3 space-y-2">
      {items.map((raw) => {
        if (raw.startsWith("## ")) {
          return (
            <li key={raw} className="pt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {raw.slice(3)}
            </li>
          );
        }
        const essential = raw.startsWith("[E] ");
        const text = essential ? raw.slice(4) : raw;
        n++;
        return (
          <li key={raw} className="flex gap-3 text-[14.5px] leading-snug text-foreground">
            <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-bold text-primary-strong dark:text-primary">
              {n}
            </span>
            <span>
              {text}
              {essential && (
                <span className="ml-2 inline-flex items-center rounded-full border border-signal-borderline/40 bg-signal-borderline/10 px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide text-signal-borderline">
                  Essential
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function PgDocumentsPage() {
  const [all, c, heroImage] = await Promise.all([lists(), pageCopy("page.pg_documents"), pageHeroImage("page.pg_documents.hero", "page.nri_documents.hero")]);
  const [mcc, ...states] = all;
  const faqs = pairs(c.faqs).map(([question, answer]) => ({ question, answer }));
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(c.wa_text)}`;

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET PG counselling", path: "/neet-pg-process" },
            { name: "Documents", path: PATH },
          ]),
          webPage({ name: "Documents required for NEET PG counselling 2026", description: c.subtitle, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET PG counselling", href: "/neet-pg-process" }, { label: "Documents" }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={c.subtitle}
        image={heroImage}
        topic="document"
        cta={{ label: c.cta, href: "#mcc" }}
        telegram="hero_pg_documents"
        source={c.source}
        insights={[
          { icon: "authority" as const, label: c.insight_lists, value: String(all.length) },
          { icon: "spark" as const, label: c.insight_essential, value: String(lines(mcc?.body).filter((l) => l.startsWith("[E] ")).length) },
          { icon: "up" as const, label: c.insight_internship, value: c.internship_date },
          { icon: "people" as const, label: c.insight_upload, value: c.upload_days },
        ]}
      />

      {mcc && (
        <section id="mcc" className="container-custom scroll-mt-28 py-10 md:py-14">
          <SectionHead icon="document" eyebrow={c.mcc_eyebrow} title={c.mcc_title} intro={c.mcc_intro} />
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-heading text-[17px] font-extrabold text-foreground">{mcc.title}</h3>
                {mcc.url && (
                  <a href={mcc.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-strong hover:underline dark:text-primary">
                    {c.source_link} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {mcc.subtitle}
                {mcc.checked ? ` · ${c.checked_label} ${mcc.checked}` : ""}
              </p>
              <Checklist body={mcc.body} />
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/25 bg-primary-soft/40 p-5">
                <h3 className="flex items-center gap-2 font-heading text-[16px] font-extrabold text-foreground">
                  <Info className="h-4 w-4 text-primary" aria-hidden="true" /> {c.notes_title}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {lines(mcc.notes).map((x) => (
                    <li key={x} className="flex gap-2.5 text-[14px] leading-snug text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 font-heading text-[16px] font-extrabold text-foreground">
                  <FileCheck2 className="h-4 w-4 text-accent" aria-hidden="true" /> {c.check_title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{c.check_body}</p>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener"
                  data-placement="pg_documents_check"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[14.5px] font-bold text-accent-foreground hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> {c.check_cta}
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {states.length > 0 && (
        <section className="border-y border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="map" eyebrow={c.states_eyebrow} title={c.states_title} intro={c.states_intro} />
            <OpenOnHash />
            <ul className="mt-5 flex flex-wrap gap-2">
              {states.map((s) => (
                <li key={s.title}>
                  <a href={`#${anchorOf(s.title)}`} className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3.5 text-[13.5px] font-medium text-foreground hover:border-primary hover:text-primary">
                    {s.title.split(/\s+[—-]\s+/)[0]}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 lg:columns-2 lg:gap-4 [&>details]:break-inside-avoid">
              {states.map((s) => (
                <details key={s.title} id={anchorOf(s.title)} className="mb-4 scroll-mt-32 rounded-2xl border border-border bg-card p-5" open>
                  <summary className="cursor-pointer font-heading text-[16.5px] font-extrabold text-foreground">{s.title}</summary>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {s.subtitle}
                    {s.checked ? ` · ${c.checked_label} ${s.checked}` : ""}
                  </p>
                  <Checklist body={s.body} />
                  {lines(s.notes).length > 0 && (
                    <ul className="mt-4 space-y-1.5 rounded-xl bg-surface-1 p-3">
                      {lines(s.notes).map((x) => (
                        <li key={x} className="flex gap-2 text-[13px] leading-snug text-muted-foreground">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-primary-strong hover:underline dark:text-primary">
                      {c.source_link} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </details>
              ))}
            </div>
            <p className="mt-2 flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {c.states_note}{" "}
              <Link href="/neet-counselling-updates" className="font-semibold text-primary-strong hover:underline dark:text-primary">{c.updates_link}</Link>
            </p>
          </div>
        </section>
      )}

      <DataPageCounsel kind="cutoff" name={c.counsel_topic} placement="pg_documents" />
      {faqs.length > 0 && <FaqList title={c.faq_title} faqs={faqs} />}
    </main>
  );
}
