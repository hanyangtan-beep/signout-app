// Gastric carcinoma resection generator (sixth synoptic template; the paired template of the
// "Gastric biopsy / gastric ultrasound" family). Elements mirror the QMH Cancer Reporting
// Template GI-Stomach page (AJCC 8th edition) in the QMH order, with two deliberate house
// departures recorded in docs/specs/gastric-carcinoma.md: the "- Tumour histology:" paragraph
// follows "- Histologic grade:" (all synoptic templates), and the N3 categories are carried as
// N3a / N3b rather than the merged N3 pick-list on the page. Endoscopic-resection cases print
// HM / VM margins and the JCGC 7th edition eCura score instead of the gastrectomy margins.
// pTNM is derived by src/staging/gastric.js and printed only with `options.printPTNM`,
// stamped (AJCC 8th edition); a typed override wins and is echoed with its reason.
// Pure functions: (part, ctx) -> string.
//
// Blocks produced:
//   specimenName / specimens  "(A) Stomach, antrum, lesser curvature, distal partial gastrectomy"
//   macro                     "The specimen consists of a distal partial gastrectomy …"
//   blockKey                  the typed block key, one "(n) …" entry per line
//   synoptic                  sectioned "- Element: value" list in QMH order
//   diagnosis                 the specimen line + "- " clauses, lowest margin distance and yp-prefix
// Wording is protected by tests/gastric.test.js — change it only deliberately.

import { typeMorphology } from './gastric_morphology.js?v=mtz2q7zn';
import { deriveTNM, stageLine } from '../src/staging/index.js?v=mtz2q7zn';
import * as S from '../src/staging/gastric.js?v=mtz2q7zn';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js?v=mtz2q7zn';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const stripDot = (s) => String(s || '').trim().replace(/[.;:\s]+$/, '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const isER = (v) => (v.procedure || '') === 'Endoscopic resection';
const listAnd = listJoin;
const na = (s) => !s || /^Not (applicable|specified)/.test(s);
const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|specified)|^Cannot/.test(s));
const specify = (s) => String(s || '').replace(/\s*\((specify)[^)]*\)\s*:?$/i, '').trim();

// The QMH tumour-extension strings end with a place-holder suffix; keep one copy here.
export const EXTENSION = {
  t1lp: 'Tumour invades the lamina propria',
  t1mm: 'Tumour invades the muscularis mucosae',
  t1b: 'Tumour invades the submucosa',
  t2: 'Tumour invades the muscularis propria',
  t3: 'Tumour penetrates the subserosal connective tissue without invasion of the visceral peritoneum or adjacent structures',
  t4a: 'Tumour invades the serosa (visceral peritoneum)',
  t4b: 'Tumour directly invades adjacent structures (specify)',
  cis: 'Carcinoma in situ: intraepithelial tumour without invasion of the lamina propria (high-grade dysplasia)',
  tx: 'Cannot be assessed',
  t0: 'No evidence of primary tumour'
};

// ---------- specimen ----------

export function procedureText(v) {
  if (/^(Other|Partial gastrectomy, other|Not specified)$/.test(v.procedure || '')) return stripDot(v.procedureOther) || (v.procedure === 'Not specified' ? 'Not specified' : v.procedure);
  return v.procedure || 'Not specified';
}

/** Lower-case head phrase from one "Antrum, lesser curvature" style option. */
export const sitePhrase = (s) => lc1(specify(s));

export function sitesText(v) {
  const sites = chosen(v.tumourSite).map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) : sitePhrase(s))).filter(Boolean);
  if (!sites.length) return '';
  return listJoin(sites);
}

