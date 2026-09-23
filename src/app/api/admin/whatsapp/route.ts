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
): Promise<{ ok: boolean; status: number; body: unknown; error?: string }> {
  const [base, key] = await Promise.all([
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
  });
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
