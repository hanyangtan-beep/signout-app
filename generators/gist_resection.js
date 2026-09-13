// Gastrointestinal stromal tumour resection generator (second synoptic template).
// Elements mirror the QMH Cancer Reporting Template GI-GIST page (CAP GIST Resection 4.3.0.0);
// pTNM, stage group and the Miettinen and Lasota risk category are derived by src/staging/gist.js.
// Pure functions: (part, ctx) -> string.
//
// Blocks produced (hybrid mode):
//   specimens  "Stomach, wedge resection"
//   macro      "(A) Received in formalin is a wedge resection specimen of stomach measuring 65 x 50 x 30 mm. …"
//   blockKey   the typed block key, one "(n) …" entry per line
//   microscopy narrative paragraph with IHC and molecular in the same paragraph (omitted when `synopticOnly`)
//   synoptic   CAP-style "- Element: value" list ending with the derived pTNM and stage group
//   diagnosis  "(A) STOMACH, wedge resection - GASTROINTESTINAL STROMAL TUMOUR, spindle cell type, 4.5 cm, …"
// Wording is protected by tests/gist_resection.test.js — change it only deliberately.

import { deriveTNM, stageLine } from '../src/staging/index.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { riskAssessment, gradeFromMitoses, mitoticClass, tFromSize, RISK_TABLE_SITES } from '../src/staging/gist.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

export function procedureName(v) {
  return v.procedure === 'Other' ? (v.procedureOther || '').trim() || 'resection' : v.procedure || 'resection';
}

const SITE_WORD = { 'Small intestine (not otherwise specified)': 'Small intestine', 'Peritoneum / retroperitoneum': 'Peritoneum', Other: 'Soft tissue' };
export function siteName(v) {
  return SITE_WORD[v.tumourSite] || v.tumourSite || 'Stomach';
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  return `${siteName(v)}, ${lc1(procedureName(v))}`;
}

// ---------- staging ----------

export function staging(part) {
  return deriveTNM(part.values, 'gist');
}

export const risk = (v) => riskAssessment(v);

const TYPE_SHORT = {
  'Gastrointestinal stromal tumour, spindle cell type': 'spindle cell type',
  'Gastrointestinal stromal tumour, epithelioid type': 'epithelioid type',
  'Gastrointestinal stromal tumour, mixed spindle and epithelioid type': 'mixed spindle and epithelioid type'
};
const TYPE_MICRO = {
  'Gastrointestinal stromal tumour, spindle cell type': 'composed of spindle cells arranged in fascicles, with pale eosinophilic cytoplasm and uniform ovoid nuclei',
  'Gastrointestinal stromal tumour, epithelioid type': 'composed of epithelioid cells with rounded nuclei and eosinophilic to clear cytoplasm, arranged in nests and sheets',
  'Gastrointestinal stromal tumour, mixed spindle and epithelioid type': 'showing both spindle cell fascicles and epithelioid areas'
};
export const histTypeName = (v) => (v.histType === 'Other' ? (v.histTypeOther || '').trim() || 'Gastrointestinal stromal tumour' : v.histType || 'Gastrointestinal stromal tumour');
const typeShort = (v) => TYPE_SHORT[v.histType] || (v.histType === 'Other' ? lc1((v.histTypeOther || '').trim()) : '');

const RISK_LOWER = { None: 'no', 'Very low risk': 'very low', 'Low risk': 'low', 'Moderate risk': 'moderate', 'High risk': 'high' };

export function mitoticText(v) {
  if (v.mitoticStatus === 'Not applicable') return 'Not applicable';
  if (v.mitoticStatus === 'Cannot be determined') return `Cannot be determined${(v.mitoticDetail || '').trim() ? ` (${stripDot(v.mitoticDetail)})` : ''}`;
  const n = num(v.mitoticCount);
  if (n === null) return 'Not recorded';
  return `${fmt(n)} per 5 mm2 (${n > 5 ? 'more than 5' : '5 or fewer'} per 5 mm2)`;
}

