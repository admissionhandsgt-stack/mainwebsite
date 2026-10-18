/**
 * Every page's editable words, in one registry (2026-10-18).
 *
 * Each entry is one group in Admin → Content → Text & numbers. A field's
 * `value` is the shipped default: `scripts/seed_page_copy.mjs` creates the
 * `site_settings` row `<key>.<field>` with it (never overwriting an edit), and
 * lib/pageCopy.ts falls back to it when the admin's value is blank. `{tokens}`
 * in braces are filled with the page's live figures — the label lists which.
 *
 * Plain data and erasable types only: the seed script imports this file
 * directly with Node.
 *
 * Changing a default: the seeded row holds the old default, and a stored value
 * wins over the code. Put the old text in `was` — the seed replaces a row that
 * still holds exactly that text, and leaves a row somebody edited alone.
 */
export interface CopyField {
  label: string;
  value: string;
  long?: boolean;
  /** Earlier defaults that a re-seed may replace (only while the row still holds one verbatim). */
  was?: string[];
}
export interface CopyGroup {
  group: string;
  fields: Record<string, CopyField>;
}

const hero = (fields: Record<string, CopyField>): Record<string, CopyField> => fields;

export const PAGE_COPY = {
  "page.pg_stipend.hero": {
    group: "Page: PG stipend",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "MD/MS · first-year stipend" },
      title: { label: "Hero title", value: "NEET PG stipend," },
      accent: { label: "Hero title, coloured part", value: "state by state" },
      subtitle: {
        label: "Hero line",
        value: "The monthly first-year stipend MD/MS residents are paid, as each college publishes it — government against private, in every state.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check your PG chances" },
      source: {
        label: "Source line",
        value: "From each college's own published stipend, first year, per month. States with fewer than three such colleges are left out.",
        long: true,
      },
      visual_title: { label: "Chart title", value: "Highest-paying states" },
    }),
  },
  "page.pg_state.hero": {
    group: "Page: PG state pages",
    fields: hero({
      eyebrow: { label: "Hero eyebrow — {state}", value: "MD/MS · {state}" },
      title: { label: "Hero title — {state}", value: "MD/MS in {state}:" },
      accent: { label: "Hero title, coloured part", value: "seats, cutoff and fees" },
      subtitle: {
        label: "Hero line — {state}, {year}",
        value: "Every PG medical college in {state} with published NEET PG closing ranks, the counselling that fills its seats, and where each quota closed in {year}.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check your PG chances" },
      source: {
        label: "Source line — {year}",
        value: "From the {year} published counselling results, and each college's own published fee and stipend.",
        long: true,
      },
    }),
  },
  "page.pg_branch.hero": {
    group: "Page: PG branch pages",
    fields: hero({
      eyebrow: { label: "Hero eyebrow — {year}", value: "PG branch · {year} counselling" },
      subtitle: {
        label: "Hero line — {branch}, {year}",
        value: "Every college that offers {branch}, quota by quota and category by category, read from the counselling authorities' published results for {year}.",
        long: true,
      },
      cta: { label: "Hero button — {branch}", value: "Check {branch} against your rank" },
      source: {
        label: "Source line — {year}",
        value: "From the {year} published counselling results. A seat option is one college, quota and category — not a count of seats.",
        long: true,
      },
      visual_title: { label: "Chart title", value: "Where the colleges are" },
    }),
  },
  "page.neet_pg_cutoff.hero": {
    group: "Page: NEET PG cutoff",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "NEET PG · All India Quota" },
      title: { label: "Hero title — {year}", value: "NEET PG cutoff {year}:" },
      accent: { label: "Hero title, coloured part", value: "branch wise, by category" },
      subtitle: {
        label: "Hero line",
        value: "Where All India Quota MD, MS and diploma seats actually ran out, from MCC's published round results. Ranks are AIR.",
        long: true,
      },
      cta: { label: "Hero button", value: "Enter your PG rank — see every seat it reaches" },
      source: { label: "Source line — {year}", value: "From MCC's published round results for {year}, All India Quota. AIR is the All India Rank.", long: true },
      visual_title: { label: "Chart title — {year}", value: "Last AIR admitted, {year}" },
    }),
  },
  "page.neet_ug_cutoff.hero": {
    group: "Page: NEET UG cutoff",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "NEET UG · All India Quota" },
      title: { label: "Hero title — {year}", value: "NEET UG cutoff {year}:" },
      accent: { label: "Hero title, coloured part", value: "MBBS and BDS, by category" },
      subtitle: {
        label: "Hero line",
        value: "Where All India Quota seats actually ran out — the tightest round-1 close and the last rank admitted — from MCC's published results. Not a prediction and not the qualifying percentile.",
        long: true,
      },
      cta: { label: "Hero button", value: "Enter your rank — see every seat it reaches" },
      source: { label: "Source line — {year}", value: "From MCC's published round results for {year}, All India Quota. AIR is the All India Rank.", long: true },
      visual_title: { label: "Chart title — {year}", value: "MBBS last AIR admitted, {year}" },
    }),
  },
  "page.quota_management.hero": {
    group: "Page: Management quota",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "Management quota · MD/MS" },
      title: { label: "Hero title", value: "Management quota seats:" },
      accent: { label: "Hero title, coloured part", value: "what they cost, state by state" },
      subtitle: {
        label: "Hero line — {colleges}, {year}",
        value: "{colleges} MD/MS colleges filled management seats in the {year} counselling results. What those seats cost, quota by quota and state by state, and how far down the rank list they stayed open — which of them your own rank reaches is shown after a free sign-in.",
        long: true,
      },
      cta: { label: "Hero button", value: "See which management seats your rank reaches" },
      source: {
        label: "Source line — {year}",
        value: "From the {year} published counselling results and the fee each college published. Not a quotation: a college can revise its fee.",
        long: true,
      },
      visual_title: { label: "Chart title", value: "Where the colleges are" },
    }),
  },
  "page.quota_nri.hero": {
    group: "Page: NRI quota fees",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "NRI quota · MD/MS" },
      title: { label: "Hero title", value: "NRI quota seats:" },
      accent: { label: "Hero title, coloured part", value: "what they cost, state by state" },
      subtitle: {
        label: "Hero line — {colleges}, {year}",
        value: "{colleges} MD/MS colleges filled NRI seats in the {year} counselling results. What those seats cost, quota by quota and state by state, and how far down the rank list they stayed open — which of them your own rank reaches is shown after a free sign-in.",
        long: true,
      },
      cta: { label: "Hero button", value: "See which NRI seats your rank reaches" },
      source: {
        label: "Source line — {year}",
        value: "From the {year} published counselling results and the fee each college published. Not a quotation: a college can revise its fee.",
        long: true,
      },
      visual_title: { label: "Chart title", value: "Where the colleges are" },
    }),
  },
  "page.nri_colleges.hero": {
    group: "Page: Colleges with NRI seats",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "NRI quota · colleges" },
      title: { label: "Hero title", value: "Colleges with NRI seats," },
      accent: { label: "Hero title, coloured part", value: "state by state" },
      subtitle: {
        label: "Hero line — {mbbs}, {bds}, {pg}, {year}",
        value: "{mbbs} MBBS, {bds} BDS and {pg} MD/MS colleges filled NRI seats in the {year} counselling results. Every one is listed here, with the counselling that allots its NRI seats and, for MD/MS, the fee it published.",
        long: true,
      },
      cta: { label: "Hero button", value: "See which NRI seats your rank reaches" },
      source: {
        label: "Source line — {year}",
        value: "From the {year} counselling results published by MCC and the state authorities. A college can add or drop an NRI quota from one year to the next — check the current seat matrix before you plan around one.",
        long: true,
      },
      visual_title: { label: "Chart title", value: "Where the colleges are" },
    }),
  },
  "page.nri_colleges.body": {
    group: "Page: Colleges with NRI seats — body",
    fields: {
      list_intro: {
        label: "Above the list",
        value: "Open a college for its courses, fees and seats. Which of these your own rank reaches is shown in chance words after a free sign-in — never as a closing rank.",
        long: true,
      },
      pg_fee_note: {
        label: "MD/MS fee note",
        value: "The fee is the NRI seat's own, as the counselling authority or college published it. Most fee schedules quote a year's tuition; some deemed universities quote the whole course or a dollar figure — check which one you are reading before you plan around it.",
        long: true,
      },
      ug_fee_note: {
        label: "MBBS/BDS fee note",
        value: "MBBS and BDS counselling results do not say which quota a fee belongs to, so this list does not guess an NRI fee. The college's own prospectus has it — or ask us.",
        long: true,
      },
      faq1_q: { label: "Question 1", value: "Which medical colleges have an NRI quota for MBBS?" },
      faq1_a: {
        label: "Answer 1 — {mbbs}, {year}, {mbbs_states}, {top_states}",
        value: "{mbbs} colleges filled NRI MBBS seats in the {year} counselling results we hold, across {mbbs_states} states — most of them in {top_states}. Every one is listed on this page, state by state.",
        long: true,
      },
      faq2_q: { label: "Question 2", value: "Who allots NRI seats — the college or a counselling?" },
      faq2_a: {
        label: "Answer 2 — {mcc_deemed}, {state_counsellings}",
        value: "A counselling authority, not the college on its own. MCC allots the NRI seats of deemed universities ({mcc_deemed} MBBS colleges here), and a state counselling allots them at private colleges in the states that keep an NRI quota — {state_counsellings}. Who counts as an NRI is that authority's rule, and it is re-issued every year.",
        long: true,
      },
      faq3_q: { label: "Question 3", value: "Do government medical colleges have NRI seats?" },
      faq3_a: {
        label: "Answer 3 — {pg_private}, {pg_deemed}, {govt_line}",
        value: "For MD/MS, not in the results we hold: every NRI seat is at a private college ({pg_private}) or a deemed university ({pg_deemed}). For MBBS, a state can keep NRI seats in its government colleges{govt_line}.",
        long: true,
      },
      faq4_q: { label: "Question 4", value: "What does an NRI medical seat cost?" },
      faq4_a: {
        label: "Answer 4 — {pg_fee_p10}, {pg_fee_p90}, {pg_fee_median}",
        value: "For MD/MS, most published NRI fees run from {pg_fee_p10} to {pg_fee_p90}, and the middle NRI seat costs about {pg_fee_median}. Most fee schedules quote a year's tuition, some the whole course. MBBS and BDS results publish no fee per quota, so the college's prospectus is the place to check.",
        long: true,
      },
      faq5_q: { label: "Question 5", value: "How do I find out which of these my rank can get?" },
      faq5_a: {
        label: "Answer 5",
        value: "Enter your rank in the seat predictor with the NRI seat type and sign in free: it shows the colleges your rank reaches in chance words, from High chance to Reach, with an approximate fee bracket. A counsellor can then check the NRI documents each college asks for.",
        long: true,
      },
    },
  },
  "page.nri.fees": {
    group: "Page: NRI quota — fees section",
    fields: {
      eyebrow: { label: "Eyebrow", value: "What it costs" },
      title: { label: "Heading", value: "NRI quota fees, as colleges published them" },
      intro: {
        label: "Intro — {pg}, {year}",
        value: "{pg} MD/MS colleges published an NRI fee in the {year} counselling. Here is what those fees look like at private colleges and at deemed universities, and state by state.",
        long: true,
      },
      mbbs_title: { label: "MBBS box heading", value: "And MBBS?" },
      mbbs_note: {
        label: "MBBS box text",
        value: "MBBS counselling results do not say which quota a fee belongs to, so we do not print a guessed NRI fee for MBBS. Many deemed universities quote NRI fees in US dollars and state NRI quotas in rupees — ask us and we will send you the college's own fee notice.",
        long: true,
      },
      states_title: { label: "State table heading", value: "Median NRI fee by state, MD/MS" },
      considerations_title: { label: "Checklist heading", value: "Before you budget for an NRI seat" },
      c1_t: { label: "Point 1 title", value: "Read what a fee covers" },
      c1_d: {
        label: "Point 1 text",
        value: "Some notices quote a year's tuition, some the whole course. Hostel, mess, caution deposit and university charges are usually listed separately.",
        long: true,
      },
      c2_t: { label: "Point 2 title", value: "Dollar fees move with the rupee" },
      c2_d: {
        label: "Point 2 text",
        value: "A fee quoted in US dollars costs more in rupees when the rupee weakens — budget with a margin.",
        long: true,
      },
      c3_t: { label: "Point 3 title", value: "Fees are re-issued every session" },
      c3_d: {
        label: "Point 3 text",
        value: "Authorities and colleges publish a new fee notice each year. Last year's figure is a guide, not a quotation.",
        long: true,
      },
      c4_t: { label: "Point 4 title", value: "Check refund and bond rules" },
      c4_d: {
        label: "Point 4 text",
        value: "Leaving a seat after a round can forfeit fees. Read the counselling's own rules on refunds, forfeiture and service bonds before you accept one.",
        long: true,
      },
    },
  },
  "page.bds.hero": {
    group: "Page: BDS colleges",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "BDS · NEET UG" },
      title: { label: "Hero title", value: "BDS colleges in India:" },
      accent: { label: "Hero title, coloured part", value: "cutoff and counselling" },
      subtitle: {
        label: "Hero line",
        value: "Every dental college with published NEET closing ranks, state by state — and where All India Quota BDS seats ran out in each category.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check which BDS seats your rank reaches" },
      source: { label: "Source line — {year}", value: "From MCC's and the state counselling authorities' published results, {year}.", long: true },
      visual_title: { label: "Chart title", value: "Where the BDS colleges are" },
    }),
  },
  "page.deemed_pg.hero": {
    group: "Page: Deemed universities PG",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "MD/MS · deemed universities" },
      title: { label: "Hero title", value: "Deemed universities:" },
      accent: { label: "Hero title, coloured part", value: "MD/MS fees and cutoff" },
      subtitle: {
        label: "Hero line — {count}, {year}",
        value: "{count} deemed universities with published PG fees — management and NRI quota, college by college — and how far down the NEET PG list their seats stayed open in {year}.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check your PG chances" },
      source: { label: "Source line — {year}", value: "From the fees and results published with the {year} counselling. Not a quotation: a college can revise its fee.", long: true },
      visual_title: { label: "Chart title", value: "Fees by quota" },
    }),
  },
  "page.private_pg_fees.hero": {
    group: "Page: Private college PG fees",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "MD/MS · private colleges" },
      title: { label: "Hero title", value: "MD/MS fees in private colleges," },
      accent: { label: "Hero title, coloured part", value: "quota by quota" },
      subtitle: {
        label: "Hero line — {year}",
        value: "The same college charges very different fees on a state-quota, management or NRI seat. Here is what each costs, nationally and in every state, from the fees published with the {year} counselling.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check your PG chances" },
      source: { label: "Source line — {year}", value: "From the fees published with the {year} counselling. Not a quotation: a college can revise its fee.", long: true },
      visual_title: { label: "Chart title", value: "Fees by quota" },
    }),
  },
  "page.ug_state.hero": {
    group: "Page: MBBS state pages",
    fields: hero({
      eyebrow: { label: "Hero eyebrow — {state}", value: "MBBS · {state}" },
      title: { label: "Hero title — {state}", value: "MBBS in {state}:" },
      accent: { label: "Hero title, coloured part", value: "colleges and counselling" },
      subtitle: {
        label: "Hero line — {count}, {state}, {counsellings}",
        value: "{count} MBBS colleges in {state}, each with its own page of courses, fees, seats and its cutoff band. Seats here are filled through {counsellings} counselling — published results, not estimates.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check which seats your rank reaches" },
      source: { label: "Source line", value: "From the published counselling results: MCC for the All India Quota and deemed seats, the state for its own quota.", long: true },
      visual_title: { label: "Chart title", value: "Who fills MBBS seats here" },
    }),
  },
  "page.pg_branches.hero": {
    group: "Page: PG branches",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "MD · MS · DNB · Diploma" },
      title: { label: "Hero title", value: "Every MD/MS branch," },
      accent: { label: "Hero title, coloured part", value: "and what it closed at" },
      subtitle: {
        label: "Hero line — {count}",
        value: "{count} branches, with the colleges offering each one and the ranks they actually reached. Pick a branch to see where it is within reach.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check your PG chances" },
      source: { label: "Source line", value: "From the published NEET PG counselling results. A seat option is one college, quota and category — not a count of seats.", long: true },
      visual_title: { label: "Chart title", value: "Most offered branches" },
    }),
  },
  "page.pg_states.hero": {
    group: "Page: PG states",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "MD/MS · state by state" },
      title: { label: "Hero title", value: "PG medical seats," },
      accent: { label: "Hero title, coloured part", value: "state by state" },
      subtitle: {
        label: "Hero line — {colleges}, {states}",
        value: "{colleges} PG colleges across {states} states and union territories. Open one for its quotas, cutoffs, fees, branches and stipend.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check your PG chances" },
      source: { label: "Source line", value: "From the published NEET PG counselling results and each college's own published stipend.", long: true },
      visual_title: { label: "Chart title", value: "Most PG colleges" },
      how_title: { label: "Box title", value: "How PG seats in a state are filled" },
      how_aiq: {
        label: "Box point: All India Quota",
        value: "Half the MD/MS seats in a state's government colleges are the All India Quota, filled by MCC on the NEET PG All India Rank.",
        long: true,
      },
      how_state: {
        label: "Box point: state quota",
        value: "The other half, and the seats in the state's private colleges, are filled by the state's own counselling on its merit list — usually with a domicile rule.",
        long: true,
      },
      how_deemed: {
        label: "Box point: deemed and central",
        value: "Deemed universities and central institutions are filled by MCC for every seat, so they appear in the All India counselling, not the state's.",
        long: true,
      },
    }),
  },
  "page.neet_ss.hero": {
    group: "Page: NEET SS cutoff",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "NEET SS · DM · MCh · DrNB" },
      title: { label: "Hero title — {year}", value: "NEET SS cutoff {year}:" },
      accent: { label: "Hero title, coloured part", value: "DM, MCh and DrNB" },
      subtitle: {
        label: "Hero line — {year}, {prev}",
        value: "Where every super-speciality course closed in MCC's {year} counselling — round 1 and the last rank admitted, with {prev} beside it. Ranks are group ranks.",
        long: true,
      },
      cta: { label: "Hero button", value: "Talk to a counsellor" },
      source: { label: "Source line", value: "From MCC's published super-speciality round results. NEET SS ranks are group ranks: each group has its own merit list.", long: true },
      visual_title: { label: "Chart title", value: "Largest courses" },
    }),
  },
  "page.neet_ss_course.hero": {
    group: "Page: NEET SS course pages",
    fields: hero({
      eyebrow: { label: "Hero eyebrow — {group}", value: "NEET SS · {group}" },
      accent: { label: "Hero title, coloured part", value: "cutoff, seats and colleges" },
      subtitle: { label: "Hero line — {course}, {group}", value: "{group}. Ranks are NEET SS group ranks, from MCC's published round results.", long: true },
      cta: { label: "Hero button", value: "Talk to a counsellor" },
      source: { label: "Source line", value: "From MCC's published super-speciality round results.", long: true },
      visual_title: { label: "Card title", value: "At a glance" },
    }),
  },
  "page.neet_mds.hero": {
    group: "Page: NEET MDS cutoff",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "NEET MDS · All India Quota" },
      title: { label: "Hero title — {year}", value: "NEET MDS cutoff {year}:" },
      accent: { label: "Hero title, coloured part", value: "every speciality" },
      subtitle: {
        label: "Hero line — {year}",
        value: "Where All India Quota and deemed-university MDS seats ran out in MCC's {year} counselling. Ranks are NEET MDS All India Ranks.",
        long: true,
      },
      cta: { label: "Hero button", value: "Talk to a counsellor" },
      source: { label: "Source line", value: "From MCC's published MDS round results.", long: true },
      visual_title: { label: "Chart title", value: "Seats by speciality" },
    }),
  },
  "page.neet_mds_course.hero": {
    group: "Page: NEET MDS course pages",
    fields: hero({
      eyebrow: { label: "Hero eyebrow — {year}", value: "NEET MDS · {year}" },
      accent: { label: "Hero title, coloured part", value: "cutoff and colleges" },
      subtitle: {
        label: "Hero line — {year}",
        value: "Every quota and category MCC filled for this speciality in {year}, round 1 and the last rank admitted. NEET MDS All India Ranks.",
        long: true,
      },
      cta: { label: "Hero button", value: "Talk to a counsellor" },
      source: { label: "Source line", value: "From MCC's published MDS round results.", long: true },
      visual_title: { label: "Card title", value: "At a glance" },
    }),
  },
  "page.ayush.hero": {
    group: "Page: AYUSH colleges",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "BAMS · BHMS · BUMS · BSMS" },
      title: { label: "Hero title", value: "BAMS, BHMS and" },
      accent: { label: "Hero title, coloured part", value: "AYUSH colleges in India" },
      subtitle: {
        label: "Hero line",
        value: "Every Ayurveda, Homoeopathy, Unani and Siddha college — and nursing and veterinary colleges — with published NEET UG closing ranks. Open a college for its courses, fees and seats.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check MBBS and BDS seats for your rank" },
      source: { label: "Source line", value: "From the published NEET UG counselling results of MCC (AACCC for AYUSH) and the states.", long: true },
      visual_title: { label: "Chart title", value: "Colleges by course" },
    }),
  },
  "page.open_data.hero": {
    group: "Page: Open data",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "Open data · free with a link" },
      title: { label: "Hero title", value: "NEET counselling data," },
      accent: { label: "Hero title, coloured part", value: "free to use" },
      subtitle: {
        label: "Hero line",
        value: "Cutoffs, stipends and fees compiled from the counselling authorities' published results. Download any table as CSV, embed it on your site, or quote it — with a link back to the source.",
        long: true,
      },
      source: { label: "Source line", value: "Free to use, with a link to AdmissionHands as the source.", long: true },
      visual_title: { label: "Card title", value: "Datasets" },
    }),
  },
  "page.stipend_report.hero": {
    group: "Page: Stipend report",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "Report · October 2026" },
      title: { label: "Hero title", value: "What a PG resident earns," },
      accent: { label: "Hero title, coloured part", value: "state by state" },
      subtitle: {
        label: "Hero line — {colleges}, {states}",
        value: "First-year MD/MS stipends published by {colleges} medical colleges, compiled across {states} states.",
        long: true,
      },
      cta: { label: "Hero button", value: "See every state's stipend" },
      source: { label: "Source line", value: "Every figure is computed from each college's own published stipend when the page is opened — nothing is typed in.", long: true },
      visual_title: { label: "Chart title", value: "Highest-paying states" },
    }),
  },
} satisfies Record<string, CopyGroup>;

/** Site-wide Telegram settings, read by the root layout (see components/engage/TelegramLink). */
export const TELEGRAM_SETTINGS: { key: string; label: string; value: string; long?: boolean }[] = [
  { key: "social.telegram", label: "Telegram channel link (https://t.me/…)", value: "https://t.me/AdmissionHandsIndia" },
  { key: "telegram.card.heading", label: "Telegram card heading", value: "Counselling updates on Telegram" },
  {
    key: "telegram.card.body",
    label: "Telegram card line",
    value: "Round dates, allotment results, cutoffs and choice-filling tips, as they come out.",
    long: true,
  },
  {
    key: "telegram.nudge.text",
    label: "Telegram pop-up text",
    value: "Round dates, results, cutoffs and choice-filling tips on the Admission Hands Telegram channel.",
    long: true,
  },
];

export type CopyKey = keyof typeof PAGE_COPY;
export type CopyFields<K extends CopyKey> = { [F in keyof (typeof PAGE_COPY)[K]["fields"]]: string };
