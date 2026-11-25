// Urinary bladder carcinoma cystectomy — synoptic report (QMH UG-Urinary Bladder,
// CAP Urinary Bladder 4.2.0.0, WHO 5th edition 2022, AJCC 8th edition Chapter 62).
//
// Sources:
//   QMH Cancer Reporting Template UG-Urinary Bladder:
//     https://awiloqmh.github.io/CancerReportingTemplate/UG-Urinary%20Bladder.html
//     (saved as docs/reference/UG-Urinary-Bladder.html)
//   CAP Protocol for the Examination of Cystectomy Specimens From Patients With Carcinoma
//     of the Urinary Bladder, v4.2.0.0 (June 2023)
//   WHO Classification of Urinary and Male Genital Tumours, 5th edition (2022)
//   Staging: src/staging/bladder.js (AJCC 8th edition, Chapter 62).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/bladder.js';
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

// ---------- specimen & procedure ----------

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
  const p = v.procedure || 'Radical cystectomy';
  if (p === 'Radical cystoprostatectomy') return 'Urinary bladder, prostate and seminal vesicles, radical cystoprostatectomy';
  if (p === 'Anterior exenteration') return 'Urinary bladder, uterus, adnexa and anterior vagina, anterior exenteration';
  return `Urinary bladder, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'bladder'); }

// ---------- macro ----------

function sizeText(raw, defaultUnit = 'cm') {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ` ${defaultUnit}`;
  return s;
}

function siteList(v) {
  const xs = arr(v.site).map((x) => lc1(x));
  const other = stripDot(v.siteOther);
  if (other) xs.push(lc1(other));
  return listJoin(xs);
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const proc = lc1(procedureValue(v));
  const dims = sizeText(v.specimenDims, 'cm');
  const bits = [`${tag}Received in formalin is a ${proc} specimen${dims ? ` measuring ${dims}` : ''}.`];

  const sz = num(v.sizeMm);
  const loc = siteList(v);
  const cfg = v.configuration && v.configuration !== 'Not specified' ? lc1(v.configuration) : '';
  if (sz !== null) {
    bits.push(`Opening the bladder reveals a ${fmt(sz)} mm${cfg ? ` ${cfg}` : ''} tumour involving the ${loc || 'bladder wall'}.`);
  } else if (v.noPrimary === true) {
    bits.push('Opening the bladder shows a mucosal scar / ulcerated area without a definite residual gross mass.');
  }

  const adj = stripDot(v.adjacentOrgansGross);
  if (adj) bits.push(`Attached organs: ${lc1(adj)}.`);

  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

// ---------- histologic type & grade ----------

const SPECIFY_RE = /\s*\(specify\)$/;

export function histTypeName(v) {
  const t = v.histType || '';
  if (!t) return 'Histologic type not specified';
  const extra = stripDot(v.histTypeOther);
  if (SPECIFY_RE.test(t)) {
    const base = t.replace(SPECIFY_RE, '');
    return extra ? `${base} (${extra})` : base;
  }
  const pct = num(v.subtypePct);
  if (pct !== null && t !== 'Urothelial carcinoma, conventional (invasive)') {
    return `${t} (${fmt(pct)}%)`;
  }
  return t;
}

const TYPE_MORPH = {
  'Urothelial carcinoma, conventional (invasive)': 'Irregular nests and sheets of pleomorphic urothelial cells with eosinophilic cytoplasm and frequent mitoses infiltrate through the lamina propria into the bladder wall.',
  'Urothelial carcinoma, micropapillary': 'Small tight clusters and delicate papillary tufts without fibrovascular cores lie within prominent retraction spaces.',
  'Urothelial carcinoma, plasmacytoid': 'Discohesive infiltrative tumour cells with eccentric nuclei and abundant eosinophilic cytoplasm permeate the bladder wall in single-file cords and sheets.',
  'Urothelial carcinoma, nested': 'Deceptively bland nests and tubules of urothelial cells infiltrate deeply into the lamina propria and muscularis propria with subtle basal atypia.',
  'Urothelial carcinoma, sarcomatoid': 'Biphasic malignant neoplasm combines high-grade urothelial carcinoma with a pleomorphic malignant spindle cell / sarcomatoid component.',
  'Urothelial carcinoma, clear cell (glycogen-rich)': 'Infiltrating nests and sheets of high-grade urothelial cells contain abundant optically clear, glycogen-rich cytoplasm.',
  'Urothelial carcinoma with squamous differentiation': 'Invasive high-grade urothelial carcinoma exhibits areas of keratinisation and intercellular bridges.',
  'Urothelial carcinoma with glandular differentiation': 'Invasive high-grade urothelial carcinoma includes true malignant glandular lumina containing mucin.',
  'Small cell neuroendocrine carcinoma': 'Sheets of small hyperchromatic cells with scant cytoplasm, nuclear moulding, high mitotic activity and extensive necrosis infiltrate the bladder wall.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  if (v.noPrimary === true) {
    return 'Extensive sampling of the tumour bed shows fibrosis, chronic inflammation and therapy-related changes with no residual carcinoma identified.';
  }
  const what = lc1(histTypeName(v));
  const gr = v.grade && !/^Not applicable|Cannot be assessed/.test(v.grade) ? `, ${lc1(v.grade)}` : '';
  let s = `Sections of the urinary bladder show ${what}${gr}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

