import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth";
import {
  getIntegration,
  getIntegrationFlag,
  setIntegration,
  envPinnedKeys,
  maskSecret,
} from "@/lib/integrations";
import { sendWhatsAppNotification } from "@/lib/whatsappService";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { listSenders, senderHealth, sentToday, invalidateSenders, type Sender } from "@/lib/waSenders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Everything the WhatsApp verification needs, owned by the admin.
 *
 * The point is that after one person runs the container once, nobody needs a
 * terminal again: the number, the gateway address, the keys and the pairing
 * are all here behind the normal admin login.
 *
 * **What this deliberately cannot do is run the container.** The site runs on
 * Cloudflare Workers — there is no shell and no Docker socket to reach — and
 * an admin screen that could execute commands on the server would be a remote
 * shell with a login form in front of it. Instead the screen *composes* the
 * command, secret already filled in, to be pasted once.
 */

const SESSION = "default";

/** Never let a secret out of here, only whether one is set. */
function publicConfig(values: Record<string, string | null>, enabled: boolean, pinned: string[]) {
  return {
    enabled,
    number: values["whatsapp.verify.number"] ?? "",
    gatewayUrl: values["whatsapp.gateway.url"] ?? "",
    apiKeyMasked: maskSecret(values["whatsapp.gateway.api_key"]),
    apiKeySet: Boolean(values["whatsapp.gateway.api_key"]),
    webhookSecretMasked: maskSecret(values["whatsapp.webhook.secret"]),
    webhookSecretSet: Boolean(values["whatsapp.webhook.secret"]),
    envPinned: pinned,
  };
}

async function readAll() {
  const [enabled, number, gatewayUrl, apiKey, secret, pinned] = await Promise.all([
    getIntegrationFlag("whatsapp.verify.enabled"),
    getIntegration("whatsapp.verify.number"),
    getIntegration("whatsapp.gateway.url"),
    getIntegration("whatsapp.gateway.api_key"),
    getIntegration("whatsapp.webhook.secret"),
    envPinnedKeys(),
  ]);
  return {
    enabled,
    values: {
      "whatsapp.verify.number": number,
      "whatsapp.gateway.url": gatewayUrl,
      "whatsapp.gateway.api_key": apiKey,
      "whatsapp.webhook.secret": secret,
    } as Record<string, string | null>,
    pinned: pinned as string[],
  };
}

/**
 * Calls the gateway.
 *
 * Times out rather than hanging: the usual reason this fails is that WAHA is
 * bound to localhost on the VPS and simply is not reachable from here, and the
 * screen needs to say that quickly rather than spin.
 */
async function waha(
  path: string,
  init: RequestInit = {},
  timeoutMs = 8000,
  via?: { url: string; apiKey: string | null },
): Promise<{ ok: boolean; status: number; body: unknown; error?: string }> {
  const [base, key] = via
    ? [via.url, via.apiKey]
    : await Promise.all([
        getIntegration("whatsapp.gateway.url"),
        getIntegration("whatsapp.gateway.api_key"),
      ]);
  if (!base) return { ok: false, status: 0, body: null, error: "No gateway address saved yet." };

  const url = `${base.replace(/\/+$/, "")}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "X-Api-Key": key } : {}),
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* Some endpoints answer with a plain body; keep the text. */
    }
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: 0,
      body: null,
      error: aborted
        ? `The gateway did not answer in ${Math.round(timeoutMs / 1000)} seconds.`
        : "Could not reach the gateway from the website.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function webhookUrl(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  // The webhook must hit the public site, not the admin subdomain, because
  // that is where the route lives.
  const site = host.replace(/^admin(-uat)?\./, "");
  return `${proto}://${site}/api/whatsapp/inbound`;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { enabled, values, pinned } = await readAll();

  // Only ask the gateway anything if there is somewhere to ask.
  let gateway: Record<string, unknown> = { configured: false };
  if (values["whatsapp.gateway.url"]) {
    const res = await waha(`/api/sessions/${SESSION}`);
    gateway = res.ok
      ? {
          configured: true,
          reachable: true,
          status: (res.body as { status?: string })?.status ?? "UNKNOWN",
          me: (res.body as { me?: { id?: string; pushName?: string } })?.me ?? null,
        }
      : {
          configured: true,
          reachable: false,
          httpStatus: res.status,
          error:
            res.error ??
            (res.status === 401 || res.status === 403
              ? "The gateway rejected the API key."
              : res.status === 404
                ? "No session yet — use Connect to create one."
                : `The gateway answered ${res.status}.`),
        };
  }

  return NextResponse.json({
    config: publicConfig(values, enabled, pinned),
    gateway,
    webhookUrl: webhookUrl(request),
    senders: await describeSenders(),
  });
}

