// Small intestine carcinoma resection — synoptic report
// (QMH GI-Small intestine, CAP Small Intestine 4.3.0.0, WHO 5th edition, AJCC 8th edition Ch. 18).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/small_intestine.js';
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

function siteValue(v) {
  if (v.site === 'Other (specify)') return uc1(stripDot(v.siteOther)) || 'Small intestine';
  return v.site || 'Small intestine';
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  return `${siteValue(v)}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'small_intestine'); }

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
  const bits = [`${tag}Received in formalin is a ${proc} specimen of the ${lc1(siteValue(v))}${dims ? ` measuring ${dims}` : ''}.`];
  const sz = num(v.sizeMm);
  if (sz !== null) {
    bits.push(`Opening the bowel reveals a ${fmt(sz)} mm ulcerated and infiltrative tumour.`);
  } else if (v.noPrimary === true) {
    bits.push('Opening the bowel shows mucosal scarring without a definite residual gross mass.');
  }
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Adenocarcinoma, NOS': 'Irregular, angulated and cribriform infiltrating tubules and solid nests invade through the bowel wall within a prominent desmoplastic stroma. Neoplastic columnar-to-cuboidal cells show eosinophilic-to-amphophilic cytoplasm, loss of nuclear polarity, nuclear stratification, hyperchromasia and variable pleomorphism. Dirty intraluminal necrosis, brisk mitotic activity and adjacent adenomatous or chronic inflammatory precursors (such as coeliac or Crohn disease) are common.',
  'Mucinous adenocarcinoma (greater than 50% mucinous)': 'Expansive pools of extracellular mucin constituting > 50% of the tumour volume dissect through the muscularis propria and serosa. Floating within the mucin lakes are strips, clusters, irregular glands and isolated columns of malignant mucin-secreting columnar cells with atypical nuclei, occasionally admixed with focal signet-ring cells. Pushing or dissecting borders and prominent tumour-infiltrating lymphocytes are frequent, particularly in dMMR/MSI-H cases.',
  'Poorly cohesive cell carcinoma': 'Discohesive single malignant cells, narrow cords and small non-glandular clusters infiltrate diffusely through all mural layers with minimal or absent tubule formation. Cells show eccentric hyperchromatic nuclei, variable eosinophilic or vacuolated cytoplasm and brisk mitotic activity within a fibrotic stroma. Frequent lymphovascular and perineural invasion with diffuse mural thickening is characteristic.',
  'Signet-ring cell carcinoma': 'Predominantly (> 50%) discohesive neoplastic cells contain prominent intracytoplasmic mucin vacuoles that compress and displace hyperchromatic, crescent-shaped nuclei to the cell periphery. Cells infiltrate diffusely as single cells, cords or small clusters through fibrotic stroma or extracellular mucin pools. Diffuse linitis-plastica-like wall thickening, frequent lymphovascular/perineural invasion and association with Crohn disease or peritoneal spread are hallmarks.',
  'Medullary carcinoma': 'Well-circumscribed, pushing-border carcinoma arranged in solid sheets, trabeculae and syncytial aggregates with minimal or absent gland formation across >= 50% of the tumour. Tumour cells are uniform and polygonal with abundant eosinophilic cytoplasm, indistinct cell borders, large vesicular nuclei and prominent nucleoli. Dense intratumoral and peritumoral T-lymphocytic infiltration, strong association with coeliac disease and dMMR/MSI-H, and frequent loss of CDX2/CK20 are diagnostic hallmarks.',
  'Adenosquamous carcinoma': 'Biphasic malignant epithelial neoplasm composed of intimately admixed or juxtaposed malignant glandular (adenocarcinoma) and malignant squamous cell carcinoma components infiltrating the bowel wall. The glandular element forms mucin-producing tubules or cribriform glands, while the squamous component exhibits polygonal eosinophilic cells with intercellular bridges, individual cell keratinisation and keratin pearls. Both components show high-grade nuclear atypia, frequent mitoses and desmoplastic stroma.',
  'Squamous cell carcinoma': 'Infiltrating nests, anastomosing cords and sheets of atypical polygonal squamous cells exhibit intercellular bridges, dyskeratosis and variable keratin pearl formation within a desmoplastic stroma. Glandular differentiation and mucin production are absent. Direct extension from an adjacent organ or metastasis must be excluded clinically.',
  'Large cell neuroendocrine carcinoma': 'Poorly differentiated high-grade carcinoma displaying organoid nests, trabeculae and rosette-like structures with peripheral nuclear palisading and extensive geographic necrosis. Tumour cells are large and polygonal with moderate eosinophilic cytoplasm, large vesicular or coarsely granular nuclei and prominent nucleoli. Mitotic activity exceeds 20 per 2 mm2 (Ki-67 > 20%), with strong synaptophysin, chromogranin A or INSM1 immunoreactivity.',
  'Small cell neuroendocrine carcinoma': 'Diffuse sheets, irregular nests and ribbons of small round-to-fusiform cells (< 3 resting lymphocytes) infiltrate the bowel wall with extensive geographic necrosis and frequent crush artefact. Cells display scant cytoplasm, high nuclear-to-cytoplasmic ratios, hyperchromatic finely granular chromatin, inconspicuous nucleoli and prominent nuclear moulding. Abundant mitoses (> 20 per 2 mm2), brisk apoptosis and aberrant p53/Rb1 expression are hallmarks.',
  'Neuroendocrine carcinoma (poorly differentiated)': 'Poorly differentiated high-grade neuroendocrine neoplasm arranged in diffuse sheets and irregular nests with extensive coagulative necrosis. Neoplastic cells exhibit marked nuclear atypia, coarse or finely stippled chromatin, brisk mitotic activity (> 20 per 2 mm2; Ki-67 > 20%) and frequent lymphovascular invasion. Diffuse neuroendocrine marker expression separates it from undifferentiated carcinoma.',
  'Mixed neuroendocrine-non-neuroendocrine neoplasm (MiNEN) (specify components)': 'Two morphologically and immunohistochemically distinct neoplastic populations—one neuroendocrine (typically SCNEC or LCNEC, rarely NET) and one non-neuroendocrine (most commonly adenocarcinoma)—each comprise >= 30% of the tumour volume. Architecture may be composite (closely intermingled with transitional zones) or collision-like, distinct from amphicrine carcinoma. Both components must be graded and quantified individually.',
  'Undifferentiated carcinoma, NOS': 'Diffuse sheets of discohesive, markedly pleomorphic epithelioid, rhabdoid or spindle cells completely lack glandular, squamous or neuroendocrine differentiation. Eccentric paranuclear hyaline inclusions, vesicular nuclei with prominent macronucleoli, extensive geographic necrosis and brisk atypical mitoses are common. SWI/SNF complex deficiency (loss of SMARCA4/BRG1 or SMARCB1/INI1) should be evaluated.',
  'Carcinoma, type cannot be determined': 'Infiltrating malignant epithelial cells with nuclear pleomorphism, high mitotic activity and stromal desmoplasia are present without definitive lineage-specific architectural features.',
  'Other (specify)': 'Infiltrating malignant epithelial neoplasm of the small intestine is present with stromal invasion and cytologic atypia.'
};

export function histTypeName(v) {
  const t = v.histType || 'Adenocarcinoma, NOS';
  const extra = stripDot(v.histTypeOther);
  if (/specify/i.test(t) && extra) return `${t.replace(/\s*\(specify[^)]*\)/i, '')} (${extra})`;
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  if (v.noPrimary === true) {
    return 'Extensive sampling of the tumour bed shows fibrosis, chronic inflammation and therapy-related changes with no residual carcinoma identified.';
  }
  const what = lc1(histTypeName(v));
  const gr = v.grade && !/^Not applicable|GX/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the ${lc1(siteValue(v))} show ${what}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by invasive carcinoma and high-grade dysplasia';
  const items = [{ label: 'Surgical margins', value: st }];
  const sub = [
    v.proximalMargin ? { label: 'Proximal margin', value: v.proximalMargin } : null,
    v.distalMargin ? { label: 'Distal margin', value: v.distalMargin } : null,
    v.radialMargin ? { label: 'Radial / mesenteric margin', value: v.radialMargin } : null
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
    return listJoin(sites.map((s) => (s === S.METS.other || s === S.METS.nonRegLn ? (detail || s.replace(/\s*\(specify\)/, '')) : s)).map((s, i) => (i ? lc1(s) : s)));
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
      item('Tumour site', siteValue(v)),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null,
      item('Macroscopic tumour perforation', v.perforation || 'Not identified')
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', v.noPrimary === true ? 'No residual carcinoma identified (pT0)' : histTypeName(v)),
      v.noPrimary === true ? null : item('Histologic grade', v.grade || 'G2: Moderately differentiated'),
      item('Tumour extension (depth of invasion)', v.noPrimary === true ? 'No residual primary tumour (pT0)' : (v.extension || 'Not specified')),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      item('Treatment effect', v.treatmentEffect || 'No known presurgical therapy'),
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
  if (v.mmr && v.mmr !== 'Not performed') items.push({ label: 'MMR IHC', value: v.mmr });
  if (v.her2 && v.her2 !== 'Not performed') items.push({ label: 'HER2 IHC', value: v.her2 });
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
  clauses.push(v.marginStatus || 'All margins uninvolved by invasive carcinoma and high-grade dysplasia');
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

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, diagnosis, validate, staging };
