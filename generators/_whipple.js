// Shared base for the two Whipple synoptic templates — pancreas_carcinoma and
// ampulla_carcinoma. Both are reported off one specimen, one dissection and one node harvest;
// only the staging chapter and two or three elements actually differ, so the margins, the node
// stations, the macroscopic description, the origin assignment and the distant-metastasis and
// treatment-effect wording live here once rather than being copied and left to drift the way
// `stripDot` did (see generators/_house.js).
//
// Nothing here prints on its own. Each generator composes these pieces in its own chapter order.
//
// The pancreatic template also reports the other pancreatectomies (distal, total, central,
// enucleation; docs/specs/pancreatectomy.md). `procedureKind` names the operation, and the margin
// list, the node stations shown and the node-yield check follow it. The ampullary template is
// always a pancreatoduodenectomy and never passes the values that select another operation.
//
// Sources for the element wording:
//   CAP Pancreas (Exocrine) v4.3.0.0, June 2025 (required use March 2026)
//     https://documents.cap.org/documents/New-Cancer-Protocols-June-2025/Panc.Exo_4.3.0.0.REL_CAPCP.pdf
//   CAP Ampulla of Vater v4.3.0.0, June 2025 (required use March 2026)
//     https://www.cap.org/wp-content/uploads/documents/New-Cancer-Protocols-June-2025/Ampulla_4.3.0.0.REL_CAPCP.pdf
// House departures: British spelling ("tumour", "coeliac", "characterised"), the CAP TRG strings
// in the house score-0-to-3 form already used by the gallbladder and oesophageal templates, and
// margin distances in mm rather than the CAP cm/mm either-or.

import { stripDot as houseStripDot } from './_house.js';

export const stripDot = houseStripDot;
export const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
export const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
export const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
export const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
export const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
export const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
export const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|specified)|^Cannot|^None |^All margins/.test(s));
export const specify = (s) => String(s || '').replace(/\s*\((specify)[^)]*\)\s*:?$/i, '').trim();

// ---------- margins ----------

/**
 * The five named margins every Whipple carries, plus the two the ampullary chapter adds.
 * `id` is the schema field; `mm` is the companion distance field; `name` is the diagnosis phrase.
 * `both: true` means the margin belongs to both templates.
 *
 * The pancreatic neck (transection) margin, the bile duct margin and the uncinate /
 * retroperitoneal (SMA) margin are the three that carry the case; proximal and distal are the
 * bowel ends and are almost always widely clear. The posterior / uncinate-SMA margin is the one
 * most often positive and the one the 1 mm rule is really about.
 */
export const MARGINS = [
  { id: 'neckMargin', mm: 'neckMarginMm', label: 'Pancreatic neck (transection) margin', name: 'pancreatic neck margin', both: true },
  { id: 'bileDuctMargin', mm: 'bileDuctMarginMm', label: 'Bile duct margin', name: 'bile duct margin', both: true },
  { id: 'uncinateMargin', mm: 'uncinateMarginMm', label: 'Uncinate (retroperitoneal / superior mesenteric artery) margin', name: 'uncinate margin', both: true },
  { id: 'posteriorMargin', mm: 'posteriorMarginMm', label: 'Posterior surface', name: 'posterior surface', both: true },
  { id: 'proximalMargin', mm: 'proximalMarginMm', label: 'Proximal (gastric or duodenal) margin', name: 'proximal margin', both: true },
  { id: 'distalMargin', mm: 'distalMarginMm', label: 'Distal (duodenal or jejunal) margin', name: 'distal margin', both: true },
  { id: 'pancDuctMargin', mm: 'pancDuctMarginMm', label: 'Pancreatic duct margin', name: 'pancreatic duct margin', ampullaOnly: true },
  { id: 'duodMucosalMargin', mm: 'duodMucosalMarginMm', label: 'Duodenal mucosal margin', name: 'duodenal mucosal margin', ampullaOnly: true },
  // The pancreatic parenchymal margins of the other operations, in the house (CAP) wording: a distal
  // pancreatectomy has one transection (the proximal), a central pancreatectomy two, an enucleation
  // the parenchyma around the lesion. "Other margin" carries a typed name - a splenic vessel or a
  // resected vein segment, an en bloc organ.
  { id: 'proxPancMargin', mm: 'proxPancMarginMm', label: 'Proximal pancreatic parenchymal margin', name: 'proximal pancreatic margin', pancreasOnly: true },
  { id: 'distPancMargin', mm: 'distPancMarginMm', label: 'Distal pancreatic parenchymal margin', name: 'distal pancreatic margin', pancreasOnly: true },
  { id: 'parenchymalMargin', mm: 'parenchymalMarginMm', label: 'Pancreatic parenchymal margin', name: 'pancreatic parenchymal margin', pancreasOnly: true },
  { id: 'otherMargin', mm: 'otherMarginMm', label: 'Other margin', name: 'other margin', pancreasOnly: true }
];

