// Bone tumour resection — synoptic report (QMH MS-Bone, CAP Bone Tumor Resection 4.2.0.0,
// WHO 5th edition 2020 Soft Tissue and Bone Tumours, AJCC 8th edition Chapter 38).
//
// Sources:
//   QMH Cancer Reporting Template MS-Bone:
//     https://awiloqmh.github.io/CancerReportingTemplate/MS-Bone.html
//     (saved as docs/reference/MS-Bone.html)
//   CAP Protocol for the Examination of Resection Specimens From Patients With Primary Tumors of Bone,
//     v4.2.0.0 (June 2024)
//   WHO Classification of Soft Tissue and Bone Tumours, 5th edition (2020)
//   Staging: src/staging/bone.js (AJCC 8th edition, Chapter 38: Appendicular/trunk/skull, Spine, Pelvis).
//     Stage group (appendicular/trunk/skull only) shows in Checks only, never printed.

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/bone.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, letteredBlockKey, checks } from './_house.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const lcw = (s) => (/^[A-Z]{2,}|^[CTLS]\d/.test(s || '') ? s : lc1(s));
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const article = (w) => (/^[aeiou]/i.test(w || '') ? 'an' : 'a');
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
  const site = stripDot(v.site);
  const proc = v.procedure && v.procedure !== 'Not specified' ? lc1(procedureValue(v)) : 'resection';
  return site ? `${uc1(site)}, ${proc}` : `Bone, ${proc}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'bone'); }

// ---------- macro ----------

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
  const site = lcw(stripDot(v.site));
  const proc = v.procedure && v.procedure !== 'Not specified' ? lc1(procedureValue(v)) : 'resection';
  const dims = sizeText(v.specimenDims, 'cm');
  const orient = stripDot(v.orientation);
  const bits = [
    `${tag}Received in formalin is ${article(proc)} ${proc} specimen${site ? ` of the ${site}` : ''}${dims ? ` measuring ${dims}` : ''}${orient ? ` (${lc1(orient)})` : ''}.`
  ];

  const cs = arr(v.cutSurface).map((x) => lc1(x));
  const td = stripDot(v.tumourDims) ? sizeText(v.tumourDims, 'mm') : (num(v.tumourSizeMm) !== null ? `${fmt(num(v.tumourSizeMm))} mm` : '');
  const desc = cs.length ? `${article(cs[0])} ${listJoin(cs)} tumour` : 'a tumour';
  if (td || cs.length) {
    bits.push(`Sectioning shows ${desc}${td ? ` measuring ${td}` : ''}.`);
  }

  if (v.cortexStatus === 'Intact cortex') bits.push('The overlying cortex is intact.');
  else if (v.cortexStatus === 'Endosteal scalloping / cortical thinning') bits.push('There is endosteal scalloping and cortical thinning.');
  else if (v.cortexStatus === 'Cortical breach without soft tissue mass') bits.push('There is focal cortical breach without a discrete soft tissue mass.');
  else if (v.cortexStatus === 'Cortical destruction with soft tissue extension') bits.push('The tumour destroys the cortex and extends into the adjacent soft tissue.');
  else if (v.cortexStatus === 'Surface lesion without medullary invasion') bits.push('The lesion is centred on the bone surface without medullary cavity invasion.');

  const mm = num(v.macroMarginMm);
  const ms = stripDot(v.macroMarginSite);
  if (mm !== null) bits.push(`Macroscopically, the tumour lies ${fmt(mm)} mm from the closest${ms ? ` (${lc1(ms)})` : ''} margin.`);

  const b = int(v.blocks);
  if (b) {
    const decal = v.decalcification && v.decalcification !== 'None' ? ` after ${lc1(v.decalcification)} decalcification` : '';
    bits.push(`Representative sections are taken in ${plural(b, 'block', 'blocks')}${decal}.`);
  }
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

// ---------- histologic type & morphology ----------

const SPECIFY_RE = /\s*\(specify\)$/;

export function histTypeName(v) {
  const t = v.histType || '';
  if (!t) return 'Histologic type not specified';
  if (t === 'Conventional osteosarcoma' && v.osteosarcomaSubtype) {
    return `Conventional osteosarcoma (${lc1(v.osteosarcomaSubtype)} subtype)`;
  }
  const extra = stripDot(v.histTypeOther);
  if (SPECIFY_RE.test(t)) {
    const base = t.replace(SPECIFY_RE, '');
    return extra ? `${base} (${extra})` : base;
  }
  if (t === 'Cannot be determined' && extra) return `${t} (${lc1(extra)})`;
  return t;
}

const TYPE_MORPH = {
  'Conventional osteosarcoma': 'Proliferating pleomorphic, hyperchromatic malignant mesenchymal cells directly produce irregular lace-like and trabecular neoplastic osteoid.',
  'Telangiectatic osteosarcoma': 'Large blood-filled cystic spaces are lined by septa containing markedly atypical malignant cells with fine lace-like osteoid production.',
  'Small cell osteosarcoma': 'Sheets of uniform small round blue cells are accompanied by focal lace-like malignant osteoid deposition.',
  'Parosteal osteosarcoma': 'Well-formed parallel woven and lamellar bone trabeculae are separated by a bland, low-grade fibroblastic spindle cell stroma with minimal cytological atypia.',
  'Low-grade central osteosarcoma': 'Long anastomosing woven bone trabeculae lie within a mildly atypical, hypocellular fibroblastic spindle cell stroma permeating native lamellar bone.',
  'Atypical cartilaginous tumour': 'Lobules of hyaline cartilage show mildly increased cellularity, binucleate chondrocytes and focal permeation of host lamellar bone without high-grade atypia or mitotic activity.',
  'Chondrosarcoma': 'Lobules of malignant hyaline cartilage show increased cellularity, nuclear atypia, binucleation and permeation of host bone trabeculae with entrapment of pre-existing bone.',
  'Dedifferentiated chondrosarcoma': 'A well-differentiated cartilaginous neoplasm shows an abrupt transition to a high-grade non-cartilaginous sarcoma.',
  'Mesenchymal chondrosarcoma': 'A biphasic proliferation consists of sheets of undifferentiated small round cells intimately admixed with islands of well-differentiated hyaline cartilage and staghorn vessels.',
  'Clear cell chondrosarcoma': 'Lobules of neoplastic chondrocytes with abundant clear to pale eosinophilic cytoplasm, distinct cell borders and central round nuclei are admixed with woven bone trabeculae and osteoclast-like giant cells.',
  'Ewing sarcoma': 'Diffuse sheets of uniform small round cells with scant clear to amphophilic cytoplasm and finely stippled chromatin show minimal pleomorphism.',
  'Conventional chordoma': 'Lobules of cords and nests of epithelioid cells with prominent intracytoplasmic vacuoles (physaliphorous cells) lie within an abundant basophilic myxoid stroma.',
  'Poorly differentiated chordoma': 'Sheets of epithelioid to rhabdoid tumour cells with brisk mitotic activity and necrosis show characteristic loss of SMARCB1 (INI1).',
  'Giant cell tumour of bone': 'Numerous evenly distributed large osteoclast-like multinucleated giant cells lie in a background of uniform oval to plump spindle mononuclear stromal cells.',
  'Adamantinoma of long bones': 'Nests, cords and basaloid or tubular islands of epithelial cells are embedded in a bland osteofibrous stroma.',
  'Undifferentiated pleomorphic sarcoma': 'Sheets and fascicles of markedly pleomorphic spindle and epithelioid cells show brisk mitotic activity without specific osteoid, cartilaginous or other line of differentiation.'
};

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  const what = lc1(histTypeName(v));
  const site = lcw(stripDot(v.site));
  let s = `Sections of the ${site || 'bone'} show ${what}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

