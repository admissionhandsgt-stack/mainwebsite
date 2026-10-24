"""A state's NEET PG fees as an Excel workbook a junior counsellor can look things up in (owner, 2026-10-24: "colleges
name upar se niche, upar courses ke naam, uske niche sub column mai seat type Gen / Management / NRI … figures lakhs
mai … hostel fees bhi … easy to use").

    node --env-file=.env.local scripts/poster/state_fees_doc.mjs --state Maharashtra --json <file.json>
    python scripts/poster/state_fees_xlsx.py <file.json> <out.xlsx> [--official <fees.json>] [--rate 96]

--official: fees confirmed against an official 2026-27 notice (the CET Cell's information brochure, a university's own
fee notice), which replace the listing's figure and print green with their source in a comment. --rate: rupees per
US dollar for the NRI columns (owner, 2026-10-25: "NRI fees USD mai bhi … mota mota 96 rs"); it sits in one yellow
cell, and every converted NRI figure is a formula on it.

Sheets: the MD/MS colleges (a row per college, a column group per branch with Gen / Mgmt / NRI under it, fees in
Rs lakh), the DNB / NBE hospitals (a row each: fee, seat types, branches), and how to read both. Same data and the
same caveat as the PDF: fees as listed for the counselling, never official, and the listing does not say for every
figure whether it is a year's fee or the whole course's. After writing, the workbook is read back and every fee
compared with the JSON; any difference stops the script.
"""

import json
import sys

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName

SRC, OUT = sys.argv[1], sys.argv[2]
opt = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
OFFICIAL = json.load(open(opt("--official"), encoding="utf-8")) if opt("--official") else []
USD_RATE = float(opt("--rate", "96"))
USD_RATE = int(USD_RATE) if USD_RATE == int(USD_RATE) else USD_RATE
RATE_NOTE = opt("--rate-note", "")
data = json.load(open(SRC, encoding="utf-8"))
STATE, AS_OF = data["state"], data["asOf"]

# Seat types per kind of college: which listed seat type fills the Gen, Mgmt and NRI columns.
SUB = ["Gen", "Mgmt", "NRI ₹", "NRI $"]
COLUMN_OF = {
    "govt": {"Govt Quota": "Gen"},
    "private": {"Govt Quota": "Gen", "Management Quota": "Mgmt", "NRI Quota": "NRI"},
    "deemed": {"MNG": "Mgmt", "NRI": "NRI"},
}
TYPE_LABEL = {"govt": "Govt", "private": "Private", "deemed": "Deemed"}
SEAT_LABEL = {s["key"]: s["label"] for s in data["seats"]}

FONT = "Arial"
f = lambda **k: Font(name=FONT, **{"size": 10, **k})
fill = lambda hex_: PatternFill("solid", start_color=hex_, end_color=hex_)
NAVY, TEAL = "0B2447", "0F766E"
TYPE_FILL = {"govt": fill("DCFCE7"), "private": fill("E0F2FE"), "deemed": fill("FEF3C7")}
SUB_FILL = {"Gen": fill("D1FAE5"), "Mgmt": fill("DBEAFE"), "NRI ₹": fill("FFEDD5"), "NRI $": fill("FED7AA")}
HEAD_FILLS = [fill("CCFBF1"), fill("E2E8F0")]
NOT_HERE = fill("EEF0F3")
FLAG = fill("FDE68A")
thin, med = Side(style="thin", color="CBD5E1"), Side(style="medium", color="64748B")
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)


def lakh(n):
    """Rs -> lakh, two decimals, written the way it is said: 45, 1.57, 36.05."""
    v = round(n / 1e5, 2)
    return int(v) if v == int(v) else v


def rupees(n):
    s = str(int(round(n)))
    if len(s) <= 3:
        return "₹" + s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    return "₹" + ",".join(([head] if head else []) + parts + [tail])


def city_of(name):
    segs = [s.strip() for s in name.split(",")]
    return segs[-1] if len(segs) > 1 else ""


def pct50(xs):
    s = sorted(xs)
    return s[min(len(s) - 1, max(0, round(0.5 * (len(s) - 1))))]


