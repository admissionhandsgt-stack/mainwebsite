"""2026-27 PG fees for every state but Maharashtra, from what was read off each official notice.

    python scripts/data/make_fees_official_2026_27.py <extract.json> [...]   ->  scripts/data/fees_official_<state>_2026_27.json

Input: scripts/data/fees_extract_2026_27/<state>.json — one entry per notice actually read: the college (with our institute
ids), the file or page, its year label, the exact words, and each column's fee for the branches it names. The rule
(owner, 2026-10-25): a private or deemed college's fee comes only from its own notice or its university's; a government
college's from the state's official notice or its own; FRA, fee committees, government fee orders for private colleges
and the counselling authorities' compiled lists are never used; only figures labelled 2026-27. The extracts hold nothing
else, and this script refuses an entry that breaks the rule.

Output: the shape scripts/apply_state_fees.mjs reads. A state's classes (quota code -> the column a notice prints) are
below; the apply step reports any code they miss. Entries this script cannot place exactly (a branch name it does not
know, a whole-course figure, a period other than a year) are listed and left out, never guessed.
"""

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fees_official_lib import StateFees  # noqa: E402

COURSES = None  # our PG course names, loaded from the extract's sibling file

# Quota code -> column. First match wins (case-insensitive). NRI before management ("GUJ Mgmt-NRI"), minority before
# management ("TN Mgmt-Telugu Min"); everything a state counsels on merit is Gen.
COMMON = [
    ["NRI", "NRI"],
    ["^(MM|JM)$|Minority|Min\\.? |Min$|Min\\.$|-Min", "Min"],
    ["^AIQ$", "AIQ"],
    ["^MNG$|Mgmt|Management|Mgt|Others \\(Inst|CatB|MQ1|Paid", "Mgmt"],
    ["CatC-Inst|MQ3", "Inst"],
    ["^DNB Post MBBS$|^NBE Diploma$", "DNB"],
    ["DNB|AFMS", "Other"],
    [".", "Gen"],
]
STATE_CLASSES = {
    # Punjab's private-college "Open Quota (AI Basis)" is its management quota.
    "Punjab": [["Open Quota \\(AI Basis\\)", "Mgmt"]],
    # The new government colleges' self-financing seats (G.O.Ms.163/164), apart from private colleges' management seats.
    "Andhra Pradesh": [["^APMgmt-CA SF$", "SF"]],
    # A Karnataka private college's "private seats" carry their own fee, between government quota and management.
    "Karnataka": [["^KAR Priv Seats-(Open|GMP)$", "Priv"]],
    # SMIMS prices Category A (general / North-East / defence) apart from the Sikkim government-nominated quota.
    "Sikkim": [["^Sikkim Gen Quota$", "CatA"]],
    # NAMO's prospectus prices the UT's own seats; its other-state seats are not in the table.
    "Dadra and Nagar Haveli": [["Other State", "OtherState"]],
}
# A quota-less row, by its counselling: the AP/Telangana convener seats, and the new AP government colleges' NRI seats.
NULL_CLASS = {"AP Govt PG": "Gen", "TEL Govt PG": "Gen", "AP Mgmt PG": "NRI"}
# A seat a notice names in its own words ("Other:<label>") -> columns, per state; then the general rules in columns().
STATE_SEATS = {
    "Andhra Pradesh": [("self-financing", ["SF"])],
    # Government colleges' own PG fee is the All India Quota's; KEA's state-quota fee is KEA's (GIMS says so in print).
    "Karnataka": [("^pg degree", ["AIQ"]), ("^private", ["Priv"])],
    "Uttarakhand": [("state quota and all india management", ["Gen", "Mgmt"])],
    # Basti prints tuition by category; the general category's is the seat's fee, the reserved categories' is in the note.
    "Uttar Pradesh": [("^general \\(category", "GOVT")],
    # NEIGRIHMS's prospectus prices its MD/MS seats (open North-Eastern and pass-out) as one.
    "Meghalaya": [("^md/ms", "GOVT")],
    "Sikkim": [("^category a", ["CatA"])],
    # Only the UT candidates' column is printed — not the AIQ seats (an unlabelled AIQ sheet is not used).
    "Dadra and Nagar Haveli": [("^ut of dnh", ["Gen"])],
}
NON_NRI = ["Gen", "Priv", "Mgmt", "Min", "Inst"]


def columns(f, own, state):
    """The columns a fee row prices, or None when it cannot be placed (left out and reported)."""
    seat = f["seat"]
    govt = own == "government"
    if not seat.startswith("Other"):
        return (["Gen", "AIQ"] if govt else ["Gen"]) if seat == "Gen" else [seat]
    label = seat.split(":", 1)[-1].strip().lower()
    for pat, cols in STATE_SEATS.get(state, []):
        if re.search(pat, label):
            return ["Gen", "AIQ"] if cols == "GOVT" else cols
    # One fee printed for every seat: a government college's merit seats, a private college's every seat but NRI
    # (an NRI fee is always printed apart where there is one).
    if re.match(r"all (pg |md |md/ms )?seats", label):
        return ["Gen", "AIQ"] if govt else NON_NRI
    return None

