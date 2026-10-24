"""Maharashtra NEET PG fees for 2026-27 from official sources only, for scripts/poster/state_fees_xlsx.py --official.

    python scripts/data/make_fees_official_maharashtra_2026_27.py   ->  scripts/data/fees_official_maharashtra_2026_27.json

Read on 2026-10-25 (owner: "2026-2027 session ki new updated fees … NRI fees USD mai bhi"):
- Government and municipal colleges, central institutions: State CET Cell, NEET-PG 2026 Information Brochure
  (statecetcell S3, updated 16 Oct 2026), section 16, brochure p. 37.
- Private colleges: each college's own 2026-27 PG fee notice on its website (owner, 2026-10-25: "dont consider FRA as
  final fees, find the college fee on college website"). A college with no 2026-27 notice yet keeps the listing's
  figures, marked so; FRA's approved figure is named in its note for reference only.
- Deemed universities: each university's own 2026-27 PG fee notice (page or PDF named in its entries).
Branch names are the sheet's printed names. Seats a counselling does not offer are not added by the builder.
"""

import json
from pathlib import Path

OUT = Path(__file__).with_name("fees_official_maharashtra_2026_27.json")
Y = "2026-27"
CET = "State CET Cell, NEET-PG 2026 Information Brochure (16 Oct 2026), section 16, p. 37"
entries = []


def inr(n):
    """₹ in Indian digit grouping: 13,20,000."""
    s, tail = str(int(n)), ""
    s, tail = s[:-3], s[-3:]
    while len(s) > 2:
        tail = s[-2:] + "," + tail
        s = s[:-2]
    return "₹" + (s + "," + tail if s else tail)


def add(college, seat, branches, inr=None, usd=None, source="", maximum=False, none=False):
    entries.append({"college": college, "seat": seat, "branches": branches, "fee_inr": inr, "fee_usd": usd,
                    "max": maximum, "none": none, "year": Y, "source": source})


def hostel(college, text, source, lo=None, hi=None):
    """lo/hi: a yearly hostel fee in ₹ when the notice gives one (the fees table's hostel columns); else text only."""
    entries.append({"college": college, "seat": "Hostel", "text": text, "year": Y, "source": source, "min": lo, "max": hi or lo})


def note(college, text, source):
    entries.append({"college": college, "seat": "Note", "text": text, "year": Y, "source": source})


# ------------------------------------------------------------------ government and municipal colleges
GOVT = ["BJ Government Medical College", "Dr Shankarrao Chavan", "Dr Vaishampayan", "Government Medical College & Hospital, Baramati",
        "Government Medical College and Maharashtra Post Graduate", "Government Medical College, Akola", "Government Medical College, Chandrapur",
        "Government Medical College, Chhatrapati Sambhaji Nagar", "Government Medical College, Gondia", "Government Medical College, Jalgaon",
        "Government Medical College, Latur", "Government Medical College, Miraj", "Government Medical College, Nagpur",
        "Government Medical College, Nandurbar", "Grant Medical College", "HBT Medical College", "Indira Gandhi Medical College",
        "Lokmanya Tilak", "Pimpri Chinchwad Municipal", "Postgraduate Institute of Medical Sciences, Navi Mumbai", "Rajarshee Chhatrapati",
        "Rajiv Gandhi Medical College", "Seth GS Medical College", "Shri Vasantrao Naik", "Sri Bhausaheb Hire", "SRTR Medical College",
        "Topiwala National"]
for c in GOVT:
    for seat in ("Gen", "AIQ"):
        add(c, seat, "*", inr=167300, source=f"{CET}: Government and Municipal Corporation medical colleges, tuition ₹1,67,300 a year "
            "+ development ₹5,000, admission ₹1,500, gymkhana ₹500")
    hostel(c, "₹4,000 a year", CET, 4000)
for c, fee in (("Tata Memorial", 105500), ("Bhabha Atomic", 75500), ("Mahatma Gandhi Institute of Medical Sciences, Sevagram", 495250)):
    for seat in ("Gen", "AIQ"):
        add(c, seat, "*", inr=fee, source=f"{CET}: central government institutions, total fee for 2026-27")
note("Bhabha Atomic", "Lapse of seat: ₹10 L penalty; bond 1 year / ₹25 L (CET Cell brochure)", CET)
note("Tata Memorial", "Lapse of seat: ₹10 L penalty (CET Cell brochure)", CET)
note("Mahatma Gandhi Institute of Medical Sciences, Sevagram", "Not completing the course / lapse of seat: ₹20 L; 1-year bond or ₹50 L (CET Cell brochure)", CET)
note("All India Institute of Physical Medical", "2026-27 fee: university fees as per MUHS + ₹10,000 refundable deposit; lapse of seat ₹20 L (CET Cell brochure)", CET)

