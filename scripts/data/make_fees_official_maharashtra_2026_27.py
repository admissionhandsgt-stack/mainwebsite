"""Maharashtra NEET PG fees for 2026-27 from official sources only, for scripts/poster/state_fees_xlsx.py --official.

    python scripts/data/make_fees_official_maharashtra_2026_27.py   ->  scripts/data/fees_official_maharashtra_2026_27.json

Read on 2026-10-25 (owner: "2026-2027 session ki new updated fees … NRI fees USD mai bhi"):
- Government and municipal colleges, central institutions: State CET Cell, NEET-PG 2026 Information Brochure
  (statecetcell S3, updated 16 Oct 2026), section 16, brochure p. 37.
- Private colleges: Fees Regulating Authority's fee search for A.Y. 2026-27 (ay26-27.mahafraportal.org, MDMS) —
  one approved fee a year per college, every branch. Management and NRI quota: FRA notice 1090/2023 (10 Nov 2023,
  still on FRA's notice board): MD/MS up to 4 times (Management/Institutional) and 5 times (NRI) the regular fee,
  and never more than one year's fee in a year. Those two are maximums and are marked so.
- Deemed universities: each university's own 2026-27 PG fee notice (page or PDF named in its entries).
Branch names are the sheet's printed names. Seats a counselling does not offer are not added by the builder.
"""

import json
from pathlib import Path

OUT = Path(__file__).with_name("fees_official_maharashtra_2026_27.json")
Y = "2026-27"
CET = "State CET Cell, NEET-PG 2026 Information Brochure (16 Oct 2026), section 16, p. 37"
entries = []


def add(college, seat, branches, inr=None, usd=None, source="", maximum=False, none=False):
    entries.append({"college": college, "seat": seat, "branches": branches, "fee_inr": inr, "fee_usd": usd,
                    "max": maximum, "none": none, "year": Y, "source": source})


def hostel(college, text, source):
    entries.append({"college": college, "seat": "Hostel", "text": text, "year": Y, "source": source})


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
    hostel(c, "₹4,000 a year", CET)
for c, fee in (("Tata Memorial", 105500), ("Bhabha Atomic", 75500), ("Mahatma Gandhi Institute of Medical Sciences, Sevagram", 495250)):
    for seat in ("Gen", "AIQ"):
        add(c, seat, "*", inr=fee, source=f"{CET}: central government institutions, total fee for 2026-27")
note("Bhabha Atomic", "Lapse of seat: ₹10 L penalty; bond 1 year / ₹25 L (CET Cell brochure)", CET)
note("Tata Memorial", "Lapse of seat: ₹10 L penalty (CET Cell brochure)", CET)
note("Mahatma Gandhi Institute of Medical Sciences, Sevagram", "Not completing the course / lapse of seat: ₹20 L; 1-year bond or ₹50 L (CET Cell brochure)", CET)
note("All India Institute of Physical Medical", "2026-27 fee: university fees as per MUHS + ₹10,000 refundable deposit; lapse of seat ₹20 L (CET Cell brochure)", CET)

# ------------------------------------------------------------------ private colleges: FRA 2026-27 (total = tuition + development)
FRA = "FRA Maharashtra, fee approved for A.Y. 2026-27 (ay26-27.mahafraportal.org, MDMS)"
FRA_RULE = "FRA notice 1090/2023 (10 Nov 2023): MD/MS Management/Institutional quota up to 4×, NRI quota up to 5× the regular fee"
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
for c, (tuition, dev, total, status, meeting) in PRIVATE.items():
    src = f"{FRA}: tuition ₹{tuition:,} + development ₹{dev:,}, {status.lower()}, meeting {meeting}"
    add(c, "Gen", "*", inr=total, source=src)
    add(c, "Mgmt", "*", inr=4 * total, maximum=True, source=f"{FRA_RULE}; 4 × ₹{total:,}")
    add(c, "NRI", "*", inr=5 * total, maximum=True, source=f"{FRA_RULE}; 5 × ₹{total:,}")
for c in ("Dr NY Tasgaonkar", "Dr Rajendra Gode", "Prakash Institute"):
    note(c, "Not in FRA's A.Y. 2026-27 approved list — fees below are as listed; confirm with the college", FRA)

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
       "Dr D Y Patil Vidyapeeth, PG fee structure 2026-27")
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
       "BV (DU) Medical College, Sangli: PG college information 2026-27")

deemed("Krishna Institute of Medical Sciences, Karad",
       "Krishna Vishwa Vidyapeeth: annual fee structure for PG degree (MD/MS) 2026-27 (kvv.edu.in, 10 Oct 2026)",
       [(PRE + ["MD Microbiology"], 300000), (["MD Pharmacology", "MD Community Med."], 500000), (["MD Pathology"], 1500000),
        (["MD Psychiatry"], 2500000), (["MD Anaesthesia", "MS ENT"], 2700000), (["MD Emergency Med."], 3000000),
        (["MS Ophthalmology", "MD Paediatrics", "MS General Surgery"], 3800000),
        (["MD General Medicine", "MS OBG", "MS Orthopaedics"], 4100000), (["MD Radiology", "MD Dermatology"], 4900000)],
       nri_usd=[(["MD Psychiatry", "MS Ophthalmology", "MS General Surgery"], 90000),
                (["MD General Medicine", "MD Radiology", "MD Dermatology"], 120000), (["MS OBG", "MS Orthopaedics"], 100000)])
hostel("Krishna Institute of Medical Sciences, Karad", "₹1,32,000 a year (non-AC) · ₹2,20,000 a year (AC); deposit ₹1,00,000 refundable",
       "Krishna Vishwa Vidyapeeth fee structure 2026-27")
note("Krishna Institute of Medical Sciences, Karad", "Tuition rises 5% every year. Once: eligibility ₹1,00,000; caution ₹25,000 refundable",
     "Krishna Vishwa Vidyapeeth fee structure 2026-27")

deemed("Dr DY Patil Medical College, Kolhapur",
       "D. Y. Patil Education Society (Deemed University), Kolhapur: MD/MS Admissions 2026-27, per year tuition fee (dypatilunikop.org, 24 Oct 2026)",
       [(["MD Radiology"], 4510000), (["MS OBG", "MD Dermatology"], 4010000), (["MD General Medicine", "MS Orthopaedics"], 3610000),
        (["MD Paediatrics"], 3010000), (["MS General Surgery", "MS Ophthalmology"], 3210000), (["MD Pathology"], 1220000),
        (["MS ENT", "MD Anaesthesia"], 2310000), (["MD Psychiatry"], 2710000)],
       nri_usd=[(["MD Radiology", "MS OBG", "MD General Medicine"], 77000), (["MD Dermatology"], 85000), (["MD Paediatrics"], 55000)])
hostel("Dr DY Patil Medical College, Kolhapur", "₹1,60,000 a year (mess not included)", "DY Patil Education Society, Kolhapur, MD/MS Admissions 2026-27")
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
hostel("Rural Medical College, Loni", "RMO hostel ₹75,000 a year (double) / ₹1,25,000 (single); mess ₹35,500", LONI)
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
hostel("Symbiosis Medical College", "Twin ₹2,31,000 · three-sharing ₹1,53,500 · dormitory ₹83,600; mess ₹1,04,000 a year", SMCW)
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
