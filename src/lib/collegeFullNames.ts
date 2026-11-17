/**
 * A college's full official name, where every list we import gives it only as initials (owner, 2026-11-17: the private
 * college keyword sheet names "Dr. Pinnamaneni Siddhartha Institute of Medical Sciences, Gannavaram"; NMC, MCC and the
 * PG source all file it as "Dr. P.S.I. Medical College, Chinoutpalli", and families search "psi medical college").
 * Shown under the H1 and given to the page's markup as another name. The short name stays the page's title, because that
 * is the name searched. Import-free; keyed by slug, both levels. The full name below is as Andhra Pradesh's own NEET UG
 * 2026 allotment list prints it, with NMC's spelling of the village.
 */
export const FULL_NAMES: Record<string, string> = {
  "dr-psi-medical-college-chinoutpalli":
    "Dr. Pinnamaneni Siddhartha Institute of Medical Sciences & Research Foundation, Chinoutpalli, Gannavaram",
  "dr-psi-medical-college-chinoutpalli-ug":
    "Dr. Pinnamaneni Siddhartha Institute of Medical Sciences & Research Foundation, Chinoutpalli, Gannavaram",
};
