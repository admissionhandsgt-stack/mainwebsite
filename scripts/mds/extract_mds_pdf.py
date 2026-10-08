"""
Extract MCC NEET MDS allotment results into CSV.

Usage: python scripts/mds/extract_mds_pdf.py <result.pdf> <year> <round> <out.csv>

Round 1 and stray rows: SNo, Rank, Quota, Institute, Course, Allotted Category,
Candidate Category, Remarks. Later rounds repeat every earlier round's columns
first and end with this round's: Quota, Institute, Course, Allotted Category,
Candidate Category, option No., Remarks. The rank is only ever the second cell.
A row whose last block institute is "-" holds no new seat in this round.
"""
import csv, re, sys
import pdfplumber

pdf_path, year, rnd, out_path = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
clean = lambda s: re.sub(r"\s+", " ", (s or "").replace("\n", " ")).strip()

rows, odd = [], 0
with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            for raw in table:
                c = [clean(x) for x in raw]
                if len(c) < 8 or not c[0].isdigit() or not re.fullmatch(r"\d+", c[1] or ""):
                    continue
                if len(c) == 8:
                    quota, inst, course, allot_cat, cand_cat, remarks = c[2], c[3], c[4], c[5], c[6], c[7]
                else:
                    quota, inst, course, allot_cat, cand_cat, _opt, remarks = c[-7:]
                if inst in ("", "-") or course in ("", "-"):
                    continue
                if not quota or quota == "-":
                    odd += 1
                    continue
                rows.append([year, rnd, int(c[1]), quota, inst, course, allot_cat, cand_cat, remarks])

with open(out_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["year", "round", "rank", "quota", "institute", "course", "allotted_category", "candidate_category", "remarks"])
    w.writerows(rows)
print(f"{pdf_path}: {len(rows)} allotments, {odd} odd rows skipped")