// ---------- the operation ----------

/**
 * Procedure option -> operation. Anything not listed (Other, Not specified) stays a
 * pancreatoduodenectomy, which is what the template reported before the other operations were
 * added. The two CAP "Partial pancreatectomy" options were retired from the list; a saved draft
 * that still holds one reads as a distal pancreatectomy.
 */
export const PROCEDURE_KIND = {
  'Pancreaticoduodenectomy (Whipple resection)': 'pd',
  'Pylorus-preserving pancreaticoduodenectomy': 'pd',
  'Total pancreatectomy': 'total',
  'Distal pancreatectomy': 'distal',
  'Central pancreatectomy': 'central',
  'Excisional biopsy (enucleation)': 'enucleation',
  'Partial pancreatectomy, pancreatic body': 'distal',
  'Partial pancreatectomy, pancreatic tail': 'distal'
};

/** 'pd' | 'total' | 'distal' | 'central' | 'enucleation'. */
export const procedureKind = (v) => PROCEDURE_KIND[v?.procedure] || 'pd';

/** True for the operations that take the pancreatic head and duodenum. */
export const takesHead = (kind) => kind === 'pd' || kind === 'total';

/**
 * The margins each operation carries, in print order. A total pancreatectomy has no pancreatic
 * transection; a distal pancreatectomy has the proximal transection and the posterior (dissection)
 * surface, the one most often involved (Sahakyan, Verbeke et al. 2021); a central pancreatectomy has
 * both pancreatic ends; an enucleation the parenchyma around the lesion.
 */
export const KIND_MARGINS = {
  pd: ['neckMargin', 'bileDuctMargin', 'uncinateMargin', 'posteriorMargin', 'proximalMargin', 'distalMargin', 'otherMargin'],
  total: ['bileDuctMargin', 'uncinateMargin', 'posteriorMargin', 'proximalMargin', 'distalMargin', 'otherMargin'],
  distal: ['proxPancMargin', 'posteriorMargin', 'otherMargin'],
  central: ['proxPancMargin', 'distPancMargin', 'otherMargin'],
  enucleation: ['parenchymalMargin', 'otherMargin']
};

/** First letter down unless the word is an abbreviation ("SMV", "CHA"). */
const lcWord = (s) => (/^[A-Z][a-z]/.test(s) ? lc1(s) : s);

/** The typed name of the other margin replaces its label and diagnosis phrase. */
const withName = (m, v) => {
  const typed = m.id === 'otherMargin' ? stripDot(v?.otherMarginName) : '';
  return typed ? { ...m, label: uc1(typed), name: lcWord(typed) } : m;
};

/**
 * The margins `template` reports. The ampullary list is fixed; the pancreatic list follows the
 * operation in `v` (a pancreatoduodenectomy when `v` is not given).
 */
export const marginsFor = (template, v) => {
  if (template !== 'pancreas') return MARGINS.filter((m) => m.both || (template === 'ampulla' && m.ampullaOnly));
  return KIND_MARGINS[procedureKind(v)].map((id) => withName(MARGINS.find((m) => m.id === id), v));
};

export const MARGIN_OPTIONS = [
  'Cannot be assessed',
  'Uninvolved by invasive carcinoma (specify distance)',
  'Involved by invasive carcinoma',
  'Not applicable'
];

/** The R1 threshold. Pancreatobiliary resections call a margin positive at 1 mm or less. */
export const R1_MM = 1;

