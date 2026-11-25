// Radical prostatectomy — synoptic report (QMH UG-Prostate, CAP Prostate Radical Prostatectomy
// 4.3.0.0, WHO 5th edition 2022, AJCC 8th edition Chapter 58).
//
// Sources:
//   QMH Cancer Reporting Template UG-Prostate:
//     https://awiloqmh.github.io/CancerReportingTemplate/UG-Prostate.html
//     (saved as docs/reference/UG-Prostate.html)
//   CAP Protocol for the Examination of Radical Prostatectomy Specimens, v4.3.0.0 (Sept 2023)
//   WHO Classification of Urinary and Male Genital Tumours, 5th edition (2022)
//   Staging: src/staging/prostate.js (AJCC 8th edition, Chapter 58).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/prostate.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

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
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- specimen & procedure ----------

function procedureValue(v) {
  const p = v.procedure || '';
  if (!p) return 'Not specified';
  if (p === 'Other (specify)') return uc1(stripDot(v.procedureOther)) || 'Other';
  return p;
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  const p = v.procedure || 'Radical prostatectomy';
  if (p === 'Radical prostatectomy') return 'Prostate and seminal vesicles, radical prostatectomy';
  if (p === 'Radical cystoprostatectomy') return 'Prostate and seminal vesicles, radical cystoprostatectomy';
  return `Prostate, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'prostate'); }

// ---------- macro ----------

function sizeText(raw, defaultUnit = 'cm') {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ` ${defaultUnit}`;
  return s;
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const proc = lc1(procedureValue(v));
  const w = num(v.weight);
  const dims = sizeText(v.specimenDims, 'cm');
  const measures = [];
  if (w !== null) measures.push(`weighing ${fmt(w)} g`);
  if (dims) measures.push(`measuring ${dims}`);
  const bits = [`${tag}Received in formalin is a ${proc} specimen${measures.length ? ` ${listJoin(measures)}` : ''}.`];

  const sv = stripDot(v.seminalVesiclesDims);
  if (sv) bits.push(`Attached seminal vesicles and vasa deferentia: ${lc1(sv)}.`);
  if (v.inked === 'Yes') bits.push('The outer surface is differentially inked (right and left sides) and the prostate is serially sectioned from apex to base.');

  const dom = num(v.dominantNoduleMm);
  const domLoc = stripDot(v.dominantNoduleSite);
  if (dom !== null) {
    bits.push(`Sectioning shows a dominant tumour nodule${domLoc ? ` in the ${lc1(domLoc)}` : ''} measuring ${fmt(dom)} mm.`);
  }

  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

// ---------- histologic type & Gleason ----------

const SPECIFY_RE = /\s*\(specify\)$/;

export function histTypeName(v) {
  const t = v.histType || '';
  if (!t) return 'Histologic type not specified';
  const extra = stripDot(v.histTypeOther);
  if (SPECIFY_RE.test(t)) {
    const base = t.replace(SPECIFY_RE, '');
    return extra ? `${base} (${extra})` : base;
  }
  if (t === 'Carcinoma, type cannot be determined' && extra) return `${t} (${lc1(extra)})`;
  return t;
}

const NON_GRADABLE = new Set([
  'Small cell neuroendocrine carcinoma',
  'Large cell neuroendocrine carcinoma',
  'Well-differentiated neuroendocrine tumour',
  'Squamous cell carcinoma',
  'Adenosquamous carcinoma',
  'Basal cell (adenoid cystic) carcinoma',
  'Intraductal carcinoma'
]);
const isGradable = (v) => !NON_GRADABLE.has(v.histType || '') && !/effect(?:s)? present/i.test(v.treatmentEffect || '');

export function gleasonSummary(v) {
  if (!isGradable(v) && (v.primary === 'Not applicable' || !v.primary)) return 'Not applicable';
  if (v.primary === 'Cannot be determined' || v.secondary === 'Cannot be determined') return 'Cannot be assessed';
  const g = S.gleasonInfo(v);
  if (!g) return '';
  let s = `Grade Group ${g.group} (Gleason score ${g.primary} + ${g.secondary} = ${g.score})`;
  if (g.tertiary !== null && g.tertiary > Math.max(g.primary, g.secondary)) {
    s += ` with minor (tertiary) pattern ${g.tertiary}`;
  }
  return s;
}

const TYPE_MORPH = {
  'Acinar adenocarcinoma, conventional (usual)': 'Infiltrating malignant prostatic acini lined by cells with enlarged nuclei, prominent nucleoli and amphophilic cytoplasm lack a basal cell layer.',
  'Ductal adenocarcinoma': 'Large papillary and cribriform glands are lined by tall, pseudostratified columnar cells with elongated, hyperchromatic nuclei and prominent nucleoli.',
  'Acinar adenocarcinoma, signet-ring-like cell': 'Malignant cells with prominent intracytoplasmic vacuoles displacing the nucleus peripherally infiltrate the prostatic stroma.',
  'Acinar adenocarcinoma, pleomorphic giant cell': 'Infiltrating prostatic adenocarcinoma includes a component of markedly pleomorphic, bizarre giant tumour cells.',
  'Acinar adenocarcinoma, sarcomatoid': 'Biphasic malignant proliferation combines prostatic adenocarcinoma with a malignant spindle cell / sarcomatoid component.',
  'Acinar adenocarcinoma, prostatic intraepithelial neoplasia-like': 'Crowded, variably sized glands lined by pseudostratified columnar cells resemble high-grade PIN but lack a basal cell layer.',
  'Small cell neuroendocrine carcinoma': 'Sheets and nests of small hyperchromatic tumour cells with scant cytoplasm, nuclear moulding, frequent mitoses and necrosis are present.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = lc1(histTypeName(v));
  const gs = gleasonSummary(v);
  let s = `Sections of the prostate show ${what}${gs && !/^Not applicable|Cannot be assessed/.test(gs) ? `, ${gs}` : ''}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

// ---------- locations & margins ----------

function locationList(selected, other) {
  const xs = arr(selected).map((x) => lc1(x));
  const extra = stripDot(other);
  if (extra) xs.push(lc1(extra));
  return xs.length ? listJoin(xs) : '';
}

function epeValue(v) {
  const e = v.epe || 'Not identified';
  if (!/^Present\b/.test(e)) return e;
  const loc = locationList(v.epeLocations, v.epeOther);
  return loc ? `${e} (${loc})` : e;
}

function marginValue(v) {
  const st = v.marginStatus || 'Uninvolved by invasive carcinoma';
  if (!/^Involved\b/.test(st)) return st;
  const bits = [];
  const mm = num(v.marginLinearMm);
  if (mm !== null) bits.push(`linear extent ${fmt(mm)} mm`);
  if (v.marginFocality) bits.push(lc1(v.marginFocality));
  const loc = locationList(v.marginLocations, v.marginOther);
  if (loc) bits.push(loc);
  return bits.length ? `${st} (${bits.join('; ')})` : st;
}

function quantitationItem(v) {
  const pct = num(v.pctProstate);
  const dom = num(v.dominantNoduleMm);
  const dims = stripDot(v.dominantNoduleDims);
  const loc = stripDot(v.dominantNoduleSite);
  const sub = [];
  if (pct !== null) sub.push({ label: 'Estimated percentage of prostate involved', value: `${fmt(pct)}%` });
  if (dom !== null) {
    const extra = [dims ? `all dimensions ${dims} mm` : '', loc ? lc1(loc) : ''].filter(Boolean).join(', ');
    sub.push({ label: 'Dominant tumour nodule', value: `${fmt(dom)} mm${extra ? ` (${extra})` : ''}` });
  }
  if (!sub.length) return null;
  return { label: 'Tumour quantitation', value: sub[0].value, sub: sub.slice(1) };
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const site = stripDot(v.nodeSites);
  const items = [
    { label: 'Regional lymph nodes', value: `${inv} of ${ex} involved${site ? ` (${site})` : ''}` }
  ];
  if (inv > 0) {
    if (v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
    const dep = num(v.largestDepositMm);
    if (dep !== null) items.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm` });
    const ln = num(v.largestNodeMm);
    if (ln !== null) items.push({ label: 'Size of largest involved lymph node', value: `${fmt(ln)} mm` });
  }
  return items;
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) {
    const detail = stripDot(v.distantMetsOther);
    const list = listJoin(sites.map((s) => (s === S.METS.other ? detail || 'other site' : s)).map((s, i) => (i ? lc1(s) : s)));
    return detail && !sites.includes(S.METS.other) ? `${list} (${detail})` : list;
  }
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

function additionalFindingsValue(v) {
  const xs = arr(v.additionalFindings).map((x) => {
    if (x === 'Inflammation' && stripDot(v.inflammationType)) return `Inflammation (${lc1(stripDot(v.inflammationType))})`;
    return x;
  });
  const other = stripDot(v.additionalOther);
  if (other) xs.push(uc1(other));
  return xs.length ? xs.join('; ') : 'None identified';
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const g = S.gleasonInfo(v);
  const p4 = num(v.pctPattern4);
  const p5 = num(v.pctPattern5);
  const w = num(v.weight);
  const dims = sizeText(v.specimenDims, 'cm');

  const gradeSub = [];
  if (g) {
    gradeSub.push({ label: 'Primary Gleason pattern', value: `Pattern ${g.primary}` });
    gradeSub.push({ label: 'Secondary Gleason pattern', value: `Pattern ${g.secondary}` });
    if (g.tertiary !== null) gradeSub.push({ label: 'Minor (tertiary) Gleason pattern', value: `Pattern ${g.tertiary}` });
    if (p4 !== null) gradeSub.push({ label: 'Percentage of pattern 4', value: `${fmt(p4)}%` });
    if (p5 !== null) gradeSub.push({ label: 'Percentage of pattern 5', value: `${fmt(p5)}%` });
  }

  const marginSub = [];
  if (/^Involved\b/.test(v.marginStatus || '')) {
    if (v.marginEpe) marginSub.push({ label: 'Margin positivity in area of EPE', value: v.marginEpe });
    if (v.marginGleason) marginSub.push({ label: 'Gleason pattern at positive margin(s)', value: v.marginGleason });
  }

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      w !== null ? item('Prostate weight', `${fmt(w)} g`) : null,
      dims ? item('Prostate dimensions', dims) : null,
      quantitationItem(v)
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      gleasonSummary(v) ? { label: 'Histologic grade', value: gleasonSummary(v), sub: gradeSub } : null,
      item('Intraductal carcinoma (IDC-P)', v.idcp || 'Not identified'),
      v.cribriform && v.cribriform !== 'Not applicable' ? item('Cribriform glands', v.cribriform) : null,
      item('Extraprostatic extension (EPE)', epeValue(v)),
      item('Urinary bladder neck invasion', v.bladderNeck || 'Not identified'),
      item('Seminal vesicle invasion', v.svi || 'Not identified'),
      v.adjacentInvasion === 'Present' ? item('Adjacent organ invasion (pT4)', stripDot(v.adjacentDetail) ? `Present (${lc1(stripDot(v.adjacentDetail))})` : 'Present') : null,
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Treatment effect', v.treatmentEffect === 'Other therapy effect(s) present (specify)' && stripDot(v.treatmentOther) ? `Other therapy effect(s) present (${lc1(stripDot(v.treatmentOther))})` : (v.treatmentEffect || 'No known presurgical therapy')),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: [
      { label: 'Surgical margins', value: marginValue(v), sub: marginSub }
    ] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      item('Additional pathologic findings', additionalFindingsValue(v)),
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- molecular findings ----------

export function molecular(part) {
  const v = part.values;
  const items = [];
  if (v.mmr && v.mmr !== 'Not performed') items.push({ label: 'Mismatch repair (MMR) IHC', value: v.mmr });
  if (stripDot(v.molecularOther)) items.push({ label: 'Other molecular / biomarker studies', value: uc1(stripDot(v.molecularOther)) });
  if (!items.length) return '';
  return renderSynoptic([{ heading: 'Molecular studies', items }], '');
}

// ---------- diagnosis ----------

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const typeUpper = histTypeName(v).replace(/, conventional \(usual\)$/, '').toUpperCase();
  const gs = gleasonSummary(v);
  const firstBits = [typeUpper];
  if (gs && !/^Not applicable|Cannot be assessed/.test(gs)) firstBits.push(gs);
  const clauses = [firstBits.join(', ')];

  const extBits = [];
  if (/^Present\b/.test(v.epe || '')) extBits.push(`extraprostatic extension (${lc1(v.epe).replace(/^present,\s*/, '')})`);
  if (v.bladderNeck === 'Present') extBits.push('microscopic urinary bladder neck invasion');
  if (/^Present\b/.test(v.svi || '')) extBits.push(`seminal vesicle invasion (${lc1(v.svi).replace(/^present,\s*/, '')})`);
  if (v.adjacentInvasion === 'Present') extBits.push(`invasion of adjacent structures${stripDot(v.adjacentDetail) ? ` (${lc1(stripDot(v.adjacentDetail))})` : ''}`);
  if (extBits.length) clauses.push(uc1(listJoin(extBits)));
  else clauses.push('Organ confined (no extraprostatic extension or seminal vesicle invasion)');

  if (/^Involved\b/.test(v.marginStatus || '')) {
    const loc = locationList(v.marginLocations, v.marginOther);
    const mm = num(v.marginLinearMm);
    const detail = [mm !== null ? `${fmt(mm)} mm` : '', loc].filter(Boolean).join(', ');
    clauses.push(`Surgical margin involved by carcinoma${detail ? ` (${detail})` : ''}`);
  } else if (v.marginStatus === 'Cannot be assessed') {
    clauses.push('Surgical margins cannot be assessed');
  } else {
    clauses.push('Surgical margins clear');
  }

  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) {
    let np = `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
    if (inv > 0 && v.ene === 'Present') np += '; extranodal extension present';
    clauses.push(np);
  }

  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) {
    clauses.push(`${st.tnm} (${st.edition})`);
  }

  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);

  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');

  // Gleason arithmetic & CAP 4.3.0.0 checks:
  const g = S.gleasonInfo(v);
  if (isGradable(v) && !g) {
    warn('Primary and secondary Gleason patterns are required for prostatic adenocarcinoma.', 'primary');
  }
  if (g) {
    if (g.tertiary !== null && (g.tertiary === g.primary || g.tertiary === g.secondary)) {
      warn(`Minor (tertiary) pattern ${g.tertiary} duplicates the primary or secondary pattern.`, 'tertiary');
    }
    if (g.tertiary !== null && g.tertiary < Math.max(g.primary, g.secondary)) {
      warn(`Minor (tertiary) pattern (${g.tertiary}) should only be recorded when higher than both primary (${g.primary}) and secondary (${g.secondary}) patterns.`, 'tertiary');
    }
    if (g.score === 7 && num(v.pctPattern4) === null) {
      info('Gleason score 7: CAP 4.3.0.0 requires reporting percentage of Gleason pattern 4.', 'pctPattern4');
    }
    if ((g.score === 7 || g.score === 8) && (!v.cribriform || v.cribriform === 'Not applicable')) {
      info('Gleason score 7 or 8: record whether cribriform glands are present or not identified.', 'cribriform');
    }
    const p4 = num(v.pctPattern4);
    if (g.primary === 3 && g.secondary === 4 && p4 !== null && p4 > 50) {
      warn(`Primary pattern is 3 with secondary 4, but percentage of pattern 4 is ${fmt(p4)}% (> 50% implies 4+3=7, Grade Group 3).`, 'pctPattern4');
    }
    if (g.primary === 4 && g.secondary === 3 && p4 !== null && p4 <= 50) {
      warn(`Primary pattern is 4 with secondary 3, but percentage of pattern 4 is ${fmt(p4)}% (<= 50% implies 3+4=7, Grade Group 2).`, 'pctPattern4');
    }
  }

  // Margin checks:
  if (/^Involved\b/.test(v.marginStatus || '')) {
    if (!arr(v.marginLocations).length && !stripDot(v.marginOther)) {
      warn('Positive surgical margin: specify at least one location.', 'marginLocations');
    }
    if (!v.marginGleason && isGradable(v)) {
      info('Positive surgical margin: record Gleason pattern at the positive margin(s) (CAP 4.3.0.0).', 'marginGleason');
    }
    if (v.marginEpe === 'Present' && v.epe === 'Not identified') {
      warn('Margin positivity in area of EPE is Present, but Extraprostatic extension is recorded as Not identified.', 'epe');
    }
  }

  // Nodes:
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) {
    err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  }
  if (inv !== null && inv > 0 && !v.ene) {
    info('Positive lymph nodes recorded: extranodal extension (ENE) not recorded.', 'ene');
  }

  // Staging notes & reference lines:
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');

  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, diagnosis, validate, staging };
