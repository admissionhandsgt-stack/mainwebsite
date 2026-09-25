/**
 * Sending a WhatsApp message through our own gateway.
 *
 * One implementation, used by everything that sends: the sign-in code
 * (`otp.ts`) and the alerts the team gets when a lead or a document arrives
 * (`whatsappService.ts`). They had separate copies of this, which is how two
 * senders end up disagreeing about a timeout or a chat-id format.
 *
 * The gateway is WAHA on the VPS, configured from `/admin/whatsapp` and paired
 * to a number that is not the business line. It is reached over localhost, so
 * nothing here crosses the internet except the message itself.
 *
 * **Alerts to the team are a different risk from codes to strangers.** The ban
 * models that make outbound OTP dangerous — every recipient a stranger, nobody
 * ever replies — do not apply to messaging the same two staff numbers all day.
 * That traffic looks like an ordinary conversation, which is why the caps in
 * `otp.ts` live there and not here.
 */

import { getIntegration } from "@/lib/integrations";
import { logError } from "@/lib/logger";

/** The WAHA session name, as the admin screen creates it. */
const SESSION = "default";

const TIMEOUT_MS = 15_000;

export interface GatewayResult {
  sent: boolean;
  /** Why not, for an admin screen to show. Never shown to a visitor. */
  error?: string;
}

/** Whether a gateway address is configured at all. */
export async function gatewayConfigured(): Promise<boolean> {
  return Boolean(await getIntegration("whatsapp.gateway.url"));
}

/**
 * Sends one text message.
 *
 * Returns rather than throws: every caller is doing this alongside something
 * that already succeeded, and a failed notification must never fail the thing
 * it was notifying about.
 */
export async function sendText(phone: string, text: string): Promise<GatewayResult> {
  const [base, key] = await Promise.all([
    getIntegration("whatsapp.gateway.url"),
    getIntegration("whatsapp.gateway.api_key"),
  ]);
  if (!base) return { sent: false, error: "No gateway address is configured." };

  // WAHA addresses a person as `<digits>@c.us`, with no `+` and with the
  // country code. A ten-digit Indian number needs the 91 putting back.
  const digits = String(phone ?? "").replace(/\D/g, "");
  const full = digits.length === 10 ? `91${digits}` : digits;
  if (full.length < 10) return { sent: false, error: `Not a usable number: ${phone}` };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/sendText`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "X-Api-Key": key } : {}),
      },
      body: JSON.stringify({ session: SESSION, chatId: `${full}@c.us`, text }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      logError(new Error(`WAHA sendText ${res.status}: ${detail}`), { route: "waGateway" });
      return { sent: false, error: `Gateway returned ${res.status}. ${detail}` };
    }
    return { sent: true };
  } catch (error) {
    logError(error, { route: "waGateway" });
    return {
      sent: false,
      error: error instanceof Error ? error.message.slice(0, 200) : "Could not reach the gateway.",
    };
  }
}