/** Value minus the placeholder parentheses, with any typed distance appended. */
export function resMarginText(vv, mmVal) {
  const s = (vv || '').trim();
  if (!s || /^Not applicable/.test(s)) return '';
  const mm = num(mmVal);
  if (/specify distance/.test(s)) {
    const base = s.replace(/\s*\((specify[^)]*)\)\s*/, '');
    return mm !== null ? `${base}, ${fmt(mm)} mm` : base;
  }
  return s;
}

/** Margin items for the synoptic Margins section, in the order marginsFor gives. */
export function marginItems(v, template) {
  return marginsFor(template, v).map((m) => {
    const text = resMarginText(v[m.id], v[m.mm]);
    return text ? { label: m.label, value: text } : null;
  }).filter(Boolean);
}

/**
 * The diagnosis margin clause. Margins at or under 1 mm are reported as close rather than
 * clear, because that is the threshold this specimen type is actually scored on; the sentence
 * names them so the surgeon sees which one.
 */
export function marginsPhrase(v, template) {
  const named = marginsFor(template, v)
    .map((m) => ({ ...m, value: v[m.id], dist: num(v[m.mm]) }))
    .filter((m) => m.value && !/^Cannot be assessed|^Not applicable/.test(m.value));
  const involved = named.filter((m) => /^Involved/.test(m.value));
  const rest = named.filter((m) => /^Uninvolved/.test(m.value));
  const close = rest.filter((m) => m.dist !== null && m.dist <= R1_MM);
  const clear = rest.filter((m) => !close.includes(m));
  const out = [];
  if (involved.length) out.push(`${listJoin(involved.map((m) => m.name))} involved`);
  if (close.length) out.push(`${listJoin(close.map((m) => `${m.name} ${fmt(m.dist)} mm`))} (margin positive at 1 mm or less)`);
  if (clear.length) {
    const mmVals = clear.map((m) => m.dist).filter((x) => Number.isFinite(x));
    out.push(`${clear.length > 1 ? 'remaining margins clear' : `${clear[0].name} clear`}${mmVals.length ? ` (closest ${fmt(Math.min(...mmVals))} mm)` : ''}`);
  }
  return out.join('; ');
}

/** True when any margin is involved or within the 1 mm threshold. */
export function isR1(v, template) {
  return marginsFor(template, v).some((m) => {
    if (/^Involved/.test(v[m.id] || '')) return true;
    const d = num(v[m.mm]);
    return /^Uninvolved/.test(v[m.id] || '') && d !== null && d <= R1_MM;
  });
}

// ---------- lymph nodes ----------

/**
 * The stations a Whipple harvest is separated into. Station numbering follows the Japan
 * Pancreas Society scheme used in the CAP protocol notes: 8 common hepatic artery,
 * 12 hepatoduodenal ligament, 13 posterior pancreaticoduodenal, 14 superior mesenteric artery,
 * 17 anterior pancreaticoduodenal. All five are regional for both chapters, so a node in any of
 * them counts toward the same pN. A distal or total pancreatectomy adds the body and tail stations
 * (RCPath G091 JPS table): 9 coeliac, 10 splenic hilum, 11 splenic artery; the pancreatic form
 * shows each station only for the operations that remove it. A station left blank never prints.
 */
export const NODE_STATIONS = [
  { id: 'station8', label: 'Station 8 (common hepatic artery)' },
  { id: 'station9', label: 'Station 9 (coeliac axis)' },
  { id: 'station10', label: 'Station 10 (splenic hilum)' },
  { id: 'station11', label: 'Station 11 (splenic artery)' },
  { id: 'station12', label: 'Station 12 (hepatoduodenal ligament)' },
  { id: 'station13', label: 'Station 13 (posterior pancreaticoduodenal)' },
  { id: 'station14', label: 'Station 14 (superior mesenteric artery)' },
  { id: 'station17', label: 'Station 17 (anterior pancreaticoduodenal)' }
];

/**
 * AJCC recommends at least 12 regional nodes for a reliable pN in both chapters. The figure is for
 * pancreatoduodenectomy; no minimum is established for a distal pancreatectomy (ICCR 2020), so the
 * check runs only for the operations that take the head.
 */
export const NODE_SUFFICIENCY = 12;

