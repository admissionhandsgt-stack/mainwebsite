import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getIntegration, getIntegrationFlag, maskSecret, setIntegration } from "@/lib/integrations";
import { decideNotice, noticeList, runZynNotices, testZynEndpoint } from "@/lib/zynNotices";
import { logError } from "@/lib/logger";

/**
 * Admin → Notices (Zyn). GET: the settings (the key masked), the last run and the notices taken.
 * POST { action }: "save" { url?, key?, enabled? } · "test" · "run" · "publish" | "dismiss" | "apply-schedule" { id }.
 * The key is write-only: it is saved, never sent back.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  const [url, key, enabled, cursor, last, notices] = await Promise.all([
    getIntegration("zyn.notices.url"),
    getIntegration("zyn.notices.key"),
    getIntegrationFlag("zyn.notices.enabled"),
    getIntegration("zyn.notices.cursor"),
    getIntegration("zyn.notices.last"),
    noticeList(),
  ]);
  let lastRun: unknown = null;
  try {
    lastRun = last ? JSON.parse(last) : null;
  } catch {
    lastRun = null;
  }
  return NextResponse.json(
    { url: url ?? "", keySet: Boolean(key), keyMasked: maskSecret(key), enabled, cursor, lastRun, notices },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    switch (body.action) {
      case "save": {
        if (typeof body.url === "string") {
          const url = body.url.trim();
          if (url && !/^https:\/\/[^\s]+$/i.test(url)) return NextResponse.json({ error: "The endpoint must be an https:// address." }, { status: 400 });
          await setIntegration("zyn.notices.url", url);
        }
        if (typeof body.key === "string" && body.key.trim()) {
          const key = body.key.trim();
          if (key.length < 16 || key.length > 512 || /\s/.test(key)) return NextResponse.json({ error: "That does not look like a key." }, { status: 400 });
          await setIntegration("zyn.notices.key", key, true);
        }
        if (typeof body.enabled === "boolean") await setIntegration("zyn.notices.enabled", body.enabled ? "true" : "false");
        return NextResponse.json({ ok: true });
      }
      case "test":
        return NextResponse.json(await testZynEndpoint());
      case "run":
        return NextResponse.json(await runZynNotices({ force: true }));
      case "publish":
      case "dismiss":
      case "apply-schedule": {
        const id = typeof body.id === "string" ? body.id.slice(0, 200) : "";
        if (!id) return NextResponse.json({ error: "No notice." }, { status: 400 });
        return NextResponse.json(await decideNotice(id, body.action));
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logError(error, { route: "admin/notices" });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
