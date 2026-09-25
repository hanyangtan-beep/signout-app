// Skin squamous cell carcinoma excision generator — the synoptic form for invasive cutaneous SCC.
// Elements follow the QMH "HN-Skin SCC" page (CAP Cutaneous Squamous Cell Carcinoma of the Head and
// Neck v1.2.0.0) in the page order, with the house departures used by every synoptic template: the
// "- Tumour histology:" paragraph follows "- Histologic grade:", margin distances are in mm, British
// spelling throughout.
//
// One template, two staging systems: src/staging/skin_scc.js picks AJCC 8th edition for head and
// neck sites and UICC 8th edition for the trunk and limbs from the tumour site, and gives no pTNM
// for eyelid or perianal skin, which have their own chapters. pTNM prints only with
// `options.printPTNM`, stamped with the edition in use. The Brigham and Women's Hospital (BWH) class
// prints for every site.
//
// The macroscopic description and the generated block key are the skin excision ones
// (generators/skinexcision.js), so a case moved between the two templates keeps its macroscopy.
// Wording is protected by tests/skin_scc.test.js — change it only deliberately.

import { typeMorphology, IHC_PHRASE } from './skin_scc_morphology.js';
import { deriveTNM } from '../src/staging/index.js';
import * as S from '../src/staging/skin_scc.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';
import * as SX from './skinexcision.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

const OTHER_TYPE = 'Other histologic type not listed (specify)';

// ---------- specimen and site ----------

// Site words as they read after the laterality ("left vermilion lip"); the rest are lower-cased.
const SITE_PHRASE = {
  'Perianal skin (within 5 cm of the anal margin)': 'perianal skin',
  'Not specified': ''
};

/** "left cheek", "scalp (midline)"; '' when no site is recorded. */
export function siteText(v) {
  const s = v.tumourSite || '';
  let site = s === 'Other (specify)' ? stripDot(v.tumourSiteOther) : (s in SITE_PHRASE ? SITE_PHRASE[s] : lc1(s));
  if (!site) return '';
  site = lc1(site);
  const lat = v.laterality || '';
  if (lat === 'Right' || lat === 'Left') return `${lat.toLowerCase()} ${site}`;
  if (lat === 'Midline') return `${site} (midline)`;
  if (lat === 'Other (specify)' && stripDot(v.lateralityOther)) return `${site} (${lc1(stripDot(v.lateralityOther))})`;
  return site;
}

const SKIN_PROCEDURES = ['Excision', 'Wide local excision', 'Re-excision'];

export function procedureText(v) {
  const p = arr(v.procedure).filter((s) => s !== 'Not specified');
  if (!p.length) return 'Not specified';
  return listJoin(p.map((s, i) => {
    const t = s === 'Other (specify)' ? stripDot(v.procedureOther) || 'other procedure' : s;
    return i === 0 ? uc1(t) : lc1(t);
  }));
}

/** "excision", "re-excision and sentinel lymph node biopsy". */
export function procedurePhrase(v) {
  const p = arr(v.procedure).filter((s) => s !== 'Not specified');
  const words = p.map((s) => (s === 'Other (specify)' ? stripDot(v.procedureOther) : s)).filter(Boolean).map(lc1);
  if (!words.length) return 'excision';
  if (!p.some((s) => SKIN_PROCEDURES.includes(s) || s === 'Other (specify)')) words.unshift('excision');
  return listJoin(words);
}

