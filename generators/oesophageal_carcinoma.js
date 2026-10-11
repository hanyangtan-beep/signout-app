// Oesophageal carcinoma resection generator (seventh synoptic template; pairs with the
// "Oesophageal biopsy" template). Elements mirror the QMH Cancer Reporting Template
// GI-Esophagus page (CAP Esophagus 4.2.0.1 core + optional, AJCC 8th edition) in the QMH
// order, with the same deliberate house departure as the other synoptics: the
// "- Tumour histology:" paragraph follows "- Histologic grade:". Endoscopic-resection cases
// print the mucosal / deep margins instead of the proximal / distal / radial set. pTNM is
// derived by src/staging/oesophagus.js (separate squamous / adenocarcinoma pathological
// tables; one shared ypTNM table after neoadjuvant therapy) and printed only with
// `options.printPTNM`, stamped (AJCC 8th edition). Pure functions: (part, ctx) -> string.
// Wording is protected by tests/oesophageal.test.js — change it only deliberately.

import { deriveTNM, stageLine, showNodes, showMets } from '../src/staging/index.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { typeMorphology, ihcSentence } from './oesophageal_morphology.js';
import { letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
// stripDot here also strips a trailing colon; see generators/_house.js for why it is not shared.
const stripDot = (s) => String(s || '').trim().replace(/[.;:\s]+$/, '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
/** WHO types treated as glandular-lineage for budding and background Barrett mucosa. */
const ADENO = /adenocarcinoma|signet-ring|adenosquamous/i;

const isER = (v) => (v.procedure || '') === 'Endoscopic resection';
const listAnd = listJoin;
const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|specified)|^Cannot/.test(s));
const specify = (s) => String(s || '').replace(/\s*\((specify)[^)]*\)\s*:?$/i, '').trim();

/** Short site phrases for the specimen name and diagnosis head. */
export const SITE_PHRASE = {
  'Cervical (proximal) oesophagus': 'proximal',
  'Mid oesophagus, upper thoracic oesophagus': 'upper thoracic',
  'Mid oesophagus, middle thoracic oesophagus': 'middle thoracic',
  'Mid oesophagus, not otherwise specified': 'mid',
  'Distal oesophagus (low thoracic oesophagus)': 'distal',
  'Oesophagogastric junction (EGJ)': 'oesophagogastric junction',
  'Proximal stomach / cardia': 'cardia'
};

export function sitePhrase(v) {
  const s = v.tumourSite || '';
  if (s === 'Other') return stripDot(v.tumourSiteOther);
  return SITE_PHRASE[s] || '';
}

export function procedureText(v) {
  if (/^(Other|Not specified)$/.test(v.procedure || '')) return stripDot(v.procedureOther) || v.procedure;
  return v.procedure || 'Not specified';
}

