import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listCollegeResearch, type ResearchField, type ResearchRow } from "@/lib/collegeResearch";
import { Badge, Card, EmptyState, PageHeader, Stats } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/**
 * College notes for counsellors (2026-11-16, owner: complaints and public cases "counsellors only"). What the research pass
 * found about each PG college's stipend and bond beyond its own documents — status, figures and every source — and, first,
 * the concerns: residents' complaints in news or forums, NMC fines, an ED charge-sheet. Use them to warn a family on a
 * call. None of this is on a public page; a server page renders into the HTML, so it checks the session itself.
 */

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "neutral" | "danger"> = {
  official: "success",
  corroborated: "info",
  single_report: "warning",
  conflicting: "danger",
  not_found: "neutral",
};
const inr = (v: number | null | undefined) => (v ? `₹${v.toLocaleString("en-IN")}` : "—");

function Field({ label, f, kind }: { label: string; f: ResearchField | null; kind: "stipend" | "bond" }) {
  if (!f) return null;
  const figure =
    kind === "stipend"
      ? [f.y1, f.y2, f.y3].some(Boolean)
        ? `${inr(f.y1)} · ${inr(f.y2)} · ${inr(f.y3)} a month`
        : null
      : [f.years != null ? `${f.years} yr` : null, f.amount_inr ? inr(f.amount_inr) : null].filter(Boolean).join(" · ") || null;
  return (
    <div className="mt-2">
      <p className="text-[13px]">
        <span className="font-semibold text-slate-700">{label}:</span>{" "}
        <Badge tone={STATUS_TONE[f.status ?? ""] ?? "neutral"}>{(f.status ?? "—").replace("_", " ")}</Badge>{" "}
        {figure && <span className="font-semibold text-slate-900">{figure}</span>}
        {f.session && <span className="text-slate-500"> ({f.session})</span>}
      </p>
      {kind === "bond" && (f.seat_leaving || f.deposit) && (
        <p className="mt-0.5 text-[12.5px] text-slate-600">
          {f.seat_leaving && <>Leaving: {f.seat_leaving}. </>}
          {f.deposit && <>Deposit: {f.deposit}</>}
        </p>
      )}
      {f.notes && <p className="mt-0.5 text-[12.5px] text-slate-500">{f.notes}</p>}
      {!!f.sources?.length && (
        <ul className="mt-1 space-y-0.5 text-[12px]">
          {f.sources.slice(0, 6).map((s, i) => (
            <li key={i} className="text-slate-500">
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-cyan-700 hover:underline">
                  {s.type ?? "source"}
                </a>
              ) : (
                s.type
              )}
              {s.date ? ` · ${s.date}` : ""}
              {s.value != null ? ` · ${s.value}` : ""}
              {s.quote ? ` — “${s.quote}”` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function CollegeNotesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin");

  const rows = await listCollegeResearch().catch((): ResearchRow[] => []);
  const withConcerns = rows.filter((r) => r.concerns.length);
  const stipendKnown = rows.filter((r) => r.stipend && ["official", "corroborated"].includes(r.stipend.status ?? "")).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="College notes: stipend & bond"
        description="For counsellors only — never shown on the site. What the research found about each college beyond its own documents, and the concerns to raise with a family before they lock a seat."
      />
      <Stats
        items={[
          { label: "Colleges researched", value: rows.length },
          { label: "With concerns", value: withConcerns.length },
          { label: "Stipend official or corroborated", value: stipendKnown },
        ]}
      />
      {!rows.length ? (
        <EmptyState title="No research loaded" hint="Run scripts/import_college_research.ts with the research files." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((r) => (
            <Card
              key={r.instituteId}
              title={
                <span>
                  {r.name}
                  {r.concerns.length > 0 && (
                    <Badge tone="danger" className="ml-2">
                      {r.concerns.length} concern{r.concerns.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </span>
              }
              description={`${r.state ?? ""} · checked ${r.checkedOn}`}
              actions={
                r.slug ? (
                  <a href={`https://www.admissionhands.com/md-ms-india/colleges/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold text-cyan-700 hover:underline">
                    College page ↗
                  </a>
                ) : undefined
              }
            >
              {r.concerns.map((c, i) => (
                <div key={i} className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900">
                  <p className="font-semibold">{c.what}</p>
                  {!!c.sources?.length && (
                    <ul className="mt-1 space-y-0.5 text-[12px]">
                      {c.sources.slice(0, 4).map((s, k) => (
                        <li key={k}>
                          {s.url ? (
                            <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                              {s.type ?? "source"}
                            </a>
                          ) : (
                            s.type
                          )}
                          {s.date ? ` · ${s.date}` : ""}
                          {s.quote ? ` — “${s.quote}”` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <Field label="Stipend" f={r.stipend} kind="stipend" />
              <Field label="Bond" f={r.bond} kind="bond" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