export function specimenName(part) {
  const v = part.values;
  const site = stripDot(v.specimenName) || siteText(v);
  return `Skin, ${site ? `${site}, ` : ''}${procedurePhrase(v)}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part, ctx) { return deriveTNM(part.values, 'skin_scc'); }

const staged = (v) => ['hn', 'trunk'].includes(S.region(v));

// ---------- macro ----------

export const macro = (part, ctx) => SX.macro(part, ctx);

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export function blockKey(part, ctx) {
  if (stripDot(part.values.blockKeyText)) return letteredBlockKey(part, ctx, { lettered });
  return SX.blockKey(part, ctx);
}

// ---------- values shared by synoptic and diagnosis ----------

export const histTypeName = (v) => (v.histType === OTHER_TYPE
  ? stripDot(v.histTypeOther) || 'Histologic type not specified'
  : v.histType || 'Histologic type not specified');

/** The type as it reads in a sentence and in the diagnosis line. */
export function displayType(v) {
  const t = histTypeName(v);
  if (t === 'Squamous cell carcinoma, not otherwise specified') return 'squamous cell carcinoma';
  if (t === 'Keratoacanthoma') return 'squamous cell carcinoma, keratoacanthoma type';
  return lc1(t);
}

const gradeShort = (v) => {
  const g = v.grade || '';
  if (!g || g === 'Not applicable' || /^GX,/.test(g)) return '';
  if (g === 'Other (specify)') return stripDot(v.gradeOther);
  return g.replace(/^G\d, /, '');
};

const gradeValue = (v) => {
  const g = v.grade || '';
  if (!g || g === 'Not applicable') return '';
  if (g === 'Other (specify)') return stripDot(v.gradeOther) || 'Other';
  return g;
};

/** Depth for print: "4 mm", "at least 7 mm", "cannot be determined (tangential sections)", ''. */
export function depthText(v) {
  const mode = v.doi || S.DOI.mm;
  const d = num(v.doiMm);
  if (mode === S.DOI.mm) return d === null ? '' : `${fmt(d)} mm`;
  if (mode === S.DOI.least) return d === null ? '' : `at least ${fmt(d)} mm`;
  if (mode === S.DOI.cannot) return `cannot be determined${stripDot(v.doiNote) ? ` (${lc1(stripDot(v.doiNote))})` : ''}`;
  return '';
}

const LEVEL_PHRASE = {
  II: 'invading the papillary dermis',
  III: 'filling and expanding the papillary dermis',
  IV: 'invading the reticular dermis',
  V: 'invading the subcutaneous fat'
};

/** "invading the reticular dermis to a depth of 4 mm"; '' when neither level nor depth is recorded. */
export function extensionPhrase(v) {
  let s = '';
  if (S.beyondFat(v)) s = `invading beyond the subcutaneous fat${stripDot(v.beyondFatDetail) ? ` into ${lc1(stripDot(v.beyondFatDetail))}` : ''}`;
  else {
    const lv = /^(II|III|IV|V) \(/.exec(v.anatomicLevel || '');
    if (lv) s = LEVEL_PHRASE[lv[1]];
  }
  const d = depthText(v);
  if (d && !/^cannot/.test(d)) s = s ? `${s} to a depth of ${d}` : `invading to a depth of ${d}`;
  return s;
}

export function ihcPhrase(v) {
  const picks = arr(v.ihc).map((s) => IHC_PHRASE[s] || lc1(s)).filter(Boolean);
  const typed = stripDot(v.ihcOther);
  const pos = picks.filter((s) => !/ negative$/.test(s));
  const neg = picks.filter((s) => / negative$/.test(s)).map((s) => s.replace(/ negative$/, ''));
  const bits = [];
  if (pos.length) bits.push(`express ${listJoin(pos)}`);
  if (neg.length) bits.push(`are negative for ${listJoin(neg)}`);
  if (typed) bits.push(lc1(typed));
  return bits.length ? `The tumour cells ${listJoin(bits)}.` : '';
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const g = gradeShort(v);
  const what = [g, displayType(v)].filter(Boolean).join(' ');
  let s = `The tumour is ${article(what)} ${what}`;
  const ext = extensionPhrase(v);
  if (ext) s += `, ${ext}`;
  s += '.';
  const morph = typeMorphology(v.histType === OTHER_TYPE ? '' : v.histType || '', v.grade || '');
  if (morph) s += ` ${morph}`;
  const ihc = ihcPhrase(v);
  if (ihc) s += ` ${ihc}`;
  return s;
}

export function sizeValue(v) {
  const size = S.sizeMm(v);
  if (size === null) return 'Not recorded';
  return `${fmt(size)} mm (greatest dimension${S.sizeFromMacro(v) ? ', from the macroscopic lesion size' : ''})`;
}

const focalityValue = (v) => {
  if (v.focality === 'Multiple foci (specify)') return `Multiple foci${stripDot(v.focalityDetail) ? ` (${stripDot(v.focalityDetail)})` : ''}`;
  if (v.focality === 'Cannot be determined') return 'Cannot be determined';
  return '';
};

// ---------- margins ----------

const mm = (x) => { const n = num(x); return n === null ? '' : `${fmt(n)} mm`; };

function invasiveMarginItem(v) {
  const m = v.invasiveMargin || '';
  const peri = mm(v.peripheralMm);
  const deep = mm(v.deepMm);
  const sub = [];
  if (peri) sub.push({ label: 'Closest peripheral margin', value: `${peri}${stripDot(v.peripheralSite) ? ` (${stripDot(v.peripheralSite)})` : ''}` });
  if (deep) sub.push({ label: 'Deep margin', value: deep });
  if (m === 'Cannot be assessed') return { label: 'Invasive tumour', value: 'Margins cannot be assessed' };
  if (/^Margin\(s\) involved/.test(m)) {
    const where = stripDot(v.invasiveInvolvedDetail);
    return { label: 'Invasive tumour', value: `Involved${where ? ` (${where})` : ''}`, sub };
  }
  return { label: 'Invasive tumour', value: 'All margins negative', sub };
}

function insituMarginItem(v) {
  const m = v.insituMargin || '';
  if (!m || m === 'Not applicable') return null;
  const d = stripDot(v.insituDetail);
  if (m === 'Cannot be assessed') return { label: 'Non-invasive tumour', value: 'Margins cannot be assessed' };
  if (/^Margin\(s\) involved/.test(m)) return { label: 'Non-invasive tumour', value: `Involved by in situ disease${d ? ` (${d})` : ''}` };
  return { label: 'Non-invasive tumour', value: `All margins negative for in situ disease${d ? ` (closest ${d})` : ''}` };
}

function bedMarginItem(v) {
  const m = v.bedMargin || '';
  if (!m || m === 'Not applicable') return null;
  const d = stripDot(v.bedDetail);
  return { label: 'Tumour bed margin', value: `${m}${d ? ` (${d})` : ''}` };
}

/** The diagnosis-line margin clause. */
export function marginsPhrase(v) {
  const m = v.invasiveMargin || '';
  if (m === 'Cannot be assessed') return 'margins cannot be assessed';
  const insitu = v.insituMargin || '';
  const insituInvolved = /^Margin\(s\) involved/.test(insitu);
  if (/^Margin\(s\) involved/.test(m)) {
    const where = stripDot(v.invasiveInvolvedDetail);
    return `invasive carcinoma involves the ${where ? lc1(where.replace(/^the /i, '')) : 'margin'}`;
  }
  const dist = [];
  if (mm(v.peripheralMm)) dist.push(`closest peripheral margin ${mm(v.peripheralMm)}${stripDot(v.peripheralSite) ? `, ${stripDot(v.peripheralSite)}` : ''}`);
  if (mm(v.deepMm)) dist.push(`deep margin ${mm(v.deepMm)}`);
  const clear = `completely excised${dist.length ? ` (${dist.join('; ')})` : ''}`;
  if (insituInvolved) {
    const d = stripDot(v.insituDetail);
    return `invasive carcinoma ${clear}; in situ disease involves the ${d ? lc1(d.replace(/^the /i, '')) : 'margin'}`;
  }
  return clear;
}

// ---------- lymph nodes and metastasis ----------

export function nodesItem(v) {
  const ex = int(v.nodesExamined);
  if (ex === null) return null;
  if (ex === 0) return { label: 'Regional lymph nodes', value: 'None submitted (0 examined)' };
  const inv = int(v.nodesInvolved);
  const sub = [];
  if (inv && inv > 0) {
    if (v.nodeLaterality) sub.push({ label: 'Laterality', value: v.nodeLaterality });
    sub.push({ label: 'Extranodal extension', value: v.ene || 'Not recorded' });
    const dep = mm(v.largestDepositMm);
    if (dep) sub.push({ label: 'Size of largest metastatic deposit', value: `${dep}${stripDot(v.largestDepositSite) ? `, ${stripDot(v.largestDepositSite)}` : ''}` });
    const node = mm(v.largestNodeMm);
    if (node) sub.push({ label: 'Size of largest involved lymph node', value: `${node}${stripDot(v.largestNodeSite) ? `, ${stripDot(v.largestNodeSite)}` : ''}` });
  }
  return { label: 'Regional lymph nodes', value: inv === null ? `${ex} examined; involved not recorded` : `${ex} examined; ${inv} involved`, sub };
}

export function nodesPhrase(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return '';
  const inv = int(v.nodesInvolved) ?? 0;
  let s = `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
  if (inv > 0 && v.ene === 'Present') s += '; extranodal extension present';
  return s;
}

