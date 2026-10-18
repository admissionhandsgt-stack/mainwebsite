"use client";

import { useState } from "react";
import { Loader2, Plus, Smartphone, Trash2, Power } from "lucide-react";
import { Badge, Button, Card, Field, INPUT, INPUT_H, type Tone } from "@/components/admin/ui";

/**
 * Every number we send from, and the backups that take over when one is out.
 *
 * Sign-in codes go from the connected, unlocked number that has sent the
 * fewest today, so the load is spread and a locked or logged-out number is
 * simply skipped (lib/waSenders.ts). When none can send, visitors are shown the
 * "send us this code" screen, which still works. Each backup is its own WAHA
 * container — WAHA Core runs one number per container.
 */

export interface SenderRow {
  id: number;
  label: string;
  primary: boolean;
  phone: string | null;
  gatewayUrl: string;
  apiKeyMasked: string;
  enabled: boolean;
  priority: number;
  dailyCap: number;
  /** Today's cap — lower than dailyCap during a new number's first week. */
  capToday: number;
  sentToday: number;
  health: {
    reachable: boolean;
    status: string;
    locked: boolean;
    lockedUntil: string | null;
    lockType: string | null;
    error: string | null;
  };
}

type Post = (payload: Record<string, unknown>, label: string) => Promise<Record<string, unknown> | null>;

const ist = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function state(s: SenderRow): { text: string; tone: "good" | "warn" | "bad" } {
  if (!s.enabled) return { text: "Turned off", tone: "warn" };
  if (!s.health.reachable) return { text: "Gateway unreachable", tone: "bad" };
  if (s.health.status !== "WORKING") {
    return { text: s.health.status === "SCAN_QR_CODE" ? "Waiting to be paired" : `Not connected (${s.health.status})`, tone: "warn" };
  }
  if (s.health.locked) {
    return { text: `Locked by WhatsApp${s.health.lockedUntil ? ` until ${ist(s.health.lockedUntil)} IST` : ""}`, tone: "bad" };
  }
  if (s.sentToday >= s.capToday) return { text: "Daily cap reached", tone: "warn" };
  return { text: "Sending codes", tone: "good" };
}

const toneOf: Record<"good" | "warn" | "bad", Tone> = { good: "success", warn: "warning", bad: "danger" };

