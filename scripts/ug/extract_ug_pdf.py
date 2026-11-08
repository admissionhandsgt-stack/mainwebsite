"""
Extract MCC NEET UG allotment results into CSV (2026-11-09).

Usage: python -E -P scripts/ug/extract_ug_pdf.py <result.pdf> <year> <round-label> <out.csv>

Round 1, the stray and the special stray round print one row per candidate:
  SNo, Rank, Allotted Quota, Allotted Institute, Course, Alloted Category, Candidate Category, Remarks.
Later rounds print every earlier round's block first and end with this round's:
  Allotted Quota, [an empty column on some pages], Allotted Institute, Course, Alloted Category,
  candidate Category, option No., Remarks — and lead with Rank, no SNo.
The rank is the first number in a row (the second cell when an SNo comes first). A last block whose
institute is "-" kept the earlier seat (or got none): it is not an allotment in this round.
"""
import csv, re, sys
import pdfplumber

pdf_path, year, rnd, out_path = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
clean = lambda s: re.sub(r"\s+", " ", (s or "").replace("\n", " ")).strip()

rows, skipped, kept_old = [], 0, 0
with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            for raw in table:
                c = [clean(x) for x in raw]
                if len(c) == 8 and c[0].isdigit() and re.fullmatch(r"\d+", c[1] or ""):
                    rank = int(c[1])
                    quota, inst, course, allot_cat, cand_cat, remarks = c[2], c[3], c[4], c[5], c[6], c[7]
                elif len(c) == 9 and c[0].isdigit() and re.fullmatch(r"\d+", c[1] or ""):
                    # The special stray round adds the candidate's roll number (c[2]) — never read, never stored.
                    rank = int(c[1])
                    quota, inst, course, allot_cat, cand_cat, remarks = c[3], c[4], c[5], c[6], c[7], c[8]
                elif len(c) >= 12 and re.fullmatch(r"\d+", c[0] or ""):
                    # Drop the empty spacer column some pages carry, then the last seven cells are this round's.
                    d = [x for x in c if x != ""]
                    if len(d) < 8:
                        skipped += 1
                        continue
                    rank = int(d[0])
                    quota, inst, course, allot_cat, cand_cat, _opt, remarks = d[-7:]
                else:
                    continue
                if inst in ("", "-") or course in ("", "-") or quota in ("", "-"):
                    kept_old += 1
                    continue
                rows.append([year, rnd, rank, quota, inst, course, allot_cat, cand_cat, remarks])

with open(out_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["year", "round", "rank", "quota", "institute", "course", "allotted_category", "candidate_category", "remarks"])
    w.writerows(rows)
print(f"{pdf_path}: {len(rows)} allotments, {kept_old} rows with no new seat this round, {skipped} malformed")
