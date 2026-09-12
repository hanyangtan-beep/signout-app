// Appendiceal tumour resection generator (seventh synoptic template; the paired template of
// the benign appendicectomy - see generators/appendix.js and its "Upgrade this part"
// hand-off). Elements mirror the QMH Cancer Reporting Template GI-Appendix page (AJCC 8th
// edition) in the QMH order, with deliberate house departures recorded in
// docs/specs/appendix-carcinoma.md: the "- Tumour histology:" paragraph follows
// "- Histologic grade:" (all synoptic templates), the goblet-cell pick is rendered as WHO
// "goblet cell adenocarcinoma" (page: "goblet cell carcinoid"), the page's merged pN2 (4 or
// more) splits into N2a / N2b by the involved-node count, and the y descriptor is left to
// the override (the page has no treatment-effect field). pTNM is derived by
// src/staging/appendix.js and printed only with `options.printPTNM`, stamped (AJCC 8th
// edition); a typed override wins and is echoed with its reason.
// Pure functions: (part, ctx) -> string.
//
// Blocks produced:
//   specimenName / specimens  "(A) Appendix, distal half of appendix, appendectomy"
//   macro                     "The specimen consists of an appendectomy …"
//   blockKey                  the typed block key, one "(n) …" entry per line
//   synoptic                  sectioned "- Element: value" list in QMH order
//   diagnosis                 the specimen line + "- " clauses, lowest margin distance
// Wording is protected by tests/appendix.test.js — change it only deliberately.

import { typeMorphology } from './appendix_morphology.js?v=mtykl8g5';
import { deriveTNM, stageLine } from '../src/staging/index.js?v=mtykl8g5';
import * as S from '../src/staging/appendix.js?v=mtykl8g5';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js?v=mtykl8g5';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const stripDot = (s) => String(s || '').trim().replace(/[.;:\s]+$/, '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const listAnd = listJoin;
const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|specified)|^Cannot|^None |^Appendix, not otherwise specified/.test(s));
const specify = (s) => String(s || '').replace(/\s*\((specify)[^)]*\)\s*:?$/i, '').trim();

/** Appendix-site prose: "distal half of the appendix" reads better than the QMH " … of appendix". */
const appendiceal = (s) => s.replace(/(half of) appendix\b/, '$1 the appendix');

// The QMH tumour-extension boxes ticked on the page; the deepest governs the pT category
// (matches the ranks in src/staging/appendix.js). Keep these strings verbatim in the schema.
export const EXTENSION = {
  t0: 'No evidence of primary tumour',
  tis: 'Tumour invades lamina propria or muscularis mucosa',
  am1: 'Acellular mucin invades submucosa',
  t1: 'Tumour invades submucosa',
  am2: 'Acellular mucin invades muscularis propria',
  t2: 'Tumour invades muscularis propria',
  am3: 'Acellular mucin invades subserosa or mesoappendix but does not extend to the serosal surface',
  t3: 'Tumour invades through the muscularis propria into the subserosa or mesoappendix but does not extend to the serosal surface',
  am4: 'Acellular mucin invades the visceral peritoneum (serosa)',
  t4a: 'Tumour invades the visceral peritoneum (serosa)',
  t4b: 'Tumour directly invades adjacent organs or structures (specify)',
  tx: 'Cannot be determined'
};

/** Highest-ranked ticked extension row (mirrors the staging rank order), with its label. */
function deepestExtension(v) {
  const ticks = arr(v.tumourExtension);
  if (!ticks.length) return null;
  if (ticks.some((s) => /no evidence of primary/i.test(s))) return { cat: 'T0', label: EXTENSION.t0 };
  const map = new Map();
  for (const s of arr(ticks)) {
    for (const [re, rank, cat] of S.EXTENSION_T) {
      if (re.test(s)) { map.set(s, { rank, cat, label: s }); break; }
    }
  }
  const rows = ticks.map((s) => map.get(s)).filter((r) => r && r.rank > 0);
  if (!rows.length) return null;
  return rows.reduce((a, b) => (b.rank > a.rank ? b : a));
}

// ---------- specimen ----------

export function procedureText(v) {
  if (/^(Other|Not specified)$/.test(v.procedure || '')) return stripDot(v.procedureOther) || (v.procedure === 'Not specified' ? 'Not specified' : v.procedure);
  return v.procedure || 'Not specified';
}

