"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Check,
  AlertTriangle,
  Copy,
  KeyRound,
  Smartphone,
  Server,
  Power,
  QrCode,
} from "lucide-react";

/**
 * WhatsApp verification, set up without a terminal.
 *
 * The screen is four steps in the order someone actually does them, and each
 * one says whether it is done. The only step that leaves this page is starting
 * the container, and the command for that is composed here with the secret
 * already in it — the website runs on Workers and has no shell on the server,
 * and an admin button that could run commands would be a remote shell behind a
 * login form.
 */

interface Config {
  enabled: boolean;
  number: string;
  gatewayUrl: string;
  apiKeyMasked: string;
  apiKeySet: boolean;
  webhookSecretMasked: string;
  webhookSecretSet: boolean;
  envPinned: string[];
}

interface Gateway {
  configured: boolean;
  reachable?: boolean;
  status?: string;
  me?: { id?: string; pushName?: string } | null;
  error?: string;
}

const STATUS_COPY: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = {
  WORKING: { label: "Connected and receiving", tone: "good" },
  SCAN_QR_CODE: { label: "Waiting for you to scan the QR", tone: "warn" },
  STARTING: { label: "Starting up", tone: "warn" },
  STOPPED: { label: "Stopped", tone: "bad" },
  FAILED: { label: "Failed — try connecting again", tone: "bad" },
  PASSKEY_REQUIRED: { label: "Confirm on your phone", tone: "warn" },
  PASSKEY_CONFIRMATION_REQUIRED: { label: "Confirm on your phone", tone: "warn" },
};