export function riskText(v) {
  if (v.residualTumour === 'No residual tumour (complete response)') return 'Not applicable (complete response to treatment)';
  const r = risk(v);
  if (r.category === 'Cannot be determined' || r.category === 'Not applicable') return `${r.category}${r.note ? ` (${stripDot(r.note)})` : ''}`;
  const basis = r.derived && r.category !== 'Overtly malignant/metastatic' ? ` (${lc1(siteName(v))}, ${fmt(num(v.tumourSize))} cm, ${fmt(num(v.mitoticCount))} mitoses per 5 mm2)` : '';
  return `${r.category}${basis}${r.note ? ` - ${stripDot(r.note)}` : ''}`;
}

// ---------- IHC and molecular ----------

const MOLECULAR_PHRASE = {
  'Requested; result to follow': 'Mutation analysis for KIT and PDGFRA hot spots has been requested{detail}; the result will follow as a supplementary report.',
  'KIT exon 11 mutation': 'Molecular analysis shows a KIT exon 11 mutation{detail}.',
  'KIT exon 9 mutation': 'Molecular analysis shows a KIT exon 9 mutation{detail}.',
  'KIT exon 13 mutation': 'Molecular analysis shows a KIT exon 13 mutation{detail}.',
  'KIT exon 17 mutation': 'Molecular analysis shows a KIT exon 17 mutation{detail}.',
  'PDGFRA exon 18 D842V mutation': 'Molecular analysis shows a PDGFRA exon 18 D842V mutation{detail}.',
  'PDGFRA mutation (other)': 'Molecular analysis shows a PDGFRA mutation{detail}.',
  'KIT and PDGFRA wild type': 'Molecular analysis shows no mutation in the KIT and PDGFRA hot spots (wild type){detail}.',
  'Other (specify)': 'Molecular analysis{detail}.'
};
export function molecularValue(v) {
  if (!v.molecular || v.molecular === 'Not performed') return 'Not performed';
  const d = stripDot(v.molecularDetail);
  const base = v.molecular === 'Other (specify)' ? d || 'Other' : v.molecular;
  return v.molecular === 'Other (specify)' ? base : `${base}${d ? ` (${d})` : ''}`;
}

// ---------- margins, nodes, metastasis ----------

export function marginValue(v) {
  const name = stripDot(v.marginName);
  if (v.marginStatus === 'Uninvolved by GIST') { const mm = num(v.marginMm); return `Uninvolved by GIST${mm !== null ? ` (${fmt(mm)} mm${name ? ` from the ${name} margin` : ''})` : name ? ` (closest: ${name} margin)` : ''}`; }
  if (v.marginStatus === 'Involved by GIST') return `Involved by GIST${name ? ` (${name} margin)` : ''}`;
  return v.marginStatus || 'Cannot be assessed';
}
export const metastasisSites = (v) => (Array.isArray(v.distantMetastasis) ? v.distantMetastasis.filter((s) => s !== 'Not applicable') : []);
// ---------- macro ----------

