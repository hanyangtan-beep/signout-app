// Pancreatic (exocrine) carcinoma resection generator — the pancreatic half of the Whipple pair,
// and since Phase 52 the other pancreatectomies too: distal (with or without the spleen), total,
// central and enucleation (docs/specs/pancreatectomy.md). The operation decides the organs named
// in the specimen line, the macro, the margins and the node checks; a pancreatoduodenectomy reads
// exactly as before.
// Elements follow the CAP protocol Pancreas (Exocrine) v4.3.0.0 (June 2025, required use March
// 2026) in the CAP order, with the house departures recorded in docs/specs/pancreatectomy.md: the
// "- Tumour histology:" paragraph follows "- Histologic grade:" (all synoptic templates), the
// treatment-effect strings are the house CAP TRG variants (score 0-3), margin distances are in
// mm, and British spelling is used throughout. Tumour size is in cm as in the protocol.
//
// pTNM is derived by src/staging/pancreas.js and printed only with `options.printPTNM`, stamped
// (AJCC 8th edition); a typed override wins and is echoed with its reason. Treatment effect
// beyond "No known presurgical therapy" adds the y descriptor automatically.
//
// The single thing most worth knowing about this template: in the eighth edition pT1-pT3 are
// assigned on SIZE ALONE. Extrapancreatic extension is recorded as an element and appears in the
// report, but it does not raise pT. The staging module says so in a note whenever extension is
// ticked, so the derivation cannot be mistaken for the seventh-edition rule.
//
// Specimen, margins, node stations, origin assignment and macro come from generators/_whipple.js,
// shared with generators/ampulla_carcinoma.js.
// Wording is protected by tests/pancreas_carcinoma.test.js — change it only deliberately.

import { typeMorphology, IHC_PHRASE } from './pancreas_morphology.js';
import { deriveTNM, stageLine, showNodes, showMets } from '../src/staging/index.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { letteredBlockKey, checks } from './_house.js';
import * as W from './_whipple.js';

const { num, fmt, lc1, uc1, arr, listJoin, chosen, specify, stripDot } = W;

const TEMPLATE = 'pancreas';

/** Extension ticks that are recorded but do not move pT in this edition. */
export const T4_ARTERIES = ['Coeliac axis', 'Superior mesenteric artery', 'Common hepatic artery'];

const isPT0 = (v) => arr(v.tumourExtension).some((s) => /^No evidence of primary/i.test(s));
const isTis = (v) => { const t = arr(v.tumourExtension); return t.length === 1 && /^No invasion/i.test(t[0]); };

// ---------- specimen ----------

export const procedureText = W.procedureText;
export const procedurePhrase = W.procedurePhrase;

export function sitesText(v) {
  const sites = chosen(v.tumourSite).map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) : lc1(specify(s)))).filter(Boolean);
  return sites.length ? listJoin(sites) : '';
}

export const SPLEEN_IN = 'Included (splenectomy)';
export const SPLEEN_OUT = 'Not included (spleen-preserving)';

/**
 * 'in' | 'out' | '' — the spleen, for the two operations that may take it. The retired "Partial
 * pancreatectomy" options never asked, so a draft holding one names no spleen.
 */
export function spleenState(v) {
  if (v.procedure !== 'Distal pancreatectomy' && v.procedure !== 'Total pancreatectomy') return '';
  return v.spleen === SPLEEN_IN ? 'in' : v.spleen === SPLEEN_OUT ? 'out' : '';
}

/** The organs the specimen line opens with. */
function organs(v) {
  const kind = W.procedureKind(v);
  const spleen = spleenState(v) === 'in';
  if (kind === 'pd') return 'Pancreas and duodenum';
  if (kind === 'total') return spleen ? 'Pancreas, duodenum and spleen' : 'Pancreas and duodenum';
  if (kind === 'distal') return spleen ? 'Pancreas and spleen' : 'Pancreas';
  return 'Pancreas';
}

/** The operation as the specimen line and the macro write it: "distal pancreatectomy and splenectomy". */
export function operationPhrase(v) {
  const p = procedurePhrase(v);
  const spleen = spleenState(v);
  if (!p || !spleen) return p;
  return spleen === 'in' ? `${p} and splenectomy` : `spleen-preserving ${p}`;
}

