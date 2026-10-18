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
  Power,
  QrCode,
  Send,
} from "lucide-react";
import NumbersPanel, { type SenderRow } from "./NumbersPanel";
import { Badge, Button, Card, Field, INPUT, INPUT_H, Notice, PageHeader, Toggle, type Tone } from "@/components/admin/ui";

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
  me?: {
    id?: string;
    pushName?: string;
    /** WhatsApp's "reach-out lock": no new chats from this number until it lifts. */
    reachoutTimelock?: { isActive?: boolean; timeEnforcementEnds?: number; enforcementType?: string };
  } | null;
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

const TONE: Record<"good" | "warn" | "bad", Tone> = { good: "success", warn: "warning", bad: "danger" };

/** A numbered setup step: the number turns into a tick once it is done. */
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
    <Card
      title={
        <span className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
            }`}
            aria-hidden="true"
          >
            {done ? <Check className="h-4 w-4" /> : n}
          </span>
          <span>
            <span className="sr-only">Step {n}: </span>
            {title}
          </span>
        </span>
      }
      actions={done ? <Badge tone="success">Done</Badge> : <Badge tone="neutral">To do</Badge>}
    >
      {children}
    </Card>
  );
}

/** One line of the status panel. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium text-slate-800">{children}</dd>
    </div>
  );
}

export default function WhatsAppAdminPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [webhook, setWebhook] = useState("");
  const [senders, setSenders] = useState<SenderRow[]>([]);

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
      setSenders(json.senders ?? []);
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

  const stepsDone = [
    Boolean(config?.number),
    Boolean(config?.webhookSecretSet),
    Boolean(config?.gatewayUrl && config?.apiKeySet),
    gateway?.status === "WORKING",
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp gateway"
        description="The linked-device gateway on the server. When the official API cannot send a code, sign-in falls back to it: visitors message their code to the number set here."
        actions={
          <Button onClick={() => load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ---- status and messages: on top on a phone, beside the steps on a wide screen ---- */}
        <aside className="min-w-0 space-y-4 xl:order-2">
          <Card title="Status" description={`${stepsDone} of 4 steps done`}>
            <dl className="-my-2.5 divide-y divide-slate-100">
              <Row label="Verification">
                {live ? (
                  <Badge tone="success">
                    <Check className="h-3.5 w-3.5" /> On
                  </Badge>
                ) : (
                  <Badge tone="danger">
                    <AlertTriangle className="h-3.5 w-3.5" /> Not live yet
                  </Badge>
                )}
              </Row>
              <Row label="Gateway">
                {gateway?.configured ? (
                  gateway.reachable ? (
                    <Badge tone={status ? TONE[status.tone] : "warning"}>{status?.label ?? gateway.status}</Badge>
                  ) : (
                    <Badge tone="danger">Unreachable</Badge>
                  )
                ) : (
                  <Badge tone="neutral">Not set up</Badge>
                )}
              </Row>
              {gateway?.me?.id && (
                <Row label="Paired as">
                  <span className="font-mono">{gateway.me.id.split("@")[0]}</span>
                </Row>
              )}
            </dl>
            {!live && (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Until this is on, visitors just type their number instead — nothing is broken.
              </p>
            )}
          </Card>

          {(() => {
            // A 463 from WhatsApp: the number may not start new chats. Every
            // sign-in code goes to somebody new, so codes cannot be sent — and a
            // restart does not lift it, which is worth saying before somebody
            // tries (somebody did, on 2026-10-06).
            const lock = gateway?.me?.reachoutTimelock;
            const ends = lock?.timeEnforcementEnds ? new Date(lock.timeEnforcementEnds * 1000) : null;
            if (!lock?.isActive || (ends && ends.getTime() < Date.now())) return null;
            return (
              <div role="status">
                <Notice
                  tone="warning"
                  icon={AlertTriangle}
                  title={
                    <>
                      WhatsApp has stopped this number starting new chats
                      {ends
                        ? ` until ${ends.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} IST`
                        : " for now"}
                      .
                    </>
                  }
                >
                  <p className="mt-1">
                    Sign-in codes cannot be sent until then, so visitors are automatically shown the
                    &ldquo;send us this code on WhatsApp&rdquo; screen instead, which still works. Lead
                    alerts to the team and existing chats are unaffected. Restarting or re-pairing the
                    session does not lift it — waiting does. It is WhatsApp&rsquo;s response to messaging
                    many new numbers; fewer codes per day is what keeps it away.
                  </p>
                </Notice>
              </div>
            );
          })()}

          {msg && (
            <Notice
              tone={msg.kind === "ok" ? "success" : "danger"}
              icon={msg.kind === "ok" ? Check : AlertTriangle}
              action={
                msg.kind === "err" && !config ? (
                  <Button size="sm" onClick={() => load()}>
                    Retry
                  </Button>
                ) : undefined
              }
            >
              {msg.text}
            </Notice>
          )}

          {config?.envPinned.length ? (
            <Notice tone="warning" title="Fixed on the server">
              Some values are fixed in the server environment and cannot be changed here:{" "}
              <span className="break-all font-mono text-xs">{config.envPinned.join(", ")}</span>
            </Notice>
          ) : null}
        </aside>

        {/* ---- the numbers, then the four steps ---- */}
        <div className="min-w-0 space-y-5 xl:order-1">
          {senders.length > 0 && (
            <NumbersPanel senders={senders} post={post} busy={busy} reload={() => load(true)} />
          )}

          {/* ---- 1. the number ---- */}
          <Step n={1} title="The number visitors will message" done={Boolean(config?.number)}>
            <div className="max-w-md space-y-4">
              <Field
                label="Country code first, no plus sign"
                htmlFor="wa-number"
                hint={
                  <>
                    Use a <strong>separate number</strong>, not the one on your Contacts page. If this one is
                    ever restricted, your main lead line keeps working.
                  </>
                }
              >
                <input
                  id="wa-number"
                  value={number}
                  inputMode="numeric"
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="919876543210"
                  className={`${INPUT} ${INPUT_H} font-mono`}
                />
              </Field>

              <Toggle checked={enabled} onChange={setEnabled} label="Offer WhatsApp verification on the site" />
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <Button
                variant="primary"
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
              >
                {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </Step>

          {/* ---- 2. the one-time server step ---- */}
          <Step n={2} title="Start the gateway on your server (once)" done={Boolean(config?.webhookSecretSet)}>
            <p className="text-sm text-slate-600">
              This is the only step that needs someone with server access, and it is one command. Press
              Generate, copy the command, and run it on the VPS.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
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
              >
                {busy === "secret" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {config?.webhookSecretSet ? "Generate a new key" : "Generate the key"}
              </Button>

              {config?.webhookSecretSet && !freshSecret && (
                <p className="text-xs text-slate-500">
                  A key is already set ({config.webhookSecretMasked}). Generating a new one means running
                  the command again with the new value.
                </p>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-2">
                <span className="text-xs font-medium text-slate-300">Run this on the server</span>
                <button
                  type="button"
                  onClick={() => copy(dockerCommand, "docker")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                >
                  {copied === "docker" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "docker" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed text-slate-100">{dockerCommand}</pre>
            </div>
            <p className="mt-2 break-all text-xs text-slate-500">
              Messages will be delivered to <span className="font-mono">{webhook}</span>
            </p>
          </Step>

          {/* ---- 3. point the site at it ---- */}
          <Step n={3} title="Tell the site where the gateway is" done={Boolean(config?.gatewayUrl && config?.apiKeySet)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Gateway address" htmlFor="wa-url">
                <input
                  id="wa-url"
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  placeholder="https://wa.admissionhands.com"
                  className={`${INPUT} ${INPUT_H} font-mono`}
                />
              </Field>
              <Field label="Gateway API key" htmlFor="wa-key" hint="Leave blank to keep the current key.">
                <input
                  id="wa-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={config?.apiKeySet ? config.apiKeyMasked : "the WAHA_API_KEY you chose"}
                  className={`${INPUT} ${INPUT_H} font-mono`}
                />
              </Field>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              The command above binds the gateway to the server&apos;s own localhost, which the website
              cannot reach. To connect the phone from this screen, put it behind your web server on a
              name like <span className="font-mono">wa.admissionhands.com</span>. You can skip this — the
              verification still works, you just pair the phone on the server instead.
            </p>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <Button
                variant="primary"
                onClick={async () => {
                  const r = await post({ action: "save", number, gatewayUrl, apiKey, enabled }, "save2");
                  if (r) {
                    setApiKey("");
                    setMsg({ kind: "ok", text: "Saved." });
                    load(true);
                  }
                }}
                disabled={busy === "save2"}
              >
                {busy === "save2" && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </Step>

          {/* ---- 4. pair the phone ---- */}
          <Step n={4} title="Connect the phone" done={gateway?.status === "WORKING"}>
            {!config?.gatewayUrl ? (
              <p className="text-sm text-slate-600">
                Add the gateway address in step 3 to pair from here.
              </p>
            ) : gateway?.reachable === false ? (
              <Notice tone="danger" icon={AlertTriangle} title="The gateway did not answer">
                {gateway.error}
              </Notice>
            ) : gateway?.status === "WORKING" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">
                  <Check className="h-3.5 w-3.5" /> Connected
                </Badge>

                {/* The alerts this number also sends: a lead form, a document
                    upload. Worth being able to prove they arrive, because when
                    they stopped arriving nobody noticed for weeks. */}
                <Button
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
                >
                  {busy === "test-alert" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send a test lead alert
                </Button>

                <Button
                  variant="danger"
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
                >
                  {busy === "logout" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                  Disconnect
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={async () => {
                      const started = await post({ action: "connect" }, "connect");
                      if (!started) return;
                      const r = await post({ action: "qr" }, "connect");
                      if (r?.image) setQr(r.image);
                      load(true);
                    }}
                    disabled={busy === "connect"}
                  >
                    {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Connect with QR
                  </Button>
                  <Button
                    onClick={async () => {
                      await post({ action: "connect" }, "pair");
                      const r = await post({ action: "pair-code", number }, "pair");
                      if (r?.code) setPairCode(r.code);
                      load(true);
                    }}
                    disabled={busy === "pair" || !number}
                  >
                    {busy === "pair" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                    Pair with a code instead
                  </Button>
                </div>

                {gateway?.status === "FAILED" && (
                  <Notice tone="warning" icon={AlertTriangle} className="mt-4">
                    The code expired before it was scanned and the session stopped. Press{" "}
                    <strong>Connect with QR</strong> again with the phone already open at WhatsApp &rarr;
                    Linked devices.
                  </Notice>
                )}

                {(qr || pairCode) && (
                  <div className="mt-4 flex flex-wrap items-start gap-4">
                    {qr && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qr} alt="QR code to pair WhatsApp" width={256} height={256} className="h-auto max-w-full" />
                        <p className="mt-2 max-w-[256px] text-xs text-slate-500">
                          On the phone: WhatsApp &rarr; Settings &rarr; Linked devices &rarr; Link a device.
                          This code refreshes itself, so scan whatever is on screen.
                        </p>
                      </div>
                    )}

                    {pairCode && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                          Type this on the phone
                        </span>
                        <span className="mt-1 block font-mono text-2xl font-bold tracking-[0.2em] text-slate-900">
                          {pairCode}
                        </span>
                        <p className="mt-1 text-xs text-slate-500">
                          WhatsApp → Linked devices → Link with phone number instead.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </Step>
        </div>
      </div>
    </div>
  );
}