const GROWTH_PHRASE = {
  Intramural: 'a well-circumscribed intramural tumour',
  'Exophytic (serosal)': 'an exophytic tumour arising from the serosal aspect',
  'Endophytic (luminal)': 'a polypoid tumour projecting into the lumen',
  'Transmural (dumb-bell)': 'a transmural, dumb-bell shaped tumour',
  'Cannot be determined': 'a tumour'
};

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const proc = lc1(procedureName(v));
  const site = lc1(siteName(v));
  const article = /^[aeiou]/.test(proc) ? 'an' : 'a';
  let s = /^excision of/.test(proc) ? `(${part.label}) Received in formalin is ${article} ${proc} (${site})` : `(${part.label}) Received in formalin is ${article} ${proc} specimen of ${site}`;
  const dims = stripDot(v.specimenDimensions);
  if (dims) s += ` measuring ${dims}`;
  s += '.';
  const size = num(v.tumourSize);
  const where = stripDot(v.tumourSiteDetail);
  s += ` There is ${GROWTH_PHRASE[v.tumourGrowth] || 'a tumour'}${where ? ` in the ${where}` : ''}`;
  if (size !== null) s += ` measuring ${fmt(size)} cm in greatest dimension`;
  const other = stripDot(v.tumourSizeOther);
  if (other) s += ` (${other})`;
  s += '.';
  if (v.cutSurface && !/^Other/.test(v.cutSurface)) s += ` The cut surface is ${lc1(v.cutSurface)}.`;
  if (v.focality === 'Multifocal') s += ` The tumour is multifocal${stripDot(v.focalityDetail) ? ` (${stripDot(v.focalityDetail)})` : ''}.`;
  if (v.mucosalUlceration === 'Present') s += ' The overlying mucosa is ulcerated.';
  else if (v.mucosalUlceration === 'Absent') s += ' The overlying mucosa is intact.';
  if (/^Present/.test(v.tumourRupture || '')) s += ` There is tumour rupture${/spontaneous/.test(v.tumourRupture) ? ' (spontaneous / preoperative)' : ' (intraoperative)'}.`;
  else if (v.tumourRupture === 'Not identified') s += ' Tumour rupture is not identified.';
  const om = stripDot(v.otherMacro);
  if (om) s += ` ${uc1(om)}.`;
  s += ' Representative sections are taken; see block key.';
  return s;
}

export function blockKey(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const lines = String(part.values.blockKeyText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return '';
  const entries = lines.map((l) => {
    const m = /^\(?([0-9]+(?:\s*[-–]\s*[0-9]+)?[a-z]?)\)?[.:)\s-]+(.*)$/i.exec(l);
    return m ? `(${m[1].replace(/\s+/g, '')}) ${stripDot(m[2])}.` : `${stripDot(l)}.`;
  });
  return `(${part.label}) ${entries.join(' ')}`;
}

// ---------- microscopy ----------

/**
 * The "- Tumour histology:" paragraph: architecture, cytology and necrosis only (plus the
 * treated tumour bed for a complete response). Counts, IHC, margins, nodes and risk are
 * elements of their own and are not repeated here.
 */
export function histologyPara(v) {
  const cr = v.residualTumour === 'No residual tumour (complete response)';
  if (cr) return `Sections of the ${lc1(siteName(v))} show hyalinised fibrous tissue with scattered haemosiderin-laden macrophages consistent with treated tumour bed; no residual viable gastrointestinal stromal tumour is identified.`;
  const p = [];
  const desc = TYPE_MICRO[v.histType] || (v.histType === 'Other' && (v.histTypeOther || '').trim() ? `of ${lc1(stripDot(v.histTypeOther))}` : '');
  p.push(`Sections show a ${v.tumourGrowth === 'Intramural' ? 'well-circumscribed ' : ''}gastrointestinal stromal tumour${desc ? ` ${desc}` : ''}.`);
  if (v.necrosis === 'Present') p.push(`Necrosis is present${num(v.necrosisPercent) !== null ? ` (approximately ${fmt(num(v.necrosisPercent))}% of the tumour)` : ''}.`);
  else if (v.necrosis === 'Not identified') p.push('Necrosis is not identified.');
  if (v.mucosalUlceration === 'Present') p.push('The overlying mucosa is ulcerated.');
  const treated = v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy';
  if (treated) {
    if (v.treatmentEffect === 'Present') p.push(`Treatment effect is present${num(v.viableTumourPercent) !== null ? `, with approximately ${fmt(num(v.viableTumourPercent))}% viable tumour` : ''}.`);
    else if (v.treatmentEffect === 'Not identified') p.push('No treatment effect is identified.');
    else if (v.treatmentEffect === 'Cannot be determined') p.push('Treatment effect cannot be determined.');
  }
  return p.join(' ');
}

// ---------- synoptic ----------

