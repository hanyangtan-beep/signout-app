// Uterine sarcoma resection — synoptic report
// (QMH GYN-Sarcoma, CAP Uterine Sarcoma 4.4.0.0, WHO 5th edition, AJCC 8th edition Ch. 54 / FIGO 2009).

import { deriveTNM, showNodes, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/uterine_sarcoma.js';
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
  return `Uterus, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'uterine_sarcoma'); }

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
  const bits = [`${tag}Received in formalin is an ${lc1(v.specimenIntegrity || 'intact')} ${proc} specimen${dims ? ` measuring ${dims}` : ''}.`];
  const sz = num(v.sizeMm);
  if (sz !== null) {
    bits.push(`Sectioning reveals a ${fmt(sz)} mm fleshy, tan-white intramural/endometrial mass with areas of haemorrhage and necrosis.`);
  }
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Leiomyosarcoma, NOS': 'Intersecting fascicles of pleomorphic spindle cells with abundant eosinophilic fibrillary cytoplasm, hyperchromatic cigar-shaped nuclei, coagulative tumour cell necrosis and brisk mitotic activity (>= 10 mitoses/10 HPF) infiltrate the myometrium.',
  'Leiomyosarcoma, epithelioid type': 'Sheets and nests of round to polygonal epithelioid cells with eosinophilic or clear cytoplasm, moderate-to-severe nuclear atypia, tumour cell necrosis and elevated mitotic activity infiltrate the myometrium.',
  'Leiomyosarcoma, myxoid type': 'Hypocellular to moderately cellular proliferations of spindle-to-stellate smooth muscle cells set in abundant alcian-blue-positive myxoid stroma infiltrate the myometrium with tongue-like borders, nuclear atypia and mitotic activity.',
  'Endometrial stromal sarcoma, low grade': 'Uniform small round-to-oval cells resembling proliferative-phase endometrial stroma surround prominent spiral arteriole-like vessels and infiltrate the myometrium and lymphovascular spaces in tongue-like projections.',
  'Endometrial stromal sarcoma, high grade': 'Sheets and nests of high-grade round or epithelioid cells with irregular vesicular nuclei, brisk mitotic activity and necrosis (often with a low-grade fibromyxoid spindle component) infiltrate the myometrium.',
  'Adenosarcoma, NOS': 'Benign-appearing endometrioid or Mullerian glands are surrounded by condensed periglandular cuffs of atypical endometrial-stroma-like spindle cells forming intraglandular polypoid projections and leaf-like clefts.',
  'Adenosarcoma with sarcomatous overgrowth': 'Mullerian adenosarcoma is accompanied by >= 25% pure high-grade sarcomatous overgrowth lacking an epithelial component.',
  'Rhabdomyosarcoma': 'Malignant mesenchymal proliferation demonstrates skeletal muscle differentiation (rhabdomyoblasts with cross-striations or pleomorphic/embryonal/alveolar patterns) positive for desmin, myogenin and MyoD1.',
  'Malignant perivascular epithelioid cell tumour (PEComa)': 'Sheets and nests of epithelioid and spindle cells with clear to granular eosinophilic cytoplasm around delicate capillary networks exhibit nuclear pleomorphism, necrosis and co-expression of melanocytic (HMB45/Melan-A) and smooth muscle markers.',
  'Undifferentiated uterine sarcoma': 'Diffuse sheets of markedly pleomorphic spindle, epithelioid and multinucleated giant cells with bizarre nuclei, atypical mitoses and extensive necrosis lack any specific line of differentiation.',
  'Other (specify)': 'Infiltrating malignant mesenchymal neoplasm of the uterus is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Leiomyosarcoma, NOS';
  if (t === 'Other (specify)') return uc1(stripDot(v.histTypeOther)) || 'Uterine sarcoma';
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  if (v.noPrimary === true) {
    return 'Extensive sampling shows fibrosis and scar tissue with no residual sarcoma identified.';
  }
  let s = `Sections of the uterus show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const mit = stripDot(v.mitoticRate) ? `Mitotic rate is ${stripDot(v.mitoticRate)}.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, mit, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by sarcoma';
  const items = [{ label: 'Surgical margins', value: st }];
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
  if (inv > 0 && v.ene) items.push({ label: 'Extranodal extension (ENE)', value: v.ene });
  return items;
}

function metastasisValue(v) {
  const sites = S.m1Sites(v);
  if (sites.length) {
    const detail = stripDot(v.distantMetsOther);
    return listJoin(sites.map((s) => (s === S.METS.other ? detail || 'other site' : s)).map((s, i) => (i ? lc1(s) : s)));
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
      item('Hysterectomy type', v.hysterectomyType || 'Abdominal'),
      item('Specimen integrity', v.specimenIntegrity || 'Intact'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', v.noPrimary === true ? 'No residual sarcoma identified (pT0)' : histTypeName(v)),
      S.isAdenosarcoma(v) ? item('Histologic grade (adenosarcoma)', v.adenosarcomaGrade || 'Low grade') : null,
      stripDot(v.mitoticRate) ? item('Mitotic rate', stripDot(v.mitoticRate)) : null,
      item('Coagulative tumour cell necrosis', v.necrosis || 'Not identified'),
      v.myometrialInvasion && v.myometrialInvasion !== 'Not applicable' ? item('Myometrial invasion', v.myometrialInvasion) : null,
      item('Extrauterine extension', arr(v.extension).length ? arr(v.extension).join('; ') : S.EXT.limited),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      v.peritonealFluid && v.peritonealFluid !== 'Not submitted / unknown' ? item('Peritoneal / ascitic fluid', v.peritonealFluid) : null,
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showNodes(st, ctx) ? { heading: 'Lymph nodes', items: nodeItems(v) } : null,
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v) || 'Not identified')] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
    ] } : null,
    stripDot(v.additionalNotes) ? { heading: 'Additional findings', items: [{ label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` }] } : null
  ].map((s) => (s ? { ...s, items: s.items.filter(Boolean) } : null)).filter((s) => s && s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

export function molecular(part) {
  const v = part.values;
  if (!stripDot(v.molecularNotes)) return '';
  return renderSynoptic([{ heading: 'Molecular studies', items: [{ label: 'Molecular / fusion studies', value: uc1(stripDot(v.molecularNotes)) }] }], '');
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
    clauses.push('NO RESIDUAL SARCOMA IDENTIFIED');
  } else {
    const sz = num(v.sizeMm);
    const first = [histTypeName(v).toUpperCase()];
    if (sz !== null) first.push(`${fmt(sz)} mm`);
    clauses.push(first.join(', '));
  }
  clauses.push(v.marginStatus || 'All margins uninvolved by sarcoma');
  const ex = int(v.nodesExamined);
  const inv = int(v.nodesInvolved) ?? 0;
  if (ex !== null && ex > 0) {
    clauses.push(`${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`);
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
