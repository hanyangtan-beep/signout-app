// Ampulla of Vater carcinoma resection generator — the ampullary half of the Whipple pair.
// Elements follow the CAP protocol Ampulla of Vater v4.3.0.0 (June 2025, required use March
// 2026) in the CAP order, with the same house departures as the pancreatic template
// (docs/specs/whipple-pair.md): the "- Tumour histology:" paragraph follows "- Histologic
// grade:", the treatment-effect strings are the house CAP TRG variants, margin distances are in
// mm, British spelling throughout.
//
// pTNM is derived by src/staging/ampulla.js and printed only with `options.printPTNM`, stamped
// (AJCC 8th edition). Unlike the pancreatic chapter this one is an extension chapter: size never
// enters pT, and the pT3a/pT3b split turns entirely on whether pancreatic invasion is 0.5 cm or
// less. `pancreasDepthCm` is therefore required whenever pancreatic invasion is ticked, and the
// validator says so rather than letting the lower category be assigned by default.
//
// Specimen, margins, node stations, origin assignment and macro come from generators/_whipple.js,
// shared with generators/pancreas_carcinoma.js. This template adds the pancreatic duct and
// duodenal mucosal margins, which the pancreatic template does not carry.
// Wording is protected by tests/ampulla_carcinoma.test.js — change it only deliberately.

import { typeMorphology, IHC_PHRASE } from './ampulla_morphology.js';
import { deriveTNM, stageLine } from '../src/staging/index.js';
import * as S from '../src/staging/ampulla.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { letteredBlockKey, checks } from './_house.js';
import * as W from './_whipple.js';

const { num, fmt, lc1, uc1, arr, listJoin, chosen, specify, stripDot } = W;

const TEMPLATE = 'ampulla';

// The tumour-extension check-list, verbatim in the schema; the deepest ticked box governs pT
// (ranks in src/staging/ampulla.js).
export const EXTENSION = {
  tis: 'Carcinoma in situ / high-grade dysplasia, including intra-ampullary papillary-tubular neoplasm with high-grade dysplasia',
  t1a: 'Limited to the ampulla of Vater or sphincter of Oddi',
  t1b_peri: 'Invades beyond the sphincter of Oddi (perisphincteric invasion)',
  t1b_sm: 'Invades into the duodenal submucosa',
  t2: 'Invades into the muscularis propria of the duodenum',
  t3panc: 'Invades the pancreas',
  t3soft: 'Extends into peripancreatic soft tissue, periduodenal tissue or duodenal serosa',
  t4: /^(Coeliac axis|Superior mesenteric artery|Common hepatic artery)$/,
  organ: 'Invades other adjacent organ(s) or structure(s) other than the pancreas (specify)',
  tx: 'Cannot be determined',
  t0: 'No evidence of primary tumour'
};

const isPT0 = (v) => arr(v.tumourExtension).some((s) => /^No evidence of primary/i.test(s));
const isTis = (v) => { const t = arr(v.tumourExtension); return t.length === 1 && /^Carcinoma in situ/i.test(t[0]); };
const hasPancreasInvasion = (v) => arr(v.tumourExtension).some((s) => S.PANCREAS_RE.test(s));

// ---------- specimen ----------

export const procedureText = W.procedureText;
export const procedurePhrase = W.procedurePhrase;