# ------------------------------------------------------------------ private colleges: FRA 2026-27 (total = tuition + development)
FRA = "FRA Maharashtra, fee approved for A.Y. 2026-27 (ay26-27.mahafraportal.org, MDMS)"
PRIVATE = {  # sheet name start: (tuition, development, total, status, meeting)
    "KJ Somaiyya": (1200000, 120000, 1320000, "Approved", "27-07-2026"),
    "Terna Medical College": (818182, 81818, 900000, "Approved", "27-07-2026"),
    "Maharashtra Institute of Medical Education": (818182, 81818, 900000, "Approved", "27-07-2026"),
    "Dr Vasantrao Pawar": (880000, 110000, 990000, "Approved", "11-06-2026"),
    "ACPM Medical College": (796460, 103540, 900000, "Approved", "27-07-2026"),
    "NKP Salve": (878814, 129186, 1008000, "Approved", "11-06-2026"),
    "Dr Panjabrao": (800000, 100000, 900000, "Approved", "25-08-2026"),
    "Maharashtra Institute of Medical Sciences & Research, Latur": (818182, 81818, 900000, "No upward revision", "30-07-2025"),
    "Dr Vithalrao Vikhe Patil": (782609, 117391, 900000, "No upward revision", "22-07-2025"),
    "Smt Kashibai Navale": (1392001, 173999, 1566000, "Approved", "27-07-2026"),
    "Dr Ulhas Patil": (782609, 117391, 900000, "Approved", "27-07-2026"),
    "Ashwini Rural": (1170732, 125268, 1296000, "Approved", "11-06-2026"),
    "Indian Institute of Medical Science & Research, Jalna": (818182, 81818, 900000, "Approved", "27-07-2026"),
    "SMBT Institute": (1605263, 224737, 1830000, "Approved", "27-07-2026"),
    "BKL Walawalkar": (901323, 121677, 1023000, "No upward revision", "22-07-2025"),
    "Vedantaa": (1594569, 167431, 1762000, "No upward revision", "22-07-2025"),
    "Sancheti": (936937, 103063, 1040000, "No upward revision", "29-07-2025"),
    "Sanjeevan Medical Foundation": (814479, 85521, 900000, "Approved", "27-07-2026"),
    "Postgraduate Institute of Swasthiyog": (830769, 87231, 918000, "No upward revision", "31-07-2025"),
    "Bombay Hospital": (990991, 109009, 1100000, "Approved", "27-07-2026"),
}

def college_fees(college, source, gen=(), mgmt=(), nri_usd=(), nri_inr=()):
    """A college's own notice: [(branches, fee)] per seat column. Gen = state quota, Mgmt = the institutional /
    management (or the college's "All India") quota, NRI in the currency the notice uses."""
    for branches, fee in gen:
        add(college, "Gen", branches, inr=fee, source=source)
    for branches, fee in mgmt:
        add(college, "Mgmt", branches, inr=fee, source=source)
    for branches, fee in nri_usd:
        add(college, "NRI", branches, usd=fee, source=source)
    for branches, fee in nri_inr:
        add(college, "NRI", branches, inr=fee, source=source)


def no_seat(college, seat, branches, source):
    """The college's own 2026-27 notice has no such seat in these branches (its seat matrix, or a "-" in the column)."""
    entries.append({"college": college, "seat": seat, "branches": branches, "fee_inr": None, "fee_usd": None, "max": False,
                    "none": True, "noseat": True, "year": Y, "source": source})


# A college's own 2026-27 notice wins over FRA (owner, 2026-10-25, with N.K.P. Salve's notice: the FRA figure plus FRA's
# 4×/5× ceiling was not what colleges charge). Two colleges are now under private health-sciences universities (CET
# Cell brochure, Annexure F): N.K.P. Salve (Lata Mangeshkar University) and Vikhe Patil — FRA does not set their fees.
OWN = set()

NKP = ("N.K.P. Salve Institute (constituent unit of Lata Mangeshkar University): interim fees structure for MDMS admission "
       "A.Y. 2026-2027, tuition & development fees per annum (college's notice, sent by the owner)")
OWN.add("NKP Salve")
NKP_FEES = [(["MD Anatomy", "MD Physiology", "MD Biochemistry", "MD Microbiology"], 100000), (["MD Pharmacology"], 475000),
            (["MD Community Med."], 875000), (["MD Pathology"], 1275000), (["MS ENT", "MD Anaesthesia"], 2075000),
            (["MS Ophthalmology"], 3975000), (["MD General Medicine"], 4775000), (["MS OBG"], 4375000),
            (["MD Radiology", "MD Dermatology"], 5475000), (["MS General Surgery", "MS Orthopaedics", "MD Paediatrics"], 4175000),
            (["MD Respiratory Med.", "MD Psychiatry"], 3175000)]
college_fees("NKP Salve", NKP, gen=NKP_FEES,
             nri_usd=[(["MD Pathology"], 20570), (["MS ENT", "MD Anaesthesia"], 33470), (["MS Ophthalmology"], 64115),
                      (["MD General Medicine"], 77020), (["MS OBG"], 70570), (["MD Radiology", "MD Dermatology"], 88310),
                      (["MS General Surgery", "MS Orthopaedics", "MD Paediatrics"], 67340), (["MD Respiratory Med.", "MD Psychiatry"], 51210)])
