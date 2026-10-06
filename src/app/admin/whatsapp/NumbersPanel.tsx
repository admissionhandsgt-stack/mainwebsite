"use client";

import { useState } from "react";
import { Loader2, Plus, Smartphone, Trash2, Power } from "lucide-react";

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

const toneCls = {
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  bad: "bg-rose-50 text-rose-700 border-rose-200",
};

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
  const [pairCode, setPairCode] = useState<{ id: number; code: string } | null>(null);

  const ready = senders.filter((s) => state(s).tone === "good").length;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Numbers</h2>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Sign-in codes go from whichever connected number has sent the fewest today. A number WhatsApp
            locks, logs out or that reaches its daily cap is skipped automatically. If none can send, visitors
            are shown the &ldquo;send us this code&rdquo; screen instead, which still works.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
            ready ? toneCls.good : toneCls.bad
          }`}
        >
          {ready} of {senders.length} sending codes
        </span>
      </header>

      <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
        {senders.map((s) => {
          const st = state(s);
          return (
            <li key={s.id} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {s.label}
                    {s.primary && <span className="ml-2 text-xs font-medium text-gray-400">set up in the steps below</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    {s.phone ? `+${s.phone}` : "No number paired yet"} · {s.sentToday} of {s.capToday} codes today
                    {s.capToday < s.dailyCap && " (warming up — full cap after its first week)"}
                  </p>
                  {s.health.error && st.tone !== "good" && <p className="text-xs text-rose-600">{s.health.error}</p>}
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneCls[st.tone]}`}>
                  {st.text}
                </span>
              </div>

              {!s.primary && (
                <div className="flex flex-wrap items-center gap-2">
                  {s.health.status !== "WORKING" && s.health.reachable && (
                    <button
                      onClick={() => {
                        setPairFor(pairFor === s.id ? null : s.id);
                        setPairCode(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Smartphone className="h-4 w-4" /> Pair a phone
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      const r = await post({ action: "sender-update", id: s.id, enabled: !s.enabled }, `toggle-${s.id}`);
                      if (r) reload();
                    }}
                    disabled={busy === `toggle-${s.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {s.enabled ? "Turn off" : "Turn on"}
                  </button>
                  <label className="inline-flex items-center gap-1.5 text-sm text-gray-600">
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
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                    />
                    / day
                  </label>
                  {s.health.status === "WORKING" && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Disconnect ${s.label}? It stops sending until it is paired again.`)) return;
                        const r = await post({ action: "sender-logout", id: s.id }, `logout-${s.id}`);
                        if (r) reload();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <Power className="h-4 w-4" /> Disconnect
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove ${s.label} from the list? Its container keeps running; this only stops the website using it.`)) return;
                      const r = await post({ action: "sender-remove", id: s.id }, `remove-${s.id}`);
                      if (r) reload();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
              )}

              {pairFor === s.id && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">
                    The phone number this backup will send from, with the country code. Then on that phone: WhatsApp
                    &rarr; Linked devices &rarr; Link a device &rarr; <em>Link with phone number instead</em>.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      value={pairNumber}
                      onChange={(e) => setPairNumber(e.target.value)}
                      placeholder="919876512345"
                      inputMode="tel"
                      className="w-48 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={async () => {
                        const started = await post({ action: "sender-connect", id: s.id }, `pair-${s.id}`);
                        if (!started) return;
                        const r = await post({ action: "sender-pair-code", id: s.id, number: pairNumber }, `pair-${s.id}`);
                        if (r?.code) setPairCode({ id: s.id, code: String(r.code) });
                      }}
                      disabled={busy === `pair-${s.id}` || pairNumber.replace(/\D/g, "").length < 10}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === `pair-${s.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
                      Get a pairing code
                    </button>
                  </div>
                  {pairCode?.id === s.id && (
                    <p className="mt-3">
                      <span className="block text-xs uppercase tracking-wide text-gray-500">Type this on that phone</span>
                      <span className="font-mono text-2xl font-bold tracking-[0.2em] text-gray-900">{pairCode.code}</span>
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="mt-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            Each backup is its own gateway container on the server, already running before it is added here. Use a
            number the team can see — people reply to the codes.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
              Name
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Backup 1"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-700">
              Gateway address
              <input
                value={form.gatewayUrl}
                onChange={(e) => setForm({ ...form, gatewayUrl: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="text-sm text-gray-700">
              Gateway API key
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-700">
              Sign-in codes per day
              <input
                type="number"
                min={0}
                max={500}
                value={form.dailyCap}
                onChange={(e) => setForm({ ...form, dailyCap: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                const r = await post({ action: "sender-add", ...form, dailyCap: Number(form.dailyCap) }, "sender-add");
                if (r) {
                  setAdding(false);
                  setForm({ label: "", gatewayUrl: "http://waha2:3000", apiKey: "", dailyCap: "40" });
                  reload();
                }
              }}
              disabled={busy === "sender-add"}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {busy === "sender-add" && <Loader2 className="h-4 w-4 animate-spin" />}
              Add number
            </button>
            <button onClick={() => setAdding(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" /> Add a backup number
        </button>
      )}
    </section>
  );
}
