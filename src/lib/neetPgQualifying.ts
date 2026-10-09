/**
 * NEET PG minimum qualifying scores, as NBEMS notified them. Typed in from the
 * notices themselves (read 2026-10-09), because this is the number people search
 * "NEET PG cutoff" for — 8 of 9 results on that query lead with it — and the page
 * used to answer only with closing ranks.
 *
 * Qualifying is not admission: it makes a candidate eligible for counselling.
 * The rank a seat closed at is the other half of the page.
 *
 * **Add each year's row when NBEMS declares the result, and a lowered row when
 * the Ministry cuts the percentile** (it has, in most recent years). No imports:
 * the page is a server component today, but this must stay safe to import anywhere.
 */

export type QualifyingRow = { category: string; percentile: string; score: number };
export type QualifyingNotice = {
  year: number;
  label: string;
  /** What the score is out of — 800 until 2025 (200 questions), 720 from 2026 (180). */
  outOf: number;
  date: string;
  source: string;
  rows: QualifyingRow[];
};

export const NEET_PG_QUALIFYING: QualifyingNotice[] = [
  {
    year: 2026,
    label: "NEET PG 2026 — result declared",
    outOf: 720,
    date: "24 September 2026",
    source: "https://natboard.edu.in/viewNotice.php?NBE=RVN5QUxxUG1OY1lVdlZtK2V4emg0Zz09",
    rows: [
      { category: "General / EWS", percentile: "50th", score: 262 },
      { category: "General PwBD", percentile: "45th", score: 244 },
      { category: "SC / ST / OBC (incl. their PwBD)", percentile: "40th", score: 226 },
    ],
  },
  {
    year: 2025,
    label: "NEET PG 2025 — lowered for round 3",
    outOf: 800,
    date: "13 January 2026",
    source: "https://natboard.edu.in/viewNotice.php?NBE=NlZON01lQnErVzZvRXJoM2s1dHBXZz09",
    rows: [
      { category: "General / EWS", percentile: "7th", score: 103 },
      { category: "General PwBD", percentile: "5th", score: 90 },
      { category: "SC / ST / OBC (incl. their PwBD)", percentile: "0th", score: -40 },
    ],
  },
  {
    year: 2025,
    label: "NEET PG 2025 — result declared",
    outOf: 800,
    date: "19 August 2025",
    source: "https://natboard.edu.in/viewNotice.php?NBE=WnNqeCtjTjRvM0kwODBNTXYwN1AvQT09",
    rows: [
      { category: "General / EWS", percentile: "50th", score: 276 },
      { category: "General PwBD", percentile: "45th", score: 255 },
      { category: "SC / ST / OBC (incl. their PwBD)", percentile: "40th", score: 235 },
    ],
  },
];