function Pill({ tone, children }: { tone: "good" | "warn" | "bad"; children: React.ReactNode }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <header className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            done ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          {done ? <Check className="h-4 w-4" /> : n}
        </span>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export default function WhatsAppAdminPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [webhook, setWebhook] = useState("");

  const [number, setNumber] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [freshSecret, setFreshSecret] = useState("");
  const [qr, setQr] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setConfig(json.config);
      setGateway(json.gateway);
      setWebhook(json.webhookUrl);
      setNumber((v) => (v ? v : json.config.number));
      setGatewayUrl((v) => (v ? v : json.config.gatewayUrl));
      setEnabled(json.config.enabled);
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not load settings." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // While the phone is being paired the status changes on its own, so the
  // screen follows it rather than making someone press Refresh.
  const pairing = gateway?.status === "SCAN_QR_CODE" || gateway?.status === "STARTING";
  const pollRef = useRef(pairing);
  pollRef.current = pairing;
  useEffect(() => {
    if (!pairing) return;
    const id = setInterval(() => pollRef.current && load(true), 3000);
    return () => clearInterval(id);
  }, [pairing, load]);

  /**
   * Keep the QR alive.
   *
   * WhatsApp rotates it about every twenty seconds and the session fails after
   * a few go unscanned, so a code fetched once is usually dead by the time the
   * phone is unlocked. Refreshing on a shorter cycle means whatever is on
   * screen is always scannable.
   */
  const qrShown = Boolean(qr) && gateway?.status === "SCAN_QR_CODE";
  const qrRef = useRef(qrShown);
  qrRef.current = qrShown;
  useEffect(() => {
    if (!qrShown) return;
    const id = setInterval(async () => {
      if (!qrRef.current) return;
      try {
        const res = await fetch("/api/admin/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "qr" }),
        });
        const json = await res.json();
        if (json?.image) setQr(json.image);
      } catch {
        /* A missed refresh is not worth surfacing; the next one will land. */
      }
    }, 18000);
    return () => clearInterval(id);
  }, [qrShown]);

  const post = async (payload: Record<string, unknown>, label: string) => {
    setBusy(label);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "That did not work.");
      return json;
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "That did not work." });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setMsg({ kind: "err", text: "Could not copy — select the text and copy it by hand." });
    }
  };

  const dockerCommand = [
    "docker run -d --name waha --restart unless-stopped \\",
    "  -p 127.0.0.1:3001:3000 \\",
    "  -e WHATSAPP_DEFAULT_ENGINE=GOWS \\",
    `  -e WHATSAPP_HOOK_URL=${webhook || "https://admissionhands.com/api/whatsapp/inbound"} \\`,
    "  -e WHATSAPP_HOOK_EVENTS=message \\",
    `  -e WHATSAPP_HOOK_HMAC_KEY=${freshSecret || "<press Generate above to fill this in>"} \\`,
    "  -e WAHA_API_KEY=<choose any long random string, then paste it in step 3> \\",
    "  devlikeapro/waha",
  ].join("\n");

  const live = Boolean(config?.enabled && config?.number && config?.webhookSecretSet);
  const status = gateway?.status ? STATUS_COPY[gateway.status] : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp verification</h1>
          <p className="mt-1 text-sm text-gray-500">
            Visitors send a code to your number to unlock the seat list. Nothing is ever sent to
            them, which is what keeps the number safe.
          </p>
        </div>
        <button
          onClick={() => load()}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* ---- overall state ---- */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        {live ? (
          <Pill tone="good">
            <Check className="h-3.5 w-3.5" /> Verification is on
          </Pill>
        ) : (
          <Pill tone="bad">
            <AlertTriangle className="h-3.5 w-3.5" /> Not live yet
          </Pill>
        )}
        {gateway?.configured &&
          (gateway.reachable ? (
            <Pill tone={status?.tone ?? "warn"}>
              <Server className="h-3.5 w-3.5" />
              {status?.label ?? gateway.status}
            </Pill>
          ) : (
            <Pill tone="bad">
              <Server className="h-3.5 w-3.5" /> Gateway unreachable
            </Pill>
          ))}
        {gateway?.me?.id && (
          <span className="text-xs text-gray-500">Paired as {gateway.me.id.split("@")[0]}</span>
        )}
        {!live && (
          <span className="text-xs text-gray-500">
            Until this is on, visitors just type their number instead — nothing is broken.
          </span>
        )}
      </div>

      {msg && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm ${
            msg.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {config?.envPinned.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some values are fixed in the server environment and cannot be changed here:{" "}
          <span className="font-mono text-xs">{config.envPinned.join(", ")}</span>
        </div>
      ) : null}

      {/* ---- 1. the number ---- */}
      <Step n={1} title="The number visitors will message" done={Boolean(config?.number)}>
        <label htmlFor="wa-number" className="mb-1.5 block text-sm font-medium text-gray-700">
          Country code first, no plus sign
        </label>
        <input
          id="wa-number"
          value={number}
          inputMode="numeric"
          onChange={(e) => setNumber(e.target.value)}
          placeholder="919876543210"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm outline-none focus:border-gray-400"
        />
        <p className="mt-2 text-xs text-gray-500">
          Use a <strong>separate number</strong>, not the one on your Contacts page. If this one is
          ever restricted, your main lead line keeps working.
        </p>

        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">
            Offer WhatsApp verification on the site
          </span>
        </label>

        <button
          onClick={async () => {
            const r = await post(
              { action: "save", number, gatewayUrl, apiKey, enabled },
              "save",
            );
            if (r) {
              setApiKey("");
              setMsg({ kind: "ok", text: "Saved." });
              load(true);
            }
          }}
          disabled={busy === "save"}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </Step>

      {/* ---- 2. the one-time server step ---- */}
      <Step n={2} title="Start the gateway on your server (once)" done={Boolean(config?.webhookSecretSet)}>
        <p className="text-sm text-gray-600">
          This is the only step that needs someone with server access, and it is one command. Press
          Generate, copy the command, and run it on the VPS.
        </p>

        <button
          onClick={async () => {
            const r = await post({ action: "generate-secret" }, "secret");
            if (r?.secret) {
              setFreshSecret(r.secret);
              setMsg({
                kind: "ok",
                text: "New key created. Copy the command below now — the key is only shown once.",
              });
              load(true);
            }
          }}
          disabled={busy === "secret"}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "secret" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {config?.webhookSecretSet ? "Generate a new key" : "Generate the key"}
        </button>

        {config?.webhookSecretSet && !freshSecret && (
          <p className="mt-2 text-xs text-gray-500">
            A key is already set ({config.webhookSecretMasked}). Generating a new one means running
            the command again with the new value.
          </p>
        )}

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Run this on the server</span>
            <button
              onClick={() => copy(dockerCommand, "docker")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
            >
              {copied === "docker" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "docker" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-gray-900 p-4 text-[12px] leading-relaxed text-gray-100">
            {dockerCommand}
          </pre>
          <p className="mt-2 text-xs text-gray-500">
            Messages will be delivered to <span className="font-mono">{webhook}</span>
          </p>
        </div>
      </Step>

      {/* ---- 3. point the site at it ---- */}
      <Step n={3} title="Tell the site where the gateway is" done={Boolean(config?.gatewayUrl && config?.apiKeySet)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wa-url" className="mb-1.5 block text-sm font-medium text-gray-700">
              Gateway address
            </label>
            <input
              id="wa-url"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="https://wa.admissionhands.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label htmlFor="wa-key" className="mb-1.5 block text-sm font-medium text-gray-700">
              Gateway API key
            </label>
            <input
              id="wa-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.apiKeySet ? config.apiKeyMasked : "the WAHA_API_KEY you chose"}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 font-mono text-sm outline-none focus:border-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">Leave blank to keep the current key.</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          The command above binds the gateway to the server&apos;s own localhost, which the website
          cannot reach. To connect the phone from this screen, put it behind your web server on a
          name like <span className="font-mono">wa.admissionhands.com</span>. You can skip this — the
          verification still works, you just pair the phone on the server instead.
        </p>

        <button
          onClick={async () => {
            const r = await post({ action: "save", number, gatewayUrl, apiKey, enabled }, "save2");
            if (r) {
              setApiKey("");
              setMsg({ kind: "ok", text: "Saved." });
              load(true);
            }
          }}
          disabled={busy === "save2"}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {busy === "save2" && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </Step>

      {/* ---- 4. pair the phone ---- */}
      <Step n={4} title="Connect the phone" done={gateway?.status === "WORKING"}>
        {!config?.gatewayUrl ? (
          <p className="text-sm text-gray-600">
            Add the gateway address in step 3 to pair from here.
          </p>
        ) : gateway?.reachable === false ? (
          <p className="text-sm text-rose-700">{gateway.error}</p>
        ) : gateway?.status === "WORKING" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone="good">
              <Check className="h-3.5 w-3.5" /> Connected
            </Pill>

            {/* The alerts this number also sends: a lead form, a document
                upload. Worth being able to prove they arrive, because when
                they stopped arriving nobody noticed for weeks. */}
            <button
              onClick={async () => {
                const r = await post({ action: "test-alert" }, "test-alert");
                if (r) {
                  setMsg({
                    kind: "ok",
                    text: "Test alert sent. Check the number set under Contacts → lead notifications.",
                  });
                }
              }}
              disabled={busy === "test-alert"}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Send a test lead alert
            </button>

            <button
              onClick={async () => {
                if (!confirm("Disconnect this number? Verification stops working until you pair again.")) return;
                const r = await post({ action: "logout" }, "logout");
                if (r) {
                  setQr("");
                  setMsg({ kind: "ok", text: "Disconnected." });
                  load(true);
                }
              }}
              disabled={busy === "logout"}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              {busy === "logout" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  const started = await post({ action: "connect" }, "connect");
                  if (!started) return;
                  const r = await post({ action: "qr" }, "connect");
                  if (r?.image) setQr(r.image);
                  load(true);
                }}
                disabled={busy === "connect"}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Connect with QR
              </button>
              <button
                onClick={async () => {
                  await post({ action: "connect" }, "pair");
                  const r = await post({ action: "pair-code", number }, "pair");
                  if (r?.code) setPairCode(r.code);
                  load(true);
                }}
                disabled={busy === "pair" || !number}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {busy === "pair" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                Pair with a code instead
              </button>
            </div>

            {gateway?.status === "FAILED" && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                The code expired before it was scanned and the session stopped. Press{" "}
                <strong>Connect with QR</strong> again with the phone already open at WhatsApp &rarr;
                Linked devices.
              </p>
            )}

            {qr && (
              <div className="mt-4 inline-block rounded-2xl border border-gray-200 bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR code to pair WhatsApp" width={256} height={256} />
                <p className="mt-2 max-w-[256px] text-xs text-gray-500">
                  On the phone: WhatsApp &rarr; Settings &rarr; Linked devices &rarr; Link a device.
                  This code refreshes itself, so scan whatever is on screen.
                </p>
              </div>
            )}

            {pairCode && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                <span className="block text-xs uppercase tracking-wide text-gray-500">
                  Type this on the phone
                </span>
                <span className="font-mono text-2xl font-bold tracking-[0.2em] text-gray-900">
                  {pairCode}
                </span>
                <p className="mt-1 text-xs text-gray-500">
                  WhatsApp → Linked devices → Link with phone number instead.
                </p>
              </div>
            )}
          </>
        )}
      </Step>
    </div>
  );
}
