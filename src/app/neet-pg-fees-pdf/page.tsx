import type { Metadata } from "next";
import { FileDown } from "lucide-react";
import Link from "@/components/ui/Link";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getFeePdfStates } from "@/lib/feePdfs";
import { refFor } from "@/lib/feePdfRefs";
import StructuredData, { breadcrumb, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";

/**
 * "NEET PG fees PDF, state wise" (2026-11-11): every state whose PG fee & stipend PDF is built, each a WhatsApp button
 * that types the request — the official number replies with the file (lib/waPdf.ts). Searched as "pg fees pdf",
 * "<state> pg fees pdf". Words: Admin → Content → "Site: PG fee PDF on WhatsApp".
 */
const PATH = "/neet-pg-fees-pdf";

export async function generateMetadata(): Promise<Metadata> {
  const states = await getFeePdfStates();
  return resolveMetadata(PATH, {
    title: "NEET PG Fees PDF 2026-27 State Wise: Fees, Stipend & Bond",
    description: `Free state-wise NEET PG fee PDF: every MD/MS college's 2026-27 fee by quota, stipend and bond — ${states.length} states, sent on WhatsApp in a minute.`,
    keywords: "neet pg fees pdf, pg fees pdf state wise, md ms fees pdf, maharashtra pg fees pdf, karnataka pg fees pdf, pg stipend pdf",
  });
}

export default async function FeePdfHub() {
  const states = await getFeePdfStates();
  const [c, heroImage] = await Promise.all([pageCopy("site.fee_pdf", { count: states.length, state: "your state" }), pageHeroImage("page.pg_fees.hero")]);
  const number = c.number.replace(/\D/g, "");
  // Each state's own typed message, with its ref code ("…PDF (ref MH-PDF)").
  const prefills = new Map(
    await Promise.all(states.map(async (s) => [s.slug, (await pageCopy("site.fee_pdf", { state: s.state, ref: refFor(s.state) })).prefill] as const)),
  );
  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "PG fees by state", path: "/md-ms-india/fees" },
            { name: "PG fees PDF", path: PATH },
          ]),
          webPage({ name: c.hub_title, description: c.hub_intro, path: PATH }),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "PG fees by state", href: "/md-ms-india/fees" }, { label: "PDF" }]}
        eyebrow="Free · on WhatsApp"
        title={c.hub_title}
        subtitle={c.hub_intro}
        image={heroImage}
        topic="document"
        cta={{ label: "Check your chance by rank", href: "/neet-college-predictor?course=pg" }}
        telegram="hero_fee_pdf"
      />
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="document" eyebrow={`${states.length} states`} title="Pick your state" />
        {states.length ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {states.map((s) => {
              const prefill = prefills.get(s.slug) ?? "";
              return (
                <li key={s.slug} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <span>
                    <span className="block font-heading font-bold text-foreground">{s.state}</span>
                    <span className="text-[12.5px] text-muted-foreground">{s.date ? `updated ${s.date}` : "fees, stipend, bond"}</span>
                  </span>
                  <a
                    href={`https://wa.me/${number}?text=${encodeURIComponent(prefill)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-placement="pdf_hub"
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-[13.5px] font-bold text-white hover:brightness-95"
                  >
                    <FileDown className="h-4 w-4" aria-hidden="true" /> Get PDF
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center text-muted-foreground">
            The state PDFs are being prepared. Meanwhile every college&apos;s fee is on{" "}
            <Link href="/md-ms-india/fees" className="font-semibold text-primary-strong hover:underline">
              PG fees by state
            </Link>
            .
          </p>
        )}
        <p className="mt-6 text-[13.5px] leading-relaxed text-muted-foreground">
          Fees as listed for the 2026 counselling or from each college&apos;s 2026-27 notice; stipend and bond as listed for the counselling — not an
          official notice. Confirm with the state authority or the college before you pay or sign. The same figures are on{" "}
          <Link href="/md-ms-india/fees" className="font-semibold text-primary-strong hover:underline">
            PG fees by state
          </Link>
          .
        </p>
      </section>
      <LeadCapture level="pg" source="PG fees PDF page" title="Want the fees set against your rank?" body="Tell us your rank and budget; a counsellor reads the fees, stipend and bond with you, college by college." />
    </main>
  );
}
