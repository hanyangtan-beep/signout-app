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
  uc1, lc1, num, arr, list,
  ASTRO, OLIGO, GBM, DMG, PILOCYTIC, EPENDYMOMA, PITNET, SCHWANNOMA, MENINGIOMA,
  BASE_MORPHOLOGY, FEATURE_PHRASE
} from './cns_morphology.js';

const NP = 'Not performed';
const CBD = 'Cannot be determined';

// ---------- entity (Layer 1) ----------

/** The per-family entity field that Layer 1 reads, keyed by the family select. */
export const FAMILY_FIELD = {
  'Adult-type diffuse gliomas': 'dxAdult',
  'Paediatric-type diffuse low-grade gliomas': 'dxPaedLow',
  'Paediatric-type diffuse high-grade gliomas': 'dxPaedHigh',
  'Circumscribed astrocytic gliomas': 'dxCircumscribed',
  'Glioneuronal and neuronal tumours': 'dxGlioneuronal',
  'Ependymal tumours': 'dxEpendymal',
  'Choroid plexus tumours': 'dxChoroid',
  'Medulloblastomas, molecularly defined': 'dxMedMol',
  'Medulloblastomas, histologically defined': 'dxMedHist',
  'Other CNS embryonal tumours': 'dxEmbryonal',
  'Pineal tumours': 'dxPineal',
  'Cranial and paraspinal nerve tumours': 'dxNerve',
  'Mesenchymal tumours involving the CNS': 'dxMesenchymal',
  'Melanocytic tumours': 'dxMelanocytic',
  'Haematolymphoid tumours involving the CNS': 'dxHaem',
  'Germ cell tumours': 'dxGerm',
  'Tumours of the sellar region': 'dxSellar',
  'Metastatic tumour': 'dxMetastatic'
};

/** The WHO CNS5 entity chosen in Layer 1, or the typed free text when the list does not carry it. */
export function entity(v) {
  const fam = v.dxFamily || 'Adult-type diffuse gliomas';
  if (fam === 'Other / not listed') return stripDot(v.dxOther) || 'Tumour type not specified';
  const chosen = v[FAMILY_FIELD[fam]] || '';
  if (!chosen || /^Other entity/.test(chosen)) return stripDot(v.dxOther) || 'Tumour type not specified';
  return chosen;
}

/** Layer 1 as printed: the entity, then the grade, then any NOS / NEC / pending qualifier. */
export function integratedDiagnosis(v) {
  const q = v.dxQualifier || '';
  let s = entity(v);
  const g = grade(v);
  if (g) s += `, CNS WHO grade ${g}`;
  if (/^NOS/.test(q)) s += ', NOS';
  else if (/^NEC/.test(q)) s += ', NEC';
  else if (q === CBD) s += `; cannot be determined${stripDot(v.dxQualifierDetail) ? ` (${lc1(stripDot(v.dxQualifierDetail))})` : ''}`;
  else if (/^Pending/.test(q)) s += `; pending further studies${stripDot(v.dxQualifierDetail) ? ` (${lc1(stripDot(v.dxQualifierDetail))})` : ''}`;
  return s;
}

export const histClassText = (v) => (v.histClass === 'Other (specify)'
  ? stripDot(v.histClassOther) || 'Other'
  : v.histClass || '');

// ---------- grade (Layer 3) ----------

const FIXED_GRADE = {
  [GBM]: 4,
  [DMG]: 4,
  'Diffuse hemispheric glioma, H3 G34-mutant': 4,
  'Diffuse astrocytoma, MYB- or MYBL1-altered': 1,
  'Angiocentric glioma': 1,
  'Polymorphous low-grade neuroepithelial tumour of the young': 1,
  [PILOCYTIC]: 1,
  'Subependymal giant cell astrocytoma': 1,
  'Chordoid glioma': 2,
  Ganglioglioma: 1,
  Gangliocytoma: 1,
  'Desmoplastic infantile ganglioglioma / desmoplastic infantile astrocytoma': 1,
  'Dysembryoplastic neuroepithelial tumour': 1,
  'Papillary glioneuronal tumour': 1,
  'Rosette-forming glioneuronal tumour': 1,
  'Myxoid glioneuronal tumour': 1,
  'Multinodular and vacuolating neuronal tumour': 1,
  'Dysplastic cerebellar gangliocytoma (Lhermitte-Duclos disease)': 1,
  'Central neurocytoma': 2,
  'Extraventricular neurocytoma': 2,
  'Cerebellar liponeurocytoma': 2,
  'Myxopapillary ependymoma': 2,
  Subependymoma: 1,
  'Spinal ependymoma, MYCN-amplified': 3,
  'Choroid plexus papilloma': 1,
  'Atypical choroid plexus papilloma': 2,
  'Choroid plexus carcinoma': 3,
  'Medulloblastoma, WNT-activated': 4,
  'Medulloblastoma, SHH-activated and TP53-wildtype': 4,
  'Medulloblastoma, SHH-activated and TP53-mutant': 4,
  'Medulloblastoma, non-WNT/non-SHH': 4,
  'Medulloblastoma, classic': 4,
  'Medulloblastoma, desmoplastic/nodular': 4,
  'Medulloblastoma with extensive nodularity': 4,
  'Medulloblastoma, large cell / anaplastic': 4,
  'Atypical teratoid/rhabdoid tumour': 4,
  'Embryonal tumour with multilayered rosettes': 4,
  'CNS neuroblastoma, FOXR2-activated': 4,
  'CNS tumour with BCOR internal tandem duplication': 4,
  Pineocytoma: 1,
  Pineoblastoma: 4,
  [SCHWANNOMA]: 1,
  Neurofibroma: 1,
  Perineurioma: 1,
  'Hybrid nerve sheath tumour': 1,
  'Paraganglioma of the cauda equina': 1,
  Haemangioblastoma: 1
};

