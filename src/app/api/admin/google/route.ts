import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getIntegration, setIntegration, invalidateIntegrations } from "@/lib/integrations";
import { driveStatus, resetDriveToken } from "@/lib/googleDrive";
import { syncBacklog } from "@/lib/driveSync";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Connecting, checking and disconnecting Google Drive, from the admin screen.
 *
 * The client ID and secret are typed in here rather than deployed, for the
 * same reason the WhatsApp gateway is: somebody non-technical has to be able
 * to set this up and repair it without a redeploy.
 *
 * The secret is never read back out. `GET` reports whether one is set, never
 * what it is — an admin screen that renders a credential into HTML is one
 * shoulder-surf away from leaking it.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const [status, clientId, clientSecret] = await Promise.all([
      driveStatus(),
      getIntegration("google.drive.client_id"),
      getIntegration("google.drive.client_secret"),
    ]);

    const counts = (await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE drive_file_id IS NOT NULL)::int AS synced,
        count(*) FILTER (WHERE drive_file_id IS NULL)::int     AS pending,
        count(*) FILTER (WHERE drive_error IS NOT NULL)::int   AS failed
      FROM student_documents
    `)) as unknown as { synced: number; pending: number; failed: number }[];

    return NextResponse.json({
      ...status,
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      counts: counts[0] ?? { synced: 0, pending: 0, failed: 0 },
    });
  } catch (error) {
    logError(error, { route: "/api/admin/google:GET" });
    return NextResponse.json({ error: "Could not read the Drive settings." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const clientId = String(body.clientId ?? "").trim();
  const clientSecret = String(body.clientSecret ?? "").trim();

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Both the client ID and secret are needed." }, { status: 400 });
  }
  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    return NextResponse.json(
      { error: "That does not look like a Google client ID — it should end in .apps.googleusercontent.com" },
      { status: 400 },
    );
  }

  try {
    await setIntegration("google.drive.client_id", clientId);
    await setIntegration("google.drive.client_secret", clientSecret, true);
    invalidateIntegrations();
    resetDriveToken();
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error, { route: "/api/admin/google:PUT" });
    return NextResponse.json({ error: "Could not save those credentials." }, { status: 500 });
  }
}

/** Retry whatever has not reached Drive yet. */
export async function POST() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const result = await syncBacklog(100);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logError(error, { route: "/api/admin/google:POST" });
    return NextResponse.json({ error: "Could not run the sync." }, { status: 500 });
  }
}

/**
 * Disconnect.
 *
 * Forgets the refresh token and switches the mirror off. Deliberately does
 * **not** delete anything from Drive: those files are the team's copy, and an
 * operator clicking "disconnect" is changing where new documents go, not
 * asking for the archive to be destroyed.
 */
export async function DELETE() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    await setIntegration("google.drive.refresh_token", "", true);
    await setIntegration("google.drive.enabled", "false");
    await setIntegration("google.drive.account_email", "");
    invalidateIntegrations();
    resetDriveToken();
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error, { route: "/api/admin/google:DELETE" });
    return NextResponse.json({ error: "Could not disconnect." }, { status: 500 });
  }
}