// ---------- margins ----------

export function parseMargins(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx < 0) return { name: line, raw: '', involved: /involved|positive/i.test(line), mm: null, blocks: '' };
      const name = line.slice(0, idx).trim();
      let rest = line.slice(idx + 1).trim();
      let blocks = '';
      const bm = rest.match(/\(([^)]+)\)\s*$/);
      if (bm) {
        blocks = bm[1].trim();
        rest = rest.slice(0, bm.index).trim();
      }
      const involved = /\b(?:involved|positive)\b/i.test(rest) && !/\buninvolved\b/i.test(rest);
      const exactNum = /^(\d+(?:\.\d+)?)\s*(?:mm)?$/i.exec(rest);
      const mm = exactNum ? parseFloat(exactNum[1]) : null;
      return { name, raw: rest, involved, mm, blocks };
    });
}

function marginItems(v) {
  if (v.marginsNotAssessable === true) return [{ label: 'Surgical margins', value: 'Cannot be assessed' }];
  const parsed = parseMargins(v.marginsText);
  if (!parsed.length) return [{ label: 'Surgical margins', value: 'Not specified' }];
  const involved = parsed.filter((m) => m.involved);
  const summary = involved.length
    ? `Involved by tumour (${listJoin(involved.map((m) => lc1(m.name)))})`
    : 'Uninvolved by tumour';
  const sub = parsed.map((m) => {
    let val = m.mm !== null ? `Uninvolved, ${fmt(m.mm)} mm` : (m.raw || 'Uninvolved');
    if (m.blocks) val += ` (${m.blocks})`;
    return { label: m.name, value: val };
  });
  return [{ label: 'Surgical margins', value: summary, sub }];
}