export function procedurePhrase(v) {
  const p = specify(procedureText(v));
  return p === 'Not specified' ? '' : isER(v) ? 'endoscopic resection' : lc1(p);
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const site = sitePhrase(v);
  const proc = procedurePhrase(v);
  return `Oesophagus${site ? `, ${site}` : ''}${proc ? `, ${proc}` : ''}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part, ctx) { return deriveTNM(part.values, 'oesophagus'); }

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const proc = procedurePhrase(v) || 'oesophagectomy';
  const article = /^[aeiou]/.test(proc) ? 'an' : 'a';
  let s = isER(v)
    ? `(${part.label}) Received in formalin is ${article} endoscopic resection specimen of oesophageal mucosa`
    : `(${part.label}) Received in formalin is ${article} ${proc} specimen`;
  s += '.';
  const det = [];
  if (num(v.oesophagusLen) !== null) det.push(`the oesophagus measures ${fmt(num(v.oesophagusLen))} mm`);
  if (num(v.stomachLen) !== null) det.push(`a ${fmt(num(v.stomachLen))} mm cuff of stomach and cardia is attached`);
  if (det.length) s += ` ${uc1(listJoin(det))}.`;
  const size = num(v.tumourSizeMm);
  const gd = stripDot(v.grossDetails);
  s += ' There is a tumour';
  const site = sitePhrase(v);
  if (site) s += ` in the ${site === 'oesophagogastric junction' ? site : `${site} oesophagus`}`;
  if (size !== null) s += ` measuring ${stripDot(v.tumourDims) ? `${stripDot(v.tumourDims)} mm` : `${fmt(size)} mm in greatest dimension`}`;
  const prox = num(v.proximalDistance); const dist = num(v.distalDistance);
  if (prox !== null || dist !== null) {
    const bits = [];
    if (prox !== null) bits.push(`${fmt(prox)} mm from the proximal margin`);
    if (dist !== null) bits.push(`${fmt(dist)} mm from the distal margin`);
    s += `, ${bits.join(' and ')}`;
  }
  s += '.';
  if (gd) s += ` ${uc1(gd)}.`;
  s += ' Representative sections are taken; see block key.';
  return s;
}

// ---------- block key ----------

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

// ---------- values shared by synoptic and diagnosis ----------

export const histTypeName = (v) => (v.histType === 'Other' ? (v.histTypeOther || '').trim() || 'Histologic type not specified' : v.histType || 'Histologic type not specified');
const isTis = (v) => /carcinoma in situ/.test(v.tumourExtension || '');
const isPT0 = (v) => /^No evidence of primary tumour/.test(v.tumourExtension || '');
const gradeShort = (v) => (!v.grade || /^(GX|Not applicable|Other)/.test(v.grade) ? (stripDot(v.gradeOther) || '') : v.grade.replace(/^G\d, /, ''));

/** Invasion clause for the derived histology sentence and the diagnosis. */
export function extensionPhrase(v) {
  const e = v.tumourExtension || '';
  if (/lamina propria/.test(e)) return 'invading the lamina propria';
  if (/muscularis mucosae/.test(e)) return 'invading the muscularis mucosae';
  if (/submucosa/.test(e)) return 'invading the submucosa';
  if (/muscularis propria/.test(e)) return 'invading the muscularis propria';
  if (/adventitia/.test(e)) return 'invading the adventitia';
  if (/serosa/.test(e)) return 'invading the serosa (visceral peritoneum)';
  if (/adjacent structures/.test(e)) {
    const d = stripDot(v.extensionDetail);
    return `directly invading ${d ? `the ${lc1(d)}` : 'adjacent structures'}`;
  }
  return '';
}

/**
 * Derived "- Tumour histology:" paragraph; the typed notes win when entered. The opener names
 * type, grade and depth; per-type morphology from oesophageal_morphology.js follows, then
 * budding / retraction / Barrett sentences when recorded, with IHC in the same paragraph
 * (house style).
 */
export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return stripDot(v.histologyNotes) + '.';
  if (isPT0(v)) return 'No viable tumour cells are identified.';
  const g = gradeShort(v);
  const bits = [[g, lc1(histTypeName(v).replace(/^G\d: /, ''))].filter(Boolean).join(' ')].filter(Boolean);
  let s = `The tumour is a ${bits.join(', ')}`;
  const ext = extensionPhrase(v);
  if (ext) s += `, ${ext}`;
  s += '.';
  if (!isTis(v)) {
    const typeName = v.histType === 'Other' ? '' : v.histType || '';
    const morph = typeMorphology(typeName, v.grade || '');
    if (morph) s += ` ${morph.replace(/\.$/, '')}.`;
    const budding = v.budding || '';
    if (/^Bd\d/.test(budding)) s += ` Tumour budding, counted as discrete foci of fewer than five cells in the hottest field at the invasive front, is ${/Bd1/.test(budding) ? 'low grade (Bd1, 0-4 buds)' : /Bd2/.test(budding) ? 'intermediate grade (Bd2, 5-9 buds)' : 'high grade (Bd3, 10 or more buds)'}.`;
    if (v.retraction === 'Present') s += ' Retraction artefact is present around tumour nests.';
    if (v.barrett === 'Present') s += " Background Barrett-type columnar epithelium with intestinal metaplasia is present.";
    const ihc = ihcSentence(v);
    if (ihc) s += ` ${ihc}`;
  }
  return s;
}

function treatmentText(v) {
  const te = v.treatmentEffect || 'No known presurgical therapy';
  if (/^No known/.test(te)) return 'No known presurgical therapy';
  return te;
}

/** Value minus the placeholder parentheses, with any typed distance appended. */
export function resMarginText(vv, mmVal) {
  const s = (vv || '').trim();
  if (!s || /^Not applicable/.test(s)) return '';
  const mm = num(mmVal);
  if (/specify distance/.test(s)) {
    const base = s.replace(/\s*\(specify[^)]*\)\s*/, '');
    return mm !== null ? `${base}, ${fmt(mm)} mm` : base;
  }
  return s;
}

/** Relationship-to-EGJ value for the synoptic list (exact QMH option wording). */
function egjText(v) {
  const e = v.egjRelationship || '';
  const dx = num(v.egjDistanceMm);
  const dist = dx !== null ? ` (tumour centre ${fmt(dx)} mm ${dx >= 0 ? 'proximal to' : 'distal to'} the EGJ)` : '';
  if (/^Not specified$|^Cannot be assessed$/.test(e)) return e;
  return e ? `${e}${dist}` : '';
}

export function nodesItem(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return { label: 'Regional lymph nodes', value: ex === 0 ? 'None submitted (0 examined)' : 'Not recorded' };
  const inv = int(v.nodesInvolved);
  const sub = [
    { label: 'Number examined', value: String(ex) },
    { label: 'Number involved', value: inv === null ? 'Not recorded' : String(inv) }
  ];
  if (inv && inv > 0) sub.push({ label: 'Extracapsular spread', value: !v.ene || /^Not applicable/.test(v.ene) ? 'Not identified' : v.ene });
  const dep = num(v.largestDepositMm);
  if (inv && inv > 0 && dep !== null) sub.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm${stripDot(v.largestNodeSite) ? `, ${stripDot(v.largestNodeSite)}` : ''}` });
  const node = num(v.largestNodeMm);
  if (inv && inv > 0 && node !== null) sub.push({ label: 'Size of largest lymph node involved', value: `${fmt(node)} mm${stripDot(v.largestNodeSite) ? `, ${stripDot(v.largestNodeSite)}` : ''}` });
  return { label: 'Regional lymph nodes', value: inv === null ? `${ex} examined; involved not recorded` : `${ex} examined; ${inv} involved`, sub };
}