# Its "All India Quota (45%)" charges the state-quota fee; it sits in the Mgmt column, the CET Cell's institutional seat.
college_fees("NKP Salve", NKP + " — the college's 'All India Quota (45%)' column", mgmt=NKP_FEES)
# The notice prints "-" in the NRI column for the pre- and para-clinical branches.
no_seat("NKP Salve", "NRI", ["MD Anatomy", "MD Physiology", "MD Biochemistry", "MD Microbiology", "MD Pharmacology", "MD Community Med."], NKP)
note("NKP Salve", "Now a constituent unit of Lata Mangeshkar University: State 40% / All India 45% / NRI 15%. Plus university fee "
     "₹1,50,000 a year (NRI US$1,620) and caution money ₹1,00,000 once (US$1,100). Unfilled NRI seats converted to All India "
     "pay 1.5× (e.g. Radiology ₹82,12,500). Fees +5% a year; ₹5 L refundable bond for 1-year service", NKP)

ARMCH = "Ashwini Rural Medical College: fees approved by FRA for A.Y. 2026-27 (armch.org/fra/), every MD/MS branch"
OWN.add("Ashwini Rural")
college_fees("Ashwini Rural", ARMCH, gen=[("*", 1296000)], mgmt=[("*", 5184000)], nri_inr=[("*", 6480000)])
note("Ashwini Rural", "NRI seat given to a non-NRI ('against NRI seat') ₹51,84,000; caution money ₹50,000 once", ARMCH)

CLIN = ["MD General Medicine", "MD Dermatology", "MD Paediatrics", "MD Radiology", "MS General Surgery", "MS Orthopaedics",
        "MS Ophthalmology", "MS OBG"]

BKL = "B.K.L. Walawalkar Rural Medical College: PG degree MD/MS first-year fees structure A.Y. 2026-27 (bklwrmc.com, dated 19/10/2026)"
OWN.add("BKL Walawalkar")
BKL13 = CLIN + ["MD Anaesthesia", "MD Respiratory Med.", "MD Psychiatry", "MS ENT", "MD Radiation Oncology"]
college_fees("BKL Walawalkar", BKL, gen=[(BKL13 + ["MD Pathology"], 1023000), (["MD Community Med."], 500000)],
             mgmt=[(BKL13, 4092000), (["MD Pathology"], 2046000)], nri_inr=[(BKL13, 5115000), (["MD Pathology"], 2046000)])
no_seat("BKL Walawalkar", "Mgmt", ["MD Community Med."], BKL)
no_seat("BKL Walawalkar", "NRI", ["MD Community Med."], BKL)
hostel("BKL Walawalkar", "₹84,000 a year + mess ₹50,000; caution ₹50,000 (refundable)", BKL, 84000)
note("BKL Walawalkar", "State fee = tuition ₹9,01,323 + development ₹1,21,677 (Community Medicine: ₹3,78,323 + ₹1,21,677). "
     "University eligibility fee collected after the last CAP round", BKL)

PDMMC = "Dr. Panjabrao Deshmukh Memorial Medical College: subject-wise tuition fees for PG admission 2026-27, per year (pdmmc.edu.in, 21/10/2026)"
OWN.add("Dr Panjabrao")
PD_PRE = ["MD Anatomy", "MD Physiology", "MD Pharmacology", "MD Microbiology", "MD Community Med."]
PD_CLIN = CLIN + ["MD Psychiatry", "MD Respiratory Med.", "MD Anaesthesia", "MS ENT"]
college_fees("Dr Panjabrao", PDMMC, gen=[(PD_PRE, 600000), (["MD Pathology"] + PD_CLIN, 900000)],
             mgmt=[(PD_PRE, 600000), (["MD Pathology"], 1200000), (PD_CLIN, 3600000)],
             nri_inr=[(PD_PRE, 600000), (["MD Pathology"], 1400000), (PD_CLIN, 4500000)])
hostel("Dr Panjabrao", "₹1,70,000 a year (double-seated) + hostel caution ₹50,000", PDMMC, 170000)
note("Dr Panjabrao", "State 50% / Institutional & against-NRI / NRI 15%. Also: admission ₹1,500, caution ₹50,000, S.A.M.C. fee "
     "₹30,000; MUHS eligibility fees after the last CAP round", PDMMC)

VPMC = ("Dr. Vasantrao Pawar Medical College: fees for PG degree course A.Y. 2026-27 — provisional, pending FRA review "
        "(drvasantraopawarmedicalcollege.com, 19 Oct 2026)")