# Branch groups a notice prints instead of branch names.
PRE = ["MD Anatomy", "MD Physiology", "MD Bio-Chemistry"]
PARA = ["MD Pharmacology", "MD Microbiology", "MD Pathology", "MD Forensic Medicine", "MD Social & Preventive Medicine"]
ALIASES = [  # printed words -> our course name (checked in order)
    (r"radio[- ]?diag|radiology", "MD Radio Diagnosis"),
    (r"radiation onco|radiotherapy|radio[- ]?therapy", "MD Radiation Oncology"),
    (r"anaes|anesth", "MD Anaesthesiology"),
    (r"anatomy", "MD Anatomy"),
    (r"physiology", "MD Physiology"),
    (r"bio[- ]?chem", "MD Bio-Chemistry"),
    (r"pharmacol", "MD Pharmacology"),
    (r"microbio", "MD Microbiology"),
    (r"forensic", "MD Forensic Medicine"),
    (r"community|preventive|psm\b|com\.? ?med", "MD Social & Preventive Medicine"),
    (r"immuno|transfusion|ihbt", "MD Immuno Haematology & Blood Transfusion"),
    (r"patholog", "MD Pathology"),
    (r"dermat|dvl|venereo|skin", "MD Dermatology, Venereology & Leprosy"),
    (r"psychiat", "MD Psychiatry"),
    (r"respiratory|pulmonary|\btb\b|tuberculosis|chest", "MD Tuberculosis & Respiratory Diseases"),
    (r"emergency", "MD Emergency Medicine"),
    (r"paediat|pediat", "MD Paediatrics"),
    (r"physical medicine|rehabilitation|pmr", "MD Physical Medicine & Rehabilitation"),
    (r"geriatric", "MD Geriatrics"),
    (r"palliative", "MD Palliative Medicine"),
    (r"nuclear", "MD Nuclear Medicine"),
    (r"sports", "MD Sports Medicine"),
    (r"family medicine", "MD Family Medicine"),
    (r"hospital admin", "MD Hospital Administration"),
    (r"lab(oratory)? medicine", "MD Lab Medicine"),
    (r"tropical", "MD Tropical Medicine"),
    (r"orthop", "MS Orthopaedics"),
    (r"ophthal|opthal|optham", "MS Ophthalmology"),
    (r"\bent\b|oto-?rhino|otorhino", "MS ENT"),
    (r"obstet|gynae|gyne|\bobg\b|\bog\b", "MS Obstetrics & Gynaecology"),
    (r"general surgery|\bsurgery\b", "MS General Surgery"),
    (r"general medicine|^md medicine$|\bmedicine\b", "MD General Medicine"),
]
NOT_MDMS = re.compile(r"^(diploma|dnb|d\.|dm\b|m\.?ch|mch\b|msc|m\.sc|mph)", re.I)


def our_course(printed):
    """'Radio-Diagnosis (= MD Radio Diagnosis)' -> 'MD Radio Diagnosis'; None when unsure."""
    m = re.match(r"(.*?)\(?\s*\bexclud\w*\s+([^)]*)\)?\s*$", printed, re.I)
    if m and our_course(m.group(1)):
        drop = set(sum((our_course(x) or [] for x in re.split(r",|&|\band\b", m.group(2))), []))
        return [c for c in our_course(m.group(1)) if c not in drop]
    m = re.search(r"\(=\s*([^)]+)\)\s*$", printed) or re.search(r"(?:→|->)\s*(.+?)\s*$", printed)
    if m:  # the extract already names our course(s); trust only names that are ours, and nothing left over
        named = m.group(1).strip()
        if named in COURSES:
            return [named]
        found, rest = [], named
        for c in sorted(COURSES, key=len, reverse=True):  # longest first: "MD Dermatology, Venereology & Leprosy"
            if c in rest:
                found.append(c)
                rest = rest.replace(c, " ")
        return found if found and not re.sub(r"[\s,;/&]+|\band\b", "", rest) else None
    name = re.sub(r"\s*\(=.*$", "", printed).strip()
    if name in COURSES:
        return [name]
    low = name.lower()
    if re.fullmatch(r"(pg |all |degree (course )?)?non[- ]clinical.*", low):
        return PRE + PARA
    if re.fullmatch(r"(pg |degree (course )?)?pre[- ]clinical.*", low):
        return PRE
    if re.fullmatch(r"(pg |degree (course )?)?para[- ]clinical.*", low):
        return PARA
    if re.fullmatch(r"(pg |degree (course )?)?clinical.*", low):
        return [c for c in COURSES if re.match(r"^(MD|MS) ", c) and c not in PRE + PARA]
    if NOT_MDMS.match(low):
        return None
    for pat, course in ALIASES:
        if re.search(pat, low):
            return [course]
    return None


