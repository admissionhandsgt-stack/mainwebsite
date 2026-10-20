import Link from "@/components/ui/Link";
import SectionHead from "@/components/ui/SectionHead";
import { branchSlug } from "@/lib/branchSlug";
import { MATRIX_LABEL, type CollegeMatrix } from "@/lib/pgSeatData";

/**
 * "<College> seats in MCC's 2026 counselling" on a PG college page (2026-10-20): every course
 * MCC fills here, by quota and category, from MCC's own published seat matrix. Seat counts,
 * never a rank. Courses link to their branch page only when one exists (`branchPages`).
 * Words from Admin → Content ("Page: PG college pages — MCC seats, bond and stipend").
 */
const n = (v: number) => (v ? v.toLocaleString("en-IN") : "–");

export default function MccSeats({
  matrix,
  copy,
  branchPages,
}: {
  matrix: CollegeMatrix;
  copy: { eyebrow: string; title: string; intro: string; source: string; pwd: string; total: string; link: string };
  branchPages: Set<string>;
}) {
  // MCC's AIQ, deemed and central-quota matrices carry no separate PwD figures; only DNB rows do.
  // The column shows when there is something in it, never as a row of zeros.
  const pwd = matrix.rows.some((r) => r.pwd > 0);
  return (
    <section id="mcc-seats" className="scroll-mt-24">
      <SectionHead icon="list" eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} />

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Seats by seat matrix">
        {matrix.byMatrix.map((m) => (
          <li
            key={m.seatMatrix}
            className="inline-flex items-baseline gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-muted-foreground"
          >
            {MATRIX_LABEL[m.seatMatrix] ?? m.seatMatrix}
            <b className="tnum text-[14px] text-foreground">{m.seats.toLocaleString("en-IN")}</b>
          </li>
        ))}
      </ul>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="dt w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">{copy.title}</caption>
          <thead className="border-b border-border bg-surface-1 text-[11.5px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Course</th>
              <th scope="col" className="px-4 py-3 font-semibold">Quota</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">Open</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">EWS</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">OBC</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">SC</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">ST</th>
              {pwd && <th scope="col" className="px-3 py-3 text-right font-semibold">PwD</th>}
              <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matrix.rows.map((r) => (
              <tr key={`${r.seatMatrix}|${r.course}|${r.quota}`}>
                <th scope="row" className="px-4 py-2.5 font-medium text-foreground">
                  {branchPages.has(r.course) ? (
                    <Link href={`/md-ms-india/branches/${branchSlug(r.course)}`} className="hover:text-primary hover:underline">
                      {r.course}
                    </Link>
                  ) : (
                    r.course
                  )}
                </th>
                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{r.quota ?? MATRIX_LABEL[r.seatMatrix]}</td>
                <td className="tnum px-3 py-2.5 text-right">{n(r.open)}</td>
                <td className="tnum px-3 py-2.5 text-right">{n(r.ews)}</td>
                <td className="tnum px-3 py-2.5 text-right">{n(r.obc)}</td>
                <td className="tnum px-3 py-2.5 text-right">{n(r.sc)}</td>
                <td className="tnum px-3 py-2.5 text-right">{n(r.st)}</td>
                {pwd && <td className="tnum px-3 py-2.5 text-right">{n(r.pwd)}</td>}
                <td className="tnum px-4 py-2.5 text-right font-semibold text-foreground">{r.total.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-surface-1">
            <tr>
              <th scope="row" colSpan={pwd ? 8 : 7} className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.total}
              </th>
              <td className="tnum px-4 py-2.5 text-right font-bold text-foreground">{matrix.total.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        {copy.source}
        {pwd ? ` ${copy.pwd}` : ""}{" "}
        <Link href="/neet-pg-seat-matrix" className="font-semibold text-primary-strong hover:underline dark:text-primary">
          {copy.link}
        </Link>
      </p>
    </section>
  );
}