/** Lower-case head phrase from one tumour-site option, keeping the " + base …" tail. */
export const sitePhrase = (s) => lc1(specify(s));

export function sitesText(v) {
  const sites = chosen(v.tumourSite).map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) : appendiceal(sitePhrase(s)))).filter(Boolean);
  if (!sites.length) return '';
  return listJoin(sites);
}

/** Adjective-first head phrase: "appendectomy", "appendectomy and right colectomy". */
export function procedurePhrase(v) {
  const p = specify(procedureText(v));
  return p === 'Not specified' ? '' : lc1(p);
}

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const sites = sitesText(v);
  const proc = procedurePhrase(v);
  return `Appendix${sites ? `, ${sites}` : ''}${proc ? `, ${proc}` : ''}`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

// ---------- staging ----------

export function staging(part, ctx) { return deriveTNM(part.values, 'appendix'); }

// ---------- macro ----------

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const proc = procedurePhrase(v) || 'appendiceal specimen';
  const article = /^[aeiou]/.test(proc) ? 'an' : 'a';
  let s = `(${part.label}) Received in formalin is ${article} ${proc} specimen`;
  const dims = stripDot(v.specimenDims);
  if (dims) s += ` measuring ${dims} mm`;
  s += '.';
  const det = [];
  if (num(v.appendixLen) !== null) det.push(`the appendix measures ${fmt(num(v.appendixLen))} mm in length`);
  if (stripDot(v.mesoappendixDims)) det.push(`the attached mesoappendix measures ${stripDot(v.mesoappendixDims)} mm`);
  if (det.length) s += ` ${uc1(listJoin(det))}.`;
  const size = num(v.tumourSizeMm);
  const gd = stripDot(v.grossDetails);
  s += ' There is a tumour';
  const sites = sitesText(v);
  if (sites) s += ` in the ${sites}`;
  if (size !== null) s += ` measuring ${stripDot(v.tumourDims) ? `${stripDot(v.tumourDims)} mm` : `${fmt(size)} mm in greatest dimension`}`;
  s += '.';
  if (size === null && stripDot(v.sizeCannot)) s = s.replace(/\.$/, ` (size cannot be determined: ${lc1(stripDot(v.sizeCannot))}.`);
  if (gd) s += ` ${uc1(gd)}.`;
  s += ' Representative sections are taken; see block key.';
  return s;
}

// ---------- block key ----------

const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export function blockKey(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const lines = String(part.values.blockKeyText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    const m = l.match(/^\(?([\dA-Za-z]+(?:\s*[-–,]\s*[\dA-Za-z]+)*)\)?[\s.:)-]+(.*)$/);
    return m ? `(${lettered(part, ctx) ? part.label : ''}${m[1].replace(/\s+/g, '')}) ${stripDot(m[2])}.` : `${stripDot(l)}.`;
  }).join('\n');
}

// ---------- values shared by synoptic and diagnosis ----------

export const histTypeName = (v) => (v.histType === 'Other histologic type not listed (specify)'
  ? (v.histTypeOther || '').trim() || 'Histologic type not specified'
  : v.histType || 'Histologic type not specified');
/** Short canonical name for the diagnosis line, without the WHO descriptor parentheses. */
export function shortTypeName(v) {
  const t = histTypeName(v);
  return lc1Only(t);
}
// Strip the WHO parenthetical descriptors for the diagnosis line; keep the head noun capitalised.
function lc1Only(t) {
  let s = specify(t).replace(/ \(poorly cohesive carcinoma\)$/, '').replace(/ \(poorly differentiated\)$/, '');
  s = s.replace(/ \(Mixed adenoneuroendocrine carcinoma\)$/, ' (MANEC)');
  return s;
}

const isLAMN = (v) => /^Low-grade appendiceal mucinous neoplasm/.test(String(v.histType || ''));
const isHAMN = (v) => /^High-grade appendiceal mucinous neoplasm/.test(String(v.histType || ''));
const isGoblet = (v) => v.histType === 'Goblet cell adenocarcinoma';

const gradeShort = (v) => (!v.grade || /^(GX|Not applicable|Other)$/.test(v.grade) ? (stripDot(v.gradeOther) || '') : v.grade.replace(/^G\d, /, ''));

