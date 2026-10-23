// Pituitary neuroendocrine tumour (PitNET) resection - synoptic report.
//
// Element order follows the QMH Endocrine-PitNET template
// (https://awiloqmh.github.io/CancerReportingTemplate/Endocrine-PitNET.html, saved as
// docs/reference/Endocrine-PitNET.html), itself built on the CAP Pituitary Neuroendocrine Tumor
// protocol 1.0.0.0 (March 2025,
// https://www.cap.org/wp-content/uploads/2026/07/Pituitary.NET_1.0.0.0.REL_.CAPCP_.pdf?download).
// Tumour types and subtypes are the WHO 2022 lineage-based ones (Asa, Mete, Perry, Osamura,
// Endocr Pathol 2022;33:6-26, https://link.springer.com/article/10.1007/s12022-022-09703-7).
//
// Departures from the QMH order, by house preference (microscopy and immunohistochemistry in one
// paragraph): the tumour histology paragraph follows the tumour type and carries the morphology,
// the reticulin and PAS stains and the immunohistochemistry, so the QMH "Histochemical stains" and
// "Immunohistochemical studies" elements print inside it rather than as separate items. Ki-67 and
// the mitotic count follow it. There is no grade: PitNETs carry no CNS WHO grade and no AJCC stage.
//
// CAP points kept as checks rather than printed text: TPIT, PIT1 and SF1 are required; keratin is
// required for PIT1-lineage, TPIT-lineage and null cell tumours; Crooke's hyaline change of the
// non-tumorous corticotrophs is required for corticotroph tumours; a sparsely granulated
// somatotroph tumour shows keratin fibrous bodies in more than 70% of tumour cells.

