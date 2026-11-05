"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, KeyRound, PlugZap, RefreshCw } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, INPUT, INPUT_H, Notice, PageHeader, Stats, TABLE, Toggle } from "@/components/admin/ui";

/**
 * Admin → Notices (Zyn) (2026-11-05). Zyn watches the counselling authorities and sends each notice to the owner on
 * Telegram; what he approves comes here every 5 minutes and goes on the site by itself (lib/zynNotices.ts). This
 * screen holds the endpoint and its key, the switch, and every notice taken — held ones can be published or dismissed.
 */
type Row = {
  id: string;
  title: string;
  url: string | null;
  authority: string | null;
  kind: string | null;
  round: string | null;
  approved_at: string | null;
  status: "published" | "held" | "dismissed";
  reason: string | null;
  schedule_status: string | null;
  schedule_reason: string | null;
  received_at: string;
};
type State = {
  url: string;
  keySet: boolean;
  keyMasked: string;
  enabled: boolean;
  cursor: string | null;
  lastRun: { at: string; ok: boolean; skipped?: string; error?: string; received: number; published: number; held: number } | null;
  notices: Row[];
};

const when = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function ZynNotices() {
  const [s, setS] = useState<State | null>(null);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/notices", { cache: "no-store" });
    if (!r.ok) return setMsg({ tone: "danger", text: "Could not load the settings." });
    const j = (await r.json()) as State;
    setS(j);
    setUrl(j.url);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const post = async (body: Record<string, unknown>, label: string) => {
    setBusy(label);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/notices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) setMsg({ tone: "danger", text: j.error ?? "Failed." });
      else if (typeof j.message === "string") setMsg({ tone: j.ok ? "success" : "danger", text: j.message });
      else if (body.action === "run")
        setMsg({ tone: j.ok ? "success" : "danger", text: j.skipped ? `Nothing to do: ${j.skipped}.` : j.ok ? `Received ${j.received}: ${j.published} on the site, ${j.held} held.` : `Failed: ${j.error}` });
      else if (body.action === "save") setMsg({ tone: "success", text: "Saved." });
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (!s) return <PageHeader title="Notices (Zyn)" description="Loading…" />;
  const held = s.notices.filter((n) => n.status === "held").length;
  const live = s.notices.filter((n) => n.status === "published").length;

  return (
    <div>
      <PageHeader
        title="Notices (Zyn)"
        description="Counselling notices you approve on Telegram (Zyn) come here every 5 minutes and go on the website by themselves: on the alerts bar, and for an MCC schedule notice the round's dates too. A notice that does not check out is held below."
        actions={
          <Button variant="secondary" size="sm" onClick={() => post({ action: "run" }, "run")} disabled={!!busy || !s.keySet}>
            <RefreshCw className="h-4 w-4" /> Check now
          </Button>
        }
      >
        <Stats
          items={[
            { label: "Switch", value: s.enabled ? "On" : "Off", tone: s.enabled ? "success" : "warning" },
            { label: "Last check", value: when(s.lastRun?.at), hint: s.lastRun ? (s.lastRun.ok ? s.lastRun.skipped ?? `${s.lastRun.received} received` : s.lastRun.error) : "never" },
            { label: "On the site", value: live, tone: "success" },
            { label: "Held", value: held, tone: held ? "warning" : "neutral" },
          ]}
        />
      </PageHeader>

      {msg && (
        <Notice tone={msg.tone} className="mb-4">
          {msg.text}
        </Notice>
      )}

      <Card title="Connection" description="Paste the key Zyn's owner gives you. It is stored as a secret and never shown again.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Zyn endpoint" htmlFor="zyn-url" hint="The approved-notices address from Zyn, e.g. https://ah.aismartscan.in/api/integrations/website/notices">
            <input id="zyn-url" className={`${INPUT} ${INPUT_H}`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> Key (X-AH-Sync-Key)
              </span>
            }
            htmlFor="zyn-key"
            hint={s.keySet ? `Saved: ${s.keyMasked}. Paste a new one only to replace it.` : "Not saved yet."}
          >
            <input
              id="zyn-key"
              type="password"
              autoComplete="off"
              className={`${INPUT} ${INPUT_H}`}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={s.keySet ? "•••••••• (saved)" : "Paste the key here"}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={async () => {
              await post({ action: "save", url, ...(key.trim() ? { key } : {}) }, "save");
              setKey("");
            }}
            disabled={!!busy}
          >
            <CheckCircle2 className="h-4 w-4" /> Save
          </Button>
          <Button variant="secondary" onClick={() => post({ action: "test" }, "test")} disabled={!!busy || !s.keySet}>
            <PlugZap className="h-4 w-4" /> Test connection
          </Button>
          <Toggle checked={s.enabled} onChange={(v) => post({ action: "save", enabled: v }, "toggle")} disabled={!!busy || !s.keySet} label="Update the website automatically" />
        </div>
      </Card>

      <Card className="mt-6" title="Notices taken" description="Newest first. Held: not on the site until you publish it." flush>
        {s.notices.length === 0 ? (
          <EmptyState icon={BellRing} title="No notices yet" hint="Once the key is saved and the switch is on, approved notices appear here within 5 minutes." />
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>Notice</th>
                  <th className={TABLE.th}>Approved</th>
                  <th className={TABLE.th}>Site</th>
                  <th className={TABLE.th}>Round dates</th>
                  <th className={TABLE.th} />
                </tr>
              </thead>
              <tbody>
                {s.notices.map((n) => (
                  <tr key={n.id} className={TABLE.row}>
                    <td className={TABLE.td}>
                      <div className="font-medium text-slate-900">{n.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {[n.authority, n.kind, n.round].filter(Boolean).join(" · ")}
                        {n.url && (
                          <>
                            {" · "}
                            <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-cyan-700 hover:underline">
                              notice
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                    <td className={TABLE.td}>{when(n.approved_at)}</td>
                    <td className={TABLE.td}>
                      <Badge tone={n.status === "published" ? "success" : n.status === "held" ? "warning" : "neutral"}>{n.status}</Badge>
                      {n.reason && <div className="mt-1 max-w-[16rem] text-xs text-slate-500">{n.reason}</div>}
                    </td>
                    <td className={TABLE.td}>
                      {n.schedule_status ? (
                        <>
                          <Badge tone={n.schedule_status === "applied" ? "success" : "warning"}>{n.schedule_status}</Badge>
                          {n.schedule_reason && <div className="mt-1 max-w-[16rem] text-xs text-slate-500">{n.schedule_reason}</div>}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className={TABLE.td}>
                      <div className="flex flex-wrap justify-end gap-2">
                        {n.status === "held" && (
                          <>
                            <Button size="sm" variant="primary" disabled={!!busy} onClick={() => post({ action: "publish", id: n.id }, n.id)}>
                              Publish
                            </Button>
                            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => post({ action: "dismiss", id: n.id }, n.id)}>
                              Dismiss
                            </Button>
                          </>
                        )}
                        {n.status === "published" && n.schedule_status === "held" && (
                          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => post({ action: "apply-schedule", id: n.id }, n.id)}>
                            Apply dates
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