export function nodesItem(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return { label: 'Regional lymph nodes', value: ex === 0 ? 'None submitted (0 examined)' : 'Not recorded' };
  const inv = int(v.nodesInvolved);
  const sub = [
    { label: 'Number examined', value: String(ex) },
    { label: 'Number involved', value: inv === null ? 'Not recorded' : String(inv) }
  ];
  const stations = NODE_STATIONS
    .map((s) => { const n = int(v[s.id]); return n === null ? null : `${s.label.replace(/^Station /, '')}: ${n}`; })
    .filter(Boolean);
  if (stations.length) sub.push({ label: 'Stations involved', value: listJoin(stations) });
  if (inv && inv > 0) sub.push({ label: 'Extranodal extension', value: !v.ene || /^Not applicable/.test(v.ene) ? 'Not identified' : v.ene });
  const dep = num(v.largestDepositMm);
  if (inv && inv > 0 && dep !== null) sub.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm${stripDot(v.largestNodeSite) ? `, ${stripDot(v.largestNodeSite)}` : ''}` });
  return { label: 'Regional lymph nodes', value: inv === null ? `${ex} examined; involved not recorded` : `${ex} examined; ${inv} involved`, sub };
}

/** "2 of 18 regional lymph nodes involved"; '' when none submitted. */
export function nodesPhrase(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return '';
  const inv = int(v.nodesInvolved) ?? 0;
  return `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
}

// ---------- distant metastasis ----------

export const METS_OPTIONS = ['Not applicable', 'Not identified', 'Non-regional lymph node(s) (specify)', 'Liver (specify)', 'Other (specify)', 'Cannot be determined'];

export function metastasisValue(v) {
  const kept = chosen(v.distantMets);
  const d = stripDot(v.distantDetail);
  const hasSpec = kept.some((s) => /\(specify\)/.test(s));
  if (!kept.length) {
    if (arr(v.distantMets).some((s) => /^Cannot/.test(s))) return `Cannot be determined${d ? ` (${d})` : ''}`;
    return arr(v.distantMets).includes('Not identified') ? 'Not identified' : 'Not applicable';
  }
  return `${listJoin(kept.map((s) => specify(s.replace(/\s*\(specify\)\s*$/, ''))))}${d && hasSpec ? ` (${d})` : ''}`;
}

// ---------- treatment effect ----------

// The CAP tumour regression score, in the house score-0-to-3 wording already used by the
// gallbladder and oesophageal templates so that the same phrase prints across the GI set.
export const TREATMENT_OPTIONS = [
  'No known presurgical therapy',
  'Present, with no viable cancer cells (complete response, score 0)',
  'Present, with single cells or rare small groups of cancer cells (near complete response, score 1)',
  'Present, with residual cancer showing evident tumour regression but more than single cells or rare small groups of cancer cells (partial response, score 2)',
  'Present (not otherwise specified)',
  'Absent, with extensive residual cancer and no evident tumour regression (poor or no response, score 3)',
  'Cannot be determined'
];

export const treatmentText = (v) => {
  const te = v.treatmentEffect || 'No known presurgical therapy';
  return /^No known/.test(te) ? 'No known presurgical therapy' : te;
};

export const isTreated = (v) => !/^No known|^Cannot/.test(v.treatmentEffect || 'No known presurgical therapy');

// ---------- precursor lesion ----------

// The named precursors that appear in a Whipple, across both chapters. PanIN is graded
// low/high; the mass-forming intraductal and cystic neoplasms carry their own dysplasia grade;
// IAPN is the ampullary counterpart and the reason the ampullary chapter has its own
// "arising from a preinvasive mass lesion" site option.
export const PRECURSOR_OPTIONS = [
  'Pancreatic intraepithelial neoplasia, low grade (PanIN)',
  'Pancreatic intraepithelial neoplasia, high grade (PanIN)',
  'Intraductal papillary mucinous neoplasm (IPMN), low-grade dysplasia',
  'Intraductal papillary mucinous neoplasm (IPMN), high-grade dysplasia',
  'Intraductal oncocytic papillary neoplasm (IOPN)',
  'Intraductal tubulopapillary neoplasm (ITPN)',
  'Mucinous cystic neoplasm (MCN)',
  'Intra-ampullary papillary-tubular neoplasm (IAPN)',
  'Ampullary adenoma (tubular, tubulovillous or villous)',
  'Biliary intraepithelial neoplasia (BilIN), high grade',
  'Other (specify)',
  'None identified'
];

