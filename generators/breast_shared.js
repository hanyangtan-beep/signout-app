// Shared helpers for the breast resection synoptics (breast_carcinoma, breast_dcis, phyllodes):
// specimen head, macro sentences, the seven-face margin walker, the regional lymph node block and the
// distant metastasis value. Wording follows the QMH Cancer Reporting Template breast pages
// (docs/specs/breast-pair.md). Pure functions of the part values; no schema knowledge beyond field ids.

export const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
export const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : 0; };
export const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
export const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
/** lc1 that leaves proper nouns (Paget, Nottingham, ...) alone. */
export const lcProse = (s) => (/^(Paget|Nottingham|Miller|Bloom|Allred|HER2|ER|PR|DCIS|LCIS)\b/.test(s || '') ? s : lc1(s));
export const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/** "Two lymph nodes" - counts one to ten as words so a sentence never starts with a numeral. */
export const countWords = (n, noun) => plural(n, noun).replace(/^\d+/, (d) => ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][parseInt(d, 10) - 1] || d);
export const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');
export const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
export const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
export const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|submitted|specified)|^Cannot/.test(s));
export const specify = (s) => String(s || '').replace(/\s*\((specify|explain)[^)]*\)\s*:?$/i, '').trim();
export const na = (s) => !s || /^Not applicable/.test(s);
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };
export const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);

// ---------- specimen head ----------

/** "total mastectomy" / "excision (less than total mastectomy)" / typed other procedure. */
export function procedureText(v) {
  const p = v.procedure || 'Not specified';
  if (p === 'Other (specify)') return stripDot(v.procedureOther) || 'resection';
  if (/^Total mastectomy/.test(p)) return 'Total mastectomy';
  if (/^Excision/.test(p)) return 'Excision (less than total mastectomy)';
  return p;
}

/** Short procedure word for the specimen line: "total mastectomy" / "wide local excision" / typed. */
export function procedureShort(v) {
  const p = v.procedure || 'Not specified';
  if (p === 'Other (specify)') return lc1(stripDot(v.procedureOther)) || 'resection';
  if (/^Total mastectomy/.test(p)) return 'total mastectomy';
  if (/^Excision/.test(p)) return 'wide local excision';
  return 'resection';
}

export const sideText = (v) => (v.laterality && v.laterality !== 'Not specified' ? lc1(v.laterality) : '');

/** Tumour site text: quadrants / position, with "Other (specify)" resolved to the typed detail. */
export function siteText(v) {
  const sites = arr(v.tumourSite).filter((s) => s !== 'Not specified');
  const pos = stripDot(v.sitePosition);
  const out = sites.map((s) => (s === 'Position (specify)' ? '' : s === 'Other (specify)' ? '' : s)).filter(Boolean);
  const detail = sites.some((s) => /\(specify\)/.test(s)) ? pos : '';
  const text = [out.join(', '), detail].filter(Boolean).join('; ');
  if (text) return pos && !detail ? `${text} (${pos})` : text;
  return pos || 'Not specified';
}

/** Site as prose for the macroscopic sentence: "upper outer quadrant (2 o'clock)", "central breast and nipple". */
export function siteProse(v) {
  const sites = arr(v.tumourSite).filter((s) => s !== 'Not specified' && !/\(specify\)/.test(s));
  const pos = stripDot(v.sitePosition);
  const words = sites.map((s) => (s === 'Central' ? 'central breast' : lc1(s)));
  const text = listJoin(words);
  if (text) return pos ? `${text} (${pos})` : text;
  return pos || '';
}

export function headParts(v) {
  return { organ: 'Breast', site: sideText(v), proc: procedureShort(v) };
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  const h = headParts(v);
  return `${h.organ}${h.site ? `, ${h.site}` : ''}, ${h.proc}`;
}

export function diagnosisHead(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  const h = headParts(v);
  return `(${part.label}) ${typed ? upperHead(typed) : `${h.organ.toUpperCase()}${h.site ? `, ${h.site}` : ''}, ${h.proc}`}`;
}

// ---------- other parts (typed lines "C) Axillary contents, dissection - 2/14") ----------