OWN.add("Dr Vasantrao Pawar")
VP13 = CLIN + ["MD Anaesthesia", "MD Psychiatry", "MD Respiratory Med.", "MS ENT", "MD Pathology"]
college_fees("Dr Vasantrao Pawar", VPMC, gen=[(VP13 + ["MD Pharmacology", "MD Microbiology"], 990000)],
             mgmt=[(VP13, 3960000), (["MD Pharmacology", "MD Microbiology"], 990000)],
             nri_inr=[(VP13, 4950000), (["MD Pharmacology", "MD Microbiology"], 990000)])
hostel("Dr Vasantrao Pawar", "₹5,55,000 once for 3 years (hostel ₹3,30,000 + mess ₹2,25,000)", VPMC)
note("Dr Vasantrao Pawar", "Provisional — pending review with FRA. Also: eligibility ₹90,000, caution ₹50,000, SWF/UDF/mediclaim ₹1,135", VPMC)

VIMS = ("Dr. Vithalrao Vikhe Patil Foundation's Medical College (Dr. Balasaheb Vikhe Patil University): interim fee structure "
        "MD/MS 2026-27, per annum, as approved by the ad-hoc University Fee Regulatory Committee (vimsmch.edu.in, 21.10.2026)")
OWN.add("Dr Vithalrao Vikhe Patil")
VI_CLIN = CLIN
college_fees("Dr Vithalrao Vikhe Patil", VIMS, gen=[(["MD Pathology"], 1500000), (VI_CLIN + ["MD Anaesthesia"], 1795000)],
             mgmt=[(["MD Pathology"], 1500000), (VI_CLIN + ["MD Anaesthesia"], 3590000)],
             nri_inr=[(["MD Pathology"], 1500000), (["MD Anaesthesia"], 3590000), (VI_CLIN, 5385000)])
hostel("Dr Vithalrao Vikhe Patil", "₹1,50,000 a year", VIMS, 150000)
note("Dr Vithalrao Vikhe Patil", "Now under Dr. Balasaheb Vikhe Patil University: State 40% (Gen) / All India 45% (in the Mgmt column) / "
     "NRI 15% — an NRI seat converted to All India pays the NRI fee. Also: university fee ₹1,50,000 once, caution ₹1,00,000 "
     "refundable; no fee scholarship/reimbursement", VIMS)

MIMER = "MIMER Medical College, Talegaon: fee structure for A.Y. 2026-27, PG (MD/MS) (mimer.edu.in, Aug 2026)"
OWN.add("Maharashtra Institute of Medical Education")
add("Maharashtra Institute of Medical Education", "Gen", "*", inr=900000, source=MIMER)
add("Maharashtra Institute of Medical Education", "Mgmt", "*", inr=3600000, maximum=True, source=MIMER + " — 'Upto'")
add("Maharashtra Institute of Medical Education", "NRI", "*", inr=4500000, maximum=True, source=MIMER + " — 'Upto'")
note("Maharashtra Institute of Medical Education", "State fee = tuition ₹8,18,182 + development ₹81,818. Against-NRI seat up to "
     "₹36,00,000; caution ₹50,000 once", MIMER)

MIMSR = "MIMSR Medical College, Latur: fees approved for A.Y. 2026-2027, PG (MD/MS) (mimsr.edu.in, 05/08/2026)"
OWN.add("Maharashtra Institute of Medical Sciences & Research, Latur")
college_fees("Maharashtra Institute of Medical Sciences & Research, Latur", MIMSR, gen=[("*", 900000)], mgmt=[("*", 3600000)],
             nri_inr=[("*", 4500000)])
note("Maharashtra Institute of Medical Sciences & Research, Latur", "State fee = tuition ₹8,18,182 + development ₹81,818. "
     "Against-NRI seat ₹36,00,000; caution ₹50,000 refundable", MIMSR)

SANCHETI = "Sancheti Institute PG College: seats information & fees structure of MS Orthopaedics, A.Y. 2026-2027 (sanchetipgcollege.org, 21 Oct 2026)"
OWN.add("Sancheti")
college_fees("Sancheti", SANCHETI, gen=[("*", 1040000)], mgmt=[("*", 4160000)], nri_inr=[("*", 5200000)])
note("Sancheti", "MS Orthopaedics 20 seats: State 10 (50%), Institutional 7 (35%), NRI 3 (15%). Against-NRI seat ₹41,60,000", SANCHETI)

SANJ = "Sanjeevan Medical Foundation ENT PG Institute: FRA fees structure, Dept. of E.N.T., Academic Year 2026-27 (sanjeevanpgi.com)"
OWN.add("Sanjeevan Medical Foundation")
college_fees("Sanjeevan Medical Foundation", SANJ, gen=[("*", 900000)], mgmt=[("*", 2700000)], nri_inr=[("*", 3600000)])
note("Sanjeevan Medical Foundation", "Against-NRI seat ₹36,00,000; development fee and caution money nil", SANJ)