export function precursorValue(v) {
  const kept = chosen(v.precursor);
  if (!kept.length) return 'None identified';
  return listJoin(kept.map((s) => (s === 'Other (specify)' ? stripDot(v.precursorOther) || 'Other' : s)));
}

// ---------- origin assignment ----------

// Periampullary carcinomas are assigned to one of four origins and the assignment decides which
// chapter stages the case, so it is asked once and printed once. Pancreatic and ampullary
// origins take the two templates built here; distal bile duct and duodenal origins have their
// own chapters and are flagged rather than staged, so a case mis-assigned into this template is
// caught by the validator instead of being quietly given the wrong pT.
export const ORIGIN_OPTIONS = [
  'Pancreatic (ductal adenocarcinoma centred in the pancreatic head or uncinate process)',
  'Ampullary (centred on the ampulla of Vater, including intra-ampullary and periampullary-duodenal)',
  'Distal common bile duct',
  'Duodenal',
  'Cannot be determined'
];

export const ORIGIN_PROTOCOL = {
  'Pancreatic (ductal adenocarcinoma centred in the pancreatic head or uncinate process)': 'pancreas_carcinoma',
  'Ampullary (centred on the ampulla of Vater, including intra-ampullary and periampullary-duodenal)': 'ampulla_carcinoma'
};

/** Short phrase for the synoptic "Origin" element. */
export const originText = (v) => {
  const o = v.origin || 'Cannot be determined';
  return o === 'Other (specify)' ? stripDot(v.originOther) || 'Other' : o;
};

/**
 * Whether the periampullary origin question applies: always on the ampullary template; on the
 * pancreatic one when the operation takes the head and, for a total pancreatectomy, the tumour
 * is in the head. A body or tail carcinoma is not periampullary. Mirrors the schema showIf.
 */
export function originApplies(v, template) {
  if (template === 'ampulla') return true;
  const kind = procedureKind(v);
  if (kind === 'pd') return true;
  return kind === 'total' && arr(v.tumourSite).some((s) => s === 'Head of pancreas' || s === 'Uncinate process');
}

/**
 * Checks that the case is in the right template for the recorded origin. Returns a message when
 * it is not, or '' when the assignment agrees (or has not been made).
 */
export function originMismatch(v, templateId) {
  const o = v.origin || '';
  if (!o || /^Cannot be determined/.test(o)) return '';
  const want = ORIGIN_PROTOCOL[o];
  if (!want) return `Origin recorded as ${lc1(o)}; that origin has its own staging chapter and is not covered by this template.`;
  if (want !== templateId) return `Origin recorded as ${lc1(o)}; this case should be reported on the ${want === 'pancreas_carcinoma' ? 'pancreatic' : 'ampullary'} template, which stages it on the correct chapter.`;
  return '';
}

// ---------- macro ----------

export const PROCEDURE_PHRASE = {
  'Pancreaticoduodenectomy (Whipple resection)': 'pancreaticoduodenectomy (Whipple resection)',
  'Pylorus-preserving pancreaticoduodenectomy': 'pylorus-preserving pancreaticoduodenectomy',
  'Total pancreatectomy': 'total pancreatectomy',
  'Partial pancreatectomy, pancreatic body': 'partial pancreatectomy of the pancreatic body',
  'Partial pancreatectomy, pancreatic tail': 'partial pancreatectomy of the pancreatic tail',
  'Distal pancreatectomy': 'distal pancreatectomy',
  'Central pancreatectomy': 'central pancreatectomy',
  'Excisional biopsy (enucleation)': 'enucleation',
  'Ampullectomy': 'ampullectomy'
};

export function procedureText(v) {
  if (/^(Other|Not specified)$/.test(v.procedure || '')) return stripDot(v.procedureOther) || (v.procedure === 'Not specified' ? 'Not specified' : v.procedure);
  return v.procedure || 'Not specified';
}

export function procedurePhrase(v) {
  const p = specify(procedureText(v));
  if (p === 'Not specified') return '';
  return PROCEDURE_PHRASE[p] || lc1(p);
}

