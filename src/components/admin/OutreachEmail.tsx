"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Send, Plus, Trash2, Link2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, INPUT, INPUT_H, Notice, TABLE, Tabs, Toggle, type Tone } from "@/components/admin/ui";

/**
 * Admin → Outreach email (2026-11-10). The mailbox the emails go from, the Telegram bot the owner approves each one in,
 * the daily switch and cap, and the list of people written to (lib/outreach.ts). Secrets are write-only.
 */
type Row = {
  id: number;
  email: string;
  name: string | null;
  org: string;
  kind: string;
  why: string | null;
  subject: string;
  status: string;
  sent_at: string | null;
  followed_up_at: string | null;
  last_error: string | null;
  created_at: string;
};
type State = {
  host: string;
  port: string;
  user: string;
  passSet: boolean;
  fromName: string;
  tokenSet: boolean;
  tokenMasked: string;
  bot: string | null;
  linked: boolean;
  enabled: boolean;
  cap: string;
  rows: Row[];
  hunt: Hunt[];
  sources: Source[];
  library: Saved[];
  tavilySet: boolean;
  tavily2Set: boolean;
  tavilyUsage: { month: string; used: number; budget: number; keys: number };
};
type Source = { id: number; url: string; org: string; kind: string; last_crawled_at: string | null; found: number; last_note: string | null };
type Hunt = { id: number; query: string; source: string; thread_url: string | null; impressions: number; page: string; answer: string; status: string; posted_url: string | null; kind: string | null; created_at: string };
type Saved = { id: number; match: string; answer: string; page: string; checked_on: string | null; is_active: boolean };
type Post = (body: Record<string, unknown>, label: string) => Promise<Record<string, unknown> | null>;
/** What wrote an answer, in words. */
const KIND_LABEL: Record<string, string> = {
  saved: "Your saved answer",
  college: "College's fee, stipend & bond",
  "state-stipend": "State stipend",
  stipend: "Stipend, India",
  bond: "Bond, India",
  "bond-state": "State bond",
  marks: "Marks → rank",
  branch: "Branch cut off",
  "low-score": "Low score clinical",
  seats: "Seats & statistics",
  choice: "Choice filling rules",
  page: "Page's first line",
};
/** The question's own words, minus the ones every question has: a start for "words to match". */
const suggestMatch = (query: string) =>
  query
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(what|which|how|much|the|for|and|with|from|neet|does|kitna|kitni|kya|hai|milta|year|month)$/.test(w))
    .slice(0, 3)
    .join(", ");

/** Type a question, get the answer written the way the hunt writes it (lib/huntAnswers.ts). */
function AskCard({ busy, post, onMsg }: { busy: boolean; post: Post; onMsg: (m: { tone: "success" | "danger" | "info"; text: string }) => void }) {
  const [question, setQuestion] = useState("");
  return (
    <Card title="Write an answer for a question" description="Paste the question from a thread (Quora, Reddit, a forum, a WhatsApp group). The answer is written from the site's own figures, or from your saved answer if its words match, and added to the list below. The Telegram bot does the same: send it /answer followed by the question.">
      <div className="flex flex-wrap gap-2">
        <input className={`${INPUT} ${INPUT_H} min-w-[16rem] flex-1`} placeholder="e.g. What is the PG stipend at SMS Jaipur?" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <Button variant="primary" disabled={busy || question.trim().length < 6} onClick={async () => {
          const j = await post({ action: "hunt-ask", question }, "ask");
          if (j) {
            setQuestion("");
            onMsg({ tone: "success", text: "Answer written. It is first in the list below." });
          }
        }}>
          Write answer
        </Button>
      </div>
    </Card>
  );
}

