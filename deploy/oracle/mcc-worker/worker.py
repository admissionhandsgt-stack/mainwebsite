"""MCC round-result worker (2026-10-20).

Watches MCC's NEET PG counselling page and turns a round's result PDF into a page on the site within
minutes of MCC publishing it — the owner's request: "page automatic ban jaye… result aa jayega wahan
fetch karta rahe… har 2-2 min… turant banade".

  - Every 2 minutes inside a round's result window, every 30 otherwise. The windows come from the
    admin's own schedule (content_blocks, collection pg_schedule: "12 – 24 Oct" → around 24 Oct),
    so MCC's revised dates move the windows without a deploy.
  - A result PDF is recorded in mcc_round_results at once and the app told ("detected"), so the page
    shows "the result is out" with MCC's own link while the PDF is still being read.
  - The PDF is parsed with pdfplumber's table reader — the method the PG data session used for the
    2024 and 2025 results (D:/Gulshan/PG/Website/extracted-data/_scripts/parse_allotments.py) — in
    four processes, into mcc_allotments_staging; then the app ("ingest") maps courses and colleges,
    replaces the round in mcc_allotments, refreshes the pages, alerts the team and pings IndexNow.
  - A provisional result is replaced when MCC posts the final one. A PDF that yields too few rows is
    not a result (a notice about one) and is marked parse_failed, never published as one.

Run in the compose project as service `mcc-worker`. For testing on a dev machine:
  python -P worker.py --parse <file.pdf>               # parse only, print counts, touch nothing
  python -P worker.py --once                           # one check against MCC, with the database
"""

import datetime as dt
import html as htmllib
import os
import re
import sys
import tempfile
import time
import traceback
from concurrent.futures import ProcessPoolExecutor
from urllib.parse import urljoin

import pdfplumber

# Neither client is needed for `--parse` on a dev machine.
try:
    import psycopg
except ImportError:  # pragma: no cover
    psycopg = None
try:
    import requests
except ImportError:  # pragma: no cover
    requests = None

# MCC's PG page shows the newest few notices per box; the two full lists behind its "View More"
# links hold the rest, so a result is not missed when other notices push it off the front page.
PAGES = [
    "https://mcc.nic.in/pg-medical-counselling/",
    "https://mcc.nic.in/current-events-pg/",
    "https://mcc.nic.in/news-events-pg/",
]
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
HOT_EVERY = 120
COLD_EVERY = 1800
PROCESSES = int(os.environ.get("MCC_PARSE_PROCESSES", "4"))
MIN_ROWS = {"Round 1": 2000, "Round 2": 1000, "Round 3": 1000, "Stray Vacancy Round": 200, "Special Stray Vacancy Round": 100}
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


# ------------------------------------------------------------------ the PDF

def clean(s):
    return re.sub(r"\s+", " ", re.sub(r"-\n", "-", s or "")).strip()


def _front_matter(path):
    """MCC prints its quota and category abbreviations on the first page(s), and the table's header —
    which says where Rank sits — only once, at its start. Round 1 has a serial-number column before
    Rank; a later round's table does not (Rank is the first cell), so the position is read, never assumed."""
    abbr, rank_idx = {}, None
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages[:4]:
            for t in page.extract_tables():
                for raw in t:
                    cells = [clean(c) for c in raw if c is not None]
                    if len(cells) == 2 and cells[0] and cells[0] != "Abbrevation":
                        abbr[cells[0]] = cells[1]
                    elif rank_idx is None and "Rank" in cells:
                        rank_idx = cells.index("Rank")
            page.close()
            if rank_idx is not None:
                break
    return abbr, rank_idx