/**
 * The shared Whipple macroscopic description. Both templates open the same way because the
 * specimen is the same: a pancreatic head with attached duodenum, the segments measured, the
 * five margins inked and named, then the tumour and its relation to the duct system.
 *
 * `opts.tumourSentence` is the chapter-specific middle — where the tumour is centred and what
 * it does to the ducts — and is supplied by the calling generator.
 */
export function whippleMacro(part, ctx, opts = {}) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const proc = procedurePhrase(v) || 'pancreaticoduodenectomy';
  const article = /^[aeiou]/.test(proc) ? 'an' : 'a';
  let s = `(${part.label}) Received in formalin is ${article} ${proc} specimen`;
  if (stripDot(v.specimenDims)) s += ` measuring ${stripDot(v.specimenDims)} mm`;
  s += '.';
  const seg = [];
  if (stripDot(v.pancreasDims)) seg.push(`the pancreatic head measures ${stripDot(v.pancreasDims)} mm`);
  if (stripDot(v.duodenumLengthMm)) seg.push(`the attached duodenum measures ${stripDot(v.duodenumLengthMm)} mm in length`);
  if (stripDot(v.bileDuctLengthMm)) seg.push(`the common bile duct measures ${stripDot(v.bileDuctLengthMm)} mm in length`);
  if (stripDot(v.stomachLengthMm)) seg.push(`the gastric cuff measures ${stripDot(v.stomachLengthMm)} mm in length`);
  if (seg.length) s += ` ${uc1(listJoin(seg))}.`;
  s += ' The pancreatic neck, bile duct, uncinate (superior mesenteric artery) and posterior surfaces are inked in different colours and the neck and bile duct margins are taken en face.';
  if (opts.tumourSentence) s += ` ${opts.tumourSentence}`;
  if (stripDot(v.ductFindings)) s += ` ${uc1(stripDot(v.ductFindings))}.`;
  if (stripDot(v.grossDetails)) s += ` ${uc1(stripDot(v.grossDetails))}.`;
  s += ' The lymph node stations are dissected separately and submitted in labelled cassettes. Representative sections are taken; see block key.';
  return s;
}

/** The shared "the tumour measures … and is centred on …" fragment. */
export function tumourFragment(v, centre) {
  const dims = stripDot(v.tumourDims);
  const size = num(v.tumourSizeCm);
  let s = 'There is a firm, ill-defined pale tumour';
  if (centre) s += ` centred on the ${centre}`;
  if (dims) s += ` measuring ${dims} mm`;
  else if (size !== null) s += ` measuring ${fmt(size)} cm in greatest dimension`;
  return `${s}.`;
}

// ---------- shared validation ----------

