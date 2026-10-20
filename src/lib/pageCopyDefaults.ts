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
  "page.nri_documents.hero": {
    group: "Page: NRI documents",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "NRI quota · documents" },
      title: { label: "Hero title", value: "NRI quota documents:" },
      accent: { label: "Hero title, coloured part", value: "what MCC asks for" },
      subtitle: {
        label: "Hero line — {count}",
        value: "The {count} documents MCC asked NRI-quota candidates for in the 2025 MBBS, BDS and MD/MS counselling, what each one has to prove, and who may sponsor you.",
        long: true,
      },
      cta: { label: "Hero button", value: "Get your documents checked" },
      source: {
        label: "Source line",
        value: "From MCC's 2025 NEET UG notices (July and September 2025) and its NEET PG 2025 information bulletin. The rules are re-issued every year — read the current notice on mcc.nic.in before you apply.",
        long: true,
      },
      visual_title: { label: "Panel title", value: "The rules in brief" },
    }),
  },
  "page.nri_documents.body": {
    group: "Page: NRI documents — body",
    fields: {
      rule_nri: {
        label: "Panel: who counts as an NRI",
        value: "An Indian citizen with an Indian passport who has lived abroad for more than 182 days. OCI and PIO cardholders are covered too.",
        long: true,
      },
      rule_ward: {
        label: "Panel: ward (MBBS/BDS)",
        value: "A minor under an NRI's bonafide guardianship, proved to the Indian mission with evidence and an affidavit.",
        long: true,
      },
      rule_pg: {
        label: "Panel: MD/MS priority",
        value: "NRIs and their children first; then candidates sponsored by NRI uncles, aunts, grandparents or first cousins.",
        long: true,
      },
      rule_sponsor: {
        label: "Panel: sponsorship",
        value: "A notarised affidavit to pay the whole course fee and living costs, backed by the sponsor's NRE passbook.",
        long: true,
      },
      list_title: { label: "Checklist heading", value: "The checklist" },
      list_intro: {
        label: "Checklist intro",
        value: "Scanned copies go to MCC for every round, and the originals are checked when you report to the college. Keep one clean set, named and in the order below.",
        long: true,
      },
      eligibility_title: { label: "Eligibility heading", value: "Who can claim an NRI seat" },
      ug_title: { label: "MBBS/BDS card heading", value: "MBBS and BDS" },
      ug_body: {
        label: "MBBS/BDS card text",
        value: "An NRI, the child of an NRI, or a ward of an NRI — a minor under an NRI's bonafide guardianship, shown to the Indian mission with evidence and an affidavit. Having looked after a student does not, by itself, make a relative their guardian.",
        long: true,
      },
      pg_title: { label: "MD/MS card heading", value: "MD/MS" },
      pg_body: {
        label: "MD/MS card text",
        value: "MCC allots NRI seats in two priority groups: NRIs and the children of NRIs first; then candidates sponsored by close relatives who are NRIs — uncles and aunts on either side, grandparents on either side, and first cousins.",
        long: true,
      },
      process_title: { label: "Process heading", value: "How the documents are checked" },
      process_1: {
        label: "Process point 1",
        value: "By email, every round: one mail, in MCC's format, inside the window the notice gives. Documents sent for an earlier round are not carried forward.",
        long: true,
      },
      process_2: {
        label: "Process point 2",
        value: "Originals at reporting: the college you are allotted checks every original against the scans.",
        long: true,
      },
      process_3: {
        label: "Process point 3",
        value: "At the source: MCC sends NRI proofs to the Indian mission for verification. A fake or incomplete document gets the candidature rejected.",
        long: true,
      },
      states_note: {
        label: "State counsellings note",
        value: "This is MCC's list, for deemed universities and the central NRI seats it allots. A state's NRI seat follows that state's own information bulletin, which can ask for more papers or different ones.",
        long: true,
      },
      faq1_q: { label: "Question 1", value: "What documents are needed for NRI quota MBBS admission?" },
      faq1_a: {
        label: "Answer 1",
        value: "For MCC's counselling in 2025: the NEET admit card and scorecard, proof of the parent's or relative's NRI status (passport with visa or residence permit, and an NRI certificate from the Indian embassy or consulate), an OCI or PIO card if you hold one, Class 10 and 12 certificates, a birth certificate and a self-attested declaration — plus, if a relative sponsors you, a relationship certificate with a family tree and a notarised sponsorship affidavit backed by an NRE passbook.",
        long: true,
      },
      faq2_q: { label: "Question 2", value: "Can a relative sponsor me for an NRI seat?" },
      faq2_a: {
        label: "Answer 2",
        value: "For MD/MS, yes — after NRIs and their children, MCC allots NRI seats to candidates sponsored by NRI uncles, aunts, grandparents or first cousins. For MBBS and BDS the 2025 notices speak of the child or ward of an NRI, a ward being a minor under the NRI's bonafide guardianship. Read the current notice: the rule has changed between years.",
        long: true,
      },
      faq3_q: { label: "Question 3", value: "Where are NRI documents submitted?" },
      faq3_a: {
        label: "Answer 3",
        value: "To MCC by email, once for every round, in the format and window its notice gives — documents from an earlier round are not reused. The originals are then checked by the college at reporting.",
        long: true,
      },
      faq4_q: { label: "Question 4", value: "Do state counsellings ask for the same documents?" },
      faq4_a: {
        label: "Answer 4",
        value: "Not necessarily. Each state that keeps an NRI quota sets its own list in its information bulletin, and it can differ from MCC's. Check the bulletin of every counselling you register for.",
        long: true,
      },
      faq5_q: { label: "Question 5", value: "What happens if an NRI document is wrong or missing?" },
      faq5_a: {
        label: "Answer 5",
        value: "MCC verifies NRI proofs with the Indian mission, and a fake or incomplete document gets the candidature rejected. A missing paper at reporting can cost the seat, which is why we check the whole set before the first round.",
        long: true,
      },
    },
  },
  "page.neet_ug_process": {
    group: "Page: NEET UG process",
    fields: {
      hero_title: { label: "Hero title", value: "NEET UG Admission Process –" },
      hero_accent: { label: "Hero title, coloured part", value: "Complete Step-by-Step Guide" },
      hero_subtitle: {
        label: "Hero line",
        value: "Understand the full MBBS admission journey from exam to college joining with expert guidance.",
        long: true,
      },
      hero_cta_call: { label: "Hero call button", value: "Start Consultation" },
      hero_cta_steps: { label: "Hero steps button", value: "Explore Steps" },
      overview_title: { label: "Overview heading", value: "Overview of Admission Lifecycle" },
      overview_body: {
        label: "Overview text",
        value: "NEET UG is the single national-level entrance examination for MBBS admissions in India. The process is managed by multiple authorities depending on the quota and college type.",
        long: true,
      },
      body_1_title: { label: "Authority 1", value: "NTA" },
      body_1_desc: { label: "Authority 1 role", value: "Conducts NEET UG exam & declares results" },
      body_2_title: { label: "Authority 2", value: "MCC" },
      body_2_desc: { label: "Authority 2 role", value: "Handles AIQ, Deemed & Central counselling" },
      body_3_title: { label: "Authority 3", value: "State Authorities" },
      body_3_desc: { label: "Authority 3 role", value: "Manage state quota (85%) and private admissions" },
      overview_warning: {
        label: "Overview warning",
        value: "Navigating this process correctly is crucial, as small mistakes can cost valuable seats.",
        long: true,
      },
      steps_title: { label: "Steps heading", value: "Step-by-Step Journey" },
      steps_intro: { label: "Steps intro — {count}", value: "We break down the {count} critical milestones of your admission process." },
      mid_title: { label: "Mid banner heading", value: "Not sure which counselling route is right for you?" },
      mid_body: { label: "Mid banner text", value: "Get a personalized roadmap based on your predicted rank and budget." },
      mid_call: { label: "Mid banner call button", value: "Talk to Expert" },
      mid_whatsapp: { label: "Mid banner WhatsApp button", value: "WhatsApp Now" },
      mistakes_title: { label: "Mistakes heading", value: "Common Mistakes to Avoid" },
      mistakes_intro: {
        label: "Mistakes intro",
        value: "Each of these has cost students a better seat — and every one of them is avoidable.",
        long: true,
      },
      mistakes_list: {
        label: "Mistakes — one per line",
        value: "Filling limited choices\nIgnoring state counselling\nNot understanding quota benefits\nMissing deadlines\nWrong category selection",
        long: true,
      },
      mistakes_critical_label: { label: "Mistakes footnote label", value: "Critical:" },
      mistakes_critical: { label: "Mistakes footnote", value: "These mistakes often result in losing better colleges." },
      helps_title: { label: "How we help — heading", value: "How Admission Hands Helps" },
      helps_intro: {
        label: "How we help — intro",
        value: "We provide the data, strategy, and peace of mind you need for a successful admission.",
        long: true,
      },
      help_1_title: { label: "Help 1", value: "Rank-based Shortlisting" },
      help_1_desc: { label: "Help 1 text", value: "Get a strategic list of target MBBS colleges matching your rank, category, and budget.", long: true },
      help_2_title: { label: "Help 2", value: "Multi-counselling Strategy" },
      help_2_desc: { label: "Help 2 text", value: "Manage AIQ, State, and Deemed university counsellings in parallel to maximize allotment.", long: true },
      help_3_title: { label: "Help 3", value: "Smart Choice Filling" },
      help_3_desc: { label: "Help 3 text", value: "Optimize your choices to ensure you secure the highest value seat without losing safety options.", long: true },
      help_4_title: { label: "Help 4", value: "Budget Optimization" },
      help_4_desc: { label: "Help 4 text", value: "Align college fees, security deposits, and bond rules with your financial choices.", long: true },
      help_5_title: { label: "Help 5", value: "Documentation Support" },
      help_5_desc: { label: "Help 5 text", value: "Pre-audit all certificates, affidavits, and NRI papers to prevent seat rejections.", long: true },
      help_6_title: { label: "Help 6", value: "End-to-End Guidance" },
      help_6_desc: { label: "Help 6 text", value: "Continuous support from registration through choices to final college joining.", long: true },
      final_title: { label: "Closing heading", value: "Secure Your MBBS Seat with" },
      final_accent: { label: "Closing heading, coloured part", value: "Expert Guidance" },
      final_points: {
        label: "Closing points — one per line",
        value: "Personalized counselling strategy\nStrategic admission planning\nFull support till college joining",
        long: true,
      },
      final_call: { label: "Closing call button", value: "Call Now" },
      final_whatsapp: { label: "Closing WhatsApp button", value: "WhatsApp Now" },
      disclaimer: {
        label: "Disclaimer",
        value: "All information is for guidance purposes only. Admission processes, seat matrix, eligibility, and counselling rules are subject to updates by NTA, MCC, and respective State Authorities. We strongly advise students to verify details from official portals regularly.",
        long: true,
      },
    },
  },
  "page.neet_pg_process": {
    group: "Page: NEET PG process",
    fields: {
      hero_eyebrow: { label: "Hero eyebrow", value: "NEET PG counselling" },
      hero_title: { label: "Hero title", value: "NEET PG counselling," },
      hero_accent: { label: "Hero title, coloured part", value: "explained in the order it happens." },
      hero_subtitle: {
        label: "Hero line",
        value: "Two authorities run at once, the rounds go further than most people expect, and one decision in round 2 can cost the seat you already hold. Here is the whole process, with the numbers from the published results rather than from advice.",
        long: true,
      },
      who_title: { label: "Who runs what — heading", value: "Two counsellings, running at the same time" },
      who_intro: {
        label: "Who runs what — intro",
        value: "This is the part that catches people out. There is no single queue for PG seats — your rank is being used by two different authorities, on two different portals, with two different deadlines. You may take part in both.",
        long: true,
      },
      mcc_name: { label: "MCC card heading", value: "MCC — mcc.nic.in" },
      mcc_runs: {
        label: "MCC runs — one per line",
        value: "50% All India Quota in state government colleges\nAll seats in central universities and central institutes\nAll deemed university seats\nESIC and armed forces seats",
        long: true,
      },
      mcc_note: { label: "MCC card note", value: "No domicile requirement. Any qualified candidate from any state can take part.", long: true },
      state_name: { label: "State card heading", value: "Your state authority" },
      state_runs: {
        label: "State runs — one per line",
        value: "The other 50% of government seats in that state\nMost private medical college seats in that state\nState-specific quotas and reservations",
        long: true,
      },
      state_note: { label: "State card note", value: "Domicile or state-eligibility rules apply, and they differ from state to state.", long: true },
      schedule_year: { label: "Schedule: counselling year", value: "2026" },
      schedule_notified: { label: "Schedule: notified on", value: "7–8 October 2026" },
      schedule_session: { label: "Schedule: academic session begins", value: "20 November 2026" },
      schedule_source_1_label: { label: "Schedule source 1 — name", value: "NEET-PG schedule 2026 — AIQ, deemed, central and state quota (MCC)" },
      schedule_source_1_url: {
        label: "Schedule source 1 — link",
        value: "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/10/202610081115756031.pdf",
      },
      schedule_source_2_label: { label: "Schedule source 2 — name", value: "Tentative schedule, AIQ and deemed PG counselling 2026, round by round (MCC)" },
      schedule_source_2_url: {
        label: "Schedule source 2 — link",
        value: "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/10/202610071411981089.pdf",
      },
      rounds_title: { label: "Rounds heading", value: "The rounds, in the order they happen" },
      rounds_intro: {
        label: "Rounds intro",
        value: "Each round changes what the next one can offer you, so the order matters more than any single round does.",
        long: true,
      },
      float_badge: { label: "Float or freeze — badge", value: "The decision that costs a year" },
      float_title: { label: "Float or freeze — heading", value: "Float or freeze" },
      float_p1: {
        label: "Float or freeze — paragraph 1",
        value: "You hold a seat from round 1 and have to decide whether to chase something better. Everyone will tell you the cut always loosens. Usually it does — and for a real slice of seats it does the opposite, closing at better ranks in later rounds than it did in round 1. Give one of those up and you cannot take it back.",
        long: true,
      },
      float_p2: {
        label: "Float or freeze — paragraph 2",
        value: "There is no honest way to answer this with an opinion. The only answer is what actually happened, at your rank, in your category — which is what we publish.",
        long: true,
      },
      float_cta: { label: "Float or freeze — button", value: "See what moved at your rank" },
      held_title: { label: "Figures panel heading", value: "What the published results hold" },
      held_ranks_label: { label: "Figure 1 label", value: "PG closing ranks, round by round" },
      held_ranks_note: { label: "Figure 1 note — {colleges}, {branches}", value: "Across {colleges} colleges and {branches} branches." },
      held_rounds_label: { label: "Figure 2 label", value: "Rounds our PG data covers" },
      held_rounds_note: { label: "Figure 2 note", value: "Counselling does not stop after round 2, and the numbers show it." },
      held_tight_label: { label: "Figure 3 label", value: "PG seats that tightened after round 1" },
      held_tight_note: {
        label: "Figure 3 note",
        value: "Every later round closed at a better rank than round 1 did. Give one of those up and it is gone.",
        long: true,
      },
      docs_title: { label: "Documents heading", value: "What to have ready" },
      docs_intro: {
        label: "Documents intro",
        value: "Originals, at reporting. A missing certificate on the day is the most avoidable way to lose an allotted seat, and the reporting window is too short to arrange one.",
        long: true,
      },
      docs_note: {
        label: "Documents note",
        value: "Category and PwBD certificates must be in the format the authority prescribes. The right document in the wrong format is treated as a missing document.",
        long: true,
      },
      docs_list: {
        label: "Documents — one per line",
        value: "NEET PG scorecard and rank letter\nMBBS degree certificate and all mark sheets\nInternship completion certificate\nPermanent or provisional medical registration\nClass 10 certificate, for date of birth\nCategory certificate (SC / ST / OBC-NCL / EWS), in the prescribed format\nPwBD certificate from a designated centre, if applicable\nDomicile or state-eligibility proof, for state counselling\nPhoto ID, passport photographs, and the allotment letter",
        long: true,
      },
      mistakes_title: { label: "Mistakes heading — {count}", value: "{count} mistakes that cost people a seat" },
    },
  },
  "page.services.figures": {
    group: "Page: Services — the team's own figures",
    fields: {
      students: { label: "Students guided (the team's figure)", value: "2100+" },
      years: { label: "Years of counselling (the team's figure)", value: "15+" },
    },
  },
  "page.services": {
    group: "Page: Services",
    fields: {
      hero_badge: { label: "Hero badge", value: "Expert NEET Counselling" },
      hero_title: { label: "Hero title", value: "Your Unfair Advantage in" },
      hero_accent: { label: "Hero title, coloured part", value: "MBBS Admissions" },
      hero_subtitle: {
        label: "Hero line — {students}",
        value: "While others guess, our students get data-driven strategy, two years of published closing ranks, and dedicated counsellors who've guided {students} students to their dream medical colleges. Every rank has a best-fit seat — we find yours.",
        long: true,
      },
      hero_points: {
        label: "Hero points — one per line",
        value:
          "1-on-1 Personalized counseling with senior experts\nEvery shortlist backed by the published closing rank it came from\nFee packages negotiated directly with colleges, confirmed in writing\nEvery document pre-checked weeks before your reporting date",
        was: [
          "1-on-1 Personalized counseling with senior experts\nEvery shortlist backed by the published closing rank it came from\nEvery document pre-checked weeks before your reporting date",
        ],
        long: true,
      },
      hero_call: { label: "Hero call button", value: "Talk to an Expert" },
      hero_whatsapp: { label: "Hero WhatsApp button", value: "WhatsApp Us" },
      hero_whatsapp_message: { label: "WhatsApp opening message", value: "Hi, I want to know about your NEET counselling services" },
      stat_students: { label: "Stats bar: students label", value: "Students Guided" },
      stat_ranks: { label: "Stats bar: closing ranks label", value: "Closing Ranks" },
      stat_years: { label: "Stats bar: years label", value: "Years Experience" },
      stat_states: { label: "Stats bar: states label", value: "States Covered" },
      why_badge: { label: "Why us — badge", value: "Why Admission Hands" },
      why_title: { label: "Why us — heading", value: "The" },
      why_accent: { label: "Why us — heading, coloured part", value: "Competitive Edge" },
      why_title_end: { label: "Why us — heading, after the coloured part", value: "You Deserve" },
      why_intro: {
        label: "Why us — intro — {students}",
        value: "NEET counselling is a high-stakes, zero-margin-for-error process. Here's why {students} families trusted us with their child's medical career.",
        long: true,
      },
      why_1_title: { label: "Why 1", value: "Data, Not Opinions" },
      why_1_desc: {
        label: "Why 1 text — {closing_ranks}",
        value: "Our recommendations are backed by {closing_ranks} published closing ranks across every college in the counselling, and real allotment outcomes — not surface-level guesswork.",
        long: true,
      },
      why_2_title: { label: "Why 2", value: "Dedicated Counsellor" },
      why_2_desc: {
        label: "Why 2 text",
        value: "You get a single, named expert assigned to your case from Day 1 to final admission. No rotating call-centre staff, no repeated explanations.",
        long: true,
      },
      why_3_title: { label: "Why 3", value: "Documents Checked Early" },
      why_3_desc: {
        label: "Why 3 text",
        value: "We check every document against your state's requirements weeks before the deadline, so a missing certificate is found while there is still time to get it.",
        long: true,
      },
      services_badge: { label: "Services — badge", value: "Our Services" },
      services_title: { label: "Services — heading", value: "Complete" },
      services_accent: { label: "Services — heading, coloured part", value: "Admission Support" },
      services_title_end: { label: "Services — heading, after the coloured part", value: "System" },
      services_intro: {
        label: "Services — intro — {count}",
        value: "{count} specialized services covering every phase of NEET counselling — from score analysis to college reporting.",
        long: true,
      },
      details_show: { label: "Service card: show details", value: "View" },
      details_hide: { label: "Service card: hide details", value: "Hide" },
      how_title: { label: "How it works — heading", value: "How It" },
      how_accent: { label: "How it works — heading, coloured part", value: "Works" },
      how_intro: { label: "How it works — intro", value: "From first call to final admission — a streamlined, expert-guided process." },
      step_1_title: { label: "Step 1", value: "Free Consultation" },
      step_1_desc: { label: "Step 1 text", value: "Share your NEET score, category, and preferences. We assess your options in a free call.", long: true },
      step_2_title: { label: "Step 2", value: "Strategy Blueprint" },
      step_2_desc: { label: "Step 2 text", value: "Receive a personalized admission strategy with target colleges, timelines, and budget breakdown.", long: true },
      step_3_title: { label: "Step 3", value: "Active Counselling" },
      step_3_desc: { label: "Step 3 text", value: "We manage your MCC/State registrations, choice filling, and real-time decision-making across all rounds.", long: true },
      step_4_title: { label: "Step 4", value: "Seat Secured" },
      step_4_desc: { label: "Step 4 text", value: "From allotment letter to physical reporting — we make sure no formality is missed.", long: true },
      cta_title: { label: "Closing band — heading", value: "Start with the free call" },
      cta_body: {
        label: "Closing band — text",
        value: "Twenty minutes, your actual rank and budget, and a straight read on what is reachable. No obligation after it.",
        long: true,
      },
      cta_button: { label: "Closing band — button", value: "Book my free call" },
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
  "page.college_pg.mcc": {
    group: "Page: PG college pages — MCC seats, bond and stipend",
    fields: {
      seats_eyebrow: { label: "Seats eyebrow — {year}", value: "MCC seat matrix · {year}" },
      seats_title: { label: "Seats heading — {college}, {year}", value: "{college} seats in MCC's {year} counselling" },
      seats_intro: {
        label: "Seats line — {total}, {year}",
        value:
          "{total} seats at this college are filled through MCC in {year}, course by course and category by category. MCC fills the All India Quota, every seat at a deemed university, the central universities' own quotas and DNB seats. State-quota seats go through the state's own counselling and are not counted here.",
        long: true,
      },
      seats_source: {
        label: "Seats source line — {year}",
        value: "From the NEET PG {year} seat matrix published by the Medical Counselling Committee (MCC).",
        long: true,
      },
      seats_pwd: { label: "Seats note, when a PwD column shows", value: "PwD seats are counted once, in the PwD column." },
      seats_total: { label: "Seats table, total row", value: "All seats MCC fills here" },
      seats_link: { label: "Link to the full seat matrix — {year}", value: "The whole {year} seat matrix" },
      terms_eyebrow: { label: "Terms eyebrow — {year}", value: "Bond, stipend and exit · {year}" },
      terms_title: { label: "Terms heading — {college}", value: "Bond, stipend and seat-leaving rules at {college}" },
      terms_intro: {
        label: "Terms line — {year}",
        value:
          "What each type of seat here pays and binds you to: the stipend in each year, the service bond, and the penalty for leaving the seat once you have joined. As listed for the {year} counselling.",
        long: true,
      },
      terms_caveat: {
        label: "Terms caveat",
        value:
          "Compiled from counselling notices and college fee schedules by a third-party data service. This is not an official notice. Bond and penalty rules change from year to year, so confirm them in the state's notice or with the college before you pay a fee or sign a bond.",
        long: true,
      },
      terms_stipend: { label: "Card label: stipend", value: "Stipend a month" },
      terms_bond: { label: "Card label: bond", value: "Service bond" },
      terms_exit: { label: "Card label: leaving the seat", value: "Leaving the seat" },
      terms_hostel: { label: "Card label: hostel", value: "Hostel" },
      terms_more: { label: "Button: more seat types — {count}", value: "{count} more seat types" },
      terms_link: { label: "Link to the bond page", value: "Every state's PG bond, side by side" },
    },
  },
  "page.pg_branch.mcc": {
    group: "Page: PG branch pages — MCC seats",
    fields: {
      title: { label: "Heading — {branch}, {year}", value: "{branch} seats in MCC's {year} counselling" },
      intro: {
        label: "Line — {branch}, {total}, {colleges}, {year}",
        value:
          "{total} {branch} seats at {colleges} colleges are filled through MCC in {year}. MCC's matrix covers the All India Quota, deemed universities, central universities' own quotas and DNB. State-quota seats are counted by each state's own counselling.",
        long: true,
      },
      source: { label: "Source line — {year}", value: "From the NEET PG {year} seat matrix published by the Medical Counselling Committee (MCC).", long: true },
      link: { label: "Link to the full seat matrix — {year}", value: "The whole {year} seat matrix, branch by branch" },
      by_matrix: { label: "Card heading: by seat matrix", value: "By seat matrix" },
      by_category: { label: "Card heading: by category", value: "By category" },
      top_states: { label: "Line before the top states", value: "Most seats in" },
    },
  },
  "page.pg_seat_matrix.hero": {
    group: "Page: NEET PG seat matrix",
    fields: hero({
      eyebrow: { label: "Hero eyebrow — {year}", value: "NEET PG {year} · MCC" },
      title: { label: "Hero title — {year}", value: "NEET PG seat matrix {year}:" },
      accent: { label: "Hero title, coloured part", value: "every seat MCC fills" },
      subtitle: {
        label: "Hero line — {total}, {year}",
        value:
          "{total} MD, MS, diploma and DNB seats in MCC's {year} counselling, by branch, by state and by category. That includes the All India Quota, deemed universities, central universities' quotas and DNB.",
        long: true,
      },
      cta: { label: "Hero button", value: "Enter your PG rank — see your chances" },
      source: {
        label: "Source line — {year}, {years}",
        value:
          "From the NEET PG {year} seat matrix and MCC's {years} round results, both published by the Medical Counselling Committee. State-quota seats go through each state's own counselling and are not in MCC's matrix.",
        long: true,
      },
      visual_title: { label: "Chart title", value: "Branches with the most seats" },
      visual_caption: { label: "Chart caption — {year}", value: "Seats in MCC's {year} matrix" },
      faq_title: { label: "FAQ heading — {year}", value: "NEET PG seat matrix {year}: common questions" },
    }),
  },
  "page.pg_seat_matrix.body": {
    group: "Page: NEET PG seat matrix — body",
    fields: {
      insight_branch: { label: "Card: largest branch", value: "Most seats" },
      insight_state: { label: "Card: state with most seats", value: "Top state" },
      insight_upgrades: { label: "Card: upgrades — {year}", value: "Upgrades after round 1, {year}" },
      insight_upgrades_note: { label: "Card note: upgrades", value: "candidates moved to a seat they ranked higher" },
      insight_colleges: { label: "Card: colleges in the All India Quota", value: "Colleges in the All India Quota" },
      matrix_title: { label: "Seat matrices heading", value: "What MCC fills, matrix by matrix" },
      matrix_intro: {
        label: "Seat matrices line",
        value: "MCC runs one counselling with several seat matrices in it. Each one has its own eligibility, fee and rules.",
        long: true,
      },
      aiq_note: { label: "What the AIQ row means", value: "Half of every government college's MD/MS seats, open to candidates from any state." },
      deemed_note: { label: "What the Deemed row means", value: "Every seat at a deemed university, including its management (paid), NRI and minority seats." },
      central_note: {
        label: "What the central-universities row means",
        value: "Seats that Delhi University, IP University, AMU and BHU keep for their own graduates. MCC fills them.",
      },
      dnb_note: { label: "What the DNB row means", value: "National Board seats at accredited hospitals: DNB (three years) and the two-year NBE diploma." },
      category_title: { label: "Category heading — {year}", value: "All India Quota seats by category, {year}" },
      category_intro: {
        label: "Category line",
        value: "How the All India Quota's seats are reserved between the categories, as MCC's matrix lists them.",
        long: true,
      },
      branch_title: { label: "Branch heading", value: "Seats by branch" },
      branch_intro: {
        label: "Branch line",
        value: "Every MD, MS, diploma and DNB course in the matrix, largest first. Open a branch for how it filled in each quota and category.",
        long: true,
      },
      state_title: { label: "State heading", value: "Seats by state" },
      state_intro: {
        label: "State line",
        value: "Where the seats are. These are only the seats MCC fills, so a state's own quota seats come on top.",
        long: true,
      },
      rounds_title: { label: "Rounds heading", value: "How many seats changed hands in each round" },
      rounds_intro: {
        label: "Rounds line",
        value:
          "From MCC's published results. A fresh allotment is a candidate with no seat before that round. An upgrade is a candidate who already held a seat and moved to one they ranked higher.",
        long: true,
      },
      rounds_takeaway: {
        label: "Rounds takeaway — {upgraded}, {year}",
        value:
          "{upgraded} candidates moved to a better seat in later rounds of the {year} counselling. Deciding whether to float or freeze a seat matters, so plan it before round 1.",
        long: true,
      },
      faq1_q: { label: "Question 1 — {year}", value: "How many seats are in the NEET PG {year} seat matrix?" },
      faq1_a: {
        label: "Answer 1 — {total}, {aiq}, {deemed}, {central}, {dnb}, {year}",
        value:
          "MCC's {year} seat matrix lists {total} seats: {aiq} in the All India Quota, {deemed} at deemed universities, {central} in the central universities' own quotas and {dnb} DNB and NBE diploma seats. State-quota seats are counted separately by each state.",
        long: true,
      },
      faq2_q: { label: "Question 2", value: "Does the MCC seat matrix include state quota seats?" },
      faq2_a: {
        label: "Answer 2",
        value:
          "No. MCC fills the All India Quota (half of a government college's MD/MS seats), deemed universities, the central universities' quotas and DNB. The other half of government seats, and private colleges' seats, go through each state's own counselling, which publishes its own seat matrix.",
        long: true,
      },
      faq3_q: { label: "Question 3", value: "Which branch has the most PG seats?" },
      faq3_a: {
        label: "Answer 3 — {top_branch}, {top_branch_seats}, {second_branch}, {second_branch_seats}",
        value:
          "In MCC's matrix, {top_branch} has the most seats ({top_branch_seats}), followed by {second_branch} ({second_branch_seats}). The branch table on this page lists every course.",
        long: true,
      },
      faq4_q: { label: "Question 4 — {year}", value: "How many seats are reserved for each category in NEET PG {year}?" },
      faq4_a: {
        label: "Answer 4 — {open}, {ews}, {obc}, {sc}, {st}",
        value:
          "MCC's All India Quota matrix lists {open} open, {ews} EWS, {obc} OBC, {sc} SC and {st} ST seats. The category table on this page shows each one's share.",
        long: true,
      },
      faq5_q: { label: "Question 5", value: "Do seats really move after round 1?" },
      faq5_a: {
        label: "Answer 5 — {year}, {r2_upgraded}, {r3_upgraded}",
        value:
          "Yes. In MCC's {year} results, {r2_upgraded} candidates were upgraded in round 2 and {r3_upgraded} in round 3. Every upgrade frees a seat for the next candidate, which is why later rounds can reach much further down the merit list.",
        long: true,
      },
      lead_title: { label: "Enquiry box heading", value: "Which of these seats should be on your list?" },
      lead_body: {
        label: "Enquiry box line",
        value: "A counsellor takes the seat matrix, your rank and your budget, and builds the choice list with you, in the order to fill it.",
        long: true,
      },
    },
  },
  "page.pg_bond.hero": {
    group: "Page: PG service bond",
    fields: hero({
      eyebrow: { label: "Hero eyebrow", value: "MD/MS · service bond" },
      title: { label: "Hero title", value: "PG medical bond," },
      accent: { label: "Hero title, coloured part", value: "state by state" },
      subtitle: {
        label: "Hero line — {colleges}, {states}",
        value:
          "How many years each state binds an MD/MS graduate to government service, what breaking that bond costs, and the penalty for leaving a seat once you have joined. Covers {colleges} colleges in {states} states.",
        long: true,
      },
      cta: { label: "Hero button", value: "Check your PG chances" },
      source: {
        label: "Source line — {year}",
        value:
          "As listed for the {year} counselling, compiled from counselling notices and college fee schedules by a third-party data service. This is not an official notice. Confirm with the state's notice or the college before you pay a fee or sign a bond.",
        long: true,
      },
      visual_title: { label: "Chart title", value: "Bond penalty on government seats" },
      visual_caption: { label: "Chart caption", value: "Middle penalty for not serving the bond" },
    }),
  },
  "page.pg_bond.body": {
    group: "Page: PG service bond — body",
    fields: {
      states_title: { label: "State table heading", value: "Service bond on government PG seats, by state" },
      states_intro: {
        label: "State table line",
        value:
          "Government colleges, on their All India and state-quota MD/MS seats. A college counts as having a bond when any of those seats lists one. A state's penalty is shown only where at least three colleges list one: the middle value, with the usual range under it where colleges differ.",
        long: true,
      },
      private_title: { label: "Private colleges heading", value: "Private, deemed and society-run colleges" },
      private_intro: {
        label: "Private colleges line",
        value:
          "In some states a bond reaches private-college seats too. This table shows, state by state, how many private, deemed and society-run colleges list one on any of their seats, what leaving a seat usually costs, and how many keep the whole course fee if you leave.",
        long: true,
      },
      faq_title: { label: "FAQ heading", value: "PG service bond: common questions" },
      list_title: { label: "College list heading", value: "Every government college's bond" },
      list_intro: {
        label: "College list line",
        value: "Open a state to see each government college's bond, penalty, seat-leaving terms and first-year stipend. Each college's page has its terms seat type by seat type.",
        long: true,
      },
      faq1_q: { label: "Question 1", value: "Is there a bond for MD/MS in government medical colleges?" },
      faq1_a: {
        label: "Answer 1 — {govt_bonded}, {govt_colleges}",
        value:
          "{govt_bonded} of the {govt_colleges} government colleges listed here have a service bond on their MD/MS seats: a period of government service after the course, with a penalty for not serving it. Each state sets the length and the penalty. The state table on this page shows both.",
        long: true,
      },
      faq2_q: { label: "Question 2", value: "How long is the PG service bond?" },
      faq2_a: {
        label: "Answer 2 — {one_year}, {two_year}, {three_year}",
        value:
          "Among the government colleges listed here, {one_year} have a one-year bond, {two_year} a two-year bond and {three_year} a three-year bond. The state table shows each state's usual length.",
        long: true,
      },
      faq3_q: { label: "Question 3", value: "What is the penalty for breaking a PG bond?" },
      faq3_a: {
        label: "Answer 3 — {penalty_median}, {penalty_low}, {penalty_high}",
        value:
          "It varies by state. Across the government colleges listed here, the middle penalty is {penalty_median}, and most fall between {penalty_low} and {penalty_high}. The state table gives each state's own figure.",
        long: true,
      },
      faq4_q: { label: "Question 4", value: "What happens if I leave a PG seat after joining?" },
      faq4_a: {
        label: "Answer 4 — {exit_colleges}, {all_colleges}, {exit_median}",
        value:
          "{exit_colleges} of the {all_colleges} colleges listed here charge a seat-leaving penalty, and the middle figure is {exit_median}. Some also bar you from counselling for a few years. The terms can depend on the round you leave in, so read them before you join a seat you might give up.",
        long: true,
      },
      faq5_q: { label: "Question 5", value: "Do private medical colleges have a PG bond?" },
      faq5_a: {
        label: "Answer 5 — {private_colleges}, {private_bonded}, {private_bond_states}",
        value:
          "Some do. Of the {private_colleges} private, deemed and society-run colleges listed here, {private_bonded} list a service bond on at least one type of seat, most of them in {private_bond_states}. The private-colleges table shows every state.",
        long: true,
      },
      insight_bonded: { label: "Card: government colleges with a bond", value: "Government colleges with a bond" },
      insight_penalty: { label: "Card: middle bond penalty", value: "Middle bond penalty" },
      insight_exit: { label: "Card: middle seat-leaving penalty", value: "Middle seat-leaving penalty" },
      insight_private: { label: "Card: private colleges with a bond", value: "Private colleges with a bond" },
      lead_title: { label: "Enquiry box heading", value: "Can you serve the bond that comes with the seat?" },
      lead_body: {
        label: "Enquiry box line",
        value: "A counsellor weighs each seat's stipend, bond and seat-leaving penalty against your plans, before you lock a choice you cannot easily leave.",
        long: true,
      },
    },
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

/**
 * Profile links that join the other social.* settings ("Social links" in Admin → Content).
 * The Google Business Profile goes into the homepage's Organization `sameAs` and the
 * footer's address links to it.
 */
export const SOCIAL_SETTINGS: { key: string; label: string; value: string }[] = [
  {
    key: "social.google",
    label: "Google Business Profile link (https://www.google.com/maps?cid=…)",
    value: "https://www.google.com/maps?cid=15474144466729356168",
  },
];

export type CopyKey = keyof typeof PAGE_COPY;
export type CopyFields<K extends CopyKey> = { [F in keyof (typeof PAGE_COPY)[K]["fields"]]: string };