/** Adjective-first head phrase per procedure option: "distal partial gastrectomy". */
export function procedurePhrase(v) {
  const p = specify(procedureText(v));
  const m = /^Partial gastrectomy, (proximal|distal)$/.exec(p);
  if (m) return `${m[1]} partial gastrectomy`;
  return p === 'Endoscopic resection' ? 'endoscopic resection' : p === 'Total gastrectomy' ? 'total gastrectomy' : p === 'Not specified' ? '' : lc1(p);
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const sites = sitesText(v);
  const proc = procedurePhrase(v);
  return `Stomach${sites ? `, ${sites}` : ''}${proc ? `, ${proc}` : ''}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part, ctx) { return deriveTNM(part.values, 'gastric'); }

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const proc = procedurePhrase(v) || 'stomach resection';
  const article = /^[aeiou]/.test(proc) ? 'an' : 'a';
  let s = isER(v)
    ? `(${part.label}) Received in formalin is ${article} endoscopic resection specimen of gastric mucosa`
    : `(${part.label}) Received in formalin is ${article} ${proc} specimen`;
  const dims = stripDot(v.specimenDims);
  if (dims) s += ` measuring ${dims} mm`;
  s += '.';
  const det = [];
  if (num(v.stomachLen) !== null) det.push(`the stomach measures ${fmt(num(v.stomachLen))} mm along the greater curvature`);
  if (num(v.duodenumLen) !== null) det.push(`a ${fmt(num(v.duodenumLen))} mm cuff of duodenum is attached`);
  if (num(v.weight) !== null) det.push(`the specimen weighs ${fmt(num(v.weight))} g`);
  if (stripDot(v.omentumDims)) det.push(`attached omentum measures ${stripDot(v.omentumDims)} mm`);
  if (det.length) s += ` ${uc1(listJoin(det))}.`;
  const size = num(v.tumourSizeMm);
  const gd = stripDot(v.grossDetails);
  s += ' There is a tumour';
  const sites = sitesText(v);
  if (sites) s += ` in the ${sites}`;
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

export function blockKey(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const lines = String(part.values.blockKeyText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    const m = l.match(/^\(?([\dA-Za-z]+(?:\s*[-–,]\s*[\dA-Za-z]+)*)\)?[\s.:)-]+(.*)$/);
    return m ? `(${lettered(part, ctx) ? part.label : ''}${m[1].replace(/\s+/g, '')}) ${stripDot(m[2])}.` : `${stripDot(l)}.`;
  }).join('\n');
}

// ---------- values shared by synoptic and diagnosis ----------

export const histTypeName = (v) => (v.histType === 'Other' ? (v.histTypeOther || '').trim() || 'Histologic type not specified' : v.histType || 'Histologic type not specified');
/** Short canonical name for the diagnosis line, without the WHO descriptor parentheses. */
export function shortTypeName(v) {
  const t = histTypeName(v);
  return specify(t).replace(/ \(poorly differentiated\)$/, '');
}
const isTis = (v) => (v.tumourExtension || '') === EXTENSION.cis;
const isPT0 = (v) => (v.tumourExtension || '') === EXTENSION.t0;
const gradeShort = (v) => (!v.grade || /^(GX|Not applicable|Other)$/.test(v.grade) ? (stripDot(v.gradeOther) || '') : v.grade.replace(/^G\d, /, ''));

/** An invasion clause for the derived histology sentence and the diagnosis. */
export function extensionPhrase(v) {
  const e = v.tumourExtension || '';
  if (e === EXTENSION.t1lp) return 'invading the lamina propria';
  if (e === EXTENSION.t1mm) return 'invading the muscularis mucosae';
  if (e === EXTENSION.t1b) return 'invading the submucosa';
  if (e === EXTENSION.t2) return 'invading the muscularis propria';
  if (e === EXTENSION.t3) return 'extending into the subserosal connective tissue, without invasion of the visceral peritoneum';
  if (e === EXTENSION.t4a) return 'invading the serosa (visceral peritoneum)';
  if (e === EXTENSION.t4b) {
    const d = stripDot(v.extensionDetail);
    return `directly invading ${d ? `the ${lc1(d)}` : 'adjacent structures'}`;
  }
  return '';
}

function laurenClause(v) {
  if (!v.lauren || /^Not applicable/.test(v.lauren)) return '';
  return v.lauren === 'Mixed (approximately equal intestinal and diffuse)' ? 'mixed intestinal and diffuse type (Lauren)' : `${lc1(v.lauren)} (Lauren)`;
}

/** Derived "- Tumour histology:" paragraph; the typed notes win when entered. */
export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return stripDot(v.histologyNotes) + '.';
  const g = gradeShort(v);
  const bits = [[g, lc1(shortTypeName(v))].filter(Boolean).join(' '), laurenClause(v)].filter(Boolean);
  let s = `The tumour is a ${bits.join(', ')}`;
  const ext = extensionPhrase(v);
  if (ext) s += `, ${ext}`;
  s += '.';
  if (!isTis(v) && !isPT0(v)) {
    const typeName = v.histType === 'Other' ? '' : v.histType || '';
    const morph = typeMorphology(typeName, v.grade || '');
    if (morph) s += ` ${morph.replace(/\.$/, '')}.`;
  }
  return s;
}

function treatmentText(v) {
  const te = v.treatmentEffect || 'No known presurgical therapy';
  if (/^No known/.test(te)) return 'No known presurgical therapy';
  return te;
}

/** Value minus the placeholder parentheses, with any typed distance appended: "Uninvolved by invasive carcinoma, 52 mm". */
export function resMarginText(vv, mmVal) {
  const s = (vv || '').trim();
  if (!s || /^Not applicable/.test(s)) return '';
  const mm = num(mmVal);
  if (/specify distance|specify location/.test(s)) {
    const base = s.replace(/\s*\((specify[^)]*)\)\s*/, '');
    return mm !== null ? `${base}, ${fmt(mm)} mm` : base;
  }
  return s;
}

// ---------- synoptic ----------

export function nodesItem(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return { label: 'Regional lymph nodes', value: ex === 0 ? 'None submitted (0 examined)' : 'Not recorded' };
  const inv = int(v.nodesInvolved);
  const sub = [
    { label: 'Number examined', value: String(ex) },
    { label: 'Number involved', value: inv === null ? 'Not recorded' : String(inv) }
  ];
  const ene = v.ene;
  if (inv && inv > 0) sub.push({ label: 'Extranodal extension', value: !ene || /^Not applicable/.test(ene) ? 'Not identified' : ene });
  const dep = num(v.largestDepositMm);
  if (inv && inv > 0 && dep !== null) sub.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm${stripDot(v.largestNodeSite) ? `, ${stripDot(v.largestNodeSite)}` : ''}` });
  const node = num(v.largestNodeMm);
  if (inv && inv > 0 && node !== null) sub.push({ label: 'Size of largest lymph node involved', value: `${fmt(node)} mm` });
  return { label: 'Regional lymph nodes', value: inv === null ? `${ex} examined; involved not recorded` : `${ex} examined; ${inv} involved`, sub };
}

