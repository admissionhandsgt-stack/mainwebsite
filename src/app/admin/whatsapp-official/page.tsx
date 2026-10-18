"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Phone as PhoneIcon, RefreshCw, Send } from "lucide-react";
import { Badge, Button, Card, Field, INPUT, INPUT_H, Notice, PageHeader, type Tone } from "@/components/admin/ui";

/**
 * WhatsApp Official API — Meta's Cloud API, for sign-in codes.
 *
 * Five steps in the order they are done. The token is pasted here, never sent
 * in a chat: it is stored as a secret and only its last four characters are
 * ever shown again. Everything after the token — the number, the template, the
 * test, the switch — runs from this page through Meta's API.
 */

interface Config {
  enabled: boolean;
  tokenMasked: string;
  wabaId: string;
  phoneNumberId: string;
  template: string;
  caps: { hour: number; day: number };
}
interface Phone {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
  name_status?: string;
  status?: string;
}
interface Status {
  account: { name?: string; id?: string } | null;
  phones: Phone[];
  template: { name?: string; status?: string; language?: string } | null;
  errors: string[];
}

const input = `${INPUT} ${INPUT_H}`;

/** Meta's words for a template, a number and its quality, as a colour. */
const templateTone = (s?: string): Tone =>
  s === "APPROVED" ? "success" : s === "REJECTED" || s === "DISABLED" || s === "PAUSED" ? "danger" : s ? "warning" : "neutral";
const qualityTone = (s?: string): Tone =>
  s === "GREEN" ? "success" : s === "YELLOW" ? "warning" : s === "RED" ? "danger" : "neutral";
const verifyTone = (s?: string): Tone => (s === "VERIFIED" ? "success" : s ? "warning" : "neutral");

/** A numbered setup step: the number turns into a tick once it is done. */
function Step({
  n,
  title,
  done,
  badge,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  /** Replaces the Done / To do badge where those words do not fit the step. */
  badge?: React.ReactNode;
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
      actions={badge ?? (done ? <Badge tone="success">Done</Badge> : <Badge tone="neutral">To do</Badge>)}
    >
      {children}
    </Card>
  );
}

/** A small heading inside a step that has parts. */
function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