export function metastasisValue(v) {
  const sites = chosen(v.distantMets).map((s) => (s === 'Other site' ? stripDot(v.distantDetail) || 'Other site' : s));
  const d = stripDot(v.distantDetail);
  if (!sites.length) return arr(v.distantMets).some((s) => /^Cannot/.test(s)) ? `Cannot be determined${d ? ` (${d})` : ''}` : arr(v.distantMets).includes('Not identified') ? 'Not identified' : 'Not applicable';
  const named = sites.map((s) => (s === 'Liver' || /^Other site/.test(s) || s === 'Non-regional lymph node(s)') && d && d !== s ? `${s} (${d})` : s);
  return listJoin(named);
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const size = num(v.tumourSizeMm);
  const sizeText = isPT0(v)
    ? 'Not applicable (no residual tumour)'
    : size !== null
      ? `${stripDot(v.tumourDims) ? `${stripDot(v.tumourDims)} mm (greatest dimension ` : ''}${fmt(size)} mm${stripDot(v.tumourDims) ? ')' : ' in greatest dimension'}`
      : stripDot(v.sizeCannot) ? `Cannot be determined (${lc1(stripDot(v.sizeCannot))})` : 'Cannot be determined';
  const extVal = /adjacent structures/.test(v.tumourExtension || '')
    ? (stripDot(v.extensionDetail) ? `Tumour directly invades adjacent structures (${stripDot(v.extensionDetail)})` : v.tumourExtension)
    : v.tumourExtension || '';
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Tumour site', v.tumourSite === 'Other' ? stripDot(v.tumourSiteOther) || 'Other' : v.tumourSite || ''),
      item('Relationship of tumour to the oesophagogastric junction (EGJ)', egjText(v)),
      item('Tumour size', sizeText)
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      v.grade && !/^Not applicable$/.test(v.grade) ? item('Histologic grade', v.grade !== 'Other' ? v.grade : stripDot(v.gradeOther) || null) : null,
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Tumour extension', extVal),
      v.smDepth && /^Exact/.test(v.smDepth) && num(v.smDepthExact) !== null
        ? item('Depth of submucosal invasion', `${fmt(num(v.smDepthExact))} mm`)
        : v.smDepth ? item('Depth of submucosal invasion', v.smDepth) : null,
      v.smExtent ? item('Extent of submucosal invasion', v.smExtent) : null,
      item('Lymphatic invasion (Ly)', v.ly || 'Not identified'),
      item('Venous invasion (V)', v.v || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      /^Bd\d/.test(v.budding || '') ? item('Tumour budding', v.budding) : null,
      v.retraction === 'Present' ? item('Retraction artefact', 'Present') : null,
      v.barrett === 'Present' ? item('Background Barrett mucosa', 'Present') : null,
      item('Treatment effect', treatmentText(v)),
      v.trg && v.trg !== 'Not assessed' ? item('Tumour regression grade (Mandard)', v.trg) : null,
      v.her2 && v.her2 !== 'Not performed' ? item('HER2 status', v.her2) : null,
      num(v.pdl1Cps) !== null ? item('PD-L1 combined positive score', String(fmt(num(v.pdl1Cps)))) : null,
      v.mmr && v.mmr !== 'Not performed' ? item('Mismatch repair (MMR) immunohistochemistry', v.mmr) : null
    ] },
    isER(v)
      ? { heading: 'Margins', items: [
          item('Mucosal margin', `${resMarginText(v.hmMargin)}${stripDot(v.hmMarginDetail) ? ` (${stripDot(v.hmMarginDetail)})` : ''}`),
          item('Deep margin', resMarginText(v.vmMargin, v.vmMarginMm)),
          v.otherMargin && !/^Not applicable/.test(v.otherMargin) ? item('Other margins', `${resMarginText(v.otherMargin)}${stripDot(v.otherMarginDetail) ? ` (${stripDot(v.otherMarginDetail)})` : ''}`) : null
        ] }
      : { heading: 'Margins', items: [
          item('Proximal margin', resMarginText(v.proximalMargin, v.proximalMarginMm)),
          item('Distal margin', resMarginText(v.distalMargin, v.distalMarginMm)),
          item('Radial margin', resMarginText(v.radialMargin, v.radialMarginMm)),
          v.otherMargin && !/^Not applicable/.test(v.otherMargin) ? item('Other margins', `${resMarginText(v.otherMargin)}${stripDot(v.otherMarginDetail) ? ` (${stripDot(v.otherMarginDetail)})` : ''}`) : null
        ] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: [nodesItem(v)] } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm,
        sub: stageLine(st) ? [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] : [] }
    ] } : null,
    { heading: 'Additional findings', items: (() => {
      const f = chosen(v.additionalFindings)
        .map((s) => (s === 'Other (specify)' ? stripDot(v.additionalFindingsDetail) : s))
        .filter(Boolean);
      return [
        ...f.map((t) => ({ text: t })),
        stripDot(v.additionalFindingsDetail) && f.length && !arr(v.additionalFindings).includes('Other (specify)') ? item('Additional detail', stripDot(v.additionalFindingsDetail)) : null,
        stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null,
        !f.length && !stripDot(v.additionalNotes) ? { text: 'None identified' } : null
      ];
    })() }
  ].filter(Boolean).map((sec) => ({ ...sec, items: (sec.items || []).filter(Boolean) }));
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };

