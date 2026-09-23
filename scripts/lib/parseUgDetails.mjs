/**
 * Parses one saved college detail page.
 *
 * Each page carries:
 *   - a "Cutoff UG <year>" table: level, course, quota, category, counselling,
 *     round, score, closing rank. This is the richest cutoff source in the
 *     scrape — far more rows than the list pages.
 *   - one or more "College Fee" tables, each a year-by-year fee schedule.
 *     The page does not label which quota a fee block belongs to, so that
 *     attribution is genuinely unrecoverable from this source.
 *   - a "College health report" table (beds, IPD, OPD).
 *
 * As with the list pages, hidden columns are commented out rather than removed,
 * so comments are stripped before the cells are read.
 */

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

const blank = (v) => {
  const s = String(v ?? "").trim();
  return s === "" || s === "-" || s === "--" || s === "---" || s === "N/A" || s === "NA";
};

const num = (v) => {
  if (blank(v)) return null;
  const n = Number(String(v).replace(/[,\s₹]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Rows of one table, as arrays of trimmed cell text. */
function tableRows(tableHtml) {
  const trs = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  return trs
    .map((tr) =>
      (tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? []).map((c) =>
        text(c.replace(/^<t[dh][^>]*>/i, "").replace(/<\/t[dh]>$/i, "")),
      ),
    )
    .filter((cells) => cells.length > 0);
}

export function parseDetailPage(html, collegeId) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<!--[\s\S]*$/, "");

  // The page header is the only place the college's own facts live:
  //   <h1><span>Name</span></h1>
  //   <h4>… map-marker icon … STATE</h4>
  //   <h4>Establishment Year : 1956</h4>
  const name = text((clean.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? [])[1] ?? "");
  const state = text(
    (clean.match(/<h4[^>]*>\s*<i[^>]*fa-map-marker[^>]*>\s*<\/i>([\s\S]*?)<\/h4>/i) ?? [])[1] ?? "",
  );
  const established = Number(
    (clean.match(/Establishment\s*Year\s*:\s*(\d{4})/i) ?? [])[1] ?? "",
  ) || null;

  const cutoffs = [];
  const fees = [];
  let health = null;

  const tableRe = /<table[\s\S]*?<\/table>/gi;
  let m;
  while ((m = tableRe.exec(clean)) !== null) {
    const rows = tableRows(m[0]);
    if (rows.length < 2) continue;

    const header = rows[0].map((h) => h.toLowerCase());
    // The heading sits just before the table and carries the year.
    const lead = text(clean.slice(Math.max(0, m.index - 300), m.index));

    // --- cutoff table ---
    if (header.includes("cutoff") && header.includes("category")) {
      const col = (n) => header.indexOf(n);
      const yearMatch = lead.match(/Cutoff\s+UG\s+(\d{4})/i);
      const year = yearMatch ? Number(yearMatch[1]) : null;

      for (const cells of rows.slice(1)) {
        if (cells.length !== header.length) continue;
        const closing = num(cells[col("cutoff")]);
        if (closing === null) continue;
        cutoffs.push({
          collegeId,
          year,
          level: cells[col("level")] ?? "",
          course: cells[col("course")] ?? "",
          quota: cells[col("quota")] ?? "",
          category: cells[col("category")] ?? "",
          counselling: cells[col("counselling")] ?? "",
          round: cells[col("round")] ?? "",
          score: num(cells[col("score")]),
          closingRank: closing,
        });
      }
      continue;
    }

    // --- fee table ---
    if (rows[0][0] && rows[0][0].toLowerCase().includes("college fee")) {
      // Each block is its own schedule; the block index is all that separates
      // them, since the page never says which quota a block belongs to.
      const block = fees.length ? Math.max(...fees.map((f) => f.block)) + 1 : 0;
      for (const cells of rows.slice(1)) {
        if (cells.length < 2) continue;
        const amount = num(cells[1]);
        if (amount === null) continue;
        fees.push({ collegeId, block, item: cells[0], amount });
      }
      continue;
    }

    // --- health report ---
    if (rows[0][0] && /total beds/i.test(rows[0][0])) {
      health = {};
      for (const cells of rows) {
        if (cells.length >= 2) health[cells[0]] = cells[1];
      }
    }
  }

  return { collegeId, name, state, established, cutoffs, fees, health };
}
