/**
 * College pages that were one college held twice (2026-11-09, scripts/ug/merge_ug_twins.mjs): the twin's rows now
 * sit on the kept entry, the twin is switched off, and its old URL answers 308 to the kept page so links and search
 * results carry over. Import-free, so the page and the sitemap can both read it.
 */
export const MERGED_UG_COLLEGES: Record<string, string> = {
  "government-medical-college-bhawanipatna-ug": "saheed-rendo-majhi-medical-college-hospital-bhawanipatna-kalahandi-odisha-ug",
  "government-medical-college-bhadradri-telangana-ug": "government-medical-college-bhadradri-kothagudem-ug",
  "coochbehar-government-medical-college-hospital-coochbehar-west-bengal-ug": "maharaja-jitendra-narayan-medical-college-and-hospital-coochbehar-ug",
  "government-medical-college-shivpuri-mp-ug": "shrimant-rajmata-vijayaraje-scindia-medical-college-shivpuri-ug",
  "shilong-medical-college-meghalaya-ug": "shillong-medical-college-smc-ug",
  "government-medical-college-banda-ug": "government-allopathic-medical-collegebanda-uttar-pradesh210001-ug",
  "government-kilpauk-medical-collegechennai-ug": "kilpauk-medical-college-chennai-ug",
  "irt-perundurai-medical-college-perundurai-ug": "government-erode-medical-college-hospital-perundurai-formerly-irt-perundurai-medical-college-ug",
  "government-thiruvannamalai-medical-college-thiruvannamalai-ug": "thiruvannamalai-medical-college-thiruvannamalai-ug",
  "purulia-government-medical-college-hospital-purulia-ug": "deben-mahato-sadar-hospital-dist-purulia-west-bengal-ug",
  "sagar-dutta-medical-college-and-hospital-kolkata-ug": "college-of-medicine-and-sagore-dutta-hospital-kolkata-ug",
  "esic-medical-college-hospital-and-super-specialty-hospital-sanath-nagar-hyderabad-500038-ug": "employees-state-insurance-coporation-medical-collegehyderabad-ug",
  "autonomous-state-medical-college-akbarpur-ug": "autonomous-state-medical-college-kanpur-dehat-ug",
  "government-medical-college-gokuldas-tejpal-hospital-premises-mumbai-maharashtra-ug": "government-medical-college-mumbai-ug",
  "autonomous-state-medical-college-rajarshi-dashrath-vill-ganja-post-dabha-semar-ayodhya-uttar-pradesh-224133-ug": "government-medical-college-faizabad-ug",
  "maharashtra-post-graduate-institute-of-medical-education-and-research-ug":
    "government-medical-college-nashikhindu-hruday-samrat-vandaniya-balasaheb-thakare-hospital-and-bytco-hospital-near-durga-mata-mandir-m-maharashtra-422214-ug",
  "duplicate-government-sivagangai-medical-college-and-hospital-chennai-ug": "government-sivagangai-medical-college-sivaganga-ug",
  "autonomous-state-medical-college-bahraich-ug": "rajkiya-allopathic-medical-college-bahraich-up-ug",
  "autonomous-state-medical-college-society-and-snm-district-hospital-daulattapur-jalesar-roadnarkhi-firozabad-uttar-pradesh-283203-701244-ug":
    "government-medical-college-firozabad-ug",
  "shri-vinobha-bhave-institute-medical-sciences-silvasa-ug": "namo-medical-education-and-research-institute-also-known-as-government-medical-college-silvassa-ug",
};
