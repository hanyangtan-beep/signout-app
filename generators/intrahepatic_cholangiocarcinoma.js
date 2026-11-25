// Intrahepatic cholangiocarcinoma resection — synoptic report (QMH GI-Intrahepatic bile ducts,
// CAP IntrahepaticBileDuct 4.4.0.0, WHO 6th edition, AJCC 8th edition Chapter 23).
import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/intrahepatic_bile_duct.js';
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
export function staging(part) { return deriveTNM(part.values, 'intrahepatic_bile_duct'); }

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
  const gp = v.growthPattern && v.growthPattern !== 'Cannot be determined' ? lc1(v.growthPattern) : '';
  if (sz !== null) bits.push(`Sectioning reveals a ${fmt(sz)} mm${gp ? ` ${gp}` : ''} firm white-tan intrahepatic mass${v.focality === 'Multiple' ? ' with satellite / multifocal nodules' : ''}.`);
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
  'Intrahepatic cholangiocarcinoma, small duct, NOS': 'Small-to-medium non-mucin-producing anastomosing tubules and ductular structures lined by cuboidal to low columnar cells with uniform round nuclei and pale-to-eosinophilic cytoplasm infiltrate a hyalinised fibrous stroma.',
  'Intrahepatic cholangiocarcinoma, small duct, cholangiolocellular': 'Narrow, angulated anastomosing ductules ("antler-like" cords) lined by small cuboidal cells with minimal cytologic atypia closely resemble reactive canals of Hering within a dense fibrous stroma.',
  'Intrahepatic cholangiocarcinoma, small duct, ductal plate malformation-type': 'Irregularly dilated, tortuous biliary structures with intraluminal fibrous projections resemble von Meyenburg complexes / ductal plate malformation but display infiltrative margins and cytologic atypia.',
  'Intrahepatic cholangiocarcinoma, small duct, solid-tubulocystic-type': 'Variably sized solid nests and microcystic-to-tubulocystic spaces lined by cuboidal non-mucinous biliary cells infiltrate the hepatic parenchyma.',
  'Intrahepatic cholangiocarcinoma, small duct, lymphoepithelioma-like': 'Syncytial sheets and poorly formed glands of atypical biliary cells are embedded within a dense reactive lymphoplasmacytic infiltrate (correlate with EBER ISH).',
  'Intrahepatic cholangiocarcinoma, large duct, NOS': 'Irregular mucin-producing glands lined by tall columnar cells with atypical nuclei infiltrate a dense desmoplastic stroma, characteristically along portal tracts with frequent perineural invasion.',
  'Intrahepatic cholangiocarcinoma, large duct, adenosquamous': 'Mucin-producing large-duct cholangiocarcinoma is admixed with a malignant squamous component demonstrating keratinisation and intercellular bridges.',
  'Intrahepatic cholangiocarcinoma, large duct, mucinous / colloid': 'Abundant lakes of extracellular mucin (> 50% of tumour volume) contain strips and clusters of malignant columnar biliary epithelium.',
  'Intrahepatic cholangiocarcinoma, large duct, mucoepidermoid': 'Admixed mucin-producing glandular cells, intermediate cells and epidermoid/squamoid cells form infiltrative nests and cysts.',
  'Intrahepatic cholangiocarcinoma, large duct, enteroblastic': 'Infiltrating tubular and papillary glands lined by clear glycogen-rich columnar cells with subnuclear vacuoles resemble fetal gut epithelium.',
  'Combined hepatocellular-cholangiocarcinoma': 'Unequivocal hepatocytic differentiation (trabecular/pseudoglandular malignant hepatocytes) and cholangiocytic differentiation (mucin- or non-mucin-producing biliary glands in fibrous stroma) coexist within the same tumour.',
  'Mucinous cystic neoplasm with an associated invasive carcinoma': 'A multilocular mucin-producing biliary cyst with underlying ovarian-type stroma gives rise to an invasive stromal adenocarcinoma component.',
  'Intraductal papillary neoplasm (IPN) with associated invasive carcinoma': 'Exophytic fibrovascular papillae lined by dysplastic biliary epithelium within a dilated intrahepatic bile duct are associated with stromal invasion.',
  'Intraductal tubulopapillary neoplasm with associated invasive carcinoma': 'Closely packed back-to-back tubules with minimal mucin filling a dilated bile duct show associated invasive carcinoma.',
  'Intraductal oncocytic papillary neoplasm with associated invasive carcinoma': 'Complex arborising papillae lined by stratified oncocytic cells with abundant granular eosinophilic cytoplasm and intraepithelial lumina show stromal invasion.',
  'Large cell neuroendocrine carcinoma': 'Organoid nests and trabeculae of large pleomorphic neuroendocrine cells with vesicular nuclei, prominent nucleoli, brisk mitoses (> 20/2 mm2) and geographic necrosis infiltrate the liver.',
  'Small cell neuroendocrine carcinoma': 'Sheets of small hyperchromatic cells with scant cytoplasm, nuclear moulding, brisk mitotic activity and extensive necrosis infiltrate the hepatic parenchyma.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = lc1(histTypeName(v));
  const gr = v.grade && !/^Not applicable|GX\b/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the liver show ${what}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  if (morph) s += ` ${morph}`;
  if (stripDot(v.ihcText)) s += ` ${uc1(stripDot(v.ihcText))}.`;
  return s;
}

