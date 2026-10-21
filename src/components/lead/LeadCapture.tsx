import Link from "@/components/ui/Link";
import { ArrowRight, CalendarClock, Phone, PhoneCall, Route, Scale } from "lucide-react";
import { InlineLeadForm } from "@/components/lead/InlineLeadForm";
import CounsellorFaces from "@/components/lead/CounsellorFaces";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CONTACT_INFO } from "@/lib/constants";
import { TeamFigure } from "@/components/engage/TeamFigures";

/** What a family gets from a counsellor — the work, not the data. */
const TILES = [
  { icon: Route, title: "A round-by-round plan", body: "Which colleges to fill, in what order" },
  { icon: Scale, title: "Every quota mapped", body: "All India, home state, private, deemed" },
  { icon: PhoneCall, title: "Colleges called for you", body: "Real fees, bond and hidden charges" },
  { icon: CalendarClock, title: "Deadlines handled", body: "Registrations, rounds and documents" },
];

/**
 * The counsellor block, dropped into a page with one line.
 *
 * It used to carry a long enquiry form (rank, course, states, quota). The seat
 * predictor now asks all of that and more, step by step, so the block's job is
 * to make the case for a counsellor and put one a tap away: the team, WhatsApp,
 * a call, or the predictor first. A page that genuinely needs a call-back form
 * (the contact page) passes `withForm`.
 */
export default function LeadCapture({
  level = "pg",
  source,
  title,
  body,
  points,
  withForm = false,
}: {
  level?: "ug" | "pg";
  source: string;
  title?: string;
  body?: string;
  points?: string[];
  withForm?: boolean;
}) {
  /**
   * Blank is absent, which `??` does not believe: an unset CMS setting arrives
   * as `""`, which would otherwise render an empty heading.
   */
  const given = (v?: string) => (v && v.trim() ? v : undefined);

  const customTitle = given(title);
  const blurb =
    given(body) ??
    (level === "ug"
      ? "Students with the same rank — even a better one — end up a whole tier apart: a lesser college, a dearer quota, a seat given away in round 1. What decides it is the order they filled, the round they froze in and the quota they chose. Those are the calls an expert counsellor makes with you."
      : "Doctors with the same rank — even a better one — end up in very different branches and colleges. What decides it is the order they filled, the round they froze in and the quota they chose. Those are the calls an expert counsellor makes with you.");

  const bullets = points?.filter(Boolean) ?? [];
  const wa = CONTACT_INFO.whatsapp.replace(/\D/g, "");
  const predictor = `/neet-college-predictor?course=${level === "ug" ? "mbbs" : "pg"}`;

  return (
    <section id="enquiry" className="container-custom mb-16 mt-4 scroll-mt-24" aria-labelledby="enquiry-heading">
      <div className="relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-br from-slate-900 to-cyan-950 p-6 text-white shadow-2xl dark:border-slate-800 dark:from-slate-950 dark:to-cyan-950/80 md:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-500 opacity-20 mix-blend-multiply blur-3xl" />

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
          <div>
            <h2 id="enquiry-heading" className="text-[1.65rem] font-black leading-[1.15] tracking-tight md:text-[2.15rem]">
              {customTitle ?? (
                <>
                  Same rank — or even better — and still a lower seat?{" "}
                  <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                    The difference is your counsellor.
                  </span>
                </>
              )}
            </h2>
            <p className="mb-6 mt-3 text-[15px] font-medium leading-relaxed text-cyan-100/80 md:text-base">{blurb}</p>

            {bullets.length > 0 ? (
              <ul className="space-y-2">
                {bullets.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm font-bold text-cyan-50">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="grid grid-cols-2 gap-3">
                {TILES.map((t) => (
                  <li key={t.title} className="rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm sm:p-4">
                    <t.icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                    <p className="mt-2 text-[15px] font-bold text-white">{t.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-cyan-100/70 sm:text-[13px]">{t.body}</p>
                  </li>
                ))}
              </ul>
            )}

            {withForm && (
              <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                <CounsellorFaces tone="dark" />
                <p className="text-[13.5px] leading-snug text-cyan-100/80">
                  <TeamFigure k="years" /> years of NEET counselling.
                  <br />
                  <span className="font-semibold text-white">Expert counsellors, open daily 10 AM – 10 PM.</span>
                </p>
              </div>
            )}
          </div>

          <div className="relative z-10 mx-auto w-full max-w-md lg:max-w-none">
            {withForm ? (
              <InlineLeadForm source={source} level={level} />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur md:p-7">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" /> Expert counsellors · open daily 10 AM – 10 PM
                </p>
                <p className="font-heading mt-3 text-[1.35rem] font-extrabold leading-tight text-white">
                  Talk to the people who make these calls
                </p>
                <p className="mt-1 text-[13.5px] text-cyan-100/70"><TeamFigure k="years" /> years of NEET counselling. Tap a counsellor to see their card.</p>
                <div className="mt-5">
                  <CounsellorFaces tone="dark" withNames />
                </div>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <a
                    href={`https://wa.me/${wa}?text=${encodeURIComponent("Hello AdmissionHands, I would like to talk to an expert counsellor about my NEET admission.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-[15px] font-bold text-white hover:bg-[#1fbf5b]"
                  >
                    <WhatsAppIcon className="h-5 w-5" /> WhatsApp
                  </a>
                  <a
                    href={`tel:${CONTACT_INFO.phone}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-[15px] font-bold text-white hover:border-cyan-300/50"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" /> Call now
                  </a>
                </div>
                <Link
                  href={predictor}
                  className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-4 text-[15px] font-bold text-white shadow-lg"
                >
                  Check my chances first <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