/** The synoptic Procedure value: "Distal pancreatectomy with splenectomy". */
export function procedureValue(v) {
  const p = procedureText(v);
  const spleen = spleenState(v);
  if (!spleen) return p;
  return spleen === 'in' ? `${p} with splenectomy` : `${p}, spleen-preserving`;
}

/** "Additionally resected organs or structures", when any is ticked. */
export function extendedValue(v) {
  const named = arr(v.extendedResection).filter((s) => s !== 'None')
    .map((s) => (s === 'Other (specify)' ? stripDot(v.extendedResectionOther) || 'Other' : s));
  return named.length ? listJoin(named) : '';
}

/** The generated name after the organs: ", tail of pancreas, distal pancreatectomy and splenectomy". */
function nameTail(v) {
  const proc = operationPhrase(v);
  const sites = sitesText(v);
  return `${sites ? `, ${sites}` : ''}${proc ? `, ${proc}` : ''}`;
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  return `${organs(v)}${nameTail(v)}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part, ctx) { return deriveTNM(part.values, 'pancreas'); }

// ---------- macro ----------

export function macro(part, ctx) {
  const v = part.values;
  const kind = W.procedureKind(v);
  const centre = sitesText(v) || (kind === 'pd' ? 'pancreatic head' : 'pancreas');
  let sentence = W.tumourFragment(v, centre);
  const duct = [];
  if (stripDot(v.pancDuctDilatation)) duct.push(`the pancreatic duct is dilated to ${stripDot(v.pancDuctDilatation)} mm upstream`);
  if (stripDot(v.bileDuctDilatation) && W.takesHead(kind)) duct.push(`the common bile duct is dilated to ${stripDot(v.bileDuctDilatation)} mm`);
  if (duct.length) sentence += ` ${uc1(listJoin(duct))}.`;
  if (kind === 'pd') return W.whippleMacro(part, ctx, { tumourSentence: sentence });
  return resectionMacro(part, ctx, kind, sentence);
}

/**
 * How each of the other operations is inked and sliced (RCPath G091: a left pancreatectomy has its
 * transection margin and anterior and posterior surfaces painted and is sliced sagittally; a total
 * pancreatectomy has its head sliced axially and its body and tail sagittally).
 */
const HANDLING = {
  total: 'The uncinate (superior mesenteric artery) and posterior surfaces are inked in different colours and the bile duct margin is taken en face. The pancreatic head is sliced axially and the body and tail are sliced in the sagittal plane.',
  distal: 'The pancreatic transection margin and the anterior and posterior surfaces are inked in different colours and the pancreas is serially sliced in the sagittal plane.',
  central: 'The proximal and distal pancreatic transection margins are inked in different colours and the pancreas is serially sliced in the sagittal plane.',
  enucleation: 'The surface is inked and the specimen is serially sliced.'
};

function spleenPhrase(v) {
  const dims = stripDot(v.spleenDims);
  const g = num(v.spleenWeightG);
  if (dims && g !== null) return `the spleen measures ${dims} mm and weighs ${fmt(g)} g`;
  if (dims) return `the spleen measures ${dims} mm`;
  return g !== null ? `the spleen weighs ${fmt(g)} g` : '';
}

function nodesSentence(v, kind) {
  if (kind === 'total') return 'The lymph node stations are dissected separately and submitted in labelled cassettes.';
  if (kind === 'distal') return spleenState(v) === 'in' ? 'The splenic hilar and peripancreatic lymph nodes are dissected and submitted.' : 'The peripancreatic lymph nodes are dissected and submitted.';
  return (W.int(v.nodesExamined) || 0) > 0 ? 'The peripancreatic lymph nodes are dissected and submitted.' : '';
}

/** The macro for a total, distal or central pancreatectomy or an enucleation. */
function resectionMacro(part, ctx, kind, tumourSentence) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const proc = operationPhrase(v) || 'pancreatectomy';
  const article = /^[aeiou]/.test(proc) ? 'an' : 'a';
  let s = `(${part.label}) Received in formalin is ${article} ${proc} specimen`;
  if (stripDot(v.specimenDims)) s += ` measuring ${stripDot(v.specimenDims)} mm`;
  s += '.';
  const seg = [];
  if (stripDot(v.pancreasDims)) seg.push(`the pancreas measures ${stripDot(v.pancreasDims)} mm`);
  if (kind === 'total') {
    if (stripDot(v.duodenumLengthMm)) seg.push(`the attached duodenum measures ${stripDot(v.duodenumLengthMm)} mm in length`);
    if (stripDot(v.bileDuctLengthMm)) seg.push(`the common bile duct measures ${stripDot(v.bileDuctLengthMm)} mm in length`);
    if (stripDot(v.stomachLengthMm)) seg.push(`the gastric cuff measures ${stripDot(v.stomachLengthMm)} mm in length`);
  }
  if (spleenState(v) === 'in') seg.push(spleenPhrase(v));
  if (seg.filter(Boolean).length) s += ` ${uc1(listJoin(seg))}.`;
  s += ` ${HANDLING[kind]}`;
  if (tumourSentence) s += ` ${tumourSentence}`;
  if (stripDot(v.ductFindings)) s += ` ${uc1(stripDot(v.ductFindings))}.`;
  if (stripDot(v.grossDetails)) s += ` ${uc1(stripDot(v.grossDetails))}.`;
  const nodes = nodesSentence(v, kind);
  if (nodes) s += ` ${nodes}`;
  s += ' Representative sections are taken; see block key.';
  return s;
}

// ---------- block key ----------

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered });

// ---------- values shared by synoptic and diagnosis ----------

export const histTypeName = (v) => (v.histType === 'Other histologic type not listed (specify)'
  ? (v.histTypeOther || '').trim() || 'Histologic type not specified'
  : v.histType || 'Histologic type not specified');

/** Short canonical name for the diagnosis line. */
export function shortTypeName(v) {
  let t = specify(histTypeName(v)).replace(/ \(specify components\)$/, '');
  if (/^Mixed neuroendocrine/.test(t) && stripDot(v.histTypeOther)) t = `Mixed neuroendocrine-non-neuroendocrine neoplasm (${stripDot(v.histTypeOther)})`;
  return t;
}

const gradeShort = (v) => (!v.grade || /^(GX|Not applicable|Other)$/.test(v.grade) ? (stripDot(v.gradeOther) || '') : v.grade.replace(/^G\d, /, ''));

/**
 * The invasion clause. Every extension tick beyond "Confined to pancreas" is descriptive only —
 * see the header — so this reads as a plain description and carries no staging claim.
 */
export function extensionPhrase(v) {
  const ticks = chosen(v.tumourExtension).filter((s) => !/^No invasion|^Confined to pancreas/.test(s));
  if (!ticks.length) {
    return arr(v.tumourExtension).some((s) => /^Confined to pancreas/.test(s)) ? 'confined to the pancreas' : '';
  }
  const named = ticks.map((s) => {
    const base = specify(s.replace(/\s*\(specify\)\s*$/, ''));
    if (/^Other peripancreatic soft tissue/.test(base)) return stripDot(v.extensionDetail) || 'other peripancreatic soft tissue';
    if (/^Other adjacent organ/.test(base)) return stripDot(v.extensionDetail) || 'other adjacent organs or structures';
    return lc1(base);
  });
  return `extending into the ${listJoin(named)}`;
}

/**
 * The ticked immunohistochemistry results, as one or two sentences. Positive markers are listed
 * as expression; SMAD4 is reported as a separate sentence because "express SMAD4, loss of nuclear
 * expression" is not a sentence a report can carry.
 */
export function ihcPhrase(v) {
  const ticks = chosen(v.ihc);
  const smad4 = ticks.find((s) => /^SMAD4/.test(s));
  const pos = ticks.filter((s) => !/^SMAD4/.test(s)).map((s) => IHC_PHRASE[s] || lc1(s)).filter(Boolean);
  const typed = stripDot(v.ihcOther);
  const out = [];
  if (pos.length || typed) out.push(`The tumour cells express ${listJoin([...pos, ...(typed ? [lc1(typed)] : [])])}.`);
  if (smad4) out.push(/retained/i.test(smad4) ? 'Nuclear SMAD4 (DPC4) expression is retained.' : 'There is loss of nuclear SMAD4 (DPC4) expression.');
  return out.join(' ');
}

/** Derived "- Tumour histology:" paragraph; the typed notes win when entered. */
export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return stripDot(v.histologyNotes) + '.';
  const g = gradeShort(v);
  let s = `The tumour is a ${[g, lc1(histTypeName(v))].filter(Boolean).join(' ')}`;
  const ext = extensionPhrase(v);
  if (ext) s += `, ${ext}`;
  s += '.';
  if (!isPT0(v)) {
    const morph = typeMorphology(v.histType === 'Other histologic type not listed (specify)' ? '' : v.histType || '', v.grade || '');
    if (morph) s += ` ${morph.replace(/\.$/, '')}.`;
  }
  const ihc = ihcPhrase(v);
  if (ihc) s += ` ${ihc}`;
  return s;
}

export function sizeTextValue(v) {
  const size = num(v.tumourSizeCm);
  const mode = v.sizeMode || '';
  if (/^Not applicable/.test(mode)) return 'Not applicable';
  if (/^Cannot be determined/.test(mode)) return `Cannot be determined${stripDot(v.sizeCannot) ? ` (${lc1(stripDot(v.sizeCannot))})` : ''}`;
  if (size === null) return 'Cannot be determined';
  if (/^Multifocal/.test(mode)) {
    const agg = num(v.aggregateSizeCm);
    return `${fmt(size)} cm (multifocal invasive carcinoma, largest focus${agg !== null ? `; aggregate ${fmt(agg)} cm` : ''})`;
  }
  return `${fmt(size)} cm (unifocal invasive carcinoma, greatest dimension)`;
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sites = arr(v.tumourSite);
  const extTicks = arr(v.tumourExtension);
  const extVal = extTicks.length
    ? listJoin(extTicks.map((s) => (/\(specify\)$/.test(s) && stripDot(v.extensionDetail) ? `${s.replace(/\s*\(specify\)$/, '')}: ${stripDot(v.extensionDetail)}` : s)))
    : 'Not recorded';
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Additionally resected organs or structures', extendedValue(v)),
      W.originApplies(v, TEMPLATE) ? item('Origin', W.originText(v)) : null,
      item('Tumour site', sites.length
        ? listJoin(sites.map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) || 'Other' : s)))
        : 'Not specified'),
      item('Tumour size', sizeTextValue(v))
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', stripDot(v.grade) || stripDot(v.gradeOther) || null) : null,
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Sites involved by direct extension', extVal),
      item('Pancreatic surface involvement', v.surfaceInvolvement && !/^Not applicable/.test(v.surfaceInvolvement) ? v.surfaceInvolvement : null),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Treatment effect', W.treatmentText(v)),
      item('Precursor lesion', W.precursorValue(v))
    ] },
    { heading: 'Margins', items: [
      ...W.marginItems(v, TEMPLATE),
      item('High-grade dysplasia at the margins', v.hgDysplasia && !/^Not applicable/.test(v.hgDysplasia) ? (v.hgDysplasia === 'Other (specify)' ? stripDot(v.hgDysplasiaDetail) || 'Other' : v.hgDysplasia) : null)
    ] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: [W.nodesItem(v)] } : null,
    showMets(st, ctx, W.metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', W.metastasisValue(v))] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm,
        sub: stageLine(st) ? [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] : [] }
    ] } : null,
    { heading: 'Additional findings', items: (() => {
      const f = chosen(v.additionalFindings)
        .map((s) => (s === 'Other (specify)' ? stripDot(v.additionalFindingsDetail) : s))
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

export function diagnosis(part, ctx) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  // The generated organs are upper-cased whole: "PANCREAS, DUODENUM AND SPLEEN" carries a comma.
  const head = `(${part.label}) ${typed ? upperHead(typed) : `${organs(v).toUpperCase()}${nameTail(v)}`}`;
  const first = [];
  if (isPT0(v)) first.push('NO RESIDUAL CARCINOMA following therapy');
  else if (isTis(v)) first.push('CARCINOMA IN SITU (high-grade dysplasia), no invasive carcinoma identified');
  else {
    const g = gradeShort(v);
    let clause = [upperHead(shortTypeName(v)), g].filter(Boolean).join(', ');
    const size = num(v.tumourSizeCm);
    if (size !== null && !/^Not applicable/.test(v.sizeMode || '')) clause += `, ${fmt(size)} cm`;
    const ext = extensionPhrase(v);
    if (ext) clause += `, ${ext}`;
    first.push(clause);
    if (v.lvi === 'Present') first.push('lymphovascular invasion present');
    if (v.pni === 'Present') first.push('perineural invasion present');
  }
  if (W.isTreated(v)) first.push(`treatment effect: ${lc1(String(v.treatmentEffect).replace(/\s*\(not otherwise specified\)/, ''))}`);
  const mp = W.marginsPhrase(v, TEMPLATE);
  if (mp) first.push(mp);
  const clauses = [`${first.join('; ')}; see synoptic report`];
  const np = W.nodesPhrase(v);
  if (np) clauses.push(np + (v.ene === 'Present' ? '; extranodal extension present' : ''));
  const mets = chosen(v.distantMets).map((s) => lc1(specify(s.replace(/\s*\(specify\)\s*$/, ''))));
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
  if (!v.histType) err('Histologic type is required.', 'histType');
  if (!cr && num(v.tumourSizeCm) === null && !/^Not applicable|^Cannot be determined/.test(v.sizeMode || '')) {
    err('Tumour size is required: pT1-pT3 are assigned on size alone in the eighth edition and pT cannot be derived without it.', 'tumourSizeCm');
  }
  if (!arr(v.tumourExtension).length && !cr) warn('Sites involved by direct extension are not recorded.', 'tumourExtension');
  if (arr(v.tumourExtension).some((s) => /\(specify\)$/.test(s)) && !stripDot(v.extensionDetail)) warn('An extension option needs specifying.', 'extensionDetail');
  // The seventh-edition habit: recording extrapancreatic spread and expecting pT3. The body and
  // tail neighbours (spleen, splenic vessels, stomach, adrenal, colon, kidney) count the same way.
  const cm = num(v.tumourSizeCm);
  if (cm !== null && cm <= 4 && arr(v.tumourExtension).some((s) => /peripancreatic|retroperitoneal|duodenal wall|mesocolon|mesenteric adipose|spleen|splenic|stomach|adrenal|colon|kidney/i.test(s))) {
    warn('Extrapancreatic extension is recorded with a tumour of 4 cm or less. In the eighth edition pT follows size alone, so this remains pT1 or pT2; extension no longer raises it to pT3.', 'tumourExtension');
  }
  if (/^Ductal adenocarcinoma/.test(v.histType || '') && (!v.grade || /^Not applicable/.test(v.grade))) {
    err('Histologic grade is required for ductal carcinoma.', 'grade');
  }
  if (/^Present, with no viable/.test(v.treatmentEffect || '') && !cr) {
    warn('Complete pathological response (score 0) recorded but the extension list is not "No evidence of primary tumour".', 'treatmentEffect');
  }
  // The operation and the tumour site have to agree: a distal or central pancreatectomy leaves the
  // head behind, and a spleen-preserving operation cannot show splenic invasion.
  const kind = W.procedureKind(v);
  const sites = chosen(v.tumourSite);
  // A distal pancreatectomy or an enucleation opens with no site (the head default does not follow
  // the operation), so a request that named none leaves it to be picked.
  if (!arr(v.tumourSite).length) warn('Tumour site is not recorded.', 'tumourSite');
  if ((kind === 'distal' || kind === 'central') && sites.length && sites.every((s) => s === 'Head of pancreas' || s === 'Uncinate process')) {
    warn(`Tumour site is the pancreatic head, which a ${kind} pancreatectomy does not include; check the tumour site.`, 'tumourSite');
  }
  if (spleenState(v) === 'out' && arr(v.tumourExtension).includes('Spleen')) warn('Splenic invasion is recorded but the spleen was preserved.', 'tumourExtension');
  if (arr(v.extendedResection).includes('Other (specify)') && !stripDot(v.extendedResectionOther)) warn('An additionally resected structure needs specifying.', 'extendedResectionOther');
  if (v.otherMargin && !/^Not applicable/.test(v.otherMargin) && !stripDot(v.otherMarginName)) warn('Name the other margin.', 'otherMarginName');
  W.sharedChecks(v, TEMPLATE, { err, warn });
  return out;
}

/**
 * Values pre-filled from a linked frozen part (frozen_section, "Pancreatic / bile duct margin"
 * scenario) so the intraoperative margin is carried into the paraffin report instead of retyped.
 * Whipple card, split (g).
 */
export function prefillFromFrozen(fv) {
  return W.prefillFromFrozenMargin(fv, 'pancreas');
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging, prefillFromFrozen };
