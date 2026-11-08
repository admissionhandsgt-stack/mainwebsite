#!/usr/bin/env bash
# SEO drift check for the key templates (2026-11-08): the seo-drift skill's baseline / compare over one URL list.
#   bash scripts/seo_drift.sh compare     # after a deploy: what changed in title, description, canonical, robots,
#                                         # H1–H3, JSON-LD, Open Graph, status — CRITICAL / WARNING / INFO
#   bash scripts/seo_drift.sh baseline    # after a change you meant: the new state becomes the known good one
# Snapshots live in ~/.cache/claude-seo/drift/baselines.db (this machine). CWV is skipped (PSI is slow and noisy here).
set -u
R="$HOME/.claude/skills/seo/scripts/claude-seo"
CMD="${1:-compare}"
case "$CMD" in baseline) S=drift_baseline.py ;; compare) S=drift_compare.py ;; *) echo "usage: $0 baseline|compare"; exit 1 ;; esac
B=https://www.admissionhands.com
for p in / /neet-college-predictor /neet-pg-cutoff /md-ms-india /neet-pg-counselling/2026/round-2-result \
  /md-ms-india/states/karnataka /md-ms-india/branches/md-radio-diagnosis /md-ms-india/branches/md-radio-diagnosis/maharashtra \
  /md-ms-india/stipend /md-ms-india/colleges/sri-madhusudan-sai-institute-of-medical-sciences-and-research-chikkaballapur \
  /mbbs-india/uttar-pradesh /neet-pg-marks-vs-rank; do
  out=$("$R" run "$S" "$B$p" --skip-cwv 2>&1)
  if [ "$CMD" = compare ]; then
    echo "$out" | python -I -c "
import sys, json
t = sys.stdin.read()
try:
    j = json.loads(t[t.index('{'):])
except Exception:
    print('$p  ERROR', t[-200:]); sys.exit()
f = j.get('triggered_findings') or []
sev = {}
for x in f:
    s = (x.get('severity') or '?').upper(); sev[s] = sev.get(s, 0) + 1
print('$p ', ' '.join(f'{k}:{v}' for k, v in sorted(sev.items())) or 'no change')
for x in f:
    if (x.get('severity') or '').upper() in ('CRITICAL', 'WARNING'):
        print('    ', x.get('severity'), x.get('rule'), '|', str(x.get('old_value'))[:80], '→', str(x.get('new_value'))[:80])
"
  else
    echo "$p  baseline saved"
  fi
done
