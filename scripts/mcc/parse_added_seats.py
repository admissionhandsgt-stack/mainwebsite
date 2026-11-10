import pdfplumber, json, re, sys
rows = []
with pdfplumber.open("/t.pdf") as pdf:
    for pg in pdf.pages:
        for tb in pg.extract_tables():
            for r in tb:
                if not r or len(r) < 7: continue
                cells = [(c or "").replace("\n", " ").strip() for c in r]
                if cells[0].lower().startswith("statename") or cells[-1].lower().startswith("totalseat"): continue
                rows.append(cells)
out = []
last = {}
for c in rows:
    state, itype, inst, quota, branch, cat, seats = c[0], c[1], c[2], c[3], c[4], c[5], c[6]
    if not seats: continue
    try: n = int(re.sub(r"\D", "", seats))
    except: continue
    code = re.search(r"\((\d{6})\)", inst)
    out.append({"state": state or last.get("state",""), "type": itype, "inst": inst, "code": code.group(1) if code else None, "quota": quota, "branch": branch, "cat": cat, "seats": n})
    if state: last["state"] = state
print(json.dumps(out))
