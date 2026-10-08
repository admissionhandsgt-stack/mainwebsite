import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { buildOutreachKit } from "@/lib/outreachKit";
import CopyCode from "@/components/seo/CopyCode";

/**
 * Outreach kit — messages written from the live data, for the team to send by
 * hand (lib/outreachKit.ts says why it stops there). A server page, so the
 * numbers are today's; it checks the session itself as well as the middleware.
 */
export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin"); // the login screen (on the admin host, middleware cleans it to /)
  const items = await buildOutreachKit();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Outreach kit</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Ready-to-send messages with today&apos;s numbers. Each link someone else publishes to these pages is a backlink.
          Send them one at a time, to people and groups where they help — never mass-post or auto-post: search engines
          penalise the whole site for link spam.
        </p>
      </div>
      <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
        Also share: <strong>www.admissionhands.com/data</strong> — free CSV downloads and embeddable tables for journalists,
        teachers and coaching institutes; and <strong>/reports/neet-pg-stipend-2026</strong> — the stipend report.
      </div>
      {items.map((it) => (
        <section key={it.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">{it.channel}</span>
            <h2 className="text-base font-semibold text-gray-900">{it.title}</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">{it.where}</p>
          <div className="mt-3">
            <CopyCode code={it.body} label="Message" />
          </div>
        </section>
      ))}
    </div>
  );
}