def hostel_text(c):
    """One line for the hostel fee as listed. Seat types that list the same amount are one entry; a seat type that
    lists nothing defers to one that does; seat types that list different terms are named."""
    entries = []
    for seat, h in c["hostel"].items():
        h = {k: h.get(k) for k in ("min", "max", "period", "included", "mess")}
        for e in entries:
            same_amount = (h["min"], h["max"]) == (e["h"]["min"], e["h"]["max"]) or h["min"] is None or e["h"]["min"] is None
            fits = all(h[k] is None or e["h"][k] is None or h[k] == e["h"][k] for k in ("period", "included", "mess"))
            if same_amount and fits:
                e["h"] = {k: e["h"][k] if e["h"][k] is not None else h[k] for k in h}
                e["seats"].append(seat)
                break
        else:
            entries.append({"h": h, "seats": [seat]})
    entries = [e for e in entries if e["h"]["min"] is not None]

    def one(h):
        lo, hi = h["min"], h["max"] if h["max"] is not None else h["min"]
        amount = rupees(lo) if lo == hi else f"{rupees(lo)} – {rupees(hi)}"
        period = {"year": " a year", "month": " a month"}.get(h["period"] or "", " (period not listed)")
        extra = (", mess included" if h["mess"] else "") + (" — included in the fee" if h["included"] else "")
        return amount + period + extra

    if not entries:
        return "Not listed"
    if len(entries) == 1:
        return one(entries[0]["h"])
    return " · ".join(f"{' / '.join(SEAT_LABEL.get(s, s) for s in e['seats'])}: {one(e['h'])}" for e in entries)


def fee_groups(items):
    """[(fee or None, [course names])], cheapest first — for a seat type with no column of its own."""
    groups = {}
    for x in items:
        groups.setdefault(x["fee"], []).append(x["course"])
    return sorted(groups.items(), key=lambda g: (g[0] is None, g[0] or 0))


NAME = {c["course"]: c["name"] for c in data["courses"]}
matrix = [c for c in data["colleges"] if c["section"] in COLUMN_OF]
hospitals = [c for c in data["colleges"] if c["section"] == "nbe"]

# Every course any MD/MS college offers, in the shared order (MD, MS, diplomas; A–Z by the printed name).
offered = {x["course"] for c in matrix for items in c["seats"].values() for x in items}
courses = [c["course"] for c in data["courses"] if c["course"] in offered]
names = [NAME[c] for c in courses]
assert len(set(names)) == len(names), f"two courses print the same name: {sorted(n for n in names if names.count(n) > 1)}"

wb = Workbook()

# ------------------------------------------------------------------ official 2026-27 fees, where we have them
# OFFICIAL: [{college, seat, branches ("*" or [printed names]), fee_inr | fee_usd, max, none, year, source}] — seat is
# Gen | Mgmt | NRI (per branch), AIQ (the college's one AIQ fee), Hostel or Note (with "text"). A college matches by the
# start of its printed name and must match exactly one. "*" fills the seats the listing has for that column; a notice that
# names branches fills them wherever a private college has the branch, even a seat the 2026 listing lacked, because the
# college's own notice is the newer word (a deemed university's seats are MCC's, so there only listed seats fill). A branch the college does not have in the listing goes into its Notes line,
# so nothing a notice says is dropped. A "noseat" entry (the college's own seat matrix) blanks a listed seat.
official, per_college, unused, priced_elsewhere = {}, {}, [], {}
not_offered = 0
by_name = {NAME[x]: x for x in courses}
for e in OFFICIAL:
    hits = [c for c in matrix if c["name"].lower().startswith(e["college"].lower())]
    assert len(hits) == 1, f"official entry matches {len(hits)} colleges: {e['college']}"
    c = hits[0]
    if e["seat"] in ("AIQ", "Hostel", "Note"):
        per_college.setdefault(c["name"], {}).setdefault(e["seat"], []).append(e)
        continue
    listed_here = {x["course"] for k, items in c["seats"].items() if COLUMN_OF[c["section"]].get(k) == e["seat"] for x in items}
    branches_here = {x["course"] for items in c["seats"].values() for x in items}
    if e["branches"] == "*":
        wanted = to_fill = listed_here
    else:
        missing = [b for b in e["branches"] if b not in by_name]
        assert not missing, f"unknown branch names in official entry for {c['name']}: {missing}"
        wanted = {by_name[b] for b in e["branches"]}
        # Deemed seats are MCC's: its 2026 seat matrix (the listing) says which exist, so a notice cannot add one there.
        to_fill = wanted & (listed_here if e.get("noseat") or c["section"] == "deemed" else branches_here)
    for course in to_fill:
        assert (c["name"], course, e["seat"]) not in official, f"two official fees for {c['name']} {NAME[course]} {e['seat']}"
        official[(c["name"], course, e["seat"])] = e
    if not e.get("noseat") and c["section"] != "deemed":
        elsewhere = wanted - branches_here
        not_offered += len(elsewhere)
        priced_elsewhere.setdefault(c["name"], set()).update(NAME[x] for x in elsewhere)
    if not to_fill:
        unused.append(e)