export function metastasisValue(v) {
  const sites = chosen(v.distantMets).map((s) => (s === 'Other' ? stripDot(v.distantDetail) || 'Other' : s));
  const d = stripDot(v.distantDetail);
  if (!sites.length) return arr(v.distantMets).some((s) => /^Cannot/.test(s)) ? `Cannot be determined${d ? ` (${d})` : ''}` : arr(v.distantMets).includes('Not identified') ? 'Not identified' : 'Not applicable';
  return `${listJoin(sites)}${d && !sites.some((s) => s === 'Other') ? ` (${d})` : ''}`;
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const size = num(v.tumourSizeMm);
  const sites = chosen(v.tumourSite);
  const isCisOrNone = isTis(v) || isPT0(v);
  const sizeText = isPT0(v)
    ? 'Not applicable (no residual tumour)'
    : size !== null
      ? `${stripDot(v.tumourDims) ? `${stripDot(v.tumourDims)} mm (greatest dimension ` : ''}${fmt(size)} mm${stripDot(v.tumourDims) ? ')' : ' in greatest dimension'}`
      : stripDot(v.sizeCannot) ? `Cannot be determined (${lc1(stripDot(v.sizeCannot))})` : 'Cannot be determined';
  const extVal = (() => {
    const e = v.tumourExtension || '';
    if (!e) return '';
    if (e === EXTENSION.t4b) return stripDot(v.extensionDetail) ? `Tumour directly invades adjacent structures (${stripDot(v.extensionDetail)})` : e;
    return e;
  })();
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Tumour site', arr(v.tumourSite).includes('Other (specify)')
        ? listJoin(chosen(v.tumourSite).map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) || 'Other' : s)))
        : sites.length ? listJoin(arr(v.tumourSite)) : (arr(v.tumourSite).includes('Not specified') ? 'Not specified' : '')),
      item('Tumour size', sizeText)
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      v.lauren && !/^Not applicable/.test(v.lauren) ? item('Histologic type (Lauren)', v.lauren) : null,
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', stripDot(v.grade) || stripDot(v.gradeOther) || null) : null,
      stripDot(v.jcgcGrade) && v.jcgcGrade !== 'Not assessed' ? item('Histologic grade (JCGC 15e)', v.jcgcGrade) : null,
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Tumour extension', extVal),
      v.smDepth && v.smDepth !== 'Not assessed' ? item('Depth of submucosal invasion', v.smDepth === 'Exact' && num(v.smDepthExact) !== null ? `${fmt(num(v.smDepthExact))} mm` : v.smDepth) : null,
      v.smExtent && v.smExtent !== 'Not assessed' ? item('Extent of submucosal invasion', v.smExtent) : null,
      v.ulceration && v.ulceration !== 'Not assessed' ? item('Ulceration (UL)', v.ulceration) : null,
      item('Lymphatic invasion (Ly)', v.ly || 'Not identified'),
      item('Venous invasion (V)', v.v || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Treatment effect', treatmentText(v))
    ] },
    isER(v)
      ? { heading: 'Margins', items: [
          item('Mucosal (horizontal) margins (HM)', `${resMarginText(v.hmMargin) }${stripDot(v.hmMarginDetail) ? ` (${stripDot(v.hmMarginDetail)})` : ''}`),
          item('Deep (vertical) margin (VM)', resMarginText(v.vmMargin, v.vmMarginMm)),
          v.otherMargin && !/^Not applicable/.test(v.otherMargin) ? item('Other margins', `${resMarginText(v.otherMargin)}${stripDot(v.otherMarginDetail) ? ` (${stripDot(v.otherMarginDetail)})` : ''}`) : null
        ] }
      : { heading: 'Margins', items: [
          item('Proximal margin', resMarginText(v.proximalMargin, v.proximalMarginMm)),
          item('Distal margin', resMarginText(v.distalMargin, v.distalMarginMm)),
          v.omentalMargin && !/^Not applicable/.test(v.omentalMargin) ? item('Omental margin', resMarginText(v.omentalMargin, v.omentalMarginMm)) : null,
          v.otherMargin && !/^Not applicable/.test(v.otherMargin) ? item('Other margins', `${resMarginText(v.otherMargin)}${stripDot(v.otherMarginDetail) ? ` (${stripDot(v.otherMarginDetail)})` : ''}`) : null
        ] },
    { heading: 'Lymph nodes', items: [nodesItem(v)] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm,
        sub: stageLine(st) ? [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] : [] }
    ] } : null,
    isER(v) ? { heading: 'Endoscopic curability (eCura C)', items: (() => {
      const e = S.ecura(v);
      const note = e.undetermined.length ? `; not determined for ${listJoin(e.undetermined)}` : '';
      return [item('eCura score', `${e.score} of 7 - ${e.band}${note}`)];
    })() } : null,
    { heading: 'Additional findings', items: (() => {
      const f = chosen(v.additionalFindings)
        .map((s) => (s === 'Other (specify)' ? stripDot(v.additionalFindingsDetail) : s === 'Other polyps' && stripDot(v.additionalFindingsDetail) ? `Other polyps (${stripDot(v.additionalFindingsDetail)})` : s))
        .filter(Boolean);
      return [
        ...(f.length ? f.map((t) => ({ text: t })) : []),
        stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null,
        !f.length && !stripDot(v.additionalNotes) ? { text: 'None identified' } : null
      ];
    })() }
  ].filter(Boolean);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };

/** "4 of 24 regional lymph nodes involved"; '' when none submitted. */
export function nodesPhrase(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return '';
  const inv = int(v.nodesInvolved) ?? 0;
  return `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
}

const marginsPhrase = (v) => {
  const named = isER(v)
    ? [
      { name: 'mucosal (horizontal) margins', value: v.hmMargin, suffix: stripDot(v.hmMarginDetail) },
      { name: 'deep (vertical) margin', value: v.vmMargin, mm: num(v.vmMarginMm) }
    ]
    : [
      { name: 'proximal margin', value: v.proximalMargin, mm: num(v.proximalMarginMm) },
      { name: 'distal margin', value: v.distalMargin, mm: num(v.distalMarginMm) },
      { name: 'omental margin', value: v.omentalMargin, mm: num(v.omentalMarginMm) }
    ];
  const involved = named.filter((m) => /^Involved/.test(m.value || '')).map((m) => m.name.replace(/s$/, '').replace('mucosal (horizontal) margin', 'mucosal margin'));
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
    const type = [upperHead(shortTypeName(v)), g, laurenClause(v)].filter(Boolean).join(', ');
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
  if (!/^No known/.test(v.treatmentEffect || 'No known presurgical therapy')) first.push(`treatment effect: ${lc1(v.treatmentEffect.replace(/\s*\(not otherwise specified\)/, ''))}`);
  const mp = marginsPhrase(v);
  if (mp) first.push(mp);
  const clauses = [`${first.join('; ')}; see synoptic report`];
  const np = nodesPhrase(v);
  if (np) clauses.push(np + (v.ene === 'Present' ? '; extranodal extension present' : ''));

  const mets = chosen(v.distantMets).map((s) => lc1(s === 'Other' ? stripDot(v.distantDetail) || 'other' : specify(s)));
  if (mets.length) clauses.push(`distant metastasis: ${listJoin(mets)}`);
  if (ctx?.options?.printPTNM) {
    const st = staging(part, ctx);
    let s = `${st.tnm} (${st.edition})`;
    if (st.stage) s += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
    clauses.push(s);
  }
  if (isER(v)) {
    const e = S.ecura(v);
    clauses.push(`eCura score ${e.score} of 7: ${e.band}`);
  }
  return renderDiagnosis(head, clauses);
}

// ---------- validation ----------

export function validate(part, ctx) {
  const v = part.values;
  const out = [];
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  const cr = isPT0(v);
  if (!cr && num(v.tumourSizeMm) === null && !stripDot(v.sizeCannot) && !isTis(v)) warn('Tumour size is not recorded.');
  if (!v.histType) err('Histologic type is required.');
  if (!v.tumourExtension) err('Tumour extension is required to assign pT.');
  if ((v.tumourExtension || '') === EXTENSION.t4b && !stripDot(v.extensionDetail)) warn('Tumour directly invades adjacent structures: specify the structures.');
  const ex = int(v.nodesExamined); const pos = int(v.nodesInvolved);
  if (ex === null) err('Number of regional lymph nodes examined is required (enter 0 if none submitted).');
  else if (ex > 0 && pos === null) err('Number of involved lymph nodes is required (enter 0 if none).');
  if (ex !== null && pos !== null && pos > ex) err('Involved nodes exceed the number examined.');
  if (!isER(v) && ex !== null && ex > 0 && ex < 16) warn('Fewer than 16 regional lymph nodes examined; AJCC 8th edition recommends at least 16 for reliable nodal staging.');
  if (pos && pos > 0 && (!v.ene || /^Not applicable/.test(v.ene))) warn('Extranodal extension is not recorded for a node-positive case.');
  if (!cr && !isER(v)) {
    if (!v.proximalMargin) err('Proximal margin status is required.');
    if (!v.distalMargin) err('Distal margin status is required.');
    if (/^Uninvolved/.test(v.proximalMargin || '') && /distance/i.test(v.proximalMargin) && num(v.proximalMarginMm) === null) warn('Proximal margin uninvolved: record the distance.');
    if (/^Uninvolved/.test(v.distalMargin || '') && /distance/i.test(v.distalMargin) && num(v.distalMarginMm) === null) warn('Distal margin uninvolved: record the distance.');
  }
  if (isER(v) && !v.hmMargin) err('Mucosal (horizontal) margin status is required.');
  if (isER(v) && !v.vmMargin) err('Deep (vertical) margin status is required.');
  if (isTis(v) && pos && pos > 0) warn('Carcinoma in situ does not metastasise; review the nodal count.');
  if (/^Present, with no viable/.test(v.treatmentEffect || '') && !isPT0(v)) warn('Complete pathological response (score 0) recorded but Tumour extension is not "No evidence of primary tumour".');
  if (isER(v)) {
    const e = S.ecura(v);
    if (e.score <= 2 && !e.undetermined.length && !isPT0(v)) warn(`eCura low-risk stratum (${e.score} points, about 2.5 % lymph-node metastasis risk): endoscopic follow-up is acceptable if margins are clear.`);
    if (e.score >= 5) warn(`eCura high-risk stratum (${e.score} points): discuss additional gastrectomy with lymph-node dissection (JCGC 7th edition).`);
    if (e.undetermined.length) warn(`eCura elements not determined: ${listAnd(e.undetermined)}.`);
  }
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