export function siteText(v) {
  const s = v.tumourSite || '';
  if (!s || /^Not specified/.test(s)) return '';
  if (/^Other \(specify\)/.test(s)) return stripDot(v.tumourSiteOther) || '';
  return specify(s);
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const proc = procedurePhrase(v);
  return `Ampulla of Vater, pancreas and duodenum${proc ? `, ${proc}` : ''}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part, ctx) { return deriveTNM(part.values, 'ampulla'); }

// ---------- macro ----------

export function macro(part, ctx) {
  const v = part.values;
  let sentence = W.tumourFragment(v, 'ampulla of Vater');
  const duct = [];
  if (stripDot(v.bileDuctDilatation)) duct.push(`the common bile duct is dilated to ${stripDot(v.bileDuctDilatation)} mm`);
  if (stripDot(v.pancDuctDilatation)) duct.push(`the pancreatic duct is dilated to ${stripDot(v.pancDuctDilatation)} mm`);
  if (duct.length) sentence += ` ${uc1(listJoin(duct))}.`;
  sentence += ' The ampulla is bisected along the probed common bile duct and pancreatic duct and embedded in full.';
  return W.whippleMacro(part, ctx, { tumourSentence: sentence });
}

// ---------- block key ----------

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered });

// ---------- values shared by synoptic and diagnosis ----------

export const histTypeName = (v) => (v.histType === 'Other histologic type not listed (specify)'
  ? (v.histTypeOther || '').trim() || 'Histologic type not specified'
  : v.histType || 'Histologic type not specified');

export function shortTypeName(v) {
  let t = specify(histTypeName(v)).replace(/ \(specify components\)$/, '');
  if (/^Mixed neuroendocrine/.test(t) && stripDot(v.histTypeOther)) t = `Mixed neuroendocrine-non-neuroendocrine neoplasm (${stripDot(v.histTypeOther)})`;
  return t;
}

const gradeShort = (v) => (!v.grade || /^(GX|Not applicable|Other)$/.test(v.grade) ? (stripDot(v.gradeOther) || '') : v.grade.replace(/^G\d, /, ''));

/** Highest-ranked ticked extension row, with its label. */
function deepestExtension(v) {
  const ticks = arr(v.tumourExtension);
  if (!ticks.length) return null;
  const rows = [];
  for (const s of ticks) {
    for (const [re, rank, cat] of S.EXTENSION_T) {
      if (re.test(s)) { if (rank > 0) rows.push({ rank, cat, label: s }); break; }
    }
  }
  return rows.length ? rows.reduce((a, b) => (b.rank > a.rank ? b : a)) : null;
}

/** The invasion clause for the histology sentence and the diagnosis. */
export function extensionPhrase(v) {
  const deep = deepestExtension(v);
  if (!deep) return '';
  const s = deep.label;
  if (s === EXTENSION.t1a) return 'limited to the ampulla of Vater and sphincter of Oddi';
  if (s === EXTENSION.t1b_peri) return 'invading beyond the sphincter of Oddi into perisphincteric tissue';
  if (s === EXTENSION.t1b_sm) return 'invading the duodenal submucosa';
  if (s === EXTENSION.t2) return 'invading the muscularis propria of the duodenum';
  if (S.PANCREAS_RE.test(s)) {
    const d = num(v.pancreasDepthCm);
    return d === null ? 'invading the pancreas' : `invading the pancreas to a depth of ${fmt(d)} cm`;
  }
  if (s === EXTENSION.t3soft) return 'extending into peripancreatic soft tissue';
  if (EXTENSION.t4.test(s)) return `involving the ${lc1(s)}`;
  if (/other adjacent organ/i.test(s)) return `directly invading the ${lc1(stripDot(v.extensionDetail) || 'adjacent structures')}`;
  return '';
}

export function ihcPhrase(v) {
  const picks = chosen(v.ihc).map((s) => IHC_PHRASE[s] || lc1(s)).filter(Boolean);
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
  const extTicks = arr(v.tumourExtension);
  const extVal = extTicks.length
    ? listJoin(extTicks.map((s) => {
      if (/\(specify\)$/.test(s) && stripDot(v.extensionDetail)) return `${s.replace(/\s*\(specify\)$/, '')}: ${stripDot(v.extensionDetail)}`;
      if (S.PANCREAS_RE.test(s) && num(v.pancreasDepthCm) !== null) return `${s} (depth ${fmt(num(v.pancreasDepthCm))} cm)`;
      return s;
    }))
    : 'Not recorded';
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Origin', W.originText(v)),
      item('Tumour site', siteText(v) || 'Not specified'),
      item('Tumour size', sizeTextValue(v))
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', stripDot(v.grade) || stripDot(v.gradeOther) || null) : null,
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Sites involved by direct extension', extVal),
      hasPancreasInvasion(v) ? item('Depth of pancreatic invasion', num(v.pancreasDepthCm) !== null ? `${fmt(num(v.pancreasDepthCm))} cm` : 'Not recorded') : null,
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
  if (!arr(v.tumourExtension).length && !cr) err('Sites involved by direct extension are required to assign pT.', 'tumourExtension');
  if (hasPancreasInvasion(v) && num(v.pancreasDepthCm) === null) {
    err('Depth of pancreatic invasion is required: the pT3a / pT3b split turns on the 0.5 cm threshold.', 'pancreasDepthCm');
  }
  if (arr(v.tumourExtension).some((s) => /\(specify\)$/.test(s)) && !stripDot(v.extensionDetail)) warn('An extension option needs specifying.', 'extensionDetail');
  if (!cr && num(v.tumourSizeCm) === null && !/^Not applicable|^Cannot be determined/.test(v.sizeMode || '')) warn('Tumour size is not recorded.', 'tumourSizeCm');
  // The subtype panel is what separates pancreaticobiliary from intestinal type, and the two
  // behave differently enough that leaving the type as NOS on a resection is worth flagging.
  if (/^Adenocarcinoma, NOS$|^Carcinoma, NOS$/.test(v.histType || '') && !chosen(v.ihc).length) {
    warn('Histologic type left as NOS with no subtype panel recorded; CK7, CK20, CDX2, MUC1 and MUC2 separate pancreaticobiliary from intestinal type.', 'ihc');
  }
  if (/^Present, with no viable/.test(v.treatmentEffect || '') && !cr) {
    warn('Complete pathological response (score 0) recorded but the extension list is not "No evidence of primary tumour".', 'treatmentEffect');
  }
  // Ampullectomy cannot assess the pancreatic, uncinate or bowel margins the chapter expects.
  if (/^Ampullectomy/.test(v.procedure || '') && arr(v.tumourExtension).some((s) => S.PANCREAS_RE.test(s) || /peripancreatic/i.test(s))) {
    warn('Ampullectomy with invasion beyond the duodenal wall: the retroperitoneal and pancreatic margins are not represented in this specimen; consider pancreaticoduodenectomy.', 'procedure');
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
  return W.prefillFromFrozenMargin(fv, 'ampulla');
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging, prefillFromFrozen };