export function otherParts(v) {
  const out = [];
  for (const raw of String(v.otherParts || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^\(?([A-Z])\)?[\s.:)-]+(.+?)(?:\s+-\s+|\s*:\s+)(.+)$/);
    if (m) out.push({ label: m[1], specimen: stripDot(m[2]), finding: stripDot(m[3]) });
    else { const m2 = line.match(/^\(?([A-Z])\)?[\s.:)-]+(.+)$/); if (m2) out.push({ label: m2[1], specimen: stripDot(m2[2]), finding: '' }); }
  }
  return out;
}
export const hasExtraParts = (part) => otherParts(part.values).length > 0;
export function otherSpecimenLines(part) { return otherParts(part.values).map((o) => `(${o.label}) ${o.specimen}`); }
export function specimens(parts) {
  const lines = parts.map((p) => ({ label: p.label, text: `(${p.label}) ${specimenName(p)}` }));
  for (const p of parts) for (const o of otherParts(p.values)) lines.push({ label: o.label, text: `(${o.label}) ${o.specimen}` });
  return lines.sort((a, b) => a.label.localeCompare(b.label)).map((l) => l.text).join('\n');
}

/** Diagnosis text for a typed other-part finding ("2/14", "negative 0/12", "metastatic, 1/1", free text). */
export function findingText(finding, tumourWord = 'CARCINOMA') {
  const f = finding.trim();
  let m;
  if (!f) return 'SEE SYNOPTIC REPORT';
  if ((m = f.match(/^(?:metastatic|positive|met|involved|nodes?)\s*[,;:]?\s*(\d+)\s*\/\s*(\d+)(?:\s*[,;]\s*(.+))?$/i)) || (m = f.match(/^(\d+)\s*\/\s*(\d+)(?:\s*[,;]\s*(.+))?$/))) {
    const pos = parseInt(m[1], 10); const tot = parseInt(m[2], 10);
    if (pos === 0) return `NO EVIDENCE OF MALIGNANCY IN ${plural(tot, 'LYMPH NODE')} (0/${tot})`;
    return `METASTATIC ${tumourWord} IN ${pos} OF ${plural(tot, 'LYMPH NODE')}${m[3] ? `, ${m[3]}` : ''}`;
  }
  if ((m = f.match(/^(?:negative|no tumour|benign|nem|no evidence)\s*[,;:]?\s*(\d+)\s*\/\s*(\d+)(?:\s*[,;]\s*(.+))?$/i))) return `NO EVIDENCE OF MALIGNANCY IN ${plural(parseInt(m[2], 10), 'LYMPH NODE')} (0/${m[2]})${m[3] ? `; ${m[3]}` : ''}`;
  if (/^(involved|involvement)\b/i.test(f)) return `INVOLVED BY ${tumourWord}${(m = f.match(/^\w+\s*[,;]\s*(.+)$/)) ? `, ${m[1]}` : ''}`;
  if (/^(metastatic|positive|met)\b/i.test(f)) return `METASTATIC ${tumourWord}${(m = f.match(/^\w+\s*[,;]\s*(.+)$/)) ? `, ${m[1]}` : ''}`;
  if (/^(negative|no tumour|benign|nem|no evidence)/i.test(f)) return `NO EVIDENCE OF MALIGNANCY${(m = f.match(/^[^,;]+\s*[,;]\s*(.+)$/)) ? `; ${m[1]}` : ''}`;
  const comma = f.search(/[,;]/);
  return comma > 0 ? `${f.slice(0, comma).toUpperCase()}${f.slice(comma)}` : f.toUpperCase();
}

/** True when the case prints part letters: more than one distinct letter or typed other parts. */
export const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1 || hasExtraParts(part);

// ---------- macro ----------

export const CUT_TEXT = { Firm: 'firm', 'Grey-white': 'grey-white', Tan: 'tan', 'Ill-defined / stellate': 'ill-defined, stellate', 'Well-circumscribed': 'well-circumscribed', Gritty: 'gritty', Necrosis: 'necrotic', Haemorrhage: 'haemorrhagic', Mucoid: 'mucoid', Fleshy: 'fleshy', 'Leaf-like clefts': 'with leaf-like clefts', Cystic: 'cystic' };