import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
// Lower-case the first letter unless the word is an acronym ("PIT1 and SF1", "ACTH") or an eponym.
const lc1 = (s) => (s && !/^(?:[A-Z][A-Z0-9]|Crooke|Rathke)/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s || '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length < 2) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const item = (label, value) => (value ? { label, value } : null);

// ---------- tumour types ----------

export const TPIT_TYPES = ['Densely granulated corticotroph tumour', 'Sparsely granulated corticotroph tumour', 'Crooke cell tumour'];
export const PIT1_TYPES = [
  'Somatotroph tumour, densely granulated', 'Somatotroph tumour, sparsely granulated',
  'Lactotroph tumour, densely granulated', 'Lactotroph tumour, sparsely granulated',
  'Thyrotroph tumour', 'Mammosomatotroph tumour', 'Mature PIT1-lineage plurihormonal tumour',
  'Immature PIT1-lineage tumour', 'Acidophil stem cell tumour', 'Mixed somatotroph and lactotroph tumour'
];
export const SF1_TYPES = ['Gonadotroph tumour'];
const NULL_CELL = 'Null cell tumour';
const MULTILINEAGE = 'Unusual plurihormonal (multilineage) tumour';
const NOS = 'Pituitary neuroendocrine tumour, NOS';
const OTHER = 'Other (specify)';
const TFS = ['TPIT', 'PIT1', 'SF1'];

/** 'TPIT' | 'PIT1' | 'SF1' for a single-lineage type, else ''. */
export function lineageOf(type) {
  if (TPIT_TYPES.includes(type)) return 'TPIT';
  if (PIT1_TYPES.includes(type)) return 'PIT1';
  if (SF1_TYPES.includes(type)) return 'SF1';
  return '';
}

const typeOf = (v) => v.tumourType || 'Gonadotroph tumour';
const detailOf = (v) => stripDot(v.typeDetail);

/** Synoptic "Tumour type and subtype": "SF1-lineage pituitary neuroendocrine tumour, gonadotroph tumour". */
export function typeLine(v) {
  const t = typeOf(v);
  const d = detailOf(v);
  const lin = lineageOf(t);
  if (t === NOS) return 'Pituitary neuroendocrine tumour, NOS';
  if (t === OTHER) return `Pituitary neuroendocrine tumour, ${d ? lc1(d) : 'other'}`;
  const sub = `${lc1(t)}${d ? ` (${d})` : ''}`;
  if (lin) return `${lin}-lineage pituitary neuroendocrine tumour, ${sub}`;
  return `Pituitary neuroendocrine tumour of no distinct cell lineage, ${sub}`;
}

const DX_NAME = {
  'Densely granulated corticotroph tumour': 'DENSELY GRANULATED CORTICOTROPH',
  'Sparsely granulated corticotroph tumour': 'SPARSELY GRANULATED CORTICOTROPH',
  'Crooke cell tumour': 'CROOKE CELL',
  'Somatotroph tumour, densely granulated': 'DENSELY GRANULATED SOMATOTROPH',
  'Somatotroph tumour, sparsely granulated': 'SPARSELY GRANULATED SOMATOTROPH',
  'Lactotroph tumour, densely granulated': 'DENSELY GRANULATED LACTOTROPH',
  'Lactotroph tumour, sparsely granulated': 'SPARSELY GRANULATED LACTOTROPH',
  'Thyrotroph tumour': 'THYROTROPH',
  'Mammosomatotroph tumour': 'MAMMOSOMATOTROPH',
  'Mature PIT1-lineage plurihormonal tumour': 'MATURE PLURIHORMONAL PIT1-LINEAGE',
  'Immature PIT1-lineage tumour': 'IMMATURE PIT1-LINEAGE',
  'Acidophil stem cell tumour': 'ACIDOPHIL STEM CELL',
  'Mixed somatotroph and lactotroph tumour': 'MIXED SOMATOTROPH AND LACTOTROPH',
  'Gonadotroph tumour': 'GONADOTROPH',
  'Null cell tumour': 'NULL CELL',
  'Unusual plurihormonal (multilineage) tumour': 'PLURIHORMONAL (MULTILINEAGE)'
};

/** Diagnosis clause: "GONADOTROPH PITUITARY NEUROENDOCRINE TUMOUR (PitNET), SF1-lineage". */
export function dxClause(v) {
  const t = typeOf(v);
  const d = detailOf(v);
  if (t === NOS) return 'PITUITARY NEUROENDOCRINE TUMOUR (PitNET), NOS';
  if (t === OTHER) return `PITUITARY NEUROENDOCRINE TUMOUR (PitNET)${d ? `, ${lc1(d)}` : ''}`;
  const name = `${DX_NAME[t] || ''} PITUITARY NEUROENDOCRINE TUMOUR (PitNET)`.trim();
  const lin = lineageOf(t);
  // The name already carries the lineage for the two PIT1-lineage plurihormonal types.
  if (lin && !/PIT1-LINEAGE/.test(name)) return `${name}, ${lin}-lineage`;
  if (t === MULTILINEAGE && d) return `${name}, ${lc1(d)}`;
  return name;
}

// ---------- specimen, macro, block key ----------

const PROCEDURE = {
  'Transsphenoidal resection': { synoptic: 'Transsphenoidal pituitary tumour resection', noun: 'transsphenoidal excision' },
  'Transcranial resection': { synoptic: 'Transcranial pituitary tumour resection', noun: 'transcranial excision' }
};
const procedureNoun = (v) => (v.procedure === 'Other'
  ? (lc1(stripDot(v.procedureOther)) || 'excision')
  : (PROCEDURE[v.procedure] || PROCEDURE['Transsphenoidal resection']).noun);
const procedureSynoptic = (v) => (v.procedure === 'Other'
  ? (uc1(stripDot(v.procedureOther)) || 'Other')
  : (PROCEDURE[v.procedure] || PROCEDURE['Transsphenoidal resection']).synoptic);

export function specimenName(part) {
  const v = part.values;
  return stripDot(v.specimenName) || `Pituitary tumour, ${procedureNoun(v)}`;
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  let s = `(${part.label}) Received in formalin ${v.integrity === 'Intact' ? 'is an intact piece of soft tumour tissue' : 'are fragments of soft tumour tissue'}`;
  const dims = stripDot(v.specimenDims);
  if (dims) s += `, measuring ${dims} mm${v.integrity === 'Intact' ? '' : ' in aggregate'}`;
  s += '.';
  const gd = stripDot(v.grossDetails);
  if (gd) s += ` ${uc1(gd)}.`;
  s += v.sampling === 'Representative sections'
    ? ' Representative sections are taken; see block key.'
    : ' The specimen is entirely embedded; see block key.';
  return s;
}

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

// ---------- tumour histology paragraph ----------

const MARKER_PRINT = {
  Synaptophysin: 'synaptophysin', Chromogranin: 'chromogranin', 'Alpha-subunit': 'alpha-subunit',
  'Beta-TSH': 'beta-TSH', 'Beta-FSH': 'beta-FSH', 'Beta-LH': 'beta-LH'
};
const marker = (m) => MARKER_PRINT[m] || m;
const CYTOPLASM = { Hyaline: 'glassy hyaline' };
const KERATIN_PATTERN = {
  'Fibrous bodies in more than 70% of tumour cells': 'fibrous bodies in more than 70% of tumour cells',
  'Fibrous bodies in fewer than 70% of tumour cells': 'fibrous bodies in fewer than 70% of tumour cells',
  'Perinuclear cytoplasmic': 'a perinuclear cytoplasmic pattern',
  'Diffuse dense cytoplasmic': 'a diffuse dense cytoplasmic pattern',
  'Ring-like cytoplasmic': 'a ring-like cytoplasmic pattern',
  Membranous: 'a membranous pattern'
};
const keratinPositive = (v) => /^Positive/.test(v.keratin || '');

function morphologySentence(v) {
  const atypia = v.atypia && v.atypia !== 'None' ? lc1(v.atypia) : '';
  const arch = arr(v.architecture).map(lc1);
  const cyto = v.cytoplasm ? (CYTOPLASM[v.cytoplasm] || lc1(v.cytoplasm)) : '';
  let s = `Sections show a pituitary neuroendocrine tumour composed of ${atypia ? '' : 'monotonous '}cells`;
  if (arch.length) s += ` arranged in ${listJoin(arch)}`;
  const nuclei = `round to oval nuclei with finely granular chromatin${atypia ? ` and ${atypia} nuclear pleomorphism` : ''}`;
  s += cyto ? `, with ${cyto} cytoplasm and ${nuclei}.` : `, with ${nuclei}.`;
  return s;
}

function featuresSentence(v) {
  const f = arr(v.features);
  if (!f.length) return '';
  const verb = f.length > 1 || f[0] === 'Fibrous bodies' ? 'are' : 'is';
  return `${uc1(listJoin(f.map(lc1)))} ${verb} present.`;
}

function stainsSentences(v) {
  const s = [];
  if (v.reticulin === 'Disrupted') s.push('Reticulin shows loss of the normal acinar architecture.');
  else if (v.reticulin === 'Expanded acini') s.push('Reticulin shows expanded acini.');
  if (v.pas === 'Positive' || v.pas === 'Negative') s.push(`The tumour cells are PAS ${lc1(v.pas)}.`);
  return s.join(' ');
}

function ihcSentence(v) {
  const d = arr(v.ihcDiffuse).map(marker);
  const f = arr(v.ihcFocal).map(marker);
  const n = arr(v.ihcNegative).map(marker);
  const bits = [
    d.length ? `diffusely positive for ${listJoin(d)}` : '',
    f.length ? `focally positive for ${listJoin(f)}` : '',
    n.length ? `negative for ${listJoin(n)}` : ''
  ].filter(Boolean);
  if (!bits.length) return '';
  // A comma before the last "and" when the list before it has its own "and".
  const joined = bits.length === 3 ? `${bits[0]}, ${bits[1]}, and ${bits[2]}`
    : bits.length === 2 ? `${bits[0]}${/ and /.test(bits[0]) ? ',' : ''} and ${bits[1]}` : bits[0];
  return `On immunohistochemistry, the tumour cells are ${joined}.`;
}

function keratinSentence(v) {
  if (!v.keratin || v.keratin === 'Not performed') return '';
  const clone = stripDot(v.keratinClone);
  const name = `Low-molecular-weight keratin${clone ? ` (${clone})` : ''}`;
  if (v.keratin === 'Negative') return `${name} is negative.`;
  const extent = v.keratin === 'Positive, focal' ? 'focally positive' : 'diffusely positive';
  const pat = arr(v.keratinPattern).map((p) => KERATIN_PATTERN[p]).filter(Boolean);
  return `${name} is ${extent}${pat.length ? `, with ${listJoin(pat)}` : ''}.`;
}

function markerStatusSentence(v) {
  const clauses = [];
  const p27 = v.p27 === 'Retained' || v.p27 === 'Lost' ? v.p27 : '';
  const atrx = v.atrx === 'Retained' || v.atrx === 'Lost' ? v.atrx : '';
  if (p27 && atrx && p27 === atrx) clauses.push(`nuclear p27 and ATRX expression is ${lc1(p27)}`);
  else {
    if (p27) clauses.push(`nuclear p27 expression is ${lc1(p27)}`);
    if (atrx) clauses.push(`${p27 ? '' : 'nuclear '}ATRX expression is ${lc1(atrx)}`);
  }
  if (v.p53 === 'Wild-type') clauses.push('p53 shows a wild-type pattern');
  else if (v.p53 === 'Abnormal') clauses.push('p53 shows an abnormal pattern');
  if (!clauses.length) return '';
  const joined = clauses.length === 1 ? clauses[0] : `${clauses.slice(0, -1).join(', ')}, and ${clauses[clauses.length - 1]}`;
  return /^p53/.test(joined) ? `Immunostaining for ${joined}.` : `${uc1(joined)}.`;
}

/** The tumour histology paragraph: morphology, stains and immunohistochemistry in one. */
export function histologyPara(v) {
  return [morphologySentence(v), featuresSentence(v), stainsSentences(v), ihcSentence(v), keratinSentence(v), markerStatusSentence(v)]
    .filter(Boolean).join(' ');
}

// ---------- synoptic ----------

function sizeText(v) {
  if (v.sizeFrom === 'Cannot be determined') return 'Cannot be determined';
  const n = num(v.tumourSize);
  if (n === null) return '';
  return `${fmt(n)} mm in greatest dimension (${v.sizeFrom === 'Specimen' ? 'specimen' : 'imaging'})`;
}

function numberText(v) {
  if (v.tumourNumber !== 'Multiple') return 'Single pituitary neuroendocrine tumour';
  const n = num(v.tumourCount);
  return `Multiple pituitary neuroendocrine tumours${n !== null ? ` (${fmt(n)})` : ''}`;
}

function invasionSites(v) {
  return [...arr(v.invasionSites).map(lc1), lc1(stripDot(v.invasionOther))].filter(Boolean);
}

function invasionText(v) {
  if (v.invasion !== 'Present') return v.invasion || 'Not identified';
  const sites = invasionSites(v);
  return `Present${sites.length ? ` (${listJoin(sites)})` : ''}`;
}

const METASTATIC = ['Cerebrospinal', 'Liver', 'Bone', 'Other (specify)'];

function metastasisText(v) {
  if (!v.metastasis || v.metastasis === 'Not applicable') return '';
  const d = stripDot(v.metastasisDetail);
  if (v.metastasis === 'Other (specify)') return d ? uc1(d) : 'Other';
  return `${v.metastasis}${d && METASTATIC.includes(v.metastasis) ? ` (${d})` : ''}`;
}

const crookeShown = (v) => TPIT_TYPES.includes(typeOf(v)) && arr(v.nonTumour).includes('Adenohypophysis');

function nonTumourItem(v) {
  const found = arr(v.nonTumour);
  const value = found.length ? `${uc1(listJoin(found.map(lc1)))} identified` : 'Not identified';
  const sub = crookeShown(v) && v.crooke ? [{ label: "Crooke's hyaline change of the non-tumorous corticotrophs", value: v.crooke }] : [];
  return { label: 'Non-tumorous pituitary', value, sub };
}

export function synoptic(part, ctx) {
  const v = part.values;
  const ki67 = num(v.ki67);
  const mitoses = num(v.mitoses);
  const findings = [...arr(v.additional), uc1(stripDot(v.additionalOther))].filter(Boolean);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureSynoptic(v)),
      item('Tumour integrity', v.integrity || 'Fragmented'),
      item('Tumour number', numberText(v)),
      item('Tumour size', sizeText(v))
    ] },
    { heading: 'Microscopic findings', items: [
      item('Tumour type and subtype', typeLine(v)),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Ki-67 labelling index', ki67 !== null ? `${fmt(ki67)}%` : ''),
      item('Mitotic count', mitoses !== null ? `${fmt(mitoses)} per 2 mm2` : ''),
      item('Histologically confirmed invasion', invasionText(v)),
      item('Metastasis', metastasisText(v)),
      nonTumourItem(v)
    ] },
    { heading: 'Additional findings', items: [
      ...(findings.length ? findings.map((t) => ({ text: t })) : [{ text: 'None identified' }]),
      stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null
    ] }
  ];
  const heading = ctx?.case?.parts && ctx.case.parts.length > 1 ? `(${part.label}) ${specimenName(part)}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

export function diagnosis(part) {
  const v = part.values;
  const head = `(${part.label}) PITUITARY, tumour, ${procedureNoun(v)}`;
  const clauses = [dxClause(v)];
  if (v.tumourNumber === 'Multiple') {
    const n = num(v.tumourCount);
    clauses.push(`multiple pituitary neuroendocrine tumours${n !== null ? ` (${fmt(n)})` : ''}`);
  }
  if (v.invasion === 'Present') {
    const sites = invasionSites(v);
    clauses.push(`histologically confirmed invasion${sites.length ? ` of ${listJoin(sites)}` : ''}`);
  }
  if (METASTATIC.includes(v.metastasis)) {
    const d = stripDot(v.metastasisDetail);
    clauses.push(v.metastasis === 'Other (specify)'
      ? `metastasis${d ? ` (${d})` : ''}`
      : `${lc1(v.metastasis)} metastasis${d ? ` (${d})` : ''}`);
  }
  return renderDiagnosis(head, clauses);
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  const t = typeOf(v);
  const lin = lineageOf(t);
  const diffuse = arr(v.ihcDiffuse); const focal = arr(v.ihcFocal); const negative = arr(v.ihcNegative);
  const pos = new Set([...diffuse, ...focal]);
  const neg = new Set(negative);

  const lists = [['Positive, diffuse', diffuse], ['Positive, focal', focal], ['Negative', negative]];
  const seen = new Map();
  for (const [, list] of lists) for (const m of list) seen.set(m, (seen.get(m) || 0) + 1);
  const twice = [...seen].filter(([, n]) => n > 1).map(([m]) => m);
  if (twice.length) err(`${listJoin(twice)} ${twice.length > 1 ? 'are' : 'is'} in more than one immunohistochemistry list.`, 'ihcDiffuse');

  const missing = TFS.filter((m) => !pos.has(m) && !neg.has(m));
  if (missing.length) info(`${listJoin(missing)} ${missing.length > 1 ? 'are' : 'is'} not recorded; TPIT, PIT1 and SF1 assign the lineage.`, 'ihcNegative');
  if (lin) {
    if (neg.has(lin)) warn(`${lin} is recorded negative in a ${lin}-lineage tumour; check the tumour type.`, 'tumourType');
    const others = TFS.filter((m) => m !== lin && pos.has(m));
    if (others.length) warn(`${listJoin(others)} ${others.length > 1 ? 'are' : 'is'} positive in a ${lin}-lineage tumour; consider a plurihormonal (multilineage) tumour.`, 'tumourType');
  }
  if (t === NULL_CELL) {
    const p = TFS.filter((m) => pos.has(m));
    if (p.length) warn(`A null cell tumour is negative for TPIT, PIT1 and SF1; ${listJoin(p)} ${p.length > 1 ? 'are' : 'is'} recorded positive.`, 'tumourType');
  }
  if (t === MULTILINEAGE && TFS.filter((m) => pos.has(m)).length < 2) {
    info('A plurihormonal (multilineage) tumour expresses more than one lineage transcription factor; fewer than two are recorded positive.', 'ihcDiffuse');
  }

  if (TPIT_TYPES.includes(t) && arr(v.nonTumour).includes('Adenohypophysis') && !v.crooke) {
    warn("Crooke's hyaline change of the non-tumorous corticotrophs is not recorded for a corticotroph tumour.", 'crooke');
  }
  if ((lin === 'PIT1' || lin === 'TPIT' || t === NULL_CELL) && (!v.keratin || v.keratin === 'Not performed')) {
    info('Low-molecular-weight keratin is not recorded; it subtypes PIT1-lineage, TPIT-lineage and null cell tumours.', 'keratin');
  }
  if (keratinPositive(v)) {
    const pat = arr(v.keratinPattern);
    const over70 = pat.includes('Fibrous bodies in more than 70% of tumour cells');
    if (t === 'Somatotroph tumour, sparsely granulated' && !over70) {
      warn('A sparsely granulated somatotroph tumour shows keratin fibrous bodies in more than 70% of tumour cells; the recorded pattern does not.', 'keratinPattern');
    }
    if (t === 'Somatotroph tumour, densely granulated' && over70) {
      warn('Keratin fibrous bodies in more than 70% of tumour cells indicate a sparsely granulated somatotroph tumour.', 'tumourType');
    }
  }

  const ki67 = num(v.ki67);
  if (ki67 === null) info('Ki-67 labelling index is not recorded.', 'ki67');
  else if (ki67 > 100) err('Ki-67 labelling index exceeds 100%.', 'ki67');
  if (v.invasion === 'Present' && !invasionSites(v).length) err('Invasion is present: name the invaded tissue.', 'invasionSites');
  if (v.tumourNumber === 'Multiple') info('Multiple tumours: report each distinct tumour as a separate part.', 'tumourNumber');
  if (v.procedure === 'Other' && !stripDot(v.procedureOther)) err('Procedure is "Other": specify it.', 'procedureOther');
  if (t === OTHER && !detailOf(v)) err('Tumour type is "Other": specify it.', 'typeDetail');
  if (v.metastasis === 'Other (specify)' && !stripDot(v.metastasisDetail)) err('Metastasis is "Other": specify the site.', 'metastasisDetail');
  return out;
}

export default { specimenName, macro, blockKey, synoptic, diagnosis, validate };