SKN = "Smt. Kashibai Navale Medical College: PG degree final fee structure for A.Y. 2026-2027 (sknmcgh.org, 21 Oct 2026)"
OWN.add("Smt Kashibai Navale")
SK_1X = ["MD Pharmacology", "MD Microbiology", "MD Community Med.", "MD Pathology", "MD Biochemistry"]
college_fees("Smt Kashibai Navale", SKN, gen=[("*", 1566000)],
             mgmt=[(SK_1X, 1566000), (CLIN + ["MD Respiratory Med."], 6264000), (["MD Psychiatry", "MS ENT"], 4698000), (["MD Anaesthesia"], 3132000)],
             nri_inr=[(SK_1X, 1566000), (CLIN, 7830000), (["MD Respiratory Med."], 6264000), (["MD Psychiatry", "MS ENT"], 4698000),
                      (["MD Anaesthesia"], 3132000)])
hostel("Smt Kashibai Navale", "₹72,000 a year + deposit ₹7,500; mess (optional) ₹41,000", SKN, 72000)
note("Smt Kashibai Navale", "State fee = tuition ₹13,92,001 + development ₹1,73,999. After admission, university registration & "
     "eligibility: State ₹25,000 / Mgmt ₹80,000 / NRI ₹90,000 (+ ₹448 other, ₹5,000 library deposit). Against-NRI = Mgmt fee", SKN)

VED = "Vedantaa Institute of Medical Sciences: PG medical admission (MD/MS) 2026-27, general information (vedantaa.institute, 22.10.2026)"
OWN.add("Vedantaa")
VE_MGMT = ["MD Anaesthesia", "MD Dermatology", "MS ENT", "MD Emergency Med.", "MD General Medicine", "MS General Surgery", "MS OBG",
           "MS Ophthalmology", "MS Orthopaedics", "MD Paediatrics", "MD Pathology", "MD Psychiatry", "MD Radiology"]
VE_NRI = ["MD Anaesthesia", "MD Dermatology", "MD Emergency Med.", "MD General Medicine", "MS General Surgery", "MS OBG",
          "MS Ophthalmology", "MS Orthopaedics", "MD Paediatrics", "MD Psychiatry", "MD Radiology", "MD Respiratory Med."]
VE_PRE = ["MD Anatomy", "MD Forensic Med.", "MD Microbiology", "MD Pharmacology", "MD Community Med."]
college_fees("Vedantaa", VED, gen=[("*", 1762000)], mgmt=[(VE_MGMT, 7048000)], nri_inr=[(VE_NRI, 8810000)])
no_seat("Vedantaa", "Mgmt", VE_PRE + ["MD Respiratory Med."], VED + " — seat matrix 2026-27")
no_seat("Vedantaa", "NRI", VE_PRE + ["MS ENT", "MD Pathology"], VED + " — seat matrix 2026-27")
hostel("Vedantaa", "₹2,60,000 a year (non-AC) / ₹3,10,000 (AC); mess ₹1,25,000", VED, 260000, 310000)
note("Vedantaa", "State 50% / Management 35% / NRI 15%. Also: caution ₹50,000, MUHS eligibility & other ₹1,25,000. The college "
     "is exempt from FRA (G.R. 10.04.2018, under challenge in the High Court)", VED)

SWASTH = "Post Graduate Institute of Swasthiyog Pratishthan, Miraj: fee structure A.Y. 2025-26 (swasthiyog.in)"
OWN.add("Postgraduate Institute of Swasthiyog")
college_fees("Postgraduate Institute of Swasthiyog", SWASTH + "; the college opted for no fee rise in 2026-27 (FRA order, Annexure B, 20 Mar 2026)",
             gen=[("*", 918000)], mgmt=[("*", 3672000)], nri_inr=[("*", 4590000)])
note("Postgraduate Institute of Swasthiyog", "College's own fee sheet is for 2025-26; it chose no fee rise for 2026-27, so the same "
     "fee applies. Against-NRI ₹36,72,000; caution nil", SWASTH)

# A private college that has not put its own 2026-27 PG fee on its website (checked 25 Oct 2026) keeps the listing's
# figures, black, with this note. FRA's approval is named for reference only — the owner's rule (2026-10-25): "dont
# consider FRA as final fees, find the college fee on college website".
NOT_YET = "College's own 2026-27 PG fee is not on its website yet (checked 25 Oct 2026) — figures are as listed earlier; confirm with the college"
for c, (tuition, dev, total, status, meeting) in PRIVATE.items():
    if c in OWN:
        continue
    note(c, f"{NOT_YET}. For reference only, FRA approved {inr(total)} a year (state-quota fee) for 2026-27", FRA)
note("SMBT Institute", "SMBT's own site says it is now deemed to be a university; MCC's 2026 seat matrix does not list it, and the "
     "CET Cell's NEET-PG 2026 brochure still lists it in state counselling", "smbt.edu.in; MCC seat matrix 2026; CET Cell brochure")
for c in ("Dr NY Tasgaonkar", "Dr Rajendra Gode", "Prakash Institute"):
    if c not in OWN:
        note(c, NOT_YET, "college website, checked 25 Oct 2026")

