import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getIntegration } from "@/lib/integrations";
import { DRIVE_SCOPE, driveRedirectUri } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Starts the Google consent flow.
 *
 * `access_type=offline` with `prompt=consent` is what produces a refresh
 * token. Google only issues one on the *first* consent unless consent is asked
 * for again — so an operator reconnecting after a revoke would otherwise get
 * an access token that dies in an hour and no way to renew it.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const clientId = await getIntegration("google.drive.client_id");
  if (!clientId) {
    return NextResponse.json(
      { error: "Add the Google client ID and secret first." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: driveRedirectUri(request),
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    { status: 302 },
  );
}