/**
 * Every number, its live state and today's use, for the "Numbers" panel.
 * Keys are masked; the full key never leaves the server.
 */
async function describeSenders() {
  const [senders, counts] = await Promise.all([listSenders(), sentToday()]);
  return Promise.all(
    senders.map(async (s) => {
      const h = await senderHealth(s, true);
      // Learn a backup's number from its session once it is paired.
      if (!s.primary && h.me && h.me !== s.phone) {
        await db.execute(sql`UPDATE wa_senders SET phone = ${h.me}, updated_at = now() WHERE id = ${s.id}`);
        invalidateSenders();
      }
      return {
        id: s.id,
        label: s.label,
        primary: s.primary,
        phone: h.me || s.phone,
        gatewayUrl: s.url,
        apiKeyMasked: maskSecret(s.apiKey),
        enabled: s.enabled,
        priority: s.priority,
        dailyCap: s.dailyCap,
        sentToday: counts.get(s.id) ?? 0,
        health: {
          reachable: h.reachable,
          status: h.status,
          locked: h.locked,
          lockedUntil: h.lockedUntil ? h.lockedUntil.toISOString() : null,
          lockType: h.lockType,
          error: h.error ?? null,
        },
      };
    }),
  );
}

async function backup(id: unknown): Promise<Sender | null> {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return (await listSenders()).find((s) => s.id === n && !s.primary) ?? null;
}