/** "2 of 19 regional lymph nodes involved"; '' when none submitted. */
export function nodesPhrase(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return '';
  const inv = int(v.nodesInvolved) ?? 0;
  return `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
}

const marginName = { proximalMargin: 'proximal margin', distalMargin: 'distal margin', radialMargin: 'radial margin' };

const marginsPhrase = (v) => {
  const named = isER(v)
    ? [{ name: 'mucosal margin', value: v.hmMargin }, { name: 'deep margin', value: v.vmMargin, mm: num(v.vmMarginMm) }]
    : ['proximalMargin', 'distalMargin', 'radialMargin'].map((k) => ({ name: marginName[k], value: v[k], mm: num(v[`${k}Mm`]) }));
  const involved = named.filter((m) => /^Involved/.test(m.value || '')).map((m) => m.name);
  const clear = named.filter((m) => /^Uninvolved/.test(m.value || ''));
  const out = [];
  if (involved.length) out.push(`${listAnd(involved)} involved`);
  if (clear.length) {
    const mmVals = clear.map((m) => m.mm).filter((x) => Number.isFinite(x));
    out.push(`${clear.length > 1 ? 'other margins clear' : `${clear.map((m) => m.name).join(' and ')} clear`}${mmVals.length ? ` (closest ${fmt(Math.min(...mmVals))} mm)` : ''}`);
  }
  return out.join('; ');
};

export function diagnosis(part, ctx) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  const head = `(${part.label}) ${typed ? upperHead(typed) : upperHead(specimenName(part))}`;
  const first = [];
  if (isPT0(v)) {
    first.push('NO RESIDUAL CARCINOMA following therapy');
  } else if (isTis(v)) {
    first.push('HIGH-GRADE DYSPLASIA / CARCINOMA IN SITU');
  } else {
    const g = gradeShort(v);
    let type = [upperHead(histTypeName(v).replace(/^G\d: /, '')), g].filter(Boolean).join(', ');
    if (ADENO.test(v.histType || '') && v.barrett === 'Present') type += ', arising in Barrett mucosa';
    let clause = type;
    const size = num(v.tumourSizeMm);
    if (size !== null) clause += `, ${fmt(size)} mm`;
    const ext = extensionPhrase(v);
    if (ext) clause += `, ${ext}`;
    first.push(clause);
    const invasion = [];
    if (v.ly === 'Present' && v.v === 'Present') invasion.push('lymphatic and venous invasion present');
    else {
      if (v.ly === 'Present') invasion.push('lymphatic invasion present');
      if (v.v === 'Present') invasion.push('venous invasion present');
    }
    if (v.pni === 'Present') invasion.push('perineural invasion present');
    first.push(...invasion);
  }
  if (!/^No known/.test(v.treatmentEffect || 'No known presurgical therapy')) {
    const te = lc1(v.treatmentEffect.replace(/\s*\(not otherwise specified\)/, ''));
    const trgBit = v.trg && v.trg !== 'Not assessed' && !/^Cannot/.test(v.trg) ? `; Mandard ${(/^TRG \d+/.exec(v.trg) || [''])[0]}` : '';
    first.push(`treatment effect: ${te}${trgBit}`);
  }
  const mp = marginsPhrase(v);
  if (mp) first.push(mp);
  const clauses = [`${first.join('; ')}; see synoptic report`];
  const np = nodesPhrase(v);
  if (np) clauses.push(np + (v.ene === 'Present' ? '; extracapsular spread present' : ''));
  const mets = chosen(v.distantMets).map((s) => lc1(specify(s === 'Other site' ? stripDot(v.distantDetail) || 'other site' : s)));
  if (mets.length) clauses.push(`distant metastasis: ${listJoin(mets)}`);
  if (ctx?.options?.printPTNM) {
    const st = staging(part, ctx);
    let s = `${st.tnm} (${st.edition})`;
    if (st.stage) s += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
    clauses.push(s);
  }
  return renderDiagnosis(head, clauses);
}

// ---------- validation ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn } = checks();
  const cr = isPT0(v);
  if (!cr && num(v.tumourSizeMm) === null && !stripDot(v.sizeCannot) && !isTis(v)) warn('Tumour size is not recorded.', 'tumourSizeMm');
  if (!v.histType) err('Histologic type is required.', 'histType');
  if (!v.tumourExtension) err('Tumour extension is required to assign pT.', 'tumourExtension');
  if (/adjacent structures/.test(v.tumourExtension || '') && !stripDot(v.extensionDetail)) warn('Tumour directly invades adjacent structures: specify the structures (pleura, pericardium, azygos vein, diaphragm or peritoneum are pT4a; aorta, vertebral body and airway are pT4b).', 'extensionDetail');
  const ex = int(v.nodesExamined); const pos = int(v.nodesInvolved);
  if (ex === null) err('Number of regional lymph nodes examined is required (enter 0 if none submitted).', 'nodesExamined');
  else if (ex > 0 && pos === null) err('Number of involved lymph nodes is required (enter 0 if none).', 'nodesInvolved');
  if (ex !== null && pos !== null && pos > ex) err('Involved nodes exceed the number examined.', 'nodesInvolved');
  if (pos && pos > 0 && (!v.ene || /^Not applicable/.test(v.ene))) warn('Extracapsular spread is not recorded for a node-positive case.', 'ene');
  if (!cr && !isER(v)) {
    if (!v.proximalMargin) err('Proximal margin status is required.', 'proximalMargin');
    if (!v.distalMargin) err('Distal margin status is required.', 'distalMargin');
    if (!v.radialMargin) err('Radial margin status is required.', 'radialMargin');
    if (/^Uninvolved/.test(v.proximalMargin || '') && /distance/i.test(v.proximalMargin) && num(v.proximalMarginMm) === null) warn('Proximal margin uninvolved: record the distance.', 'proximalMarginMm');
    if (/^Uninvolved/.test(v.distalMargin || '') && /distance/i.test(v.distalMargin) && num(v.distalMarginMm) === null) warn('Distal margin uninvolved: record the distance.', 'distalMarginMm');
    if (/^Uninvolved/.test(v.radialMargin || '') && /distance/i.test(v.radialMargin) && num(v.radialMarginMm) === null) warn('Radial margin uninvolved: record the distance.', 'radialMarginMm');
  }
  if (isER(v) && !v.hmMargin && !cr) err('Mucosal margin status is required.', 'hmMargin');
  if (isER(v) && !v.vmMargin && !cr) err('Deep margin status is required.', 'vmMargin');
  if (isTis(v) && pos && pos > 0) warn('Carcinoma in situ does not metastasise; review the nodal count.', 'nodesInvolved');
  if (/^Present, with no viable/.test(v.treatmentEffect || '') && !isPT0(v)) warn('Complete pathological response (score 0) recorded but Tumour extension is not "No evidence of primary tumour".', 'tumourExtension');
  if (!/^No known|^Cannot/.test(v.treatmentEffect || '') && !cr && (!v.trg || v.trg === 'Not assessed')) warn('Neoadjuvant therapy given: record the Mandard tumour regression grade (TRG).', 'trg');
  if (/Oesophagogastric junction|^Distal oesophagus|cardia/.test(v.tumourSite || '') && !v.egjRelationship) warn('Distal oesophagus / EGJ tumour: record the relationship to the oesophagogastric junction (WHO / AJCC EGJ rule).', 'egjRelationship');
  if (/^Bd\d/.test(v.budding || '') && !ADENO.test(v.histType || '')) warn('Tumour budding is recorded but the histologic type is not adenocarcinoma; the Bd grading tiers are standardised for adenocarcinoma.', 'budding');
  if (v.barrett === 'Present' && !ADENO.test(v.histType || '') && !isTis(v) && !isPT0(v)) warn('Background Barrett mucosa is recorded but the histologic type is not adenocarcinoma.', 'barrett');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