/** First macro sentence: "The specimen consists of a left total mastectomy specimen (520 g, 190 x 160 x 45 mm) with an overlying skin ellipse (170 x 60 mm) bearing the nipple." */
export function specimenSentence(v, { nipple = true } = {}) {
  const w = num(v.weight); const dims = stripDot(v.specimenDims);
  const meas = [w !== null ? `${fmt(w)} g` : '', dims ? `${dims} mm` : ''].filter(Boolean).join(', ');
  const side = sideText(v);
  const phrase = `${side ? `${side} ` : ''}${procedureShort(v)} specimen`;
  const skin = stripDot(v.skinEllipse);
  const hasNipple = nipple && v.nipple && v.nipple !== 'Not present in specimen';
  const skinText = skin ? ` with an overlying skin ellipse (${skin} mm)${hasNipple ? ' bearing the nipple' : ''}` : hasNipple ? ' with the nipple' : '';
  return `The specimen consists of ${/^[aeiou]/.test(phrase) ? 'an' : 'a'} ${phrase}${meas ? ` (${meas})` : ''}${skinText}.`;
}

/** Tumour sentence: "Sectioning reveals a firm, grey-white, ill-defined, stellate tumour measuring 23 mm in greatest dimension (23 x 20 x 18 mm) in the upper outer quadrant, 5 mm from the posterior margin." */
export function tumourSentence(v, { noun = 'tumour', size = num(v.sizeMm), dims = stripDot(v.tumourDims) } = {}) {
  const cut = arr(v.cutSurface).map((c) => CUT_TEXT[c] || lc1(c)).filter(Boolean);
  const sizeText = size !== null ? `${fmt(size)} mm in greatest dimension${dims ? ` (${dims} mm)` : ''}` : dims ? `${dims} mm` : '';
  const site = siteProse(v);
  const close = stripDot(v.closestGrossMm);
  let closeText = '';
  if (close) {
    const m = close.match(/^([\d.]+)\s*(?:mm)?\s*[,;:]?\s*(.*)$/);
    closeText = m ? `, ${m[1]} mm from the ${m[2] ? `${lc1(stripDot(m[2]))} margin` : 'closest margin'}` : `, ${close}`;
  }
  const lead = cut.length ? cut.join(', ') : noun;
  return `Sectioning reveals ${/^[aeiou]/i.test(lead) ? 'an' : 'a'} ${cut.length ? `${cut.join(', ')} ` : ''}${noun}${sizeText ? ` measuring ${sizeText}` : ''}${site && site !== 'Not specified' ? ` in the ${site}` : ''}${closeText}.`;
}

export function blockKey(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const lines = String(part.values.blockKeyText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    const m = l.match(/^\(?([\dA-Za-z]+(?:\s*[-–,]\s*[\dA-Za-z]+)*)\)?[\s.:)-]+(.*)$/);
    return m ? `(${lettered(part, ctx) ? part.label : ''}${m[1].replace(/\s+/g, '')}) ${stripDot(m[2])}.` : `${stripDot(l)}.`;
  }).join('\n');
}

// ---------- margin walker ----------

export const FACES = ['Anterior', 'Posterior', 'Superior', 'Inferior', 'Medial', 'Lateral'];
const FACE_RE = /^(anterior|posterior|superior|inferior|medial|lateral|deep|superficial|all|other)\b\s*(?:\(([^)]*)\))?\s*[:=-]?\s*(.*)$/i;

/**
 * Parse the margin text ("Anterior: 5", "Posterior: involved", "Medial: cannot", "Superior: >10", "All: >5",
 * "Other (nipple): 3"). Returns { faces: [{face, status, mm, gt, raw}], bad: [lines], blank: [faces] } where
 * status is 'uninvolved' | 'involved' | 'cannot' | 'blank'.
 */
