/**
 * Parses the saved UG pages from the authenticated scrape.
 *
 * The raw HTML is the source of truth here, not the CSV or JSON the scraper
 * also wrote: those were keyed from the header row while the body rows carry
 * two extra cells of HTML-comment debris, so every column after the first is
 * shifted by one in them. Stripping comments first makes the cells line up
 * with the header exactly — verified across all 152 pages / 2,332 rows.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const TAG = /<[^>]+>/g;

function text(html) {
  return html
    .replace(TAG, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** A cell that holds no value. The source uses several spellings. */
export function blank(v) {
  const s = String(v ?? "").trim();
  return s === "" || s === "-" || s === "--" || s === "---" || s === "N/A" || s === "NA";
}

/** A rank or seat count. Returns null for any of the blank spellings. */
export function num(v) {
  if (blank(v)) return null;
  const n = Number(String(v).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** A rupee amount. Same blank handling, tolerates "2400000.00" and "12,34,567". */
export function money(v) {
  if (blank(v)) return null;
  const n = Number(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * One saved page, parsed into { headers, rows }.
 *
 * Commenting out a column is how this site hides one: on the rank tables both
 * `State` and `Score 2026(R0)` are commented out in the header *and* in every
 * body row, so stripping comments keeps the two in step. The rank tables
 * therefore carry no state of their own — it comes from the filename.
 *
 * Each row also carries `_collegeId`, read from the institute link. A numeric
 * id is a far safer join key than a college name.
 */
export function parsePage(html) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<!--[\s\S]*$/, "");

  const table = clean.match(/<table[\s\S]*?<\/table>/i);
  if (!table) return { headers: [], rows: [] };

  const trs = table[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const parsed = [];

  for (const tr of trs) {
    const rawCells = tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [];
    if (rawCells.length === 0) continue;

    const cells = rawCells.map((c) =>
      text(c.replace(/^<t[dh][^>]*>/i, "").replace(/<\/t[dh]>$/i, "")),
    );
    const idMatch = tr.match(/college\/details\?id=(\d+)/i);
    parsed.push({ cells, collegeId: idMatch ? Number(idMatch[1]) : null });
  }

  if (parsed.length === 0) return { headers: [], rows: [] };
  return {
    headers: parsed[0].cells,
    rows: parsed.slice(1),
  };
}

/**
 * Every saved page, as records keyed by their own header.
 *
 * The filename carries the three things the table itself does not: which
 * dataset it is, which counselling type, and the site's state id.
 */
export async function readUgPages(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".html")).sort();
  const out = [];

  for (const file of files) {
    const [kind, counsellingType, stateId] = path
      .basename(file, ".html")
      .split("__");

    const { headers, rows } = parsePage(await readFile(path.join(dir, file), "utf8"));
    if (headers.length === 0) continue;

    for (const { cells, collegeId } of rows) {
      // A row that does not match its own header means the parse assumption
      // broke; skipping silently would import shifted data.
      if (cells.length !== headers.length) {
        throw new Error(
          `${file}: row has ${cells.length} cells but the header has ${headers.length}`,
        );
      }
      const rec = {
        _kind: kind,
        _counselling: counsellingType.replace(/-/g, " "),
        _stateId: Number(stateId),
        _collegeId: collegeId,
        _file: file,
      };
      headers.forEach((h, i) => {
        rec[h] = cells[i];
      });
      out.push(rec);
    }
  }

  return out;
}
