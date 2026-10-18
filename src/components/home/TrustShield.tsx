import Link from "@/components/ui/Link";
import { AlertTriangle, BadgeCheck, Building2, Database, MapPin, ShieldCheck, Users, XCircle } from "lucide-react";
import { OFFICE, CONTACT_INFO } from "@/lib/constants";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

/**
 * 15+ years, and how a family can check that for themselves.
 *
 * Admission season brings out agents who promise a "confirmed" government seat
 * or take cash to "book" a management seat. The answer to that is not a bigger
 * claim of our own — it is things a parent can verify before trusting anybody:
 * an office they can walk into, counsellors with names and faces, a registered
 * business, and figures that come from the counselling authorities.
 *
 * The warning signs are general facts about Indian medical counselling, not
 * promises about us, so they stay true whoever reads them.
 */

const VERIFY = [
  {
    icon: MapPin,
    title: "An office you can walk into",
    body: `${OFFICE.street}, ${OFFICE.locality} — ${OFFICE.hoursShort}.`,
    href: "/contact",
    link: "Directions",
  },
  {
    icon: Users,
    title: "Counsellors with names and faces",
    body: "Talk to the person, not a call centre. Every counsellor is on our team page.",
    href: "/team",
    link: "Meet the team",
  },
  {
    icon: Building2,
    title: "A registered business",
    body: "A GST-registered business, not a phone number on a flyer. Ask us for the registration details.",
    href: "/contact",
    link: "Contact details",
  },
  {
    icon: Database,
    title: "Figures from the authorities",
    body: "Every chance we show comes from MCC and state counselling results, round by round.",
    href: "/neet-college-predictor",
    link: "Check your rank",
  },
];

const RED_FLAGS = [
  "Anyone who “guarantees” a government seat. MCC and state counselling allot strictly by merit — nobody can promise one.",
  "Cash to “book” a management or NRI seat before counselling. Since NEET, those seats are filled through official counselling too.",
  "Fees paid into a person's own account or UPI. Seat fees go only to the college or the counselling authority.",
  "Requests for your NEET or MCC login, password or OTP. Never share them — not with anybody.",
  "No office, no invoice, no written terms. A genuine counsellor has all three.",
  "Any claim you cannot check yourself on mcc.nic.in or your state's counselling website.",
];

export default function TrustShield() {
  const wa = CONTACT_INFO.whatsapp.replace(/\D/g, "");
  return (
    <section className="relative overflow-hidden py-16 md:py-24" aria-labelledby="trust-h">
      <div className="ambient-blob pointer-events-none absolute -left-40 top-10 h-[26rem] w-[26rem] bg-primary/15" aria-hidden="true" />
      <div className="container-custom relative">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          {/* ---------------- the USP ---------------- */}
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Trusted through 15+ admission seasons
            </p>
            <div className="mt-5 flex items-end gap-4">
              <span className="font-heading text-gradient-brand text-[clamp(5rem,12vw,8.5rem)] font-extrabold leading-[0.85] tracking-[-0.04em]">
                15+
              </span>
              <span className="font-heading pb-2 text-[clamp(1.2rem,2.4vw,1.7rem)] font-extrabold leading-tight text-foreground">
                Years of
                <br />
                excellence
              </span>
            </div>
            <h2 id="trust-h" className="font-heading mt-5 max-w-[22ch] text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold leading-tight text-foreground">
              Every rule change in medical counselling, navigated with real families.
            </h2>
            <p className="mt-3 max-w-[56ch] text-[15.5px] leading-relaxed text-muted-foreground">
              More than fifteen admission seasons of MBBS, BDS, MD/MS and NRI counselling — through every new rule, round and
              quota. Admission season also brings out fake admission agents selling certainty that does not exist. So do not
              take anyone&apos;s word for it, including ours. Verify us.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/neet-college-predictor"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5"
              >
                Check your chances free
              </Link>
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent("Hello AdmissionHands counsellor, someone has offered me a seat. Can you help me check if it is genuine?")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-5 text-[15px] font-bold text-[#128C7E] hover:bg-[#25D366]/15 dark:text-[#25D366]"
              >
                <WhatsAppIcon className="h-5 w-5" /> Ask a counsellor to check an offer
              </a>
            </div>
          </div>

          {/* ---------------- verify us ---------------- */}
          <ul className="grid gap-4 sm:grid-cols-2">
            {VERIFY.map((v) => (
              <li key={v.title} className="card-lift flex flex-col rounded-2xl border border-border bg-card p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <v.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="font-heading mt-3 text-[16px] font-bold text-foreground">{v.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{v.body}</p>
                <Link href={v.href} className="mt-auto pt-3 text-[13.5px] font-semibold text-primary hover:underline">
                  {v.link} →
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ---------------- how to spot a fake agent ---------------- */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-signal-borderline/30 bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-signal-borderline/[0.07] px-6 py-4 md:px-8">
            <AlertTriangle className="h-5 w-5 text-signal-borderline" aria-hidden="true" />
            <h3 className="font-heading text-lg font-extrabold text-foreground">
              Fraud agent se bachein — six warning signs
            </h3>
          </div>
          <ul className="grid gap-x-8 gap-y-4 p-6 md:grid-cols-2 md:p-8">
            {RED_FLAGS.map((f) => (
              <li key={f} className="flex gap-3 text-[14.5px] leading-relaxed text-foreground">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-signal-stretch" aria-hidden="true" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 border-t border-border bg-surface-2 px-6 py-4 text-[13.5px] leading-relaxed text-muted-foreground md:px-8">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            Been offered a seat and not sure? Send it to our counsellors on WhatsApp — they will tell you what to check, free.
          </p>
        </div>
      </div>
    </section>
  );
}