const HIGH_GRADE_FEATURES = ['Microvascular proliferation', 'Necrosis with pseudopalisading', 'Necrosis without pseudopalisading'];
const isEpendymoma = (e) => /ependymoma/i.test(e) && !/^Subependymoma|^Myxopapillary/.test(e);

/** The grade the recorded findings support, or null when the entity does not carry a settled grade. */
export function proposedGrade(v) {
  const e = entity(v);
  const feats = arr(v.features);
  const mit = num(v.mitoses);
  const high = feats.some((x) => HIGH_GRADE_FEATURES.includes(x));
  if (FIXED_GRADE[e]) return FIXED_GRADE[e];
  if (e === ASTRO) {
    if (high || v.cdkn2a === 'Homozygous deletion detected') return 4;
    return feats.includes('Mitoses') || (mit !== null && mit > 0) ? 3 : 2;
  }
  if (e === OLIGO) return high || (mit !== null && mit >= 6) ? 3 : 2;
  if (e === 'Pleomorphic xanthoastrocytoma') return (mit !== null && mit >= 5) || high ? 3 : 2;
  if (isEpendymoma(e)) return high || (mit !== null && mit >= 5) ? 3 : 2;
  return null;
}

const SELECTED_GRADE = {
  'CNS WHO grade 1': 1, 'CNS WHO grade 2': 2, 'CNS WHO grade 3': 3, 'CNS WHO grade 4': 4
};

/** The grade that prints: the pathologist's choice when one is made, otherwise the proposal. */
export function grade(v) {
  const sel = v.grade || 'From the findings';
  if (SELECTED_GRADE[sel]) return SELECTED_GRADE[sel];
  if (sel === 'From the findings') return proposedGrade(v);
  return null;
}

/** Layer 3 as printed in the synoptic row - "4", or the free-choice values of the QMH select. */
export function gradeValue(v) {
  const t = gradeText(v);
  return t.replace(/^CNS WHO grade /, '');
}

/** Layer 3 in prose - "CNS WHO grade 4" - for the integrated diagnosis and the diagnosis line. */
export function gradeText(v) {
  const sel = v.grade || 'From the findings';
  if (sel === 'Pending') return 'Pending';
  if (sel === 'Not applicable') return 'Not applicable';
  if (sel === CBD) return `Cannot be determined${stripDot(v.gradeOther) ? ` (${lc1(stripDot(v.gradeOther))})` : ''}`;
  if (sel === 'Other (specify)') return stripDot(v.gradeOther) || 'Other';
  const g = grade(v);
  return g ? `CNS WHO grade ${g}` : '';
}

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

function featureClause(v) {
  const feats = arr(v.features).map((f) => FEATURE_PHRASE[f] || lc1(f));
  return feats.length ? `The tumour shows ${list(feats)}.` : '';
}

function mitoticClause(v) {
  const n = num(v.mitoses);
  if (n === null) return '';
  return n === 0
    ? 'Mitoses are not identified in 10 high-power fields.'
    : `Mitoses number ${n} per 10 high-power fields.`;
}

