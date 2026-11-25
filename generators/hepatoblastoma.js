// Hepatoblastoma (paediatric) resection — synoptic report (QMH Pedi-Hepatoblastoma,
// CAP Hepatoblastoma Resection 5.0.0.1, June 2025; WHO 5th edition).
// Note: No AJCC pTNM staging system is clinically applicable in hepatoblastoma;
// PRETEXT / POST-TEXT imaging staging is optionally recorded.

import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => { const a = items.filter(Boolean); return a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; };
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function procedureValue(v) {
  const p = v.procedure || '';
  if (!p) return 'Not specified';
  if (p === 'Other (specify)') return uc1(stripDot(v.procedureOther)) || 'Other';
  return p;
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  return typed ? uc1(typed) : `Liver, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) { return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n'); }

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
  const w = num(v.weight);
  const dims = sizeText(v.specimenDims, 'cm');
  const measures = [w !== null ? `weighing ${fmt(w)} g` : '', dims ? `measuring ${dims}` : ''].filter(Boolean);
  const bits = [`${tag}Received in formalin is a ${lc1(procedureValue(v))} specimen${measures.length ? ` ${listJoin(measures)}` : ''}.`];
  const sz = num(v.sizeMm);
  const site = v.site && v.site !== 'Not specified' ? lc1(v.site) : '';
  if (sz !== null) bits.push(`Sectioning reveals a ${fmt(sz)} mm lobulated variegated mass${site ? ` in the ${site}` : ''}.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

export function histTypeName(v) {
  const t = v.histType || '';
  if (!t) return 'Histologic type not specified';
  const extra = stripDot(v.histTypeOther);
  if (/\(specify\)$/.test(t)) return extra ? `${t.replace(/\s*\(specify\)$/, '')} (${extra})` : t.replace(/\s*\(specify\)$/, '');
  return t;
}

const TYPE_MORPH = {
  'Hepatoblastoma, epithelial type, fetal pattern (mitotically inactive / well differentiated)': 'Thin trabeculae (1–2 cells thick) and sheets of small uniform polygonal hepatoblasts with round central nuclei, inconspicuous nucleoli and alternating clear (glycogen/lipid-rich) and finely granular eosinophilic cytoplasm produce a classic "light and dark" pattern with extramedullary haematopoiesis and low mitotic activity (<= 2 mitoses/10 HPF).',
  'Hepatoblastoma, epithelial type, fetal pattern (mitotically active / crowded)': 'Closely packed sheets and trabeculae of fetal hepatoblasts with slightly larger nuclei, amphophilic-to-eosinophilic cytoplasm, higher nuclear-to-cytoplasmic ratios and increased mitotic activity (> 2 mitoses/10 HPF) are present.',
  'Hepatoblastoma, epithelial type, embryonal': 'Sheets, ribbons, pseudorosettes and primitive acini are composed of angulated hepatoblasts with scant basophilic cytoplasm, high nuclear-to-cytoplasmic ratios, coarse chromatin, prominent nucleoli and frequent mitoses.',
  'Hepatoblastoma, epithelial type, pleomorphic (poorly differentiated)': 'Sheets of markedly pleomorphic, large anaplastic hepatoblasts with irregular hyperchromatic nuclei, prominent nucleoli and atypical mitoses are present.',
  'Hepatoblastoma, epithelial type, macrotrabecular pattern': 'Broad thickened trabeculae (>= 5–10 cells thick) of fetal, embryonal or pleomorphic hepatoblasts mimic hepatocellular carcinoma and are lined by sinusoidal endothelium.',
  'Hepatoblastoma, epithelial type, small cell undifferentiated pattern': 'Diffuse sheets and nests of small round-to-oval discohesive cells with scant cytoplasm and hyperchromatic nuclei are present (INI1/SMARCB1 status is mandatory to exclude malignant rhabdoid tumour).',
  'Hepatoblastoma, mixed epithelial-mesenchymal without teratoid features': 'Epithelial fetal and/or embryonal hepatoblast components are intimately admixed with primitive spindle cell mesenchyme and osteoid-like matrix (with or without cartilage).',
  'Hepatoblastoma, mixed epithelial-mesenchymal with teratoid features': 'Epithelial and mesenchymal hepatoblastoma components are accompanied by heterologous teratoid elements (such as neuroectodermal tissue, melanin-containing cells, mucinous/squamous epithelium or striated muscle).',
  'Hepatocellular neoplasm, NOS': 'Malignant hepatocellular proliferation shows transitional features between hepatoblastoma and paediatric hepatocellular carcinoma (HCN-NOS).'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = lc1(histTypeName(v));
  let s = `Sections of the liver show ${what}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  if (morph) s += ` ${morph}`;
  if (stripDot(v.ihcText)) s += ` ${uc1(stripDot(v.ihcText))}.`;
  return s;
}

function treatmentValue(v) {
  const te = v.treatmentEffect || 'Not applicable';
  const pct = num(v.necrosisPct);
  if (/present/i.test(te) && pct !== null) return `${te} (${fmt(pct)}% tumour necrosis)`;
  return te;
}

function marginValue(v) {
  const st = v.marginStatus || 'Uninvolved by tumour';
  const d = num(v.closestMarginMm);
  if (/uninvolved/i.test(st) && d !== null) return `${st} (closest ${fmt(d)} mm${stripDot(v.closestMarginSite) ? `, ${lc1(stripDot(v.closestMarginSite))}` : ''})`;
  if (/involved/i.test(st) && stripDot(v.involvedMarginDetail)) return `${st} (${lc1(stripDot(v.involvedMarginDetail))})`;
  return st;
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const sz = num(v.sizeMm);
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', v.site || 'Not specified'),
      item('Tumour focality (within liver)', v.focality || 'Unifocal'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null,
      item('Macroscopic extent', arr(v.macroExtent).length ? arr(v.macroExtent).join('; ') : 'Tumour confined to liver'),
      v.afpLevel && v.afpLevel !== 'Not known' ? item('Serum alpha-fetoprotein (AFP) level', v.afpLevel) : null,
      stripDot(v.pretext) ? item('PRETEXT / POST-TEXT stage (imaging)', stripDot(v.pretext)) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (CAP / WHO 5th)', histTypeName(v)),
      item('Preoperative therapy history', v.preopTherapy || 'Preoperative therapy given'),
      item('Treatment effect / tumour necrosis', treatmentValue(v)),
      item('Macroscopic vascular invasion', v.macroVascular || 'Not identified'),
      item('Microscopic lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('INI1 (SMARCB1) IHC', v.ini1 || 'INI1 expression retained'),
      item('Glypican-3 IHC', v.glypican3 || 'Positive'),
      item('Beta-catenin IHC', v.betaCatenin || 'Positive (nuclear / cytoplasmic)'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: [item('Surgical margins', marginValue(v))] },
    ex !== null && ex > 0 ? { heading: 'Lymph nodes', items: [
      item('Regional lymph nodes', `${inv} of ${ex} involved${stripDot(v.nodeSites) ? ` (${stripDot(v.nodeSites)})` : ''}`),
      inv > 0 && v.ene ? item('Extranodal extension (ENE)', v.ene) : null
    ] } : null,
    { heading: 'Additional findings', items: [
      arr(v.backgroundLiver).length || stripDot(v.backgroundOther)
        ? item('Background liver', [...arr(v.backgroundLiver), stripDot(v.backgroundOther) ? uc1(stripDot(v.backgroundOther)) : ''].filter(Boolean).join('; '))
        : null,
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const sz = num(v.sizeMm);
  const first = [histTypeName(v).toUpperCase()];
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];

  if (v.preopTherapy === 'Preoperative therapy given' && num(v.necrosisPct) !== null) {
    clauses.push(`Post-chemotherapy tumour necrosis ${fmt(num(v.necrosisPct))}%`);
  }
  if (v.ini1 === 'INI1 expression lost') clauses.push('Loss of INI1 (SMARCB1) expression — see comment / correlate for rhabdoid tumour');
  clauses.push(`Surgical margins: ${lc1(marginValue(v))}`);

  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) clauses.push(`${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
  if (v.ini1 === 'INI1 expression lost') warn('INI1 (SMARCB1) loss detected: exclude malignant rhabdoid tumour of the liver (especially in small cell undifferentiated pattern with low AFP).', 'ini1');
  if (/small cell undifferentiated/i.test(v.histType || '') && v.ini1 === 'Not performed') warn('Small cell undifferentiated pattern requires INI1 (SMARCB1) IHC to exclude malignant rhabdoid tumour (CAP 5.0.0.1).', 'ini1');
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  info('Hepatoblastoma has no AJCC pTNM stage; PRETEXT / POST-TEXT imaging staging governs clinical risk stratification (CAP 5.0.0.1).');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate };
