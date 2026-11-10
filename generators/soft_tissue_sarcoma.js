// Soft tissue sarcoma resection — synoptic report (Phase 84, user request 2026-11-10).
//
// Elements and print order from the QMH Cancer Reporting Template MS-Soft tissue sarcoma
// (https://awiloqmh.github.io/CancerReportingTemplate/MS-Soft%20tissue%20sarcoma.html, saved as
// docs/reference/MS-Soft-tissue-sarcoma.html), which follows CAP Soft Tissue Resection 4.2.0.0
// (https://www.cap.org/wp-content/uploads/protocols/Soft.Tissue_4.2.0.0.REL_CAPCP.docx?download=true), with the
// ICCR dataset (https://www.iccr-cancer.org/wp-content/uploads/2022/10/ICCR-STSarcoma_Resection-1st-edn-v1.1-hyperlink.pdf).
// Grade and pTNM: src/staging/softtissue.js (FNCLCC; AJCC 8th edition, as AJCC has no version 9 soft tissue
// chapter). The stage group shows in Checks only.
//
// Departures from the QMH order, all from the house report rules: tumour depth (CAP) follows the focality; the
// histologic type prints as a row before the tumour histology paragraph, which carries the microscopy and
// immunohistochemistry together, and the liposarcoma rows (well-differentiated component, size of the
// dedifferentiated component, heterologous differentiation, hypercellular areas) sit under the type; the QMH
// FNCLCC "Histologic type" sub-row is named "Tumour differentiation"; each margin prints on its own line under
// the Surgical margin row; preresection treatment and treatment effect print under Additional findings; MDM2 and
// DDIT3 / FUS FISH print under Molecular findings. The liposarcoma wording follows the user's own reports. The
// WHO 6th edition (2026) changes show in Checks only; the type list stays the WHO 5th edition list that CAP and
// QMH give. Sources: docs/reference/soft-tissue-sources.md.

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/softtissue.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
// "an undifferentiated", "a uniform", "an MPNST", "a RET": the sound, not the letter.
const article = (w) => {
  const s = String(w || '');
  if (/^[A-Z]{2,}/.test(s)) return /^[AEIOFHLMNSX]/.test(s) ? 'an' : 'a';
  return /^(?:uni|use|eu|one)/i.test(s) ? 'a' : /^[aeiou]/i.test(s) ? 'an' : 'a';
};
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;
// "MDM2", "PEComa", "Kaposi sarcoma", "Ewing": a typed word in capitals, or a name, keeps its capital.
const lcWord = (s) => (/^(?:[A-Z0-9]{2,}|Kaposi\b|Langerhans|Ewing|Triton)/.test(s || '') ? s : lc1(s));
// Dimensions as typed, without a trailing unit.
const dims = (s) => stripDot(s).replace(/\s*mm$/i, '');

// ---------- option strings (schemas/soft_tissue_sarcoma.json carries the same lists) ----------

export const ALT = 'Atypical lipomatous tumour';
export const WDLPS = 'Well-differentiated liposarcoma';
export const DDLPS = 'Dedifferentiated liposarcoma';
export const MLPS = S.MYXOID;
export const PLPS = 'Pleomorphic liposarcoma, NOS';
export const UPS = 'Undifferentiated pleomorphic sarcoma';
export const LMS = 'Leiomyosarcoma';
export const MFS = 'Myxofibrosarcoma';
export const SYNOVIAL = 'Synovial sarcoma';
const OTHER_TYPE = 'Other histologic type not listed (specify)';
const UNDETERMINED = 'Cannot be determined';
const LIPO_WD = [ALT, WDLPS];
const MDM2_TYPES = [ALT, WDLPS, DDLPS];
const SFT = 'Solitary fibrous tumour';

// CAP, Note F: types for which AJCC staging is not clinically relevant (the list, item by item, as CAP gives it).
export const NOT_STAGED = [SFT, 'Ossifying fibromyxoid tumour', 'Glomus tumour, atypical / uncertain biologic potential', 'Glomus tumour, malignant',
  'Kaposi sarcoma', 'Epithelioid angiosarcoma', 'Radiation-associated angiosarcoma', 'Lymphoedema-associated angiosarcoma', 'Angiosarcoma, NOS',
  'Infantile fibrosarcoma', 'Desmoplastic small round cell tumour', 'PEComa, NOS', 'PEComa, TSC2 mutated', 'PEComa, TFE3 rearranged',
  'Desmoid-type fibromatosis', 'Dermatofibrosarcoma protuberans', 'Kaposiform haemangioendothelioma', 'Atypical fibroxanthoma',
  'Angiomatoid fibrous histiocytoma', 'Pleomorphic hyalinising angiectatic tumour', ALT, 'Inflammatory myofibroblastic tumour',
  'Myofibroblastic sarcoma', 'Myxoinflammatory fibroblastic sarcoma'];
const EHE = /^Epithelioid haemangioendothelioma/;
const RMS_HN = ['Embryonal rhabdomyosarcoma', 'Alveolar rhabdomyosarcoma'];

const isRP = (v) => v.siteGroup === S.SITE.RP;
// Sites where CAP (Note D) and the benign soft tissue template use well-differentiated liposarcoma.
const WD_SITE = /\b(?:retroperiton\w*|groin|inguinal|mediastin\w*|paratesticular|spermatic cord)\b/i;
const siteText = (v) => stripDot(v.site).replace(/\s+/g, ' ');
const labelText = (v) => stripDot(v.clinicalLabel) || 'tumour';

// ---------- specimen and site ----------

const PROC_WORDS = {
  'Excisional biopsy': 'excisional biopsy',
  'Intralesional resection': 'excision',
  'Marginal resection': 'excision',
  'Wide resection': 'wide excision',
  'Radical resection': 'radical resection'
};

/** The procedure as the diagnosis line and the macroscopy read it: "wide excision". */
export function procedureWords(v) {
  if (v.procedure === 'Other (specify)') return lc1(stripDot(v.procedureOther)) || 'excision';
  return PROC_WORDS[v.procedure] || 'excision';
}

/** "Right thigh tumour, wide excision"; the specimen as received when typed. */
export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  // The site reads as an adjective before the label: "Left retroperitoneal tumour".
  const where = (siteText(v) || (isRP(v) ? 'retroperitoneal' : '')).replace(/\bretroperitoneum$/i, 'retroperitoneal');
  return uc1(`${where ? `${where} ` : ''}${labelText(v)}, ${procedureWords(v)}`);
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// The shared override parser reads T with N. A typed T alone ("pT2", the usual case, as pN is not assigned when
// no node is examined) is read with the derived N, and an NX so added is left out of the print.
export function staging(part) {
  const v = part.values;
  const ov = String(v.tnmOverride || '').trim();
  if (!ov || /(?:^|[^a-z])y?p?N(?:X|\d)/i.test(ov) || !/(?:^|[^a-z])r?y?p?T(?:X|is|\d)/i.test(ov)) return deriveTNM(v, 'softtissue');
  const n = deriveTNM({ ...v, tnmOverride: '' }, 'softtissue').N;
  const st = deriveTNM({ ...v, tnmOverride: `${ov} ${n}` }, 'softtissue');
  if (st.overridden && st.N === 'NX') st.tnm = st.tnm.split(' ').filter((x) => !/^(?:y?p)?NX$/.test(x)).join(' ');
  return st;
}

/** The organ word of the diagnosis line: typed, else RETROPERITONEAL for the retroperitoneum, else SOFT TISSUE. */
export const organWord = (v) => stripDot(v.organ).toUpperCase() || (isRP(v) ? 'RETROPERITONEAL' : 'SOFT TISSUE');

/** "SOFT TISSUE, right thigh tumour, wide excision"; "RETROPERITONEAL tumour, excision" (the user's form). */
export function diagnosisHead(v) {
  const organ = organWord(v);
  const typed = stripDot(v.specimenName);
  if (typed) {
    // A typed name that opens with the organ word ("Retroperitoneal tumour, excision") is not given it twice.
    const lead = organ.toLowerCase();
    if (typed.toLowerCase().startsWith(lead)) return `${organ}${typed.slice(lead.length)}`;
    return `${organ}, ${lc1(typed)}`;
  }
  if (organ === 'RETROPERITONEAL') {
    const rest = siteText(v).replace(/\bretroperitone(?:um|al)\b/gi, '').replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s+/g, ' ');
    // A side alone leads, as the user writes it ("Left RETROPERITONEAL tumour"); other site words follow the label.
    if (/^(?:left|right)$/i.test(rest)) return `${uc1(rest.toLowerCase())} RETROPERITONEAL ${labelText(v)}, ${procedureWords(v)}`;
    return `RETROPERITONEAL ${labelText(v)}${rest ? `, ${lc1(rest)}` : ''}, ${procedureWords(v)}`;
  }
  const where = siteText(v);
  return `${organ}, ${where ? `${lc1(where)} ` : ''}${labelText(v)}, ${procedureWords(v)}`;
}

export function siteValue(v) {
  const g = v.siteGroup || '';
  // "Retroperitoneum (left)", not "Retroperitoneum (left retroperitoneum)".
  const where = g === S.SITE.RP ? siteText(v).replace(/\bretroperitone(?:um|al)\b/gi, '').replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s+/g, ' ') : siteText(v);
  const group = g === S.SITE.OTHER ? uc1(stripDot(v.siteGroupOther)) || 'Other' : g === S.SITE.NS ? '' : g;
  if (group) return `${group}${where ? ` (${lc1(where)})` : ''}`;
  return where ? uc1(where) : 'Not specified';
}

export function sizeValue(v) {
  const d = dims(v.tumourDims);
  const n = num(v.tumourSizeMm);
  const g = n !== null ? n : S.sizeMm(v);
  if (d) return `${d} mm${g !== null ? ` (greatest dimension ${fmt(g)} mm)` : ''}`;
  return n !== null ? `${fmt(n)} mm (greatest dimension)` : '';
}

export function focalityValue(v) {
  const f = v.focality || '';
  const d = stripDot(v.focalityDetail);
  return f && d && f !== 'Unifocal' ? `${f} (${lcWord(d)})` : f;
}

export function depthValue(v) {
  const d = arr(v.depth).map((x) => (x === 'Other (specify)' ? stripDot(v.depthOther) : x)).filter(Boolean);
  return d.length ? uc1(listJoin(d.map((x, i) => (i ? lcWord(x) : x)))) : '';
}

/** The extent row that carries pT at the head and neck, visceral and orbital sites; '' elsewhere. */
export function extentValue(v) {
  const g = v.siteGroup || '';
  if (g === S.SITE.HN) return v.hnInvasion || '';
  if (g === S.SITE.ABD || g === S.SITE.THX) return v.visceralExtent || '';
  if (g === S.SITE.ORBIT) return v.orbitExtent || '';
  return '';
}

