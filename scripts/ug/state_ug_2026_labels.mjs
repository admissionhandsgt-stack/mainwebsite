// How each state's own NEET UG 2026 seat labels map onto our rows (2026-11-14). Import-free apart from nothing.
//
// mapLine(line, ctx) -> { quota, cats } | { skip }
//   quota  our quota label (2025's own label where the seat type is the same, else a new readable one)
//   cats   candidate category codes, best first — the importer takes the first one that 2025 used in the same state
//          and quota, else the first one that exists anywhere, else creates cats[0]
//   skip   why the line stays out of closing_ranks (it still goes to state_round_cuts)
// ctx: { own: "govt" | "private" | null, collegeState: our institute's state, sameState: boolean }
//
// The rule is one row, one seat: two different seat types never share a code (women's seats, hilly-area seats,
// earmarked seats keep codes of their own). The only seats merged are the same seat printed two ways (Maharashtra's
// "OPEN (EMD)" is an OPEN seat its holder may donate; Rajasthan's 2026 "Management" absorbed what 2025 called paid seats).
// Codes were read from the state lists' own legends as zyn's normalised files record them (D:\Zyn\data\normalized\
// state_ug_2026\<state>.json, "notes").

const pw = (code) => [`${code} PwD`, `${code}-PwD`, `${code} - PwD`, `${code} PH`, `${code}-PH`];