/** Immunohistochemistry, printed inside the microscopy paragraph as the house style requires. */
export function ihcClause(v) {
  const values = arr(v.ihc);
  const extra = stripDot(v.ihcOther);
  if (!values.length && !extra) return '';
  const pos = [];
  const neg = [];
  const other = [];
  for (const entry of values) {
    if (/ positive$/.test(entry)) pos.push(entry.replace(/ positive$/, ''));
    else if (/ negative$/.test(entry)) neg.push(entry.replace(/ negative$/, ''));
    else other.push(entry);
  }
  const clauses = [];
  if (pos.length) clauses.push(`positive for ${list(pos.map(lc1))}`);
  if (neg.length) clauses.push(`negative for ${list(neg.map(lc1))}`);
  let sentence = '';
  if (clauses.length) sentence = `On immunohistochemistry, the tumour cells are ${list(clauses)}`;
  const tailBits = [...other.map((o) => lc1(o)), ...(extra ? [lc1(extra)] : [])];
  if (tailBits.length) {
    const tail = list(tailBits);
    sentence = sentence ? `${sentence}, with ${tail}` : `On immunohistochemistry, there is ${tail}`;
  }
  return `${sentence}.`;
}

function ki67Clause(v) {
  const n = num(v.ki67);
  return n === null ? '' : `The Ki-67 proliferation index is approximately ${n} per cent.`;
}

/** The molecular results in prose, for the microscopy paragraph. */
export function molecularClause(v) {
  if (v.molStatus === 'Sent, result pending') return 'Molecular studies have been requested and the results are pending.';
  if (v.molStatus !== 'Reported') return '';
  const bits = molecularBits(v).map((b) => b.prose).filter(Boolean);
  return bits.length ? `On molecular testing, ${list(bits)}.` : '';
}

