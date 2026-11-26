// Shared synoptic generator for standalone QMH Biomarker & Molecular test reports:
//   gyn_biomarkers, colon_her2, stomach_biomarkers, mmr_msi, pdl1_ihc,
//   dna_pcr_tests, rna_rtpcr_tests, fish_tests, ngs_tests.
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, checks } from './_house.js';

const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export function specimenName(part, ctx) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  const site = stripDot(v.siteDetail) || v.site || 'Tumour tissue';
  const blk = stripDot(v.blockNo) ? `, paraffin block (${stripDot(v.blockNo)})` : '';
  const testLabel = ctx?.schema?.shortName?.split('·')[1]?.trim() || 'biomarker testing';
  return `${uc1(site)}${blk}, for ${testLabel}`;
}

export function specimens(parts, ctx) {
  return parts.map((p) => `(${p.label}) ${specimenName(p, ctx)}`).join('\n');
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const blk = stripDot(v.blockNo) ? `Formalin-fixed paraffin-embedded block ${stripDot(v.blockNo)}` : 'Formalin-fixed paraffin-embedded tumour tissue';
  const cell = stripDot(v.tumourCellularityPct) ? ` (estimated tumour cellularity ${stripDot(v.tumourCellularityPct)}%)` : '';
  return `${tag}${blk}${cell} is selected for testing.`;
}

function mmrSummary(v) {
  const proteins = [
    ['MLH1', v.mlh1],
    ['PMS2', v.pms2],
    ['MSH2', v.msh2],
    ['MSH6', v.msh6]
  ].filter(([, val]) => val && val !== 'Not performed');
  if (!proteins.length) return null;
  const lost = proteins.filter(([, val]) => /^Loss/i.test(val)).map(([k]) => k);
  const intact = proteins.every(([, val]) => /^Intact/i.test(val));
  if (lost.length) return `Mismatch repair deficient (dMMR): loss of ${lost.join(' and ')}`;
  if (intact && proteins.length === 4) return 'Mismatch repair proficient (pMMR): intact nuclear expression of all four proteins';
  return 'Indeterminate / partial MMR panel';
}

export function microscopy() {
  return '';
}