export function procedureValue(v) {
  const p = v.procedure || '';
  if (!p) return 'Not specified';
  return p === 'Other (specify)' ? uc1(stripDot(v.procedureOther)) || 'Other' : p;
}

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const what = `${procedureWords(v)} specimen`;
  const where = siteText(v) ? ` from the ${lc1(siteText(v))}` : isRP(v) ? ' from the retroperitoneum' : '';
  const sd = dims(v.specimenDims);
  let first = `${tag}Received in formalin is ${article(what)} ${what}${where}${sd ? `, measuring ${sd} mm` : ''}`;
  const skin = dims(v.skinDims);
  if (skin) first += `, with a skin ellipse measuring ${skin} mm`;
  const bits = [`${first}.`];
  const o = stripDot(v.orientation);
  if (o) bits.push(`The specimen is oriented (${lc1(o)}).`);
  const cut = arr(v.cutSurface).map((c) => lc1(c)).filter(Boolean);
  const td = dims(v.tumourDims);
  const size = num(v.tumourSizeMm);
  const d = num(v.macroMarginMm);
  const ms = stripDot(v.macroMarginSite);
  if (cut.length || td || size !== null || d !== null) {
    const adj = cut.join(', ');
    let s = `Sectioning shows ${article(adj || 'tumour')} ${adj ? `${adj} ` : ''}tumour`;
    if (td) s += ` measuring ${td} mm`;
    else if (size !== null) s += ` measuring ${fmt(size)} mm in greatest dimension`;
    if (d === 0) s += `, reaching the ${ms ? `${lc1(ms)} ` : ''}margin`;
    else if (d !== null) s += `, ${fmt(d)} mm from the closest${ms ? ` (${lc1(ms)})` : ''} margin`;
    bits.push(`${s}.`);
  }
  if (stripDot(v.macroOther)) bits.push(`${uc1(stripDot(v.macroOther))}.`);
  const b = int(v.blocks);
  if (b) bits.push(`Representative sections are taken in ${b} block${b === 1 ? '' : 's'}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

// ---------- type and morphology ----------

export function histTypeName(v) {
  const t = v.histType || '';
  if (t === OTHER_TYPE) return uc1(stripDot(v.histTypeOther)) || 'Histologic type not specified';
  if (t === UNDETERMINED && stripDot(v.histTypeOther)) return `${t} (${lcWord(stripDot(v.histTypeOther))})`;
  return t || 'Histologic type not specified';
}

/** The type as the histology sentence reads it: "dedifferentiated liposarcoma", "malignant glomus tumour". */
export function sentenceType(v) {
  const t = v.histType || '';
  if (t === OTHER_TYPE) return lcWord(stripDot(v.histTypeOther)) || 'sarcoma';
  if (t === UNDETERMINED) return 'sarcoma';
  let s = t.replace(/, NOS$/, '');
  const mal = s.match(/^(.*), malignant$/);
  if (mal) s = `malignant ${lcWord(mal[1])}`;
  s = s.replace(/^(Epithelioid sarcoma), (distal \(classic\)|proximal \(large cell\)) type$/, '$1 of $2 type')
    .replace(/^Glomus tumour, atypical \/ uncertain biologic potential$/, 'glomus tumour of uncertain biologic potential');
  return lcWord(s);
}

/** The type on the diagnosis line, in capitals, with "with ..." and "arising in ..." tails in lower case. */
export function dxType(v) {
  const t = v.histType || '';
  let s;
  if (t === DDLPS) s = `DEDIFFERENTIATED LIPOSARCOMA${v.wdComponent === 'Present' ? ' arising from adjacent WELL DIFFERENTIATED LIPOSARCOMA' : ''}`;
  else if (t === WDLPS) s = 'WELL DIFFERENTIATED LIPOSARCOMA';
  else if (t === MLPS) {
    const p = num(v.hypercellularPct);
    s = `MYXOID LIPOSARCOMA${p ? ` with ${fmt(p)}% hypercellular (round cell) areas` : ''}`;
  } else if (t === UNDETERMINED) s = 'SARCOMA, type cannot be determined';
  else {
    const name = t === OTHER_TYPE ? stripDot(v.histTypeOther) || 'Sarcoma' : t.replace(/, NOS$/, '');
    const mal = name.match(/^(.*), malignant$/);
    const base = mal ? `Malignant ${lc1(mal[1])}` : name;
    const m = base.match(/^(.*?)( (?:with|arising in) .*|, .*)?$/);
    const head = /^PEComa/.test(m[1]) ? m[1] : m[1].toUpperCase();
    s = `${head}${m[2] || ''}`;
  }
  return v.recurrent === true ? `Recurrent ${s}` : s;
}

// What is seen, by type, in the words of the user's reports where there is one (docs/reference/soft-tissue-sources.md).
export const MORPH = {
  [UPS]: 'The tumour is composed of pleomorphic spindle and polygonal cells arranged in sheets and short, haphazard fascicles. The tumour cells have enlarged, hyperchromatic nuclei with bizarre and multinucleated forms.',
  [DDLPS]: 'The tumour is composed of pleomorphic spindle cells arranged in sheets and short, haphazard interlacing fascicles, associated with hyalinised and sclerotic stroma. The tumour cells have enlarged, hyperchromatic nuclei with frequent bizarre or multinucleated forms.',
  [ALT]: 'The tumour is composed of lobules of adipocytes that vary in size, separated by fibrous septa containing scattered atypical stromal cells with enlarged, irregular, hyperchromatic nuclei.',
  [MLPS]: 'The tumour is composed of uniform ovoid cells arranged haphazardly in a myxoid stroma containing delicate, thin-walled, branching blood vessels.',
  [PLPS]: 'The tumour is composed of sheets of pleomorphic spindle and polygonal cells with bizarre and multinucleated forms, among which are scattered pleomorphic, multivacuolated lipoblasts with scalloped nuclei.',
  [LMS]: 'The tumour is composed of spindle cells arranged in interlacing fascicles, with eosinophilic cytoplasm and elongated nuclei showing nuclear pleomorphism and coarse chromatin.',
  [MFS]: 'The tumour is composed of atypical spindle and stellate cells with hyperchromatic nuclei in a myxoid stroma with elongated, curvilinear blood vessels.',
  [SYNOVIAL]: 'The tumour contains uniform spindle cells arranged in fascicles, with ovoid, overlapping nuclei and scanty cytoplasm.'
};
MORPH[WDLPS] = MORPH[ALT];
export const WD_COMPONENT = 'The dedifferentiated liposarcoma is surrounded by well-differentiated liposarcoma, comprising adipocytes that vary in size, separated by fibrous septa containing atypical stromal cells with hyperchromatic nuclei.';

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const t = v.histType || '';
  if (!t) return '';
  const what = sentenceType(v);
  let s = t === UNDETERMINED ? 'Sections show a sarcoma; its histologic type cannot be determined.' : `Sections show ${article(what)} ${what}.`;
  const bits = [MORPH[t] || ''];
  if (t === DDLPS) {
    if (v.wdComponent === 'Present') bits.push(WD_COMPONENT);
    else if (v.wdComponent === 'Not identified') bits.push('No well-differentiated component is seen.');
    if (v.heterologous === 'Present (specify)') {
      const h = stripDot(v.heterologousType);
      bits.push(`Heterologous ${h ? `${lcWord(h).replace(/\s+differentiation$/i, '')} ` : ''}differentiation is present.`);
    }
  }
  if (t === MLPS) {
    const p = num(v.hypercellularPct);
    if (p === 0) bits.push('No hypercellular (round cell) areas are seen.');
    else if (p !== null) bits.push(`Hypercellular (round cell) areas account for about ${fmt(p)}% of the tumour.`);
  }
  const ihc = stripDot(v.ihcText);
  if (ihc) bits.push(`${uc1(ihc)}.`);
  for (const x of bits) if (x) s += ` ${x}`;
  return s;
}

/** The rows under Histologic type: the liposarcoma elements of CAP. */
export function typeSubRows(v) {
  const t = v.histType || '';
  const sub = [];
  if (t === DDLPS) {
    if (v.wdComponent) sub.push({ label: 'Well-differentiated component', value: v.wdComponent });
    const d = num(v.dedifSizeMm);
    if (d !== null) sub.push({ label: 'Dedifferentiated component, size', value: `${fmt(d)} mm` });
    if (v.heterologous) {
      const h = stripDot(v.heterologousType);
      sub.push({ label: 'Heterologous differentiation', value: v.heterologous === 'Present (specify)' ? (h ? `Present (${lcWord(h)})` : 'Present') : v.heterologous });
    }
  }
  if (t === MLPS) {
    const p = num(v.hypercellularPct);
    if (p !== null) sub.push({ label: 'Hypercellular (round cell) areas', value: p === 0 ? 'Not identified' : `${fmt(p)}%` });
  }
  return sub;
}

// ---------- grade ----------

const MITOTIC_SHORT = { [S.MITOTIC_UNITS[0]]: 'per 10 HPF, 22 mm eyepiece', [S.MITOTIC_UNITS[1]]: 'per mm2' };

export function mitoticText(v) {
  const raw = String(v.mitoticCount ?? '').trim();
  const n = S.mitoticCount(v);
  if (n === null) return '';
  const unit = MITOTIC_SHORT[v.mitoticUnit || S.MITOTIC_UNITS[0]] || MITOTIC_SHORT[S.MITOTIC_UNITS[0]];
  if (/^<\s*1(?:\D|$)/.test(raw)) return `Less than 1 mitosis ${unit}`;
  return `${fmt(n)} mitos${n === 1 ? 'is' : 'es'} ${unit}`;
}

const NECROSIS_TEXT = { 'No tumour necrosis': 'Not identified', 'Less than 50% tumour necrosis': 'Less than 50%', '50% or more tumour necrosis': '50% or more' };

export function necrosisText(f) {
  const n = f.necrosis;
  if (!n) return '';
  const p = num(n.pct);
  // The percentage prints when it gives the score used; when it disagrees with the option picked, the option prints.
  const pctScore = p === null ? null : p === 0 ? 0 : p < 50 ? 1 : 2;
  const what = p !== null && pctScore === n.score ? (p === 0 ? 'Not identified' : `${fmt(p)}%`) : NECROSIS_TEXT[n.label] || '';
  return what ? `${what} (score ${n.score})` : '';
}

/** The FNCLCC grade row with its three sub-rows; null when the grade is incomplete (Checks say what is missing). */
export function gradeItem(v) {
  const label = 'Histologic grade (FNCLCC grading)';
  const f = S.fnclcc(v);
  if (f.mode === 'GX') return { label, value: 'Cannot be assessed (GX)' };
  if (f.mode === 'high by definition') return { label, value: 'Not graded (high grade by definition)' };
  if (f.mode === 'not graded') return { label, value: S.NOT_GRADED.includes(v.histType || '') ? 'Not graded (not applicable for this tumour type)' : 'Not graded' };
  if (!f.grade) return null;
  const d = f.diff;
  const diffName = d.typed ? histTypeName(v) : d.name;
  return { label, value: S.GRADE_TEXT[f.grade], sub: [
    { label: 'Tumour differentiation', value: `${diffName} (score ${d.score})` },
    { label: 'Mitotic rate', value: `${mitoticText(v)} (score ${f.mitotic.score})` },
    { label: 'Tumour necrosis', value: necrosisText(f) }
  ] };
}

// ---------- margins ----------

// A margin named by its position takes the word "margin"; a named structure ("Tibial nerve sheath") does not.
const POSITION = /^(?:deep|superficial|proximal|distal|medial|lateral|anterior|posterior|superior|inferior|peripheral|cranial|caudal|radial|circumferential|mucosal|skin|soft tissue|fascial|base|bone|\d{1,2}\s*o'?\s*clock)\b/i;

/** "(1)" -> "(block 1)", "(3, 5, 6)" -> "(blocks 3, 5, 6)", "(1-3)" -> "(blocks 1 to 3)"; other text as typed. */
export function blocksText(b) {
  const s = String(b || '').trim();
  if (!s) return '';
  if (/^blocks?\b/i.test(s)) return `(${s})`;
  const range = s.match(/^([A-Z]?\d+[A-Z]?)\s*(?:-|–|to)\s*([A-Z]?\d+[A-Z]?)$/i);
  if (range) return `(blocks ${range[1]} to ${range[2]})`;
  const list = s.split(/\s*,\s*|\s+and\s+/).filter(Boolean);
  if (list.every((x) => /^[A-Z]?\d+[A-Z]?$/i.test(x))) return list.length === 1 ? `(block ${list[0]})` : `(blocks ${list.join(', ')})`;
  return `(${s})`;
}

/** The status of one typed margin: { text, state: 'clear' | 'involved' | 'cannot' | '', mm, qual }. */
export function marginStatus(raw) {
  const s = stripDot(raw);
  if (!s) return { text: '', state: '', mm: null, qual: '' };
  const m = s.match(/^(>|<|≥|≤|more than|less than|at least|greater than)?\s*(\d+(?:\.\d+)?)\s*(mm|cm)?$/i);
  if (m) {
    const q = (m[1] || '').toLowerCase();
    const mm = Number(m[2]) * ((m[3] || '').toLowerCase() === 'cm' ? 10 : 1);
    const qual = ['<', '≤', 'less than'].includes(q) ? '<' : q ? '>' : '';
    const text = qual === '<' ? `Clear but less than ${fmt(mm)} mm` : `Clear by ${q && q.length > 1 ? `${q} ` : q}${fmt(mm)} mm`;
    return { text, state: 'clear', mm, qual };
  }
  const t = s.toLowerCase();
  if (/^(?:involved|positive|tumou?r (?:at|on) (?:the )?(?:ink|margin)|at ink)/.test(t)) return { text: /^involved/.test(t) ? uc1(s) : 'Involved', state: 'involved', mm: null, qual: '' };
  if (/^(?:cannot|n\/?a\b|not assess)/.test(t)) return { text: 'Cannot be assessed', state: 'cannot', mm: null, qual: '' };
  if (/^distant$/.test(t)) return { text: 'Clear and distant', state: 'clear', mm: Infinity, qual: '' };
  if (/^(?:clear|uninvolved|free|negative|not involved|close)\b/.test(t)) {
    const d = t.match(/(<|>|less than|more than)?\s*(\d+(?:\.\d+)?)\s*(mm|cm)\b/);
    const mm = d ? Number(d[2]) * (d[3] === 'cm' ? 10 : 1) : /distant/.test(t) ? Infinity : null;
    const qual = d && d[1] ? (/^(?:<|less)/.test(d[1]) ? '<' : '>') : '';
    return { text: uc1(s), state: 'clear', mm, qual };
  }
  return { text: uc1(s), state: '', mm: null, qual: '' };
}

/** One margin per typed line: "Deep: 2.2 (block 7)" -> { label: 'Deep margin', name: 'deep', ... }. */
export function marginRows(v) {
  return String(v.marginsText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const i = line.indexOf(':');
    if (i < 0) return { label: '', name: '', text: uc1(stripDot(line)), state: marginStatus(line).state, mm: null, qual: '' };
    const rawName = line.slice(0, i).trim();
    let rest = line.slice(i + 1).trim();
    let blocks = '';
    const b = rest.match(/\s*\(([^()]*)\)\.?\s*$/);
    if (b) { blocks = blocksText(b[1]); rest = rest.slice(0, b.index).trim(); }
    const st = marginStatus(rest);
    const named = /\bmargins?\b/i.test(rawName) || !POSITION.test(rawName) ? rawName : `${rawName} margin`;
    const label = uc1(named);
    const name = lcWord(rawName.replace(/\s+margins?$/i, ''));
    return { label, name, text: [st.text, blocks].filter(Boolean).join(' '), state: st.state, mm: st.mm, qual: st.qual };
  }).filter((r) => r.text);
}

const closeness = (r) => r.mm + (r.qual === '<' ? -0.001 : r.qual === '>' ? 0.001 : 0);

/** The Surgical margin row: involved, cannot be assessed, or uninvolved with the closest distance. */
export function marginSummary(v) {
  if (v.marginsNotAssessable === true) return { state: 'cannot', value: 'Cannot be assessed' };
  const rows = marginRows(v);
  if (!rows.length) return { state: '', value: '' };
  const inv = rows.filter((r) => r.state === 'involved');
  if (inv.length) {
    const names = inv.map((r) => r.name).filter(Boolean);
    return { state: 'involved', value: `Involved by tumour${names.length ? ` (${listJoin(names)} margin${names.length > 1 ? 's' : ''})` : ''}`, names };
  }
  if (rows.every((r) => r.state === 'cannot')) return { state: 'cannot', value: 'Cannot be assessed' };
  if (!rows.some((r) => r.state === 'clear')) return { state: '', value: '' };
  const near = rows.filter((r) => r.state === 'clear' && r.mm !== null && Number.isFinite(r.mm));
  if (!near.length) return { state: 'clear', value: 'Uninvolved by tumour' };
  const best = Math.min(...near.map(closeness));
  const top = near.filter((r) => closeness(r) === best);
  const r = top[0];
  const dist = r.qual === '<' ? `less than ${fmt(r.mm)} mm` : `${r.qual === '>' ? '>' : ''}${fmt(r.mm)} mm`;
  const names = top.map((x) => x.name).filter(Boolean);
  return { state: 'clear', value: `Uninvolved by tumour (closest ${dist}${names.length ? `, ${listJoin(names)} margin${names.length > 1 ? 's' : ''}` : ''})` };
}

/** The Margins section: the Surgical margin row with each margin under it. Lines none of which reads as clear,
 * involved or cannot be assessed print as typed, without the summary row. */
export function marginItems(v) {
  const sum = marginSummary(v);
  const rows = v.marginsNotAssessable === true ? [] : marginRows(v).map((r) => (r.label ? { label: r.label, value: r.text } : { text: r.text }));
  const envelope = v.fascialEnvelope ? [{ label: 'Intact fascial envelope / fibrous pseudocapsule at the closest margin', value: v.fascialEnvelope }] : [];
  if (!sum.value) return rows.length ? [...rows, ...envelope] : [];
  return [{ label: 'Surgical margin', value: sum.value, sub: [...rows, ...envelope] }];
}

// ---------- lymph nodes and metastasis ----------

export function nodesItem(v) {
  const examined = int(v.nodesExamined) || 0;
  if (!examined) return { label: 'Regional lymph nodes', value: 'None submitted' };
  const involved = int(v.nodesInvolved) || 0;
  const value = `${examined} examined; ${involved ? `${involved} involved` : 'none involved'}`;
  const sub = [];
  if (involved) {
    if (v.ene) sub.push({ label: 'Extranodal extension', value: v.ene });
    const d = num(v.largestDepositMm);
    if (d !== null) sub.push({ label: 'Size of largest metastatic deposit', value: `${fmt(d)} mm` });
    if (stripDot(v.nodeSites)) sub.push({ label: 'Nodal site(s) with tumour', value: uc1(stripDot(v.nodeSites)) });
  }
  return { label: 'Regional lymph nodes', value, sub };
}

export function nodesPhrase(v) {
  const examined = int(v.nodesExamined) || 0;
  if (!examined) return '';
  const involved = int(v.nodesInvolved) || 0;
  return `${involved} of ${examined} regional lymph node${examined === 1 ? '' : 's'} involved`;
}

const NO_METS = ['Not applicable', 'Not identified', 'Cannot be determined'];

export function metastasisValue(v) {
  const m = arr(v.distantMets);
  if (!m.length) return '';
  for (const x of NO_METS) if (m.includes(x)) return x;
  const typed = stripDot(v.distantMetsOther);
  const other = m.includes('Other (specify)');
  // The typed text names the other site; with none ticked, it details the last site ticked ("Lung (right lower lobe)").
  const names = m.map((s, i) => {
    if (s === 'Other (specify)') return typed || 'other site';
    return typed && !other && i === m.length - 1 ? `${s} (${lcWord(typed)})` : s;
  });
  return uc1(listJoin(names.map((s, i) => (i ? lcWord(s) : s))));
}

// ---------- additional findings ----------

export function preresectionValue(v) {
  const p = arr(v.preresection);
  if (!p.length) return '';
  const both = p.includes('Chemotherapy performed') && p.includes('Radiation therapy performed');
  const items = (both ? ['Chemotherapy and radiation therapy performed', ...p.filter((s) => s !== 'Chemotherapy performed' && s !== 'Radiation therapy performed')] : p)
    .map((s) => (s === 'Other (specify)' ? stripDot(v.preresectionOther) : s)).filter(Boolean);
  return uc1(items.map((s, i) => (i ? lcWord(s) : s)).join('; '));
}

export function treatmentItem(v) {
  const e = v.treatmentEffect || '';
  if (!e) return null;
  if (e !== 'Present') return { label: 'Treatment effect', value: e };
  const p = num(v.viablePct);
  const feats = arr(v.treatmentFeatures).map((s) => (s === 'Other (specify)' ? stripDot(v.treatmentFeaturesOther) : s)).filter(Boolean);
  const item = { label: 'Treatment effect', value: `Present${p !== null ? ` (${fmt(p)}% viable tumour)` : ''}` };
  if (feats.length) item.sub = [{ label: 'Features', value: uc1(listJoin(feats.map((s, i) => (i ? lcWord(s) : s)))) }];
  return item;
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const type = item('Histologic type', v.histType ? histTypeName(v) : '');
  if (type) { const sub = typeSubRows(v); if (sub.length) type.sub = sub; }
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', siteValue(v)),
      item('Tumour size', sizeValue(v)),
      item('Tumour focality', focalityValue(v)),
      item('Tumour depth', depthValue(v)),
      item('Tumour extent', extentValue(v))
    ] },
    { heading: 'Microscopic findings', items: [
      type,
      { label: 'Tumour histology', para: histologyPara(v) },
      gradeItem(v),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified')
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: [nodesItem(v)] } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}${st.noNodes ? '' : `/${st.derived.N}`}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      item('Preresection treatment', preresectionValue(v)),
      treatmentItem(v),
      item('Other findings', uc1(stripDot(v.otherFindings)))
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- molecular findings and comment ----------

/** MDM2 and DDIT3 / FUS FISH and other ancillary studies under Molecular findings; '' when none. */
export function molecular(part, ctx) {
  const v = part.values;
  const items = [];
  const m = v.mdm2 || 'Not performed';
  if (m !== 'Not performed') items.push({ label: 'MDM2 amplification (FISH)', value: m });
  const d = v.ddit3 || 'Not performed';
  if (d !== 'Not performed') items.push({ label: 'DDIT3 / FUS rearrangement (FISH)', value: d });
  if (stripDot(v.ancillaryOther)) items.push({ label: 'Other ancillary studies', value: uc1(stripDot(v.ancillaryOther)) });
  return items.length ? renderSynoptic([{ heading: 'Ancillary studies', items }], lettered(part, ctx) ? `(${part.label})` : '') : '';
}

export function comment() { return ''; }

// ---------- diagnosis ----------

const GRADED_IN_DX = (v) => !LIPO_WD.includes(v.histType || '');

export function marginClause(v) {
  const sum = marginSummary(v);
  if (sum.state === 'involved') {
    const names = sum.names;
    return names.length ? `${uc1(listJoin(names))} margin${names.length > 1 ? 's' : ''} involved` : 'Resection margin involved';
  }
  if (sum.state === 'cannot') return 'Margins cannot be assessed';
  if (sum.state === 'clear') return 'Resection margins clear';
  return '';
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${diagnosisHead(v)}:`;
  const clauses = [];
  if (v.histType) clauses.push(dxType(v));
  const f = S.fnclcc(v);
  if (f.mode === 'fnclcc' && f.grade && GRADED_IN_DX(v)) clauses.push(`FNCLCC Grade ${f.grade}`);
  if (marginClause(v)) clauses.push(marginClause(v));
  if (nodesPhrase(v)) clauses.push(uc1(nodesPhrase(v)));
  return renderDiagnosis(head, clauses.map((c, i) => `${c}${i === clauses.length - 1 ? '.' : ','}`));
}

