import { AlertTriangle, ExternalLink } from "lucide-react";
import CopyCode from "@/components/seo/CopyCode";
import { Badge, Card, EmptyState, Notice } from "@/components/admin/ui";
import { TOPIC_LABEL, type PostPack } from "@/lib/socialPosts";

/**
 * Admin → Outreach → Data posts (2026-11-13, owner: "post mujhe tum admin mai do, whi se copy paste karunga"). Every
 * topic's ready-made post, today's first and open, one Copy button per platform part. The same packs the Telegram bot
 * sends (lib/socialPosts.ts), built from live figures at page load. Nothing here posts anything: a person copies and
 * posts, by each community's rules.
 */
const wrap = "[&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:bg-slate-50 [&_pre]:text-[13px] [&_pre]:text-slate-800";

function Where({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 underline-offset-2 hover:underline">
      {children} <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}

function Pack({ p, today }: { p: PostPack; today: boolean }) {
  return (
    <details open={today} className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800">
        <span className="transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        {TOPIC_LABEL[p.topic]}
        {today && <Badge tone="success">Today</Badge>}
      </summary>
      <div className="grid gap-4 border-t border-slate-100 p-4 lg:grid-cols-2">
        <Card
          title="Reddit"
          description="Read the subreddit's rules first. Where links are not allowed, delete the link lines."
          actions={
            <span className="flex gap-3">
              <Where href="https://www.reddit.com/r/NEETPG/submit">r/NEETPG</Where>
              <Where href="https://www.reddit.com/r/IndianMedschool/submit">r/IndianMedschool</Where>
            </span>
          }
        >
          <div className={`space-y-3 ${wrap}`}>
            <CopyCode code={p.reddit.title} label="Title" />
            <CopyCode code={p.reddit.body} label="Post" />
          </div>
        </Card>

        <Card title="Quora" description="Answer one of these questions with the text below.">
          <ul className="mb-3 space-y-1 text-[13px] text-slate-700">
            {p.quora.questions.map((q) => (
              <li key={q} className="flex flex-wrap items-center gap-2">
                <span>• {q}</span>
                <Where href={`https://www.quora.com/search?q=${encodeURIComponent(q)}`}>Find on Quora</Where>
              </li>
            ))}
          </ul>
          <div className={wrap}>
            <CopyCode code={p.quora.answer} label="Answer" />
          </div>
        </Card>

        <Card title="X / Twitter" description="A thread: post the first, then reply to it with each next part." actions={<Where href="https://x.com/compose/post">Open X</Where>}>
          <div className={`space-y-3 ${wrap}`}>
            {p.x.map((t, i) => (
              <CopyCode key={i} code={t} label={`Part ${i + 1}`} />
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="LinkedIn" actions={<Where href="https://www.linkedin.com/feed/?shareActive=true">Open LinkedIn</Where>}>
            <div className={wrap}>
              <CopyCode code={p.linkedin} label="Post" />
            </div>
          </Card>
          <Card title="Our Telegram channel" actions={<Where href="https://t.me/AdmissionHandsIndia">Open channel</Where>}>
            <div className={wrap}>
              <CopyCode code={p.telegram} label="Post" />
            </div>
          </Card>
        </div>
      </div>
    </details>
  );
}

export default function DataPosts({ packs }: { packs: PostPack[] }) {
  return (
    <div className="space-y-4">
      <Notice tone="warning" icon={AlertTriangle} title="Post them yourself, one place at a time">
        Every figure is live and has its source line. Keep the disclosure line on Reddit and Quora. Do not paste the same post
        in many places on the same day: it reads as spam and gets the account banned.
      </Notice>
      {packs.length ? (
        packs.map((p, i) => <Pack key={p.topic} p={p} today={i === 0} />)
      ) : (
        <EmptyState title="No data post could be built right now" hint="The figures behind them did not load. Reload the page in a minute." />
      )}
    </div>
  );
}