export function molecular(part, ctx) {
  const v = part.values;
  const schema = ctx?.schema;
  const fields = schema?.fields || [];
  const skipIds = new Set(['specimenName', 'site', 'siteDetail', 'blockNo', 'additionalNotes']);
  const groups = new Map();

  for (const f of fields) {
    if (skipIds.has(f.id)) continue;
    const raw = v[f.id];
    if (raw === '' || raw === null || raw === undefined || raw === false) continue;
    if (Array.isArray(raw) && !raw.length) continue;
    const val = Array.isArray(raw) ? raw.join('; ') : (raw === true ? 'Present' : String(raw).trim());
    if (!val || val === 'Not performed' || val === 'Not applicable') continue;
    const g = f.group || 'Results';
    if (!groups.has(g)) groups.set(g, []);
    if (f.type === 'textarea') groups.get(g).push({ label: f.label, para: `${stripDot(val)}.` });
    else groups.get(g).push({ label: f.label, value: val });
  }

  const mmr = mmrSummary(v);
  if (mmr) {
    if (!groups.has('Interpretation')) groups.set('Interpretation', []);
    groups.get('Interpretation').unshift({ label: 'MMR summary', value: mmr });
  }

  if (stripDot(v.additionalNotes)) {
    groups.set('Additional notes', [{ label: 'Notes', para: `${stripDot(v.additionalNotes)}.` }]);
  }

  const sections = [...groups.entries()].map(([heading, items]) => ({ heading, items })).filter((s) => s.items.length);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part, ctx))}` : '';
  return renderSynoptic(sections, heading);
}

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const id = ctx?.schema?.id || '';
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part, ctx))}:`;
  const clauses = [];

  if (id === 'gyn_biomarkers') {
    if (v.p53Status && v.p53Status !== 'Not performed') clauses.push(`p53: ${v.p53Status}`);
    const mmr = mmrSummary(v);
    if (mmr) clauses.push(mmr);
    if (v.her2Ihc && v.her2Ihc !== 'Not performed') clauses.push(`HER2 IHC: ${v.her2Ihc}`);
    if (v.erStatus && v.erStatus !== 'Not performed') clauses.push(`ER: ${v.erStatus}${stripDot(v.erPct) ? ` (${stripDot(v.erPct)}%)` : ''}`);
    if (v.prStatus && v.prStatus !== 'Not performed') clauses.push(`PR: ${v.prStatus}${stripDot(v.prPct) ? ` (${stripDot(v.prPct)}%)` : ''}`);
    if (v.poleStatus && v.poleStatus !== 'Not performed') clauses.push(`POLE: ${v.poleStatus}`);
  } else if (id === 'colon_her2') {
    if (v.her2Ihc) clauses.push(`HER2 IHC: ${v.her2Ihc}`);
    if (v.her2Ish && v.her2Ish !== 'Not performed') clauses.push(`HER2 ISH: ${v.her2Ish}`);
  } else if (id === 'stomach_biomarkers') {
    if (v.her2Ihc && v.her2Ihc !== 'Not performed') clauses.push(`HER2 IHC: ${v.her2Ihc}`);
    if (v.pdl1Cps && v.pdl1Cps !== '') clauses.push(`PD-L1 (${v.pdl1Clone || '22C3'}): CPS ${v.pdl1Cps}`);
    if (v.cldn18Status && v.cldn18Status !== 'Not performed') clauses.push(`CLDN18.2: ${v.cldn18Status}`);
    const mmr = mmrSummary(v);
    if (mmr) clauses.push(mmr);
    if (v.eberStatus && v.eberStatus !== 'Not performed') clauses.push(`EBER ISH: ${v.eberStatus}`);
  } else if (id === 'mmr_msi') {
    const mmr = mmrSummary(v);
    if (mmr) clauses.push(mmr.toUpperCase());
    if (v.msiStatus && v.msiStatus !== 'Not performed') clauses.push(`MSI molecular: ${v.msiStatus}`);
  } else if (id === 'pdl1_ihc') {
    const bits = [`PD-L1 (${v.pdl1Clone || '22C3'})`];
    if (stripDot(v.tpsScore)) bits.push(`TPS ${stripDot(v.tpsScore)}%`);
    if (stripDot(v.cpsScore)) bits.push(`CPS ${stripDot(v.cpsScore)}`);
    if (stripDot(v.icScore)) bits.push(`IC ${stripDot(v.icScore)}%`);
    clauses.push(bits.join(', '));
    if (v.interpretation) clauses.push(v.interpretation);
  } else if (id === 'dna_pcr_tests' || id === 'rna_rtpcr_tests' || id === 'fish_tests' || id === 'ngs_tests') {
    if (v.overallResult) clauses.push(`${(v.assayPanel || ctx?.schema?.label || 'Molecular test').toUpperCase()}: ${v.overallResult}`);
    if (stripDot(v.variantsDetected)) clauses.push(`Alteration(s): ${stripDot(v.variantsDetected)}`);
  }

  if (!clauses.length) clauses.push('See synoptic biomarker report');
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part, ctx) {
  const v = part.values;
  const id = ctx?.schema?.id || '';
  const { out, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  const mmr = mmrSummary(v);
  if (mmr && /MLH1/.test(mmr) && /dMMR/.test(mmr)) {
    info('Loss of MLH1/PMS2: consider BRAF V600E (colorectal) or MLH1 promoter hypermethylation testing to separate sporadic dMMR from Lynch syndrome.', 'mlh1');
  }
  if (id === 'pdl1_ihc' && /Inadequate/i.test(v.adequacy || '')) {
    warn('Fewer than 100 viable tumour cells: PD-L1 result may be unreliable.', 'adequacy');
  }
  if (arr(v.preAnalyticWarnings).length) {
    warn('Pre-analytic caveat noted — interpret with caution.');
  }
  return out;
}

export default { specimenName, specimens, macro, microscopy, molecular, diagnosis, validate };