// ---------- checks ----------

const CAP_REPEAT = 'CAP: "If the mitotic rate is close to the cutoff between mitotic scores, the count should be repeated."';

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  const t = v.histType || '';
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!t) err('Histologic type not recorded.', 'histType');
  if (t === OTHER_TYPE && !stripDot(v.histTypeOther)) warn('Other histologic type: name it.', 'histTypeOther');
  if (!v.siteGroup) warn('Tumour site (AJCC site group) not recorded: pT needs it.', 'siteGroup');
  if (v.siteGroup === S.SITE.OTHER && !stripDot(v.siteGroupOther)) warn('Other tumour site: name it.', 'siteGroupOther');
  if ([S.SITE.OTHER, S.SITE.NS].includes(v.siteGroup)) info('Tumour site other or not specified: AJCC defines pT by site group, so pT prints as pTX.', 'siteGroup');
  if (S.sizeMm(v) === null) warn('Tumour size not recorded (CAP: greatest dimension; pT reads it at most sites).', 'tumourSizeMm');
  if (extentValue(v) === '' && [S.SITE.HN, S.SITE.ABD, S.SITE.THX, S.SITE.ORBIT].includes(v.siteGroup)) warn('Record the tumour extent for this site group: pT needs it.', v.siteGroup === S.SITE.HN ? 'hnInvasion' : v.siteGroup === S.SITE.ORBIT ? 'orbitExtent' : 'visceralExtent');
  // Grade (CAP, Note G; the QMH FNCLCC rows).
  const f = S.fnclcc(v);
  if (t && f.mode === 'fnclcc') {
    const miss = f.missing.map(([l]) => l);
    if (miss.includes('tumour differentiation score')) warn(`No FNCLCC differentiation score is set for ${lc1(histTypeName(v))}: pick one under Tumour differentiation (FNCLCC), or choose Not graded.`, 'diffScore');
    const rest = miss.filter((l) => l !== 'tumour differentiation score');
    if (rest.length) warn(`FNCLCC grade incomplete: ${listJoin(rest)} not recorded, so the grade row is left out.`, rest[0] === 'mitotic count' ? 'mitoticCount' : 'necrosis');
    if (v.necrosis && String(v.necrosisPct ?? '').trim() !== '') {
      const p = S.necrosisPctScore(v);
      if (p !== null && p !== S.NECROSIS[v.necrosis]) warn(`Tumour necrosis: ${String(v.necrosisPct).trim()}% is typed but "${v.necrosis}" is picked; the score follows the option picked.`, 'necrosis');
    }
    if (f.mitotic) {
      const { count, unit } = f.mitotic;
      const perMm2 = unit === S.MITOTIC_UNITS[1];
      const near = perMm2 ? (count >= 5 && count < 7) || (count >= 11 && count < 13) : (count >= 12 && count <= 15) || (count >= 27 && count <= 30);
      if (near) info(`Mitotic count ${fmt(count)} ${MITOTIC_SHORT[unit] || ''} sits near a cut-off between mitotic scores. ${CAP_REPEAT}`, 'mitoticCount');
    }
    if (/^Malignant peripheral nerve sheath tumour|^Epithelioid malignant peripheral|^Malignant Triton|^Melanotic malignant peripheral/.test(t)) info('CAP (Note G): "The prognostic significance of FNCLCC grading in malignant peripheral nerve sheath tumor is unclear."', 'gradeMode');
    if (t === SFT) info('CAP (Note G): solitary fibrous tumours "are best categorized by risk stratification parameters" (CAP, Note F, Table 3).', 'gradeMode');
  }
  if (f.mode === 'not graded' && v.gradeMode !== 'Not graded') {
    if (/angiosarcoma/i.test(t)) info('CAP (Note G): "Grade is not used for angiosarcoma, as deceptively bland angiosarcomas may behave poorly, thus all are considered clinically \'high-grade\'." The grade row prints Not graded.', 'gradeMode');
    else if (t === SFT) info('CAP (Note G): solitary fibrous tumours "are best categorized by risk stratification parameters" (CAP, Note F, Table 3); the grade row prints Not graded.', 'gradeMode');
    else info(`CAP (Note G): ${lc1(t)} is not assigned an FNCLCC grade; the grade row prints Not graded.`, 'gradeMode');
  }
  if (f.mode === 'high by definition') info(`CAP (Note G): ${lc1(t)} is high grade by definition and takes no FNCLCC grade; the stage group reads it as high grade.`, 'gradeMode');
  if (S.hadTherapy(v) && f.mode === 'fnclcc') info('Preresection therapy is recorded: CAP notes that an adequate sample for accurate grading "is not always available ... in tumors previously treated with radiation or chemotherapy" (Note G), and "In problematic cases, the grade of the pretreatment specimen (if available) should take precedence" (Note D).', 'gradeMode');
  if (v.gradeMode === 'Not graded' && t && S.differentiation({ histType: t }) && f.mode === 'not graded') info(`Not graded is chosen, but ${lc1(t)} takes an FNCLCC grade (CAP, Note G); the stage group needs it.`, 'gradeMode');
  // Staging (CAP, Note F).
  if (NOT_STAGED.includes(t)) info(`CAP (Note F): AJCC staging is not considered clinically relevant for ${lc1(t)}; the pTNM still prints while the block is on.`, 'histType');
  if (v.siteGroup === S.SITE.HN && RMS_HN.includes(t)) info(`CAP (Note F): AJCC staging is not considered clinically relevant for head and neck ${lc1(t)}.`, 'histType');
  if (isRP(v) && t === LMS) info('CAP (Note F): AJCC staging is not considered clinically relevant for retroperitoneal leiomyosarcoma.', 'histType');
  if (EHE.test(t) && [S.SITE.ABD, S.SITE.THX].includes(v.siteGroup) && v.focality === 'Multifocal') info('CAP (Note F): AJCC staging is not considered clinically relevant for multifocal epithelioid haemangioendothelioma of the abdominal and thoracic cavities.', 'histType');
  // Liposarcoma named by site (CAP, Note D): "Generally, the term well-differentiated liposarcoma has been used for
  // groin/retroperitoneum and deep skeletal muscle tumors, due to their increased potential for de-differentiation,
  // whereas atypical lipomatous tumor is preferred for superficial subcutaneous tumors with the same histology since
  // these are generally cured by limited excision." The mediastinum and the paratesticular region join the groin and
  // retroperitoneum, as on the benign soft tissue template. A deep limb tumour gets a note only: the user's own reports
  // name an intramuscular thigh tumour atypical lipomatous tumour. Molecular findings: CAP, Note D, Table 1, and the
  // WHO 5th edition (https://pmc.ncbi.nlm.nih.gov/articles/PMC9216237/).
  const where = `${siteText(v)} ${labelText(v)} ${stripDot(v.specimenName)}`;
  const depth = arr(v.depth);
  const wdSite = isRP(v) || WD_SITE.test(where);
  const superficial = depth.length > 0 && depth.every((d) => d === 'Dermis' || d === 'Subcutis');
  if (t === ALT && wdSite) warn('CAP (Note D): well-differentiated liposarcoma "has been used for groin/retroperitoneum and deep skeletal muscle tumors". At this site, consider well-differentiated liposarcoma as the type.', 'histType');
  else if (t === ALT && depth.some((d) => /^Skeletal muscle/.test(d))) info('CAP (Note D): well-differentiated liposarcoma "has been used for groin/retroperitoneum and deep skeletal muscle tumors"; the depth ticked is skeletal muscle.', 'histType');
  if (t === WDLPS && !wdSite && superficial) warn('CAP (Note D): "atypical lipomatous tumor is preferred for superficial subcutaneous tumors with the same histology since these are generally cured by limited excision". Consider atypical lipomatous tumour as the type.', 'histType');
  if (LIPO_WD.includes(t) && !wdSite && !depth.length) info('Tumour depth not ticked: CAP (Note D) names a superficial subcutaneous tumour atypical lipomatous tumour, and a groin, retroperitoneal or deep skeletal muscle tumour well-differentiated liposarcoma.', 'depth');
  const mdm2 = v.mdm2 || 'Not performed';
  if (MDM2_TYPES.includes(t) && mdm2 === 'Not performed') info('MDM2 FISH not recorded: CAP (Note D, Table 1) gives MDM2 amplification for atypical lipomatous tumour / well-differentiated liposarcoma and for dedifferentiated liposarcoma.', 'mdm2');
  if (MDM2_TYPES.includes(t) && mdm2 === 'No amplification detected') warn('MDM2 is not amplified, which does not support this liposarcoma type. Review the type.', 'mdm2');
  if ((t === PLPS || t === 'Epithelioid pleomorphic liposarcoma') && mdm2 === 'Amplification detected') warn('Pleomorphic liposarcoma with MDM2 amplification: MDM2 amplification belongs to well-differentiated and dedifferentiated liposarcoma, and pleomorphic liposarcoma has no characteristic genomic aberration (WHO 5th edition). Review the type.', 'histType');
  const ddit3 = v.ddit3 || 'Not performed';
  if (t === MLPS && ddit3 === 'Not performed') info('DDIT3 / FUS FISH not recorded: CAP (Note D, Table 1) gives a FUS/EWSR1::DDIT3 fusion for myxoid liposarcoma.', 'ddit3');
  if (t === MLPS && ddit3 === 'No DDIT3 or FUS rearrangement detected') warn('No DDIT3 or FUS rearrangement in a myxoid liposarcoma: review the type.', 'ddit3');
  if (t === MLPS && num(v.hypercellularPct) === null) info('Myxoid liposarcoma: record the percentage of hypercellular (round cell) areas (CAP). The WHO 5th edition makes the tumour high grade when they exceed 5%, and the differentiation score follows it.', 'hypercellularPct');
  if (t === DDLPS && !v.wdComponent) info('Dedifferentiated liposarcoma: record whether a well-differentiated component is present.', 'wdComponent');
  // WHO 6th edition (2026), not yet in CAP or QMH (Hornick, https://pmc.ncbi.nlm.nih.gov/articles/PMC13742349/).
  if (f.mitotic && (v.mitoticUnit || S.MITOTIC_UNITS[0]) === S.MITOTIC_UNITS[0]) {
    const c = f.mitotic.count;
    if (t === DDLPS && c <= 4) info(`WHO 6th edition (2026): dedifferentiation now needs a mitotic count of 5 or more per 10 HPF in a non-lipogenic area; at ${fmt(c)} per 10 HPF, check the count in the most active area, or consider the type.`, 'mitoticCount');
    if (LIPO_WD.includes(t) && c >= 5) info(`WHO 6th edition (2026): a mitotic count of 5 or more per 10 HPF in a non-lipogenic area of an MDM2-amplified tumour defines dedifferentiated liposarcoma; at ${fmt(c)} per 10 HPF, consider dedifferentiation.`, 'histType');
  }
  if (/low[- ]grade dedifferentiat/i.test(`${stripDot(v.histologyNotes)} ${stripDot(v.ihcText)} ${stripDot(v.otherFindings)}`)) info('WHO 6th edition (2026): "low-grade dedifferentiation" is no longer used; such areas below the mitotic threshold remain atypical lipomatous tumour or well-differentiated liposarcoma.', 'histologyNotes');
  // Margins.
  if (!marginSummary(v).value && !marginRows(v).length) warn('Margins not recorded: type one margin per line ("Deep: 2.2 (block 7)"), or tick Margins cannot be assessed.', 'marginsText');
  else if (v.marginsNotAssessable !== true && marginRows(v).some((r) => !r.state)) info('A margin line is printed as typed: start it with a distance in mm, clear, involved or cannot be assessed for the summary to read it.', 'marginsText');
  // Nodes.
  const examined = int(v.nodesExamined); const involved = int(v.nodesInvolved);
  if (examined && involved === null) warn('Lymph nodes involved not recorded.', 'nodesInvolved');
  if (examined !== null && involved !== null && involved > examined) err(`${involved} involved nodes is more than the ${examined} examined.`, 'nodesInvolved');
  if (involved && !v.ene) warn('Extranodal extension not recorded.', 'ene');
  // Staging and treatment.
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');
  if (S.hadTherapy(v) && !['Present', 'Not identified', 'Cannot be determined'].includes(v.treatmentEffect || '')) warn('Preresection therapy is recorded (yp): record the treatment effect.', 'treatmentEffect');
  if (!S.hadTherapy(v) && ['Present', 'Not identified'].includes(v.treatmentEffect || '')) info('A treatment effect is recorded but no preresection therapy: tick it under Preresection treatment for the y prefix.', 'preresection');
  if (v.treatmentEffect === 'Present' && num(v.viablePct) === null) warn('Treatment effect present: record the percentage of viable tumour (QMH).', 'viablePct');
  if (v.focality === 'Multifocal' && v.multiplePrimaries !== true) info('Multifocal tumour: tick Multiple primary tumours (m) under Staging if the tumours are separate primaries.', 'multiplePrimaries');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, comment, diagnosis, validate, staging };