// ---------- site, size, mitotic, treatment, nodes, mets ----------

function siteValue(v) {
  const sg = v.siteGroup || '';
  const site = stripDot(v.site);
  if (sg && sg !== S.SITE.notSpecified && site) return `${sg} (${site})`;
  return site || sg || 'Not specified';
}

function locationExtentValue(v) {
  const xs = arr(v.locationExtent);
  if (!xs.length) return '';
  if (xs.includes('Cannot be determined')) return 'Cannot be determined';
  return xs.join('; ');
}

function sizeItem(v) {
  const n = num(v.tumourSizeMm);
  const dims = stripDot(v.tumourDims);
  const mm = (s) => `${s}${/mm$/.test(s) ? '' : ' mm'}`;
  if (n !== null) {
    return {
      label: 'Tumour size',
      value: `${v.sizeAtLeast === true ? 'At least ' : ''}${fmt(n)} mm (greatest dimension)`,
      sub: dims ? [{ label: 'All dimensions', value: mm(dims) }] : []
    };
  }
  if (stripDot(v.sizeReason)) return { label: 'Tumour size', value: `Cannot be determined (${lc1(stripDot(v.sizeReason))})` };
  if (dims) return { label: 'Tumour size', value: mm(dims) };
  return null;
}

function mitoticValue(v) {
  const raw = stripDot(v.mitoticCount);
  if (!raw) return '';
  const unit = v.mitoticUnit || 'per 10 HPF';
  return /hpf|mm/i.test(raw) ? raw : `${raw} ${unit}`;
}

function necrosisValue(v) {
  const n = v.necrosis || '';
  if (!n) return '';
  const p = num(v.necrosisPct);
  if (n === 'Present' && p !== null) return `Present (${fmt(p)}%)`;
  return n;
}

function treatmentEffectValue(v) {
  const te = v.treatmentEffect || '';
  if (!te) return '';
  if (te !== 'Present') return te;
  const vp = num(v.viablePct);
  const feats = arr(v.treatmentFeatures)
    .map((f) => (f === 'Other (specify)' ? stripDot(v.treatmentFeaturesOther) : lc1(f)))
    .filter(Boolean);
  const parts = [];
  if (vp !== null) parts.push(`${fmt(vp)}% viable tumour (${fmt(Math.max(0, 100 - vp))}% treatment-related necrosis)`);
  if (feats.length) parts.push(listJoin(feats));
  return parts.length ? `Present (${parts.join('; ')})` : 'Present';
}

