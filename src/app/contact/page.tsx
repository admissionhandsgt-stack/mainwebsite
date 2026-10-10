import type { Metadata } from "next";
import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { getContactInfo, resolveMetadata } from "@/lib/content";
import { CONTACT_INFO, OFFICE } from "@/lib/constants";
import StructuredData, { breadcrumb, organization } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

/**
 * The page a Google Business Profile points at, and the one place the office's
 * name, address and phone are stated in full. /contact and /contact-us both
 * answered 404 until 2026-10-09; the address lived only in the footer.
 */

const PATH = "/contact";
const SITE = "https://www.admissionhands.com";
const ADDRESS = `${OFFICE.street}, ${OFFICE.locality}, ${OFFICE.region} ${OFFICE.postalCode}`;
// A search link needs no API key and no map embed (which the CSP does not allow).
const DIRECTIONS = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`AdmissionHands, ${ADDRESS}`)}`;

/** "+919310301949" -> "+91 93103 01949" */
function pretty(phone: string) {
  const d = phone.replace(/\D/g, "").replace(/^91/, "");
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : phone;
}

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata(PATH, {
    title: "Contact AdmissionHands: Noida Office, Phone & WhatsApp",
    description: `Call, WhatsApp or visit AdmissionHands for NEET UG and PG counselling. Office: ${OFFICE.street}, ${OFFICE.locality}. ${OFFICE.hoursLabel}.`,
    keywords: "admission hands contact, admissionhands noida, NEET counselling Noida, medical admission consultant Noida, NEET counselling phone number",
  });
}

export default async function ContactPage() {
  const info = await getContactInfo();
  const phone = info?.phoneNumber || CONTACT_INFO.phone;
  const whatsapp = (info?.whatsappNumber || CONTACT_INFO.whatsapp).replace(/\D/g, "");
  const email = info?.email || CONTACT_INFO.email;

  const rows = [
    { icon: Phone, label: "Phone", value: pretty(phone), href: `tel:${phone}` },
    { icon: WhatsAppIcon, label: "WhatsApp", value: pretty(`+${whatsapp}`), href: `https://wa.me/${whatsapp}` },
    { icon: Mail, label: "Email", value: email, href: `mailto:${email}` },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          organization({ phone, email }),
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact AdmissionHands",
            url: `${SITE}${PATH}`,
            about: { "@id": `${SITE}/#organization` },
          },
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "Contact", path: PATH },
          ]),
        ]}
      />

      <section className="bg-slate-950">
        <div className="container-custom py-12 md:py-16">
          <h1 className="font-heading text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            Contact AdmissionHands
          </h1>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            NEET UG and NEET PG admission counselling. Talk to us by phone or WhatsApp from anywhere in India, or visit
            the office in Noida.
          </p>
        </div>
      </section>

      <section className="container-custom grid gap-6 py-10 md:grid-cols-2 md:py-14">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Office</h2>
          <address className="mt-4 flex gap-3 not-italic leading-relaxed text-foreground">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary-strong" aria-hidden="true" />
            <span>
              AdmissionHands
              <br />
              {OFFICE.street}
              <br />
              {OFFICE.locality}, {OFFICE.region} {OFFICE.postalCode}
            </span>
          </address>
          <p className="mt-4 flex gap-3 text-foreground">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" aria-hidden="true" />
            <span>
              {OFFICE.hoursLabel}
              <span className="block text-sm text-muted-foreground">Open all seven days. Please call before you visit.</span>
            </span>
          </p>
          <a
            href={DIRECTIONS}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Navigation className="h-4 w-4" aria-hidden="true" /> Get directions
          </a>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Phone, WhatsApp and email</h2>
          <ul className="mt-4 space-y-3">
            {rows.map(({ icon: Icon, label, value, href }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-4 py-2 transition-colors hover:border-primary"
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary-strong" aria-hidden="true" />
                  <span>
                    <span className="block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
                    <span className="tnum font-semibold text-foreground">{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Counselling runs on phone, WhatsApp and video calls for students across India; the office is for families
            who would rather meet in person.
          </p>
        </div>
      </section>

      <LeadCapture
        level="ug"
        source="Contact page"
        title="Prefer a call back?"
        body="Leave your number and NEET rank, and a counsellor will call you."
      />
    </main>
  );
}
