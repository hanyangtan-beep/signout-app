// Urethral carcinoma resection — synoptic report
// (QMH UG-Urethra, CAP Urethra Resection 4.3.0.0, WHO 5th edition, AJCC 8th dual-track).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/urethra.js';
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
  return `Urethra, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'urethra'); }

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
  if (sz !== null) bits.push(`Opening the urethra reveals a ${fmt(sz)} mm ${lc1(v.configuration || 'solid')} tumour involving the ${lc1(v.site || 'urethra')}.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Papillary urothelial carcinoma, non-invasive': 'Branching fibrovascular papillae are lined by thickened atypical urothelium with architectural disorder and nuclear pleomorphism without lamina propria invasion.',
  'Urothelial carcinoma in situ': 'Flat urothelium displays full-thickness severe nuclear atypia, hyperchromasia, loss of polarity and mitotic activity without stromal invasion.',
  'Urothelial carcinoma, invasive (conventional)': 'Irregular infiltrating nests, cords and sheets of pleomorphic urothelial cells with eosinophilic-to-amphophilic cytoplasm and enlarged hyperchromatic nuclei invade the urethral wall within a desmoplastic stroma.',
  'Urothelial carcinoma, micropapillary': 'Tight clusters and delicate filiform micropapillae lacking fibrovascular cores sit within artefactual retraction lacunae with reverse nuclear polarisation.',
  'Urothelial carcinoma, nested': 'Confluent closely packed irregular nests and abortive tubules of deceptively bland urothelial cells infiltrate deeply into the urethral stroma.',
  'Urothelial carcinoma, tubular and microcystic': 'Infiltrating variably sized microcysts and elongated tubules lined by flattened-to-cuboidal atypical urothelium contain eosinophilic secretions.',
  'Urothelial carcinoma, lymphoepithelioma-like': 'Syncytial sheets of undifferentiated pleomorphic epithelial cells with vesicular nuclei and prominent nucleoli are obscured by a dense reactive lymphoplasmacytic infiltrate.',
  'Urothelial carcinoma, plasmacytoid': 'Discohesive single cells and loose cords with eccentric nuclei and abundant eosinophilic cytoplasm infiltrate diffusely through urethral soft tissues.',
  'Urothelial carcinoma, sarcomatoid': 'Biphasic malignant neoplasm combines conventional urothelial carcinoma with an infiltrating high-grade pleomorphic spindle cell component.',
  'Urothelial carcinoma, giant cell': 'Infiltrating sheets of markedly pleomorphic bizarre multinucleated tumour giant cells are admixed with high-grade urothelial carcinoma.',
  'Urothelial carcinoma, poorly differentiated': 'Diffuse sheets of poorly differentiated high-grade urothelial cells show extensive necrosis and brisk mitotic activity.',
  'Urothelial carcinoma, lipid-rich': 'Infiltrating urothelial carcinoma contains prominent lipoblast-like cells with multiple clear intracytoplasmic lipid vacuoles indenting atypical nuclei.',
  'Urothelial carcinoma, clear cell (glycogen-rich)': 'Nests and sheets of malignant urothelial cells with abundant optically clear glycogen-rich cytoplasm infiltrate the urethral stroma.',
  'Urothelial carcinoma with squamous differentiation': 'Invasive urothelial carcinoma exhibits distinct zones of keratinisation, keratin pearls and intercellular bridges.',
  'Urothelial carcinoma with glandular differentiation': 'Invasive urothelial carcinoma contains true malignant glandular lumina lined by columnar or cuboidal mucin-producing cells.',
  'Urothelial carcinoma with trophoblastic differentiation': 'High-grade urothelial carcinoma contains admixed pleomorphic syncytiotrophoblast-like giant cells or choriocarcinomatous foci.',
  'Urothelial carcinoma with Mullerian differentiation': 'Invasive urothelial carcinoma shows areas of clear cell or endometrioid Mullerian-type glandular differentiation.',
  'Squamous cell carcinoma': 'Infiltrating irregular nests and cords of malignant squamous cells with keratin pearls, eosinophilic cytoplasm and intercellular bridges invade the urethral wall.',
  'Verrucous carcinoma': 'Exophytic hyperkeratotic papillomatous squamous proliferation with minimal nuclear atypia advances on a broad pushing front of bulbous rete ridges.',
  'Squamous cell carcinoma in situ': 'Full-thickness severe squamous dysplasia involves the urethral mucosa without stromal invasion.',
  'Adenocarcinoma, NOS': 'Infiltrating malignant glands lined by atypical columnar-to-cuboidal epithelial cells invade the urethral wall.',
  'Adenocarcinoma, enteric': 'Infiltrating tall columnar intestinal-type glands with pseudostratified hyperchromatic nuclei and dirty luminal necrosis mimic colorectal adenocarcinoma.',
  'Adenocarcinoma, mucinous': 'Abundant pools of extracellular mucin contain floating strips, clusters and signet-ring carcinoma cells infiltrating the urethral stroma.',
  'Adenocarcinoma, mixed': 'Infiltrating urethral adenocarcinoma exhibits admixed enteric, mucinous and signet-ring glandular patterns.',
  'Adenocarcinoma, signet-ring cell': 'Diffuse single-file and sheet-like infiltration of malignant cells with intracytoplasmic mucin vacuoles displacing crescentic nuclei invades the urethral wall.',
  'Clear cell adenocarcinoma (Mullerian type)': 'Tubulocystic, papillary and solid proliferations of cuboidal-to-hobnail cells with clear-to-eosinophilic cytoplasm, nuclear pleomorphism and hyaline stromal cores infiltrate the urethra.',
  'Endometrioid carcinoma (Mullerian type)': 'Confluent back-to-back endometrioid-type malignant glands lined by stratified columnar cells infiltrate the urethral wall.',
  'Small cell neuroendocrine carcinoma': 'Diffuse sheets of small hyperchromatic cells with scant cytoplasm, nuclear moulding, crush artefact, necrosis and brisk mitotic activity infiltrate the urethra.',
  'Large cell neuroendocrine carcinoma': 'Organoid nests and trabeculae of large pleomorphic neuroendocrine cells with coarse chromatin, prominent nucleoli and geographic necrosis infiltrate the urethra.',
  'Littre gland adenocarcinoma': 'Infiltrating mucin-producing adenocarcinoma arises from periurethral Littre glands of the male anterior urethra.',
  'Skene gland adenocarcinoma': 'Infiltrating cribriform and acinar adenocarcinoma arises from female periurethral Skene glands.',
  'Cowper gland adenocarcinoma': 'Infiltrating mucinous or adenoid cystic-like adenocarcinoma arises from bulbourethral Cowper glands.',
  'Other histologic type not listed (specify)': 'Infiltrating malignant urethral neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Urothelial carcinoma, invasive (conventional)';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const gr = v.grade && !/^Not applicable|GX/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the urethra show ${lc1(histTypeName(v))}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const pct = stripDot(v.subtypePct) ? `Component breakdown: ${stripDot(v.subtypePct)}.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, pct, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved` }];
  if (inv > 0 && v.ene) items.push({ label: 'Extranodal extension', value: v.ene });
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
      item('Tumour site', v.site || 'Urethra, not otherwise specified'),
      item('Tumour configuration', v.configuration || 'Solid / nodular'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      stripDot(v.subtypePct) ? item('Subtype / divergent percentages', stripDot(v.subtypePct)) : null,
      v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', v.grade) : null,
      item('Tumour extent', v.extension || 'Not specified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: [
      item('Proximal mucosal margin', v.proximalMargin || 'Uninvolved by invasive carcinoma and CIS'),
      item('Distal mucosal margin', v.distalMargin || 'Uninvolved by invasive carcinoma and CIS'),
      item('Deep soft tissue margin', v.deepMargin || 'Uninvolved by invasive carcinoma')
    ] },
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
  const anyInv = [v.proximalMargin, v.distalMargin, v.deepMargin].some((m) => /^Involved/i.test(m || ''));
  clauses.push(anyInv ? 'Surgical margin(s) involved by invasive carcinoma' : 'All surgical margins uninvolved by invasive carcinoma');
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
