/**
 * Who runs each state's NEET counselling, and where (2026-10-18) — the shipped
 * fallback for the admin's `state_authorities` collection, where the team keeps
 * it current. One entry per state, checked in October 2026 against the 2025 and
 * 2026 counselling notices and coverage, and each site loaded.
 *
 * `scope` is what the authority is known to counsel: "UG" for MBBS/BDS, "UG and
 * PG" when it runs MD/MS counselling too. A state not listed here simply shows no
 * card. No imports — the seed script reads this file.
 */

export interface StateAuthority {
  state: string;
  authority: string;
  url: string;
  label: string;
  scope: "UG" | "UG and PG";
  note?: string;
}

export const STATE_AUTHORITIES_CHECKED = "October 2026";

export const STATE_AUTHORITIES: StateAuthority[] = [
  { state: "Karnataka", authority: "Karnataka Examinations Authority (KEA)", url: "https://cetonline.karnataka.gov.in/kea/", label: "cetonline.karnataka.gov.in/kea", scope: "UG and PG" },
  { state: "Maharashtra", authority: "State Common Entrance Test Cell, Maharashtra", url: "https://cetcell.mahacet.org", label: "cetcell.mahacet.org", scope: "UG and PG" },
  {
    state: "Tamil Nadu",
    authority: "Selection Committee, Directorate of Medical Education and Research, Tamil Nadu",
    url: "https://tnmedicalselection.net",
    label: "tnmedicalselection.net",
    scope: "UG and PG",
    note: "The prospectus also names tnmedicalselection.org — both are the Selection Committee's.",
  },
  { state: "Kerala", authority: "Commissioner for Entrance Examinations (CEE), Kerala", url: "https://cee.kerala.gov.in", label: "cee.kerala.gov.in", scope: "UG and PG" },
  { state: "Telangana", authority: "Kaloji Narayana Rao University of Health Sciences (KNRUHS), Warangal", url: "https://knruhs.telangana.gov.in", label: "knruhs.telangana.gov.in", scope: "UG and PG" },
  { state: "Andhra Pradesh", authority: "Dr. NTR University of Health Sciences (NTRUHS), Vijayawada", url: "https://drntr.uhsap.in", label: "drntr.uhsap.in", scope: "UG and PG" },
  { state: "Uttar Pradesh", authority: "Directorate General of Medical Education and Training (DGME), Uttar Pradesh", url: "https://upneet.gov.in", label: "upneet.gov.in", scope: "UG and PG" },
  {
    state: "Rajasthan",
    authority: "NEET UG Medical & Dental Admission/Counselling Board, Rajasthan",
    url: "https://ruhsraj.org",
    label: "ruhsraj.org",
    scope: "UG",
    note: "The board opens a new website every year (2025's was rajugneet2025.in); it acts under the Rajasthan University of Health Sciences, whose site is linked.",
  },
  {
    state: "Gujarat",
    authority: "Admission Committee for Professional Medical Educational Courses (ACPUGMEC; ACPPGMEC for MD/MS)",
    url: "https://medadmgujarat.org",
    label: "medadmgujarat.org",
    scope: "UG and PG",
  },
  { state: "Madhya Pradesh", authority: "Directorate of Medical Education (DME), Madhya Pradesh", url: "https://dme.mponline.gov.in", label: "dme.mponline.gov.in", scope: "UG and PG" },
  { state: "West Bengal", authority: "West Bengal Medical Counselling Committee (WBMCC)", url: "https://wbmcc.nic.in", label: "wbmcc.nic.in", scope: "UG and PG" },
  { state: "Haryana", authority: "Pt. B.D. Sharma University of Health Sciences (UHSR), Rohtak", url: "https://uhsr.ac.in", label: "uhsr.ac.in", scope: "UG and PG" },
  { state: "Punjab", authority: "Baba Farid University of Health Sciences (BFUHS), Faridkot", url: "https://bfuhs.ac.in", label: "bfuhs.ac.in", scope: "UG and PG" },
  { state: "Bihar", authority: "Bihar Combined Entrance Competitive Examination Board (BCECEB)", url: "https://bceceboard.bihar.gov.in", label: "bceceboard.bihar.gov.in", scope: "UG and PG" },
  { state: "Odisha", authority: "Odisha Joint Entrance Examination (OJEE) Committee", url: "https://ojee.nic.in", label: "ojee.nic.in", scope: "UG" },
];
