import type { Metadata } from "next";
import { Mail, Phone, ArrowUpRight } from "lucide-react";
import Link from "@/components/ui/Link";
import { resolveMetadata } from "@/lib/content";
import { OFFICE } from "@/lib/constants";
import StructuredData, { breadcrumb } from "@/components/seo/StructuredData";
import counsellors from "@/data/counsellors.json";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

/**
 * The people behind the advice. Named counsellors with their own contact
 * details are what Google's quality raters and AI answer engines look for on a
 * YMYL site — the 2026-10-09 audit found no person named anywhere. Each links
 * to their shareable card (/<slug>, noindex); this page is the indexable one.
 * Same list as the cards: src/data/counsellors.json.
 */

const PATH = "/team";
const SITE = "https://www.admissionhands.com";

type Counsellor = { slug: string; name: string; title: string; org?: string; photo?: string; phone: string; email: string };
const TEAM = counsellors as Counsellor[];
const pretty = (p: string) => `+91 ${p.slice(2, 7)} ${p.slice(7)}`;
const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata(PATH, {
    title: "Our NEET Counsellors | AdmissionHands Team, Noida",
    description: `Meet the AdmissionHands counsellors — ${TEAM.map((c) => c.name).join(", ")}. Call or WhatsApp them directly for NEET UG and PG counselling.`,
    keywords: "admission hands counsellors, NEET counsellor Noida, medical admission counsellor, NEET PG counsellor, MBBS admission counsellor",
  });
}

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          ...TEAM.map((c) => ({
            "@context": "https://schema.org",
            "@type": "Person",
            "@id": `${SITE}${PATH}#${c.slug}`,
            name: c.name,
            jobTitle: c.title,
            ...(c.photo ? { image: `${SITE}/card/${c.photo}` } : {}),
            telephone: `+${c.phone}`,
            email: c.email,
            url: `${SITE}/${c.slug}`,
            worksFor: { "@id": `${SITE}/#organization` },
            workLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                streetAddress: OFFICE.street,
                addressLocality: OFFICE.locality,
                addressRegion: OFFICE.region,
                postalCode: OFFICE.postalCode,
                addressCountry: OFFICE.country,
              },
            },
          })),
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "Our team", path: PATH },
          ]),
        ]}
      />

      <section className="bg-slate-950">
        <div className="container-custom py-12 md:py-16">
          <h1 className="font-heading text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            Our counsellors
          </h1>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            The people you speak to at AdmissionHands. Call or WhatsApp any of them directly — or visit the office in{" "}
            {OFFICE.locality}, open {OFFICE.hoursShort}.
          </p>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <ul className="grid gap-5 sm:grid-cols-2">
          {TEAM.map((c) => (
            <li key={c.slug} id={c.slug} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                {c.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a static file in public/card, already sized
                  <img
                    src={`/card/${c.photo}`}
                    alt={c.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-primary/30"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="font-heading grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary-soft text-xl font-extrabold text-primary-strong ring-2 ring-primary/30"
                  >
                    {initials(c.name)}
                  </div>
                )}
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">{c.name}</h2>
                  <p className="text-sm font-medium text-foreground">{c.title}</p>
                  {c.org && <p className="text-sm text-muted-foreground">{c.org}</p>}
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                <li>
                  <a href={`tel:+${c.phone}`} className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-4 hover:border-primary">
                    <Phone className="h-4 w-4 text-primary-strong" aria-hidden="true" />
                    <span className="tnum font-semibold text-foreground">{pretty(c.phone)}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${c.phone}?text=${encodeURIComponent(`Hello ${c.name.split(" ")[0]}, I need guidance for NEET counselling.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-4 hover:border-primary"
                  >
                    <WhatsAppIcon className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-foreground">WhatsApp</span>
                  </a>
                </li>
                <li>
                  <a href={`mailto:${c.email}`} className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-4 hover:border-primary">
                    <Mail className="h-4 w-4 text-primary-strong" aria-hidden="true" />
                    <span className="break-all text-foreground">{c.email}</span>
                  </a>
                </li>
              </ul>
              <a
                href={`/${c.slug}`}
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
              >
                Open {c.name.split(" ")[0]}&rsquo;s card <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">
          Prefer to visit? See the <Link href="/contact" className="font-semibold text-primary-strong underline-offset-2 hover:underline">office address and directions</Link>.
        </p>
      </section>
    </main>
  );
}
