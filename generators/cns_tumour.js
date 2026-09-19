// Glioma and ependymoma resection generator (roadmap "CNS — glioma / ependymoma resection", Next;
// built 2026-09-19). The paired resection template of generators/cns_biopsy.js: the biopsy names the
// lesion on a squash, this one reports the definitive excision in the layered integrated format.
//
// Source template: QMH Cancer Reporting Template - CNS (Common gliomas and ependymomas)
//   https://awiloqmh.github.io/CancerReportingTemplate/CNS-Common_gliomas_and_ependymomas.html
// which carries the US CAP protocol "Tumors of the Brain and Spinal Cord" 1.0.0.1 (September 2025),
// not an ICCR dataset. The QMH print order is sacred and is reproduced here:
//   Layer 1  Integrated diagnosis
//   Layer 2  Histopathological classification (older histological vocabulary, a separate field)
//   Layer 3  CNS WHO grade
//   Layer 4  Molecular information (branched: an IDH-mutant panel and an IDH-wildtype panel)
// There is no margin item, no extent-of-resection item and no proliferation item on that page, so
// mitoses, Ki-67 and the resection extent stay in the house microscopy paragraph rather than being
// invented as synoptic elements.
//
// Knowledge grounding, comments only (never printed):
//   WHO CNS5 grading — IDH-mutant astrocytoma 2/3/4, grade 4 on microvascular proliferation,
//     necrosis or CDKN2A/B homozygous deletion; oligodendroglioma 2/3; an IDH-wildtype adult
//     diffuse astrocytic glioma is glioblastoma (grade 4) with TERT promoter mutation, EGFR
//     amplification or combined +7/-10   https://pmc.ncbi.nlm.nih.gov/articles/PMC8328017/
//   CAP-AANP-AMP-SNO biomarker guideline (the Layer 4 panel and its branching): Brat DJ et al.,
//     Arch Pathol Lab Med 2022;146(5):547-574   https://pubmed.ncbi.nlm.nih.gov/34351401/
//   Layered integrated reporting   https://www.iccr-cancer.org/wp-content/uploads/2026/03/ICCR-CNS-Integrated-diagnosis-2nd-ed-v2.1-bookmark-1.pdf
//
// Grade 3 on the QMH page is a free choice, not a derived value: the select offers 1-4, Pending,
// Not applicable, Cannot be determined and Other. This generator therefore *proposes* a grade from
// the entity and the recorded findings, prints the pathologist's choice whenever one is made, and
// raises a check when the two disagree instead of silently overruling either.
//
// Blocks produced:
//   specimenName / macro / blockKey / synoptic / diagnosis / flags / validate
// Wording is protected by tests/cns_tumour.test.js - change it only deliberately.

import { stripDot, letteredBlockKey, checks } from './_house.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import {
  NP, isEpendymoma, entity, integratedDiagnosis, histClassText, proposedGrade, grade, gradeValue, gradeText,
  gradeClause, upperEntity, featureClause, mitoticClause, ihcClause, ki67Clause, treatmentClause,
  treatmentValue, molecularClause, molecularBits
} from './cns_layers.js';
import {
  uc1, lc1, num, arr,
  ASTRO, OLIGO, GBM, DMG, EPENDYMOMA, PITNET, MENINGIOMA,
  BASE_MORPHOLOGY
} from './cns_morphology.js';

// The four layers, their grading logic and the shared clause builders live in
// generators/cns_layers.js so that generators/cns_biopsy.js reports the same tumour in the same
// words. Only the resection-specific blocks - specimen, macroscopic, synoptic assembly - are here.
export {
  FAMILY_FIELD, entity, integratedDiagnosis, histClassText, proposedGrade, grade, gradeValue,
  gradeText, ihcClause, molecularClause, molecularBits
} from './cns_layers.js';

// ---------- specimen ----------

const siteWord = (v) => (v.site === 'Other' ? (stripDot(v.siteOther) || 'Brain') : (v.site || 'Frontal lobe'));
const procedureText = (v) => (v.procedure === 'other' ? (stripDot(v.procedureOther) || 'excision') : (v.procedure || 'craniotomy and excision'));

const ORGAN = [
  [/^Spinal cord|^Cauda equina/, 'SPINAL CORD'],
  [/^Sellar/, 'PITUITARY'],
  [/^Sphenoidal ridge/, 'DURA']
];

