
import type { NriStep } from '@/lib/nriContent';

// How an NRI seat is actually got (corrected 2026-10-18): through counselling — MCC for deemed
// universities, the state for private colleges — never by applying to colleges or an interview.
const SHIPPED_STEPS = [
  { step: "01", title: "Qualify NEET-UG", date: "May – June", desc: "NEET-UG is mandatory for MBBS and BDS admission in India, NRI quota included. There is no NRI route around it.", side: "left" },
  { step: "02", title: "Confirm NRI eligibility", date: "June", desc: "Check that you — or your sponsor — meet the NRI definition of the counselling you will use. MCC and each state set it in their own information bulletin, re-issued every year.", side: "right" },
  { step: "03", title: "Prepare the documents", date: "June – July", desc: "NRI status proof, your sponsor's passport and visa, proof of relationship and the affidavits the bulletin lists — gathered before registration opens.", side: "left" },
  { step: "04", title: "Register for counselling", date: "July – August", desc: "Register with MCC for deemed universities and with each state counselling whose private colleges you want. Each is a separate registration with its own fee and deadline.", side: "right" },
  { step: "05", title: "Choice filling and rounds", date: "August – October", desc: "List colleges in order of preference, round by round. NRI documents are checked before an allotment is confirmed — a missing paper at that point can cost the seat.", side: "left" },
  { step: "06", title: "Report and pay", date: "After allotment", desc: "Report to the allotted college within the counselling's deadline with your original documents and the fee, in rupees or US dollars as that college's notice says.", side: "right" },
];

import React from 'react';
import { ClipboardCheck, FileText, Landmark, ListOrdered } from 'lucide-react';

const HELP = [
  { Icon: FileText, title: "Document preparation", desc: "Every paper the bulletin asks for, prepared and checked before registration." },
  { Icon: Landmark, title: "College selection", desc: "The colleges worth listing for your profile, budget and state." },
  { Icon: ClipboardCheck, title: "Counselling registration", desc: "MCC and every state you qualify for — on time, in the right category." },
  { Icon: ListOrdered, title: "Choice filling and rounds", desc: "What to list, in what order, and when to hold or try for better." },
];

/**
 * The NRI process — compact since 2026-10-21 (owner: "kafi sections hai jo professional nahi lagre aur
 * compact kie ja sakte hai"). It was a zig-zag timeline of six dark cards 96px apart plus a second dark
 * card, 2,904px on a laptop; now a light grid of the same six steps and the four ways we help, in a
 * third of the height. The words are the admin's (nri_steps).
 */
const NRIProcess = ({ steps: fromCms }: { steps?: NriStep[] | null } = {}) => {
  const timeline = !fromCms?.length
    ? SHIPPED_STEPS
    : fromCms.map((item, i) => ({
        ...(SHIPPED_STEPS[i] ?? SHIPPED_STEPS[SHIPPED_STEPS.length - 1]),
        step: String(i + 1).padStart(2, '0'),
        title: item.title,
        date: item.date,
        desc: item.desc,
      }));

  return (
    <section className="border-y border-border bg-surface-2 py-12 md:py-16" aria-labelledby="nri-process-h">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="nri-process-h" className="font-heading text-[clamp(1.6rem,3vw,2.25rem)] font-extrabold tracking-tight text-foreground">
            NRI Quota Admission Process
          </h2>
          <p className="mt-2 text-[15.5px] text-muted-foreground">A step-by-step guide to securing your medical seat through the NRI quota</p>
        </div>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {timeline.map((item) => (
            <li key={item.step} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="tnum font-heading inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-strong text-[14px] font-extrabold text-primary-foreground">
                  {item.step}
                </span>
                <span className="rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-primary-strong">
                  {item.date}
                </span>
              </div>
              <h3 className="font-heading mt-3 text-[17px] font-bold leading-snug text-foreground">{item.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{item.desc}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 md:p-6">
          <h3 className="font-heading text-[17px] font-bold text-foreground">How we help NRI families</h3>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HELP.map(({ Icon, title, desc }) => (
              <li key={title} className="flex gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong" aria-hidden="true">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-[14.5px] font-semibold text-foreground">{title}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-snug text-muted-foreground">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default NRIProcess;
