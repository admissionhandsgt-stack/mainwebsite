import { getDataset, SITE, type Cell } from "@/lib/openData";

/**
 * /embed/<id> — an open dataset as a small, script-free HTML table that any
 * site can put in an iframe (lib/openData.ts; the embed code on /data pairs it
 * with a plain source link outside the frame — that link is the one that
 * counts).
 *
 * Framing is allowed here and nowhere else: next.config.mjs gives /embed/* its
 * own CSP (frame-ancestors *, no scripts at all) instead of the site's
 * frame-ancestors 'none' + X-Frame-Options DENY. noindex, so a widget never
 * ranks against the page it summarises.
 */
export const revalidate = 3600;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const fmt = (v: Cell, column: string) => {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return (column.includes("₹") ? "₹" : "") + v.toLocaleString("en-IN");
  return esc(String(v));
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const d = await getDataset(params.id);
  if (!d) return new Response("Not found", { status: 404 });
  const limitParam = Number(new URL(request.url).searchParams.get("rows"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : d.embedRows;
  const rows = d.rows.slice(0, limit);
  const more = d.rows.length - rows.length;
  const page = `${SITE}${d.page}`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title)} — AdmissionHands</title><link rel="canonical" href="${page}"><meta name="robots" content="noindex">
<style>
:root{color-scheme:light dark}*{box-sizing:border-box}
body{margin:0;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a;background:#fff}
@media (prefers-color-scheme:dark){body{color:#e2e8f0;background:#0b1220}th{background:#111a2e!important}td,th{border-color:#1e293b!important}.src{color:#94a3b8!important}}
.w{padding:14px}h1{font-size:15px;margin:0 0 4px}p.d{margin:0 0 10px;color:#64748b;font-size:12.5px}
.t{overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px}table{border-collapse:collapse;width:100%;min-width:420px}
th,td{padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
th:first-child,td:first-child{text-align:left;white-space:normal}th{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#64748b;background:#f8fafc}
tr:last-child td{border-bottom:0}.src{margin-top:10px;font-size:12px;color:#475569}a{color:#0891b2;font-weight:600}
</style></head><body><div class="w">
<h1>${esc(d.title)}</h1><p class="d">${esc(d.description)}</p>
<div class="t"><table><thead><tr>${d.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
${rows.map((r) => `<tr>${r.map((v, i) => `<td>${fmt(v, d.columns[i])}</td>`).join("")}</tr>`).join("\n")}
</tbody></table></div>
<p class="src">${more > 0 ? `${more} more on <a href="${page}" target="_blank" rel="noopener">AdmissionHands</a>. ` : ""}Source: ${esc(d.source)} · <a href="${page}" target="_blank" rel="noopener">AdmissionHands</a></p>
</div></body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
      "x-robots-tag": "noindex",
    },
  });
}
