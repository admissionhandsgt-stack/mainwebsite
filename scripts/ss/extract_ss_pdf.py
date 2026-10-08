"""
Extract MCC NEET SS allotment results (DM / MCh / DrNB SS) into CSV.

Usage: python scripts/ss/extract_ss_pdf.py <result.pdf> <year> <round> <out.csv>

MCC's later-round PDFs repeat every earlier round's columns beside the new
one, so a row reads [prev round..., this round]. This round's allotment is
always the LAST block: Rank, Qualifying Exam (the group), Allotted Institute,
Course, [option No.], Remarks. A row whose last-block institute is "-" holds
no seat after this round.

Round 1 has no earlier block: SNo, Rank, Qualifying Exam, Institute, Course,
Remarks. There is no quota or category column at all — SS seats are allotted
on open merit within each group's own rank list — so none is invented here.
"""
import csv, re, sys
import pdfplumber

pdf_path, year, rnd, out_path = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
clean = lambda s: re.sub(r"\s+", " ", (s or "").replace("\n", " ")).strip()

rows, skipped = [], 0
with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            for raw in table:
                cells = [clean(c) for c in raw]
                if not cells or not cells[0].isdigit():
                    continue  # header, title or legend row
                # Walk back from the end: Remarks, [option No.], Course, Institute, Group, Rank
                c = [x for x in cells]
                remarks = c[-1]
                tail = c[:-1]
                if tail and re.fullmatch(r"\d{1,3}|-", tail[-1] or "") and len(c) > 6:
                    tail = tail[:-1]  # option No.
                course, institute, group = tail[-1], tail[-2], tail[-3]
                rank_cell = next((x for x in reversed(tail[:-3]) if x), "")
                if not re.fullmatch(r"\d+", rank_cell or ""):
                    skipped += 1
                    continue
                if institute in ("", "-") or course in ("", "-"):
                    continue  # no seat held after this round
                rows.append([year, rnd, int(rank_cell), group, institute, course, remarks])

with open(out_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["year", "round", "rank", "grp", "institute", "course", "remarks"])
    w.writerows(rows)
print(f"{pdf_path}: {len(rows)} seat holders, {skipped} rows skipped (no rank)")