const METS_SITES = ['Bone', 'Brain', 'Lung', 'Liver', 'Other (specify)'];

export function metastasisValue(v) {
  const all = arr(v.distantMets);
  const d = stripDot(v.distantDetail);
  const kept = all.filter((s) => METS_SITES.includes(s));
  if (kept.length) return `${listJoin(kept.map((s) => (s === 'Other (specify)' ? 'other site' : s)).map((s, i) => (i ? lc1(s) : s)))}${d ? ` (${d})` : ''}`;
  if (all.includes('Cannot be determined')) return `Cannot be determined${d ? ` (${d})` : ''}`;
  if (all.includes('Not identified')) return 'Not identified';
  return '';
}

// ---------- BWH ----------

export function bwhValue(v) {
  const cls = S.bwhClass(v);
  const derived = cls === 'T0' ? 'T0: in situ squamous cell carcinoma' : S.bwhOptionFor(cls);
  const ov = v.bwhOverride || S.BWH_OPTIONS[0];
  if (ov === S.BWH_OPTIONS[0] || ov.startsWith(`${cls}:`)) return derived;
  return `${ov} [pathologist override; derived ${cls}]`;
}

export function bwhFactorsValue(v) {
  const f = S.bwhFactors(v).map((s, i) => (i ? lc1(s) : s));
  if (S.anyBone(v)) f.push(f.length ? 'bone invasion' : 'Bone invasion');
  return f.length ? listJoin(f) : 'None identified';
}