/** One line of the settings panel. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-right text-[13px] font-medium text-slate-800">
        {children}
      </dd>
    </div>
  );
}

export default function WhatsAppOfficialPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [token, setToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [template, setTemplate] = useState("ah_login_code");
  const [hourlyCap, setHourlyCap] = useState("");
  const [dailyCap, setDailyCap] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [displayName, setDisplayName] = useState("AdmissionHands");
  const [smsCode, setSmsCode] = useState("");
  const [pin, setPin] = useState("");
  const [testNumber, setTestNumber] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp-cloud", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load.");
      setConfig(json.config);
      setStatus(json.status);
      setWabaId(json.config.wabaId);
      setPhoneNumberId(json.config.phoneNumberId);
      setTemplate(json.config.template);
      setHourlyCap(String(json.config.caps?.hour ?? ""));
      setDailyCap(String(json.config.caps?.day ?? ""));
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, extra: Record<string, unknown> = {}, ok = "Done.") {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/whatsapp-cloud", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Meta refused that.");
      setMsg({ kind: "ok", text: typeof ok === "string" ? ok : "Done." });
      if (action === "save") setToken("");
      if (action === "test" && json.code) setMsg({ kind: "ok", text: `Sent. The code in that WhatsApp should read ${json.code}.` });
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const phone = status?.phones.find((p) => p.id === config?.phoneNumberId) ?? status?.phones[0];
  const templateApproved = status?.template?.status === "APPROVED";
  const numberReady = Boolean(phone && phone.code_verification_status === "VERIFIED");

  const step1Done = Boolean(config?.tokenMasked && status?.account);
  const stepsDone = [step1Done, numberReady, templateApproved, Boolean(config?.enabled)].filter(Boolean).length;
  /** The spinner on a button, only on the one that was pressed. */
  const spin = (action: string) => busy === action && <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div>
      <PageHeader
        title="WhatsApp official API"
        description={
          <>
            Sign-in codes through Meta&rsquo;s Cloud API — the approved way to send an OTP, about ₹0.145 each. While this
            is off, sign-in asks visitors to message us the code instead.
          </>
        }
        actions={
          <Button onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {loading && !config && !msg ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ---- what is set now: first on a phone, beside the steps on a wide screen ---- */}
          <aside className="min-w-0 space-y-4 xl:order-2">
            <Card title="Current settings" description={`${stepsDone} of 4 setup steps done`}>
              <dl className="-my-2.5 divide-y divide-slate-100">
                <Row label="Sign-in through Meta">
                  {config?.enabled ? <Badge tone="success">On</Badge> : <Badge tone="neutral">Off</Badge>}
                </Row>
                <Row label="Access token">
                  {config?.tokenMasked ? (
                    <span className="font-mono">{config.tokenMasked}</span>
                  ) : (
                    <Badge tone="warning">Not saved</Badge>
                  )}
                </Row>
                <Row label="Business account">
                  {status?.account?.name ? (
                    <span>{status.account.name}</span>
                  ) : config?.wabaId ? (
                    <span className="font-mono">{config.wabaId}</span>
                  ) : (
                    <span className="text-slate-400">Not set</span>
                  )}
                </Row>
                <Row label="Phone number">
                  {phone ? (
                    <>
                      <span className="font-mono">{phone.display_phone_number ?? phone.id}</span>
                      {phone.code_verification_status && (
                        <Badge tone={verifyTone(phone.code_verification_status)}>
                          {phone.code_verification_status === "VERIFIED" ? "Verified" : phone.code_verification_status}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">None yet</span>
                  )}
                </Row>
                {phone?.quality_rating && (
                  <Row label="Quality">
                    <Badge tone={qualityTone(phone.quality_rating)}>{phone.quality_rating}</Badge>
                  </Row>
                )}
                <Row label="Template">
                  <span className="font-mono">{config?.template || "—"}</span>
                  <Badge tone={templateTone(status?.template?.status)}>{status?.template?.status ?? "not created"}</Badge>
                </Row>
                <Row label="Limits, whole site">
                  <span className="tabular-nums">
                    {config?.caps ? `${config.caps.hour} an hour · ${config.caps.day} a day` : "—"}
                  </span>
                </Row>
              </dl>
            </Card>

            {msg && (
              <div role={msg.kind === "ok" ? "status" : undefined}>
                <Notice
                  tone={msg.kind === "ok" ? "success" : "danger"}
                  icon={msg.kind === "ok" ? Check : AlertTriangle}
                  action={
                    msg.kind === "err" && !config ? (
                      <Button size="sm" onClick={load}>
                        Retry
                      </Button>
                    ) : undefined
                  }
                >
                  {msg.text}
                </Notice>
              </div>
            )}

            {status?.errors?.length ? (
              <Notice tone="warning" icon={AlertTriangle} title="Meta says">
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {status.errors.map((e) => (
                    <li key={e} className="break-words">
                      {e}
                    </li>
                  ))}
                </ul>
              </Notice>
            ) : null}
          </aside>

          {/* ---- the five steps ---- */}
          <div className="min-w-0 space-y-5 xl:order-1">
            <Step n={1} title="Access token and account" done={step1Done}>
              <p className="text-sm leading-relaxed text-slate-600">
                Meta Business settings → System users → Generate token, with <b>whatsapp_business_management</b> and{" "}
                <b>whatsapp_business_messaging</b>, never expiring. The account ID is under WhatsApp Manager → Account tools.
                {status?.account?.name ? (
                  <>
                    {" "}
                    Connected to <b>{status.account.name}</b>.
                  </>
                ) : null}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  className="sm:col-span-2"
                  htmlFor="wa-cloud-token"
                  label={
                    <>
                      Access token{" "}
                      {config?.tokenMasked ? <span className="font-normal text-slate-500">(saved: {config.tokenMasked})</span> : null}
                    </>
                  }
                >
                  <input
                    id="wa-cloud-token"
                    type="password"
                    // Chrome ignores "off" on a password field and fills in the saved
                    // admin password — which Save would then store as the Meta token.
                    autoComplete="new-password"
                    name="meta-system-user-token"
                    data-1p-ignore
                    data-lpignore="true"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className={input}
                    placeholder={config?.tokenMasked ? "Leave blank to keep the saved token" : "Paste the system user token"}
                  />
                </Field>
                <Field label="WhatsApp Business Account ID" htmlFor="wa-cloud-waba">
                  <input id="wa-cloud-waba" value={wabaId} onChange={(e) => setWabaId(e.target.value)} className={`${input} font-mono`} inputMode="numeric" />
                </Field>
                <Field
                  label={
                    <>
                      Phone number ID <span className="font-normal text-slate-500">(filled in by step 2)</span>
                    </>
                  }
                  htmlFor="wa-cloud-phone-id"
                >
                  <input id="wa-cloud-phone-id" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} className={`${input} font-mono`} inputMode="numeric" />
                </Field>
                <Field label="Template name" htmlFor="wa-cloud-template">
                  <input id="wa-cloud-template" value={template} onChange={(e) => setTemplate(e.target.value)} className={`${input} font-mono`} />
                </Field>
                <div className="hidden sm:block" aria-hidden="true" />
                <Field label="Most codes in an hour, whole site" htmlFor="wa-cloud-hour">
                  <input id="wa-cloud-hour" value={hourlyCap} onChange={(e) => setHourlyCap(e.target.value)} className={`${input} tabular-nums`} inputMode="numeric" />
                </Field>
                <Field label="Most codes in a day, whole site" htmlFor="wa-cloud-day">
                  <input id="wa-cloud-day" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} className={`${input} tabular-nums`} inputMode="numeric" />
                </Field>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Every official code is billed. Past either limit, sign-in switches to the free path (the visitor messages us)
                until the hour or day rolls over, and the error log says so.
              </p>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <Button
                  variant="primary"
                  disabled={busy !== null}
                  onClick={() => act("save", { token, wabaId, phoneNumberId, template, hourlyCap, dailyCap }, "Saved.")}
                >
                  {spin("save")} Save
                </Button>
              </div>
            </Step>

            <Step n={2} title="The phone number" done={numberReady}>
              <div className="space-y-5">
                {status?.phones.length ? (
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {status.phones.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                        <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0">
                          <span className="block font-mono text-sm font-semibold text-slate-900">{p.display_phone_number}</span>
                          <span className="block text-xs text-slate-500">
                            {p.verified_name} · <span className="font-mono">ID {p.id}</span>
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                          <Badge tone={verifyTone(p.code_verification_status)}>verification {p.code_verification_status ?? "?"}</Badge>
                          <Badge tone={p.name_status === "APPROVED" ? "success" : "neutral"}>name {p.name_status ?? "?"}</Badge>
                          <Badge tone={qualityTone(p.quality_rating)}>quality {p.quality_rating ?? "?"}</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">
                    A new SIM that has never had WhatsApp on it — not the blocked number, not a counsellor&rsquo;s own.
                  </p>
                )}

                <Part title="Add the number">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <Field label="Mobile number" htmlFor="wa-cloud-new">
                      <input id="wa-cloud-new" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} className={`${input} font-mono`} placeholder="10-digit mobile" inputMode="tel" />
                    </Field>
                    <Field label="Display name" htmlFor="wa-cloud-name">
                      <input id="wa-cloud-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={input} placeholder="Display name" />
                    </Field>
                    <Button disabled={busy !== null} onClick={() => act("add-number", { number: newNumber, displayName }, "Number added.")}>
                      {spin("add-number")} Add number
                    </Button>
                  </div>
                </Part>

                <Part title="Verify the SIM">
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy !== null} onClick={() => act("request-code", { method: "SMS" }, "Code sent to the SIM by SMS.")}>
                      Send SMS code to the SIM
                    </Button>
                    <Button disabled={busy !== null} onClick={() => act("request-code", { method: "VOICE" }, "Meta is calling the SIM.")}>
                      Call the SIM instead
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,20rem)_auto] sm:items-end">
                    <Field label="Code the SIM received" htmlFor="wa-cloud-sms">
                      <input id="wa-cloud-sms" value={smsCode} onChange={(e) => setSmsCode(e.target.value)} className={`${input} font-mono tracking-widest`} placeholder="Code the SIM received" inputMode="numeric" />
                    </Field>
                    <Button className="justify-self-start" disabled={busy !== null} onClick={() => act("verify-code", { code: smsCode }, "Number verified.")}>
                      {spin("verify-code")} Verify
                    </Button>
                  </div>
                </Part>

                <Part title="Register for the Cloud API">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,20rem)_auto] sm:items-end">
                    <Field label="Six-digit PIN" htmlFor="wa-cloud-pin">
                      <input id="wa-cloud-pin" value={pin} onChange={(e) => setPin(e.target.value)} className={`${input} font-mono tracking-widest`} placeholder="Choose a 6-digit PIN (write it down)" inputMode="numeric" />
                    </Field>
                    <Button className="justify-self-start" disabled={busy !== null} onClick={() => act("register", { pin }, "Registered for the Cloud API.")}>
                      {spin("register")} Register
                    </Button>
                  </div>
                </Part>
              </div>
            </Step>

            <Step n={3} title="The sign-in template" done={templateApproved}>
              <p className="text-sm leading-relaxed text-slate-600">
                Meta&rsquo;s fixed wording for a code, with a security line, a 10-minute expiry and a Copy code button.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-600">Status:</span>
                <Badge tone={templateTone(status?.template?.status)}>{status?.template?.status ?? "not created"}</Badge>
              </div>
              <div className="mt-4">
                <Button
                  disabled={busy !== null || templateApproved}
                  onClick={() => act("create-template", {}, "Submitted to Meta — authentication templates are usually approved within minutes.")}
                >
                  {spin("create-template")} Create template
                </Button>
              </div>
            </Step>

            <Step n={4} title="Send a test code" done={false} badge={<Badge tone="neutral">Any time</Badge>}>
              <p className="text-sm text-slate-600">To your own WhatsApp. Uses the real path.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,20rem)_auto] sm:items-end">
                <Field label="Your mobile" htmlFor="wa-cloud-test">
                  <input id="wa-cloud-test" value={testNumber} onChange={(e) => setTestNumber(e.target.value)} className={`${input} font-mono`} placeholder="Your 10-digit mobile" inputMode="tel" />
                </Field>
                <Button className="justify-self-start" disabled={busy !== null} onClick={() => act("test", { number: testNumber })}>
                  {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send test
                </Button>
              </div>
            </Step>

            <Step
              n={5}
              title="Use it for sign-in"
              done={Boolean(config?.enabled)}
              badge={config?.enabled ? <Badge tone="success">On</Badge> : <Badge tone="neutral">Off</Badge>}
            >
              <p className="text-sm text-slate-600">
                On: every sign-in code goes through Meta. Off: visitors message us the code instead.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant={config?.enabled ? "secondary" : "primary"}
                  disabled={busy !== null || (!config?.enabled && !(templateApproved && numberReady))}
                  onClick={() => act("enable", { enabled: !config?.enabled }, config?.enabled ? "Switched off." : "Switched on.")}
                >
                  {spin("enable")} {config?.enabled ? "Switch off" : "Switch on"}
                </Button>
                {!config?.enabled && !(templateApproved && numberReady) && (
                  <p className="text-xs text-slate-500">Needs a verified number (step 2) and an approved template (step 3).</p>
                )}
              </div>
            </Step>
          </div>
        </div>
      )}
    </div>
  );
}
