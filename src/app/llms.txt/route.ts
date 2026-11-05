import { llmsText, LLMS_FALLBACK } from "@/lib/llmsText";
import { logError } from "@/lib/logger";

/**
 * /llms.txt — the plain-text map of the site that AI assistants and agents read (llmstxt.org), built from live
 * data. The text is lib/llmsText.ts, shared with /llms-full.txt.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return new Response(await llmsText(false), {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    logError(error, { route: "llms.txt" });
    return new Response(LLMS_FALLBACK, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
    });
  }
}
