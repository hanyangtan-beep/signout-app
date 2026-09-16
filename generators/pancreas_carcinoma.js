// Pancreatic (exocrine) carcinoma resection generator — the pancreatic half of the Whipple pair.
// Elements follow the CAP protocol Pancreas (Exocrine) v4.3.0.0 (June 2025, required use March
// 2026) in the CAP order, with the house departures recorded in docs/specs/whipple-pair.md: the
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
import { deriveTNM, stageLine } from '../src/staging/index.js';
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

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const proc = procedurePhrase(v);
  const sites = sitesText(v);
  return `Pancreas${sites ? ` and duodenum, ${sites}` : ' and duodenum'}${proc ? `, ${proc}` : ''}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part, ctx) { return deriveTNM(part.values, 'pancreas'); }

// ---------- macro ----------

export function macro(part, ctx) {
  const v = part.values;
  const centre = sitesText(v) || 'pancreatic head';
  let sentence = W.tumourFragment(v, centre);
  const duct = [];
  if (stripDot(v.pancDuctDilatation)) duct.push(`the pancreatic duct is dilated to ${stripDot(v.pancDuctDilatation)} mm upstream`);
  if (stripDot(v.bileDuctDilatation)) duct.push(`the common bile duct is dilated to ${stripDot(v.bileDuctDilatation)} mm`);
  if (duct.length) sentence += ` ${uc1(listJoin(duct))}.`;
  return W.whippleMacro(part, ctx, { tumourSentence: sentence });
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
      item('Procedure', procedureText(v)),
      item('Origin', W.originText(v)),
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
    { heading: 'Lymph nodes', items: [W.nodesItem(v)] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', W.metastasisValue(v))] },
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
  const head = `(${part.label}) ${typed ? upperHead(typed) : upperHead(specimenName(part))}`;
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
  // The seventh-edition habit: recording extrapancreatic spread and expecting pT3.
  const cm = num(v.tumourSizeCm);
  if (cm !== null && cm <= 4 && arr(v.tumourExtension).some((s) => /peripancreatic|retroperitoneal|duodenal wall|mesocolon|mesenteric adipose/i.test(s))) {
    warn('Extrapancreatic extension is recorded with a tumour of 4 cm or less. In the eighth edition pT follows size alone, so this remains pT1 or pT2; extension no longer raises it to pT3.', 'tumourExtension');
  }
  if (/^Ductal adenocarcinoma/.test(v.histType || '') && (!v.grade || /^Not applicable/.test(v.grade))) {
    err('Histologic grade is required for ductal carcinoma.', 'grade');
  }
  if (/^Present, with no viable/.test(v.treatmentEffect || '') && !cr) {
    warn('Complete pathological response (score 0) recorded but the extension list is not "No evidence of primary tumour".', 'treatmentEffect');
  }
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
