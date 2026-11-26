// Vaginal carcinoma resection — synoptic report
// (QMH GYN-Vagina, WHO 5th edition, AJCC 8th edition Chapter 50 / FIGO).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/vagina.js';
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
  return `Vagina, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'vagina'); }

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
  if (sz !== null) {
    bits.push(`Examination reveals a ${fmt(sz)} mm exophytic/ulcerated tumour involving the ${arr(v.site).map(lc1).join(', ') || 'vaginal wall'}.`);
  }
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Squamous cell carcinoma, HPV-associated': 'Infiltrating nests and sheets of non-keratinising or basaloid squamous cells with high nuclear-to-cytoplasmic ratios and brisk mitotic activity invade the vaginal lamina propria and wall, accompanied by block-type p16 positivity.',
  'Squamous cell carcinoma, HPV-independent': 'Infiltrating nests of keratinising squamous cells with abundant eosinophilic cytoplasm, keratin pearls and intercellular bridges invade the vaginal wall with negative or patchy p16.',
  'Squamous cell carcinoma, NOS': 'Infiltrating nests and cords of atypical squamous cells with variable keratinisation invade the vaginal wall.',
  'Adenocarcinoma, NOS': 'Infiltrating malignant glandular profiles lined by atypical columnar cells invade the vaginal stroma.',
  'Adenocarcinoma, HPV-associated': 'Infiltrating endocervical-type mucinous glands with apical mitoses and apoptotic bodies show diffuse block-type p16 positivity.',
  'Adenocarcinoma, Skene, Cowper and Littre gland origin': 'Infiltrating acinar and cribriform glands with intra- and extracellular mucin arise in paraurethral/periurethral gland distribution.',
  'Mucinous carcinoma, NOS': 'Infiltrating malignant glands contain abundant intracytoplasmic or extracellular mucin.',
  'Mucinous carcinoma, gastric type': 'Well-formed infiltrating glands lined by cells with abundant clear to pale eosinophilic cytoplasm and distinct cell borders display pyloric-type mucin.',
  'Mucinous carcinoma, intestinal type': 'Infiltrating malignant glands lined by pseudostratified columnar epithelium with goblet cells and occasional Paneth cells resemble colonic adenocarcinoma.',
  'Endometrioid carcinoma': 'Confluent back-to-back and infiltrating endometrioid glands lined by stratified columnar cells with eosinophilic cytoplasm and occasional squamous morules invade the vaginal wall.',
  'Clear cell carcinoma': 'Tubulocystic, papillary and solid proliferations of polygonal and hobnail cells with abundant optically clear, glycogen-rich cytoplasm and hyalinised papillary cores infiltrate the vaginal wall.',
  'Mesonephric carcinoma': 'Small tubules containing dense eosinophilic luminal colloid-like secretions are admixed with ductal, retiform and solid patterns.',
  'Adenosquamous carcinoma': 'Both malignant glandular and malignant squamous components are intimately admixed within the invasive tumour.',
  'Adenoid basal carcinoma': 'Small well-circumscribed nests and cords of bland basaloid cells with peripheral palisading infiltrate without a desmoplastic stromal reaction.',
  'Small cell neuroendocrine carcinoma': 'Diffuse sheets of small cells with scant cytoplasm, nuclear moulding, finely stippled chromatin, high mitotic activity and extensive necrosis infiltrate the vaginal wall.',
  'Large cell neuroendocrine carcinoma': 'Organoid nests and trabeculae of large cells with abundant cytoplasm, prominent nucleoli, geographic necrosis and brisk mitotic activity infiltrate the wall.',
  'Combined small cell neuroendocrine carcinoma': 'Small cell neuroendocrine carcinoma is admixed with a distinct non-neuroendocrine carcinoma component.',
  'Combined large cell neuroendocrine carcinoma': 'Large cell neuroendocrine carcinoma is admixed with a distinct non-neuroendocrine carcinoma component.',
  'Neuroendocrine tumour, NOS': 'Organoid nests and trabeculae of uniform neuroendocrine cells with stippled chromatin infiltrate the vaginal wall.',
  'Undifferentiated carcinoma': 'Diffuse sheets of pleomorphic, discohesive cells lack squamous, glandular or neuroendocrine differentiation.',
  'Mixed tumour, NOS': 'Biphasic spindle and epithelial tumour of the vagina shows bland stromal cells admixed with mature squamous or mucinous epithelium.',
  'Carcinosarcoma': 'Biphasic malignant neoplasm combines high-grade carcinoma with a malignant heterologous or homologous sarcomatous component.',
  'Adenosarcoma': 'Biphasic neoplasm combines benign-appearing endometrioid epithelium with a malignant, leaf-like periglandular stromal cuffing sarcoma component.',
  'Germ cell tumour (specify)': 'Malignant germ cell neoplasm (most commonly yolk sac tumour) shows characteristic reticular, microcystic or papillary architecture.',
  'Carcinoma, type cannot be determined': 'Infiltrating malignant epithelial cells are present without lineage-specific architectural features.',
  'Other (specify)': 'Infiltrating malignant neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Squamous cell carcinoma, HPV-associated';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  if (v.noPrimary === true) {
    return 'Extensive sampling of the tumour bed shows fibrosis, chronic inflammation and therapy-related changes with no residual carcinoma identified.';
  }
  const what = lc1(histTypeName(v));
  const gr = v.grade && !/^Not applicable|GX/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the vagina show ${what}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const p16Text = v.p16 && v.p16 !== 'Not performed' ? `p16 immunohistochemistry shows ${lc1(v.p16)} staining.` : '';
  const p53Text = v.p53 && v.p53 !== 'Not performed' ? `p53 shows ${lc1(v.p53)} staining.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, p16Text, p53Text, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by invasive carcinoma and intraepithelial neoplasia';
  const items = [{ label: 'Surgical margins', value: st }];
  const sub = [
    v.peripheralMargin ? { label: 'Peripheral margins', value: v.peripheralMargin } : null,
    v.deepMargin ? { label: 'Deep margins', value: v.deepMargin } : null
  ].filter(Boolean);
  if (sub.length) items[0].sub = sub;
  const d = num(v.closestMarginMm);
  if (d !== null && /uninvolved/i.test(st)) {
    items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm${stripDot(v.closestMarginSite) ? ` (${lc1(stripDot(v.closestMarginSite))})` : ''}` });
  }
  return items;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  const itc = int(v.nodesItc) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const site = stripDot(v.nodeSites);
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} with frank metastasis${itc ? `; ${itc} with isolated tumour cells (<= 0.2 mm)` : ''}${site ? ` (${site})` : ''}` }];
  if (inv > 0) {
    if (v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
    const dep = num(v.largestDepositMm);
    if (dep !== null) items.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm` });
  }
  return items;
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) return uc1(stripDot(v.distantMetsOther)) || 'Distant metastasis present';
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
      item('Tumour site', arr(v.site).length ? arr(v.site).join('; ') : 'Not specified'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', v.noPrimary === true ? 'No residual carcinoma identified (pT0)' : histTypeName(v)),
      v.noPrimary === true ? null : item('Histologic grade', v.grade || 'G2: Moderately differentiated'),
      item('Other tissue / organ involvement', arr(v.extension).length ? arr(v.extension).join('; ') : S.EXT.none),
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

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const clauses = [];
  if (v.noPrimary === true) {
    clauses.push('NO RESIDUAL CARCINOMA IDENTIFIED (complete pathological response)');
  } else {
    const sz = num(v.sizeMm);
    const first = [histTypeName(v).toUpperCase()];
    if (v.grade && !/^Not applicable|GX/.test(v.grade)) first.push(lc1(v.grade));
    if (sz !== null) first.push(`${fmt(sz)} mm`);
    clauses.push(first.join(', '));
  }
  clauses.push(v.marginStatus || 'All margins uninvolved by invasive carcinoma and intraepithelial neoplasia');
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
  if (!v.histType && !v.noPrimary) err('Histologic type not recorded.', 'histType');
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
