"""Shared helpers for the per-state 2026-27 PG fee files that scripts/apply_state_fees.mjs reads.

A state's generator (scripts/data/make_fees_official_<state>_2026_27.py) does:

    from fees_official_lib import StateFees
    s = StateFees("Karnataka", classes=[("^AIQ$", "AIQ"), ("NRI", "NRI"), ...])
    s.fee("Bangalore Medical College", [123], "Gen", "*", inr=150000, source="KEA, PGM 2026 fee notification, p. 3")
    s.write()

Figures are typed from the official notice itself — the college's own 2026-27 PG fee notice, or the state counselling
authority's official fee list where the college publishes none (owner, 2026-10-25). Never a compiled listing, never an
aggregator. `source` names the notice so the row can be traced back to it.
"""

import json
from pathlib import Path

Y = "2026-27"


def inr(n):
    """₹ in Indian digit grouping: ₹13,20,000."""
    s, tail = str(int(n)), ""
    s, tail = s[:-3], s[-3:]
    while len(s) > 2:
        tail = s[-2:] + "," + tail
        s = s[:-2]
    return "₹" + (s + "," + tail if s else tail)


class StateFees:
    def __init__(self, state, classes, null_class=None):
        self.state, self.classes, self.null_class = state, [list(c) for c in classes], null_class or {}
        self.entries = []

    def fee(self, college, ids, seat, branches="*", inr=None, usd=None, source="", maximum=False, period="per year",
            ownership=None):
        """One column's fee at a college (ids) or at every college ("*", optionally of one ownership)."""
        if (inr is None) == (usd is None):
            raise ValueError(f"{college} {seat}: give exactly one of inr / usd")
        e = {"college": college, "ids": ids, "seat": seat, "branches": branches, "fee_inr": inr, "fee_usd": usd,
             "max": maximum, "year": Y, "source": source}
        if period != "per year":
            e["period"] = period
        if ownership:
            e["ownership"] = ownership
        self.entries.append(e)

    def fees(self, college, ids, source, branches="*", **by_seat):
        """Several columns at once: s.fees(name, ids, src, Gen=150000, Mgmt=900000, NRI_usd=40000)."""
        for seat, v in by_seat.items():
            if seat.endswith("_usd"):
                self.fee(college, ids, seat[:-4], branches, usd=v, source=source)
            else:
                self.fee(college, ids, seat, branches, inr=v, source=source)

    def no_seat(self, college, ids, seat, branches, source, reason=None):
        """The notice prints "-" for these seats: blank the row rather than keep last year's figure."""
        e = {"college": college, "ids": ids, "seat": seat, "branches": branches, "noseat": True, "year": Y, "source": source}
        if reason:
            e["reason"] = reason
        self.entries.append(e)

    def hostel(self, college, ids, text, source, lo=None, hi=None):
        self.entries.append({"college": college, "ids": ids, "seat": "Hostel", "text": text, "year": Y, "source": source,
                             "min": lo, "max": hi or lo})

    def note(self, college, ids, text, source):
        self.entries.append({"college": college, "ids": ids, "seat": "Note", "text": text, "year": Y, "source": source})

    def write(self, path=None):
        slug = self.state.lower().replace("&", "and").replace(" ", "_")
        out = Path(path) if path else Path(__file__).with_name(f"fees_official_{slug}_2026_27.json")
        out.write_text(json.dumps({"state": self.state, "classes": self.classes, "null_class": self.null_class,
                                   "entries": self.entries}, ensure_ascii=False, indent=1), encoding="utf-8")
        n = sum(1 for e in self.entries if e["seat"] not in ("Hostel", "Note"))
        print(f"{out.name}: {n} fee entries, {len(self.entries) - n} hostel/notes")
        return out