# ------------------------------------------------------------------ deemed universities: their own 2026-27 notices
def deemed(college, source, paid, nri_usd=None, nri_inr=None):
    for branches, fee in paid:
        add(college, "Mgmt", branches, inr=fee, source=source)
    for branches, fee in (nri_usd or []):
        add(college, "NRI", branches, usd=fee, source=source)
    for branches, fee in (nri_inr or []):
        add(college, "NRI", branches, inr=fee, source=source)

PRE = ["MD Anatomy", "MD Physiology", "MD Biochemistry"]
deemed("Dr DY Patil Medical College, Hospital and Research Centre, Pimpri",
       "Dr D Y Patil Vidyapeeth, PG (MD & MS) fee structure for A.Y. 2026-2027 (medical.dpu.edu.in/pg-fee-structure.aspx)",
       [(["MD Dermatology"], 6950000), (["MD Radiology"], 6900000), (["MS OBG", "MS Orthopaedics"], 5500000),
        (["MD Emergency Med.", "MD General Medicine"], 4800000), (["MD Paediatrics"], 4700000),
        (["MS Ophthalmology", "MD Respiratory Med."], 4500000), (["MS General Surgery"], 4000000), (["MD Psychiatry"], 4100000),
        (["MS ENT", "MD Anaesthesia"], 3700000), (["MD Geriatrics"], 3000000), (["MD Pathology"], 1200000),
        (["MD Microbiology", "MD Community Med."], 900000), (["MD Pharmacology"], 700000), (PRE, 100000)],
       nri_usd=[(["MD Dermatology", "MD Radiology", "MS OBG", "MS Orthopaedics", "MD General Medicine"], 130000),
                (["MD Paediatrics", "MS General Surgery"], 110000)])
hostel("Dr DY Patil Medical College, Hospital and Research Centre, Pimpri", "₹3,40,000 (3-seater non-AC, mess included); NRI US$4,600",
       "Dr D Y Patil Vidyapeeth, PG fee structure 2026-27", 340000)
note("Dr DY Patil Medical College, Hospital and Research Centre, Pimpri",
     "Once at admission: registration & eligibility ₹2,00,000 (NRI US$3,000) for clinical branches and Pathology; caution deposit ₹50,000 refundable",
     "Dr D Y Patil Vidyapeeth, PG fee structure 2026-27")

deemed("Bharati Vidyapeeth University Medical College, Pune",
       "Bharati Vidyapeeth (DU) Medical College, Pune: fee structure for PG programmes 2026-2027, annual fee (PDF, 12 Oct 2026)",
       [(PRE + ["MD Microbiology", "MD Community Med.", "MD Pharmacology"], 1050000), (["MD Pathology"], 1965000),
        (["MD Radiology", "MD Dermatology"], 5348000), (["MD Paediatrics", "MS Orthopaedics", "MS OBG"], 4288000),
        (["MD General Medicine"], 4492000), (["MS General Surgery", "MD Emergency Med."], 3865000),
        (["MD Psychiatry", "MD Respiratory Med."], 3527000), (["MD Anaesthesia", "MS ENT", "MS Ophthalmology"], 3681000), (["MD IHBT"], 1775000)],
       nri_usd=[(["MD Radiology", "MD Dermatology"], 130000), (["MD Paediatrics", "MS Orthopaedics"], 100000),
                (["MS OBG", "MD General Medicine"], 110000)])

deemed("Bharati Vidyapeeth Deemed University Medical College & Hospital, Sangli",
       "Bharati Vidyapeeth (DU) Medical College, Sangli: PG (MD/MS) college information 2026-2027, fee structure (PDF, 15 Oct 2026)",
       [(PRE + ["MD Microbiology", "MD Community Med.", "MD Pharmacology"], 1050000), (["MD Pathology"], 1795000),
        (["MD Radiology", "MD Dermatology"], 4903000), (["MD Paediatrics", "MS Orthopaedics", "MS OBG"], 2948000),
        (["MD General Medicine"], 3236000), (["MS General Surgery", "MD Emergency Med.", "MS Ophthalmology"], 2680000),
        (["MD Psychiatry", "MD Anaesthesia", "MS ENT"], 2553000)],
       nri_usd=[(["MD Radiology", "MD Dermatology"], 120000), (["MD Paediatrics", "MS Orthopaedics"], 90000),
                (["MS OBG"], 95000), (["MD General Medicine"], 100000)])
hostel("Bharati Vidyapeeth Deemed University Medical College & Hospital, Sangli", "₹1,10,000 a year per head (shared; mess and AC extra)",
       "BV (DU) Medical College, Sangli: PG college information 2026-27", 110000)