function nodeItems(v) {
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex === null || ex <= 0) return [{ label: 'Regional lymph nodes', value: 'None submitted' }];
  const site = stripDot(v.nodeSites);
  const items = [
    { label: 'Regional lymph nodes', value: `${inv} of ${ex} involved${site ? ` (${site})` : ''}` }
  ];
  if (inv > 0) {
    if (v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
    const dep = num(v.largestDepositMm);
    if (dep !== null) items.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm` });
    const ln = num(v.largestNodeMm);
    if (ln !== null) items.push({ label: 'Size of largest involved lymph node', value: `${fmt(ln)} mm` });
  }
  return items;
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) {
    const detail = stripDot(v.distantMetsOther);
    const list = listJoin(sites.map((s) => (s === S.METS.other ? detail || 'other site' : s)).map((s, i) => (i ? lcw(s) : s)));
    return detail && !sites.includes(S.METS.other) ? `${list} (${detail})` : list;
  }
  const m = arr(v.distantMets);
  for (const x of [S.METS.na, S.METS.none, S.METS.cannot]) if (m.includes(x)) return x;
  return '';
}

function preresectionValue(v) {
  const xs = arr(v.preresection);
  if (!xs.length) return '';
  return xs.join('; ');
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);

  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureValue(v)),
      item('Tumour site', siteValue(v)),
      item('Tumour location and extent', locationExtentValue(v)),
      sizeItem(v),
      v.siteGroup === S.SITE.appendicular && v.discontinuous === true ? item('Discontinuous tumours (skip metastases)', 'Present in primary bone site') : null,
      v.siteGroup === S.SITE.spine && v.spineExtent ? item('Vertebral extent', v.spineExtent) : null,
      v.siteGroup === S.SITE.pelvis && v.pelvisExtent ? item('Pelvic extent', v.pelvisExtent) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Histologic grade', v.histGrade || ''),
      item('Mitotic rate', mitoticValue(v)),
      item('Necrosis (in absence of neoadjuvant therapy)', necrosisValue(v)),
      item('Treatment effect', treatmentEffectValue(v)),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM && !S.isNotStaged(v) ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    { heading: 'Additional findings', items: [
      item('Preresection treatment', preresectionValue(v)),
      item('Other pathologic findings', uc1(stripDot(v.otherFindings))),
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
  if (v.ewsr1 && v.ewsr1 !== 'Not performed') items.push({ label: 'EWSR1 rearrangement', value: v.ewsr1 });
  if (v.mdm2 && v.mdm2 !== 'Not performed') items.push({ label: 'MDM2 amplification (FISH)', value: v.mdm2 });
  if (v.idh && v.idh !== 'Not performed') items.push({ label: 'IDH1 / IDH2', value: v.idh });
  if (stripDot(v.molecularOther)) items.push({ label: 'Other molecular studies', value: uc1(stripDot(v.molecularOther)) });
  if (!items.length) return '';
  return renderSynoptic([{ heading: 'Molecular studies', items }], '');
}

// ---------- diagnosis ----------

function dxType(v) {
  const name = histTypeName(v) || 'BONE TUMOUR';
  const c = name.indexOf(' (');
  return c > 0 ? `${name.slice(0, c).toUpperCase()}${name.slice(c)}` : name.toUpperCase();
}

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const s = num(v.tumourSizeMm);
  const typeBits = [dxType(v)];
  const g = S.gradeCode(v);
  if (g && ['G1', 'G2', 'G3'].includes(g)) typeBits.push(`grade ${g.slice(1)}`);
  if (s !== null) typeBits.push(`${v.sizeAtLeast === true ? 'at least ' : ''}${fmt(s)} mm`);
  const clauses = [typeBits.join(', ')];

  if (v.treatmentEffect === 'Present') {
    const vp = num(v.viablePct);
    if (vp !== null) clauses.push(`treatment effect present (${fmt(Math.max(0, 100 - vp))}% necrosis / ${fmt(vp)}% viable tumour)`);
    else clauses.push('treatment effect present');
  }

  if (v.marginsNotAssessable === true) {
    clauses.push('Surgical margins cannot be assessed');
  } else {
    const parsed = parseMargins(v.marginsText);
    const involved = parsed.filter((m) => m.involved);
    if (involved.length) {
      clauses.push(`Surgical margin involved by tumour (${listJoin(involved.map((m) => lc1(m.name)))})`);
    } else if (parsed.length) {
      const nums = parsed.filter((m) => m.mm !== null).sort((a, b) => a.mm - b.mm);
      clauses.push(nums.length ? `Margins clear (closest ${fmt(nums[0].mm)} mm, ${lc1(nums[0].name)})` : 'Margins clear');
    }
  }

  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) {
    let np = `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
    if (inv > 0 && v.ene === 'Present') np += '; extranodal extension present';
    clauses.push(np);
  }

  const st = staging(part, ctx);
  if (ctx?.options?.printPTNM && !S.isNotStaged(v) && st.tnm) {
    clauses.push(`${st.tnm} (${st.edition})`);
  }

  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

// ---------- checks ----------

const HIGH_GRADE_BY_DEF = new Set([
  'Conventional osteosarcoma',
  'Telangiectatic osteosarcoma',
  'Small cell osteosarcoma',
  'High-grade surface osteosarcoma',
  'Low-grade central osteosarcoma with high-grade transformation',
  'Parosteal osteosarcoma with high-grade transformation',
  'Dedifferentiated chondrosarcoma',
  'Mesenchymal chondrosarcoma',
  'Ewing sarcoma',
  'CIC-rearranged sarcoma',
  'Sarcoma with BCOR genetic alterations',
  'Poorly differentiated chordoma',
  'Dedifferentiated chordoma',
  'Dedifferentiated adamantinoma',
  'Undifferentiated pleomorphic sarcoma'
]);

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);

  if (!v.procedure) err('Procedure not recorded.', 'procedure');
  if (!v.histType) err('Histologic type not recorded.', 'histType');

  const size = num(v.tumourSizeMm);
  if (size === null && !stripDot(v.sizeReason) && !v.noPrimary && !S.isNotStaged(v)) {
    warn('Tumour greatest dimension not recorded.', 'tumourSizeMm');
  }

  // Grade consistency checks:
  const g = S.gradeCode(v);
  if (!S.isNotStaged(v) && !v.histGrade) {
    warn('Histologic grade not recorded (required for AJCC 8th edition bone sarcoma stage grouping).', 'histGrade');
  }
  if (HIGH_GRADE_BY_DEF.has(v.histType || '') && g === 'G1') {
    warn(`${v.histType} is high grade by definition (typically G3), but G1 is selected.`, 'histGrade');
  }
  if (['Parosteal osteosarcoma', 'Low-grade central osteosarcoma'].includes(v.histType || '') && (g === 'G2' || g === 'G3')) {
    warn(`${v.histType} is low grade (G1); if high-grade dedifferentiation is present, select the high-grade transformation option.`, 'histType');
  }

  // Treatment effect vs preresection therapy:
  const pre = arr(v.preresection);
  const hadTherapy = pre.some((x) => ['Chemotherapy performed', 'Radiation therapy performed', 'Therapy performed, type not specified'].includes(x));
  if (hadTherapy && v.treatmentEffect === 'No known presurgical therapy') {
    warn('Preresection therapy is recorded, but Treatment effect is set to "No known presurgical therapy".', 'treatmentEffect');
  }
  if (v.treatmentEffect === 'Present') {
    const vp = num(v.viablePct);
    if (vp === null) {
      info('Treatment effect present: record percentage of viable tumour (or treatment-related necrosis).', 'viablePct');
    } else if (/osteosarcoma/i.test(v.histType || '')) {
      const nec = Math.max(0, 100 - vp);
      info(`Osteosarcoma histological response: ${fmt(nec)}% necrosis (${nec >= 90 ? 'good response, >= 90% necrosis' : 'poor response, < 90% necrosis'}).`, 'viablePct');
    }
  }

  // Nodes:
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved);
  if (ex !== null && inv !== null && inv > ex) {
    err(`Regional lymph nodes: ${inv} involved exceeds ${ex} examined.`, 'nodesInvolved');
  }
  if (inv !== null && inv > 0 && !v.ene) {
    info('Positive lymph nodes recorded: extranodal extension (ENE) not recorded.', 'ene');
  }

  // Staging notes & reference stage group (Checks only):
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');

  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, molecular, diagnosis, validate, staging };
