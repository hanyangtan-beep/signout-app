// Extrahepatic bile duct carcinoma resection — synoptic report (Perihilar & Distal,
// CAP Perihilar / Distal Extrahepatic Bile Ducts 4.2.0.0, WHO 5th/6th edition, AJCC 8th Ch. 25–26).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/bile_duct.js';
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
  const loc = S.isDistal(v) ? 'Distal extrahepatic bile duct' : 'Perihilar bile ducts';
  return `${loc}, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'bile_duct'); }

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
  const sub = stripDot(v.subsite);
  if (sz !== null) {
    bits.push(`Sectioning reveals a ${fmt(sz)} mm firm stenosing tumour${sub ? ` involving the ${lc1(sub)}` : ''}.`);
  }
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
  'Adenocarcinoma, pancreatobiliary-type': 'Widely spaced, angulated irregular glands and single cells lined by cuboidal to low columnar cells with eosinophilic cytoplasm, nuclear size variation (>= 4:1), loss of polarity and intraluminal necrotic debris infiltrate a dense desmoplastic stroma.',
  'Adenocarcinoma, intestinal-type': 'Elongated branching tubular and cribriform glands lined by tall pseudostratified columnar cells with elongated cigar-shaped hyperchromatic nuclei, apical mucin and variable goblet cells infiltrate the bile duct wall.',
  'Adenocarcinoma, gastric foveolar-type': 'Well-formed glands lined by tall columnar cells with abundant pale apical mucinous cytoplasm and basally located atypical nuclei elicit a fibrotic stromal reaction.',
  'Mucinous adenocarcinoma': 'Lakes of extracellular mucin comprising > 50% of the tumour volume contain floating strips, clusters and signet-ring-like cells of malignant biliary epithelium.',
  'Clear cell adenocarcinoma': 'Infiltrating glands, tubules and solid nests are composed of polygonal cells with abundant optically clear, glycogen-rich cytoplasm and eccentric hyperchromatic nuclei.',
  'Signet-ring cell carcinoma': 'Discohesive infiltrating malignant cells with prominent intracytoplasmic mucin vacuoles compressing crescentic nuclei peripherally permeate the fibromuscular wall.',
  'Adenosquamous carcinoma': 'Infiltrating pancreatobiliary-type adenocarcinoma is intimately admixed with a malignant squamous component (>= 25%) showing keratinisation and intercellular bridges.',
  'Squamous cell carcinoma': 'Infiltrating nests and sheets of malignant squamous cells with eosinophilic cytoplasm, intercellular bridges and keratin pearls lack a glandular component.',
  'Intraductal papillary neoplasm with associated invasive carcinoma': 'An intraductal fibrovascular papillary neoplasm lined by atypical biliary epithelium gives rise to an invasive stromal adenocarcinoma component.',
  'Small cell neuroendocrine carcinoma': 'Diffuse sheets and nests of small hyperchromatic cells with scant cytoplasm, nuclear moulding, finely granular chromatin, brisk mitotic activity (> 20/2 mm2) and geographic necrosis infiltrate the duct wall.',
  'Large cell neuroendocrine carcinoma': 'Organoid nests, trabeculae and rosettes of large polygonal cells with abundant cytoplasm, vesicular nuclei, prominent nucleoli, brisk mitoses (> 20/2 mm2) and extensive necrosis are present.',
  'Mixed neuroendocrine-non-neuroendocrine neoplasm (MiNEN) (specify)': 'Distinct morphological components of invasive biliary adenocarcinoma and neuroendocrine neoplasm (each >= 30%) coexist within the tumour.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = lc1(histTypeName(v));
  const gr = v.grade && !/^Not applicable|GX\b/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the extrahepatic bile duct show ${what}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  if (morph) s += ` ${morph}`;
  if (stripDot(v.ihcText)) s += ` ${uc1(stripDot(v.ihcText))}.`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by invasive carcinoma and high-grade BilIN';
  const items = [{ label: 'Surgical margins', value: st }];
  const sub = [
    v.proximalDuctMargin ? { label: 'Proximal bile duct margin', value: v.proximalDuctMargin } : null,
    v.distalDuctMargin ? { label: 'Distal bile duct margin', value: v.distalDuctMargin } : null,
    v.radialMargin ? { label: 'Radial / periductal soft tissue margin', value: v.radialMargin } : null,
    v.hepaticMargin && v.hepaticMargin !== 'Not applicable' ? { label: 'Hepatic parenchymal margin', value: v.hepaticMargin } : null
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
  const depth = num(v.invasionDepthMm);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Anatomic location', v.anatomicLocation || 'Perihilar bile ducts'),
      stripDot(v.subsite) ? item('Subsite / Bismuth-Corlette extent', uc1(stripDot(v.subsite))) : null,
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Histologic grade', v.grade || 'Not specified'),
      S.isDistal(v)
        ? item('Depth of invasion (distal bile duct)', depth !== null ? `${fmt(depth)} mm` : 'Not specified')
        : null,
      item('Tumour extension', S.isDistal(v) ? (v.distalExtension || 'Not specified') : (v.perihilarExtension || 'Not specified')),
      item('Precursor lesion (BilIN / IPNB)', v.precursor || 'Not identified'),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy' ? item('Treatment effect', v.treatmentEffect) : null,
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
  if (v.her2 && v.her2 !== 'Not performed') items.push({ label: 'HER2 IHC', value: v.her2 });
  if (v.mmr && v.mmr !== 'Not performed') items.push({ label: 'MMR IHC', value: v.mmr });
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
  const first = [histTypeName(v).toUpperCase()];
  if (v.grade && !/^Not applicable|GX\b/.test(v.grade)) first.push(lc1(v.grade));
  if (sz !== null) first.push(`${fmt(sz)} mm`);
  const clauses = [first.join(', ')];

  if (S.isDistal(v) && num(v.invasionDepthMm) !== null) {
    clauses.push(`Depth of invasion ${fmt(num(v.invasionDepthMm))} mm`);
  } else if (!S.isDistal(v) && v.perihilarExtension && v.perihilarExtension !== S.PERIHILAR_EXT.cannot) {
    clauses.push(v.perihilarExtension.replace(/\s*\(pT[a-z0-9]+\)$/i, ''));
  }

  if (v.pni === 'Present') clauses.push('Perineural invasion present');
  clauses.push(v.marginStatus || 'All margins uninvolved by invasive carcinoma and high-grade BilIN');

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
  if (S.isDistal(v) && v.distalExtension === S.DISTAL_EXT.invasive && num(v.invasionDepthMm) === null) {
    warn('Distal bile duct carcinoma requires depth of invasion (mm) for AJCC 8th pT1 (< 5 mm), pT2 (5–12 mm), or pT3 (> 12 mm).', 'invasionDepthMm');
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