/** Your own answers: a question whose words match one gets it as you wrote it. */
function LibraryCard({ items, busy, post, draft, setDraft }: { items: Saved[]; busy: boolean; post: Post; draft: Partial<Saved> | null; setDraft: (d: Partial<Saved> | null) => void }) {
  const d = draft;
  return (
    <Card
      title={`Saved answers (${items.length})`}
      description="Answers you wrote, like the AIIMS one. Words to match: commas mean all of these, | means any one of these. “aiims, stipend | salary” matches a question with AIIMS and stipend or salary. A matched question gets your answer word for word; your signature is added only if it has none."
      actions={!d && <Button size="sm" onClick={() => setDraft({ match: "", answer: "", page: "/", checked_on: new Date().toISOString().slice(0, 10), is_active: true })}>Add an answer</Button>}
    >
      {d && (
        <div className="mb-4 space-y-2 rounded-xl border border-cyan-200 bg-cyan-50/40 p-3">
          <div className="grid gap-2 md:grid-cols-[2fr_1fr_10rem]">
            <Field label="Words to match"><input className={`${INPUT} ${INPUT_H}`} value={d.match ?? ""} onChange={(e) => setDraft({ ...d, match: e.target.value })} placeholder="aiims, stipend | salary" /></Field>
            <Field label="Page it links to"><input className={`${INPUT} ${INPUT_H}`} value={d.page ?? "/"} onChange={(e) => setDraft({ ...d, page: e.target.value })} placeholder="/md-ms-india/stipend" /></Field>
            <Field label="Facts checked on"><input type="date" className={`${INPUT} ${INPUT_H}`} value={d.checked_on ?? ""} onChange={(e) => setDraft({ ...d, checked_on: e.target.value })} /></Field>
          </div>
          <Field label="The answer"><textarea className={`${INPUT} min-h-[14rem] py-2 text-[13px] leading-relaxed`} value={d.answer ?? ""} onChange={(e) => setDraft({ ...d, answer: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={busy || !d.match?.trim() || !d.answer?.trim()} onClick={async () => {
              const j = await post({ action: "library-save", id: d.id, match: d.match, answer: d.answer, page: d.page, checkedOn: d.checked_on, active: d.is_active !== false }, "lib");
              if (j) setDraft(null);
            }}>
              Save answer
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">None yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-[13px]">
          {items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-medium text-slate-900">{it.match}</span>
                <span className="text-slate-500"> · {it.page}{it.checked_on ? ` · checked ${it.checked_on}` : ""}</span>
                <span className="block line-clamp-2 text-slate-500">{it.answer.split("\n")[0]}</span>
              </span>
              <span className="flex gap-1">
                <Button size="sm" onClick={() => setDraft(it)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => post({ action: "library-delete", id: it.id }, "lib-del")}>Remove</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
const SITE = "https://www.admissionhands.com";
const q = encodeURIComponent;

/** The websites whose own contact pages are read monthly for an address to write to (lib/outreachDiscover.ts). */
function SourcesCard({
  sources,
  busy,
  post,
  onMsg,
}: {
  sources: Source[];
  busy: boolean;
  post: (body: Record<string, unknown>, label: string) => Promise<Record<string, unknown> | null>;
  onMsg: (m: { tone: "success" | "danger" | "info"; text: string }) => void;
}) {
  const [f, setF] = useState({ url: "", org: "", kind: "journalist" });
  return (
    <Card
      title={`Websites to find emails on (${sources.length})`}
      description="Each site's own contact / about pages are read once a month (robots.txt respected). An address the organisation published there becomes a draft above — it still waits for your Send on Telegram."
      actions={
        <Button size="sm" disabled={busy || !sources.length} onClick={async () => {
          const j = await post({ action: "discover-now" }, "discover");
          if (j) onMsg({ tone: "success", text: `${Number(j.sites ?? 0)} sites read, ${Number(j.added ?? 0)} addresses added.` });
        }}>
          Look now
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
        <input className={`${INPUT} ${INPUT_H}`} placeholder="https://site.in" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        <input className={`${INPUT} ${INPUT_H}`} placeholder="Organisation" value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} />
        <select className={`${INPUT} ${INPUT_H}`} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="journalist">News / journalist</option>
          <option value="association">Doctors' association</option>
          <option value="other">Other</option>
        </select>
        <Button variant="primary" disabled={busy || !f.url || !f.org} onClick={async () => {
          const j = await post({ action: "source-add", ...f }, "source");
          if (j) setF({ url: "", org: "", kind: f.kind });
        }}>
          Add site
        </Button>
      </div>
      {sources.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 text-[13px]">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium text-slate-900">{s.org}</span> · <a className="underline" href={s.url} target="_blank" rel="noreferrer">{s.url}</a>
                <span className="text-slate-500"> · {s.last_crawled_at ? `read ${when(s.last_crawled_at)}: ${s.last_note ?? ""}` : "not read yet"}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => post({ action: "source-delete", id: s.id }, "source-del")}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** One question to answer by hand: open a search, find the thread, paste the answer, record where it went. */
function HuntCard({
  h,
  onDone,
  onRewrite,
  onKeep,
}: {
  h: Hunt;
  onDone: (action: "hunt-posted" | "hunt-dismiss", url?: string) => void;
  onRewrite: () => void;
  onKeep: (answer: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState(h.answer);
  useEffect(() => setText(h.answer), [h.answer]);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-semibold text-slate-900">{h.thread_url ? <a className="underline" href={h.thread_url} target="_blank" rel="noreferrer">{h.query}</a> : `“${h.query}”`} {h.thread_url && <span className="ml-1 rounded bg-cyan-50 px-1.5 py-0.5 text-[11px] font-medium text-cyan-700">{new URL(h.thread_url).hostname.replace("www.", "")}</span>}</div>
        <div className="text-xs text-slate-500">{h.source === "web" ? "Open the thread above" : h.source === "manual" ? "Your question" : `${h.impressions} searches this week`} · answers it: <a className="underline" href={`${SITE}${h.page}`} target="_blank" rel="noreferrer">{h.page}</a>{h.kind && <> · <Badge tone={h.kind === "saved" ? "success" : h.kind === "page" ? "neutral" : "info"}>{KIND_LABEL[h.kind] ?? h.kind}</Badge></>}</div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
        <a className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50" href={`https://www.quora.com/search?q=${q(h.query)}`} target="_blank" rel="noreferrer">Find on Quora</a>
        <a className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50" href={`https://www.reddit.com/search/?q=${q(h.query)}`} target="_blank" rel="noreferrer">Find on Reddit</a>
        <a className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50" href={`https://www.google.com/search?q=${q(`${h.query} site:quora.com OR site:reddit.com`)}`} target="_blank" rel="noreferrer">Find on Google</a>
      </div>
      <textarea className={`${INPUT} mt-3 min-h-[16rem] py-2 text-[13px] leading-relaxed`} value={text} onChange={(e) => { setText(e.target.value); setCopied(false); }} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={async () => { await navigator.clipboard.writeText(text).catch(() => undefined); setCopied(true); }}>{copied ? "Copied" : "Copy answer"}</Button>
        <Button size="sm" variant="ghost" onClick={onRewrite}>Rewrite</Button>
        <Button size="sm" variant="ghost" onClick={() => onKeep(text)}>Save as my answer</Button>
        <input className={`${INPUT} h-8 max-w-sm`} placeholder="Link of your posted answer" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button size="sm" variant="primary" onClick={() => onDone("hunt-posted", url)}>Posted</Button>
        <Button size="sm" variant="ghost" onClick={() => onDone("hunt-dismiss")}>Not useful</Button>
      </div>
    </div>
  );
}

const TONE: Record<string, Tone> = {
  draft: "neutral",
  previewed: "info",
  followup_previewed: "info",
  sending: "info",
  sent: "success",
  followed_up: "success",
  replied: "success",
  skipped: "neutral",
  opted_out: "warning",
  failed: "danger",
  done: "success",
  bounced: "danger",
};
const when = (v: string | null) =>
  v ? new Date(v).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

type TabId = "emails" | "hunt" | "sites" | "settings" | "kit";
const TAB_IDS: TabId[] = ["emails", "hunt", "sites", "settings", "kit"];

/**
 * One screen, five tabs (2026-11-10, owner: "lamba lamba scroll hai, chije unorganised"): the day's work first (emails,
 * the hunt), then the sites list, the settings and the share kit. The tab is in the address (#hunt), so a Telegram link
 * opens the right one.
 */
export default function OutreachEmail({ kit }: { kit?: React.ReactNode }) {
  const [tab, setTabState] = useState<TabId>("emails");
  useEffect(() => {
    const h = window.location.hash.slice(1) as TabId;
    if (TAB_IDS.includes(h)) setTabState(h);
  }, []);
  const setTab = (t: TabId) => {
    setTabState(t);
    history.replaceState(null, "", `#${t}`);
  };
  const [s, setS] = useState<State | null>(null);
  const [form, setForm] = useState({ host: "", port: "", user: "", pass: "", fromName: "", token: "", cap: "", tavilyKey: "", tavilyKey2: "" });
  const [target, setTarget] = useState({ email: "", name: "", org: "", kind: "journalist", why: "", sourceUrl: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [libDraft, setLibDraft] = useState<Partial<Saved> | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger" | "info"; text: string; link?: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/outreach-email", { cache: "no-store" });
    if (!r.ok) return setMsg({ tone: "danger", text: "Could not load the settings." });
    const j = (await r.json()) as State;
    setS(j);
    setForm((f) => ({ ...f, host: j.host, port: j.port, user: j.user, fromName: j.fromName, cap: j.cap, pass: "", token: "", tavilyKey: "", tavilyKey2: "" }));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const post = async (body: Record<string, unknown>, label: string) => {
    setBusy(label);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/outreach-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as Record<string, unknown>;
      if (!r.ok || j.ok === false) setMsg({ tone: "danger", text: String(j.error ?? "Failed") });
      else return j;
    } catch {
      setMsg({ tone: "danger", text: "Failed" });
    } finally {
      setBusy(null);
      load();
    }
    return null;
  };

  if (!s) return <Card title="Outreach email">Loading…</Card>;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const setT = (k: keyof typeof target) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setTarget({ ...target, [k]: e.target.value });

  return (
    <div className="space-y-5">
      {msg && (
        <Notice tone={msg.tone}>
          {msg.text}
          {msg.link && (
            <>
              {" "}
              <a href={msg.link} target="_blank" rel="noreferrer" className="font-semibold underline">
                Open the bot and press Start
              </a>
            </>
          )}
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <Badge tone={s.passSet ? "success" : "warning"}>{s.passSet ? "Mailbox ready" : "Mailbox not set"}</Badge>
        <Badge tone={s.linked ? "success" : "warning"}>{s.linked ? "Telegram linked" : "Telegram not linked"}</Badge>
        <Badge tone={s.tavilySet ? "success" : "warning"}>
          {s.tavilySet ? `Search ${s.tavilyUsage.used}/${s.tavilyUsage.budget} this month` : "Search key not set"}
        </Badge>
        <div className="ml-auto">
          <Toggle
            checked={s.enabled}
            onChange={(v) => post({ action: "save", enabled: v }, "toggle")}
            label={s.enabled ? "Daily emails on" : "Daily emails off"}
            disabled={!s.passSet || !s.linked}
          />
        </div>
      </div>

      <Tabs
        items={[
          { id: "emails" as TabId, label: "Emails", count: s.rows.length },
          { id: "hunt" as TabId, label: "Daily hunt", count: s.hunt.filter((h) => h.status === "new").length },
          { id: "sites" as TabId, label: "Websites", count: s.sources.length },
          { id: "settings" as TabId, label: "Settings" },
          ...(kit ? [{ id: "kit" as TabId, label: "Share kit" }] : []),
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "settings" && (
      <Card
        title="Mailbox, Telegram and search keys"
        description="Every day at 11 AM the email drafts come to your Telegram with Send · Skip buttons. Reply to a preview to change it. Nothing goes without your Send."
        actions={
          <Toggle
            checked={s.enabled}
            onChange={(v) => post({ action: "save", enabled: v }, "toggle")}
            label={s.enabled ? "On" : "Off"}
            disabled={!s.passSet || !s.linked}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SMTP server" hint="smtp.nevtan.com (the webmail at mail.nevtan.com does not take SMTP).">
            <input className={`${INPUT} ${INPUT_H}`} value={form.host} onChange={set("host")} />
          </Field>
          <Field label="Port" hint="465 (SSL) or 587.">
            <input className={`${INPUT} ${INPUT_H}`} value={form.port} onChange={set("port")} />
          </Field>
          <Field label="Login (the email address)">
            <input className={`${INPUT} ${INPUT_H}`} value={form.user} onChange={set("user")} />
          </Field>
          <Field label="Password" hint={s.passSet ? "Saved. Type only to change it." : "Not saved yet."}>
            <input className={`${INPUT} ${INPUT_H}`} type="password" autoComplete="new-password" value={form.pass} onChange={set("pass")} />
          </Field>
          <Field label="Sender name">
            <input className={`${INPUT} ${INPUT_H}`} value={form.fromName} onChange={set("fromName")} />
          </Field>
          <Field label="Most emails a day" hint="Sends and follow-ups together; up to 20.">
            <input className={`${INPUT} ${INPUT_H}`} inputMode="numeric" value={form.cap} onChange={set("cap")} />
          </Field>
          <Field
            label="Telegram bot token"
            hint={s.tokenSet ? `Saved (${s.tokenMasked})${s.bot ? ` — @${s.bot}` : ""}. Type only to change it.` : "Make a bot with @BotFather in Telegram (/newbot) and paste its token here."}
          >
            <input className={`${INPUT} ${INPUT_H}`} type="password" autoComplete="off" value={form.token} onChange={set("token")} />
          </Field>
          <Field
            label="Tavily search key (free, no card)"
            hint={s.tavilySet ? `Saved. This month: ${s.tavilyUsage.used} of ${s.tavilyUsage.budget} searches across ${s.tavilyUsage.keys} key(s) (1,000 free each).` : "Sign up free at tavily.com and paste the key (tvly-…). It finds Reddit, Quora and forum threads for the daily hunt."}
          >
            <input className={`${INPUT} ${INPUT_H}`} type="password" autoComplete="off" value={form.tavilyKey} onChange={set("tavilyKey")} />
          </Field>
          <Field label="Second Tavily key (your other account)" hint={s.tavily2Set ? "Saved. Used when the first key has spent its month." : "Optional. With both keys the hunt searches twice as much."}>
            <input className={`${INPUT} ${INPUT_H}`} type="password" autoComplete="off" value={form.tavilyKey2} onChange={set("tavilyKey2")} />
          </Field>
          <div className="flex items-end gap-2">
            <Badge tone={s.linked ? "success" : "warning"}>{s.linked ? "Telegram linked" : "Telegram not linked"}</Badge>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" disabled={!!busy} onClick={() => post({ action: "save", ...form }, "save")}>
            Save
          </Button>
          <Button disabled={!!busy || !s.passSet} onClick={async () => {
            const j = await post({ action: "test-mail" }, "test-mail");
            if (j) setMsg({ tone: "success", text: `Test email sent to ${String(j.sentTo)}.` });
          }}>
            <Mail className="mr-1.5 h-4 w-4" /> Test the mailbox
          </Button>
          <Button disabled={!!busy || !s.tokenSet} onClick={async () => {
            const j = await post({ action: "link-telegram" }, "link");
            if (j) setMsg({ tone: "info", text: j.link ? "Open this link on your phone and press Start:" : `Send /start ${String(j.code)} to your bot.`, link: (j.link as string) ?? undefined });
          }}>
            <Link2 className="mr-1.5 h-4 w-4" /> Link Telegram
          </Button>
          <Button disabled={!!busy || !s.linked} onClick={async () => {
            const j = await post({ action: "test-telegram" }, "tg");
            if (j) setMsg({ tone: "success", text: "Test message sent to Telegram." });
          }}>
            Test Telegram
          </Button>
          <Button disabled={!!busy || !s.linked || !s.passSet} onClick={async () => {
            const j = await post({ action: "preview-now" }, "preview");
            if (j) setMsg({ tone: "success", text: `${Number(j.previewed ?? 0)} previews and ${Number(j.followups ?? 0)} follow-ups sent to Telegram.` });
          }}>
            <Send className="mr-1.5 h-4 w-4" /> Send previews now
          </Button>
        </div>
      </Card>
      )}

      {tab === "emails" && (
      <>
      <Card title="Add someone to write to" description="An address you found on their own public page (contact, press, team). The draft is written from today's figures; you see it on Telegram before anything goes.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Email">
            <input className={`${INPUT} ${INPUT_H}`} value={target.email} onChange={setT("email")} />
          </Field>
          <Field label="Name (optional)">
            <input className={`${INPUT} ${INPUT_H}`} value={target.name} onChange={setT("name")} />
          </Field>
          <Field label="Organisation">
            <input className={`${INPUT} ${INPUT_H}`} value={target.org} onChange={setT("org")} />
          </Field>
          <Field label="Kind">
            <select className={`${INPUT} ${INPUT_H}`} value={target.kind} onChange={setT("kind")}>
              <option value="journalist">Journalist / news desk</option>
              <option value="association">Doctors' association</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Why them (optional)">
            <input className={`${INPUT} ${INPUT_H}`} value={target.why} onChange={setT("why")} />
          </Field>
          <Field label="Where the address was found">
            <input className={`${INPUT} ${INPUT_H}`} value={target.sourceUrl} onChange={setT("sourceUrl")} />
          </Field>
        </div>
        <div className="mt-4">
          <Button variant="primary" disabled={!!busy || !target.email || !target.org} onClick={async () => {
            const j = await post({ action: "add", ...target }, "add");
            if (j) {
              setTarget({ email: "", name: "", org: "", kind: target.kind, why: "", sourceUrl: "" });
              setMsg({ tone: "success", text: "Added. Its draft goes to Telegram with the next previews." });
            }
          }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
      </Card>

      <Card title={`Written to (${s.rows.length})`} flush>
        {s.rows.length === 0 ? (
          <EmptyState icon={Mail} title="Nobody yet" hint="Add someone above." />
        ) : (
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>Who</th>
                  <th className={TABLE.th}>Subject</th>
                  <th className={TABLE.th}>Status</th>
                  <th className={TABLE.th}>Sent</th>
                  <th className={TABLE.th} />
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.id} className={TABLE.row}>
                    <td className={TABLE.td}>
                      <div className="font-medium text-slate-900">{r.org}</div>
                      <div className="text-xs text-slate-500">{r.name ? `${r.name} · ` : ""}{r.email}</div>
                    </td>
                    <td className={`${TABLE.td} max-w-[28rem] text-xs`}>{r.subject}{r.last_error && <div className="mt-1 text-red-600">{r.last_error}</div>}</td>
                    <td className={TABLE.td}><Badge tone={TONE[r.status] ?? "neutral"}>{r.status.replace("_", " ")}</Badge></td>
                    <td className={`${TABLE.td} text-xs`}>{when(r.sent_at)}{r.followed_up_at ? ` · follow-up ${when(r.followed_up_at)}` : ""}</td>
                    <td className={TABLE.td}>
                      {!r.sent_at && (
                        <Button size="icon" variant="ghost" aria-label={`Remove ${r.email}`} onClick={() => post({ action: "delete", id: r.id }, "delete")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </>
      )}

      {tab === "sites" && <SourcesCard sources={s.sources} busy={!!busy} post={post} onMsg={setMsg} />}

      {tab === "hunt" && (
      <div id="hunt" className="scroll-mt-24 space-y-5">
        <AskCard busy={!!busy} post={post} onMsg={setMsg} />
        <Card
          title={`Daily hunt — ${s.hunt.filter((h) => h.status === "new").length} questions to answer`}
          description="Open the thread (or a search), paste the answer from your own account, then save its link. Say you are a counsellor; link only when the page answers the question."
          actions={
            <Button size="sm" disabled={!!busy} onClick={async () => {
              const j = await post({ action: "hunt-run" }, "hunt");
              if (j) setMsg({ tone: "success", text: `${Number(j.added ?? 0)} new questions added.` });
            }}>
              Find more now
            </Button>
          }
        >
          {s.hunt.filter((h) => h.status === "new").length === 0 ? (
            <p className="text-sm text-slate-500">Nothing waiting. New questions come every day at 11:35 AM.</p>
          ) : (
            <div className="space-y-3">
              {s.hunt.filter((h) => h.status === "new").map((h) => (
                <HuntCard
                  key={h.id}
                  h={h}
                  onDone={(action, url) => post({ action, id: h.id, url }, "hunt-mark")}
                  onRewrite={() => post({ action: "hunt-rebuild", id: h.id }, "hunt-rebuild")}
                  onKeep={(answer) => {
                    setLibDraft({ match: suggestMatch(h.query), answer, page: h.page, checked_on: new Date().toISOString().slice(0, 10), is_active: true });
                    document.getElementById("saved-answers")?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              ))}
            </div>
          )}
          {s.hunt.some((h) => h.status === "posted") && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Posted ({s.hunt.filter((h) => h.status === "posted").length})</div>
              <ul className="space-y-1 text-[13px]">
                {s.hunt.filter((h) => h.status === "posted").map((h) => (
                  <li key={h.id}>
                    “{h.query}” → {h.posted_url ? <a className="underline" href={h.posted_url} target="_blank" rel="noreferrer">{h.posted_url}</a> : "posted"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <div id="saved-answers" className="scroll-mt-24">
          <LibraryCard items={s.library ?? []} busy={!!busy} post={post} draft={libDraft} setDraft={setLibDraft} />
        </div>
      </div>
      )}

      {tab === "kit" && kit}
    </div>
  );
}
