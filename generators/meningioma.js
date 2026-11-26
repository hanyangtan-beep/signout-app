// Meningioma resection — synoptic report
// (QMH CNS-Meningioma, WHO CNS5 5th edition 2021).

import { deriveTNM } from '../src/staging/index.js';
import * as S from '../src/staging/meningioma.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
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
  if (typed) return uc1(typed);
  const lat = v.laterality && !/Not specified|Midline/i.test(v.laterality) ? `${v.laterality} ` : '';
  return `${uc1(`${lat}${lc1(v.site || 'dural')} mass`)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'meningioma'); }

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
  const dims = sizeText(v.specimenDims, 'cm');
  const bits = [`${tag}Received in formalin is a ${proc} specimen${dims ? ` measuring ${dims}` : ''}.`];
  const sz = num(v.sizeMm);
  if (sz !== null) bits.push(`Sectioning reveals a ${fmt(sz)} mm firm lobulated tan-white dural-based mass.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Meningothelial meningioma': 'Lobules and syncytial sheets of uniform epithelioid meningothelial cells with indistinct cell borders, pale eosinophilic cytoplasm, round-to-oval nuclei, delicate chromatin, intranuclear pseudoinclusions and occasional cellular whorls are separated by thin fibrovascular septa.',
  'Fibrous meningioma': 'Intersecting fascicles of bland elongated spindle cells are embedded within an abundant collagenous and reticulin-rich intercellular matrix.',
  'Transitional meningioma': 'Combined meningothelial lobules with prominent concentric whorls and psammoma bodies transition smoothly into fascicular fibrous zones.',
  'Psammomatous meningioma': 'Confluent lamellated calcified psammoma bodies vastly predominate over intervening meningothelial whorls and spindle cells.',
  'Angiomatous meningioma': 'Numerous tightly packed small-to-medium hyalinised blood vessels comprise > 50% of the tumour area amidst intervening meningothelial cells.',
  'Microcystic meningioma': 'Cobweb-like architecture of elongated vacuolated meningothelial cells surrounds abundant pale eosinophilic intercellular microcysts.',
  'Secretory meningioma': 'Meningothelial lobules contain numerous intracellular PAS-positive eosinophilic hyaline pseudopsammoma bodies surrounded by CEA/cytokeratin-positive glandular-like lumina.',
  'Lymphoplasmacyte-rich meningioma': 'Extensive chronic inflammatory infiltrate of mature lymphocytes and plasma cells partially obscures underlying meningothelial lobules.',
  'Metaplastic meningioma': 'Meningothelial tumour exhibits prominent mesenchymal metaplasia (lipomatous, osseous, cartilaginous, myxoid or xanthomatous).',
  'Chordoid meningioma': 'Cords and trabeculae of epithelioid vacuolated meningothelial cells are set within an abundant basophilic mucoid/myxoid stroma resembling chordoma.',
  'Clear cell meningioma': 'Patternless sheets of polygonal meningothelial cells with abundant optically clear glycogen-rich cytoplasm are traversed by broad blocky interstitial and perivascular collagen bands.',
  'Atypical meningioma': 'Meningothelial proliferation demonstrates elevated mitotic activity (4–19/10 HPF), brain invasion and/or >= 3 atypical histologic features.',
  'Papillary meningioma': 'Perivascular pseudopapillary architecture of discohesive meningothelial cells radiates around fibrovascular cores.',
  'Rhabdoid meningioma': 'Sheets of plump rhabdoid meningothelial cells display eccentric vesicular nuclei, prominent nucleoli and paranuclear eosinophilic hyaline inclusions.',
  'Anaplastic (malignant) meningioma': 'Markedly pleomorphic malignant meningothelial proliferation displays frank anaplasia and/or >= 20 mitoses/10 HPF with geographic necrosis.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const g = S.deriveCnsGrade(v);
  let s = `Sections show ${lc1(v.histType || 'Meningothelial meningioma')}, ${g.grade}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const mit = num(v.mitosesPer10Hpf);
  const ki = num(v.ki67Pct);
  const prol = [mit !== null ? `Mitotic count is ${fmt(mit)} per 10 HPF (1.6 mm2)` : '', ki !== null ? `Ki-67 labelling index is ${fmt(ki)}%` : ''].filter(Boolean).join('; ');
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, prol ? `${prol}.` : '', ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const g = S.deriveCnsGrade(v);
  const sz = num(v.sizeMm);
  const mit = num(v.mitosesPer10Hpf);
  const ki = num(v.ki67Pct);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Anatomic location', v.site || 'Not specified'),
      item('Laterality', v.laterality || 'Not specified'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'WHO CNS5 grading & microscopic findings', items: [
      item('Morphological subtype (WHO CNS5)', v.histType || 'Meningothelial meningioma'),
      mit !== null ? item('Mitotic count', `${fmt(mit)} per 10 HPF (1.6 mm2)`) : null,
      item('Brain invasion', v.brainInvasion || 'Not identified'),
      arr(v.atypicalFeatures).length ? item('Atypical histologic features', arr(v.atypicalFeatures).join('; ')) : null,
      v.tertPromoter && v.tertPromoter !== 'Not performed' ? item('TERT promoter', v.tertPromoter) : null,
      v.cdkn2ab && v.cdkn2ab !== 'Not performed' ? item('CDKN2A/B', v.cdkn2ab) : null,
      ki !== null ? item('Ki-67 labelling index', `${fmt(ki)}%`) : null,
      item('Dural / bone invasion', v.duralBoneInvasion || ''),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    ctx?.options?.printPTNM ? { heading: 'Integrated diagnosis (WHO CNS5)', items: [
      item('CNS WHO grade', `${g.grade} (${g.reason})`)
    ] } : null,
    { heading: 'Additional findings', items: [
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
  const g = S.deriveCnsGrade(v);
  const clauses = [`${(v.histType || 'Meningothelial meningioma').toUpperCase()}, ${g.grade}`];
  if (/^Present/i.test(v.brainInvasion || '')) clauses.push('Brain invasion present');
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part) {
  const v = part.values;
  const { out, err, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Morphological subtype not recorded.', 'histType');
  for (const l of S.referenceLines(v)) info(l);
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