# ------------------------------------------------------------------ sheet 1: MD/MS colleges
ws = wb.active
ws.title = "MD-MS colleges"
LEFT_COLS = [("S.No", 5), ("College", 46), ("Type", 8.5), ("City", 13), ("AIQ fee\n(MCC, every branch)", 11), ("Hostel fee (as listed)", 28)]
FIRST = len(LEFT_COLS) + 1  # first course column
WIDTH = len(SUB)
NOTES_COL = FIRST + WIDTH * len(courses)
HEAD1, HEAD2 = 8, 9
TOP = HEAD2 + 1
RATE_ROW = 7

ws["A1"] = f"{STATE} NEET PG 2026 — fees by college, branch and seat type"
ws["A1"].font = f(size=15, bold=True, color=NAVY)
ws["A2"] = "ALL FEES ARE IN ₹ LAKH  —  45 means ₹45,00,000  ·  1.57 means ₹1,57,000 (rounded to the nearest ₹1,000)  ·  NRI $ in US dollars"
ws["A2"].font = f(size=12, bold=True, color="B91C1C")
# The legend in short lines, so each fits a laptop screen beside the frozen columns.
LEGEND = [
    ("Gen = State Govt Quota seat (CET Cell)   ·   Mgmt = Management Quota (CET Cell) / Paid seat at a deemed university (MCC)   ·   "
     "AIQ = All India Quota (MCC), government colleges"),
    ("NRI ₹ / NRI $ = NRI Quota (CET Cell) / NRI seat at a deemed university (MCC). Deemed universities set NRI fees in dollars, so there the $ is "
     "the fee and ₹ is worked out at the rate in C7; private colleges set them in rupees, so there ₹ is the fee and $ is worked out"),
    ("Green = the college's / university's own 2026-27 fee notice (government colleges: CET Cell brochure) — hover for the source   ·   "
     "≤ = the notice says 'up to'   ·   Black = college has not published 2026-27 yet, figure as listed   ·   Grey = branch not here   ·   "
     "– = no such seat   ·   NL = fee not listed"),
    (f"Fees as listed for the 2026 NEET PG counselling (as of {AS_OF}) unless green — not an official notice, and a year's fee or the whole "
     "course's is not always stated. Confirm with the college before a student pays a fee or signs a bond."),
]
for i, line in enumerate(LEGEND, start=3):
    ws.cell(i, 1, line).font = f(size=10, color="334155") if i < 3 + len(LEGEND) - 1 else f(size=10, italic=True, color="92400E")

label = ws.cell(RATE_ROW, 2, "Dollar rate used (₹ per 1 US$)  →")
label.font, label.alignment = f(bold=True, color=NAVY), Alignment(horizontal="right", vertical="center")
rate = ws.cell(RATE_ROW, 3, USD_RATE)
rate.font, rate.fill, rate.alignment = f(bold=True, size=11, color="0000FF"), fill("FFFF00"), Alignment(horizontal="center", vertical="center")
rate.border = Border(left=med, right=med, top=med, bottom=med)
rate.comment = Comment(f"Change this to the day's rate and every NRI ₹ / $ figure follows. {RATE_NOTE}", "AdmissionHands")
ws.cell(RATE_ROW, 4, "← change to the day's rate; banks convert at their own rate on the day of the DD").font = f(size=9, italic=True, color="64748B")
wb.defined_names["USD_RATE"] = DefinedName("USD_RATE", attr_text=f"'{ws.title}'!$C${RATE_ROW}")

for i, (label_text, width) in enumerate(LEFT_COLS, start=1):
    ws.column_dimensions[get_column_letter(i)].width = width
    ws.cell(HEAD1, i).fill = fill(NAVY)
    cell = ws.cell(HEAD2, i, label_text)
    cell.font, cell.fill, cell.alignment = f(bold=True, color="FFFFFF"), fill(NAVY), CENTER

for k, course in enumerate(courses):
    col = FIRST + WIDTH * k
    ws.merge_cells(start_row=HEAD1, start_column=col, end_row=HEAD1, end_column=col + WIDTH - 1)
    head = ws.cell(HEAD1, col, NAME[course])
    head.font, head.alignment = f(bold=True, color=NAVY), CENTER
    for j, sub in enumerate(SUB):
        c = ws.cell(HEAD2, col + j, sub)
        c.font, c.fill, c.alignment = f(bold=True, size=9), SUB_FILL[sub], CENTER
        ws.cell(HEAD1, col + j).fill = HEAD_FILLS[k % 2]
        # Wide enough for "≤ 51.84" and "≤ $95,300" — a number that does not fit shows as ####.
        ws.column_dimensions[get_column_letter(col + j)].width = {"Gen": 7, "Mgmt": 8.5, "NRI ₹": 8.5, "NRI $": 10.5}[sub]
        for r in (HEAD1, HEAD2):
            ws.cell(r, col + j).border = Border(left=med if j == 0 else thin, bottom=thin)
