import CounselCard from "@/components/lead/CounselCard";
import { pageCopy } from "@/lib/pageCopy";
import { getCounsellingFacts } from "@/lib/counsellingFacts";
import QuickPgForm from "@/components/lead/QuickPgForm";
import { currentPath } from "@/lib/pageDates";
import { CONTACT_INFO } from "@/lib/constants";

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
  const [copy, quick, path] = await Promise.all([
    pageCopy("page.counsel_card", { name, topic, moved_pct: moved ?? undefined }),
    // The quick call-back form under the card (2026-11-11): name, mobile, rank — the source names the page.
    pageCopy("site.quick_form", { college: topic, topic }),
    currentPath().catch(() => null),
  ]);
  const waHref = `https://wa.me/${CONTACT_INFO.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(copy.wa_text)}`;
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
      form={
        quick.button ? (
          <QuickPgForm
            source={`Quick form — ${topic}${path ? ` (${path})` : ""}`}
            waHref={waHref}
            copy={{ name: quick.name, phone: quick.phone, rank: quick.rank, rank_hint: quick.rank_hint, button: quick.button, done: quick.done, privacy: quick.privacy }}
          />
        ) : undefined
      }
    />
  );
}