const M = {
  // KEA: GOVT. (Government quota, also at private colleges), PRIV. (OPN / GMP / GMPH / minority / RC), MNG (OTH), NRI.
  Karnataka(l) {
    const q = String(l.quota ?? "").replace(/\./g, "").trim().toUpperCase();
    const c = String(l.category ?? "").trim();
    if (q === "GOVT") return { quota: "KAR Govt Quota", cats: [c] };
    if (q === "MNG") return { quota: "KAR Others (Q)", cats: [c || "OTH"] };
    if (q === "NRI") return { quota: "Karnataka NRI Quota", cats: ["NRI"] };
    if (q === "PRIV") {
      if (/^GMPH?$/.test(c)) return { quota: "Karnataka Private Seats - GMP Quota", cats: [c] };
      if (c === "OPN") return { quota: "Karnataka Private Seats - Open Quota", cats: [c] };
      return { quota: "KAR Priv Seats-Min", cats: [c] };
    }
    return { skip: `quota ${l.quota}` };
  },
  // KNRUHS: Competent Authority (Category A), CTB-LOC / CTB-UNR (Category B), NRI-UNR (Category C).
  Telangana(l) {
    const q = String(l.quota ?? "").trim();
    const c = String(l.category ?? "").trim();
    if (/^Competent Authority/i.test(q)) return { quota: "Tel Govt-LOC (OU)", cats: [c] };
    const rest = c.replace(/^(OPEN|MIN)-/, "");
    if (q === "CTB-LOC") return { quota: "Tel Mgmt-Cat B-LOC", cats: [`CAT B-${rest}`] };
    if (q === "CTB-UNR") return { quota: "Tel Mgmt-Cat B-UNR", cats: [`CAT B-${rest}`] };
    if (q === "NRI-UNR") return { quota: "Tel Mgmt-Cat C(NRI)", cats: [`NRI-${rest}`] };
    return { skip: `quota ${q}` };
  },
  // RUHS board: Government, Management (incl. RAJMES society seats), General (private colleges' general seats), NRI.
  // Category = the matrix column: UR/EB/MB/OB/SC/ST/SA (Sahariya) + B (general) or G (women).
  Rajasthan(l) {
    const q = String(l.quota ?? "").trim();
    const c = String(l.category ?? "").trim().toUpperCase();
    const quota = { Government: "Government", Management: "Management", General: "Private", NRI: "NRI" }[q];
    if (!quota) return { skip: `quota ${l.quota}` };
    if (quota === "NRI") return { quota, cats: ["NRI"] };
    const m = /^(UR|EB|MB|OB|SC|ST|SA)([BG])$/.exec(c);
    if (!m) return { skip: `category ${l.category}` };
    let v = { UR: "UR", EB: "EWS", MB: "MBC", OB: "OBC", SC: "SC", ST: "ST", SA: "STA" }[m[1]];
    if (quota === "Management" && v === "UR") v = "OPEN";
    const vs = v === "STA" ? ["ST STA", "STA"] : [v];
    const base = m[2] === "G" ? vs.map((x) => `${x} - GL`) : vs;
    return { quota, cats: l.pwd ? base.flatMap(pw) : base };
  },
  // DGME UP: no quota printed; Govt / Private from the college; category = UR|BC|SC|ST|EW + OP|GL|PH|EX|FF|NC.
  "Uttar Pradesh"(l, ctx) {
    const c = String(l.category ?? "").trim().toUpperCase();
    const minority = /MINORITY/i.test(l.college);
    const quota = ctx.own === "govt" ? "Government" : "Private";
    if (minority) return { quota: "Private", cats: ["Minority"] };
    const m = /^(UR|BC|SC|ST|EW)(OP|GL|PH|EX|FF|NC)$/.exec(c);
    if (!m) return { skip: `category ${l.category}` };
    const plain = { UR: "UR", BC: "OBC", SC: "SC", ST: "ST", EW: "EWS" }[m[1]];
    if (quota === "Private" && m[1] === "UR" && m[2] === "OP") return { quota, cats: ["All India OPEN", "UR"] };
    if (m[2] === "OP") return { quota, cats: [plain] };
    if (m[2] === "PH") return { quota, cats: [...pw(plain), `${m[1]}-PH`] };
    return { quota, cats: [`${m[1]}-${m[2]}`] };
  },
  // DME MP: quota = institute type (GOVT / Private); category = <category>/<class>/OP, class X (none) PH FF SN GS.
  "Madhya Pradesh"(l) {
    const q = String(l.quota ?? "").trim().toUpperCase();
    const c = String(l.category ?? "").trim();
    if (c.toUpperCase() === "NRI") return { quota: "NRI", cats: ["NRI"] };
    const quota = q === "GOVT" ? "Government" : q === "PRIVATE" ? "Private" : null;
    if (!quota) return { skip: `quota ${l.quota}` };
    const m = /^(UR|OBC|SC|ST|EWS)\/(X|GS|FF|PH|SN)\/OP$/i.exec(c);
    if (!m) return { skip: `category ${c}` };
    const v = m[1].toUpperCase();
    const k = m[2].toUpperCase();
    if (k === "X") return { quota, cats: [v] };
    if (k === "GS") return { quota, cats: [`${v} - GS`, `${v}-GS`, `${v}- GS`] };
    if (k === "FF") return { quota, cats: [`${v} FF`] };
    if (k === "SN") return { quota, cats: [`${v}-SN`] };
    return { quota, cats: [...pw(v)] };
  },
  // OJEE: HS / '-' / 'Home State' (state quota), SGS (Govt-school 15%), NRI / NR / Non-Resident Indian.
  // Category = OP|EB|SC|ST|EW (+ NO|GC|PH|EX), EB = SEBC.
  Odisha(l, ctx) {
    const q = String(l.quota ?? "-").trim();
    const c = String(l.category ?? "").trim().toUpperCase();
    if (/^(NRI|NR|Non-Resident Indian)$/i.test(q)) return { quota: "NRI", cats: ["NRI"] };
    const school = /^SGS$/i.test(q);
    const quota = school ? (ctx.own === "govt" ? "Government School" : "Private School") : ctx.own === "govt" ? "Government" : "Private";
    const m = /^(OP|EB|SC|ST|EW)(NO|GC|PH|EX)?$/.exec(c);
    if (!m) return { skip: `category ${l.category}` };
    const v = { OP: "OP", EB: "SEBC", SC: "SC", ST: "ST", EW: "EWS" }[m[1]];
    const k = m[2] ?? "NO";
    if (k === "NO") return { quota, cats: [v] };
    if (k === "GC") return { quota, cats: [`${v}-GC`] };
    if (k === "PH") return { quota, cats: [`${v}-PwD`] };
    return { quota, cats: v === "EWS" ? ["EW(EX)", "EWS-EX"] : [`${v}-EX`] };
  },
  // DME CG: GQ (state quota; at a private college 2025 called it "Pvt Govt Quota"), Mgmt, Mgmt (Converted UR), NRI,
  // Minority. Category = UR|OBC|SC|ST|EWS|SST + NC (none) | F / Female (women) | PH | FF | EX.
  Chhattisgarh(l, ctx) {
    const q = String(l.quota ?? "").trim();
    let quota;
    if (q === "GQ") quota = ctx.own === "govt" ? "Government" : "Pvt Govt Quota";
    else if (/^Mgmt/i.test(q)) quota = "Management Quota";
    else if (q === "NRI") quota = "NRI";
    else if (q === "Minority") quota = "Minority";
    else return { skip: `quota ${l.quota}` };
    const c = String(l.category ?? "").trim().replace(/^Special ST/i, "SST");
    const m = /^(UR|OBC|SC|ST|EWS|SST)-(NC|F|Female|PH|FF|EX)$/i.exec(c);
    if (!m) return { skip: `category ${c}` };
    const v = m[1].toUpperCase();
    const k = m[2];
    if (/^NC$/i.test(k)) return { quota, cats: [v] };
    if (k === "F") return { quota, cats: [`${v}-F`] };
    if (/^Female$/i.test(k)) return { quota, cats: [`${v}-FEMALE`, `${v}-Female`] };
    if (/^FF$/i.test(k)) return { quota, cats: [`${v} FF`] };
    if (/^EX$/i.test(k)) return { quota, cats: [`${v}-EX`] };
    return { quota, cats: [...pw(v)] };
  },
  // BFUHS: Govt. Quota / Government, Management Quota / Management, Christian Minority (2A-2G), NRI as a category.
  // "Open Quota", "Open Quota (AIQ)" and "Minority Quota" are CMC / CDC sub-lists 2025 did not hold apart: left out.
  Punjab(l, ctx) {
    const q = String(l.quota ?? "").trim();
    const c = String(l.category ?? "").trim();
    if (/^NRI$/i.test(c)) return { quota: "NRI", cats: ["NRI"] };
    if (q === "Christian Minority") return { quota: "Christian Minority", cats: [c === "Open" ? "OPEN" : c] };
    const GQ = { Open: "GQ-GEN", "Backward Classes": "GQ-BC", "Scheduled Caste": "GQ-SC", EWS: "GQ-EWS", "Backward Area": "GQ-Backward Area", "Border Area": "GQ-Border Area", Defence: "GQ-Defence", "Freed Fight": "GQ-FF", "J & K": "GQ-JK", PWD: "GQ PWD", "Riots Affected": "GQ-RA(Riot Affected)", "Sports Person": "GQ-Sports", "Terrorist Affected": "GQ-TA" };
    const PRIV = { Open: "UR", "Backward Classes": "OBC", "Scheduled Caste": "SC", "Backward Area": "Backward Area", "Border Area": "Border Area", Defence: "Defence", "J & K": "J & K", PWD: "PWD", "Riots Affected": "Riots Affected", "Sports Person": "Sports Person", "Terrorist Affected": "Terrorist Affected", "Freed Fight": "Freedom Fighter", EWS: "EWS" };
    const MQ = { Open: "MQ-GEN", "Backward Classes": "MQ-BC", "Scheduled Caste": "MQ-SC" };
    if (/^Govt\.? Quota$|^Government$/i.test(q)) {
      if (ctx.own === "govt") return GQ[c] ? { quota: "Government", cats: [GQ[c]] } : { skip: `category ${c}` };
      return PRIV[c] ? { quota: "Private", cats: [PRIV[c]] } : { skip: `category ${c}` };
    }
    if (/^Management( Quota)?$/i.test(q)) return { quota: "Management", cats: [MQ[c] ?? `MQ-${c}`] };
    return { skip: `quota ${q}` };
  },
  // WBMCC: State Quota (govt and private colleges alike), Private Management Quota, NRI Quota.
  "West Bengal"(l, ctx) {
    const q = String(l.quota ?? "").trim();
    const c = String(l.category ?? "").trim().replace(/OBC \(Non-Creamy Layer\)/i, "OBC");
    if (/^NRI/i.test(q)) return { quota: "NRI", cats: ["NRI"] };
    if (/^Private Management/i.test(q)) return { quota: "Management", cats: ["UR", "Management"] };
    if (/^State Quota$/i.test(q)) {
      const quota = ctx.own === "govt" ? "Government" : "Private";
      const m = /^(UR|OBC|SC|ST|EWS)( PwD)?$/i.exec(c);
      if (!m) return { skip: `category ${c}` };
      return { quota, cats: m[2] ? pw(m[1].toUpperCase()) : [m[1].toUpperCase()] };
    }
    return { skip: `quota ${q}` };
  },
  // DMER Haryana: no quota column; Management, NRI and minority seats show only as the category.
  Haryana(l, ctx) {
    const c = String(l.category ?? "").trim().replace(/\s+/g, " ");
    if (/^MGT$/i.test(c)) return { quota: "Management", cats: ["Management"] };
    if (/^MINORITY$/i.test(c)) return { quota: "Management", cats: ["MINORITY"] };
    const nri = /^NRI Category - (I|II|III|IV|V|VI)$/i.exec(c);
    if (nri) return { quota: ctx.own === "govt" ? "Govt. NRI" : "Private NRI", cats: [`NRI-${["I", "II", "III", "IV", "V", "VI"].indexOf(nri[1].toUpperCase()) + 1}`] };
    const quota = ctx.own === "govt" ? "Government" : "Private";
    const m = /^(OPEN CAT|OSC|SC DEPRIVED|BCA|BCB|EWS)(.*)$/i.exec(c);
    if (!m) return { skip: `category ${c}` };
    const v = { "OPEN CAT": "UR", OSC: "SC", "SC DEPRIVED": "SCD", BCA: "BCA", BCB: "BCB", EWS: "EWS" }[m[1].toUpperCase()];
    const rest = m[2].trim();
    if (!rest) return { quota, cats: [v] };
    if (/^PWBD$/i.test(rest)) return { quota, cats: pw(v) };
    const p = /ESM FF (?:Priority\s*-?\s*([IVX]+)|\(DFF\))/i.exec(rest);
    if (p) return { quota, cats: [`${v} ESM FF ${p[1] ? `P-${p[1].toUpperCase()}` : "(DFF)"}`] };
    return { skip: `category ${c}` };
  },
  // BCECEB: no quota column; Govt colleges' state quota (UR SC ST EBC BC EWS RCG, DQ = PwD), private colleges' UR,
  // MM (Muslim minority), SM (Sikh minority), NRI.
  Bihar(l, ctx) {
    const c = String(l.category ?? "").trim().toUpperCase();
    if (c === "NRI") return { quota: "Private", cats: ["NRI"] };
    if (c === "MM") return { quota: "Private", cats: ["MUSLIM MINORITY"] };
    if (c === "SM") return { quota: "Private", cats: ["SIKH MINORITY"] };
    const quota = ctx.own === "govt" ? "Government" : "Private";
    if (c === "DQ") return { quota, cats: ["Disabled Quota"] };
    if (/^(UR|SC|ST|EBC|BC|EWS|RCG)$/.test(c)) return { quota, cats: [c] };
    return { skip: `category ${c}` };
  },
  // CENTAC: region letter + category + tags (U/K/M/Y; GE EW OB MB EB BM SC ST BT; GSS FF ESM MSP PH); A = open seat.
  Puducherry(l) {
    const q = String(l.quota ?? "").trim();
    const c = String(l.category ?? "").trim();
    if (/^GOVERNMENT QUOTA/i.test(q)) return { quota: "Government", cats: [c] };
    if (/^NRI/i.test(q)) return { quota: "NRI", cats: ["NRI"] };
    if (/TELUGU MINORITY/i.test(q)) return { quota: "Management", cats: ["Telugu Minority"] };
    if (/^MANAGEMENT QUOTA$/i.test(q)) return { quota: "Management", cats: ["OPEN"] };
    return { skip: `quota ${q}` };
  },
  // Meghalaya: State Quota (PIMC; and Shillong Medical College), BDS State Quota; the central-pool seats are colleges
  // elsewhere in India (left out by the importer's same-state rule).
  Meghalaya(l, ctx) {
    const q = String(l.quota ?? "").trim();
    const c = String(l.category ?? "").trim();
    const cat = { Unreserved: "UR", "SC/OST": "SC OST", Garo: "Garo", "Khasi & Jaintia": "Khasi & Jaintia" }[c];
    if (/^Management/i.test(q)) return { quota: "Private MQ", cats: ["MQ"] };
    if (/^NRI/i.test(q)) return { quota: "NRI", cats: ["NRI"] };
    if (/^State Quota/i.test(q)) {
      if (!cat) return { skip: `category ${c}` };
      return { quota: ctx.own === "govt" ? "Government" : "Private SQ", cats: [cat] };
    }
    return { skip: `quota ${q}` };
  },
  // Manipur prints only the candidate's category, never the seat's: not a seat line.
  Manipur() {
    return { skip: "the list prints the candidate's category, not the seat's" };
  },
  // Arunachal: central-pool seats, and the category is the candidate's (APST / NON-APST).
  "Arunachal Pradesh"() {
    return { skip: "central-pool seats with the candidate's category" };
  },
  // TRMCC: no quota column; the private colleges' state-domicile and all-India pools are not told apart in the lines.
  Tripura(l, ctx) {
    if (ctx.own !== "govt") return { skip: "private college: state and all-India pools share a line" };
    const c = String(l.category ?? "").trim().toUpperCase().replace(/^UR[- ]PWD$/, "UR PWD");
    const cat = { UR: "UR", EWS: "EWS", SC: "SC", ST: "ST", OBC: "OBC", STNO: "ST", "UR PWD": "UR PWD" }[c] ?? c;
    return { quota: "Government", cats: [cat] };
  },
  // GGSIPU (its own colleges): HS home state, OS outside Delhi, AI army wards. Category = OP|BC|SC|ST|EW + NO|PH|DF.
  Delhi(l) {
    const q = String(l.quota ?? "").trim().toUpperCase();
    const c = String(l.category ?? "").trim().toUpperCase();
    const quota = { HS: "Home State", OS: "Outside Delhi", AI: "Army" }[q];
    if (!quota) return { skip: `quota ${l.quota}` };
    if (c === "NOIA") return { quota, cats: ["ARMY"] };
    const m = /^(OP|BC|SC|ST|EW)(NO|PH|DF)$/.exec(c);
    if (!m) return { skip: `category ${c}` };
    const v = { OP: "Open", BC: "OBC", SC: "SC", ST: "ST", EW: "EWS" }[m[1]];
    if (m[2] === "NO") return { quota, cats: [v] };
    if (m[2] === "PH") return { quota, cats: [`${v} PwD`] };
    return { quota, cats: [`Delhi ${v === "Open" ? "GEN" : v} DEF`] };
  },
  // Assam State Quota (government colleges only).
  Assam(l) {
    const c = String(l.category ?? "").trim();
    const cat = c === "OBC/MOBC(NCL)" ? "OBC/MOBC (NCL)" : c;
    return { quota: "Government", cats: [cat] };
  },
  // CET Cell: the one Quota column names the seat's category and any remark (category is null). Govt / Private
  // from the college.
  Maharashtra(l, ctx) {
    const raw = String(l.quota ?? "").trim().replace(/\s+/g, " ");
    if (/Against|Inter-se|^ORPHAN|^MKB|Converted NRI/i.test(raw)) return { skip: `converted / special seat "${raw}"` };
    if (/^NRI\b/i.test(raw)) return { quota: "NRI", cats: ["NRI"] };
    if (/^AIQ\b/i.test(raw)) return { quota: "Private University Seats - All India Quota", cats: ["OPEN"] };
    if (/^I\.Q\./i.test(raw)) return { quota: "Management", cats: [/MINO/i.test(raw) ? "Minority" : "Management"] };
    const quota = ctx.own === "govt" ? "Government" : "Private";
    const CORE = { OPEN: "OPEN", SC: "SC", ST: "ST", SEBC: "SEBC", OBC: "OBC", EWS: "EWS", NTB: "NT-1", NTC: "NT-2", NTD: "NT-3", VJA: "VJ", DEF1: "DEF1", DEF2: "DEF2", DEF3: "DEF3" };
    // PwD seats: "PWD-OPEN PH", "PWD-OPEN (EMD)", "PEM OBC PH (EMR)"
    let m = /^(PWD-|PEM )(OPEN|SC|ST|SEBC|OBC|EWS|NTB|NTC|NTD|VJA)\b(.*)$/i.exec(raw);
    if (m) {
      const core = CORE[m[2].toUpperCase()];
      const em = /^PEM/i.test(m[1]);
      return { quota, cats: em ? [`EM ${core} PwD`] : pw(core) };
    }
    // Minority seats inside a private college's CAP list
    if (/\bMINO\b/i.test(raw)) return { quota, cats: [/\(W\)/.test(raw) ? "OPEN (W) MINO" : "OPEN MINO"] };
    // H (hilly area) / EM (earmarking receiver) prefixes, women marker W or (W), (EMD) donor, (EMR) receiver
    m = /^(HEM|H|EM)?\s*(OPEN|SC|ST|SEBC|OBC|EWS|NTB|NTC|NTD|VJA|DEF1|DEF2|DEF3)\s*(W\b|\(W\))?\s*(\(W\))?\s*(\(EMD\)|\(EMR\))?\s*$/i.exec(raw.replace(/(OPEN|SC|ST|SEBC|OBC|EWS|NTB|NTC|NTD|VJA)W\b/i, "$1 W"));
    if (!m) return { skip: `quota text "${raw}"` };
    const core = CORE[m[2].toUpperCase()];
    const women = Boolean(m[3] || m[4]);
    const pre = m[1] ? { H: "H ", EM: "EM ", HEM: "H EM " }[m[1].toUpperCase()] : "";
    return { quota, cats: [`${pre}${core}${women ? " (W)" : ""}`] };
  },
};

export function mapLine(line, ctx) {
  const f = M[line.state];
  if (!f) return { skip: `no mapping for ${line.state}` };
  return f(line, ctx);
}