ws.cell(HEAD1, NOTES_COL).fill = fill(NAVY)
notes_head = ws.cell(HEAD2, NOTES_COL, "Notes (other seat types)")
notes_head.font, notes_head.fill, notes_head.alignment = f(bold=True, color="FFFFFF"), fill(NAVY), CENTER
ws.column_dimensions[get_column_letter(NOTES_COL)].width = 44
ws.row_dimensions[HEAD1].height = 30
ws.row_dimensions[HEAD2].height = 30
ws.row_dimensions[RATE_ROW].height = 20
ws.cell(HEAD2, 5).comment = Comment("All India Quota seats at a government college, allotted by MCC. One fee for every branch.", "AdmissionHands")
for sub, text in {"Gen": "State Govt Quota seat, allotted by the CET Cell.",
                  "Mgmt": "Management Quota (CET Cell) at a private college; the Paid seat (MCC) at a deemed university.",
                  "NRI ₹": "NRI fee in ₹ lakh. At a deemed university it is the dollar fee × the rate in C7.",
                  "NRI $": "NRI fee in US dollars. At a private college it is the rupee fee ÷ the rate in C7, rounded to $100."}.items():
    ws.cell(HEAD2, FIRST + SUB.index(sub)).comment = Comment(text, "AdmissionHands")

