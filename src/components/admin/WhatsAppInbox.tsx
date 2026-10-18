"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, Phone, Search, Send, Loader2, ExternalLink, Clock, AlertCircle } from "lucide-react";

/**
 * The official number's chats, laid out like WhatsApp: conversations on the
 * left, the thread on the right, a reply box underneath. Everything comes from
 * /api/admin/wa-inbox; the 24-hour reply window is enforced there too.
 */

interface Conversation {
  phone: string;
  name: string | null;
  leadId: number | null;
  leadStatus: string | null;
  level: string | null;
  rank: number | null;
  lastAt: string;
  lastText: string;
  lastDirection: "out" | "in";
  lastStatus: string;
  unread: number;
  failed: number;
  windowUntil: string | null;
}

interface ChatMessage {
  id: number;
  direction: "out" | "in";
  kind: string;
  label: string | null;
  text: string;
  status: string;
  errorText: string | null;
  sentBy: string | null;
  at: string;
  deliveredAt: string | null;
  readAt: string | null;
}

const FILTERS = [
  { id: "", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "replies", label: "Can reply" },
  { id: "failed", label: "Failed" },
];

const IST = "Asia/Kolkata";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: IST });
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });

function listTime(iso: string) {
  const today = dayKey(new Date().toISOString());
  const k = dayKey(iso);
  if (k === today) return time(iso);
  const y = new Date(Date.now() - 86400_000).toISOString();
  if (k === dayKey(y)) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" });
}

function dayLabel(iso: string) {
  const t = listTime(iso);
  if (t === "Yesterday") return t;
  if (dayKey(iso) === dayKey(new Date().toISOString())) return "Today";
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "long" });
}

