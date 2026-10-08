import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { Download, ExternalLink } from "lucide-react";
import { embedCode, getAllDatasets } from "@/lib/openData";
import { getContactInfo, resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, webPage } from "@/components/seo/StructuredData";
import CopyCode from "@/components/seo/CopyCode";

/**
 * Open data — for journalists, teachers, coaching institutes and bloggers.
 * Each dataset: download (CSV), embed (a widget plus a plain source link) and
 * cite. Summary tables only (lib/openData.ts). Every dataset is also described
 * in schema.org Dataset markup, which Google Dataset Search indexes.
 */

const PATH = "/data";
const SITE = "https://www.admissionhands.com";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata(PATH, {
    title: "NEET Counselling Data: Cutoffs, Stipends & Fees (Free CSV)",
    description:
      "Free NEET UG, PG, SS and MDS counselling datasets — cutoffs by category and branch, PG stipend by state, private and deemed fees. Download CSV, embed or cite.",
    keywords: "NEET cutoff data, NEET PG stipend data, NEET counselling dataset, MD fees data, NEET cutoff CSV, medical admission data India",
  });
}

export default async function OpenDataPage() {
  const [datasets, contact] = await Promise.all([getAllDatasets(), getContactInfo()]);

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "Open data", path: PATH },
          ]),
          webPage({ name: "NEET counselling open data", description: "Free datasets: cutoffs, stipends and fees.", path: PATH }),
          ...datasets.map((d) => ({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: d.title,
            description: d.description,
            url: `${SITE}${d.page}`,
            isAccessibleForFree: true,
            creator: { "@type": "Organization", name: "AdmissionHands", url: SITE },
            spatialCoverage: "India",
            variableMeasured: d.columns,
            distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE}/data/${d.id}.csv` }],
          })),
        ]}
      />

      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">Open data</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            NEET counselling data, <span className="text-cyan-300">free to use</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Cutoffs, stipends and fees compiled from the counselling authorities&apos; published results. Download any table as
            CSV, embed it on your site, or quote it — with a link back to the source.
          </p>
          <p className="mt-3 text-[13px] text-slate-400">
            Free to use, with a link to AdmissionHands as the source.
            {contact?.email ? (
              <>
                {" "}Journalists:{" "}
                <a href={`mailto:${contact.email}`} className="font-semibold text-cyan-300 hover:underline">{contact.email}</a>
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <ul className="space-y-6">
          {datasets.map((d) => (
            <li key={d.id} id={d.id} className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h2 className="font-heading text-xl font-bold text-foreground">{d.title}</h2>
              <p className="mt-1 max-w-[72ch] text-sm text-muted-foreground">{d.description}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Source: {d.source} · {d.rows.length.toLocaleString("en-IN")} rows
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/data/${d.id}.csv`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
                </a>
                <Link
                  href={d.page}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
                >
                  See the full page
                </Link>
                <a
                  href={`/embed/${d.id}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> Preview widget
                </a>
              </div>
              <div className="mt-4">
                <CopyCode code={embedCode(d)} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