/** "BRAIN, right frontal lobe, craniotomy and excision" - the organ line of the diagnosis. */
export function organPhrase(part) {
  const v = part.values;
  const site = siteWord(v);
  const organ = (ORGAN.find(([re]) => re.test(site)) || [null, 'BRAIN'])[1];
  const side = (v.side || '').trim();
  const place = organ === 'SPINAL CORD' || organ === 'PITUITARY' ? lc1(site) : `${side ? `${side} ` : ''}${lc1(site)}`;
  return `${organ}, ${place}, ${procedureText(v)}`;
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  const side = (v.side || '').trim();
  return `Brain, ${side ? `${side} ` : ''}${lc1(siteWord(v))} tumour, ${procedureText(v)}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- macro ----------

const INTEGRITY_PHRASE = {
  'Single intact mass': 'is an intact tumour mass',
  'Fragmented, received in pieces': 'are fragments of soft tumour tissue',
  'Multiple separately labelled fragments': 'are multiple separately labelled fragments of tumour tissue'
};

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const piece = INTEGRITY_PHRASE[v.integrity] || INTEGRITY_PHRASE['Fragmented, received in pieces'];
  let s = `(${part.label}) Received in formalin ${piece} from the ${lc1(siteWord(v))}`;
  const dims = stripDot(v.specimenDims);
  if (dims) s += `, measuring ${dims} mm in aggregate`;
  s += '.';
  const gd = stripDot(v.grossDetails);
  if (gd) s += ` ${uc1(gd)}.`;
  s += ' Representative sections are taken; see block key.';
  return s;
}

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

// ---------- microscopy paragraph ----------

const GENERIC_MORPHOLOGY = {
  Meningioma: BASE_MORPHOLOGY[MENINGIOMA],
  'Pituitary neuroendocrine tumour (PitNET)': BASE_MORPHOLOGY[PITNET]
};

/** The opening clause of the microscopy paragraph, shared with the biopsy template where possible. */
export function morphologyClause(v) {
  const e = entity(v);
  if (BASE_MORPHOLOGY[e]) return BASE_MORPHOLOGY[e];
  if (GENERIC_MORPHOLOGY[e]) return GENERIC_MORPHOLOGY[e];
  if (isEpendymoma(e)) return BASE_MORPHOLOGY[EPENDYMOMA];
  if (/^Anaplastic |^Diffuse |glioma$/i.test(e) && /glioma|astrocytoma/i.test(e)) return BASE_MORPHOLOGY[ASTRO];
  return `a tumour with the features of ${lc1(e)}`;
}

/** The house microscopy paragraph: morphology, features, mitoses, immunohistochemistry, molecular. */
export function histologyPara(v) {
  const typed = stripDot(v.histologyNotes);
  if (typed) return `${typed}.`;
  const s = [`Sections show ${morphologyClause(v)}.`];
  const f = featureClause(v);
  if (f) s.push(f);
  const m = mitoticClause(v);
  if (m) s.push(m);
  const extras = arr(v.additionalFindings)
    .filter((x) => x !== 'Other (specify)')
    .map((x) => ADDITIONAL_SENTENCE[x])
    .filter(Boolean);
  s.push(...extras);
  const ihc = ihcClause(v);
  if (ihc) s.push(ihc);
  const ki = ki67Clause(v);
  if (ki) s.push(ki);
  const te = treatmentClause(v);
  if (te) s.push(te);
  const mol = molecularClause(v);
  if (mol) s.push(mol);
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return s.join(' ');
}

const ADDITIONAL_SENTENCE = {
  'Adjacent brain parenchyma with reactive gliosis': 'The adjacent brain parenchyma shows reactive gliosis.',
  'Infiltration of the overlying cortex': 'Tumour infiltrates the overlying cortex.',
  'Leptomeningeal involvement by tumour': 'Tumour extends into the leptomeninges.',
  'Dura involved by tumour': 'Tumour involves the attached dura.',
  'Bone involved by tumour': 'Tumour involves the attached bone.',
  'Previous surgical site changes': 'There are changes of a previous surgical site.',
  'Radiation-induced vascular change': 'The vessels show hyalinisation and fibrinoid change consistent with previous radiotherapy.'
};

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const mol = v.molStatus === 'Reported' ? molecularBits(v) : [];
  const molItems = v.molStatus === 'Sent, result pending'
    ? [{ label: 'Molecular studies', value: 'Requested, result pending' }]
    : v.molStatus === 'Not performed'
      ? [{ label: 'Molecular studies', value: 'Not performed' }]
      : mol.map((b) => ({ label: b.label, value: b.value }));
  const sections = [
    { heading: 'Specimen', items: [
      item('Procedure', uc1(procedureText(v))),
      item('Tumour site', (v.side || '').trim() ? `${uc1(v.side)} ${lc1(siteWord(v))}` : uc1(siteWord(v))),
      item('Extent of resection as stated by the surgeon', v.extent && v.extent !== 'Not stated' ? v.extent : null),
      item('Specimen integrity', v.integrity || null)
    ] },
    { heading: 'Microscopic findings', items: [
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Treatment effect', treatmentValue(v))
    ] },
    { heading: 'Integrated diagnosis', items: [
      item('Integrated diagnosis', integratedDiagnosis(v)),
      item('Histopathological classification', histClassText(v)),
      item('CNS WHO grade', gradeValue(v))
    ] },
    { heading: 'Molecular information', items: molItems },
    { heading: 'Additional findings', items: (() => {
      const f = arr(v.additionalFindings)
        .map((s) => (s === 'Other (specify)' ? stripDot(v.additionalDetail) : s))
        .filter(Boolean);
      return f.length ? f.map((t) => ({ text: t })) : [{ text: 'None identified' }];
    })() }
  ];
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `(${part.label}) ${organPhrase(part)}`;
  const first = [`${upperEntity(entity(v))}${gradeClause(v) ? `, ${gradeClause(v)}` : ''}`];
  if ((v.treatmentEffect || '') === 'Present') first.push('treatment effect present');
  if (v.molStatus === 'Sent, result pending') first.push('molecular studies pending');
  const clauses = [`${first.join('; ')}; see synoptic report`];
  return renderDiagnosis(head, clauses);
}

// ---------- flags ----------

export function flags(parts) {
  const out = [];
  for (const p of parts) {
    const v = p.values;
    if (v.molStatus === 'Sent, result pending' || (v.grade || '') === 'Pending') out.push('molecularPending');
    if (grade(v) === 4 || (grade(v) === 3 && /glioma|astrocytoma|oligodendroglioma/i.test(entity(v)))) out.push('highGradeGlioma');
  }
  return [...new Set(out)];
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const e = entity(v);
  const g = grade(v);
  const prop = proposedGrade(v);

  if (e === 'Tumour type not specified') err('Integrated diagnosis is required; choose an entity or type one in Layer 1.', 'dxFamily');
  if (!gradeText(v)) err('CNS WHO grade is required; this entity does not carry a settled grade, so choose one in Layer 3.', 'grade');
  if (g && prop && g !== prop) {
    warn(`CNS WHO grade ${g} is recorded but the entity and the recorded findings support grade ${prop}.`, 'grade');
  }
  if (!histClassText(v)) warn('Histopathological classification (Layer 2) is not recorded.', 'histClass');

  // Layer 4 consistency, checked against the diagnosis rather than asserted into it.
  if (v.molStatus === 'Reported') {
    if (e === GBM && v.idhBranch !== 'IDH-wildtype') warn('Glioblastoma, IDH-wildtype is recorded but the molecular branch is not IDH-wildtype.', 'idhBranch');
    if ((e === ASTRO || e === OLIGO) && v.idhBranch !== 'IDH-mutant') warn(`${e} is recorded but the molecular branch is not IDH-mutant.`, 'idhBranch');
    if (e === GBM && v.idh1R132H === 'Positive') warn('IDH1 R132H is positive; this is not compatible with glioblastoma, IDH-wildtype.', 'idh1R132H');
    if (e === OLIGO && v.codel !== '1p/19q codeletion detected') {
      warn('Oligodendroglioma, IDH-mutant and 1p/19q-codeleted is recorded but 1p/19q codeletion is not recorded.', 'codel');
    }
    if (e === ASTRO && v.codel === '1p/19q codeletion detected') {
      warn('1p/19q codeletion is recorded with a diagnosis of astrocytoma, IDH-mutant.', 'codel');
    }
    if (e === DMG && v.h3k27me3 === 'Retained nuclear expression') {
      warn('Diffuse midline glioma, H3 K27-altered is recorded but H3 K27 trimethylation is retained.', 'h3k27me3');
    }
    if (e === GBM && v.tert === NP && v.egfr === NP && v.chr710 === NP) {
      at('info', 'No TERT promoter, EGFR or chromosome 7/10 result is recorded for an IDH-wildtype glioblastoma.', 'tert');
    }
  } else if (v.molStatus === 'Not performed' && /IDH-mutant|IDH-wildtype|codeleted|H3 |MYB|MYCN|BCOR|FOXR2/.test(e)) {
    warn('The integrated diagnosis names a molecular alteration but no molecular studies are recorded.', 'molStatus');
  }

  if (/^Gross total resection/.test(v.extent || '') && /^Fragmented|^Multiple/.test(v.integrity || '')) {
    at('info', 'A gross total resection is stated but the specimen was received fragmented; the extent of resection is a radiological and operative judgement, not a pathological one.', 'extent');
  }
  if (num(v.ki67) !== null && num(v.ki67) > 100) err('The Ki-67 index cannot exceed 100 per cent.', 'ki67');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, flags, validate };
