// Site-aware GI neuroendocrine tumour resection — synoptic report
// (CAP GI NET protocols, WHO 5th edition, AJCC 8th edition Chapters 29–33).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/gi_net.js';
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

function siteLabel(v) {
  return v.site || S.SITES.jejunumIleum;
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  return `${siteLabel(v)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'gi_net'); }

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
  const bits = [`${tag}Received in formalin is a ${proc} specimen from the ${lc1(siteLabel(v))}${dims ? ` measuring ${dims}` : ''}.`];
  const sz = num(v.sizeMm);
  if (sz !== null) {
    bits.push(`Sectioning reveals a well-circumscribed ${fmt(sz)} mm tan-yellow submucosal/intramural nodule.`);
  }
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Well-differentiated neuroendocrine tumour (NET)': 'Well-differentiated epithelial neoplasm arranged in organoid nests, trabeculae, ribbons and acinar or pseudorosette structures within a richly vascularised, variably fibrous stroma. Tumour cells are monotonous and round-to-oval with finely granular eosinophilic-to-amphophilic cytoplasm and uniform round nuclei featuring coarsely stippled ("salt-and-pepper") chromatin and inconspicuous nucleoli. Absence of coagulative tumour necrosis and strong diffuse synaptophysin, chromogranin A and INSM1 expression are characteristic.',
  'ECL-cell neuroendocrine tumour (gastric)': 'Small nests, trabeculae, ribbons and acinar clusters of uniform enterochromaffin-like cells with finely granular eosinophilic cytoplasm and stippled chromatin infiltrate the lamina propria and submucosa. Arises against a background of chronic autoimmune atrophic gastritis with intestinal metaplasia and linear-to-micronodular ECL-cell hyperplasia in type 1 disease, or Zollinger-Ellison / MEN1-associated parietal cell hyperplasia in type 2 disease. Strong synaptophysin, chromogranin A and VMAT2 reactivity with low proliferative kinetics is typical.',
  'EC-cell, serotonin-producing neuroendocrine tumour': 'Insular nests, solid sheets and peripheral acinar palisading with retraction artefact infiltrate the bowel wall, composed of uniform polygonal cells containing bright eosinophilic subnuclear neurosecretory granules. Nuclei are round and uniform with coarsely stippled chromatin and inconspicuous nucleoli. Marked mesenteric elastotic vascular sclerosis and dense stromal desmoplasia frequently cause bowel kinking and ischaemia, with tumour cells expressing serotonin, CDX2 and SSTR2A.',
  'Gastrin-producing neuroendocrine tumour (gastrinoma)': 'Trabecular, gyriform and pseudorosette ribbons of monomorphic neuroendocrine cells with uniform stippled nuclei and scant-to-moderate eosinophilic cytoplasm infiltrate the duodenal submucosa and Brunner gland zone. Stroma is delicately vascularised with variable fibrosis and occasional psammomatous calcification. Tumour cells express gastrin, synaptophysin and chromogranin A, and may occur sporadically or in association with MEN1.',
  'Somatostatin-producing neuroendocrine tumour': 'Glandular, pseudoglandular and trabecular acinar formations lined by uniform eosinophilic neuroendocrine cells infiltrate the ampullary or periampullary duodenal wall. Lumina characteristically contain concentric lamellated calcified psammoma bodies. Strongly associated with neurofibromatosis type 1 (NF1) when located in the periampullary duodenum, with tumour cells demonstrating diffuse somatostatin immunoreactivity.',
  'L-cell, glucagon-like peptide / PP-producing neuroendocrine tumour': 'Slender anastomosing trabeculae, serpentine ribbons and pseudorosettes of uniform columnar-to-polygonal cells with bland stippled nuclei and pale eosinophilic cytoplasm infiltrate the mucosa and submucosa. Typically arises in the rectum or distal colon as a small circumscribed submucosal nodule lacking prominent stromal desmoplasia. Tumour cells characteristically express prostatic acid phosphatase (PAP), glucagon-like peptides and pancreatic polypeptide, with variable chromogranin A.',
  'Tubular neuroendocrine tumour (appendiceal)': 'Discrete small tubules, short cords and occasional tear-drop acini lined by uniform cuboidal neuroendocrine cells infiltrate the appendiceal muscularis and submucosa without intracytoplasmic mucin. The stroma is variably fibrotic without significant desmoplasia, and overlying mucosa is intact. L-cell differentiation with glucagon/PP expression distinguishes it from goblet cell adenocarcinoma and conventional appendiceal adenocarcinoma.',
  'Clear cell neuroendocrine tumour': 'Organoid nests and trabeculae of uniform neuroendocrine cells display abundant optically clear, lipid-rich or microvesicular cytoplasm with preserved central round nuclei and coarsely stippled chromatin. Delicate capillary networks invest the tumour lobules without coagulative necrosis. Frequently associated with von Hippel-Lindau (VHL) syndrome or MEN1, requiring exclusion of metastatic clear cell renal cell carcinoma.',
  'Other neuroendocrine tumour subtype (specify)': 'Well-differentiated organoid architecture with nests, trabeculae or ribbons and uniform round-to-oval nuclei exhibiting coarsely stippled neuroendocrine chromatin are present within a delicate vascular stroma.'
};

const GRADE_NOTE = {
  'G1: Well-differentiated neuroendocrine tumour': 'Proliferative activity is low (< 2 mitoses/2 mm2 and Ki-67 < 3%).',
  'G2: Well-differentiated neuroendocrine tumour': 'Proliferative activity is intermediate (mitoses 2–20/2 mm2 or Ki-67 3–20%).',
  'G3: Well-differentiated neuroendocrine tumour': 'Organoid neuroendocrine morphology is preserved with elevated proliferative activity (mitoses > 20/2 mm2 or Ki-67 > 20%).'
};

export function histTypeName(v) {
  const t = v.histType || 'Well-differentiated neuroendocrine tumour (NET)';
  if (t === 'Other neuroendocrine tumour subtype (specify)') {
    return uc1(stripDot(v.histTypeOther)) || 'Well-differentiated neuroendocrine tumour';
  }
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  if (v.noPrimary === true) {
    return 'Extensive sampling shows fibrosis and scar tissue with no residual neuroendocrine tumour identified.';
  }
  const gr = v.grade || 'G1: Well-differentiated neuroendocrine tumour';
  const grShort = gr.split(':')[0];
  let s = `Sections of the ${lc1(siteLabel(v))} show a ${lc1(histTypeName(v))} (${grShort}).`;
  const morph = TYPE_MORPH[v.histType || ''] || TYPE_MORPH['Well-differentiated neuroendocrine tumour (NET)'];
  s += ` ${morph}`;
  if (GRADE_NOTE[gr]) s += ` ${GRADE_NOTE[gr]}`;
  if (stripDot(v.ihcText)) s += ` ${uc1(stripDot(v.ihcText))}.`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by tumour';
  const items = [{ label: 'Surgical margins', value: st }];
  const d = num(v.closestMarginMm);
  if (d !== null && /uninvolved/i.test(st)) {
    items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm${stripDot(v.closestMarginSite) ? ` (${lc1(stripDot(v.closestMarginSite))})` : ''}` });
  }
  if (/involved/i.test(st) && stripDot(v.involvedMarginDetail)) {
    items.push({ label: 'Involved margin(s)', value: uc1(stripDot(v.involvedMarginDetail)) });
  }
  return items;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const site = stripDot(v.nodeSites);
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved${site ? ` (${site})` : ''}` }];
  if (v.site === S.SITES.jejunumIleum && v.mesentericMassOver20mm === true) {
    items.push({ label: 'Large mesenteric mass (> 20 mm)', value: 'Present' });
  }
  if (inv > 0) {
    if (v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
    const dep = num(v.largestDepositMm);
    if (dep !== null) items.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm` });
  }
  return items;
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) {
    const detail = stripDot(v.distantMetsOther);
    return listJoin(sites.map((s) => (s === S.METS.other ? detail || 'other extrahepatic site' : s)).map((s, i) => (i ? lc1(s) : s)));
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
  const mit = num(v.mitoticCount);
  const ki = num(v.ki67Pct);

  const gradeSub = [];
  if (mit !== null) gradeSub.push({ label: 'Mitotic rate', value: `${fmt(mit)} mitoses / 2 mm2` });
  if (ki !== null) gradeSub.push({ label: 'Ki-67 labelling index', value: `${fmt(ki)}%` });

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', siteLabel(v)),
      item('Tumour focality', v.focality || 'Unifocal'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      { label: 'Histologic grade', value: v.grade || 'Not specified', sub: gradeSub },
      item('Tumour extension (depth of invasion)', v.depth || 'Not specified'),
      v.site === S.SITES.appendix && num(v.mesoappendixMm) !== null ? item('Mesoappendiceal invasion depth', `${fmt(num(v.mesoappendixMm))} mm`) : null,
      item('Tumour necrosis', v.necrosis || 'Not identified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      arr(v.additionalFindings).length || stripDot(v.additionalOther)
        ? item('Additional pathologic findings', [...arr(v.additionalFindings), stripDot(v.additionalOther) ? uc1(stripDot(v.additionalOther)) : ''].filter(Boolean).join('; '))
        : null,
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

export function molecular(part) {
  const v = part.values;
  const items = [];
  if (v.sstr2 && v.sstr2 !== 'Not performed') items.push({ label: 'SSTR2A IHC', value: v.sstr2 });
  if (stripDot(v.molecularNotes)) items.push({ label: 'Other molecular studies', value: uc1(stripDot(v.molecularNotes)) });
  if (!items.length) return '';
  return renderSynoptic([{ heading: 'Molecular studies', items }], '');
}

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const sz = num(v.sizeMm);
  const grShort = (v.grade || 'G1: Well-differentiated neuroendocrine tumour').split(':')[0];
  const first = [`${histTypeName(v).toUpperCase()}, ${grShort}`];
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];

  const ki = num(v.ki67Pct);
  const mit = num(v.mitoticCount);
  if (mit !== null || ki !== null) {
    const bits = [];
    if (mit !== null) bits.push(`mitotic rate ${fmt(mit)}/2 mm2`);
    if (ki !== null) bits.push(`Ki-67 index ${fmt(ki)}%`);
    clauses.push(uc1(bits.join(', ')));
  }

  clauses.push(v.marginStatus || 'All margins uninvolved by tumour');

  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) {
    let np = `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
    if (inv > 0 && v.ene === 'Present') np += '; extranodal extension present';
    clauses.push(np);
  }

  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) clauses.push(`${st.tnm} (${st.edition})`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);

  if (!v.site) err('Anatomical site not recorded.', 'site');
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.grade) err('WHO grade not recorded.', 'grade');

  const mit = num(v.mitoticCount);
  const ki = num(v.ki67Pct);
  let expected = null;
  if ((mit !== null && mit > 20) || (ki !== null && ki > 20)) expected = 'G3';
  else if ((mit !== null && mit >= 2) || (ki !== null && ki >= 3)) expected = 'G2';
  else if (mit !== null || ki !== null) expected = 'G1';
  if (expected && v.grade && /^G[123]\b/.test(v.grade) && !v.grade.startsWith(expected)) {
    warn(`Recorded mitotic rate / Ki-67 corresponds to ${expected}, but selected grade is ${v.grade.split(':')[0]}.`, 'grade');
  }

  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');

  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, diagnosis, validate, staging };
