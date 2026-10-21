import { Info, MapPin, Target, Users } from "lucide-react";
import { mbbsData } from "@/data/mbbs-india";
import type { MbbsContent } from "@/lib/pageContent";
import type { CopyFields } from "@/lib/pageCopyDefaults";

/**
 * The counselling categories and the seat matrix, one section (owner, 2026-10-21: "do it properly — no
 * regression, and no information hidden").
 *
 * They were two sections — a dark "Counselling System Visualized", whose goal strategies sat behind a
 * "Learn strategy" button one at a time, and a "Seat Distribution & Matrix" beside it. Every word of both
 * is here and in view: the strategy is printed under its category. Each half still follows its own row
 * in Admin → Content → Page layout ("Counselling system", "Seat distribution"); switch one off and the
 * other stands alone.
 */
export function CounsellingAndSeats({
  data = mbbsData,
  copy,
  counselling = true,
  seats = true,
}: {
  data?: MbbsContent;
  copy: CopyFields<"page.mbbs.counselling">;
  counselling?: boolean;
  seats?: boolean;
}) {
  const types = data.counselling.types.filter((t) => t.title || t.body);
  const disclaimer = data.counselling.disclaimer;
  const matrix = data.seats;
  const both = counselling && seats;
  // Three tiles: the total takes a row of its own on a phone, where three abreast split "1,40,314".
  const tiles = matrix.distribution.length;
  // One heading for the section: both halves, or whichever half is switched on.
  const [title, accent] = counselling ? [copy.title, seats ? copy.accent : ""] : [copy.seats_title, ""];

  return (
    <section id="counselling" aria-labelledby="counselling-title" className="scroll-mt-24 bg-surface-1 py-12 md:py-16">
      <div className="container-custom">
        <div className="max-w-3xl">
          {copy.eyebrow && <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary-strong">{copy.eyebrow}</p>}
          <h2 id="counselling-title" className="font-heading mt-2 text-[1.75rem] font-black leading-tight tracking-tight text-foreground [text-wrap:balance] md:text-4xl">
            {title}
            {accent && <> <span className="text-primary-strong dark:text-primary">{accent}</span></>}
          </h2>
          {counselling && copy.intro && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground md:text-base">{copy.intro}</p>}
        </div>

        <div className={`mt-7 grid items-start gap-5 md:mt-8 ${both ? "lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]" : ""}`}>
          {counselling && (
            <div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {types.map((t, ti) => (
                  <li key={`${ti}-${t.title}`} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
                    <h3 className="font-heading text-[16.5px] font-bold leading-snug text-foreground md:text-[17px]">{t.title}</h3>
                    {t.body && <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{t.body}</p>}
                    {t.goalStrategy && (
                      <div className="mt-3.5 flex gap-2.5 rounded-xl border border-primary/20 bg-primary-soft/60 p-3 md:p-3.5">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
                        <div>
                          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-primary-strong dark:text-primary">{copy.strategy_label}</p>
                          <p className="mt-0.5 text-[14px] leading-relaxed text-foreground">{t.goalStrategy}</p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {disclaimer && (
                <p className="mt-4 text-[12.5px] italic leading-relaxed text-muted-foreground">*Disclaimer: {disclaimer}</p>
              )}
            </div>
          )}

          {seats && (
            <aside aria-labelledby={both ? "seat-matrix-title" : undefined} className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
              {both ? (
                <h3 id="seat-matrix-title" className="font-heading flex items-center gap-2 text-xl font-bold text-foreground">
                  <Users className="h-5 w-5 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
                  {copy.seats_title}
                </h3>
              ) : null}
              {copy.seats_intro && <p className={`${both ? "mt-2" : ""} text-[14px] leading-relaxed text-muted-foreground`}>{copy.seats_intro}</p>}

              {matrix.distribution.length > 0 && (
                <dl className={`mt-4 grid gap-2 ${tiles === 3 ? "grid-cols-2 sm:grid-cols-3" : tiles > 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {matrix.distribution.map((d, i) => (
                    // Number first to the eye; the label stays first for a screen reader.
                    <div
                      key={`${i}-${d.label}`}
                      className={`flex min-w-0 flex-col rounded-xl border border-border bg-surface-1 px-3 py-3 ${tiles === 3 && i === 0 ? "col-span-2 sm:col-span-1" : ""}`}
                    >
                      <dt className="order-2 mt-1 text-[12px] font-semibold leading-snug text-muted-foreground">{d.label}</dt>
                      <dd className="tnum font-heading order-1 break-words text-[1.2rem] font-extrabold leading-tight text-foreground md:text-[1.3rem]">
                        {d.count}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {matrix.disclaimer && (
                <p className="mt-4 flex gap-2 rounded-xl border border-primary/15 bg-primary-soft/50 p-3 text-[12.5px] leading-relaxed text-foreground/85">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
                  <span>{matrix.disclaimer}</span>
                </p>
              )}

              {matrix.topStates.length > 0 && (
                <>
                  <h4 className="font-heading mt-5 flex items-center gap-2 text-[15.5px] font-bold text-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
                    {copy.states_title}
                  </h4>
                  <ol className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 ${both ? "lg:grid-cols-1" : "lg:grid-cols-5"}`}>
                    {matrix.topStates.map((s, i) => (
                      <li key={`${i}-${s}`} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border px-3 py-2">
                        <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                        <span className="min-w-0 text-[14.5px] font-semibold text-foreground">{s}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
