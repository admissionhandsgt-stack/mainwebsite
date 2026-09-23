/**
 * Page content resolvers.
 *
 * The inner sections of the MBBS page all read one object, `mbbsData`. Rather
 * than thread a dozen separate props through a dozen components, this builds
 * the same shape with the CMS layered over it: every list falls back to the
 * shipped array when its collection is empty, and every string falls back to
 * the shipped text when its setting is blank.
 *
 * So an empty CMS renders the page exactly as it was written in code, and
 * filling in one collection replaces only that list.
 */

import { mbbsData } from "@/data/mbbs-india";
import { getBlocks, getSettings, setting, type ContentBlock } from "@/lib/content";

export type MbbsContent = typeof mbbsData;

/** Uses the CMS list when it has rows, otherwise the shipped one. */
function listOr<T>(blocks: ContentBlock[], map: (b: ContentBlock) => T, fallback: T[]): T[] {
  return blocks.length ? blocks.map(map) : fallback;
}

const str = (v: string | null | undefined) => (v ?? "").trim();

export async function getMbbsContent(): Promise<MbbsContent> {
  const [
    s, heroStats, overview, steps, whatWeDo, counselling, criteria,
    usefulInfo, documents, fees, whyUs, seats, topStates, faqs,
  ] = await Promise.all([
    getSettings(),
    getBlocks("mbbs_hero_stats"),
    getBlocks("mbbs_overview"),
    getBlocks("mbbs_process_steps"),
    getBlocks("mbbs_what_we_do"),
    getBlocks("mbbs_counselling"),
    getBlocks("mbbs_eligibility"),
    getBlocks("mbbs_useful_info"),
    getBlocks("mbbs_documents"),
    getBlocks("mbbs_fees"),
    getBlocks("mbbs_why_us"),
    getBlocks("mbbs_seats"),
    getBlocks("mbbs_top_states"),
    getBlocks("mbbs_faqs"),
  ]);

  return {
    hero: {
      promisingInfo: listOr(
        heroStats,
        (b) => ({ label: str(b.title), value: str(b.subtitle) }),
        mbbsData.hero.promisingInfo,
      ),
    },

    overview: {
      items: listOr(
        overview,
        (b) => ({ label: str(b.title), value: str(b.subtitle), detail: str(b.body) }),
        mbbsData.overview.items,
      ),
    },

    process: {
      timeline: setting(s, "mbbs.process.timeline", mbbsData.process.timeline),
      steps: listOr(steps, (b) => str(b.title), mbbsData.process.steps),
    },

    whatWeDo: {
      title: setting(s, "mbbs.what_we_do.title", mbbsData.whatWeDo.title),
      subtitle: setting(s, "mbbs.what_we_do.subtitle", mbbsData.whatWeDo.subtitle),
      points: listOr(
        whatWeDo,
        (b) => ({ title: str(b.title), desc: str(b.body) }),
        mbbsData.whatWeDo.points,
      ),
    },

    counselling: {
      types: listOr(
        counselling,
        (b) => ({
          title: str(b.title),
          body: str(b.body),
          // The strategy line is specific to this list, so it lives in `data`.
          goalStrategy: String(b.data?.strategy ?? ""),
        }),
        mbbsData.counselling.types,
      ),
      disclaimer: setting(s, "mbbs.counselling.disclaimer", mbbsData.counselling.disclaimer),
    },

    eligibility: {
      criteria: listOr(criteria, (b) => str(b.title), mbbsData.eligibility.criteria),
      usefulInfo: listOr(
        usefulInfo,
        (b) => ({ title: str(b.title), desc: str(b.body) }),
        mbbsData.eligibility.usefulInfo,
      ),
    },

    documents: {
      list: listOr(documents, (b) => str(b.title), mbbsData.documents.list),
      disclaimer: setting(s, "mbbs.documents.disclaimer", mbbsData.documents.disclaimer),
    },

    fees: {
      ranges: listOr(
        fees,
        (b) => ({ category: str(b.title), range: str(b.subtitle) }),
        mbbsData.fees.ranges,
      ),
      disclaimer: setting(s, "mbbs.fees.disclaimer", mbbsData.fees.disclaimer),
    },

    whyUs: {
      points: listOr(
        whyUs,
        (b) => ({ title: str(b.title), desc: str(b.body) }),
        mbbsData.whyUs.points,
      ),
    },

    topColleges: mbbsData.topColleges,

    seats: {
      distribution: listOr(
        seats,
        (b) => ({ count: str(b.title), label: str(b.subtitle) }),
        mbbsData.seats.distribution,
      ),
      topStates: listOr(topStates, (b) => str(b.title), mbbsData.seats.topStates),
      disclaimer: setting(s, "mbbs.seats.disclaimer", mbbsData.seats.disclaimer),
    },

    faqs: listOr(
      faqs,
      (b) => ({ question: str(b.title), answer: str(b.body) }),
      mbbsData.faqs,
    ),

    globalDisclaimer: setting(s, "mbbs.global_disclaimer", mbbsData.globalDisclaimer),
  };
}