deemed("Krishna Institute of Medical Sciences, Karad",
       "Krishna Vishwa Vidyapeeth: annual fee structure for PG degree (MD/MS) 2026-27 (kvv.edu.in, 10 Oct 2026)",
       [(PRE + ["MD Microbiology"], 300000), (["MD Pharmacology", "MD Community Med."], 500000), (["MD Pathology"], 1500000),
        (["MD Psychiatry"], 2500000), (["MD Anaesthesia", "MS ENT"], 2700000), (["MD Emergency Med."], 3000000),
        (["MS Ophthalmology", "MD Paediatrics", "MS General Surgery"], 3800000),
        (["MD General Medicine", "MS OBG", "MS Orthopaedics"], 4100000), (["MD Radiology", "MD Dermatology"], 4900000)],
       nri_usd=[(["MD Psychiatry", "MS Ophthalmology", "MS General Surgery"], 90000),
                (["MD General Medicine", "MD Radiology", "MD Dermatology"], 120000), (["MS OBG", "MS Orthopaedics"], 100000)])
hostel("Krishna Institute of Medical Sciences, Karad", "₹1,32,000 a year (non-AC) · ₹2,20,000 a year (AC); deposit ₹1,00,000 refundable",
       "Krishna Vishwa Vidyapeeth fee structure 2026-27", 132000, 220000)
note("Krishna Institute of Medical Sciences, Karad", "Tuition rises 5% every year. Once: eligibility ₹1,00,000; caution ₹25,000 refundable",
     "Krishna Vishwa Vidyapeeth fee structure 2026-27")

deemed("Dr DY Patil Medical College, Kolhapur",
       "D. Y. Patil Education Society (Deemed University), Kolhapur: MD/MS Admissions 2026-27, per year tuition fee (dypatilunikop.org, 24 Oct 2026)",
       [(["MD Radiology"], 4510000), (["MS OBG", "MD Dermatology"], 4010000), (["MD General Medicine", "MS Orthopaedics"], 3610000),
        (["MD Paediatrics"], 3010000), (["MS General Surgery", "MS Ophthalmology"], 3210000), (["MD Pathology"], 1220000),
        (["MS ENT", "MD Anaesthesia"], 2310000), (["MD Psychiatry"], 2710000)],
       nri_usd=[(["MD Radiology", "MS OBG", "MD General Medicine"], 77000), (["MD Dermatology"], 85000), (["MD Paediatrics"], 55000)])
hostel("Dr DY Patil Medical College, Kolhapur", "₹1,60,000 a year (mess not included)", "DY Patil Education Society, Kolhapur, MD/MS Admissions 2026-27", 160000)
note("Dr DY Patil Medical College, Kolhapur", "Same fee every year for 3 years; fee includes tuition and development",
     "DY Patil Education Society, Kolhapur, MD/MS Admissions 2026-27")

deemed("Padmashree Dr DY Patil Medical College, Navi Mumbai",
       "Dr D. Y. Patil Medical College, Nerul (D Y Patil Deemed University): fee structure for MD-MS programme 2026-27 (PDF, 12 Oct 2026)",
       [(PRE + ["MD Microbiology", "MD Pharmacology", "MD Forensic Med.", "MD Community Med."], 850000), (["MD Pathology"], 2000000),
        (["MD General Medicine"], 5500000), (["MD Paediatrics", "MD Respiratory Med."], 5000000), (["MD Dermatology"], 8500000),
        (["MS OBG"], 6950000), (["MD Radiology"], 7500000), (["MS General Surgery", "MS Ophthalmology"], 4500000),
        (["MD Anaesthesia"], 3600000), (["MD Psychiatry"], 4200000), (["MS ENT"], 4000000), (["MD Emergency Med."], 4800000),
        (["MS Orthopaedics"], 6300000), (["MD Geriatrics", "MD Family Medicine"], 3200000), (["MD IHBT"], 3000000)],
       nri_usd=[(["MD General Medicine", "MD Paediatrics"], 110000), (["MD Dermatology", "MS OBG", "MD Radiology"], 125000)])
note("Padmashree Dr DY Patil Medical College, Navi Mumbai", "Annual fee rises 2% a year for the next 2 years",
     "D Y Patil University, MD-MS fee structure 2026-27")

MGM = "MGM Medical College: MD/MS tuition fee structure (per year) for AY 2026-27, Kamothe, Navi Mumbai & Chhatrapati Sambhajinagar campus (mgmmcnm.edu.in/admision.html)"
for campus in ("Mahatma Gandhi Missions Medical College, Kamothe", "Mahatma Gandhi Missions Medical College, Aurangabad"):
    deemed(campus, MGM,
           [(PRE + ["MD Microbiology", "MD Pharmacology", "MD Community Med."], 100000), (["MD Pathology", "MD IHBT", "MD Family Medicine"], 2000000),
            (["MD General Medicine", "MD Dermatology", "MD Paediatrics", "MD Radiology", "MS General Surgery", "MS Orthopaedics",
              "MS Ophthalmology", "MS OBG"], 4000000),
            (["MD Respiratory Med.", "MD Anaesthesia", "MD Psychiatry", "MD Emergency Med.", "MD Geriatrics", "MS ENT",
              "MS Traumatology and Surgery"], 3000000)],
           nri_inr=[(["MD General Medicine", "MD Dermatology", "MD Radiology", "MS Orthopaedics", "MS OBG"], 10000000),
                    (["MD Paediatrics", "MS General Surgery", "MS Ophthalmology"], 8000000)])