const bwhShort = (v) => {
  const ov = v.bwhOverride || S.BWH_OPTIONS[0];
  return ov === S.BWH_OPTIONS[0] ? S.bwhClass(v) : ov.split(':')[0];
};

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Tumour site', uc1(siteText(v)) || 'Not specified'),
      item('Tumour size', sizeValue(v)),
      item('Tumour focality', focalityValue(v))
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Histologic grade', gradeValue(v)),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Depth of invasion', uc1(depthText(v))),
      item('Anatomic level', v.anatomicLevel && v.anatomicLevel !== 'Not applicable' ? v.anatomicLevel : ''),
      item('Invasion beyond the subcutaneous fat', v.beyondFat === S.BEYOND_FAT.present
        ? `Present${stripDot(v.beyondFatDetail) ? ` (${stripDot(v.beyondFatDetail)})` : ''}`
        : v.beyondFat === S.BEYOND_FAT.cannot ? 'Cannot be determined' : ''),
      item('Bone invasion', v.boneInvasion && v.boneInvasion !== S.BONE.na ? v.boneInvasion : ''),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified')
    ] },
    { heading: 'Margins', items: [invasiveMarginItem(v), insituMarginItem(v), bedMarginItem(v)] },
    { heading: 'Lymph nodes', items: [nodesItem(v)] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM && staged(v) ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'BWH tumour classification', items: [
      { label: 'BWH class', value: bwhValue(v), sub: bwhFactorsValue(v) === 'None identified' ? [] : [{ label: 'High-risk factors', value: bwhFactorsValue(v) }] }
    ] },
    { heading: 'Additional findings', items: [
      item('Immunosuppression', stripDot(v.immunosuppression)),
      item('Additional notes', stripDot(v.additionalNotes)),
      !stripDot(v.immunosuppression) && !stripDot(v.additionalNotes) ? { text: 'None identified' } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `(${part.label}) ${upperHead(specimenName(part))}`;
  const first = [];
  let clause = [upperHead(displayType(v)), gradeShort(v)].filter(Boolean).join(', ');
  const size = S.sizeMm(v);
  if (size !== null) clause += `, ${fmt(size)} mm`;
  const ext = extensionPhrase(v);
  if (ext) clause += `, ${ext}`;
  first.push(clause);
  if (S.anyBone(v)) first.push(lc1(v.boneInvasion));
  if (/^Present/.test(v.pni || '')) {
    first.push(v.pni === S.PNI.unstated ? 'perineural invasion present' : `perineural invasion present (${lc1(v.pni.replace(/^Present, /, ''))})`);
  }
  if (v.lvi === 'Present') first.push('lymphovascular invasion present');
  const mp = marginsPhrase(v);
  if (mp) first.push(mp);
  const clauses = [`${first.join('; ')}; see synoptic report`];
  const np = nodesPhrase(v);
  if (np) clauses.push(np);
  const mets = arr(v.distantMets).filter((s) => METS_SITES.includes(s)).map((s) => (s === 'Other (specify)' ? stripDot(v.distantDetail) || 'other site' : lc1(s)));
  if (mets.length) clauses.push(`distant metastasis: ${listJoin(mets)}`);
  if (ctx?.options?.printPTNM) {
    const st = staging(part, ctx);
    clauses.push(staged(v) ? `${st.tnm} (${st.edition}); BWH ${bwhShort(v)}` : `BWH ${bwhShort(v)}`);
  }
  return renderDiagnosis(head, clauses);
}

// ---------- validation ----------

// Staging notes the validator already states as a check of its own, that another note already
// says (the pM1 note repeats the contralateral and bilateral pN notes), or that describe the normal
// outcome rather than a problem.
const QUIET_NOTE = /^(Tumour size not recorded; pT|Tumour site not recorded|Eyelid and perianal skin|Size of the largest metastatic deposit not recorded|Number of involved lymph nodes not recorded|Contralateral lymph node metastasis from a trunk|TNM overridden)/;

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn } = checks();
  const r = S.region(v);
  const st = staging(part, ctx);
  if (!v.histType) err('Histologic type is required.', 'histType');
  if (v.histType === OTHER_TYPE && !stripDot(v.histTypeOther)) warn('Histologic type "Other" needs specifying.', 'histTypeOther');
  if (!v.grade) warn('Histologic grade is not recorded; poor differentiation is a BWH high-risk factor.', 'grade');
  if (!v.tumourSite) err('Tumour site is required: it chooses the staging system (AJCC 8th head and neck, UICC 8th trunk and limbs).', 'tumourSite');
  else if (r === '') err('Choose the staging region for this site: head and neck, trunk and limbs, or not staged here.', 'siteRegion');
  if (v.tumourSite === 'Other (specify)' && !stripDot(v.tumourSiteOther)) warn('Tumour site "Other" needs specifying.', 'tumourSiteOther');
  if (v.anatomicLevel === S.LEVEL_IN_SITU) warn('Anatomic level I is carcinoma in situ; an in situ lesion is reported on the Skin excision form.', 'anatomicLevel');
  const isStaged = r === 'hn' || r === 'trunk';
  if (isStaged && st.derived.T === 'TX' && !st.overridden && v.anatomicLevel !== S.LEVEL_IN_SITU) {
    err('pT cannot be assigned: record the tumour size (greatest dimension), or the macroscopic lesion size.', 'tumourSizeMm');
  } else if (!isStaged && S.sizeMm(v) === null && v.anatomicLevel !== S.LEVEL_IN_SITU) {
    warn('Tumour size not recorded; the BWH class treats the diameter as under 2 cm.', 'tumourSizeMm');
  }
  if ((v.doi || S.DOI.mm) === S.DOI.mm && num(v.doiMm) === null && v.anatomicLevel !== S.LEVEL_IN_SITU) {
    warn('Depth of invasion is not recorded; more than 6 mm is a pT3 criterion.', 'doiMm');
  }
  const f3 = S.t3Factors(v);
  if (isStaged && f3.length && /^T[12]$/.test(st.T)) err(`p${st.T} recorded, but ${listJoin(f3)} is a pT3 criterion.`, 'tnmOverride');
  if (v.pni === S.PNI.unstated) warn('Perineural invasion present with the calibre not stated: a nerve 0.1 mm or more in calibre, or deeper than the dermis, is a pT3 criterion and a BWH factor.', 'pni');
  if (v.beyondFat === S.BEYOND_FAT.present && !stripDot(v.beyondFatDetail)) warn('Name the structure invaded beyond the subcutaneous fat.', 'beyondFatDetail');
  const cls = S.bwhClass(v);
  const ov = v.bwhOverride || S.BWH_OPTIONS[0];
  if (ov !== S.BWH_OPTIONS[0] && !ov.startsWith(`${cls}:`)) err(`BWH class ${ov.split(':')[0]} recorded, but the recorded factors give ${cls}.`, 'bwhOverride');
  if (/^Margin\(s\) involved/.test(v.invasiveMargin || '') && !stripDot(v.invasiveInvolvedDetail)) warn('Name the margin involved by invasive tumour.', 'invasiveInvolvedDetail');
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err('More lymph nodes involved than examined.', 'nodesInvolved');
  if (ex && ex > 0 && inv === null) err('Number of involved lymph nodes is required when nodes are examined.', 'nodesInvolved');
  if (inv && inv > 0) {
    if (r === 'hn' && !v.ene) err('Extranodal extension is required for involved head and neck nodes: it decides pN.', 'ene');
    if (num(v.largestDepositMm) === null && isStaged) err('Size of the largest metastatic deposit is required: pN turns on 30 mm and 60 mm.', 'largestDepositMm');
    if (!v.nodeLaterality) warn('Laterality of the involved nodes is not recorded; they are staged as ipsilateral.', 'nodeLaterality');
    if (v.nodeLaterality === S.NODE_LATERALITY.bi && inv < 2) warn('Bilateral nodal involvement needs at least two involved nodes.', 'nodesInvolved');
  }
  if (arr(v.distantMets).includes('Other (specify)') && !stripDot(v.distantDetail)) warn('Distant metastasis "Other" needs specifying.', 'distantDetail');
  if (r === 'none' && stripDot(v.tnmOverride)) warn('Eyelid and perianal skin are staged in their own chapters; the typed pTNM does not print here.', 'tnmOverride');
  if (r === 'none' && ctx?.options?.printPTNM) warn('Eyelid and perianal skin are staged in their own chapters; no pTNM prints here.', 'tumourSite');
  for (const n of st.notes) if (!QUIET_NOTE.test(n)) warn(n);
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
