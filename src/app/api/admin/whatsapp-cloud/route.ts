import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getIntegration, getIntegrationFlag, maskSecret, setIntegration } from "@/lib/integrations";
import {
  DEFAULT_TEMPLATE,
  addPhoneNumber,
  cloudConfig,
  cloudStatus,
  createAuthTemplate,
  graphError,
  registerPhone,
  requestPhoneCode,
  sendCloudCode,
  verifyPhoneCode,
} from "@/lib/waCloud";
import { checkIndianMobile } from "@/lib/phone";
import { logError } from "@/lib/logger";

/**
 * Admin → WhatsApp Official API. Everything the Cloud API needs, behind the
 * admin session: the token (stored as a secret, shown masked, never returned),
 * the account and number IDs, the sign-in template, adding and verifying the
 * phone number, a test send, and the switch that puts it in front of sign-in.
 */
export const dynamic = "force-dynamic";

const digitsOnly = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const c = await cloudConfig();
  const config = {
    enabled: await getIntegrationFlag("whatsapp.cloud.enabled"),
    tokenMasked: maskSecret(await getIntegration("whatsapp.cloud.token")),
    wabaId: (await getIntegration("whatsapp.cloud.waba_id")) ?? "",
    phoneNumberId: (await getIntegration("whatsapp.cloud.phone_number_id")) ?? "",
    template: (await getIntegration("whatsapp.cloud.template")) ?? DEFAULT_TEMPLATE,
  };
  const status = c ? await cloudStatus(c) : null;
  return NextResponse.json({ config, status });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const action = String(body.action ?? "");

  try {
    if (action === "save") {
      // A blank token field means "keep the one saved" — the form shows a mask.
      const token = String(body.token ?? "").trim();
      if (token) await setIntegration("whatsapp.cloud.token", token, true);
      const waba = digitsOnly(body.wabaId);
      const phoneId = digitsOnly(body.phoneNumberId);
      await setIntegration("whatsapp.cloud.waba_id", waba);
      await setIntegration("whatsapp.cloud.phone_number_id", phoneId);
      const template = String(body.template ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") || DEFAULT_TEMPLATE;
      await setIntegration("whatsapp.cloud.template", template);
      return NextResponse.json({ ok: true });
    }

    if (action === "enable") {
      await setIntegration("whatsapp.cloud.enabled", body.enabled ? "true" : "false");
      return NextResponse.json({ ok: true });
    }

    const c = await cloudConfig();
    if (!c) return NextResponse.json({ error: "Save the access token first." }, { status: 400 });

    if (action === "create-template") {
      if (!c.wabaId) return NextResponse.json({ error: "Add the WhatsApp Business Account ID first." }, { status: 400 });
      const r = await createAuthTemplate(c);
      if (!r.ok) return NextResponse.json({ error: graphError(r) }, { status: 502 });
      return NextResponse.json({ ok: true, result: r.body });
    }

    if (action === "add-number") {
      if (!c.wabaId) return NextResponse.json({ error: "Add the WhatsApp Business Account ID first." }, { status: 400 });
      const check = checkIndianMobile(body.number);
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      const name = String(body.displayName ?? "AdmissionHands").trim().slice(0, 60) || "AdmissionHands";
      const r = await addPhoneNumber(c, check.e164.slice(-10), name);
      if (!r.ok) return NextResponse.json({ error: graphError(r) }, { status: 502 });
      const id = String(r.body.id ?? "");
      if (id) await setIntegration("whatsapp.cloud.phone_number_id", id);
      return NextResponse.json({ ok: true, phoneNumberId: id });
    }

    const phoneId = digitsOnly(body.phoneNumberId) || c.phoneNumberId;
    if (!phoneId && ["request-code", "verify-code", "register"].includes(action)) {
      return NextResponse.json({ error: "No phone number ID yet — add the number first." }, { status: 400 });
    }

    if (action === "request-code") {
      const r = await requestPhoneCode(c, phoneId!, body.method === "VOICE" ? "VOICE" : "SMS");
      if (!r.ok) return NextResponse.json({ error: graphError(r) }, { status: 502 });
      return NextResponse.json({ ok: true });
    }

    if (action === "verify-code") {
      const code = digitsOnly(body.code);
      if (code.length < 4) return NextResponse.json({ error: "Enter the code the SIM received." }, { status: 400 });
      const r = await verifyPhoneCode(c, phoneId!, code);
      if (!r.ok) return NextResponse.json({ error: graphError(r) }, { status: 502 });
      return NextResponse.json({ ok: true });
    }

    if (action === "register") {
      const pin = digitsOnly(body.pin);
      if (pin.length !== 6) return NextResponse.json({ error: "Choose a six-digit PIN and keep it safe." }, { status: 400 });
      const r = await registerPhone(c, phoneId!, pin);
      if (!r.ok) return NextResponse.json({ error: graphError(r) }, { status: 502 });
      return NextResponse.json({ ok: true });
    }

    if (action === "test") {
      // A real code down the real path, to a number the admin types — their own.
      const check = checkIndianMobile(body.number);
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const r = await sendCloudCode(check.e164, code);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
      return NextResponse.json({ ok: true, code, messageId: r.id });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    logError(error, { route: "/api/admin/whatsapp-cloud", request });
    return NextResponse.json({ error: "Something went wrong talking to Meta." }, { status: 500 });
  }
}
