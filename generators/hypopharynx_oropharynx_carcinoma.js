// Hypopharynx & HPV-independent Oropharynx carcinoma resection — synoptic report
// (QMH HN-Hypopharynx, CAP HPV-independent Oropharynx & Hypopharynx, WHO 5th edition, AJCC 8th edition).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/hypopharynx_oropharynx.js';
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
  return `${v.site || 'Hypopharynx'}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'hypopharynx_oropharynx'); }

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
  if (sz !== null) bits.push(`Opening the pharynx reveals a ${fmt(sz)} mm ulcerated and infiltrative tumour involving the ${lc1(v.subsite || v.site || 'pharynx')}.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Squamous cell carcinoma, conventional keratinising, HPV-independent': 'Irregular jagged nests, cords and single cells arising from dysplastic surface mucosa infiltrate a desmoplastic, chronically inflamed stroma. Tumour cells show abundant eosinophilic cytoplasm, distinct cell borders with intercellular bridges, nuclear pleomorphism, prominent nucleoli and concentric keratin pearls or dyskeratosis. Lymphovascular and perineural invasion are frequent, with p16 negativity.',
  'Squamous cell carcinoma, non-keratinising, NOS, HPV-independent': 'Solid sheets and anastomosing nests of atypical squamous cells with high nuclear-to-cytoplasmic ratios, hyperchromatic-to-vesicular nuclei, brisk mitoses and minimal focal keratinisation infiltrate the pharyngeal wall within a variably desmoplastic stroma. Absence of diffuse block-type p16 expression separates it from HPV-associated OPSCC.',
  'Adenosquamous carcinoma, HPV-independent': 'High-grade biphasic malignancy combines a superficial squamous cell carcinoma (in situ or invasive) with a distinct, deeply infiltrating adenocarcinoma component forming true mucin-producing tubules, ducts and acini. Extensive stromal desmoplasia, necrosis and early perineural/lymphovascular spread are characteristic; absence of MAML2 rearrangements helps exclude mucoepidermoid carcinoma.',
  'Basaloid squamous cell carcinoma, HPV-independent': 'Lobular, solid and trabecular proliferation of densely packed small basaloid cells exhibits striking peripheral nuclear palisading and large zones of central comedo-type necrosis, accompanied by abrupt foci of squamous differentiation or overlying CIS. Characteristic stromal features include myxoid change, stromal hyalinisation and small pseudocystic spaces containing PAS-positive basement membrane-like material.',
  'Papillary squamous cell carcinoma, HPV-independent': 'Predominantly exophytic, arborising papillary architecture consists of delicate fibrovascular cores covered by thickened malignant non-keratinising stratified squamous epithelium resembling carcinoma in situ. Irregular invasive nests of non-keratinising SCC are identified at the tumour base.',
  'Spindle cell / sarcomatoid squamous carcinoma, HPV-independent': 'Ulcerated polypoid or endophytic biphasic neoplasm comprises a dominant malignant spindle-cell proliferation (fascicular, storiform or myxoid) alongside a conventional invasive or in situ squamous component. Spindle cells show marked nuclear pleomorphism, prominent nucleoli and atypical mitoses, requiring p40, p63, CK5/6 and pancytokeratin to confirm epithelial lineage.',
  'Verrucous carcinoma, HPV-independent': 'Broad-based exophytic warty proliferation of club-shaped filiform projections with prominent "church-spire" surface orthokeratosis and deeply bulbous rete pegs advances with a sharply circumscribed pushing border. Thickened epithelium shows bland spinous cells with orderly maturation, absent cytologic atypia and mitoses confined to the basal layer, accompanied by a brisk subepithelial lymphoplasmacytic infiltrate.',
  'Carcinoma cuniculatum': 'Deeply burrowing, labyrinthine branching sinuses and crypts filled with laminated keratin and lined by well-differentiated, deceptively bland stratified squamous epithelium infiltrate deeply into pharyngeal soft tissues and bone. Minimal nuclear atypia and a pushing-to-burrowing growth pattern distinguish it from conventional keratinising SCC.',
  'Lymphoepithelial carcinoma (non-nasopharyngeal), HPV-independent': 'Syncytial sheets, irregular islands and anastomosing trabeculae of poorly differentiated non-keratinising squamous cells with indistinct borders, vesicular nuclei and prominent nucleoli infiltrate amidst a dense non-desmoplastic lymphoplasmacytic stroma.',
  'Neuroendocrine tumour, grade 1': 'Organoid nests and trabeculae of uniform neuroendocrine cells with stippled chromatin and eosinophilic cytoplasm exhibit < 2 mitoses/2 mm2 and Ki-67 < 3% without necrosis.',
  'Neuroendocrine tumour, grade 2': 'Well-differentiated organoid neuroendocrine proliferations with stippled chromatin exhibit intermediate proliferative activity (mitoses 2–20/2 mm2 or Ki-67 3–20%).',
  'Neuroendocrine tumour, grade 3': 'Organoid neuroendocrine morphology is preserved with elevated proliferative activity (> 20 mitoses/2 mm2 or Ki-67 > 20%) and diffuse synaptophysin/chromogranin A positivity.',
  'Neuroendocrine carcinoma, small cell type': 'Diffuse sheets and ribbons of small hyperchromatic cells with scant cytoplasm, finely granular chromatin, inconspicuous nucleoli and prominent nuclear moulding infiltrate the pharyngeal wall with crush artefact, extensive geographic necrosis and > 20 mitoses/2 mm2.',
  'Neuroendocrine carcinoma, large cell type': 'Organoid nests, trabeculae and rosettes with peripheral palisading and extensive geographic necrosis are composed of large polygonal cells with moderate cytoplasm, coarse chromatin, prominent nucleoli and > 20 mitoses/2 mm2.',
  'Combined neuroendocrine carcinoma (specify types)': 'High-grade small cell or large cell neuroendocrine carcinoma is intimately admixed with a distinct non-neuroendocrine squamous or glandular carcinoma component.',
  'Carcinoma, type cannot be determined': 'Infiltrating malignant epithelial cells with nuclear atypia and stromal invasion are present without definitive lineage-specific architectural features.',
  'Other histologic type not listed (specify)': 'Infiltrating malignant pharyngeal neoplasm is present with stromal invasion.'
};

