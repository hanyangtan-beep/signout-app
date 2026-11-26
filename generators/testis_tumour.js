// Testicular tumour orchidectomy — synoptic report
// (QMH UG-Testis, WHO 5th edition, AJCC 8th edition Ch. 59).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/testis.js';
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
  const lat = v.laterality && !/Not specified/i.test(v.laterality) ? `${v.laterality} ` : '';
  return `${uc1(`${lat}testis`)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'testis'); }

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
  if (sz !== null) bits.push(`Bivalving the testis reveals a ${fmt(sz)} mm lobulated fleshy cream-tan intraparenchymal mass.`);
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Seminoma': 'Diffuse sheets and lobules separated by delicate fibrous septa containing reactive lymphocytes and occasional non-caseating granulomas are composed of uniform polygonal cells with clear glycogen-rich cytoplasm, distinct cell membranes, squared-off nuclei and prominent central nucleoli.',
  'Seminoma with syncytiotrophoblast cells': 'Classic seminoma sheets and lobules contain scattered large multinucleated syncytiotrophoblast cells without a biphasic cytotrophoblastic choriocarcinoma component.',
  'Embryonal carcinoma': 'Solid sheets, glandular-like spaces and papillary arrays of large primitive pleomorphic epithelial cells with amphophilic cytoplasm, overlapping vesicular nuclei, macronucleoli, brisk mitotic activity and geographic necrosis infiltrate the testis.',
  'Yolk sac tumour, post-pubertal type': 'Microcystic/reticular, papillary, solid, endodermal sinus (Schiller-Duval bodies) and myxoid patterns of atypical cuboidal-to-columnar cells with periodic acid-Schiff-positive hyaline globules infiltrate the parenchyma.',
  'Choriocarcinoma': 'Intimately admixed sheets of mononucleated cytotrophoblast and intermediate trophoblast capped by pleomorphic multinucleated syncytiotrophoblast invade amidst extensive haemorrhage and necrosis.',
  'Non-choriocarcinomatous trophoblastic tumour (PSTT / ETT / cystic)': 'Monomorphic proliferation of implantation-site or chorionic-type intermediate trophoblast infiltrates the testis without biphasic choriocarcinoma.',
  'Teratoma, post-pubertal type': 'Disorganised mature and/or immature tissues derived from ectodermal, mesodermal and endodermal germ layers show variable cytologic atypia within a background of germ cell neoplasia in situ.',
  'Teratoma with somatic-type malignancy (specify)': 'Post-pubertal teratoma contains a pure expansile nodule (>= 5 mm) of somatic-type malignant neoplasm overgrowing the germ cell elements.',
  'Embryonic-type neuroectodermal tumour (ENET, formerly PNET)': 'Expansile sheets and multilayered/Homer-Wright rosettes of small round blue neuroectodermal cells arise via somatic-type malignant transformation of teratoma.',
  'Mixed germ cell tumour (specify percentages)': 'Intimately admixed malignant germ cell tumour components replace the testicular parenchyma.',
  'Regressed germ cell tumour (scar only)': 'Well-demarcated dense fibrous scar with lymphoplasmacytic infiltrate, haemosiderin-laden macrophages, ghost tubules and coarse intratubular calcifications represents a regressed germ cell tumour.',
  'Germ cell neoplasia in situ (GCNIS) only': 'Seminiferous tubules contain basally aligned large atypical germ cells with clear cytoplasm, enlarged hyperchromatic nuclei and prominent nucleoli without stromal invasion.',
  'Spermatocytic tumour (non-GCNIS)': 'Circumscribed oedema-rich sheets display a tripartite population of small lymphocyte-like, intermediate and large multinucleated spireme-chromatin germ cells without GCNIS or lymphocytic septa.',
  'Teratoma, prepubertal type (non-GCNIS)': 'Organoid mature teratomatous tissues (epidermoid/dermoid cyst or mature glands and cartilage) lack cytologic atypia and background GCNIS.',
  'Yolk sac tumour, prepubertal type (non-GCNIS)': 'Reticular, microcystic and endodermal sinus yolk sac tumour proliferates in the absence of GCNIS.',
  'Prepubertal-type testicular neuroendocrine tumour (non-GCNIS)': 'Well-circumscribed insular nests and trabeculae of uniform neuroendocrine cells with salt-and-pepper chromatin arise without GCNIS.',
  'Leydig cell tumour': 'Circumscribed sheets and nests of polygonal cells with abundant eosinophilic cytoplasm, round central nuclei, prominent nucleoli and occasional Reinke crystalloids replace the parenchyma.',
  'Sertoli cell tumour, NOS': 'Well-formed solid and hollow tubules, cords and sheets of uniform columnar-to-cuboidal Sertoli cells with pale-to-eosinophilic cytoplasm are set in a fibrous stroma.',
  'Large cell calcifying Sertoli cell tumour': 'Nests and trabeculae of large eosinophilic Sertoli cells with abundant myxoid-to-hyalinised stroma contain prominent laminated stromal calcifications.',
  'Granulosa cell tumour (adult / juvenile)': 'Follicular, macrofollicular or solid sheets of granulosa cells (with longitudinal nuclear grooves in adult type or basophilic mucin-filled follicles in juvenile type) form a circumscribed mass.',
  'Signet-ring stromal tumour': 'Solid sheets and cords of bland spindle-to-polygonal stromal cells contain prominent intracytoplasmic clear vacuoles displacing nuclei to the periphery.',
  'Myoid gonadal stromal tumour': 'Intersecting fascicles of bland elongated spindle cells with eosinophilic cytoplasm and cigar-shaped nuclei are intimately associated with thin-walled vessels.',
  'Mixed / unclassified sex cord-stromal tumour': 'Mixed or incompletely differentiated sex cord and gonadal stromal elements form a testicular mass.',
  'Other histologic type not listed (specify)': 'Testicular neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Seminoma';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  let s = `Sections of the testis show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const gcnis = v.gcnis === 'Present' ? 'Germ cell neoplasia in situ (GCNIS) is identified in the adjacent seminiferous tubules.' : (v.gcnis === 'Not identified' ? 'Germ cell neoplasia in situ (GCNIS) is not identified.' : '');
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, gcnis, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional (retroperitoneal) lymph nodes', value: 'None submitted' }];
  const items = [{ label: 'Regional (retroperitoneal) lymph nodes', value: `${inv} of ${ex} involved` }];
  if (inv > 0) {
    const l = num(v.largestNodeMm);
    if (l !== null) items.push({ label: 'Largest involved lymph node', value: `${fmt(l)} mm` });
    if (v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
  }
  return items;
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) return listJoin(sites.map((s, i) => (i ? lc1(s) : s)));
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
      item('Laterality', v.laterality || 'Not specified'),
      item('Tumour focality', v.focality || 'Unifocal'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', histTypeName(v)),
      item('Germ cell neoplasia in situ (GCNIS)', v.gcnis || 'Cannot be determined'),
      item('Tumour extent', v.extension || 'Not specified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: [
      item('Spermatic cord resection margin', v.cordMargin || 'Uninvolved by tumour'),
      stripDot(v.otherMargin) ? item('Other margin(s)', stripDot(v.otherMargin)) : null
    ] },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm },
      item('Serum tumour markers (S)', v.serumMarkers || 'SX: Marker studies not available or not performed')
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
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];
  if (v.cordMargin && v.cordMargin !== 'Not applicable') clauses.push(`Spermatic cord margin ${lc1(v.cordMargin)}`);
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
