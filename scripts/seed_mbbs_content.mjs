/**
 * Lifts the MBBS page's content out of src/data/mbbs-india.ts and into the CMS.
 *
 * Reads the shipped data file directly rather than duplicating it here, so the
 * seed cannot drift from what the page renders. The site looks identical
 * afterwards — the copy is simply editable now.
 *
 * Idempotent: a collection that already has rows is left alone.
 *
 * Run: node scripts/seed_mbbs_content.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";
import { readFile } from "node:fs/promises";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

/** The data file is TypeScript, so evaluate just its exported object. */
async function loadMbbsData() {
  const src = await readFile("src/data/mbbs-india.ts", "utf8");
  const body = src
    .replace(/^export const mbbsData = /m, "return ")
    .replace(/ as \{[^}]*\}\[\]/g, "");
  // eslint-disable-next-line no-new-func
  return new Function(body)();
}

const COLLECTIONS = [
  {
    slug: "mbbs_hero_stats",
    label: "MBBS · Hero stats",
    description: "The four numbers in the MBBS page banner.",
    fields: ["title", "subtitle"],
    rows: (d) => d.hero.promisingInfo.map((x) => ({ title: x.label, subtitle: x.value })),
  },
  {
    slug: "mbbs_overview",
    label: "MBBS · Quick overview",
    description: "The stat cards under the hero. Title is the label, subtitle the value, body the small print.",
    fields: ["title", "subtitle", "body"],
    rows: (d) => d.overview.items.map((x) => ({ title: x.label, subtitle: x.value, body: x.detail })),
  },
  {
    slug: "mbbs_process_steps",
    label: "MBBS · Admission steps",
    description: "The numbered steps in the admission process.",
    fields: ["title"],
    rows: (d) => d.process.steps.map((t) => ({ title: t })),
  },
  {
    slug: "mbbs_what_we_do",
    label: "MBBS · What we do",
    description: "How Admission Hands helps, shown on the MBBS page.",
    fields: ["title", "body"],
    rows: (d) => d.whatWeDo.points.map((x) => ({ title: x.title, body: x.desc })),
  },
  {
    slug: "mbbs_counselling",
    label: "MBBS · Counselling types",
    description: "AIQ, state, private and management quota explained.",
    fields: ["title", "body", "data.strategy"],
    rows: (d) =>
      d.counselling.types.map((x) => ({
        title: x.title,
        body: x.body,
        data: { strategy: x.goalStrategy },
      })),
  },
  {
    slug: "mbbs_eligibility",
    label: "MBBS · Eligibility criteria",
    description: "Who can apply. One line per criterion.",
    fields: ["title"],
    rows: (d) => d.eligibility.criteria.map((t) => ({ title: t })),
  },
  {
    slug: "mbbs_useful_info",
    label: "MBBS · Useful to know",
    description: "The explainer cards beside the eligibility list.",
    fields: ["title", "body"],
    rows: (d) => d.eligibility.usefulInfo.map((x) => ({ title: x.title, body: x.desc })),
  },
  {
    slug: "mbbs_documents",
    label: "MBBS · Document checklist",
    description: "What a candidate must carry to counselling.",
    fields: ["title"],
    rows: (d) => d.documents.list.map((t) => ({ title: t })),
  },
  {
    slug: "mbbs_fees",
    label: "MBBS · Fee ranges",
    description: "Title is the college type, subtitle the range.",
    fields: ["title", "subtitle"],
    rows: (d) => d.fees.ranges.map((x) => ({ title: x.category, subtitle: x.range })),
  },
  {
    slug: "mbbs_why_us",
    label: "MBBS · Why us",
    description: "The reasons block on the MBBS page.",
    fields: ["title", "body"],
    rows: (d) => d.whyUs.points.map((x) => ({ title: x.title, body: x.desc })),
  },
  {
    slug: "mbbs_seats",
    label: "MBBS · Seat distribution",
    description: "Title is the number, subtitle the label.",
    fields: ["title", "subtitle"],
    rows: (d) => d.seats.distribution.map((x) => ({ title: x.count, subtitle: x.label })),
  },
  {
    slug: "mbbs_top_states",
    label: "MBBS · Top states",
    description: "States listed beside the seat numbers.",
    fields: ["title"],
    rows: (d) => d.seats.topStates.map((t) => ({ title: t })),
  },
  {
    slug: "mbbs_faqs",
    label: "MBBS · FAQ",
    description: "Questions on the MBBS page. These also feed the page's structured data.",
    fields: ["title", "body"],
    rows: (d) => d.faqs.map((x) => ({ title: x.question, body: x.answer })),
  },
];

const SETTINGS = (d) => [
  ["mbbs.process.timeline", d.process.timeline, "text", "MBBS · Process", "Counselling window", null],
  ["mbbs.what_we_do.title", d.whatWeDo.title, "text", "MBBS · What we do", "Heading", null],
  ["mbbs.what_we_do.subtitle", d.whatWeDo.subtitle, "longtext", "MBBS · What we do", "Subheading", null],
  ["mbbs.counselling.disclaimer", d.counselling.disclaimer, "longtext", "MBBS · Disclaimers", "Counselling disclaimer", null],
  ["mbbs.documents.disclaimer", d.documents.disclaimer, "longtext", "MBBS · Disclaimers", "Documents disclaimer", null],
  ["mbbs.fees.disclaimer", d.fees.disclaimer, "longtext", "MBBS · Disclaimers", "Fees disclaimer", null],
  ["mbbs.seats.disclaimer", d.seats.disclaimer, "longtext", "MBBS · Disclaimers", "Seats disclaimer", null],
  ["mbbs.global_disclaimer", d.globalDisclaimer, "longtext", "MBBS · Disclaimers", "Page footer disclaimer", null],
];

async function main() {
  const d = await loadMbbsData();

  for (const c of COLLECTIONS) {
    await sql`
      INSERT INTO content_collections (slug, label, description, fields, display_order)
      VALUES (${c.slug}, ${c.label}, ${c.description}, ${JSON.stringify(c.fields)}::jsonb, 100)
      ON CONFLICT (slug) DO UPDATE
        SET label = EXCLUDED.label,
            description = EXCLUDED.description,
            fields = EXCLUDED.fields
    `;

    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = ${c.slug}
    `;
    if (n > 0) {
      console.log(`  ${c.slug.padEnd(22)} ${n} existing — left alone`);
      continue;
    }

    const rows = c.rows(d);
    let order = 1;
    for (const r of rows) {
      await sql`
        INSERT INTO content_blocks
          (collection, title, subtitle, body, data, display_order, is_active)
        VALUES
          (${c.slug}, ${r.title ?? null}, ${r.subtitle ?? null}, ${r.body ?? null},
           ${JSON.stringify(r.data ?? {})}::jsonb, ${order++}, true)
      `;
    }
    console.log(`  ${c.slug.padEnd(22)} ${rows.length} seeded`);
  }

  let added = 0;
  const settings = SETTINGS(d);
  for (const [key, value, type, group, label, help] of settings) {
    const res = await sql`
      INSERT INTO site_settings (key, value, value_type, group_name, label, help, display_order)
      VALUES (${key}, ${value}, ${type}, ${group}, ${label}, ${help}, 0)
      ON CONFLICT (key) DO UPDATE
        SET value_type = EXCLUDED.value_type,
            group_name = EXCLUDED.group_name,
            label = EXCLUDED.label
      RETURNING (xmax = 0) AS inserted
    `;
    if (res[0]?.inserted) added++;
  }
  console.log(`  site_settings          ${settings.length} keys (${added} new)`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
