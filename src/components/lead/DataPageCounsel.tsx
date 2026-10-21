import CounselCard from "@/components/lead/CounselCard";
import { pageCopy } from "@/lib/pageCopy";
import { getCounsellingFacts } from "@/lib/counsellingFacts";

/**
 * The counsellor card after a data page's main table (2026-10-21). Google and AI assistants send people
 * straight to these pages with one question — ChatGPT's visitors land on branch and state pages and
 * convert at about three times Google's rate — and until now the only counsellor block sat under the
 * FAQs (branch pages had none). Placed where the reader has the answer, not before it.
 * Words: Admin → Content → "Counsellor card on data pages".
 */
type Kind = "branch" | "state" | "stipend" | "cutoff";

export default async function DataPageCounsel({ kind, name, placement }: { kind: Kind; name?: string; placement: string }) {
  const facts = await getCounsellingFacts();
  const moved = facts?.movedAfterR1.pg || null;
  const topic = name ?? (kind === "stipend" ? "PG stipend" : kind === "cutoff" ? "NEET PG cutoff" : "PG");
  const copy = await pageCopy("page.counsel_card", { name, topic, moved_pct: moved ?? undefined });
  const words = {
    branch: [copy.branch_title, copy.branch_body],
    state: [copy.state_title, copy.state_body],
    stipend: [copy.stipend_title, copy.stipend_body],
    cutoff: [copy.cutoff_title, copy.cutoff_body],
  }[kind];
  return (
    <CounselCard
      id={`counsel-${kind}`}
      eyebrow={copy.eyebrow}
      title={words[0]}
      body={words[1]}
      fact={moved ? copy.fact : undefined}
      waLabel={copy.wa}
      waText={copy.wa_text}
      callLabel={copy.call}
      predictorLabel={copy.predictor}
      predictorHref="/neet-college-predictor?course=pg"
      placement={placement}
    />
  );
}
