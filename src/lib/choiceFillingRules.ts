/**
 * MCC's NEET PG counselling rules for choice filling, locking, upgradation, free exit and resignation — every line
 * from an MCC document (or a court) read on 2026-11-09, with the document named so the page can cite it. Import-free.
 *
 * Re-check each counselling: MCC's 2026 bulletin as posted (8 Oct 2026) carries "DRAFT – V10 05102026" in its text,
 * and 2025 had a revised bulletin mid-way. MCC writes resignation windows as separate notices round by round.
 * Never add a rule here from a coaching site; never say a next-year NEET PG ban applies unless MCC's notice for that
 * year says so (2026's bulletin has none — see SOURCES.d19 and the 2024 notices).
 */

const B = "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads";

export const SOURCES = {
  bulletin: {
    title: "NEET-PG (MD/MS/DNB) Counselling 2026: Information Bulletin & Counselling Scheme",
    by: "MCC, DGHS",
    date: "posted 8 Oct 2026",
    url: `${B}/2026/10/202610082121348550.pdf`,
  },
  notice5: {
    title: "Notice No. 5: schedule for Round 2",
    by: "MCC, DGHS",
    date: "7 Nov 2026",
    url: `${B}/2026/11/20261107776874972.pdf`,
  },
  userGuide: {
    title: "Candidate User Guide: NEET PG Counselling 2026",
    by: "MCC, DGHS",
    date: "Oct 2026",
    url: `${B}/2026/10/202610121388624358.pdf`,
  },
  schedule: {
    title: "Tentative schedule for online counselling, PG 2026",
    by: "MCC, DGHS",
    date: "29 Oct 2026",
    url: `${B}/2026/10/20261029180954707.pdf`,
  },
  notice2024: {
    title: "Notice on resignation once Round 2 is in progress (PG 2024)",
    by: "MCC, DGHS",
    date: "19 Dec 2024",
    url: `${B}/2024/12/2024121981.pdf`,
  },
  stray2024: {
    title: "Notice on the stray vacancy round (PG 2024)",
    by: "MCC, DGHS",
    date: "14 Feb 2025",
    url: `${B}/2025/02/2025021478.pdf`,
  },
  d19: {
    title: "Remika Devi v. NBEMS & Ors., W.P.(C) 2957/2026",
    by: "Delhi High Court",
    date: "20 Mar 2026",
    url: "https://delhihighcourt.nic.in/app/showFileJudgment/JSM20032026CW29572026_173107.pdf",
  },
} as const;
export type SourceKey = keyof typeof SOURCES;

export interface RoundRule {
  round: string;
  choices: string;
  upgrade: string;
  leaving: string;
  /** Short verdict for the table: what leaving costs. */
  exit: string;
  sources: SourceKey[];
}

export const ROUND_RULES: RoundRule[] = [
  {
    round: "Round 1",
    choices: "Fill and lock your choices. You can add, delete and reorder them until you lock; whatever is saved is locked automatically at the time MCC notifies.",
    upgrade: "After the result you choose Freeze (join the seat in person, no upgrade) or Float (documents verified online, and you say yes to an upgrade in round 2 — no visit needed).",
    leaving: "Free exit: a round 1 seat can be left without losing the security deposit, and you can take part in round 2 without registering again. In 2026 MCC allowed resignation of a round 1 seat without forfeiture up to 6:00 PM on 9 Nov 2026.",
    exit: "Free exit",
    sources: ["bulletin", "notice5"],
  },
  {
    round: "Round 2",
    choices: "Fresh choices: round 1's choices do not carry over. Seats allotted in round 1 appear as virtual vacancies you can choose. Holding a round 1 seat without saying yes to an upgrade, you keep it and are not considered in round 2.",
    upgrade: "If you are upgraded, your round 1 seat is cancelled at once and goes to the next candidate; you take relieving online and join the round 2 seat, with no claim on the old one.",
    leaving: "No free exit. A round 2 seat you do not join, or surrender, costs the security deposit. You can still take part in round 3, paying the fee again.",
    exit: "Deposit forfeited",
    sources: ["bulletin"],
  },
  {
    round: "Round 3",
    choices: "Fresh choices again. Holding a round 1 or round 2 seat, you are considered only if you said yes to an upgrade.",
    upgrade: "Upgrades are allowed into round 3. After the round 3 result, reporting is compulsory for every round 3 allottee and for Float candidates not upgraded.",
    leaving: "Once you join a round 3 seat you cannot resign it or upgrade from it. Not joining costs the deposit and takes you out of every further MCC round.",
    exit: "No resignation",
    sources: ["bulletin"],
  },
  {
    round: "Stray vacancy round",
    choices: "Fresh choices; round 3's are not used. Open only to candidates holding no seat in AIQ, state or deemed counselling. A candidate freshly allotted in round 3 who did not join cannot take part, and anyone who joined a state seat by the state's round 3 is removed before it.",
    upgrade: "No upgrade from the stray round.",
    leaving: "You must report and join the seat allotted; otherwise the security deposit is forfeited.",
    exit: "Join or forfeit",
    sources: ["bulletin"],
  },
];

export const DEPOSITS = [
  { who: "Unreserved and EWS, All India Quota", registration: 1000, deposit: 25000 },
  { who: "SC, ST, OBC and PwD, All India Quota", registration: 500, deposit: 10000 },
  { who: "Deemed universities, every category", registration: 5000, deposit: 200000 },
];

export const DEPOSIT_NOTES = [
  "Applying for both All India Quota and deemed universities, you pay only the deemed university's fee and deposit.",
  "The deposit is forfeited if you are allotted a seat in round 2 or a later round and do not join it, or if your admission is cancelled after allotment.",
  "Refunds come only after every round is over, to the account you paid from, without interest; MCC's financial custodian (HLL Lifecare) starts them within 15 days of MCC's notice and completes them within 30.",
];

export const LOCKING_FACTS = [
  "Choices can be changed — added, deleted, reordered — until you lock them.",
  "If you do not lock, the choices you saved are locked automatically at the notified date and time.",
  "Once locked, choices cannot be changed, and MCC will not unlock them on request.",
  "There is no limit on the number of choices; MCC suggests filling 30 to 40.",
  "Each round needs fresh choice filling and locking — earlier rounds' choices do not count.",
];

export const STATE_FACTS = [
  "To take a state seat while holding an All India seat: a Freeze candidate surrenders the AIQ seat at the admitted college; a Float candidate resigns online, which is recorded on MCC's portal.",
  "Leaving the AIQ seat for a state seat follows the round's rule: free in round 1, with forfeiture of the deposit in round 2.",
  "MCC and the states exchange the lists of candidates who joined after each round. A candidate who joined a state seat by the state's round 3 is removed before MCC's stray round, and the states remove MCC's joiners before their own later rounds.",
];