function checkGatewayUrl(raw: unknown): string | null {
  const url = String(raw ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : null;
}

const BAD_URL = "The gateway address must start with http:// or https://";
const NO_SUCH = "No such backup number.";

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
    switch (action) {
      /* ---------------- configuration ---------------- */
      case "save": {
        const digits = String(body.number ?? "").replace(/\D/g, "");
        if (digits && digits.length < 10) {
          return NextResponse.json(
            { error: "Enter the full number including country code, e.g. 919876543210." },
            { status: 400 },
          );
        }
        await setIntegration("whatsapp.verify.number", digits);

        const url = String(body.gatewayUrl ?? "").trim().replace(/\/+$/, "");
        if (url && !/^https?:\/\//i.test(url)) {
          return NextResponse.json(
            { error: "The gateway address must start with http:// or https://" },
            { status: 400 },
          );
        }
        await setIntegration("whatsapp.gateway.url", url);

        // An empty API key field means "leave it alone" — the form shows a
        // mask, so saving without retyping must not erase the real key.
        const apiKey = String(body.apiKey ?? "").trim();
        if (apiKey) await setIntegration("whatsapp.gateway.api_key", apiKey, true);

        await setIntegration("whatsapp.verify.enabled", body.enabled ? "true" : "false");
        return NextResponse.json({ ok: true });
      }

      case "generate-secret": {
        const secret = randomSecret();
        await setIntegration("whatsapp.webhook.secret", secret, true);
        // Returned in full exactly once, because it has to be pasted into the
        // container. Every later read is masked.
        return NextResponse.json({ ok: true, secret });
      }

      /* ---------------- the session ---------------- */
      case "connect": {
        const created = await waha(
          "/api/sessions",
          { method: "POST", body: JSON.stringify({ name: SESSION, start: true }) },
          20000,
        );

        // 422/409 mean it already exists — and by now it is usually FAILED,
        // because an unscanned QR expires. Restart it for a fresh one.
        if (!created.ok) {
          const restarted = await waha(
            `/api/sessions/${SESSION}/restart`,
            { method: "POST" },
            20000,
          );
          if (!restarted.ok) {
            return NextResponse.json(
              {
                error:
                  restarted.error ??
                  `The gateway could not start the session (${restarted.status}).`,
              },
              { status: 502 },
            );
          }
        }

        // The QR is not ready the instant a session starts; the screen asks
        // for it immediately afterwards, so give the engine a moment first.
        await new Promise((r) => setTimeout(r, 3500));
        return NextResponse.json({ ok: true });
      }

      case "qr": {
        /**
         * WAHA answers `?format=image` with a raw PNG, not JSON.
         *
         * The shared `waha()` helper reads every response as text and tries to
         * parse it, which turned the image into mojibake and reported "the
         * gateway returned no QR image" on a perfectly good code. This reads
         * the bytes and encodes them itself.
         */
        const [base, key] = await Promise.all([
          getIntegration("whatsapp.gateway.url"),
          getIntegration("whatsapp.gateway.api_key"),
        ]);
        if (!base) {
          return NextResponse.json({ error: "No gateway address saved yet." }, { status: 400 });
        }

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          const res = await fetch(
            `${base.replace(/\/+$/, "")}/api/${SESSION}/auth/qr?format=image`,
            { signal: controller.signal, headers: key ? { "X-Api-Key": key } : {} },
          );
          clearTimeout(timer);

          if (!res.ok) {
            const detail =
              res.status === 422
                ? "The session is not waiting for a scan. Press Connect again to restart it."
                : `No QR available (${res.status}).`;
            return NextResponse.json({ error: detail }, { status: 502 });
          }

          const bytes = Buffer.from(await res.arrayBuffer());
          if (bytes.length < 100) {
            return NextResponse.json({ error: "The gateway returned an empty QR." }, { status: 502 });
          }
          const mime = res.headers.get("content-type") ?? "image/png";
          return NextResponse.json({
            ok: true,
            image: `data:${mime};base64,${bytes.toString("base64")}`,
          });
        } catch (error) {
          logError(error, { route: "/api/admin/whatsapp:qr" });
          return NextResponse.json(
            { error: "Could not fetch the QR from the gateway." },
            { status: 502 },
          );
        }
      }

      case "pair-code": {
        const digits = String(body.number ?? "").replace(/\D/g, "");
        if (digits.length < 10) {
          return NextResponse.json({ error: "Enter the number to pair." }, { status: 400 });
        }
        const res = await waha(`/api/${SESSION}/auth/request-code`, {
          method: "POST",
          body: JSON.stringify({ phoneNumber: digits }),
        });
        if (!res.ok) {
          return NextResponse.json(
            { error: res.error ?? `The gateway answered ${res.status}.` },
            { status: 502 },
          );
        }
        const code = (res.body as { code?: string })?.code ?? null;
        return NextResponse.json({ ok: true, code });
      }

      /**
       * Prove the alerts actually arrive.
       *
       * Sends a real message down the real path — the same function a lead
       * form calls, to the same number the alerts go to. A test that mocks
       * anything would not have caught the bug this was written for: alerts
       * had been failing silently since go-live because the credentials the
       * old providers needed were never set, and nobody found out until
       * somebody asked where the notifications were going.
       */
      case "test-alert": {
        const delivered = await sendWhatsAppNotification({
          name: "Test enquiry",
          phone: "+910000000000",
          rank: 12345,
          preferred_branch: "MD Radiology",
          source: "Test from Admin → WhatsApp",
        });
        return delivered
          ? NextResponse.json({ ok: true })
          : NextResponse.json(
              {
                error:
                  "Nothing was delivered. Check the gateway is connected above, and that a lead " +
                  "alert number is set under Contacts.",
              },
              { status: 502 },
            );
      }

      /* ---------------- backup numbers ---------------- */
      case "sender-add": {
        const label = String(body.label ?? "").trim().slice(0, 60) || "Backup";
        const url = checkGatewayUrl(body.gatewayUrl);
        if (!url) return NextResponse.json({ error: BAD_URL }, { status: 400 });
        const apiKey = String(body.apiKey ?? "").trim() || null;
        const cap = Math.min(500, Math.max(0, Math.round(Number(body.dailyCap ?? 40)) || 40));
        const priority = Math.round(Number(body.priority ?? 100)) || 100;
        await db.execute(sql`
          INSERT INTO wa_senders (label, gateway_url, api_key, daily_cap, priority)
          VALUES (${label}, ${url}, ${apiKey}, ${cap}, ${priority})
        `);
        invalidateSenders();
        return NextResponse.json({ ok: true });
      }

      case "sender-update": {
        const s = await backup(body.id);
        if (!s) return NextResponse.json({ error: NO_SUCH }, { status: 404 });
        const url = body.gatewayUrl !== undefined ? checkGatewayUrl(body.gatewayUrl) : s.url;
        if (!url) return NextResponse.json({ error: BAD_URL }, { status: 400 });
        const label = body.label !== undefined ? String(body.label).trim().slice(0, 60) || s.label : s.label;
        // Blank means "leave the key alone": the form shows a mask.
        const apiKey = String(body.apiKey ?? "").trim() || s.apiKey;
        const enabled = body.enabled !== undefined ? Boolean(body.enabled) : s.enabled;
        const cap = body.dailyCap !== undefined ? Math.min(500, Math.max(0, Math.round(Number(body.dailyCap)) || 0)) : s.dailyCap;
        const priority = body.priority !== undefined ? Math.round(Number(body.priority)) || 100 : s.priority;
        await db.execute(sql`
          UPDATE wa_senders SET label = ${label}, gateway_url = ${url}, api_key = ${apiKey},
                 enabled = ${enabled}, daily_cap = ${cap}, priority = ${priority}, updated_at = now()
           WHERE id = ${s.id}
        `);
        invalidateSenders();
        return NextResponse.json({ ok: true });
      }

      case "sender-remove": {
        const s = await backup(body.id);
        if (!s) return NextResponse.json({ error: NO_SUCH }, { status: 404 });
        await db.execute(sql`DELETE FROM wa_senders WHERE id = ${s.id}`);
        invalidateSenders();
        return NextResponse.json({ ok: true });
      }

      case "sender-connect": {
        const s = await backup(body.id);
        if (!s) return NextResponse.json({ error: NO_SUCH }, { status: 404 });
        const via = { url: s.url, apiKey: s.apiKey };
        const created = await waha("/api/sessions", { method: "POST", body: JSON.stringify({ name: s.session, start: true }) }, 20000, via);
        if (!created.ok) {
          const restarted = await waha(`/api/sessions/${s.session}/restart`, { method: "POST" }, 20000, via);
          if (!restarted.ok) {
            return NextResponse.json(
              { error: restarted.error ?? `That gateway could not start the session (${restarted.status}).` },
              { status: 502 },
            );
          }
        }
        await new Promise((r) => setTimeout(r, 3500));
        return NextResponse.json({ ok: true });
      }

      case "sender-pair-code": {
        const s = await backup(body.id);
        if (!s) return NextResponse.json({ error: NO_SUCH }, { status: 404 });
        const digits = String(body.number ?? "").replace(/\D/g, "");
        if (digits.length < 10) {
          return NextResponse.json({ error: "Enter the number to pair, with the country code." }, { status: 400 });
        }
        const res = await waha(
          `/api/${s.session}/auth/request-code`,
          { method: "POST", body: JSON.stringify({ phoneNumber: digits }) },
          15000,
          { url: s.url, apiKey: s.apiKey },
        );
        if (!res.ok) return NextResponse.json({ error: res.error ?? `The gateway answered ${res.status}.` }, { status: 502 });
        return NextResponse.json({ ok: true, code: (res.body as { code?: string })?.code ?? null });
      }

      case "sender-logout": {
        const s = await backup(body.id);
        if (!s) return NextResponse.json({ error: NO_SUCH }, { status: 404 });
        const res = await waha(`/api/sessions/${s.session}/logout`, { method: "POST" }, 8000, { url: s.url, apiKey: s.apiKey });
        if (!res.ok) return NextResponse.json({ error: res.error ?? `The gateway answered ${res.status}.` }, { status: 502 });
        invalidateSenders();
        return NextResponse.json({ ok: true });
      }

      case "logout": {
        const res = await waha(`/api/sessions/${SESSION}/logout`, { method: "POST" });
        if (!res.ok) {
          return NextResponse.json(
            { error: res.error ?? `The gateway answered ${res.status}.` },
            { status: 502 },
          );
        }
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    logError(error, { route: "/api/admin/whatsapp", request });
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
