import { redirect } from "next/navigation";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { buildOutreachKit, type KitItem } from "@/lib/outreachKit";
import CopyCode from "@/components/seo/CopyCode";
import { Badge, Card, Notice, PageHeader } from "@/components/admin/ui";

/**
 * Outreach kit — messages written from the live data, for the team to send by
 * hand (lib/outreachKit.ts says why it stops there). A server page, so the
 * numbers are today's; it checks the session itself as well as the middleware.
 */
export const dynamic = "force-dynamic";

// Absolute: on the admin host a relative "/data" would resolve to the admin itself.
const SITE = "https://www.admissionhands.com";

export default async function OutreachPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin"); // the login screen (on the admin host, middleware cleans it to /)
  const items = await buildOutreachKit();

  // Grouped by where it gets sent, in the order the kit lists them.
  const groups: { channel: string; items: KitItem[] }[] = [];
  for (const it of items) {
    const g = groups.find((x) => x.channel === it.channel);
    if (g) g.items.push(it);
    else groups.push({ channel: it.channel, items: [it] });
  }

  return (
    <div>
      <PageHeader
        title="Outreach kit"
        description="Ready-to-send messages with today's numbers. Every link someone else publishes to these pages is a backlink."
      >
        <Notice tone="warning" icon={AlertTriangle} title="Send them by hand, one at a time">
          To people and groups where they help. Never mass-post or auto-post: search engines penalise the whole site for
          link spam.
        </Notice>
        <Notice tone="info" title="Also worth sharing">
          <ul className="mt-1 space-y-1">
            <li>
              <a href={`${SITE}/data`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
                www.admissionhands.com/data <ExternalLink className="h-3.5 w-3.5" />
              </a>{" "}
              — free CSV downloads and embeddable tables for journalists, teachers and coaching institutes.
            </li>
            <li>
              <a
                href={`${SITE}/reports/neet-pg-stipend-2026`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
              >
                /reports/neet-pg-stipend-2026 <ExternalLink className="h-3.5 w-3.5" />
              </a>{" "}
              — the stipend report.
            </li>
          </ul>
        </Notice>
      </PageHeader>

      <div className="space-y-8">
        {groups.map((g, i) => (
          <section key={g.channel} aria-labelledby={`outreach-ch-${i}`}>
            <h2 id={`outreach-ch-${i}`} className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {g.channel}
              <Badge>{g.items.length}</Badge>
            </h2>
            <div className="space-y-4">
              {g.items.map((it) => (
                <Card key={it.id} title={it.title} description={it.where}>
                  {/* Wrap the message instead of scrolling it sideways: it is read before it is copied. */}
                  <div className="[&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:bg-slate-50 [&_pre]:text-[13px] [&_pre]:text-slate-800">
                    <CopyCode code={it.body} label="Message" />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