export function parseMargins(text) {
  const faces = new Map();
  const bad = [];
  const setAll = (entry) => { for (const f of FACES) faces.set(f, { ...entry, face: f }); };
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(FACE_RE);
    if (!m) { bad.push(line); continue; }
    let face = uc1(m[1].toLowerCase());
    if (face === 'Deep') face = 'Posterior';
    if (face === 'Superficial') face = 'Anterior';
    if (face === 'Other') face = m[2] ? `Other (${stripDot(m[2])})` : 'Other';
    const val = m[3].trim();
    let entry;
    if (val === '') entry = { status: 'blank', mm: null, gt: false, raw: val };
    else if (/^(involved|positive|present|tumour at|ink)/i.test(val)) entry = { status: 'involved', mm: null, gt: false, raw: val };
    else if (/^(cannot|n\/?a|not assess)/i.test(val)) entry = { status: 'cannot', mm: null, gt: false, raw: val };
    else {
      const n = val.match(/^(>|greater than|more than|≥|>=)?\s*([\d.]+)\s*(?:mm)?\s*\+?\s*(.*)$/i);
      if (!n) { bad.push(line); continue; }
      entry = { status: 'uninvolved', mm: parseFloat(n[2]), gt: !!n[1] || /\+\s*$/.test(val), raw: val, note: stripDot(n[3]) };
    }
    if (face === 'All') setAll(entry); else faces.set(face, { ...entry, face });
  }
  const list = [...faces.values()];
  return { faces: list, bad, blank: FACES.filter((f) => !faces.has(f) || faces.get(f).status === 'blank') };
}

