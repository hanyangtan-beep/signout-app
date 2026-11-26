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
  'Squamous cell carcinoma, HPV-associated': 'Infiltrating nests, anastomosing cords and sheets of non-keratinising, basaloid or warty squamous cells invade the vaginal lamina propria and fibromuscular wall. Tumour cells display high nuclear-to-cytoplasmic ratios, hyperchromatic-to-vesicular nuclei, brisk mitotic activity and frequent overlying VaIN/HSIL. Diffuse block-type p16 nuclear and cytoplasmic positivity (>= 70%) or high-risk HPV RNA ISH confirms HPV-driven carcinogenesis.',
  'Squamous cell carcinoma, HPV-independent': 'Infiltrating jagged nests and cords of keratinising squamous cells with abundant eosinophilic cytoplasm, intercellular bridges, concentric keratin pearls and dyskeratosis invade a desmoplastic stroma. Overlying epithelium may show differentiated-type VIN/VaIN or lichen sclerosus rather than classic HSIL. p16 immunohistochemistry is negative or patchy, and aberrant p53 staining is frequent.',
  'Squamous cell carcinoma, NOS': 'Infiltrating nests, cords and sheets of atypical polygonal squamous cells with variable keratinisation and intercellular bridges invade the vaginal wall within a desmoplastic stroma. Reserved for cases in which p16/HPV testing has not been performed.',
  'Adenocarcinoma, NOS': 'Infiltrating irregular malignant tubules, cribriform glands and solid nests lined by atypical columnar cells invade the vaginal stroma without specific Mullerian, intestinal, mesonephric or gastric-type differentiation.',
  'Adenocarcinoma, HPV-associated': 'Infiltrating endocervical-type mucinous glands, papillae and confluent cribriform arrays lined by stratified columnar cells invade the vaginal wall. Prominent apical mitotic figures and basal apoptotic bodies are characteristic, accompanied by diffuse block-type p16 positivity and high-risk HPV association.',
  'Adenocarcinoma, Skene, Cowper and Littre gland origin': 'Infiltrating acinar, tubular and cribriform glands with intracytoplasmic and extracellular mucin arise in paraurethral or periurethral gland distribution beneath intact vaginal mucosa. Tumour cells are cuboidal-to-columnar with variable nuclear pleomorphism and PSA/PSAP positivity in Skene gland lesions.',
  'Mucinous carcinoma, NOS': 'Infiltrating malignant glands and nests contain abundant intracytoplasmic or extracellular mucin without definitive gastric or intestinal subtyping.',
  'Mucinous carcinoma, gastric type': 'Well-formed to irregular infiltrating glands lined by columnar cells with abundant clear to pale eosinophilic cytoplasm, distinct cell borders and basally located atypical nuclei invade deeply into the vaginal wall. Exhibits neutral pyloric-type mucin, MUC6/HIK1083 positivity, negative p16 and frequent mutant-pattern p53.',
  'Mucinous carcinoma, intestinal type': 'Infiltrating malignant glands lined by pseudostratified columnar epithelium containing conspicuous goblet cells and occasional Paneth or neuroendocrine cells closely resemble colorectal adenocarcinoma. Typically expresses CDX2 and CK20 with variable CK7 and negative p16.',
  'Endometrioid carcinoma': 'Confluent back-to-back and infiltrating endometrioid glands lined by stratified columnar cells with eosinophilic cytoplasm, smooth luminal borders and occasional squamous morules or mucinous metaplasia invade the vaginal wall. Frequently arises in association with vaginal endometriosis.',
  'Clear cell carcinoma': 'Tubulocystic, papillary and solid architectures lined by polygonal and characteristic "hobnail" cells with abundant optically clear, glycogen-rich cytoplasm and eccentric pleomorphic nuclei infiltrate the vaginal wall. Hyalinised eosinophilic papillary cores and PAS-positive diastase-sensitive cytoplasm are classic, with PAX8, HNF1beta and Napsin A positivity.',
  'Mesonephric carcinoma': 'Admixture of small tightly packed tubules containing dense eosinophilic PAS-positive luminal colloid-like secretions alongside ductal, papillary, retiform and solid growth patterns. Tumour cells show uniform oval-to-angulated nuclei with chromatin clearing and nuclear grooves, positive for GATA3, TTF1, PAX8 and luminal CD10, and negative for ER/PR.',
  'Adenosquamous carcinoma': 'Biphasic malignant epithelial neoplasm composed of intimately admixed malignant glandular (mucin-producing tubules/acini) and malignant squamous cell carcinoma components invading the vaginal stroma.',
  'Adenoid basal carcinoma': 'Small, well-circumscribed nests and slender cords of bland basaloid cells with peripheral nuclear palisading and focal central squamous or glandular differentiation infiltrate without a desmoplastic stromal reaction. Mitotic activity is low and prognosis is favourable when pure.',
  'Small cell neuroendocrine carcinoma': 'Diffuse sheets and cords of small round-to-fusiform cells with scant cytoplasm, finely granular hyperchromatic chromatin, inconspicuous nucleoli and prominent nuclear moulding infiltrate the vaginal wall. Extensive geographic necrosis, crush artefact, brisk mitoses and synaptophysin/chromogranin A/INSM1 positivity are hallmarks.',
  'Large cell neuroendocrine carcinoma': 'Organoid nests, trabeculae and rosettes of large polygonal cells with moderate eosinophilic cytoplasm, vesicular nuclei, prominent nucleoli, extensive geographic necrosis and brisk mitotic activity infiltrate the vaginal wall with neuroendocrine marker expression.',
  'Combined small cell neuroendocrine carcinoma': 'High-grade small cell neuroendocrine carcinoma is intimately admixed with a distinct non-neuroendocrine carcinoma component (most commonly squamous cell carcinoma or adenocarcinoma).',
  'Combined large cell neuroendocrine carcinoma': 'Large cell neuroendocrine carcinoma is intimately admixed with a distinct non-neuroendocrine carcinoma component (squamous cell carcinoma or adenocarcinoma).',
  'Neuroendocrine tumour, NOS': 'Well-differentiated organoid nests and trabeculae of uniform neuroendocrine cells with round nuclei, coarsely stippled chromatin and low-to-intermediate mitotic activity infiltrate the vaginal wall.',
  'Undifferentiated carcinoma': 'Diffuse sheets of discohesive, markedly pleomorphic epithelioid or rhabdoid cells completely lack squamous, glandular or neuroendocrine differentiation, with extensive necrosis and brisk atypical mitoses.',
  'Mixed tumour, NOS': 'Well-circumscribed biphasic vaginal neoplasm (spindle-cell epithelioma / mixed tumour of vagina) combining bland stromal spindle cells with mature squamous or mucinous epithelial nests.',
  'Carcinosarcoma': 'Biphasic high-grade malignancy intimately combining high-grade carcinoma (serous, endometrioid or squamous) with a malignant homologous or heterologous sarcomatous component.',
  'Adenosarcoma': 'Biphasic neoplasm combining benign-appearing Mullerian or endometrioid glands with condensed periglandular cuffs of atypical endometrial-stroma-like spindle cells forming intraglandular polypoid projections and leaf-like clefts.',
  'Germ cell tumour (specify)': 'Malignant germ cell neoplasm (most commonly paediatric yolk sac tumour) exhibiting reticular, microcystic, papillary and endodermal sinus (Schiller-Duval body) architecture with hyaline globules and SALL4/AFP reactivity.',
  'Carcinoma, type cannot be determined': 'Infiltrating malignant epithelial cells with nuclear atypia and stromal desmoplasia are present without lineage-specific architectural features.',
  'Other (specify)': 'Infiltrating malignant neoplasm of the vagina is present with stromal invasion.'
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
