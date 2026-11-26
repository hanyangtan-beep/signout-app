// Laryngeal carcinoma resection — synoptic report
// (QMH HN-Larynx, CAP Larynx 4.3.0.0, WHO 5th edition, AJCC 8th edition).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/larynx.js';
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
  return `Larynx, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'larynx'); }

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
  if (sz !== null) bits.push(`Opening the larynx posteriorly reveals a ${fmt(sz)} mm ulcerated / exophytic tumour involving the ${lc1(v.laterality || '')} ${lc1(v.subsite || 'glottis')}.`.replace(/\s+/g, ' '));
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Squamous cell carcinoma, conventional (keratinising)': 'Irregular infiltrating nests and cords of malignant squamous cells with eosinophilic cytoplasm, intercellular bridges, concentric keratin pearls and nuclear pleomorphism invade the laryngeal wall within a desmoplastic stroma.',
  'Squamous cell carcinoma, non-keratinising': 'Solid anastomosing nests and sheets of atypical squamous cells with high nuclear-to-cytoplasmic ratios and minimal keratinisation infiltrate the laryngeal stroma.',
  'Adenosquamous carcinoma': 'Biphasic malignant neoplasm combines invasive squamous cell carcinoma with a distinct mucin-producing glandular adenocarcinoma component.',
  'Basaloid squamous cell carcinoma': 'Solid lobules of hyperchromatic basaloid cells with peripheral palisading, comedonecrosis and stromal hyalinisation are accompanied by focal squamous differentiation.',
  'Papillary squamous cell carcinoma': 'Exophytic fibrovascular papillae lined by full-thickness malignant squamous epithelium demonstrate invasive nests at the stromal base.',
  'Spindle cell (sarcomatoid) squamous carcinoma': 'Polypoid proliferation of pleomorphic malignant spindle cells arranged in fascicles and storiform arrays arises beneath ulcerated or dysplastic laryngeal squamous mucosa.',
  'Verrucous squamous cell carcinoma': 'Exophytic hyperkeratotic papillomatous proliferation of bland well-differentiated squamous epithelium advances on a broad pushing front of bulbous rete pegs without cytologic atypia.',
  'Carcinoma cuniculatum': 'Deeply burrowing keratin-filled branching sinuses and crypts lined by well-differentiated stratified squamous epithelium with minimal nuclear atypia infiltrate deeply into laryngeal soft tissues.',
  'Lymphoepithelial carcinoma (non-nasopharyngeal)': 'Syncytial sheets of undifferentiated epithelial cells with vesicular nuclei and prominent nucleoli infiltrate amidst a dense reactive lymphoplasmacytic stroma.',
  'Neuroendocrine tumour, grade 1': 'Organoid nests and trabeculae of uniform neuroendocrine cells with stippled chromatin exhibit < 2 mitoses/2 mm2 and Ki-67 < 3%.',
  'Neuroendocrine tumour, grade 2': 'Well-differentiated organoid neuroendocrine proliferations exhibit intermediate proliferative activity (mitoses 2–20/2 mm2 or Ki-67 3–20%).',
  'Neuroendocrine tumour, grade 3': 'Organoid neuroendocrine morphology is preserved with elevated proliferative activity (> 20 mitoses/2 mm2 or Ki-67 > 20%).',
  'Neuroendocrine carcinoma, small cell type': 'Diffuse sheets of small hyperchromatic cells with scant cytoplasm, nuclear moulding, crush artefact, extensive necrosis and > 20 mitoses/2 mm2 infiltrate the larynx.',
  'Neuroendocrine carcinoma, large cell type': 'Organoid nests and trabeculae of large pleomorphic cells with coarse chromatin, prominent nucleoli, geographic necrosis and > 20 mitoses/2 mm2 infiltrate the larynx.',
  'Minor salivary gland-type carcinoma (specify)': 'Infiltrating malignant salivary-type neoplasm arises from laryngeal seromucinous glands.',
  'Carcinoma, type cannot be determined': 'Infiltrating malignant epithelial cells are present without lineage-specific architectural features.',
  'Other histologic type not listed (specify)': 'Infiltrating malignant laryngeal neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Squamous cell carcinoma, conventional (keratinising)';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const gr = v.grade && !/^Not applicable|GX/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the larynx show ${lc1(histTypeName(v))}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'Uninvolved by invasive carcinoma';
  const items = [{ label: 'Surgical margins (invasive)', value: st }];
  if (v.dysplasiaMargin) items.push({ label: 'Surgical margins (high-grade dysplasia / CIS)', value: v.dysplasiaMargin });
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
      item('Laryngeal subsite', v.subsite || 'Glottis'),
      item('Transglottic extension', v.transglottic || 'Not identified'),
      item('Laterality', v.laterality || 'Not specified'),
      item('Tumour focality', v.focality || 'Unifocal'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', v.grade) : null,
      item('Tumour extent', v.extension || 'Not specified'),
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
      arr(v.additionalFindings).length ? item('Additional pathologic findings', arr(v.additionalFindings).join('; ')) : null,
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
  if (v.grade && !/^Not applicable|GX/.test(v.grade)) first.push(lc1(v.grade));
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];
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
