// Penile carcinoma resection — synoptic report
// (QMH UG-Penis, WHO 5th edition, AJCC 8th edition).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/penis.js';
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
  return `Penis, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'penis'); }

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
  if (sz !== null) bits.push(`Examination reveals a ${fmt(sz)} mm indurated ulcerated / exophytic tumour involving the ${lc1(v.site || 'glans penis')}.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'HPV-independent squamous cell carcinoma, usual type': 'Infiltrating irregular nests, jagged cords and tongues of keratinising malignant squamous cells invade a desmoplastic stroma. Tumour cells display abundant eosinophilic cytoplasm, distinct intercellular bridges, concentric keratin pearls, dyskeratosis and nuclear pleomorphism, frequently arising from differentiated PeIN and lichen sclerosus with negative p16.',
  'HPV-independent squamous cell carcinoma, verrucous carcinoma': 'Broad-based exophytic hyperkeratotic papillomatous proliferation of bland, extraordinarily well-differentiated squamous epithelium advances on a blunt pushing front of bulbous rete pegs without cytologic atypia or koilocytosis. Mitoses are confined to the basal layer amidst a subepithelial lymphoplasmacytic infiltrate.',
  'HPV-independent squamous cell carcinoma, papillary': 'Exophytic arborising fibrovascular papillae lined by hyperkeratotic, well-to-moderately differentiated squamous epithelium lacking koilocytosis show irregular invasive nests at the stromal base.',
  'HPV-independent squamous cell carcinoma, pseudohyperplastic': 'Deeply infiltrating nests and blunt tongues of extremely well-differentiated keratinising squamous cells mimic benign pseudoepitheliomatous hyperplasia within a background of lichen sclerosus, lacking koilocytosis.',
  'HPV-independent squamous cell carcinoma, pseudoglandular': 'Infiltrating nests of keratinising squamous cell carcinoma display prominent central acantholysis creating gland-like or alveolar pseudolumina containing detached dyskeratotic cells without true mucin.',
  'HPV-independent squamous cell carcinoma, sarcomatoid': 'Biphasic high-grade malignancy combines conventional squamous cell carcinoma (or differentiated PeIN) with infiltrating fascicles and storiform sheets of pleomorphic malignant spindle cells showing brisk atypical mitoses and necrosis.',
  'HPV-associated squamous cell carcinoma, basaloid': 'Solid lobules, nests and cords of uniform small hyperchromatic basaloid cells with scant cytoplasm, high nuclear-to-cytoplasmic ratios, brisk mitotic activity and central comedo-type necrosis infiltrate deeply. Diffuse block-type p16 positivity confirms high-risk HPV association.',
  'HPV-associated squamous cell carcinoma, warty (condylomatous)': 'Exophytic arborescent papillae with prominent fibrovascular cores lined by atypical squamous cells exhibiting pleomorphic koilocytosis (perinuclear halos, wrinkled hyperchromatic nuclei, binucleation) and parakeratosis show jagged stromal invasion and diffuse p16 positivity.',
  'HPV-associated squamous cell carcinoma, warty-basaloid': 'Mixed HPV-associated squamous cell carcinoma combines superficial condylomatous warty papillae with deeply infiltrating solid basaloid nests and comedonecrosis, showing diffuse p16 reactivity.',
  'HPV-associated squamous cell carcinoma, clear cell': 'Infiltrating nests and lobules of malignant squamous cells with abundant optically clear, PAS-positive glycogen-rich cytoplasm exhibit central comedonecrosis and diffuse p16 positivity.',
  'HPV-associated squamous cell carcinoma, lymphoepithelial': 'Syncytial sheets and irregular cords of undifferentiated pleomorphic epithelial cells with vesicular nuclei and prominent nucleoli infiltrate amidst a dense reactive lymphoplasmacytic stroma.',
  'HPV-associated squamous cell carcinoma, medullary': 'Circumscribed pushing sheets of poorly differentiated syncytial squamous cells with vesicular nuclei and brisk mitoses are accompanied by a dense lymphoid infiltrate and diffuse p16 positivity.',
  'Squamous cell carcinoma, NOS (HPV status not determined)': 'Infiltrating nests and cords of malignant squamous cells with variable keratinisation invade the penile stroma within a desmoplastic background.',
  'Penile intraepithelial neoplasia (PeIN), HPV-associated': 'Full-thickness proliferation of atypical basaloid and/or warty koilocytic squamous cells with loss of maturation and suprabasal mitoses is confined to the intact epithelium without stromal invasion, showing diffuse block-type p16 positivity.',
  'Penile intraepithelial neoplasia (PeIN), differentiated (HPV-independent)': 'Basal and parabasal squamous atypia with enlarged vesicular nuclei, prominent nucleoli, premature eosinophilic keratinisation ("keratin pearls in rete tips") and elongated anastomosing rete ridges is confined to the epithelium, typically p16-negative with aberrant p53.',
  'Other histologic type not listed (specify)': 'Malignant penile neoplasm is present with stromal invasion.'
};

export function histTypeName(v) {
  const t = v.histType || 'HPV-independent squamous cell carcinoma, usual type';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const gr = v.grade && !/^Not applicable|GX/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the penis show ${lc1(histTypeName(v))}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const p16 = v.p16Status && v.p16Status !== 'Not performed' ? `p16 immunohistochemistry is ${lc1(v.p16Status)}.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, p16, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'Uninvolved by invasive carcinoma';
  const items = [{ label: 'Surgical margins (invasive)', value: st }];
  if (v.peinMargin) items.push({ label: 'Surgical margins (PeIN)', value: v.peinMargin });
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
    if (v.nodeLaterality) items.push({ label: 'Inguinal nodal laterality', value: v.nodeLaterality });
    if (v.pelvicNodesInvolved) items.push({ label: 'Pelvic lymph node involvement', value: 'Present' });
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
  const dep = num(v.depthMm);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', v.site || 'Glans penis'),
      item('Tumour focality', v.focality || 'Unifocal'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null,
      dep !== null ? item('Depth of invasion', `${fmt(dep)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      v.p16Status && v.p16Status !== 'Not performed' ? item('p16 immunohistochemistry', v.p16Status) : null,
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
  if (/HPV-associated/i.test(v.histType || '') && /^Negative/i.test(v.p16Status || '')) {
    warn('HPV-associated penile SCC subtype selected with negative p16.', 'p16Status');
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

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
