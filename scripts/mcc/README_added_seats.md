# MCC "newly added seats" notices → `mcc_seat_matrix`

MCC posts extra seats between rounds as a PDF ("NEWLY ADDED SEATS ROUND 2 (MD/MS/DNB)", 10 Nov 2026: 3,657 seats incl.
123 AFMS). Pipeline used on 2026-11-10 (owner: "seats update hui hai… correct numbers update hote rahe"):

1. Parse with pdfplumber inside the MCC worker image (the only place it is installed; read-only, no DB):
   `scp <pdf> scripts/mcc/parse_added_seats.py admissionhands@137.23.39.214:/tmp/` then
   `docker compose -p admissionhands -f /opt/admissionhands/compose.yml run --rm --no-deps -T -v /tmp/<pdf>:/t.pdf:ro -v /tmp/parse_added_seats.py:/p.py:ro mcc-worker python -P /p.py > added.json`
   Rows with a category must sum to the PDF's printed total (the last row with no category is that total).
2. Quota → matrix: All India → AIQ; Self-Financed Merit Seat / NRI / Jain / Muslim minority → Deemed; DNB Quota → DNB;
   BHU / AMU / IP / DU → Central Institutes Internal Quota; **Armed Forces Medical is left out** (not in the base matrix).
   Category "OP|EW|BC|SC|ST" + "NO|PH" → open/ews/obc/sc/st (+ _pwd).
3. Insert with `source_title = 'MCC PG Medical <year> - Newly added seats, Round N (<date>)'` and `source_file` = the PDF URL,
   course_id by the branch name with MCC's trailing code stripped ("M.D. Pathology (PATH)" = "M.D. Pathology"), institute_id
   by `mcc_institute_code` from earlier rows (new colleges stay unmatched; their state comes from MCC's state name).
   Idempotent: the import deletes its own source_title first. Dry run = the same SQL ending in ROLLBACK.
   2026-11-10: 2,396 rows, 3,534 seats; 2026 matrix 31,708 → 35,242.
4. Deploy with `--fresh-cache` (the overview and live figures are cached for a day).