/** Tang group clause for goblet cell adenocarcinoma: "Tang group B (WHO grade 2)". */
function gobletClause(v) {
  if (!isGoblet(v)) return '';
  const g = String(v.gobletGrade || '');
  if (/group 3/.test(g)) return 'Tang group C (WHO grade 3, high grade)';
  if (/group 2/.test(g)) return 'Tang group B (WHO grade 2, intermediate grade)';
  if (/group 1/.test(g)) return 'Tang group A (WHO grade 1, low grade)';
  return '';
}

/** An invasion clause for the derived histology sentence and the diagnosis. */
export function extensionPhrase(v) {
  const deep = deepestExtension(v);
  if (!deep) return '';
  const s = deep.label;
  if (s === EXTENSION.tis) return 'confined to the lamina propria or muscularis mucosa';
  if (s === EXTENSION.am1) return 'acellular mucin extending into the submucosa';
  if (s === EXTENSION.t1) return 'invading the submucosa';
  if (s === EXTENSION.am2) return 'acellular mucin extending into the muscularis propria';
  if (s === EXTENSION.t2) return 'invading the muscularis propria';
  if (s === EXTENSION.am3) return 'acellular mucin extending into the subserosa or mesoappendix but not reaching the serosal surface';
  if (s === EXTENSION.t3) return 'invading through the muscularis propria into the subserosa or mesoappendix but not reaching the serosal surface';
  if (s === EXTENSION.am4) return 'acellular mucin extending to the visceral peritoneum (serosa)';
  if (s === EXTENSION.t4a) return 'invading the visceral peritoneum (serosa)';
  if (s === EXTENSION.t4b) {
    const d = stripDot(v.extensionDetail);
    return `directly invading ${d ? `the ${lc1(d)}` : 'adjacent organs or structures'}`;
  }
  return '';
}

const isTisLike = (v) => {
  const deep = deepestExtension(v);
  return !!deep && deep.cat === 'Tis';
};
const isPT0 = (v) => arr(v.tumourExtension).some((s) => /no evidence of primary/i.test(s));

/** Derived "- Tumour histology:" paragraph; the typed notes win when entered. */
export function histologyPara(v) {
  if (stripDot(v.histologyNotes)) return stripDot(v.histologyNotes) + '.';
  const g = isGoblet(v) ? '' : gradeShort(v);
  const bits = [[g, lc1(histTypeName(v))].filter(Boolean).join(' '), gobletClause(v)].filter(Boolean);
  let s = `The tumour is a ${bits.join(', ')}`;
  const ext = extensionPhrase(v);
  if (ext) s += `, ${ext}`;
  s += '.';
  if (!isTisLike(v) && !isPT0(v)) {
    const typeName = v.histType === 'Other histologic type not listed (specify)' ? '' : v.histType || '';
    const morph = typeMorphology(typeName, v.grade || '', v.gobletGrade || '');
    if (morph) s += ` ${morph.replace(/\.$/, '')}.`;
  }
  return s;
}

/** Value minus the placeholder parentheses, with any typed distance appended: "Uninvolved by invasive carcinoma, 15 mm". */
export function resMarginText(vv, mmVal) {
  const s = (vv || '').trim();
  if (!s || /^Not applicable/.test(s)) return '';
  const mm = num(mmVal);
  if (/specify distance|specify location/.test(s)) {
    const base = s.replace(/\s*\((specify[^)]*)\)\s*/, '');
    return mm !== null ? `${base}, ${fmt(mm)} mm` : base;
  }
  return s;
}

// ---------- synoptic ----------

export function nodesItem(v) {
  const ex = int(v.nodesExamined);
  const depV = v.tumourDeposits;
  const depN = /^Present/.test(depV || '') ? int(v.tumourDepositsN) : null;
  const deposits = depN !== undefined && /^Present/.test(depV || '') ? { label: 'Tumour deposits', value: depN === null ? 'Present (number not recorded)' : `Present, n = ${depN}` } : null;
  if (ex === null || ex === 0) {
    const b = [{ label: 'Regional lymph nodes', value: ex === 0 ? 'None submitted (0 examined)' : 'Not recorded' }];
    if (deposits) b[0].sub = [deposits];
    return b[0];
  }
  const inv = int(v.nodesInvolved);
  const sub = [
    { label: 'Number examined', value: String(ex) },
    { label: 'Number involved', value: inv === null ? 'Not recorded' : String(inv) }
  ];
  const ene = v.ene;
  if (inv && inv > 0) sub.push({ label: 'Extranodal extension', value: !ene || /^Not applicable/.test(ene) ? 'Not identified' : ene });
  if (deposits) sub.push(deposits);
  const dep = num(v.largestDepositMm);
  if (inv && inv > 0 && dep !== null) sub.push({ label: 'Size of largest metastatic deposit', value: `${fmt(dep)} mm${stripDot(v.largestNodeSite) ? `, ${stripDot(v.largestNodeSite)}` : ''}` });
  const node = num(v.largestNodeMm);
  if (inv && inv > 0 && node !== null) sub.push({ label: 'Size of largest lymph node involved', value: `${fmt(node)} mm` });
  return { label: 'Regional lymph nodes', value: inv === null ? `${ex} examined; involved not recorded` : `${ex} examined; ${inv} involved`, sub };
}