export function synoptic(part, ctx) {
  const v = part.values;
  const st = staging(part);
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const size = num(v.tumourSize);
  const other = stripDot(v.tumourSizeOther);
  const sizeText = size !== null ? `${fmt(size)} cm in greatest dimension${other ? ` (${other})` : ''}` : other || 'Cannot be determined';
  const ex = int(v.nodesExamined); const pos = int(v.nodesPositive);
  let nodes;
  if (ex === null) nodes = { label: 'Regional lymph nodes', value: 'Not recorded' };
  else if (ex === 0) nodes = { label: 'Regional lymph nodes', value: 'No regional lymph nodes submitted or found' };
  else nodes = { label: 'Regional lymph nodes', value: pos !== null ? `${ex} examined; ${pos} involved` : `${ex} examined`, sub: [
    pos && v.ene && v.ene !== 'Not applicable' ? item('Extranodal extension', v.ene) : null,
    pos && num(v.largestDepositMm) !== null ? item('Largest metastatic deposit', `${fmt(num(v.largestDepositMm))} mm`) : null
  ] };
  const sites = metastasisSites(v);
  const where = stripDot(v.tumourSiteDetail);
  const presurg = v.presurgicalTreatment || 'No known presurgical therapy';
  const presurgDetail = stripDot(v.presurgicalDetail);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureName(v)),
      item('Tumour site', `${v.tumourSite || 'Not specified'}${where ? ` (${where})` : ''}`),
      item('Tumour size', sizeText),
      item('Tumour focality', v.focality === 'Multifocal' ? `Multifocal${stripDot(v.focalityDetail) ? ` (${stripDot(v.focalityDetail)})` : ''}` : v.focality || 'Unifocal'),
      item('Tumour rupture', v.tumourRupture || 'Not identified')
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Histologic grade', gradeFromMitoses(v)),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Mitotic count', mitoticText(v)),
      item('Necrosis', v.necrosis === 'Present' ? `Present${num(v.necrosisPercent) !== null ? ` (${fmt(num(v.necrosisPercent))}%)` : ''}` : v.necrosis || 'Not identified'),
      item('KIT (CD117) IHC', v.kitIhc || 'Not performed'),
      item('DOG1 IHC', v.dog1Ihc || 'Not performed'),
      v.cd34Ihc && v.cd34Ihc !== 'Not performed' ? item('CD34 IHC', v.cd34Ihc) : null,
      item('SDHB IHC', v.sdhbIhc || 'Not performed'),
      stripDot(v.otherIhc) ? item('Other immunohistochemistry', stripDot(v.otherIhc)) : null,
      item('Lymphovascular invasion', v.lvi || 'Cannot be determined'),
      item('Perineural invasion', v.pni || 'Cannot be determined'),
      item('Risk assessment (Miettinen and Lasota 2006)', riskText(v)),
      item('Presurgical treatment', `${presurg}${presurgDetail ? ` (${presurgDetail})` : ''}`),
      item('Treatment effect', v.treatmentEffect === 'Present' ? `Present${num(v.viableTumourPercent) !== null ? ` (${fmt(num(v.viableTumourPercent))}% viable tumour)` : ''}` : v.treatmentEffect || 'No known presurgical therapy'),
      item('Molecular studies', molecularValue(v))
    ] },
    { heading: 'Margins', items: [item('Surgical margins', marginValue(v))] },
    { heading: 'Regional lymph nodes', items: [nodes] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', sites.length ? `${listJoin(sites)}${stripDot(v.metastasisDetail) ? ` (${stripDot(v.metastasisDetail)})` : ''}` : 'Not applicable')] },
    { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: `${st.tnm}${st.overridden ? ` [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : ''}`,
        sub: ctx?.options?.stageGroup === false || !stageLine(st) ? [] : [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] }
    ] },
    { heading: 'Additional findings', items: [
      stripDot(v.additionalFindings) ? { text: uc1(stripDot(v.additionalFindings)) } : null,
      stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null
    ] }
  ];
  const heading = ctx?.case?.parts && ctx.case.parts.length > 1 ? `(${part.label}) ${specimenName(part)}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

export function diagnosis(part, ctx) {
  const v = part.values;
  const st = staging(part);
  const head = `(${part.label}) ${siteName(v).toUpperCase()}, ${lc1(procedureName(v))}`;
  const cr = v.residualTumour === 'No residual tumour (complete response)';
  const tumour = [];
  const behaviour = [];
  if (cr) {
    tumour.push('NO RESIDUAL GASTROINTESTINAL STROMAL TUMOUR (complete response to treatment)');
  } else {
    const size = num(v.tumourSize);
    const ts = typeShort(v);
    let first = `GASTROINTESTINAL STROMAL TUMOUR${ts ? `, ${ts}` : ''}`;
    if (size !== null) first += `, ${fmt(size)} cm`;
    if (v.mitoticStatus === 'Counted' && num(v.mitoticCount) !== null) first += `, mitotic count ${fmt(num(v.mitoticCount))} per 5 mm2`;
    tumour.push(first);
    const r = risk(v);
    if (RISK_LOWER[r.category]) behaviour.push(`${r.category === 'None' ? 'no appreciable risk' : lc1(r.category)} (Miettinen and Lasota 2006)`);
    else if (r.category === 'Overtly malignant/metastatic') behaviour.push('overtly malignant / metastatic');
    if (/^Present/.test(v.tumourRupture || '')) behaviour.push('tumour rupture present');
    if (v.treatmentEffect === 'Present') behaviour.push(`treatment effect present${num(v.viableTumourPercent) !== null ? ` (${fmt(num(v.viableTumourPercent))}% viable)` : ''}`);
  }
  if (v.marginStatus === 'Involved by GIST') behaviour.push(`${stripDot(v.marginName) ? `${stripDot(v.marginName)} ` : ''}margin involved`);
  else if (v.marginStatus === 'Uninvolved by GIST') behaviour.push('margins clear');
  const spread = [];
  const ex = int(v.nodesExamined); const pos = int(v.nodesPositive);
  if (ex && pos !== null) spread.push(pos === 0 ? `no lymph node metastasis (0/${ex})` : `${pos} of ${ex} lymph nodes involved`);
  const sites = metastasisSites(v);
  if (sites.length) spread.push(`metastatic GIST in ${listJoin(sites.map(lc1))}`);
  let stage = `${st.tnm} (${st.edition})`;
  if (ctx?.options?.stageGroup !== false && st.stage) stage += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
  const ancillary = [];
  const ihc = [];
  if (!cr && v.kitIhc === 'Positive') ihc.push('KIT');
  if (!cr && v.dog1Ihc === 'Positive') ihc.push('DOG1');
  if (ihc.length) ancillary.push(`${listJoin(ihc)} positive`);
  if (!cr && v.kitIhc === 'Negative') ancillary.push('KIT negative');
  if (!cr && v.sdhbIhc === 'Deficient') ancillary.push('SDHB-deficient');
  if (v.molecular === 'Requested; result to follow') ancillary.push('molecular studies to follow');
  else if (v.molecular && v.molecular !== 'Not performed') ancillary.push(v.molecular === 'Other (specify)' ? stripDot(v.molecularDetail) || 'molecular studies performed' : v.molecular);
  return renderDiagnosis(head, [tumour, behaviour, spread, [stage], ancillary].map((g) => g.filter(Boolean).join('; ')));
}

// ---------- validation + flags ----------

export function validate(part) {
  const v = part.values;
  const out = [];
  // The optional second argument is the id of the field the check is about; the Checks panel
  // uses it to jump to that field. Omit it when a check does not point at one field.
  const at = (level, m, field) => out.push(field ? { level, message: m, field } : { level, message: m });
  const err = (m, field) => at('error', m, field);
  const warn = (m, field) => at('warn', m, field);
  const cr = v.residualTumour === 'No residual tumour (complete response)';
  const size = num(v.tumourSize);
  if (size === null && !cr) err('Tumour size (cm) is required to assign pT and the risk category.', 'tumourSize');
  if (!cr && v.mitoticStatus === 'Counted' && num(v.mitoticCount) === null) err('Mitotic count per 5 mm2 is required (enter 0 if none seen).', 'mitoticCount');
  if (!cr && v.mitoticStatus === 'Cannot be determined' && !(v.mitoticDetail || '').trim()) warn('Mitotic count cannot be determined: give the reason.', 'mitoticDetail');
  const ex = int(v.nodesExamined); const pos = int(v.nodesPositive);
  if (ex === null) err('Number of regional lymph nodes examined is required (enter 0 if none submitted).', 'nodesExamined');
  else if (ex > 0 && pos === null) err('Number of involved lymph nodes is required (enter 0 if none).', 'nodesPositive');
  if (ex !== null && pos !== null && pos > ex) err('Involved lymph nodes exceed the number examined.', 'nodesPositive');
  if (pos && (!v.ene || v.ene === 'Not applicable')) warn('Extranodal extension is not recorded for a node-positive case.', 'ene');
  if (!v.marginStatus) err('Surgical margin status is required.', 'marginStatus');
  else if (v.marginStatus === 'Uninvolved by GIST' && num(v.marginMm) === null) warn('Margins uninvolved: record the distance to the closest margin in mm.', 'marginMm');
  if (v.kitIhc === 'Negative' && v.dog1Ihc === 'Negative') warn('Both KIT and DOG1 are negative - reconsider the diagnosis of GIST or confirm with molecular testing.', 'kitIhc');
  if (v.sdhbIhc === 'Deficient' && (!v.molecular || v.molecular === 'Not performed')) warn('SDHB-deficient GIST: germline SDHx testing and genetic counselling are advised; record the referral in the comment.', 'molecular');
  if (v.kitIhc === 'Negative' && (!v.molecular || v.molecular === 'Not performed')) warn('KIT-negative GIST: molecular testing for PDGFRA is recommended.', 'molecular');
  if (v.treatmentEffect && v.treatmentEffect !== 'No known presurgical therapy' && (!v.presurgicalTreatment || v.presurgicalTreatment === 'No known presurgical therapy')) warn('Treatment effect recorded but presurgical treatment is "No known presurgical therapy".', 'presurgicalTreatment');
  if (v.presurgicalTreatment && /Systemic therapy|type not specified/.test(v.presurgicalTreatment) && (!v.treatmentEffect || v.treatmentEffect === 'No known presurgical therapy')) warn('Presurgical systemic therapy given: record the treatment effect.', 'treatmentEffect');
  if (cr && v.treatmentEffect !== 'Present') warn('Complete response recorded: treatment effect should be "Present".', 'treatmentEffect');
  if (v.riskAssessment && v.riskAssessment !== 'Derive from site, size and mitotic count') {
    const derived = riskAssessment({ ...v, riskAssessment: '' });
    if (derived.category !== v.riskAssessment && derived.category !== 'Cannot be determined') warn(`Risk category picked (${v.riskAssessment}) differs from the derived category (${derived.category}); the picked value is used.`, 'riskAssessment');
  }
  if ((v.tnmOverride || '').trim()) {
    const st = staging(part);
    if (!st.overridden) err(`Override "${v.tnmOverride.trim()}" could not be parsed (use e.g. "pT3 pN0" or "ypT2 pN0 pM1").`, 'tnmOverride');
    else {
      if (!(v.tnmOverrideReason || '').trim()) err('Give a reason for overriding the derived pTNM.', 'tnmOverrideReason');
      if (size !== null && st.T !== tFromSize(size) && st.T !== 'T0') warn(`Override ${st.T} does not match the size-derived category (${tFromSize(size)} for ${fmt(size)} cm).`, 'tnmOverride');
    }
  }
  if (!cr && size !== null && mitoticClass(v) && !RISK_TABLE_SITES.includes(v.tumourSite || '')) warn(`Risk category for a ${lc1(siteName(v))} GIST uses the small-intestinal criteria (limited site-specific data).`);
  return out;
}

export function flags(parts) {
  const f = new Set();
  for (const p of parts) {
    const v = p.values;
    if (v.sdhbIhc === 'Deficient') f.add('sdhDeficient');
    if (/^Present/.test(v.tumourRupture || '')) f.add('rupture');
    if (v.kitIhc === 'Negative') f.add('kitNegative');
  }
  return [...f];
}

export default { specimenName, macro, blockKey, synoptic, diagnosis, validate, flags, staging };