// ---------- margins, nodes, mets ----------

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by invasive carcinoma and CIS';
  const items = [{ label: 'Surgical margins', value: st }];
  const detail = [
    v.rightUreterMargin ? { label: 'Right ureteral margin', value: v.rightUreterMargin } : null,
    v.leftUreterMargin ? { label: 'Left ureteral margin', value: v.leftUreterMargin } : null,
    v.urethralMargin ? { label: 'Urethral margin', value: v.urethralMargin } : null,
    v.softTissueMargin ? { label: 'Perivesical soft tissue margin', value: v.softTissueMargin } : null
  ].filter(Boolean);
  if (detail.length) items[0].sub = detail;
  const d = num(v.closestMarginMm);
  const site = stripDot(v.closestMarginSite);
  if (d !== null && /uninvolved/i.test(st)) {
    items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm${site ? ` (${lc1(site)})` : ''}` });
  }
  return items;
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const site = stripDot(v.nodeSites);
  const ci = int(v.commonIliacInvolved) ?? 0;
  const ciNote = ci > 0 ? `; common iliac nodes involved: ${ci}` : (v.commonIliacPositive === true ? '; common iliac node(s) involved' : '');
  const items = [{ label: 'Regional lymph nodes', value: `${inv} of ${ex} involved${site ? ` (${site})` : ''}${ciNote}` }];
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
    const list = listJoin(sites.map((s) => (s === S.METS.nonLn ? (detail ? `Non-lymph node distant metastasis (${detail})` : 'Non-lymph node distant metastasis') : s)).map((s, i) => (i ? lc1(s) : s)));
    return list;
  }
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

function additionalFindingsValue(v) {
  const xs = arr(v.additionalFindings);
  const other = stripDot(v.additionalOther);
  if (other) xs.push(uc1(other));
  return xs.length ? xs.join('; ') : 'None identified';
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const sz = num(v.sizeMm);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      siteList(v) ? item('Tumour site', uc1(siteList(v))) : null,
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null,
      v.configuration && v.configuration !== 'Not specified' ? item('Tumour configuration', v.configuration) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', v.noPrimary === true ? 'No residual carcinoma identified (pT0)' : histTypeName(v)),
      v.noPrimary === true ? null : item('Histologic grade', v.grade || 'High-grade'),
      item('Associated urothelial carcinoma in situ (UCIS)', v.cisStatus || 'Not identified'),
      item('Tumour extension (depth of invasion)', v.noPrimary === true ? 'No residual primary tumour (pT0)' : (v.extension || 'Not specified')),
      v.prostateInvasion && v.prostateInvasion !== 'Not applicable' ? item('Prostatic involvement (if cystoprostatectomy)', v.prostateInvasion) : null,
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      v.pni && v.pni !== 'Not assessed' ? item('Perineural invasion', v.pni) : null,
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      item('Additional pathologic findings', additionalFindingsValue(v)),
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- molecular findings ----------

export function molecular(part) {
  const v = part.values;
  const items = [];
  if (v.pdl1 && v.pdl1 !== 'Not performed') items.push({ label: 'PD-L1 IHC', value: v.pdl1 });
  if (v.her2 && v.her2 !== 'Not performed') items.push({ label: 'HER2 IHC', value: v.her2 });
  if (stripDot(v.molecularNotes)) items.push({ label: 'Other molecular / biomarker studies', value: uc1(stripDot(v.molecularNotes)) });
  if (!items.length) return '';
  return renderSynoptic([{ heading: 'Molecular studies', items }], '');
}

// ---------- diagnosis ----------

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const clauses = [];

  if (v.noPrimary === true) {
    clauses.push('NO RESIDUAL CARCINOMA IDENTIFIED (complete pathological response / status post therapy)');
  } else {
    const sz = num(v.sizeMm);
    const firstBits = [histTypeName(v).replace(/, conventional \(invasive\)$/, '').toUpperCase()];
    if (v.grade && !/^Not applicable|Cannot be assessed/.test(v.grade)) firstBits.push(lc1(v.grade));
    if (sz !== null) firstBits.push(`${fmt(sz)} mm`);
    clauses.push(firstBits.join(', '));
    if (v.extension && v.extension !== S.EXT.cannot) {
      clauses.push(`Tumour invades ${lc1(v.extension).replace(/\s*\(pT[a-z0-9]+\)$/i, '')}`);
    }
  }

  if (v.cisStatus && /^Present\b/.test(v.cisStatus)) {
    clauses.push(`Associated urothelial carcinoma in situ (${lc1(v.cisStatus)})`);
  }

  if (/^Involved/i.test(v.marginStatus || '')) {
    clauses.push(v.marginStatus);
  } else if (v.marginStatus === 'Cannot be assessed') {
    clauses.push('Surgical margins cannot be assessed');
  } else {
    clauses.push('Surgical margins clear of invasive carcinoma and CIS');
  }

  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) {
    let np = `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
    if (inv > 0 && v.ene === 'Present') np += '; extranodal extension present';
    clauses.push(np);
  }

  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && st.tnm) {
    clauses.push(`${st.tnm} (${st.edition})`);
  }

  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

