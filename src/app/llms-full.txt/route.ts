import { llmsText, LLMS_FALLBACK } from "@/lib/llmsText";
import { logError } from "@/lib/logger";

/**
 * /llms-full.txt — /llms.txt plus every MBBS college (NMC's seats and ownership) and every MD/MS college, each
 * linked to its page, so an assistant answering "<college> mbbs seats" or "<college> pg fees" can cite the page.
 * No college's closing rank (the chance-view rule).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return new Response(await llmsText(true), {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    logError(error, { route: "llms-full.txt" });
    return new Response(LLMS_FALLBACK, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
    });
  }
}
