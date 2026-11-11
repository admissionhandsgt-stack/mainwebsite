import { NextResponse } from "next/server";
import { clientIp } from "@/lib/clientIp";
import { bridgeOpenTo, openRequest, runOcr, sealResponse } from "@/lib/ocrBridge";
import { logError } from "@/lib/logger";

/**
 * The OCR bridge for the AH tool (lib/ocrBridge.ts). To anyone else it is not there: every method, every address not
 * on the list and every request not sealed with the shared key gets the same bare 404. Nothing about the document or its
 * text is logged.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const nothing = () => new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  if (!(await bridgeOpenTo(clientIp(request)).catch(() => false))) return nothing();
  const opened = await openRequest(await request.json().catch(() => null)).catch(() => null);
  if (!opened) return nothing();
  try {
    const out = await runOcr(opened.payload);
    return NextResponse.json(await sealResponse(opened.nonce, out.body), { status: out.status, headers: { "cache-control": "no-store" } });
  } catch (error) {
    // The error's name only: a message could quote the document.
    logError(new Error(`ocr bridge failed: ${(error as Error)?.name ?? "error"}`), { route: "bridge/ocr" });
    return NextResponse.json(await sealResponse(opened.nonce, { ok: false, error: "Vision is not reachable" }), { status: 503 });
  }
}

export const GET = nothing;
export const HEAD = nothing;
export const PUT = nothing;
export const PATCH = nothing;
export const DELETE = nothing;
export const OPTIONS = nothing;