/** Synoptic value for one margin face. `what` = "invasive carcinoma" | "DCIS" | "tumour". */
export function marginValue(e, what) {
  if (!e || e.status === 'blank') return '';
  if (e.status === 'involved') return `Involved by ${what}${e.raw && /[,;(]/.test(e.raw) ? ` (${stripDot(e.raw.replace(/^[^,;(]+[,;(]\s*/, '').replace(/\)$/, ''))})` : ''}`;
  if (e.status === 'cannot') return 'Cannot be assessed';
  return `Uninvolved by ${what}, closest distance: ${e.gt ? 'greater than ' : ''}${fmt(e.mm)} mm${e.note ? ` (${e.note})` : ''}`;
}

/** Synoptic items for the walker, in QMH face order (Anterior, Posterior, Superior, Inferior, Medial, Lateral, Other). */
export function marginItems(text, what) {
  const p = parseMargins(text);
  const order = (f) => { const i = FACES.indexOf(f.face); return i < 0 ? 99 : i; };
  return p.faces.filter((f) => f.status !== 'blank').sort((a, b) => order(a) - order(b)).map((f) => item(`${f.face} margin`, marginValue(f, what)));
}

/** Diagnosis phrase: "margins clear (closest 5 mm, posterior)" / "posterior margin involved; other margins clear" / ''. */
export function marginsPhrase(text, what = '') {
  const p = parseMargins(text);
  const named = p.faces.filter((f) => f.status !== 'blank');
  if (!named.length) return '';
  const involved = named.filter((f) => f.status === 'involved').map((f) => lc1(f.face));
  const clear = named.filter((f) => f.status === 'uninvolved');
  const out = [];
  const tag = what ? `${what} ` : '';
  if (involved.length) out.push(`${listJoin(involved)} margin${involved.length === 1 ? '' : 's'} involved${what ? ` by ${what}` : ''}`);
  if (clear.length) {
    const exact = clear.filter((f) => !f.gt);
    const closest = (exact.length ? exact : clear).reduce((a, b) => (a === null || b.mm < a.mm ? b : a), null);
    const word = involved.length ? 'other margins clear' : `${tag}margins clear`;
    out.push(closest ? `${word} (${closestWords(closest, exact.length > 0)})` : word);
  }
  return out.join('; ');
}

/** Closest clear face (exact distances preferred over "greater than" entries), or null. */
export function closestMargin(text) {
  const p = parseMargins(text);
  const clear = p.faces.filter((f) => f.status === 'uninvolved');
  const exact = clear.filter((f) => !f.gt);
  const c = (exact.length ? exact : clear).reduce((a, f) => (a === null || f.mm < a.mm ? f : a), null);
  return c ? { ...c, allGt: !exact.length } : null;
}

/**
 * "closest 5 mm, posterior" for an exact closest face; "all greater than 10 mm" when every clear face was
 * entered as "greater than" (no face is singled out).
 */
export function closestWords(c, hasExact = !c.allGt) {
  if (!c) return '';
  if (!hasExact) return `all greater than ${fmt(c.mm)} mm`;
  return `closest ${fmt(c.mm)} mm, ${lc1(c.face)}`;
}

// ---------- regional lymph nodes ----------

export function nodeCounts(v) {
  const examined = int(v.nodesExamined);
  const sentinel = int(v.nodesSentinel);
  const macro = int(v.nodesMacro);
  const micro = int(v.nodesMicro);
  const itc = int(v.nodesItc);
  return { examined, sentinel, macro, micro, itc, positive: macro + micro };
}

export const nodesSubmitted = (v) => !!v.nodeSampling && v.nodeSampling !== 'No nodes submitted';

/**
 * Regional lymph node items in QMH order. `origin` ("part A" / "S26-01200") is appended to the examined line.
 * For phyllodes (no ITC / micro split) pass `simple: true` and `nodesPositive`.
 */
export function nodeItems(v, { origin = '', simple = false } = {}) {
  if (!nodesSubmitted(v)) return [item('Regional lymph nodes', 'No lymph nodes submitted or found')];
  const c = nodeCounts(v);
  const out = [];
  const sentinelNote = /^Sentinel node biopsy only/.test(v.nodeSampling) ? 'sentinel' : /and axillary dissection/.test(v.nodeSampling) ? 'sentinel and axillary dissection' : 'axillary dissection';
  out.push(item('Regional lymph nodes', `${v.nodeSampling}${origin ? ` (${origin})` : ''}`));
  out.push(item('Number of lymph nodes examined', `${c.examined}${/^Sentinel node biopsy and/.test(v.nodeSampling) && c.sentinel ? ` (${c.sentinel} sentinel)` : sentinelNote === 'sentinel' ? ' (sentinel)' : ''}`));
  if (simple) {
    const pos = int(v.nodesPositive);
    out.push(item('Number of lymph nodes involved', String(pos)));
    if (pos > 0 && num(v.depositMm) !== null) out.push(item('Size of largest metastatic deposit', `${fmt(num(v.depositMm))} mm`));
    return out;
  }
  const noneInvolved = c.positive === 0 && c.itc === 0;
  if (noneInvolved) out.push(item('Number of lymph nodes with tumour', `0${v.nodeMolPos === true ? ' (positive molecular findings, RT-PCR)' : ''}`));
  else {
    out.push(item('Number of lymph nodes with macrometastasis (>2 mm)', String(c.macro)));
    out.push(item('Number of lymph nodes with micrometastasis (> 0.2 mm to 2 mm and/or > 200 cells)', String(c.micro)));
    out.push(item('Number of lymph nodes with isolated tumour cells (0.2 mm or less and 200 cells or fewer)', String(c.itc)));
    if (num(v.depositMm) !== null) out.push(item('Size of largest metastatic deposit', `${fmt(num(v.depositMm))} mm${stripDot(v.depositSite) ? ` (${stripDot(v.depositSite)})` : ''}`));
    if (num(v.largestNodeMm) !== null) out.push(item('Size of largest lymph node involved', `${fmt(num(v.largestNodeMm))} mm${stripDot(v.largestNodeSite) ? ` (${stripDot(v.largestNodeSite)})` : ''}`));
    out.push(item('Extranodal extension', `${v.ene || 'Not identified'}${v.ene === 'Present' && stripDot(v.eneExtent) ? ` (${stripDot(v.eneExtent)})` : ''}`));
  }
  return out;
}

/** "0 of 2 sentinel lymph nodes involved" / "1 of 14 axillary lymph nodes involved (macrometastasis 4 mm)" / "isolated tumour cells in 1 of 2 sentinel lymph nodes"; '' when none submitted. */
export function nodesPhrase(v, { simple = false } = {}) {
  if (!nodesSubmitted(v)) return '';
  const c = nodeCounts(v);
  if (!c.examined && !c.positive && !c.itc) return '';
  const kind = /^Sentinel node biopsy only/.test(v.nodeSampling) ? 'sentinel lymph node' : /and axillary dissection/.test(v.nodeSampling) ? 'lymph node' : 'axillary lymph node';
  const pos = simple ? int(v.nodesPositive) : c.positive;
  const dep = num(v.depositMm);
  if (pos === 0 && !simple && c.itc > 0) return `isolated tumour cells in ${c.itc} of ${plural(c.examined, kind)} (pN0(i+))`;
  const detail = [];
  if (!simple && pos > 0) {
    if (c.macro && !c.micro) detail.push(`${c.macro > 1 ? 'macrometastases' : 'macrometastasis'}${dep !== null ? ` up to ${fmt(dep)} mm` : ''}`);
    else if (c.micro && !c.macro) detail.push(`${c.micro > 1 ? 'micrometastases' : 'micrometastasis'}${dep !== null ? ` up to ${fmt(dep)} mm` : ''}`);
    else if (c.macro && c.micro) detail.push(`${c.macro > 1 ? 'macrometastases' : 'macrometastasis'} in ${c.macro} and ${c.micro > 1 ? 'micrometastases' : 'micrometastasis'} in ${c.micro}${dep !== null ? `; largest deposit ${fmt(dep)} mm` : ''}`);
    else if (dep !== null) detail.push(`largest deposit ${fmt(dep)} mm`);
    if (v.ene === 'Present') detail.push('extranodal extension present');
  }
  return `${pos} of ${plural(c.examined, kind)} involved${detail.length ? ` (${detail.join('; ')})` : ''}`;
}

// ---------- distant metastasis ----------

export function metastasisValue(v) {
  const dm = v.distantMets || 'Not applicable';
  if (dm === 'Present') {
    const sites = arr(v.distantSites).map((s) => (s === 'Other (specify)' ? stripDot(v.distantDetail) : s)).filter(Boolean);
    return `Present${sites.length ? ` (${sites.join(', ')}${stripDot(v.distantDetail) && !arr(v.distantSites).includes('Other (specify)') ? `; ${stripDot(v.distantDetail)}` : ''})` : ''}`;
  }
  if (dm === 'Cannot be determined') return `Cannot be determined${stripDot(v.distantDetail) ? ` (${stripDot(v.distantDetail)})` : ''}`;
  return dm;
}

export function metastasisPhrase(v) {
  if (v.distantMets !== 'Present') return '';
  const sites = arr(v.distantSites).map((s) => (s === 'Other (specify)' ? stripDot(v.distantDetail) : lc1(s))).filter(Boolean);
  return `distant metastasis${sites.length ? `: ${listJoin(sites)}` : ' present'}`;
}

// ---------- pTNM item ----------

/** The pTNM section for the synoptic (only when printPTNM), with the override note and the stage sub-line. */
export function ptnmSection(st, v, stageLine) {
  const sl = stageLine(st);
  return { heading: `Pathological stage (${st.edition})`, items: [
    { label: 'pTNM', value: `${st.tnm}${st.overridden ? ` [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : ''}`,
      sub: sl ? [{ label: sl.split(': ')[0], value: sl.split(': ').slice(1).join(': ') }] : [] }
  ] };
}

/** Shared other-parts / override checks. */
export function sharedChecks(part, st, out) {
  const v = part.values;
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  for (const p of otherParts(v)) if (!p.finding) warn(`Part ${p.label}: no finding given - the diagnosis line prints "SEE SYNOPTIC REPORT".`);
  const labels = otherParts(v).map((p) => p.label);
  if (labels.includes(part.label)) err(`Other parts: letter ${part.label} is this part.`, 'otherParts');
  if (new Set(labels).size !== labels.length) err('Other parts: a letter is repeated.', 'otherParts');
  if (st && stripDot(v.tnmOverride) && !st.overridden) err(`pTNM override "${stripDot(v.tnmOverride)}" could not be parsed.`);
  if (st) for (const n of st.notes) if (!/overridden/.test(n)) warn(n);
}

/** Margin walker checks: unreadable lines, blank faces. */
export function marginChecks(text, what, out, { required = true, field } = {}) {
  const push = (level, message) => out.push(field ? { level, message, field } : { level, message });
  const p = parseMargins(text);
  if (p.bad.length) push('error', `Margins (${what}): lines not understood: ${p.bad.join('; ')}. Use "Face: 5", "Face: involved", "Face: cannot" or "All: >10".`);
  if (required && p.blank.length && p.blank.length < FACES.length) push('warn', `Margins (${what}): ${listJoin(p.blank.map(lc1))} not recorded.`);
  if (required && p.blank.length === FACES.length && !p.faces.some((f) => f.status !== 'blank')) push('warn', `Margins (${what}) not recorded.`);
  return p;
}
