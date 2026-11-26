// Gestational trophoblastic disease — synoptic report
// (QMH GYN-Trophoblast, CAP Trophoblast 4.1.0.1, WHO 5th edition, AJCC 8th edition Ch. 56 / FIGO).

import { deriveTNM, showMets } from '../src/staging/index.js';
import * as S from '../src/staging/gtd.js';
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
  return `Uterus / trophoblast, ${lc1(procedureValue(v))}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function staging(part) { return deriveTNM(part.values, 'gtd'); }

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
    bits.push(`Sectioning reveals a ${fmt(sz)} mm dark red haemorrhagic and necrotic mass within the ${arr(v.site).map(lc1).join(', ') || 'uterine corpus'}.`);
  }
  const b = int(v.blocks);
  if (b) bits.push(`Sections are submitted in ${plural(b, 'block', 'blocks')}.`);
  return bits.join(' ');
}

export function blockKey(part, ctx) { return letteredBlockKey(part, ctx, { lettered }); }

const TYPE_MORPH = {
  'Hydatidiform mole, invasive': 'Enlarged, oedematous hydropic chorionic villi with central cistern formation and circumferential trophoblastic hyperplasia directly invade the myometrium and myometrial venous channels.',
  'Choriocarcinoma': 'Biphasic/trimorphic sheets of mononuclear cytotrophoblast and intermediate trophoblast intimately admixed with multinucleated syncytiotrophoblast infiltrate the myometrium amidst extensive haemorrhage and coagulative necrosis, without chorionic villi.',
  'Placental site trophoblastic tumour': 'Monomorphic polygonal to plump spindle implantation-site intermediate trophoblast cells with abundant eosinophilic cytoplasm and hyperchromatic irregular nuclei dissect between individual myometrial muscle fibres and replace spiral artery walls with fibrinoid material.',
  'Epithelioid trophoblastic tumour': 'Well-circumscribed nests, cords and sheets of uniform chorionic-type intermediate trophoblast cells with round nuclei, small nucleoli and eosinophilic-to-clear cytoplasm surround geographic zones of hyaline-like eosinophilic necrosis.',
  'Malignant trophoblastic tumour, type cannot be determined': 'Infiltrating malignant trophoblastic proliferation is present without definitive lineage subclassification.',
  'Other (specify)': 'Gestational trophoblastic lesion is present.'
};

export function histTypeName(v) {
  const t = v.histType || 'Choriocarcinoma';
  if (t === 'Other (specify)') return uc1(stripDot(v.histTypeOther)) || 'Gestational trophoblastic tumour';
  return t;
}

export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return `${stripDot(v.histologyNotes)}.`;
  if (v.noPrimary === true) {
    return 'Extensive sampling shows fibrosis and necrosis with no residual trophoblastic tumour identified.';
  }
  let s = `Sections show ${lc1(histTypeName(v))}.`;
  const morph = TYPE_MORPH[v.histType || ''] || '';
  const p57Text = v.p57 && !/^Not performed|Not applicable/.test(v.p57) ? `p57 immunohistochemistry is ${lc1(v.p57)}.` : '';
  const ihc = stripDot(v.ihcText);
  for (const x of [morph, p57Text, ihc ? `${uc1(ihc)}.` : '']) if (x) s += ` ${x}`;
  return s;
}

function marginItems(v) {
  const st = v.marginStatus || 'All margins uninvolved by tumour';
  const items = [{ label: 'Surgical margins', value: st }];
  const sub = [
    v.vaginalCuffMargin && v.vaginalCuffMargin !== 'Not applicable' ? { label: 'Ectocervical / vaginal cuff margin', value: v.vaginalCuffMargin } : null,
    v.parametrialMargin && v.parametrialMargin !== 'Not applicable' ? { label: 'Parametrial / paracervical margin', value: v.parametrialMargin } : null
  ].filter(Boolean);
  if (sub.length) items[0].sub = sub;
  const d = num(v.closestMarginMm);
  if (d !== null && /uninvolved/i.test(st)) {
    items.push({ label: 'Distance to closest margin', value: `${fmt(d)} mm${stripDot(v.closestMarginSite) ? ` (${lc1(stripDot(v.closestMarginSite))})` : ''}` });
  }
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
      item('Tumour site', arr(v.site).length ? arr(v.site).join('; ') : 'Uterine corpus'),
      sz !== null ? item('Tumour size (greatest dimension)', `${fmt(sz)} mm`) : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type (WHO 5th)', v.noPrimary === true ? 'No residual tumour identified (pT0)' : histTypeName(v)),
      item('Tumour extension', arr(v.extension).length ? arr(v.extension).join('; ') : S.EXT.uterus),
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      item('Perineural invasion', v.pni || 'Not identified'),
      { label: 'Tumour histology', para: histologyPara(v) }
    ] },
    { heading: 'Margins', items: marginItems(v) },
    showMets(st, ctx, metastasisValue(v)) ? { heading: 'Distant metastasis', items: [
      item('Distant metastasis', metastasisValue(v) || 'Not identified'),
      v.metastasisCount ? item('Number of metastases', v.metastasisCount) : null
    ] } : null,
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${stripDot(v.tnmOverrideReason) ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm }
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
    clauses.push('NO RESIDUAL TROPHOBLASTIC TUMOUR IDENTIFIED');
  } else {
    const sz = num(v.sizeMm);
    const first = [histTypeName(v).toUpperCase()];
    if (sz !== null) first.push(`${fmt(sz)} mm`);
    clauses.push(first.join(', '));
  }
  clauses.push(v.marginStatus || 'All margins uninvolved by tumour');
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
  const st = staging(part, ctx);
  for (const note of st.notes || []) info(note);
  for (const l of S.referenceLines(v, st)) info(l);
  if (st.overridden && !stripDot(v.tnmOverrideReason)) warn('pTNM override has no reason.', 'tnmOverrideReason');
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