// ---------- checks ----------

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);

  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType && !v.noPrimary) err('Histologic type not recorded.', 'histType');

  // Prostatic involvement vs pT4a clarification:
  if (v.prostateInvasion === 'Prostatic urethra / ducts / acini only (NOT pT4a)' && v.extension === S.EXT.t4a) {
    warn('Prostatic involvement via urethra/ducts/acini only is NOT pT4a (only direct transmural invasion from the bladder into prostatic stroma is pT4a).', 'extension');
  }

  // Margin consistency:
  const subMargins = [v.rightUreterMargin, v.leftUreterMargin, v.urethralMargin, v.softTissueMargin].filter(Boolean);
  if (/uninvolved/i.test(v.marginStatus || '') && subMargins.some((m) => /^Involved/i.test(m))) {
    warn('Overall margin status is uninvolved, but an individual margin is marked Involved.', 'marginStatus');
  }

  // Nodes:
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  const ci = int(v.commonIliacInvolved);
  if (ex !== null && inv !== null && inv > ex) {
    err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  }
  if (ci !== null && inv !== null && ci > inv) {
    err(`Common iliac nodes involved (${ci}) exceeds total regional nodes involved (${inv}).`, 'commonIliacInvolved');
  }
  if (inv !== null && inv > 0 && !v.ene) {
    info('Positive lymph nodes recorded: extranodal extension (ENE) not recorded.', 'ene');
  }

  // Staging notes & reference lines:
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');

  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, diagnosis, validate, staging };