const initials = (c: { name: string | null; phone: string }) =>
  (c.name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || c.phone.slice(-2);

const AVATAR = ["bg-cyan-600", "bg-teal-600", "bg-emerald-600", "bg-sky-700", "bg-slate-600", "bg-amber-600"];
const avatarColour = (phone: string) => AVATAR[Number(phone.slice(-1)) % AVATAR.length];

/** WhatsApp's own ticks: clock, one grey, two grey, two blue — and a red mark when it failed. */
function Ticks({ status, className = "" }: { status: string; className?: string }) {
  if (status === "failed") return <AlertCircle className={`h-3.5 w-3.5 text-red-600 ${className}`} aria-label="Failed" />;
  if (status === "accepted") return <Clock className={`h-3 w-3 text-slate-400 ${className}`} aria-label="Waiting for Meta" />;
  if (status === "unknown") return <span className={`text-[10px] text-slate-400 ${className}`} title="Sent before tracking">?</span>;
  const two = status === "delivered" || status === "read";
  const colour = status === "read" ? "#53bdeb" : "#8696a0";
  return (
    <svg viewBox="0 0 18 11" className={`h-[11px] w-[17px] ${className}`} aria-label={status} fill="none">
      <path d="M1 6l3.2 3.2L11 2" stroke={colour} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {two && <path d="M7 9.2L14 2" stroke={colour} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

const STATUS_WORD: Record<string, string> = {
  accepted: "Waiting for Meta",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  unknown: "Before tracking",
};

export default function WhatsAppInbox() {
  const pathname = usePathname() ?? "";
  const leadsHref = (id: number) => `${pathname.startsWith("/admin") ? "/admin" : ""}/leads?id=${id}`;

  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (q.trim()) params.set("q", q.trim());
    const r = await fetch(`/api/admin/wa-inbox?${params}`, { cache: "no-store" });
    if (r.ok) setConvos((await r.json()).conversations);
  }, [filter, q]);

  const loadThread = useCallback(async (phone: string) => {
    const r = await fetch(`/api/admin/wa-inbox?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
    if (r.ok) setMessages((await r.json()).messages);
  }, []);

  useEffect(() => {
    const t = setTimeout(loadList, q ? 250 : 0);
    const i = setInterval(loadList, 15_000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [loadList, q]);

  useEffect(() => {
    if (!active) return;
    setMessages(null);
    setError(null);
    loadThread(active).then(loadList);
    const i = setInterval(() => loadThread(active), 8_000);
    return () => clearInterval(i);
    // loadList is deliberately not a dependency: reloading the thread on every search keystroke is noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, loadThread]);

  const count = messages?.length ?? 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [count, active]);

  const current = useMemo(() => convos?.find((c) => c.phone === active) ?? null, [convos, active]);

  const send = async () => {
    if (!active || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/wa-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: active, text: draft }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not send that.");
      setDraft("");
      await loadThread(active);
      loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that.");
    } finally {
      setSending(false);
    }
  };

  // Group the thread by day, WhatsApp-style.
  const grouped = useMemo(() => {
    const out: { day: string; items: ChatMessage[] }[] = [];
    for (const m of messages ?? []) {
      const d = dayKey(m.at);
      if (out[out.length - 1]?.day !== d) out.push({ day: d, items: [] });
      out[out.length - 1].items.push(m);
    }
    return out;
  }, [messages]);

  return (
    <div className="grid h-[calc(100dvh-12.5rem)] min-h-[440px] md:h-[calc(100dvh-17rem)] md:min-h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[minmax(300px,380px)_1fr]">
      {/* ---------------------------------------------------- conversation list */}
      <aside className={`flex min-h-0 flex-col border-r border-slate-200 ${active ? "hidden md:flex" : "flex"}`}>
        <div className="space-y-3 border-b border-slate-100 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or number"
              aria-label="Search chats"
              className="h-10 w-full rounded-xl bg-slate-100 pl-9 pr-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f.id ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {convos === null && (
            <li className="flex justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </li>
          )}
          {convos?.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-500">No chats here.</li>}
          {convos?.map((c) => (
            <li key={c.phone}>
              <button
                onClick={() => setActive(c.phone)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50 ${
                  active === c.phone ? "bg-slate-100" : ""
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColour(c.phone)}`}
                >
                  {initials(c)}
                </span>
                <span className="min-w-0 flex-1 border-b border-slate-100 pb-3">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold text-slate-900">{c.name || c.phone}</span>
                    <span className={`shrink-0 text-[11px] ${c.unread ? "font-semibold text-emerald-600" : "text-slate-400"}`}>
                      {listTime(c.lastAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    {c.lastDirection === "out" && <Ticks status={c.lastStatus} className="shrink-0" />}
                    <span className="truncate text-[13px] text-slate-500">{c.lastText}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      {c.failed > 0 && (
                        <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-700">{c.failed} failed</span>
                      )}
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------------------------------------------------------------- thread */}
      <section className={`min-h-0 flex-col ${active ? "flex" : "hidden md:flex"}`}>
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#f0f2f5] p-8 text-center">
            <div className="text-lg font-semibold text-slate-700">AdmissionHands · +91 70230 81792</div>
            <p className="max-w-sm text-sm text-slate-500">
              Pick a chat to see every message the official number sent to that student, whether it was delivered and
              read, and anything they wrote back.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-slate-200 bg-[#f0f2f5] px-3 py-2.5">
              <button
                onClick={() => setActive(null)}
                className="rounded-full p-2 text-slate-600 hover:bg-slate-200 md:hidden"
                aria-label="Back to chats"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColour(active)}`}
              >
                {initials({ name: current?.name ?? null, phone: active })}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-900">{current?.name || active}</div>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="tabular-nums">{active}</span>
                  {current?.level && <span className="uppercase">{current.level}</span>}
                  {current?.rank != null && <span>Rank {current.rank.toLocaleString("en-IN")}</span>}
                  {current?.leadStatus && <span>Lead: {current.leadStatus}</span>}
                </div>
              </div>
              {current?.leadId && (
                <a
                  href={leadsHref(current.leadId)}
                  className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 sm:inline-flex"
                >
                  <ExternalLink className="h-4 w-4" /> Lead
                </a>
              )}
              <a
                href={`tel:${active}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#efeae2] px-3 py-4 sm:px-8">
              {messages === null && (
                <div className="flex justify-center py-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
              {grouped.map((g) => (
                <div key={g.day} className="space-y-1.5">
                  <div className="flex justify-center py-2">
                    <span className="rounded-lg bg-white/90 px-3 py-1 text-[11.5px] font-medium text-slate-600 shadow-sm">
                      {dayLabel(g.items[0].at)}
                    </span>
                  </div>
                  {g.items.map((m) => (
                    <Bubble key={m.id} m={m} />
                  ))}
                </div>
              ))}
              <div ref={bottom} />
            </div>

            <footer className="border-t border-slate-200 bg-[#f0f2f5] p-3">
              {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
              {current?.windowUntil ? (
                <>
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={1}
                      placeholder="Type a reply"
                      aria-label="Reply"
                      className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border-0 bg-white px-4 py-3 text-[15px] outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500/40"
                    />
                    <button
                      onClick={send}
                      disabled={sending || !draft.trim()}
                      aria-label="Send"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-opacity disabled:opacity-40"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Goes from +91 70230 81792 under your name in this log. Typed replies are allowed until{" "}
                    {new Date(current.windowUntil).toLocaleString("en-IN", {
                      timeZone: IST,
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    . Enter sends, Shift+Enter adds a line.
                  </p>
                </>
              ) : (
                <p className="rounded-xl bg-white px-4 py-3 text-center text-[13px] text-slate-600 ring-1 ring-slate-200">
                  WhatsApp allows a typed reply only within 24 hours of the student&apos;s last message. This student
                  has not written in that time — call them instead.
                </p>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const out = m.direction === "out";
  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[85%] rounded-lg px-3 pb-1.5 pt-2 shadow-sm sm:max-w-[70%] ${
          out ? "rounded-tr-none bg-[#d9fdd3]" : "rounded-tl-none bg-white"
        }`}
      >
        {m.label && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            {m.label} · template
          </div>
        )}
        {m.kind === "agent" && m.sentBy && (
          <div className="mb-0.5 text-[11px] font-semibold text-cyan-700">{m.sentBy}</div>
        )}
        <div className="whitespace-pre-wrap break-words text-[14.5px] leading-snug text-slate-900">{m.text}</div>
        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
          <span>{time(m.at)}</span>
          {out && <Ticks status={m.status} />}
        </div>
        {out && (m.status === "read" || m.status === "delivered") && (
          <div className="sr-only">{STATUS_WORD[m.status]}</div>
        )}
        {m.errorText && <div className="mt-1 border-t border-red-200 pt-1 text-[11.5px] text-red-700">{m.errorText}</div>}
        {out && m.status === "unknown" && (
          <div className="mt-0.5 text-[10.5px] text-slate-500">Sent before delivery tracking — not known if it arrived.</div>
        )}
      </div>
    </div>
  );
}