export function metastasisValue(v) {
  const sites = chosen(v.distantMets).map((s) => specify(s.replace(/\s*\(specify\)\s*$/, '')));
  const kept = chosen(v.distantMets);
  const d = stripDot(v.distantDetail);
  const hasSpec = kept.some((s) => /\(specify\)/.test(s));
  if (!kept.length) {
    if (arr(v.distantMets).some((s) => /^Cannot/.test(s))) return `Cannot be determined${d ? ` (${d})` : ''}`;
    return arr(v.distantMets).includes('Not identified') ? 'Not identified' : 'Not applicable';
  }
  return `${listJoin(sites)}${d && hasSpec ? ` (${d})` : ''}`;
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const st = staging(part, ctx);
  const size = num(v.tumourSizeMm);
  const sites = arr(v.tumourSite);
  const isTis = isTisLike(v);
  const sizeText = isPT0(v)
    ? 'Not applicable (no residual tumour)'
    : size !== null
      ? `${stripDot(v.tumourDims) ? `${stripDot(v.tumourDims)} mm (greatest dimension ` : ''}${fmt(size)} mm${stripDot(v.tumourDims) ? ')' : ' in greatest dimension'}`
      : stripDot(v.sizeCannot) ? `Cannot be determined (${lc1(stripDot(v.sizeCannot))})` : 'Cannot be determined';
  const extTicks = arr(v.tumourExtension);
  const extVal = extTicks.length
    ? listJoin(extTicks.map((s) => (s === EXTENSION.t4b && stripDot(v.extensionDetail) ? `Tumour directly invades adjacent organs or structures (${stripDot(v.extensionDetail)})` : s)))
    : 'Not recorded';
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Tumour site', sites.length
        ? listJoin(sites.map((s) => (s === 'Other (specify)' ? stripDot(v.tumourSiteOther) || 'Other' : s)))
        : 'Not specified'),
      item('Tumour size', sizeText)
    ] },
    { heading: 'Microscopic findings', items: (() => {
      const out = [
        item('Histologic type', histTypeName(v)),
        isGoblet(v) ? item('Goblet cell adenocarcinoma group', stripDot(v.gobletGrade) || null) : null,
        v.grade && v.grade !== 'Not applicable' ? item('Histologic grade', stripDot(v.grade) || stripDot(v.gradeOther) || null) : null,
        { label: 'Tumour histology', para: histologyPara(v) }
      ];
      const depV = v.tumourDeposits;
      if (depV && depV !== 'Not identified' && !/^Cannot/.test(depV)) {
        const depN = int(v.tumourDepositsN);
        out.push(item('Tumour deposits', depN !== null ? `Present (${depN})` : 'Present (number not recorded)'));
      } else if (depV) out.push(item('Tumour deposits', depV));
      out.push(
        item('Tumour extension', extVal),
        item('Lymphovascular invasion', v.lvi || 'Not identified'),
        item('Perineural invasion', v.pni || 'Not identified')
      );
      return out;
    })() },
    { heading: 'Margins', items: [
      item('Proximal margin', resMarginText(v.proximalMargin, v.proximalMarginMm)),
      item('Mesenteric margin', resMarginText(v.mesentericMargin, v.mesentericMarginMm)),
      v.otherMargin && !/^Not applicable/.test(v.otherMargin) ? item('Other margin(s)', `${resMarginText(v.otherMargin, v.otherMarginMm)}${stripDot(v.otherMarginDetail) ? ` (${stripDot(v.otherMarginDetail)})` : ''}`) : null
    ] },
    { heading: 'Lymph nodes', items: [nodesItem(v)] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: st.overridden ? `${st.tnm} [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : st.tnm,
        sub: stageLine(st) ? [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] : [] }
    ] } : null,
    { heading: 'Additional findings', items: (() => {
      const f = chosen(v.additionalFindings)
        .map((s) => (s === 'Other (specify)' ? stripDot(v.additionalFindingsDetail) : s))
        .filter(Boolean);
      return [
        ...(f.length ? f.map((t) => ({ text: t })) : []),
        stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null,
        !f.length && !stripDot(v.additionalNotes) ? { text: 'None identified' } : null
      ];
    })() }
  ].filter(Boolean);
  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };

/** "2 of 12 regional lymph nodes involved"; '' when none submitted. */
export function nodesPhrase(v) {
  const ex = int(v.nodesExamined);
  if (ex === null || ex === 0) return '';
  const inv = int(v.nodesInvolved) ?? 0;
  return `${inv} of ${ex} regional lymph node${ex === 1 ? '' : 's'} involved`;
}

/** "Present, 3 tumour deposits"; feeds the N1c clause; '' when none recorded. */
export function depositsPhrase(v) {
  if (!/^Present/.test(v.tumourDeposits || '')) return '';
  const n = int(v.tumourDepositsN);
  return n === null ? 'tumour deposits present (number not recorded)' : `${n} tumour deposit${n === 1 ? '' : 's'}`;
}

const marginsPhrase = (v) => {
  const named = [
    { name: 'proximal margin', value: v.proximalMargin, mm: num(v.proximalMarginMm) },
    { name: 'mesenteric margin', value: v.mesentericMargin, mm: num(v.mesentericMarginMm) },
    { name: 'other margin', value: v.otherMargin && !/^Not applicable/.test(v.otherMargin) ? v.otherMargin : '', mm: num(v.otherMarginMm), detail: stripDot(v.otherMarginDetail) }
  ].filter((m) => m.value && !/^Cannot be assessed/.test(m.value));
  const involved = named.filter((m) => /^Involved/.test(m.value || ''))
    .map((m) => {
      const base = m.name.replace(/ margin$/, '');
      const tail = m.value === 'Involved by acellular mucin' ? ' (acellular mucin)' : /appendiceal mucinous neoplasm/.test(m.value) ? ` (${m.value.match(/(low|high)-grade/)[0].toUpperCase()})` : /high-grade dysplasia/.test(m.value) ? ' (high-grade dysplasia)' : '';
      return `${base}${m.detail ? ` (${m.detail})` : tail}`;
    });
  const clear = named.filter((m) => /^Uninvolved/.test(m.value || ''));
  const out = [];
  if (involved.length) out.push(`${listAnd(involved)} margin${involved.length > 1 ? 's' : ''} involved`);
  if (clear.length) {
    const mmVals = clear.map((m) => m.mm).filter((x) => Number.isFinite(x));
    out.push(`${clear.length > 1 ? 'other margins clear' : `${clear.map((m) => m.name).join(' and ')} clear`}${mmVals.length ? ` (closest ${fmt(Math.min(...mmVals))} mm)` : ''}`);
  }
  return out.join('; ');
};

export function diagnosis(part, ctx) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  const head = `(${part.label}) ${typed ? upperHead(typed) : upperHead(specimenName(part))}`;
  const first = [];
  if (isPT0(v)) {
    first.push('NO RESIDUAL CARCINOMA');
  } else if (isTisLike(v) && isLAMN(v)) {
    first.push(`${upperHead(shortTypeName(v))} (pTis(LAMN))`);
  } else if (isTisLike(v)) {
    first.push('CARCINOMA IN SITU');
  } else {
    const g = isGoblet(v) ? '' : gradeShort(v);
    const typeText = isGoblet(v)
      ? [upperHead(shortTypeName(v)), gobletClause(v)].filter(Boolean).join(', ')
      : [upperHead(shortTypeName(v)), isLAMN(v) || isHAMN(v) ? '' : g].filter(Boolean).join(', ');
    let clause = typeText;
    const size = num(v.tumourSizeMm);
    if (size !== null) clause += `, ${fmt(size)} mm`;
    const ext = extensionPhrase(v);
    if (ext) clause += `, ${ext}`;
    first.push(clause);
    const invasion = [];
    if (v.lvi === 'Present') invasion.push('lymphovascular invasion present');
    if (v.pni === 'Present') invasion.push('perineural invasion present');
    first.push(...invasion);
    const dp = depositsPhrase(v);
    if (dp) first.push(dp);
  }
  const mp = marginsPhrase(v);
  if (mp) first.push(mp);
  const clauses = [`${first.join('; ')}; see synoptic report`];
  const np = nodesPhrase(v);
  if (np) clauses.push(np + (v.ene === 'Present' ? '; extranodal extension present' : ''));
  const mets = chosen(v.distantMets).map((s) => lc1(specify(s.replace(/\s*\(specify\)\s*$/, ''))));
  if (mets.length) clauses.push(`distant metastasis: ${listJoin(mets)}`);
  if (ctx?.options?.printPTNM) {
    const st = staging(part, ctx);
    let s = `${st.tnm} (${st.edition})`;
    if (st.stage) s += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
    clauses.push(s);
  }
  return renderDiagnosis(head, clauses);
}

// ---------- validation ----------

export function validate(part, ctx) {
  const v = part.values;
  const out = [];
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  const cr = isPT0(v);
  if (!cr && num(v.tumourSizeMm) === null && !stripDot(v.sizeCannot) && !isTisLike(v)) warn('Tumour size is not recorded.');
  if (!v.histType) err('Histologic type is required.');
  if (!arr(v.tumourExtension).length && !cr) err('Tumour extension is required to assign pT.');
  const elongTicks = arr(v.tumourExtension);
  if (elongTicks.includes(EXTENSION.t4b) && !stripDot(v.extensionDetail)) warn('Tumour directly invades adjacent organs or structures: specify them.');
  // LAMN / HAMN push against the wall; true infiltrative growth upgrades the diagnosis.
  if ((isLAMN(v) || isHAMN(v)) && elongTicks.some((s) => /^Tumour invades (submucosa|muscularis propria)|^Tumour invades through|^Tumour invades the visceral|^Tumour directly/.test(s))) {
    warn(`An appendiceal mucinous neoplasm with infiltrative invasion is staged and graded as an invasive mucinous adenocarcinoma rather than a ${isLAMN(v) ? 'LAMN' : 'HAMN'}; review the histologic type.`);
  }
  // Acellular-mucin extension rows sit naturally with LAMN / HAMN or mucinous adenocarcinoma.
  if (elongTicks.some((s) => /^Acellular mucin/.test(s)) && !(isLAMN(v) || isHAMN(v) || v.histType === 'Mucinous adenocarcinoma')) {
    warn('An acellular-mucin extension row is ticked but the type is not a mucinous neoplasm or mucinous adenocarcinoma; review.' );
  }
  if (isGoblet(v) && !/group/.test(String(v.gobletGrade || ''))) warn('Goblet cell adenocarcinoma: record the Tang / WHO group; it governs the stage III / IV split.');
  const ex = int(v.nodesExamined); const pos = int(v.nodesInvolved);
  if (ex === null) err('Number of regional lymph nodes examined is required (enter 0 if none submitted).');
  else if (ex > 0 && pos === null) err('Number of involved lymph nodes is required (enter 0 if none).');
  if (ex !== null && pos !== null && pos > ex) err('Involved nodes exceed the number examined.');
  if (pos && pos > 0 && (!v.ene || /^Not applicable/.test(v.ene))) warn('Extranodal extension is not recorded for a node-positive case.');
  if (/^Present/.test(v.tumourDeposits || '') && int(v.tumourDepositsN) === null) warn('Tumour deposits present: record the number (nodal staging needs it for pN1c).');
  if (!cr) {
    if (!v.proximalMargin) err('Proximal margin status is required.');
    if (v.histType && !/^Carcinoma, type cannot/.test(v.histType)) {
      if (/^Uninvolved/.test(v.proximalMargin || '') && /distance/i.test(v.proximalMargin) && num(v.proximalMarginMm) === null) warn('Proximal margin uninvolved: record the distance.');
      if (/^Uninvolved/.test(v.mesentericMargin || '') && /distance/i.test(v.mesentericMargin) && num(v.mesentericMarginMm) === null) warn('Mesenteric margin uninvolved: record the distance.');
    }
    if (/^Involved by (low-grade|high-grade) appendiceal mucinous neoplasm/.test(v.proximalMargin || '')) warn('Proximal margin involved by a mucinous neoplasm: consider whether further surgery is needed to clear the base.');
  }
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, staging };
