"""
Turn the extracted SS CSVs into one SQL load for ss_allotments.

Usage: python scripts/ss/build_ss_sql.py <dir with ssYYYY_<round>.csv> > load.sql
Then:  ora_psql < load.sql      (scripts/lib/servers.sh)

Replaces the years it loads, inside one transaction, so a re-run after a
better extraction is safe. Source PDFs (MCC, cdnbbsr.s3waas.gov.in):
  2024 R1    uploads/2025/05/2025052118.pdf
  2024 R2    uploads/2025/06/2025061127.pdf
  2024 STRAY uploads/2025/07/2025073077.pdf
  2023 R1    uploads/2023/11/2023111757.pdf
  2023 R2    uploads/2023/12/2023122398.pdf
  2023 MOPUP uploads/2024/02/2024021025.pdf
"""
import csv, glob, os, re, sys

SOURCES = {
    ("2024", "R1"): "uploads/2025/05/2025052118.pdf",
    ("2024", "R2"): "uploads/2025/06/2025061127.pdf",
    ("2024", "STRAY"): "uploads/2025/07/2025073077.pdf",
    ("2023", "R1"): "uploads/2023/11/2023111757.pdf",
    ("2023", "R2"): "uploads/2023/12/2023122398.pdf",
    ("2023", "MOPUP"): "uploads/2024/02/2024021025.pdf",
}

def course_name(raw: str) -> str:
    s = re.sub(r"\s+", " ", raw).strip()
    s = re.sub(r"^D\.?\s?M\.?\s+", "DM ", s, flags=re.I)
    s = re.sub(r"^M\.?\s?CH\.?\s+", "MCh ", s, flags=re.I)
    s = re.sub(r"^(DNB\s?SS|DrNB|Dr\.?\s?NB)\s+", "DrNB ", s, flags=re.I)
    s = s.replace("Reconstructructive", "Reconstructive")
    # MCC writes some courses in capitals ("DM NEPHROLOGY" beside "DM Nephrology");
    # left alone they would be two courses and two pages.
    prefix, _, rest = s.partition(" ")
    if rest and rest.upper() == rest:
        small = {"and", "of", "in", "with", "the", "for"}
        rest = " ".join(w.lower() if w.lower() in small else w.capitalize() for w in rest.split())
    rest = re.sub(r"\b(And|Of|In|With|For)\b", lambda m: m.group(1).lower(), rest)
    return f"{prefix} {rest}".strip()

def slug(s: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")

def institute(raw: str):
    s = re.sub(r"\s+", " ", raw).strip()
    name = s.split(",")[0].strip()
    m = re.search(r",\s*([^,]+?),\s*\d{6}\s*$", s)
    state = m.group(1).strip() if m else None
    if state:
        state = re.sub(r"\s*\(NCT\)", "", state)
    return name, state

q = lambda v: "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"

folder = sys.argv[1]
records = []
seen = set()
for path in sorted(glob.glob(os.path.join(folder, "ss*_*.csv"))):
    for r in csv.DictReader(open(path, encoding="utf-8")):
        key = (r["year"], r["round"], r["grp"], r["rank"])
        if key in seen:
            continue  # the same row twice across a page break
        seen.add(key)
        records.append(r)

# A wrapped table cell splits words where the line broke: "Endocrinolog y",
# "Nephrolo Gy", "Gastroentero logy". Two spellings with the same letters are
# the same name, so each takes its most common spelling.
from collections import Counter, defaultdict
letters = lambda s: re.sub(r"[^a-z]", "", s.lower())
def canonical(names):
    by_key = defaultdict(Counter)
    for n in names:
        by_key[letters(n)][n] += 1
    return {n: by_key[letters(n)].most_common(1)[0][0] for n in names}

course_of = canonical([course_name(r["course"]) for r in records])
inst_of = canonical([institute(r["institute"])[0] for r in records])

years = set()
values = []
for r in records:
        years.add(r["year"])
        name, state = institute(r["institute"])
        name = inst_of[name]
        course = course_of[course_name(r["course"])]
        src = SOURCES.get((r["year"], r["round"]), "")
        values.append(
            f"({r['year']},{q(r['round'])},{int(r['rank'])},{q(r['grp'].title())},{q(name)},{q(state)},"
            f"{q(r['institute'])},{q(course)},{q(slug(course))},{q(r['remarks'])},{q(src)})"
        )

print("BEGIN;")
print(f"DELETE FROM ss_allotments WHERE year IN ({','.join(sorted(years))});")
for i in range(0, len(values), 500):
    print("INSERT INTO ss_allotments (year, round, rank, grp, institute, state, institute_raw, course, course_slug, remarks, source_pdf) VALUES")
    print(",\n".join(values[i : i + 500]) + ";")
print("COMMIT;")
print("SELECT year, round, count(*) FROM ss_allotments GROUP BY 1, 2 ORDER BY 1, 2;")
print(f"-- {len(values)} rows", file=sys.stderr)