function treatmentClause(v) {
  const te = v.treatmentEffect || 'No known presurgical therapy';
  const detail = stripDot(v.treatmentDetail);
  if (te === 'Present') {
    const pct = num(v.necroticPct);
    return `There is evidence of treatment effect${pct !== null ? `, with necrotic tumour occupying approximately ${pct} per cent of the lesion` : ''}${detail ? ` (${lc1(detail)})` : ''}.`;
  }
  if (te === 'Not identified') return 'No treatment effect is identified.';
  return '';
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

// ---------- Layer 4: molecular information ----------

const PLAIN = (s) => (s && s !== NP ? s : '');

/**
 * Every Layer 4 item that was actually performed, each with its synoptic label, printed value and
 * the prose form used inside the microscopy paragraph. The branch follows the QMH page: the
 * IDH-mutant panel and the IDH-wildtype panel are different lists.
 */
export function molecularBits(v) {
  const out = [];
  const add = (label, value, prose) => { if (PLAIN(value)) out.push({ label, value, prose }); };
  const spec = (value, detail, base) => (/\(specify\)$/.test(value || '')
    ? `${base}${stripDot(detail) ? ` (${stripDot(detail)})` : ''}`
    : value);

  add('IDH1 R132H (immunohistochemistry)', v.idh1R132H,
    v.idh1R132H === 'Positive' ? 'IDH1 R132H is expressed' : v.idh1R132H === 'Negative' ? 'IDH1 R132H is not expressed' : 'IDH1 R132H immunohistochemistry cannot be interpreted');
  if (PLAIN(v.idhSeq)) {
    const val = spec(v.idhSeq, v.idhSeqDetail, 'Mutation detected');
    add('IDH1 / IDH2 sequencing', val,
      /^Mutation detected/.test(val) ? `an IDH mutation is detected${stripDot(v.idhSeqDetail) ? ` (${stripDot(v.idhSeqDetail)})` : ''}` : v.idhSeq === 'No mutation detected' ? 'IDH1 and IDH2 are wild-type' : 'IDH sequencing cannot be interpreted');
  }
  if (v.idhBranch === 'IDH-mutant') {
    add('ATRX (immunohistochemistry)', v.atrx,
      v.atrx === 'Loss of nuclear expression' ? 'there is loss of nuclear ATRX expression' : v.atrx === 'Intact nuclear expression' ? 'nuclear ATRX expression is intact' : 'ATRX immunohistochemistry cannot be interpreted');
    add('p53 (immunohistochemistry)', v.p53,
      v.p53 === 'Normal (wild-type pattern)' ? 'p53 shows a wild-type pattern' : v.p53 && v.p53 !== NP && v.p53 !== CBD ? `p53 shows an abnormal pattern (${lc1(String(v.p53).replace(/^Abnormal[, ]*/, '').replace(/^\(|\)$/g, '') || 'mutated')})` : 'p53 immunohistochemistry cannot be interpreted');
    if (PLAIN(v.codel)) {
      const val = spec(v.codel, v.codelDetail, v.codel === 'Polysomy (specify)' ? 'Polysomy' : 'Other');
      add('1p/19q (FISH)', val,
        v.codel === '1p/19q codeletion detected' ? 'there is codeletion of 1p and 19q'
          : v.codel === 'No deletion detected' ? '1p and 19q are retained'
            : `1p/19q testing shows ${lc1(val)}`);
    }
    add('CDKN2A / CDKN2B', v.cdkn2a,
      v.cdkn2a === 'Homozygous deletion detected' ? 'there is homozygous deletion of CDKN2A/B'
        : v.cdkn2a === 'No homozygous deletion detected' ? 'there is no homozygous deletion of CDKN2A/B'
          : v.cdkn2a === 'Hemizygous loss detected' ? 'there is hemizygous loss of CDKN2A/B' : 'CDKN2A/B copy number cannot be interpreted');
  }
  if (v.idhBranch === 'IDH-wildtype') {
    add('H3 trimethylated K27 (immunohistochemistry)', v.h3k27me3,
      v.h3k27me3 === 'Loss of nuclear expression' ? 'there is loss of nuclear H3 K27 trimethylation' : v.h3k27me3 === 'Retained nuclear expression' ? 'nuclear H3 K27 trimethylation is retained' : 'H3 K27 trimethylation cannot be interpreted');
    add('H3 G34W (immunohistochemistry)', v.h3g34w,
      v.h3g34w === 'Positive' ? 'H3 G34W is expressed' : v.h3g34w === 'Negative' ? 'H3 G34W is not expressed' : 'H3 G34W immunohistochemistry cannot be interpreted');
    if (PLAIN(v.h3seq)) {
      const val = spec(v.h3seq, v.h3seqDetail, 'Other mutation');
      add('H3 mutation (sequencing)', val,
        v.h3seq === 'H3 K27M detected' ? 'an H3 K27M mutation is detected'
          : v.h3seq === 'H3 G34R/V detected' ? 'an H3 G34R/V mutation is detected'
            : v.h3seq === 'No mutation detected' ? 'no H3 mutation is detected' : `H3 sequencing shows ${lc1(val)}`);
    }
    add('BRAF V600E', v.braf,
      v.braf === 'Detected' ? 'a BRAF V600E mutation is detected' : v.braf === 'Not detected' ? 'no BRAF V600E mutation is detected' : 'BRAF testing cannot be interpreted');
    add('Chromosome 7 / 10 (FISH)', v.chr710,
      v.chr710 === 'Combined gain of chromosome 7 and loss of chromosome 10' ? 'there is combined gain of chromosome 7 and loss of chromosome 10'
        : v.chr710 === 'No change detected' ? 'chromosomes 7 and 10 show no copy-number change'
          : v.chr710 === CBD ? 'chromosome 7 and 10 copy number cannot be interpreted' : `there is ${lc1(String(v.chr710))}`);
    add('EGFR amplification', v.egfr,
      v.egfr === 'Amplified' ? 'EGFR is amplified' : v.egfr === 'Not amplified' ? 'EGFR is not amplified' : 'EGFR copy number cannot be interpreted');
  }
  if (PLAIN(v.tert)) {
    const val = spec(v.tert, v.tertDetail, 'Mutation detected');
    add('TERT promoter', val,
      /^Mutation detected/.test(val) ? `a TERT promoter mutation is detected${stripDot(v.tertDetail) ? ` (${stripDot(v.tertDetail)})` : ''}`
        : v.tert === 'No mutation detected' ? 'the TERT promoter is wild-type' : 'TERT promoter testing cannot be interpreted');
  }
  const others = stripDot(v.molOthers);
  if (others) out.push({ label: 'Other molecular studies', value: others, prose: lc1(others) });
  return out;
}

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

function treatmentValue(v) {
  const te = v.treatmentEffect || 'No known presurgical therapy';
  const detail = stripDot(v.treatmentDetail);
  if (te === 'No known presurgical therapy') return 'No known presurgical therapy';
  if (te === 'Present') {
    const pct = num(v.necroticPct);
    return `Present${pct !== null ? `; necrotic tumour ${pct}%` : ''}${detail ? ` (${detail})` : ''}`;
  }
  if (te === CBD) return `Cannot be determined${detail ? ` (${detail})` : ''}`;
  return te;
}

// ---------- diagnosis ----------

const upperEntity = (s) => {
  const c = s.indexOf(', ');
  return c > 0 ? `${s.slice(0, c).toUpperCase()}${s.slice(c)}` : s.toUpperCase();
};

/** The grade as it reads on the diagnosis line. "Not applicable" simply drops off the line. */
function gradeClause(v) {
  const t = gradeText(v);
  if (!t || t === 'Not applicable') return '';
  if (t === 'Pending') return 'CNS WHO grade pending';
  if (/^Cannot be determined/.test(t)) return `CNS WHO grade ${lc1(t)}`;
  return lc1(t);
}

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