function marginItems(v) {
  const items = [];
  const hep = v.hepaticMargin || 'Uninvolved by invasive carcinoma';
  const d = num(v.closestMarginMm);
  items.push({ label: 'Hepatic parenchymal margin', value: /uninvolved/i.test(hep) && d !== null ? `${hep} (closest ${fmt(d)} mm)` : hep });
  if (v.bileDuctMargin && v.bileDuctMargin !== 'Not applicable') items.push({ label: 'Bile duct margin', value: v.bileDuctMargin });
  if (v.hgdMargin && v.hgdMargin !== 'Not applicable') items.push({ label: 'High-grade intraepithelial neoplasia at margins', value: v.hgdMargin });
  return items;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const site = stripDot(v.nodeSites);
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved${site ? ` (${site})` : ''}` }];
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
    return listJoin(sites.map((s) => (s === S.METS.other ? detail || 'other distant site' : s)).map((s, i) => (i ? lc1(s) : s)));
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
      item('Tumour focality', v.focality || 'Solitary'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null,
      item('Tumour growth pattern', v.growthPattern || 'Mass-forming')
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 6th)', histTypeName(v)),
      item('Histologic grade', v.grade || 'Not specified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy' ? item('Treatment effect', v.treatmentEffect) : null,
      item('Tumour extension', arr(v.extension).length ? arr(v.extension).join('; ') : S.EXT.parenchyma),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
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

export function molecular(part) {
  const v = part.values;
  const items = [];
  if (v.mmr && v.mmr !== 'Not performed') items.push({ label: 'MMR / MSI', value: v.mmr });
  if (v.her2 && v.her2 !== 'Not performed') items.push({ label: 'HER2 IHC', value: v.her2 });
  if (stripDot(v.molecularNotes)) items.push({ label: 'Molecular profiling (IDH1/2, FGFR2, BRAF, etc.)', value: uc1(stripDot(v.molecularNotes)) });
  return items.length ? renderSynoptic([{ heading: 'Molecular studies', items }], '') : '';
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
  if (v.grade && !/^Not applicable|GX\b/.test(v.grade)) first.push(lc1(v.grade));
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];

  if (v.lvi === 'Present') clauses.push('Intrahepatic lymphovascular invasion present');
  if (v.hepaticMargin === 'Involved by invasive carcinoma') clauses.push('Hepatic parenchymal margin involved by carcinoma');
  else {
    const d = num(v.closestMarginMm);
    clauses.push(`Hepatic parenchymal margin clear${d !== null ? ` (${fmt(d)} mm)` : ''}`);
  }

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
  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');
  if (num(v.sizeMm) === null && !v.noPrimary) warn('Greatest tumour dimension (mm) not recorded.', 'sizeMm');
  if (v.mmr === 'Not performed' && v.her2 === 'Not performed') {
    info('QMH / CAP 4.4.0.0 reminder: consider MMR/MSI and HER2 testing (and IDH1/FGFR2 for small-duct iCCA).', 'mmr');
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
