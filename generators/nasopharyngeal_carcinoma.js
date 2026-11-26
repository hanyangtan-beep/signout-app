// Nasopharyngeal carcinoma resection — synoptic report
// (QMH HN-Nasopharynx, CAP Nasopharynx 1.0.0.0, WHO 5th edition, AJCC 9th edition).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/nasopharynx.js';
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
  return `Nasopharynx, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'nasopharynx'); }

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
  if (sz !== null) bits.push(`Sectioning reveals an irregular ${fmt(sz)} mm firm tan-grey submucosal mass.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Non-keratinising squamous cell carcinoma, undifferentiated subtype': 'Syncytial sheets (Regaud pattern) and irregular anastomosing cords (Schmincke pattern) of large polygonal to spindle epithelial cells with indistinct cell borders, round-to-oval vesicular nuclei and prominent single eosinophilic nucleoli infiltrate amidst a dense reactive lymphoplasmacytic infiltrate.',
  'Non-keratinising squamous cell carcinoma, differentiated subtype': 'Stratified plexiform sheets and cellular islands with more distinct cell borders, vaguely pavemented architecture and occasional intercellular bridges infiltrate without overt keratin pearl formation.',
  'Squamous cell carcinoma, keratinising, NOS': 'Irregular infiltrating nests and cords of atypical squamous cells exhibit definite cytoplasmic keratinisation, keratin pearls and intercellular bridges within a desmoplastic stroma.',
  'Basaloid squamous cell carcinoma': 'Solid lobules of small basaloid cells with scant cytoplasm, hyperchromatic nuclei, peripheral nuclear palisading and central comedonecrosis are accompanied by focal squamous differentiation and basement membrane-like stromal hyalinisation.',
  'Low-grade nasopharyngeal papillary adenocarcinoma': 'Exophytic arborising fibrovascular papillae and crowded glands are lined by uniform cuboidal-to-columnar cells with round-to-oval optically clear or grooved nuclei, inconspicuous nucleoli and rare mitoses.',
  'Neuroendocrine tumour, grade 1': 'Organoid nests and trabeculae of uniform neuroendocrine cells with stippled chromatin exhibit low proliferative activity (< 2 mitoses/2 mm2, Ki-67 < 3%).',
  'Neuroendocrine tumour, grade 2': 'Well-differentiated organoid neuroendocrine proliferations with stippled chromatin exhibit intermediate proliferative activity (mitoses 2–20/2 mm2 or Ki-67 3–20%).',
  'Neuroendocrine tumour, grade 3': 'Organoid neuroendocrine morphology is preserved with elevated proliferative activity (> 20 mitoses/2 mm2 or Ki-67 > 20%).',
  'Neuroendocrine carcinoma, small cell type': 'Diffuse sheets of small cells with scant cytoplasm, finely granular chromatin, nuclear moulding, crush artefact, extensive necrosis and > 20 mitoses/2 mm2 infiltrate the nasopharyngeal wall.',
  'Neuroendocrine carcinoma, large cell type': 'Organoid nests and trabeculae of large pleomorphic cells with abundant cytoplasm, coarse chromatin, prominent nucleoli, geographic necrosis and > 20 mitoses/2 mm2 infiltrate the wall.',
  'Combined (or composite) neuroendocrine carcinoma (specify types)': 'High-grade neuroendocrine carcinoma is intimately admixed with a distinct non-neuroendocrine carcinoma component.',
  'Carcinoma, type cannot be determined': 'Infiltrating malignant epithelial cells are present without definitive lineage-specific features.',
  'Other histologic type not listed (specify)': 'Infiltrating malignant nasopharyngeal neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Non-keratinising squamous cell carcinoma, undifferentiated subtype';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections of the nasopharynx show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const eberText = v.eber && v.eber !== 'Not performed' ? `EBV (EBER ISH) is ${lc1(v.eber)}.` : '';
  const p16Text = v.p16 && v.p16 !== 'Not performed' ? `p16 immunohistochemistry is ${lc1(v.p16)}.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, eberText, p16Text, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'Uninvolved by invasive carcinoma';
  const items = [{ label: 'Surgical margins', value: st }];
  const d = num(v.closestMarginMm);
  const site = stripDot(v.closestMarginSite);
  if (d !== null && /uninvolved/i.test(st)) {
    items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm${site ? ` (${lc1(site)})` : ''}` });
  } else if (/involved/i.test(st) && site) {
    items.push({ label: 'Involved margin(s)', value: uc1(site) });
  }
  return items;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved` }];
  if (inv > 0) {
    if (v.nodeLaterality) items.push({ label: 'Nodal laterality', value: v.nodeLaterality });
    const l = num(v.largestNodeMm);
    if (l !== null) items.push({ label: 'Largest involved lymph node', value: `${fmt(l)} mm` });
    if (v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
  }
  return items;
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) {
    const detail = stripDot(v.distantMetsOther);
    return listJoin(sites.map((s) => (s === S.METS.other ? detail || 'other site' : s)).map((s, i) => (i ? lc1(s) : s)));
  }
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sz = num(v.sizeMm);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', v.site || 'Nasopharynx, not otherwise specified'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', v.grade) : null,
      item('Tumour extent', v.extension || 'Not specified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('EBV (EBER ISH)', v.eber || 'Not performed'),
      v.p16 && v.p16 !== 'Not performed' ? item('HPV status (p16 IHC)', v.p16) : null,
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [
      item('Distant metastasis', metastasisValue(v) || 'Not identified'),
      v.metastasisBurden ? item('Metastatic lesion burden', v.metastasisBurden) : null
    ] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    stripDot(v.additionalNotes) ? { heading: 'Additional findings', items: [{ label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` }] } : null
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
  if (v.eber && v.eber !== 'Not performed') clauses.push(`EBV (EBER ISH) ${lc1(v.eber)}`);
  clauses.push(v.marginStatus || 'Uninvolved by invasive carcinoma');
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) clauses.push(`${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`);
  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
