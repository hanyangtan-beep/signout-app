// Anal canal carcinoma resection — synoptic report
// (QMH GI-Anus, CAP Anus 5.0.0.0, WHO 5th edition, AJCC 9th edition).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/anal.js';
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
  if (v.site === 'Other (specify)') return uc1(stripDot(v.siteOther)) || 'Anal canal';
  return v.site || 'Anal canal';
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

export function staging(part) { return deriveTNM(part.values, 'anal'); }

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
  const bits = [`${tag}Received in formalin is an ${lc1(v.specimenIntegrity || 'intact')} ${proc} specimen of the ${lc1(siteValue(v))}${dims ? ` measuring ${dims}` : ''}.`];
  const sz = num(v.sizeMm);
  if (sz !== null) {
    bits.push(`Examination reveals a ${fmt(sz)} mm ulcerated / indurated tumour.`);
  } else if (v.noPrimary === true) {
    bits.push('Examination reveals a scarred mucosal bed without a definite residual gross mass.');
  }
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Squamous cell carcinoma': 'Irregular infiltrating nests, cords and sheets of malignant squamous cells exhibit eosinophilic cytoplasm, intercellular bridges, variable keratinisation and nuclear pleomorphism within a desmoplastic stroma.',
  'Basaloid squamous cell carcinoma': 'Lobules and anastomosing nests of basaloid cells with scant cytoplasm, hyperchromatic nuclei, peripheral nuclear palisading, central comedonecrosis and stromal retraction infiltrate the anal wall.',
  'Verrucous squamous cell carcinoma': 'Exophytic papillomatous projections of bland, well-differentiated keratinising squamous epithelium advance on a broad pushing front of bulbous rete pegs with minimal cytologic atypia.',
  'Basal cell carcinoma': 'Infiltrating dermal lobules of uniform basaloid cells demonstrate prominent peripheral nuclear palisading and peritumoural stromal clefting.',
  'Adenocarcinoma': 'Infiltrating malignant glandular structures lined by stratified columnar cells with mucin production and luminal necrosis invade the anal wall.',
  'Adenocarcinoma of the anal glands': 'Small tubules and glands lined by cuboidal to columnar cells with scant mucin infiltrate around benign anal ducts without an overlying colorectal mucosal adenoma.',
  'Large cell neuroendocrine carcinoma': 'Organoid nests and trabeculae of large cells with abundant cytoplasm, coarse chromatin, prominent nucleoli, geographic necrosis and > 20 mitoses/2 mm2 infiltrate the anal wall.',
  'Small cell neuroendocrine carcinoma': 'Sheets of small hyperchromatic cells with scant cytoplasm, nuclear moulding, crush artefact, extensive necrosis and brisk mitotic activity (> 20/2 mm2) infiltrate the wall.',
  'Neuroendocrine carcinoma': 'Poorly differentiated neuroendocrine tumour cells arranged in diffuse sheets with extensive necrosis exhibit high mitotic activity (> 20/2 mm2).',
  'Mixed neuroendocrine-non-neuroendocrine neoplasm (MiNEN)': 'Distinct neuroendocrine and non-neuroendocrine malignant components each comprise >= 30% of the tumour.',
  'Undifferentiated carcinoma': 'Diffuse sheets of pleomorphic cells lack definitive squamous, glandular or neuroendocrine differentiation.',
  'Carcinoma, type cannot be determined': 'Infiltrating malignant epithelial cells are present without lineage-specific architectural features.',
  'Other histologic type not listed (specify)': 'Infiltrating malignant epithelial neoplasm is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Squamous cell carcinoma';
  if (t === 'Other histologic type not listed (specify)') {
    return uc1(stripDot(v.histTypeOther)) || 'Carcinoma';
  }
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
  const p16Text = v.p16 && v.p16 !== 'Not performed' ? `p16 immunohistochemistry shows ${lc1(v.p16)} staining.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, p16Text, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by invasive carcinoma and high-grade intraepithelial neoplasia';
  const items = [{ label: 'Surgical margins', value: st }];
  const sub = [
    v.proximalMargin && v.proximalMargin !== 'Not applicable' ? { label: 'Proximal margin', value: v.proximalMargin } : null,
    v.distalMargin ? { label: 'Distal / mucosal margin', value: v.distalMargin } : null,
    v.radialMargin ? { label: 'Circumferential (radial) / deep margin', value: v.radialMargin } : null
  ].filter(Boolean);
  if (sub.length) items[0].sub = sub;
  const d = num(v.closestMarginMm);
  if (d !== null && /uninvolved/i.test(st)) {
    items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm${stripDot(v.closestMarginSite) ? ` (${lc1(stripDot(v.closestMarginSite))})` : ''}` });
  }
  return items;
}

function nodeItems(v) {
  const extEx = int(v.externalIliacExamined) ?? 0;
  const extInv = int(v.externalIliacInvolved) ?? 0;
  const othEx = int(v.otherNodesExamined) ?? 0;
  const othInv = int(v.otherNodesInvolved) ?? 0;
  const totalEx = extEx + othEx;
  const totalInv = extInv + othInv;
  if (totalEx <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const items = [{ label: 'Regional lymph nodes', value: `${totalInv} of ${totalEx} involved` }];
  if (othEx > 0) items[0].sub = [...(items[0].sub || []), { label: 'Inguinal / mesorectal / internal iliac', value: `${othInv} of ${othEx} involved` }];
  if (extEx > 0) items[0].sub = [...(items[0].sub || []), { label: 'External iliac', value: `${extInv} of ${extEx} involved` }];
  if (totalInv > 0) {
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
      item('Specimen integrity', v.specimenIntegrity || 'Intact'),
      item('Tumour site', siteValue(v)),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', v.noPrimary === true ? 'No residual carcinoma identified (pT0)' : histTypeName(v)),
      v.noPrimary === true ? null : item('Histologic grade', v.grade || 'G2: Moderately differentiated'),
      item('Tumour extension', v.noPrimary === true ? 'No residual primary tumour (pT0)' : (arr(v.extension).length ? arr(v.extension).join('; ') : 'Not specified')),
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
  clauses.push(v.marginStatus || 'All margins uninvolved by invasive carcinoma and high-grade intraepithelial neoplasia');

  const extEx = int(v.externalIliacExamined) ?? 0;
  const extInv = int(v.externalIliacInvolved) ?? 0;
  const othEx = int(v.otherNodesExamined) ?? 0;
  const othInv = int(v.otherNodesInvolved) ?? 0;
  const totalEx = extEx + othEx;
  const totalInv = extInv + othInv;
  if (totalEx > 0) {
    let np = `${totalInv} of ${totalEx} regional lymph node${totalEx === 1 ? '' : 's'} involved`;
    if (totalInv > 0 && v.ene === 'Present') np += '; extranodal extension present';
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
  const extEx = int(v.externalIliacExamined) ?? 0;
  const extInv = int(v.externalIliacInvolved) ?? 0;
  const othEx = int(v.otherNodesExamined) ?? 0;
  const othInv = int(v.otherNodesInvolved) ?? 0;
  if (extInv > extEx) err(`External iliac nodes: ${extInv} involved exceeds ${extEx} examined.`, 'externalIliacInvolved');
  if (othInv > othEx) err(`Inguinal / mesorectal / internal iliac nodes: ${othInv} involved exceeds ${othEx} examined.`, 'otherNodesInvolved');
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