USD_FMT = '"$"#,##0'
MAX_FMT, MAX_USD_FMT = '"≤ "General', '"≤ $"#,##0'  # a college notice that gives a fee as "up to"
expected, formulas = {}, {}  # (row, col) -> value / formula, checked after the file is written back
filled = added = removed = 0  # fees written; official fees where the listing had none; listed seats a college no longer has
for i, c in enumerate(matrix):
    r = TOP + i
    columns = COLUMN_OF[c["section"]]
    extra = [k for k in c["seats"] if k not in columns and k != "AIQ"]
    # One fee per course and column — the data holds one row per college, course and seat type.
    cell_of = {}
    for key, items in c["seats"].items():
        if key not in columns:
            continue
        fees = [x["fee"] for x in items if x["fee"] is not None]
        med_fee = pct50(fees) if len(fees) >= 3 else None
        for x in items:
            slot = (x["course"], columns[key])
            assert slot not in cell_of, f"two fees for {c['name']} {slot}"
            usd = None
            # Deemed universities quote NRI fees in dollars; the listing gives rupees at ₹95 a dollar ($130,000 =
            # ₹1,23,50,000). A fee that is a whole hundred dollars at 95 is a dollar fee; anything else is a rupee fee.
            if columns[key] == "NRI" and c["section"] == "deemed" and x["fee"] and x["fee"] % 95 == 0 and (x["fee"] // 95) % 100 == 0:
                usd = x["fee"] // 95
            cell_of[slot] = {**x, "key": key, "usd": usd, "listed": x["fee"], "source": None,
                             "low": med_fee is not None and x["fee"] is not None and x["fee"] < med_fee / 10}
    for (name, course, col_), e in official.items():
        if name != c["name"]:
            continue
        x = cell_of.get((course, col_), {"course": course, "session": None, "key": None, "low": False, "listed": None})
        added += x["listed"] is None and not e.get("noseat")
        removed += x["listed"] is not None and bool(e.get("noseat"))
        cell_of[(course, col_)] = {**x, "fee": None if e.get("none") else e.get("fee_inr"), "usd": None if e.get("none") else e.get("fee_usd"),
                                   "source": e, "low": False, "session": "2026"}
    here = {x["course"] for items in c["seats"].values() for x in items} | {k[0] for k in cell_of}

    aiq = c["seats"].get("AIQ", [])
    aiq_fees = {x["fee"] for x in aiq}
    assert len(aiq_fees) <= 1, f"AIQ fee varies by branch at {c['name']}"
    mine = per_college.get(c["name"], {})
    aiq_official = (mine.get("AIQ") or [None])[0] if aiq else None
    hostel_official = (mine.get("Hostel") or [None])[0]
    if aiq_official:
        aiq_value = lakh(aiq_official["fee_inr"])
    elif aiq_fees:
        aiq_value = lakh(next(iter(aiq_fees))) if next(iter(aiq_fees)) is not None else "NL"
    else:
        aiq_value = "–"
    left = [i + 1, c["name"], TYPE_LABEL[c["section"]], city_of(c["name"]), aiq_value,
            hostel_official["text"] if hostel_official else hostel_text(c)]
    for j, v in enumerate(left, start=1):
        cell = ws.cell(r, j, v)
        cell.font = f(bold=(j == 2))
        cell.alignment = LEFT if j in (2, 4, 6) else CENTER
        cell.border = Border(bottom=thin)
    ws.cell(r, 3).fill = TYPE_FILL[c["section"]]
    if isinstance(aiq_value, (int, float)):
        expected[(r, 5)] = aiq_value
    if aiq_official:
        listed_aiq = next(iter(aiq_fees))
        ws.cell(r, 5).font = f(bold=True, color="15803D")
        ws.cell(r, 5).comment = Comment(f"Official {aiq_official['year']}: {rupees(aiq_official['fee_inr'])}. Source: {aiq_official['source']}."
                                        + (f" The listing had {rupees(listed_aiq)}." if listed_aiq and listed_aiq != aiq_official["fee_inr"] else ""),
                                        "AdmissionHands")
    if hostel_official:
        ws.cell(r, 6).font = f(color="15803D")
        ws.cell(r, 6).comment = Comment(f"Official {hostel_official['year']}. Source: {hostel_official['source']}. Listed earlier: {hostel_text(c)}",
                                        "AdmissionHands")

    for k, course in enumerate(courses):
        col = FIRST + WIDTH * k
        cells = {sub: ws.cell(r, col + j) for j, sub in enumerate(SUB)}
        for j, sub in enumerate(SUB):
            cells[sub].alignment = Alignment(horizontal="center", vertical="center")
            cells[sub].border = Border(left=med if j == 0 else thin, bottom=thin)
            if course not in here:
                cells[sub].fill = NOT_HERE
        if course not in here:
            continue
        for seat in ("Gen", "Mgmt", "NRI"):
            x = cell_of.get((course, seat))
            targets = [cells["NRI ₹"], cells["NRI $"]] if seat == "NRI" else [cells[seat]]
            if x is None:
                for t in targets:
                    t.value, t.font = "–", f(color="94A3B8")
                continue
            if x["source"] and x["source"].get("noseat"):
                for t in targets:
                    t.value, t.font = "–", f(color="94A3B8")
                targets[0].comment = Comment(f"No {seat} seat here in {x['source']['year']} (the college's own seat matrix). "
                                             f"Source: {x['source']['source']}.", "AdmissionHands")
                continue
            if x["fee"] is None and x.get("usd") is None:
                for t in targets:
                    t.value, t.font = "NL", f(size=9, italic=True, color="64748B")
                if x["source"]:
                    targets[0].comment = Comment(f"The {x['source']['year']} notice gives no fee for this seat. Source: {x['source']['source']}.",
                                                 "AdmissionHands")
                continue
            filled += 1
            old = x["session"] and str(x["session"]) != "2026"
            colour = "15803D" if x["source"] else ("6B7280" if old else "111827")
            font = f(italic=bool(old), bold=bool(x["source"]), color=colour)
            ceiling = bool(x["source"] and x["source"].get("max"))
            if seat != "NRI":
                cell = targets[0]
                cell.value, cell.font = lakh(x["fee"]), font
                expected[(cell.row, cell.column)] = cell.value
                if ceiling:
                    cell.number_format = MAX_FMT
            else:
                inr_cell, usd_cell = targets
                if x.get("usd"):
                    usd_cell.value = x["usd"]
                    inr_cell.value = f"=ROUND({usd_cell.coordinate}*USD_RATE/100000,2)"
                    expected[(usd_cell.row, usd_cell.column)] = x["usd"]
                    formulas[(inr_cell.row, inr_cell.column)] = inr_cell.value
                else:
                    inr_cell.value = lakh(x["fee"])
                    usd_cell.value = f"=ROUND({inr_cell.coordinate}*100000/USD_RATE,-2)"
                    expected[(inr_cell.row, inr_cell.column)] = inr_cell.value
                    formulas[(usd_cell.row, usd_cell.column)] = usd_cell.value
                usd_cell.number_format = MAX_USD_FMT if ceiling else USD_FMT
                if ceiling:
                    inr_cell.number_format = MAX_FMT
                inr_cell.font, usd_cell.font = font, font
            cell = targets[0]
            if x["source"]:
                e = x["source"]
                listed_inr = x["listed"]
                official_inr = e["fee_inr"] if e.get("fee_inr") else e["fee_usd"] * 95
                if listed_inr is None:
                    was = " The 2026 listing had no such seat here; the college's own notice prices one."
                elif listed_inr == official_inr:
                    was = " Same as the listing."
                else:
                    was = f" The listing had {rupees(listed_inr)}" + (f" (US${listed_inr // 95:,} at ₹95)." if e.get("fee_usd") else ".")
                    if listed_inr < 0.75 * official_inr and not e.get("max"):
                        was += " The college listed a lower fee for this branch before — ask whether it still applies."
                    if e.get("max") and listed_inr < official_inr:
                        was += " The notice gives this as an upper limit — confirm the exact figure with the college."
                amount = f"US${e['fee_usd']:,}" if e.get("fee_usd") else rupees(e["fee_inr"])
                head = f"{e['year']}: up to {amount} (the college's notice says 'up to')" if e.get("max") else f"{e['year']}: {amount}"
                cell.comment = Comment(f"{head}. Source: {e['source']}.{was}", "AdmissionHands")
            elif old:
                cell.comment = Comment(f"{x['session']} fee — the 2026 fee is not listed yet.", "AdmissionHands")
            if x["low"]:
                cell.fill = FLAG
                cell.comment = Comment(f"{rupees(x['fee'])} — far below this college's other {SEAT_LABEL.get(x['key'], x['key'])} fees. "
                                       "Often a pre-clinical branch priced lower; confirm with the college.", "AdmissionHands")

    notes = [f"{n['year']}: {n['text']}" for n in mine.get("Note", [])]
    if priced_elsewhere.get(c["name"]):
        notes.append(f"Its 2026-27 notice also prices {', '.join(sorted(priced_elsewhere[c['name']], key=lambda n: courses.index(by_name[n])))}"
                     " — no seats for these in the 2026 listing")
    for key in extra:
        parts, groups = [], fee_groups(c["seats"][key])
        for fee, cs in groups:
            which = "every branch" if len(groups) == 1 else ", ".join(NAME[x] for x in sorted(cs, key=courses.index))
            parts.append(f"{lakh(fee) if fee is not None else 'not listed'} — {which}")
        notes.append(f"{SEAT_LABEL.get(key, key)} (₹ lakh): " + "; ".join(parts))
    note = ws.cell(r, NOTES_COL, "\n".join(notes) or None)
    note.alignment, note.font, note.border = LEFT, f(size=9), Border(bottom=thin, left=med)

    lines = max(1 + len(c["name"]) // 44, 1 + len(left[5]) // 27, sum(1 + len(n) // 42 for n in notes) if notes else 1)
    ws.row_dimensions[r].height = 14 * lines + 4

ws.freeze_panes = ws.cell(TOP, 4)  # header rows and S.No / College / Type stay in view
ws.auto_filter.ref = f"A{HEAD2}:{get_column_letter(NOTES_COL)}{TOP + len(matrix) - 1}"
ws.sheet_view.zoomScale = 90
ws.print_title_rows = f"{HEAD1}:{HEAD2}"
ws.print_title_cols = "A:C"
ws.page_setup.orientation = "landscape"
ws.page_setup.paperSize = ws.PAPERSIZE_A3

# ------------------------------------------------------------------ sheet 2: DNB / NBE hospitals
hs = wb.create_sheet("DNB & NBE hospitals")
hs["A1"] = f"{STATE} — DNB and NBE diploma hospitals (MCC counselling)"
hs["A1"].font = f(size=14, bold=True, color=NAVY)
hs["A2"] = "ALL FEES ARE IN ₹ LAKH  —  1.25 means ₹1,25,000"
hs["A2"].font = f(size=12, bold=True, color="B91C1C")
hs["A3"] = (f"As listed for the 2026 NEET PG counselling (as of {AS_OF}) — not an official notice; confirm with the MCC / NBEMS "
            "notice or the hospital. A hospital that also has MD/MS seats is on the first sheet too.")
hs["A3"].font = f(size=10, italic=True, color="92400E")
H_COLS = [("S.No", 5), ("Hospital", 44), ("Govt / Private", 10), ("City", 14), ("Fee (₹ lakh)", 10), ("Seat types", 22),
          ("DNB branches", 52), ("Diploma branches", 36), ("Hostel fee (as listed)", 28)]
for i, (label, width) in enumerate(H_COLS, start=1):
    hs.column_dimensions[get_column_letter(i)].width = width
    cell = hs.cell(5, i, label)
    cell.font, cell.fill, cell.alignment = f(bold=True, color="FFFFFF"), fill(NAVY), CENTER
hs.row_dimensions[5].height = 30
strip = lambda n: n.split(" ", 1)[1] if " " in n else n
for i, c in enumerate(sorted(hospitals, key=lambda c: c["name"])):
    r = 6 + i
    items = [x for v in c["seats"].values() for x in v]
    fees = sorted({x["fee"] for x in items if x["fee"] is not None})
    by_seat = {k: sorted({x["fee"] for x in v if x["fee"] is not None}) for k, v in c["seats"].items()}
    if len(fees) == 1:
        fee_cell = lakh(fees[0])
    elif fees:
        fee_cell = " · ".join(f"{SEAT_LABEL.get(k, k)} {', '.join(str(lakh(x)) for x in v)}" for k, v in by_seat.items() if v)
    else:
        fee_cell = "NL"
    dnb = sorted({NAME[x["course"]] for x in items if NAME[x["course"]].startswith("DNB")})
    dip = sorted({NAME[x["course"]] for x in items if not NAME[x["course"]].startswith("DNB")})
    row = [i + 1, c["name"], "Govt" if "Government" in (c["type"] or "") else "Private", city_of(c["name"]), fee_cell,
           ", ".join(SEAT_LABEL.get(k, k) for k in c["seats"]), ", ".join(strip(n) for n in dnb), ", ".join(strip(n) for n in dip),
           hostel_text(c)]
    for j, v in enumerate(row, start=1):
        cell = hs.cell(r, j, v)
        cell.font = f(bold=(j == 2), size=10 if j < 6 else 9)
        cell.alignment = CENTER if j in (1, 3, 5) else LEFT
        cell.border = Border(bottom=thin)
    if isinstance(fee_cell, (int, float)):
        expected[("h", r)] = fee_cell
    hs.cell(r, 3).fill = TYPE_FILL["govt" if row[2] == "Govt" else "private"]
    lines = max(1 + len(row[1]) // 42, 1 + len(row[6]) // 58, 1 + len(row[7]) // 40, 1 + len(row[8]) // 30)
    hs.row_dimensions[r].height = 13 * lines + 4
hs.freeze_panes = "C6"
hs.auto_filter.ref = f"A5:I{5 + len(hospitals)}"
hs.page_setup.orientation = "landscape"
hs.print_title_rows = "5:5"

# ------------------------------------------------------------------ sheet 3: how to read
rd = wb.create_sheet("How to read")
rd.column_dimensions["A"].width = 4
rd.column_dimensions["B"].width = 26
rd.column_dimensions["C"].width = 100
lines = [
    ("title", f"How to read this sheet — {STATE} NEET PG 2026 fees"),
    ("big", "All fees are in ₹ lakh. 45 means ₹45,00,000; 1.57 means ₹1,57,000 (rounded to the nearest ₹1,000)."),
    ("gap", ""),
    ("head", "Finding a fee"),
    ("step", ("1", "Find the college: press Ctrl+F and type part of its name, or use the filter arrows on Type (Govt / Private / Deemed) or City.")),
    ("step", ("2", f"Move right to the branch. Branch names are in row {HEAD1}; the college name stays on screen while you scroll.")),
    ("step", ("3", "Read the seat type under the branch: Gen, Mgmt, NRI ₹ or NRI $. For a government college, the All India Quota fee is in the AIQ column (column E) — one fee for every branch.")),
    ("step", ("4", "Hostel fee is in column F, as the college lists it (a year, a month, or period not listed).")),
    ("step", ("5", "DNB and NBE diploma hospitals are on the second sheet: one fee (usually ₹1.25 lakh) and the branches each one has.")),
    ("gap", ""),
    ("head", "Seat types"),
    ("pair", ("Gen", "State Govt Quota seat, allotted by the State CET Cell. At a private college this is the state's fixed fee for that college.")),
    ("pair", ("Mgmt", "Management Quota at a private college (CET Cell). At a deemed university: the Paid seat, allotted by MCC.")),
    ("pair", ("NRI ₹", "NRI Quota at a private college (CET Cell), in ₹ lakh. At a deemed university: the NRI seat (MCC) — its dollar fee × the rate in cell C7.")),
    ("pair", ("NRI $", "The same NRI fee in US dollars. Deemed universities set NRI fees in dollars, so there this is the fee itself; at a private college it is the rupee fee ÷ the rate, rounded to $100.")),
    ("pair", ("Rate (cell C7)", f"Rupees per US dollar, set at {USD_RATE}. Change it to the day's rate and every NRI ₹ / $ figure updates. Banks convert at their own rate on the day of the DD.")),
    ("pair", ("AIQ", "All India Quota seat at a government college, allotted by MCC.")),
    ("pair", ("Notes column", "Any other seat type a college lists (for example a Minority Quota), with its fee and branches.")),
    ("gap", ""),
    ("head", "What the cells mean"),
    ("pair", ("Green figure", "The college's or university's own 2026-27 fee notice, from its website (government colleges: the CET Cell's NEET-PG 2026 brochure). Hover for the notice and its date.")),
    ("pair", ("≤ figure", "The college's notice gives this fee as 'up to' — confirm the exact figure with the college.")),
    ("pair", ("Black figure", "The college has not put its 2026-27 PG fee on its website yet (checked 25 Oct 2026); the figure is as listed earlier — confirm before quoting. The Notes column says so.")),
    ("pair", ("Grey cell", "The college does not have this branch.")),
    ("pair", ("–", "The college has the branch, but not under this seat type.")),
    ("pair", ("NL", "The seat is listed, but no fee is listed for it.")),
    ("pair", ("Amber cell", "Far below the same college's other fees for that seat type (often a pre-clinical branch priced lower). Hover for the exact amount; confirm with the college.")),
    ("pair", ("Grey italic", "Last year's (2025) fee — the 2026 fee is not listed yet. Hover to see it.")),
    ("gap", ""),
    ("head", "Before you quote a fee to a family"),
    ("text", f"Black figures are the fees as listed for the 2026 NEET PG counselling (as of {AS_OF}) — not an official notice."),
    ("text", "The listing does not say for every figure whether it is a year's fee or the whole course's — ask the college when it matters."),
    ("text", "Fees change. Confirm with the CET Cell or MCC notice, or with the college, before a student pays a fee or signs a bond."),
]
r = 1
for kind, v in lines:
    if kind == "title":
        rd.cell(r, 2, v).font = f(size=15, bold=True, color=NAVY)
    elif kind == "big":
        rd.cell(r, 2, v).font = f(size=12, bold=True, color="B91C1C")
    elif kind == "head":
        rd.cell(r, 2, v).font = f(size=12, bold=True, color=TEAL)
    elif kind == "step":
        rd.cell(r, 1, v[0]).font = f(bold=True, color=TEAL)
        rd.cell(r, 1).alignment = Alignment(horizontal="center", vertical="center")
        rd.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
        rd.cell(r, 2, v[1]).alignment = LEFT
        rd.cell(r, 2).font = f()
        rd.row_dimensions[r].height = 28 if len(v[1]) > 110 else 16
    elif kind == "pair":
        a, b = rd.cell(r, 2, v[0]), rd.cell(r, 3, v[1])
        a.font, b.font, a.alignment, b.alignment = f(bold=True), f(), Alignment(vertical="center", indent=1), LEFT
        if v[0] in SUB_FILL:
            a.fill = SUB_FILL[v[0]]
        elif v[0] == "Rate (cell C7)":
            a.fill, a.font = fill("FFFF00"), f(bold=True, color="0000FF")
        elif v[0] in ("Green figure", "≤ figure"):
            a.font = f(bold=True, color="15803D")
        elif v[0] == "Grey cell":
            a.fill = NOT_HERE
        elif v[0] == "Amber cell":
            a.fill = FLAG
        elif v[0] == "Grey italic":
            a.font = f(italic=True, color="6B7280")
        rd.row_dimensions[r].height = 28 if len(v[1]) > 100 else 16
    elif kind == "text":
        rd.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
        rd.cell(r, 2, v).font, rd.cell(r, 2).alignment = f(), LEFT
    r += 1
rd.sheet_view.showGridLines = False

wb.save(OUT)

# ------------------------------------------------------------------ read it back: every fee where it should be
back = load_workbook(OUT)
m, h = back["MD-MS colleges"], back["DNB & NBE hospitals"]
got = lambda k: h.cell(k[1], 5).value if k[0] == "h" else m.cell(*k).value
bad = [(k, v, got(k)) for k, v in expected.items() if got(k) != v] + [(k, v, m.cell(*k).value) for k, v in formulas.items() if m.cell(*k).value != v]
assert not bad, f"{len(bad)} cells differ, e.g. {bad[:3]}"
listed = sum(1 for c in matrix for key, items in c["seats"].items() if key in COLUMN_OF[c["section"]] for x in items if x["fee"] is not None)
assert filled == listed + added - removed, f"fee count mismatch: wrote {filled}, listing {listed} + official-only {added} - no seat now {removed}"
print(f"{OUT}\n  MD/MS sheet: {len(matrix)} colleges × {len(courses)} branches, {filled} fees ({len(official)} official 2026-27; {not_offered} official fees for branches the college does not have in the listing, in Notes; "
      f"{added} of them not in the listing) + AIQ for {sum(1 for c in matrix if c['seats'].get('AIQ'))} colleges · "
      f"{len(formulas)} NRI conversions at ₹{USD_RATE}/$ · DNB/NBE sheet: {len(hospitals)} hospitals · read back: all match")
if unused:
    print("  official entries that matched no branch:", [e["college"] for e in unused])