LONI = "Pravara Institute of Medical Sciences: fees for the academic year 2026-27 (pravara.com/admission-fee.html)"
deemed("Rural Medical College, Loni", LONI,
       [(["MD Anatomy", "MD Physiology", "MD Microbiology", "MD Pharmacology", "MD Community Med.", "MD Forensic Med."], 670000),
        (["MD Pathology"], 1680000), (["MD Anaesthesia", "MD Psychiatry"], 2240000),
        (["MD General Medicine", "MD Paediatrics", "MD Radiology", "MD Radiation Oncology", "MS General Surgery", "MS Ophthalmology",
          "MS Orthopaedics", "MS ENT", "MS OBG"], 3500000)],
       nri_usd=[(["MD Anatomy", "MD Physiology", "MD Microbiology", "MD Pharmacology", "MD Community Med.", "MD Forensic Med."], 35260),
                (["MD Pathology"], 88420), (["MD Anaesthesia", "MD Psychiatry"], 117890),
                (["MD General Medicine", "MD Paediatrics", "MD Radiology", "MD Radiation Oncology", "MS General Surgery", "MS Ophthalmology",
                  "MS Orthopaedics", "MS ENT", "MS OBG"], 184210)])
hostel("Rural Medical College, Loni", "RMO hostel ₹75,000 a year (double) / ₹1,25,000 (single); mess ₹35,500", LONI, 75000, 125000)
note("Rural Medical College, Loni", "Deposit ₹5,000; first-year eligibility fee 5% of tuition", LONI)

SMCW = "Symbiosis Medical College for Women: fee structure for academic year 2026-27 (smcw.edu.in, PG admissions)"
deemed("Symbiosis Medical College", SMCW,
       [(["MD Psychiatry"], 1900000), (["MS ENT"], 2215250), (["MD Anaesthesia"], 2140000), (["MD General Medicine"], 2701450),
        (["MD Paediatrics", "MS Orthopaedics", "MS OBG"], 2574110), (["MS General Surgery", "MS Ophthalmology"], 2331010),
        (["MD Dermatology"], 3900000), (["MD Radiology"], 2900000), (["MD Pathology"], 1400000),
        (PRE + ["MD Microbiology", "MD Pharmacology", "MD Community Med."], 100000)],
       nri_usd=[(["MD Psychiatry"], 47200), (["MS ENT"], 55000), (["MD Anaesthesia"], 53100), (["MD General Medicine"], 67100),
                (["MD Paediatrics", "MS Orthopaedics", "MS OBG"], 63900), (["MS General Surgery", "MS Ophthalmology"], 57900),
                (["MD Dermatology"], 96800), (["MD Radiology"], 72000), (["MD Pathology"], 34750),
                (PRE + ["MD Microbiology", "MD Pharmacology", "MD Community Med."], 2500)])
hostel("Symbiosis Medical College", "Twin ₹2,31,000 · three-sharing ₹1,53,500 · dormitory ₹83,600; mess ₹1,04,000 a year", SMCW, 83600, 231000)
note("Symbiosis Medical College", "Deposit ₹50,000 (NRI: admin US$540 + deposit US$680); 1-year senior residency bond, ₹10 L", SMCW)

AIHER = "AIHER (formerly DMIHER), notification 50 of 2026 dated 08/10/2026: PG fees 2026-27, JNMC and DMMC, tuition per annum"
for college in ("Jawaharlal Nehru Medical College, Sawangi", "Datta Meghe Medical College, Nagpur"):
    deemed(college, AIHER,
           [(PRE, 10000), (["MD Pathology"], 1300000), (["MD Pharmacology", "MD Microbiology", "MD Community Med."], 300000),
            (["MD General Medicine"], 4800000), (["MD Emergency Med."], 3100000), (["MD Dermatology"], 5600000), (["MD Psychiatry"], 2800000),
            (["MD Respiratory Med."], 3700000), (["MS General Surgery", "MS Orthopaedics", "MD Paediatrics"], 4200000),
            (["MS ENT", "MD Anaesthesia"], 2400000), (["MS Ophthalmology"], 4000000), (["MD Radiology"], 5400000), (["MS OBG"], 4500000)],
           nri_usd=[(["MD General Medicine"], 65000), (["MD Dermatology"], 72000), (["MS General Surgery", "MS Orthopaedics", "MD Paediatrics"], 55000),
                    (["MS Ophthalmology"], 48000), (["MD Radiology"], 68000), (["MS OBG"], 58000)])
    note(college, "Plus university fee ₹2,00,000 a year; tuition rises 5% a year; ₹5 L refundable bond for 1-year service", AIHER)

OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{OUT}: {len(entries)} entries")
