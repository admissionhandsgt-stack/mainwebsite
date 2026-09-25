import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getIntegration, setIntegration, invalidateIntegrations } from "@/lib/integrations";
import {
  resetDriveToken,
  ensureFolder,
  driveRedirectUri,
  ROOT_FOLDER_NAME,
} from "@/lib/googleDrive";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Where Google sends the operator back, with a one-time code.
 *
 * Exchanges it for a refresh token — the long-lived credential that lets the
 * server upload for months without anyone signing in again — and stores it in
 * `integrations`, which is server-only and never reaches a browser.
 *
 * Still behind `requireAdmin`. The code in the URL is single-use and bound to
 * our client secret, so it is not much of a key on its own, but this endpoint
 * *writes a credential* and nothing that does that should be reachable without
 * a session.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const back = new URL("/admin/documents", url.origin);

  const error = url.searchParams.get("error");
  if (error) {
    back.searchParams.set("drive", error === "access_denied" ? "denied" : "error");
    return NextResponse.redirect(back);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    back.searchParams.set("drive", "error");
    return NextResponse.redirect(back);
  }

  try {
    const [clientId, clientSecret] = await Promise.all([
      getIntegration("google.drive.client_id"),
      getIntegration("google.drive.client_secret"),
    ]);
    if (!clientId || !clientSecret) throw new Error("Client credentials are missing.");

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: driveRedirectUri(request),
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${(await res.text()).slice(0, 200)}`);

    const body = (await res.json()) as {
      refresh_token?: string;
      access_token?: string;
      id_token?: string;
    };

    if (!body.refresh_token) {
      // Google withholds it when the account has already consented and the
      // request did not force the prompt. `connect` always does, so this means
      // something else went wrong — and saving an access token alone would
      // produce a connection that silently dies within the hour.
      throw new Error(
        "Google did not return a refresh token. Remove this app from your Google account's " +
          "third-party access list and connect again.",
      );
    }

    await setIntegration("google.drive.refresh_token", body.refresh_token, true);

    // Which account it is, purely so the admin screen can show it. Read from
    // the id_token's payload rather than a second API call.
    if (body.id_token) {
      try {
        const payload = JSON.parse(
          Buffer.from(body.id_token.split(".")[1], "base64url").toString("utf8"),
        ) as { email?: string };
        if (payload.email) await setIntegration("google.drive.account_email", payload.email);
      } catch {
        /* the email is a nicety, not a requirement */
      }
    }

    await setIntegration("google.drive.enabled", "true");
    invalidateIntegrations();
    resetDriveToken();

    // Create the root folder now, so the first candidate upload is not also
    // the first test of whether any of this works.
    const rootId = await ensureFolder(ROOT_FOLDER_NAME);
    await setIntegration("google.drive.root_folder_id", rootId);

    back.searchParams.set("drive", "connected");
    return NextResponse.redirect(back);
  } catch (err) {
    logError(err, { route: "/api/admin/google/callback", request });
    back.searchParams.set("drive", "error");
    back.searchParams.set(
      "message",
      (err instanceof Error ? err.message : "Could not connect.").slice(0, 200),
    );
    return NextResponse.redirect(back);
  }
}