def branches_of(f, problems, who):
    if f["branches"] == "*":
        return "*", False
    ours = f.get("ours")
    if ours and all(o in COURSES for o in ours):
        return list(dict.fromkeys(ours)), False
    out, grouped = [], False
    for b in f["branches"]:
        got = our_course(b)
        if got is None:
            problems.append(f"{who}: branch '{b}' not matched")
            continue
        grouped = grouped or len(got) > 1
        out += [c for c in got if c not in out]
    return out, grouped


def build(path, out_dir=None):
    ex = json.loads(Path(path).read_text(encoding="utf-8"))
    state = ex["state"]
    s = StateFees(state, STATE_CLASSES.get(state, []) + COMMON, NULL_CLASS)
    problems, used = [], 0

    def source_text(c, extra=""):
        page = f", p. {c['page']}" if c.get("page") else ""
        return f"{c.get('source_title') or c['source']}{page} — \"{c['year_label']}\"{extra}"

    def add(c, ids, own):
        nonlocal used
        who = c.get("college") or c.get("scope", "")[:60]
        period = c.get("period", "per year")
        period = "per year" if period.startswith("per year") else period  # "per year ('Tuition Fee Rs. 9000 Yearly')"
        if period not in ("per year", "unstated") and not any(f.get("tuition_inr") for f in c["fees"]):
            problems.append(f"{who}: period '{period}' — left out until decided")
            return
        for f in c["fees"]:
            cols = columns(f, own, state)
            if not cols:
                problems.append(f"{who}: seat '{f['seat']}' needs a column — left out")
                continue
            # The tuition where a notice prints it apart from other heads — every state's figure is tuition.
            inr = f.get("tuition_inr") or f.get("inr")
            if inr is None and f.get("lakh") is not None:
                inr = round(f["lakh"] * 100000)  # "63 Lacs" is ₹63,00,000 — notation, not a conversion
            printed = " ".join(str(f.get(k) or "") for k in ("printed", "as_printed", "seat_as_printed"))
            # "Annual Fee Rs. 4,00,000; Scholarship / Fee concession Rs. 1,32,000; Annual fee after deduction of Fee
            # Concession Rs. 2,68,000": what the student pays is printed — store it, with the rest in the note.
            after = re.search(r"after deduction of fee concession rs\.?\s*([\d,]+)", printed, re.I)
            concession = ""
            if after:
                inr = int(after.group(1).replace(",", ""))
                concession = f" — after the college's fee concession (as printed: {f['as_printed']})"
            if inr is None and f.get("usd") is None:
                if re.search(r"full scholarship|no tuition", printed, re.I):
                    inr = 0  # placed below as "no tuition fee", with the notice's words
                else:
                    continue  # "-": nothing to state
            br, grouped = branches_of(f, problems, who)
            if br != "*" and not br:
                continue
            note = (" — clinical / non-clinical as usually grouped" if grouped else "") + concession
            src = source_text(c, note)
            if inr == 0:  # a ₹0 fee reads as "not published" on the site, so the row says why instead
                why = ("100% tuition fee waiver in the college's 2026-27 notice" if f.get("waiver")
                       else "Full scholarship (no tuition fee) in the college's 2026-27 notice"
                       if re.search(r"scholarship", printed, re.I)
                       else "No tuition fee for this branch in the college's 2026-27 notice")
                for col in cols:
                    s.no_seat(who, ids, col, br, src, reason=why)
                    used += 1
                continue
            for col in cols:
                s.fee(who, ids, col, br, inr=inr, usd=f.get("usd") if inr is None else None, source=src,
                      maximum=bool(f.get("maximum")),
                      period="per year" if period == "per year" or f.get("tuition_inr") else None)
                used += 1
        h = c.get("hostel")
        if h and h.get("min"):
            s.hostel(who, ids, h.get("text", ""), source_text(c), h["min"], h.get("max"))

    for c in ex.get("colleges", []):
        kind, own = c.get("source_kind"), c.get("ownership")
        if kind == "state-govt-official" and own != "government":
            raise SystemExit(f"{c['college']}: a state list is used for government colleges only")
        ids = [r["id"] for r in c.get("roster", [])]
        if not ids:
            problems.append(f"{c['college']}: no institute id — left out")
            continue
        add(c, ids, own)
    for g in ex.get("government_all", []):
        ids = [r["id"] for r in g.get("roster", [])]
        if not ids:
            problems.append(f"government fee '{g['scope'][:60]}': no institute ids — left out")
            continue
        add({**g, "college": g["scope"][:80]}, ids, "government")

    slug = state.lower().replace("&", "and").replace(" ", "_")
    out = s.write(Path(out_dir) / f"fees_official_{slug}_2026_27.json" if out_dir else None)
    print(f"  {used} fee entries; {len(ex.get('not_published', []))} colleges not published")
    for p in problems:
        print("  !", p)
    return out


if __name__ == "__main__":
    COURSES = set(json.loads((Path(__file__).parent / "pg_course_names.json").read_text(encoding="utf-8")))
    args = sys.argv[1:]
    out_dir = args[args.index("--out") + 1] if "--out" in args else None
    for p in [a for i, a in enumerate(args) if a != "--out" and (i == 0 or args[i - 1] != "--out")]:
        build(p, out_dir)