export function histTypeName(v) {
  const t = v.histType || 'Squamous cell carcinoma, conventional keratinising, HPV-independent';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const gr = v.grade && !/^Not applicable|GX/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the ${lc1(v.site || 'hypopharynx')} show ${lc1(histTypeName(v))}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const p16Text = v.p16 && v.p16 !== 'Not performed' ? `p16 immunohistochemistry is ${lc1(v.p16)}.` : '';
  const eberText = v.eber && v.eber !== 'Not performed' ? `EBER ISH is ${lc1(v.eber)}.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, p16Text, eberText, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins negative for invasive carcinoma';
  const items = [{ label: 'Surgical margins (invasive)', value: st }];
  if (v.nonInvasiveMargin && v.nonInvasiveMargin !== 'Not applicable') {
    items.push({ label: 'Surgical margins (in situ)', value: v.nonInvasiveMargin });
  }
  const d = num(v.closestMarginMm);
  const site = stripDot(v.closestMarginSite);
  if (d !== null && /negative/i.test(st)) {
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
      item('Primary site', v.site || 'Hypopharynx'),
      v.subsite && v.subsite !== 'Not specified' ? item('Subsite', v.subsite) : null,
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', v.grade) : null,
      item('Tumour extent', v.extension || 'Not specified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      v.p16 && v.p16 !== 'Not performed' ? item('HPV status (p16 IHC)', v.p16) : null,
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
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
  if (v.grade && !/^Not applicable|GX/.test(v.grade)) first.push(lc1(v.grade));
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];
  clauses.push(v.marginStatus || 'All margins negative for invasive carcinoma');
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
  if (v.site === S.SITES.oropharynx && v.p16 === 'Positive') {
    warn('p16-positive oropharyngeal SCC should be staged under the HPV-associated oropharynx protocol.', 'p16');
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