/** Node, margin and treatment checks both templates run. `at` comes from checks(). */
export function sharedChecks(v, template, { err, warn }) {
  const kind = template === 'pancreas' ? procedureKind(v) : 'pd';
  const ex = int(v.nodesExamined); const pos = int(v.nodesInvolved);
  if (ex === null) err('Number of regional lymph nodes examined is required (enter 0 if none submitted).', 'nodesExamined');
  else if (ex > 0 && pos === null) err('Number of involved lymph nodes is required (enter 0 if none).', 'nodesInvolved');
  if (ex !== null && pos !== null && pos > ex) err('Involved nodes exceed the number examined.', 'nodesInvolved');
  if (takesHead(kind) && ex !== null && ex > 0 && ex < NODE_SUFFICIENCY) warn(`Fewer than ${NODE_SUFFICIENCY} regional lymph nodes examined; AJCC 8th edition recommends at least ${NODE_SUFFICIENCY} for a reliable pN in this specimen.`, 'nodesExamined');
  const stationTotal = NODE_STATIONS.reduce((a, s) => { const n = int(v[s.id]); return n === null ? a : a + n; }, 0);
  const anyStation = NODE_STATIONS.some((s) => int(v[s.id]) !== null);
  if (anyStation && pos !== null && stationTotal !== pos) warn(`Station counts total ${stationTotal} but ${pos} node${pos === 1 ? ' is' : 's are'} recorded as involved.`, 'nodesInvolved');
  if (pos && pos > 0 && (!v.ene || /^Not applicable/.test(v.ene))) warn('Extranodal extension is not recorded for a node-positive case.', 'ene');
  for (const m of marginsFor(template, v)) {
    if (/^Uninvolved/.test(v[m.id] || '') && /distance/i.test(v[m.id] || '') && num(v[m.mm]) === null) warn(`${m.label} uninvolved: record the distance.`, m.mm);
    const d = num(v[m.mm]);
    if (/^Uninvolved/.test(v[m.id] || '') && d !== null && d <= R1_MM) warn(`${m.label} is ${fmt(d)} mm from the carcinoma; at 1 mm or less this is reported as a positive margin (R1) in pancreatobiliary resections.`, m.id);
  }
  if (kind === 'pd' && !v.neckMargin) err('Pancreatic neck (transection) margin status is required.', 'neckMargin');
  if (takesHead(kind) && !v.uncinateMargin) err('Uncinate (retroperitoneal / superior mesenteric artery) margin status is required; it is the margin most often involved.', 'uncinateMargin');
  if ((kind === 'distal' || kind === 'central') && !v.proxPancMargin) err('Proximal pancreatic parenchymal margin status is required.', 'proxPancMargin');
  if (kind === 'central' && !v.distPancMargin) err('Distal pancreatic parenchymal margin status is required.', 'distPancMargin');
  if (kind === 'enucleation' && !v.parenchymalMargin) err('Pancreatic parenchymal margin status is required.', 'parenchymalMargin');
  const mism = originApplies(v, template) ? originMismatch(v, template === 'ampulla' ? 'ampulla_carcinoma' : 'pancreas_carcinoma') : '';
  if (mism) err(mism, 'origin');
  if (isTreated(v) && !/^y/.test(v.tnmOverride || 'y')) warn('Presurgical therapy is recorded; the y descriptor is added to the derived pTNM automatically but the typed override does not carry it.', 'tnmOverride');
}

/**
 * Map a frozen-section part (frozen_section template, "Pancreatic / bile duct margin" scenario)
 * to a patch of synoptic values for `template` ('pancreas' | 'ampulla'). Pure; returns {} for any
 * other scenario, and drops a margin the template does not carry (the pancreatic duct margin is
 * an ampulla-only field). Whipple card, split (g).
 */
export function prefillFromFrozenMargin(fv, template) {
  if (!fv || fv.scenario !== 'Pancreatic / bile duct margin') return {};
  const site = fv.pdSite || 'Pancreatic neck (transection)';
  const m = marginsFor(template).find((x) => x.id === FROZEN_MARGIN_FIELD[site]);
  const out = {};
  const origin = FROZEN_ORIGIN[fv.pdOrigin || 'Pancreatic'];
  if (origin) out.origin = origin;
  out.procedure = 'Pancreaticoduodenectomy (Whipple resection)';
  if (!m) return out;
  const result = fv.pdResult || 'Negative';
  if (result === 'Carcinoma present at margin') out[m.id] = 'Involved by invasive carcinoma';
  else if (result !== 'Atypical, deferred') {
    out[m.id] = 'Uninvolved by invasive carcinoma (specify distance)';
    const d = num(fv.pdDistanceMm);
    if (d !== null) out[m.mm] = fmt(d);
  }
  if (result === 'High-grade dysplasia only') {
    const named = `Present at the ${m.name}`;
    const opts = ['Present at the bile duct margin', 'Present at the pancreatic neck margin'];
    if (opts.includes(named)) out.hgDysplasia = named;
    else { out.hgDysplasia = 'Other (specify)'; out.hgDysplasiaDetail = `present at the ${m.name}`; }
  }
  return out;
}

/** Frozen margin name -> the synoptic margin field it fills. */
export const FROZEN_MARGIN_FIELD = {
  'Pancreatic neck (transection)': 'neckMargin',
  'Bile duct': 'bileDuctMargin',
  'Uncinate (superior mesenteric artery)': 'uncinateMargin',
  'Pancreatic duct': 'pancDuctMargin',
  'Proximal (gastric or duodenal)': 'proximalMargin',
  'Distal (duodenal or jejunal)': 'distalMargin',
};

/** Frozen origin -> the synoptic Origin option. */
export const FROZEN_ORIGIN = {
  Pancreatic: ORIGIN_OPTIONS[0],
  Ampullary: ORIGIN_OPTIONS[1],
  'Distal bile duct': ORIGIN_OPTIONS[2],
};
