"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  ExternalLink,
  FolderOpen,
  Loader2,
  RefreshCw,
} from "lucide-react";

/**
 * Connecting Google Drive, from the admin rather than from a deploy.
 *
 * Same principle as the WhatsApp gateway screen: the person who has the Google
 * account is not the person with shell access, and asking them to email a
 * client secret to a developer is worse than letting them paste it behind a
 * login.
 *
 * The secret is write-only here. The status call reports whether one is set,
 * never what it is.
 */

interface Status {
  connected: boolean;
  email: string | null;
  rootFolderId: string | null;
  error: string | null;
  hasClientId: boolean;
  hasClientSecret: boolean;
  counts: { synced: number; pending: number; failed: number };
}

export default function DrivePanel({ flash }: { flash?: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/google");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* the panel simply stays blank */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveCredentials = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/google", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const json = await res.json();
      if (!res.ok) setMessage(json.error ?? "Could not save.");
      else {
        setClientSecret("");
        setMessage("Saved. Now press Connect.");
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const act = async (method: "POST" | "DELETE", label: string) => {
    setBusy(label);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/google", { method });
      const json = await res.json();
      if (!res.ok) setMessage(json.error ?? "That did not work.");
      else if (method === "POST") {
        setMessage(`Synced ${json.synced} of ${json.attempted} pending file(s).`);
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const flashNote =
    flash === "connected"
      ? { tone: "good", text: "Google Drive is connected. New uploads will appear there." }
      : flash === "denied"
        ? { tone: "bad", text: "The Google consent screen was cancelled, so nothing changed." }
        : flash === "error"
          ? { tone: "bad", text: "Google returned an error. Check the client ID, secret and redirect URI." }
          : null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Google Drive mirror</h2>
          <p className="mt-1 max-w-[68ch] text-[13px] leading-relaxed text-gray-500">
            Copies every uploaded document into a folder per candidate, named with their name,
            number and rank. The documents stay on our server either way — Drive is a convenience
            for the team, not where they are kept.
          </p>
        </div>

        {status && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
              status.connected ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            {status.connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
            {status.connected ? "Connected" : "Not connected"}
          </span>
        )}
      </div>

      {flashNote && (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-[13px] ${
            flashNote.tone === "good"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {flashNote.text}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-700">
          {message}
        </p>
      )}

      {status?.error && (
        <p className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {status.error}
            <br />
            If this says the token was revoked or expired, press Connect again. Google expires the
            token after seven days while the consent screen is still in “Testing”.
          </span>
        </p>
      )}

      {/* --------------------------- credentials --------------------------- */}
      {!status?.connected && (
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-gray-500">
                Client ID
              </span>
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="…apps.googleusercontent.com"
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-cyan-500"
              />
              {status?.hasClientId && !clientId && (
                <span className="mt-1 block text-[12px] text-emerald-700">One is already saved.</span>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-gray-500">
                Client secret
              </span>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={status?.hasClientSecret ? "•••••••• (saved)" : "GOCSPX-…"}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-cyan-500"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveCredentials}
              disabled={busy !== null || !clientId || !clientSecret}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-[13px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
              Save credentials
            </button>

            <a
              href="/api/admin/google/connect"
              className={`inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-600 px-4 text-[13px] font-bold text-white hover:bg-cyan-700 ${
                status?.hasClientId && status?.hasClientSecret ? "" : "pointer-events-none opacity-40"
              }`}
            >
              <ExternalLink className="h-4 w-4" />
              Connect Google account
            </a>
          </div>

          <p className="text-[12.5px] leading-relaxed text-gray-500">
            Register this exact redirect URI in the Google Cloud console:{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">
              {typeof window === "undefined"
                ? "https://<admin host>/api/admin/google/callback"
                : `${window.location.origin}/api/admin/google/callback`}
            </code>
          </p>
        </div>
      )}

      {/* ------------------------------ connected ------------------------------ */}
      {status?.connected && (
        <div className="mt-5 space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Account", status.email ?? "—"],
              ["In Drive", String(status.counts.synced)],
              ["Waiting", String(status.counts.pending)],
              ["Failed", String(status.counts.failed)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-gray-200 px-3 py-2.5">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{k}</dt>
                <dd className="mt-0.5 truncate text-[14px] font-semibold text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-2">
            {status.rootFolderId && (
              <a
                href={`https://drive.google.com/drive/folders/${status.rootFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-600 px-4 text-[13px] font-bold text-white hover:bg-cyan-700"
              >
                <FolderOpen className="h-4 w-4" />
                Open the folder in Drive
              </a>
            )}
            <button
              onClick={() => act("POST", "sync")}
              disabled={busy !== null}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-[13px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              {busy === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync what is waiting
            </button>
            <button
              onClick={() => {
                if (window.confirm("Stop copying new documents to Drive? Files already there are kept.")) {
                  act("DELETE", "disconnect");
                }
              }}
              disabled={busy !== null}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-[13px] font-bold text-gray-500 hover:border-rose-300 hover:text-rose-700 disabled:opacity-40"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