def _parse_pages(args):
    """Rows from pages [start, end). Same reading as the PG session's parser: the header row names
    the Rank column; after it a single-round table has six cells (quota, institute, course, allotted
    category, candidate category, remarks), a later round repeats earlier rounds first and ends with
    seven (… option no., remarks)."""
    path, start, end, abbr, rank_idx = args
    rows = []
    dash = lambda v: "" if v == "-" else v
    with pdfplumber.open(path) as pdf:
        for pno in range(start, end):
            page = pdf.pages[pno]
            for t in page.extract_tables():
                for raw in t:
                    cells = [clean(c) for c in raw if c is not None]
                    if not cells:
                        continue
                    if "Rank" in cells:
                        rank_idx = cells.index("Rank")
                        continue
                    idx = rank_idx
                    if idx is None or len(cells) < 7 or idx >= len(cells) or not cells[idx].isdigit():
                        continue
                    body = cells[idx + 1:]
                    if len(body) == 6:
                        q, inst, course, acat, ccat, rem = body
                        opt = ""
                    elif len(body) >= 7:
                        q, inst, course, acat, ccat, opt, rem = body[-7:]
                    else:
                        continue
                    rows.append((
                        int(cells[idx]),
                        abbr.get(dash(q), dash(q)),
                        dash(inst),
                        dash(course),
                        abbr.get(dash(acat), dash(acat)),
                        dash(ccat),
                        dash(opt),
                        rem,
                        pno + 1,
                    ))
            page.close()
    return rows


