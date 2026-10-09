/**
 * MCC's NEET PG counselling schedule, typed in from its own notices (read
 * 2026-10-09). /neet-pg-process said "we do not publish dates here", while every
 * page ranking for "neet pg counselling process" led with this schedule.
 *
 * Tentative by MCC's own word, and revised mid-cycle in most years: when the
 * alert feed carries a "revised schedule" notice, update this file from it.
 * Replace the whole object each cycle. No imports.
 */

export type ScheduleRound = {
  round: string;
  aiq: string;
  aiqJoinBy: string;
  state: string;
  stateJoinBy: string;
};

export const NEET_PG_SCHEDULE = {
  year: 2026,
  notified: "7–8 October 2026",
  sessionStarts: "20 November 2026",
  sources: [
    {
      label: "NEET-PG schedule 2026 — AIQ, deemed, central and state quota (MCC)",
      url: "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/10/202610081115756031.pdf",
    },
    {
      label: "Tentative schedule, AIQ and deemed PG counselling 2026, round by round (MCC)",
      url: "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/10/202610071411981089.pdf",
    },
  ],
  rounds: [
    { round: "Round 1", aiq: "12 – 24 Oct", aiqJoinBy: "2 Nov", state: "21 Oct – 2 Nov", stateJoinBy: "10 Nov" },
    { round: "Round 2", aiq: "6 – 14 Nov", aiqJoinBy: "23 Nov", state: "14 – 23 Nov", stateJoinBy: "30 Nov" },
    { round: "Round 3", aiq: "26 Nov – 4 Dec", aiqJoinBy: "12 Dec", state: "4 – 12 Dec", stateJoinBy: "18 Dec" },
    { round: "Stray vacancy", aiq: "16 – 24 Dec", aiqJoinBy: "31 Dec", state: "22 – 25 Dec", stateJoinBy: "31 Dec" },
  ] as ScheduleRound[],
};
