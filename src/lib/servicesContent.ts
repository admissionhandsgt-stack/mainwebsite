/**
 * Everything /services shows, assembled on the server (2026-10-18): the copy
 * (Admin → Content, "Page: Services"), the team's own figures ("Page: Services —
 * the team's own figures"), the live data counts, and the services themselves
 * (the `services_page` collection, falling back to lib/servicesDefaults.ts).
 *
 * Counts the data can answer are counted — the page said "36 states" on one
 * card and "38" in the stats bar. Figures only the team can state (students
 * guided, years) are theirs to edit.
 */

import { getBlocks } from "@/lib/content";
import { approxLakh, getDataStats, inr } from "@/lib/dataStats";
import { pageCopy } from "@/lib/pageCopy";
import { SERVICES, type ServiceItem } from "@/lib/servicesDefaults";

const str = (v: unknown) => String(v ?? "").trim();
const lines = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const fill = (text: string, tokens: Record<string, string>) => text.replace(/\{([a-z_]+)\}/g, (m, k: string) => tokens[k] ?? m);

export async function getServicesPage() {
  const [figures, stats, blocks] = await Promise.all([pageCopy("page.services.figures"), getDataStats(), getBlocks("services_page")]);
  const tokens: Record<string, string> = {
    students: figures.students,
    years: figures.years,
    closing_ranks: stats.totalRanks ? approxLakh(stats.totalRanks) : "",
    colleges: stats.pgColleges + stats.ugColleges ? inr(stats.pgColleges + stats.ugColleges) : "",
    states: stats.states ? String(stats.states) : "",
  };

  const raw: ServiceItem[] = blocks.length
    ? blocks
        .filter((b) => b.title)
        .map((b) => ({
          icon: str(b.icon) || "target",
          title: str(b.title),
          tagline: str(b.subtitle),
          description: str(b.body),
          features: lines(b.data?.features),
          statValue: str(b.data?.stat_value),
          statLabel: str(b.data?.stat_label),
        }))
    : SERVICES;
  const services = raw.map((s) => ({
    ...s,
    description: fill(s.description, tokens),
    features: s.features.map((f) => fill(f, tokens)),
    statValue: fill(s.statValue, tokens),
  }));

  const copy = await pageCopy("page.services", { ...tokens, count: String(services.length) });
  return {
    copy,
    services,
    stats: [
      { key: "students", value: tokens.students, label: copy.stat_students },
      { key: "ranks", value: tokens.closing_ranks, label: copy.stat_ranks },
      { key: "years", value: tokens.years, label: copy.stat_years },
      { key: "states", value: tokens.states, label: copy.stat_states },
    ].filter((s) => s.value),
  };
}

export type ServicesPageData = Awaited<ReturnType<typeof getServicesPage>>;