def parse_pdf(path, processes=PROCESSES):
    with pdfplumber.open(path) as pdf:
        n = len(pdf.pages)
    abbr, rank_idx = _front_matter(path)
    if rank_idx is None:
        raise RuntimeError("no Rank column in the first pages — not a result table")
    step = max(25, -(-n // (processes * 4)))
    chunks = [(path, a, min(n, a + step), abbr, rank_idx) for a in range(0, n, step)]
    rows = []
    if processes > 1:
        with ProcessPoolExecutor(max_workers=processes) as pool:
            for part in pool.map(_parse_pages, chunks):
                rows.extend(part)
    else:
        for c in chunks:
            rows.extend(_parse_pages(c))
    return n, rows


# ------------------------------------------------------------------ MCC's page

ROUND_RE = re.compile(r"round\s*[-–:]?\s*(1|2|3|i{1,3}|one|two|three)\b", re.I)
WORDS = {"1": 1, "i": 1, "one": 1, "2": 2, "ii": 2, "two": 2, "3": 3, "iii": 3, "three": 3}
# Read against MCC's archive of 2021–2025 titles: "Final Result of Round 1 for PG Counselling 2025",
# "Provisional Allotment Result Round 1 of PG Counselling 2024", "Final Result for Round-III of NEET
# PG Counselling 2025" are results; "Notice for Final Result for Round-III…" is a notice about one.
NOT_A_RESULT = re.compile(r"schedule|seat\s*matrix|corrigendum|notice|mock|choice|registration|guideline|vacancy\s*position|retain|reporting|fee|refund|bulletin|delay", re.I)
YEAR_RE = re.compile(r"\b(20\d\d)\b")


def classify(title):
    """'Round 1' / 'Stray Vacancy Round' / … and 'provisional' / 'final' / 'result', or None."""
    t = title.lower()
    if "result" not in t or NOT_A_RESULT.search(title):
        return None
    # A dental result (MCC runs MDS separately) is not ours, unless the title names PG medical too.
    if re.search(r"\bmds\b", t) and not re.search(r"\bmd\b|md\s*/\s*ms|md\s+ms|\bpg\b", t):
        return None
    if "stray" in t:
        rnd = "Special Stray Vacancy Round" if "special" in t else "Stray Vacancy Round"
    else:
        m = ROUND_RE.search(title)
        if not m:
            return None
        rnd = f"Round {WORDS[m.group(1).lower()]}"
    kind = "final" if "final" in t else "provisional" if "provisional" in t else "result"
    return rnd, kind


def fetch_links():
    """(title, url) of every link on MCC's PG pages, newest box first. One page failing is fine;
    all of them failing is an error (MCC down, or blocking us) and is raised."""
    out, errors = [], []
    for page in PAGES:
        try:
            r = requests.get(page, headers={"user-agent": UA, "accept": "text/html", "accept-language": "en-IN,en;q=0.9"}, timeout=30)
            r.raise_for_status()
        except Exception as e:  # noqa: BLE001
            errors.append(f"{page}: {type(e).__name__}: {e}")
            continue
        for m in re.finditer(r"<a\b[^>]*?href\s*=\s*[\"']([^\"'#]+)[\"'][^>]*>([\s\S]*?)</a>", r.text, re.I):
            href = htmllib.unescape(m.group(1).strip())
            title = re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", " ", m.group(2)))).strip()
            if not title or href.lower().startswith(("mailto:", "javascript:", "tel:")):
                continue
            out.append((title, urljoin(page, href)))
    if errors and len(errors) == len(PAGES):
        raise RuntimeError("; ".join(errors))
    return out


def of_year(title, url, year):
    """Is this link part of the `year` counselling? A year in the title must be that year. With none,
    the upload path decides — and the path is the upload date, not the counselling: 2025's round 3
    result sits under /uploads/2026/02/. A counselling runs from about July to the next March."""
    named = {int(y) for y in YEAR_RE.findall(title)}
    if named:
        return year in named
    m = re.search(r"/uploads/(20\d\d)/(\d\d)/", url)
    if not m:
        return False
    y, mon = int(m.group(1)), int(m.group(2))
    return (y == year and mon >= 7) or (y == year + 1 and mon <= 6)


def candidates(links, year):
    """Result PDFs of this counselling year, best kind per round (final > result > provisional)."""
    rank = {"final": 3, "result": 2, "provisional": 1}
    best = {}
    for title, url in links:
        c = classify(title)
        if not c or not of_year(title, url, year) or not url.lower().split("?")[0].endswith(".pdf"):
            continue
        rnd, kind = c
        if rnd not in best or rank[kind] > rank[best[rnd][1]]:
            best[rnd] = (title, kind, url)
    return best


# ------------------------------------------------------------------ the database

def log(conn, level, message):
    conn.execute("INSERT INTO mcc_worker_log (level, message) VALUES (%s, %s)", (level, message[:2000]))
    conn.commit()
    print(f"[{dt.datetime.now(IST):%d %b %H:%M:%S}] {level}: {message}", flush=True)


def counselling_year(conn):
    row = conn.execute("SELECT MAX(year) FROM mcc_seat_matrix").fetchone()
    return int(row[0]) if row and row[0] else dt.datetime.now(IST).year


def windows(conn, year):
    """[(round, start, end)] around each round's result date in the admin's schedule."""
    out = []
    names = {"round 1": "Round 1", "round 2": "Round 2", "round 3": "Round 3", "stray vacancy": "Stray Vacancy Round"}
    for title, data in conn.execute("SELECT title, data FROM content_blocks WHERE collection = 'pg_schedule' AND is_active"):
        rnd = names.get((title or "").strip().lower())
        aiq = (data or {}).get("aiq") if isinstance(data, dict) else None
        if not rnd or not aiq:
            continue
        found = re.findall(r"(\d{1,2})\s+([A-Za-z]{3})", aiq)
        if not found:
            continue
        day, mon = found[-1]
        month = MONTHS.get(mon.lower())
        if not month:
            continue
        # A counselling that starts in the autumn ends in the new year: a January date is next year's.
        end = dt.date(year + 1 if month < 7 else year, month, int(day))
        out.append((rnd, end - dt.timedelta(days=2), end + dt.timedelta(days=3)))
    return out


def is_hot(conn, year):
    today = dt.datetime.now(IST).date()
    if any(a <= today <= b for _, a, b in windows(conn, year)):
        return True
    # A provisional result or an unfinished one: the final may come any time in the next few days.
    row = conn.execute(
        """SELECT 1 FROM mcc_round_results
            WHERE year = %s AND (status <> 'live' OR kind <> 'final') AND detected_at > now() - interval '5 days' LIMIT 1""",
        (year,),
    ).fetchone()
    return bool(row)


def call_app(action, year, rnd, **extra):
    r = requests.post(
        os.environ.get("MCC_APP_URL", "http://app:8150") + "/api/cron/mcc-results",
        headers={"x-cron-secret": os.environ["CRON_SECRET"], "content-type": "application/json"},
        json={"action": action, "year": year, "round": rnd, **extra},
        timeout=300,
    )
    return r.status_code, r.text[:500]


def stage(conn, year, rnd, rows):
    with conn.cursor() as c:
        c.execute("DELETE FROM mcc_allotments_staging WHERE year = %s AND round = %s", (year, rnd))
        with c.copy(
            "COPY mcc_allotments_staging (year, round, rank, quota, institute, course, allotted_category, candidate_category, option_no, remarks, pdf_page) FROM STDIN"
        ) as copy:
            for row in rows:
                copy.write_row((year, rnd) + row)
    conn.commit()


def handle(conn, year, rnd, title, kind, url):
    cur = conn.execute(
        "SELECT status, source_url, now() - updated_at < interval '10 minutes' FROM mcc_round_results WHERE year = %s AND round = %s",
        (year, rnd),
    ).fetchone()
    if cur and cur[1] == url and cur[0] in ("live", "parse_failed"):
        return
    if cur and cur[1] == url and cur[0] == "error" and cur[2]:
        return  # failed a moment ago (MCC's server slow on result day): try again in ten minutes, not two
    conn.execute(
        """INSERT INTO mcc_round_results (year, round, kind, status, source_title, source_url)
           VALUES (%s, %s, %s, 'detected', %s, %s)
           ON CONFLICT (year, round) DO UPDATE
              SET kind = EXCLUDED.kind, status = 'detected', source_title = EXCLUDED.source_title,
                  source_url = EXCLUDED.source_url, updated_at = now(), error = NULL""",
        (year, rnd, kind, title, url),
    )
    conn.commit()
    log(conn, "found", f"{year} {rnd} ({kind}): {title} — {url}")
    # Best effort: the page and the team's alert. The app restarting for a deploy at that minute
    # must not hold up reading the PDF — publishing is the call that has to succeed.
    try:
        log(conn, "found", f"app detected -> {call_app('detected', year, rnd)}")
    except Exception as e:  # noqa: BLE001
        log(conn, "error", f"app detected call failed: {type(e).__name__}: {e}")

    conn.execute("UPDATE mcc_round_results SET status = 'parsing', updated_at = now() WHERE year = %s AND round = %s", (year, rnd))
    conn.commit()
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "result.pdf")
        with requests.get(url, headers={"user-agent": UA}, stream=True, timeout=120) as r:
            r.raise_for_status()
            size = 0
            with open(path, "wb") as f:
                for chunk in r.iter_content(1 << 16):
                    size += len(chunk)
                    if size > 200 * 1024 * 1024:
                        raise RuntimeError("PDF over 200 MB")
                    f.write(chunk)
        started = time.time()
        pages, rows = parse_pdf(path)
    rows = [r for r in rows if r[2]]  # a candidate with no seat after this round
    took = time.time() - started
    if len(rows) < MIN_ROWS.get(rnd, 100):
        msg = f"{len(rows)} rows from {pages} pages — not read as a result"
        conn.execute("UPDATE mcc_round_results SET status = 'parse_failed', error = %s, updated_at = now() WHERE year = %s AND round = %s", (msg, year, rnd))
        conn.commit()
        log(conn, "error", f"{year} {rnd}: {msg}")
        try:
            log(conn, "error", f"app failed -> {call_app('failed', year, rnd)}")
        except Exception as e:  # noqa: BLE001
            log(conn, "error", f"app failed call failed: {type(e).__name__}: {e}")
        return
    stage(conn, year, rnd, rows)
    log(conn, "parsed", f"{year} {rnd}: {len(rows)} rows from {pages} pages in {took:.0f}s")
    code, text = call_app("ingest", year, rnd)
    if code != 200:
        raise RuntimeError(f"app ingest answered {code}: {text}")
    log(conn, "live", f"{year} {rnd}: {text}")


def check(conn):
    year = counselling_year(conn)
    links = fetch_links()
    found = candidates(links, year)
    for rnd, (title, kind, url) in sorted(found.items()):
        try:
            handle(conn, year, rnd, title, kind, url)
        except Exception as e:  # one round's failure must not stop the others
            # 'error' (a download timing out, MCC's CDN slow on result day) is tried again on the next
            # pass; only a PDF that reads but holds no result is 'parse_failed' for good.
            conn.rollback()
            conn.execute(
                "UPDATE mcc_round_results SET status = 'error', error = %s, updated_at = now() WHERE year = %s AND round = %s",
                (f"{type(e).__name__}: {e}"[:1000], year, rnd),
            )
            conn.commit()
            log(conn, "error", f"{year} {rnd}: {type(e).__name__}: {e}")
    return year, len(links), sorted(found)


def main():
    if "--parse" in sys.argv:
        path = sys.argv[sys.argv.index("--parse") + 1]
        t = time.time()
        pages, rows = parse_pdf(path)
        seats = [r for r in rows if r[2]]
        print(f"pages {pages}, rows {len(rows)}, with a seat {len(seats)}, {time.time() - t:.0f}s")
        for r in seats[:3]:
            print(r)
        return
    if "--test" in sys.argv:
        # The whole path short of publishing, on a PDF already held: parse, stage, the app's ingest
        # as a dry run (a transaction it rolls back — no page changes, no alert), then unstage.
        #   python worker.py --test <file.pdf> <year> "<round>"
        i = sys.argv.index("--test")
        path, year, rnd = sys.argv[i + 1], int(sys.argv[i + 2]), sys.argv[i + 3]
        t = time.time()
        pages, rows = parse_pdf(path)
        rows = [r for r in rows if r[2]]
        print(f"parsed {len(rows)} rows from {pages} pages in {time.time() - t:.0f}s", flush=True)
        with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
            stage(conn, year, rnd, rows)
            try:
                print("app ingest (dry run) ->", call_app("ingest", year, rnd, dryRun=True), flush=True)
            finally:
                conn.execute("DELETE FROM mcc_allotments_staging WHERE year = %s AND round = %s", (year, rnd))
                conn.commit()
        return
    once = "--once" in sys.argv
    last_quiet = 0.0
    while True:
        hot = False
        try:
            with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
                year = counselling_year(conn)
                hot = is_hot(conn, year)
                if hot or once or time.time() - last_quiet >= COLD_EVERY:
                    if not hot:
                        last_quiet = time.time()
                    try:
                        y, n, rounds = check(conn)
                    except Exception as e:  # MCC down or refusing us: on record, and tried again next beat
                        conn.rollback()
                        log(conn, "error", f"could not read MCC's pages: {type(e).__name__}: {e}")
                    else:
                        # One line per look at MCC: the round pages print "last checked …" from it.
                        log(conn, "check", f"{y}: {n} links on MCC's PG pages, results seen: {', '.join(rounds) or 'none'}; {'result window' if hot else 'quiet'}")
                    conn.execute("DELETE FROM mcc_worker_log WHERE id < (SELECT MAX(id) - 5000 FROM mcc_worker_log)")
                    conn.commit()
        except Exception:
            traceback.print_exc()
        if once:
            return
        time.sleep(HOT_EVERY if hot else 60)


if __name__ == "__main__":
    main()
