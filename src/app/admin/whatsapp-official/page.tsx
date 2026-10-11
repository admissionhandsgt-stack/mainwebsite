"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw } from "lucide-react";

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

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
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

const input = "h-11 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
const button = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60";
const ghost = "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60";

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

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Official API</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign-in codes through Meta&rsquo;s Cloud API — the approved way to send an OTP, about ₹0.145 each. While this
            is off, sign-in asks visitors to message us the code instead.
          </p>
        </div>
        <button type="button" onClick={load} className={ghost} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {msg && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
        >
          {msg.text}
        </p>
      )}

      {status?.errors?.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Meta says
          </p>
          <ul className="mt-1 list-disc pl-5">
            {status.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Step n={1} title="Access token and account" done={Boolean(config?.tokenMasked && status?.account)}>
        <p className="mb-3 text-sm text-gray-600">
          Meta Business settings → System users → Generate token, with <b>whatsapp_business_management</b> and{" "}
          <b>whatsapp_business_messaging</b>, never expiring. The account ID is under WhatsApp Manager → Account tools.
          {status?.account?.name ? (
            <>
              {" "}
              Connected to <b>{status.account.name}</b>.
            </>
          ) : null}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-800 md:col-span-2">
            Access token {config?.tokenMasked ? <span className="font-normal text-gray-500">(saved: {config.tokenMasked})</span> : null}
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={`${input} mt-1`}
              placeholder={config?.tokenMasked ? "Leave blank to keep the saved token" : "Paste the system user token"}
            />
          </label>
          <label className="block text-sm font-medium text-gray-800">
            WhatsApp Business Account ID
            <input value={wabaId} onChange={(e) => setWabaId(e.target.value)} className={`${input} mt-1`} inputMode="numeric" />
          </label>
          <label className="block text-sm font-medium text-gray-800">
            Phone number ID <span className="font-normal text-gray-500">(filled in by step 2)</span>
            <input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} className={`${input} mt-1`} inputMode="numeric" />
          </label>
          <label className="block text-sm font-medium text-gray-800">
            Template name
            <input value={template} onChange={(e) => setTemplate(e.target.value)} className={`${input} mt-1`} />
          </label>
        </div>
        <button
          type="button"
          className={`${button} mt-4`}
          disabled={busy !== null}
          onClick={() => act("save", { token, wabaId, phoneNumberId, template }, "Saved.")}
        >
          {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </Step>

      <Step n={2} title="The phone number" done={numberReady}>
        {status?.phones.length ? (
          <ul className="mb-4 space-y-1 text-sm text-gray-700">
            {status.phones.map((p) => (
              <li key={p.id}>
                <b>{p.display_phone_number}</b> · {p.verified_name} · verification {p.code_verification_status ?? "?"} · name{" "}
                {p.name_status ?? "?"} · quality {p.quality_rating ?? "?"} · <span className="text-gray-500">ID {p.id}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-gray-600">
            A new SIM that has never had WhatsApp on it — not the blocked number, not a counsellor&rsquo;s own.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} className={input} placeholder="10-digit mobile" inputMode="tel" />
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={input} placeholder="Display name" />
          <button type="button" className={ghost} disabled={busy !== null} onClick={() => act("add-number", { number: newNumber, displayName }, "Number added.")}>
            Add number
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={ghost} disabled={busy !== null} onClick={() => act("request-code", { method: "SMS" }, "Code sent to the SIM by SMS.")}>
            Send SMS code to the SIM
          </button>
          <button type="button" className={ghost} disabled={busy !== null} onClick={() => act("request-code", { method: "VOICE" }, "Meta is calling the SIM.")}>
            Call the SIM instead
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={smsCode} onChange={(e) => setSmsCode(e.target.value)} className={input} placeholder="Code the SIM received" inputMode="numeric" />
          <button type="button" className={ghost} disabled={busy !== null} onClick={() => act("verify-code", { code: smsCode }, "Number verified.")}>
            Verify
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={pin} onChange={(e) => setPin(e.target.value)} className={input} placeholder="Choose a 6-digit PIN (write it down)" inputMode="numeric" />
          <button type="button" className={ghost} disabled={busy !== null} onClick={() => act("register", { pin }, "Registered for the Cloud API.")}>
            Register
          </button>
        </div>
      </Step>

      <Step n={3} title="The sign-in template" done={templateApproved}>
        <p className="mb-3 text-sm text-gray-600">
          Meta&rsquo;s fixed wording for a code, with a security line, a 10-minute expiry and a Copy code button.
          Status: <b>{status?.template?.status ?? "not created"}</b>
        </p>
        <button type="button" className={ghost} disabled={busy !== null || templateApproved} onClick={() => act("create-template", {}, "Submitted to Meta — authentication templates are usually approved within minutes.")}>
          {busy === "create-template" && <Loader2 className="h-4 w-4 animate-spin" />} Create template
        </button>
      </Step>

      <Step n={4} title="Send a test code" done={false}>
        <p className="mb-3 text-sm text-gray-600">To your own WhatsApp. Uses the real path.</p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={testNumber} onChange={(e) => setTestNumber(e.target.value)} className={input} placeholder="Your 10-digit mobile" inputMode="tel" />
          <button type="button" className={ghost} disabled={busy !== null} onClick={() => act("test", { number: testNumber })}>
            Send test
          </button>
        </div>
      </Step>

      <Step n={5} title="Use it for sign-in" done={Boolean(config?.enabled)}>
        <p className="mb-3 text-sm text-gray-600">
          On: every sign-in code goes through Meta. Off: visitors message us the code instead.
        </p>
        <button
          type="button"
          className={config?.enabled ? ghost : button}
          disabled={busy !== null || (!config?.enabled && !(templateApproved && numberReady))}
          onClick={() => act("enable", { enabled: !config?.enabled }, config?.enabled ? "Switched off." : "Switched on.")}
        >
          {config?.enabled ? "Switch off" : "Switch on"}
        </button>
        {!config?.enabled && !(templateApproved && numberReady) && (
          <p className="mt-2 text-xs text-gray-500">Needs a verified number (step 2) and an approved template (step 3).</p>
        )}
      </Step>
    </div>
  );
}