export default function NumbersPanel({
  senders,
  post,
  busy,
  reload,
}: {
  senders: SenderRow[];
  post: Post;
  busy: string | null;
  reload: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", gatewayUrl: "http://waha2:3000", apiKey: "", dailyCap: "40" });
  const [pairFor, setPairFor] = useState<number | null>(null);
  const [pairNumber, setPairNumber] = useState("");
  const [pairCode, setPairCode] = useState<{ id: number; code: string; number: string } | null>(null);

  const ready = senders.filter((s) => state(s).tone === "good").length;

  return (
    <Card
      flush
      title="Numbers"
      description={
        <>
          Sign-in codes go from whichever connected number has sent the fewest today. A number WhatsApp
          locks, logs out or that reaches its daily cap is skipped automatically. If none can send, visitors
          are shown the &ldquo;send us this code&rdquo; screen instead, which still works.
        </>
      }
      actions={
        <Badge tone={ready ? "success" : "danger"}>
          {ready} of {senders.length} sending codes
        </Badge>
      }
    >
      <ul className="divide-y divide-slate-100">
        {senders.map((s) => {
          const st = state(s);
          return (
            <li key={s.id} className="flex flex-col gap-3 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 font-semibold text-slate-900">
                    {s.label}
                    {s.primary && <span className="text-xs font-medium text-slate-400">set up in the steps below</span>}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    <span className="font-mono">{s.phone ? `+${s.phone}` : "No number paired yet"}</span>
                    {" · "}
                    <span className="tabular-nums">
                      {s.sentToday} of {s.capToday} codes today
                    </span>
                    {s.capToday < s.dailyCap && " (warming up — full cap after its first week)"}
                  </p>
                  {s.health.error && st.tone !== "good" && (
                    <p className="mt-1 break-words text-xs text-red-600">{s.health.error}</p>
                  )}
                </div>
                <Badge tone={toneOf[st.tone]}>{st.text}</Badge>
              </div>

              {!s.primary && (
                <div className="flex flex-wrap items-center gap-2">
                  {s.health.status !== "WORKING" && s.health.reachable && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setPairFor(pairFor === s.id ? null : s.id);
                        setPairCode(null);
                      }}
                    >
                      <Smartphone className="h-4 w-4" /> Pair a phone
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={async () => {
                      const r = await post({ action: "sender-update", id: s.id, enabled: !s.enabled }, `toggle-${s.id}`);
                      if (r) reload();
                    }}
                    disabled={busy === `toggle-${s.id}`}
                  >
                    {s.enabled ? "Turn off" : "Turn on"}
                  </Button>
                  <label className="inline-flex items-center gap-1.5 text-[13px] text-slate-600">
                    Cap
                    <input
                      type="number"
                      min={0}
                      max={500}
                      defaultValue={s.dailyCap}
                      onBlur={async (e) => {
                        const v = Number(e.target.value);
                        if (v !== s.dailyCap) {
                          const r = await post({ action: "sender-update", id: s.id, dailyCap: v }, `cap-${s.id}`);
                          if (r) reload();
                        }
                      }}
                      className={`${INPUT} h-8 w-20 tabular-nums`}
                    />
                    / day
                  </label>
                  {s.health.status === "WORKING" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        if (!confirm(`Disconnect ${s.label}? It stops sending until it is paired again.`)) return;
                        const r = await post({ action: "sender-logout", id: s.id }, `logout-${s.id}`);
                        if (r) reload();
                      }}
                    >
                      <Power className="h-4 w-4" /> Disconnect
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm(`Remove ${s.label} from the list? Its container keeps running; this only stops the website using it.`)) return;
                      const r = await post({ action: "sender-remove", id: s.id }, `remove-${s.id}`);
                      if (r) reload();
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </div>
              )}

              {pairFor === s.id && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    The phone number this backup will send from (a 10-digit Indian number is fine — 91 is added). Then on that phone: WhatsApp
                    &rarr; Linked devices &rarr; Link a device &rarr; <em>Link with phone number instead</em>.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={pairNumber}
                      onChange={(e) => setPairNumber(e.target.value)}
                      placeholder="9876512345"
                      inputMode="tel"
                      aria-label="Phone number to pair"
                      className={`${INPUT} ${INPUT_H} w-full font-mono sm:w-48`}
                    />
                    <Button
                      variant="primary"
                      onClick={async () => {
                        const started = await post({ action: "sender-connect", id: s.id }, `pair-${s.id}`);
                        if (!started) return;
                        const r = await post({ action: "sender-pair-code", id: s.id, number: pairNumber }, `pair-${s.id}`);
                        if (r?.code) setPairCode({ id: s.id, code: String(r.code), number: String(r.number ?? pairNumber) });
                      }}
                      disabled={busy === `pair-${s.id}` || pairNumber.replace(/\D/g, "").length < 10}
                    >
                      {busy === `pair-${s.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
                      Get a pairing code
                    </Button>
                  </div>
                  {pairCode?.id === s.id && (
                    <p className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                      <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Type this on the +{pairCode.number} phone, within a couple of minutes
                      </span>
                      <span className="mt-1 block font-mono text-2xl font-bold tracking-[0.2em] text-slate-900">{pairCode.code}</span>
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-slate-100 px-5 py-4">
        {adding ? (
          <div>
            <p className="text-sm text-slate-600">
              Each backup is its own gateway container on the server, already running before it is added here. Use a
              number the team can see — people reply to the codes.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="sender-label">
                <input
                  id="sender-label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Backup 1"
                  className={`${INPUT} ${INPUT_H}`}
                />
              </Field>
              <Field label="Gateway address" htmlFor="sender-url">
                <input
                  id="sender-url"
                  value={form.gatewayUrl}
                  onChange={(e) => setForm({ ...form, gatewayUrl: e.target.value })}
                  className={`${INPUT} ${INPUT_H} font-mono`}
                />
              </Field>
              <Field label="Gateway API key" htmlFor="sender-key">
                <input
                  id="sender-key"
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  className={`${INPUT} ${INPUT_H}`}
                />
              </Field>
              <Field label="Sign-in codes per day" htmlFor="sender-cap">
                <input
                  id="sender-cap"
                  type="number"
                  min={0}
                  max={500}
                  value={form.dailyCap}
                  onChange={(e) => setForm({ ...form, dailyCap: e.target.value })}
                  className={`${INPUT} ${INPUT_H} tabular-nums`}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={async () => {
                  const r = await post({ action: "sender-add", ...form, dailyCap: Number(form.dailyCap) }, "sender-add");
                  if (r) {
                    setAdding(false);
                    setForm({ label: "", gatewayUrl: "http://waha2:3000", apiKey: "", dailyCap: "40" });
                    reload();
                  }
                }}
                disabled={busy === "sender-add"}
              >
                {busy === "sender-add" && <Loader2 className="h-4 w-4 animate-spin" />}
                Add number
              </Button>
              <Button onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add a backup number
          </Button>
        )}
      </div>
    </Card>
  );
}
