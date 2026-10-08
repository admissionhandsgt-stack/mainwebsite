"""
Turn the extracted MDS CSVs into one SQL load for mds_allotments.

Usage: PYTHONIOENCODING=utf-8 python scripts/mds/build_mds_sql.py <dir> > load.sql
Then:  ora_psql < load.sql        (scripts/lib/servers.sh)

Replaces the years it loads, in one transaction. Source PDFs (MCC,
cdnbbsr.s3waas.gov.in): see SOURCES.
"""
import csv, glob, os, re, sys
from collections import Counter, defaultdict

SOURCES = {
    ("2025", "R1"): "uploads/2025/07/2025070373.pdf",
    ("2025", "R2"): "uploads/2025/07/2025071987.pdf",
    ("2025", "R3"): "uploads/2025/08/2025080864.pdf",
    ("2025", "STRAY"): "uploads/2025/09/20250903860851931.pdf",
    ("2026", "R1"): "uploads/2026/09/20260902513799643.pdf",
    ("2026", "R2"): "uploads/2026/09/202609231157033596.pdf",
}
SMALL = {"and", "of", "in", "with", "the", "for"}

def title(s):
    s = re.sub(r"\s+", " ", s).strip()
    if s.upper() == s:
        s = " ".join(w.lower() if w.lower() in SMALL else w.capitalize() for w in s.split())
    return s

def slug(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")

def institute(raw):
    s = re.sub(r"\s+", " ", raw).strip()
    m = re.search(r",\s*([^,]+?),\s*\d{6}\s*$", s)
    state = re.sub(r"\s*\(NCT\)", "", m.group(1)).strip() if m else None
    return s.split(",")[0].strip(), state

def quota_name(q):
    return re.sub(r"\s*/\s*", "/", re.sub(r"\s+", " ", q)).strip()

letters = lambda s: re.sub(r"[^a-z]", "", s.lower())
def canonical(names):
    by = defaultdict(Counter)
    for n in names:
        by[letters(n)][n] += 1
    return {n: by[letters(n)].most_common(1)[0][0] for n in names}

q = lambda v: "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"

records, seen = [], set()
for path in sorted(glob.glob(os.path.join(sys.argv[1], "mds*_*.csv"))):
    for r in csv.DictReader(open(path, encoding="utf-8")):
        k = (r["year"], r["round"], r["rank"])
        if k in seen:
            continue  # a row twice across a page break
        seen.add(k)
        records.append(r)

course_of = canonical([title(r["course"]) for r in records])
inst_of = canonical([institute(r["institute"])[0] for r in records])

years, values = set(), []
for r in records:
    years.add(r["year"])
    name, state = institute(r["institute"])
    course = course_of[title(r["course"])]
    values.append(
        f"({r['year']},{q(r['round'])},{int(r['rank'])},{q(quota_name(r['quota']))},{q(r['allotted_category'].strip())},"
        f"{q(r['candidate_category'].strip() or None)},{q(inst_of[name])},{q(state)},{q(r['institute'])},{q(course)},"
        f"{q(slug(course))},{q(r['remarks'])},{q(SOURCES.get((r['year'], r['round']), ''))})"
    )

print("BEGIN;")
print(f"DELETE FROM mds_allotments WHERE year IN ({','.join(sorted(years))});")
for i in range(0, len(values), 500):
    print("INSERT INTO mds_allotments (year, round, rank, quota, allotted_category, candidate_category, institute, state, institute_raw, course, course_slug, remarks, source_pdf) VALUES")
    print(",\n".join(values[i:i + 500]) + ";")
print("COMMIT;")
print("SELECT year, round, count(*) FROM mds_allotments GROUP BY 1, 2 ORDER BY 1, 2;")
print(f"-- {len(values)} rows", file=sys.stderr)
