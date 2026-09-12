// Lung carcinoma resection generator (fifth synoptic template; the paired template of the frozen
// "Lung wedge / nodule" scenario). Elements mirror the QMH Cancer Reporting Template Thorax-Lung page
// (CAP Lung, Resection 5.1.0.0) in the QMH order (docs/specs/lung-pair.md). AJCC 9th edition pTNM is
// derived by src/staging/lung.js and printed only with `options.printPTNM`; a related prior specimen
// (case fields priorPT / priorPN, type-only) feeds the combined stage line through `deriveTNM`'s
// `prior` option. Pure functions: (part, ctx) -> string.
//
// Blocks produced:
//   specimens  "(A) Lung, right upper lobe, lobectomy" plus one line per entry in `otherParts`
//   macro      "The specimen consists of a right upper lobectomy specimen (180 g, 150 x 110 x 45 mm) …";
//              for a part linked to a frozen part (same letter) only the typed additions print
//   blockKey   the typed block key, one "(n) …" entry per line
//   synoptic   sectioned "- Element: value" list in QMH order with the house "Specimen and tumour"
//              section first and the "- Tumour histology:" paragraph after the grade
//   diagnosis  the specimen line + "- " clauses, then one diagnosis line per other letter
//   comment    the completion-resection staging sentence when a prior accession is typed
// Wording is protected by tests/lung_carcinoma.test.js and tests/fixtures/lung - change it only deliberately.

import { deriveTNM, stageLine } from '../src/staging/index.js?v=mtyi0pii';
import * as S from '../src/staging/lung.js?v=mtyi0pii';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js?v=mtyi0pii';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|submitted)|^Cannot|^Adjacent structures present but not involved/.test(s));
const specify = (s) => String(s || '').replace(/\s*\((specify|explain)[^)]*\)\s*:?$/i, '').trim();
const na = (s) => !s || /^Not applicable/.test(s);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- specimen ----------

export const PROCEDURES = ['Wedge resection', 'Segmentectomy', 'Lobectomy', 'Bilobectomy', 'Pneumonectomy', 'Completion lobectomy', 'Sleeve lobectomy', 'Other (specify)'];
const isCompletion = (v) => /^Completion/.test(v.procedure || '');
/** Completion resection with no residual tumour at the previous resection site. */
export const noResidual = (v) => isCompletion(v) && (v.residualTumour || 'Not identified') !== 'Present';
const isSublobar = (v) => /^(Wedge|Segmentectomy)/.test(v.procedure || '') || /wedge|nodule/i.test(v.procedureOther || '');
const isPneumonectomy = (v) => /^Pneumonectomy/.test(v.procedure || '');

export function procedureText(v) {
  const p = v.procedure || 'Lobectomy';
  return p === 'Other (specify)' ? uc1(stripDot(v.procedureOther)) || 'Other' : p;
}

/** "right upper lobe" / "right upper and middle lobes" / "right lung" / "left" (side only). */
export function lobeText(v) {
  const side = lc1(v.laterality && v.laterality !== 'Not specified' ? v.laterality : '');
  const lobes = arr(v.lobes).map(lc1);
  if (isPneumonectomy(v) || lobes.includes('whole lung')) return side ? `${side} lung` : 'lung';
  if (!lobes.length) return side;
  const names = lobes.map((l) => l.replace(/ lobe$/, ''));
  if (lobes.length === 1) return `${side ? `${side} ` : ''}${lobes[0]}`;
  return `${side ? `${side} ` : ''}${listJoin(names)} lobes`;
}

/** {organ, site, proc} for the diagnosis head and the derived specimen name. */
export function headParts(v) {
  const site = lobeText(v);
  const proc = lc1(procedureText(v));
  return { organ: 'Lung', site: isPneumonectomy(v) ? lc1(v.laterality && v.laterality !== 'Not specified' ? v.laterality : '') : site, proc };
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  const h = headParts(v);
  return `${h.organ}${h.site ? `, ${h.site}` : ''}, ${h.proc}`;
}

// ---------- other parts ----------

/**
 * Parse `otherParts` lines: "C) Lymph node, station 7, excision - metastatic, 1/1".
 * Returns [{label, specimen, finding}]; `findingText()` turns the finding into the diagnosis text.
 */
export function otherParts(v) {
  const out = [];
  for (const raw of String(v.otherParts || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^\(?([A-Z])\)?[\s.:)-]+(.+?)(?:\s+-\s+|\s*:\s+)(.+)$/);
    if (m) out.push({ label: m[1], specimen: stripDot(m[2]), finding: stripDot(m[3]) });
    else { const m2 = line.match(/^\(?([A-Z])\)?[\s.:)-]+(.+)$/); if (m2) out.push({ label: m2[1], specimen: stripDot(m2[2]), finding: '' }); }
  }
  return out;
}
export const hasExtraParts = (part) => otherParts(part.values).length > 0;

/** Specimen lines for the typed other parts only (used by the engine for a linked part). */
export function otherSpecimenLines(part) {
  return otherParts(part.values).map((o) => `(${o.label}) ${o.specimen}`);
}

/** SPECIMEN block: the synoptic part(s) and one line per typed other part, in letter order. */
export function specimens(parts) {
  const lines = parts.map((p) => ({ label: p.label, text: `(${p.label}) ${specimenName(p)}` }));
  for (const p of parts) for (const o of otherParts(p.values)) lines.push({ label: o.label, text: `(${o.label}) ${o.specimen}` });
  return lines.sort((a, b) => a.label.localeCompare(b.label)).map((l) => l.text).join('\n');
}

const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };

/** Diagnosis text for one other-part finding keyword. */
export function findingText(finding, v) {
  const f = finding.trim();
  // "Metastatic adenocarcinoma", never "metastatic invasive adenocarcinoma".
  const type = shortTypeName(v).replace(/^Invasive /, '').toUpperCase();
  const generic = /carcinoma/i.test(type) ? 'CARCINOMA' : type;
  let m;
  if (!f) return 'SEE SYNOPTIC REPORT';
  if ((m = f.match(/^(?:metastatic|positive|met|involved|nodes?)\s*[,;:]?\s*(\d+)\s*\/\s*(\d+)(?:\s*[,;]\s*(.+))?$/i)) || (m = f.match(/^(\d+)\s*\/\s*(\d+)(?:\s*[,;]\s*(.+))?$/))) {
    const pos = parseInt(m[1], 10); const tot = parseInt(m[2], 10);
    if (pos === 0) return `NO EVIDENCE OF MALIGNANCY IN ${plural(tot, 'LYMPH NODE')} (0/${tot})`;
    return `METASTATIC ${generic} IN ${pos} OF ${plural(tot, 'LYMPH NODE')}${m[3] ? `, ${m[3]}` : ''}`;
  }
  if ((m = f.match(/^(?:negative|no tumour|benign|nem|no evidence)\s*[,;:]?\s*(\d+)\s*\/\s*(\d+)(?:\s*[,;]\s*(.+))?$/i))) return `NO EVIDENCE OF MALIGNANCY IN ${plural(parseInt(m[2], 10), 'LYMPH NODE')} (0/${m[2]})${m[3] ? `; ${m[3]}` : ''}`;
  if (/^(involved|involvement)\b/i.test(f)) return `INVOLVED BY ${type}${(m = f.match(/^\w+\s*[,;]\s*(.+)$/)) ? `, ${m[1]}` : ''}`;
  if (/^(metastatic|positive|met)\b/i.test(f)) return `METASTATIC ${type}${(m = f.match(/^\w+\s*[,;]\s*(.+)$/)) ? `, ${m[1]}` : ''}`;
  if (/^(negative|no tumour|benign|nem|no evidence)/i.test(f)) return `NO EVIDENCE OF MALIGNANCY${(m = f.match(/^[^,;]+\s*[,;]\s*(.+)$/)) ? `; ${m[1]}` : ''}`;
  const comma = f.search(/[,;]/);
  return comma > 0 ? `${f.slice(0, comma).toUpperCase()}${f.slice(comma)}` : f.toUpperCase();
}

// ---------- histology ----------

const ADENO_NM = 'Invasive adenocarcinoma (non-mucinous; predominant pattern from the percentages)';
export const isInvasiveNonMucinous = (v) => (v.histType || ADENO_NM) === ADENO_NM;
const isNeuroendocrine = (v) => /carcinoid|neuroendocrine|Small cell/i.test(v.histType || '');
const isCarcinoid = (v) => /carcinoid|neuroendocrine tumour/i.test(v.histType || '');
const isInSitu = (v) => S.AIS.test(v.histType || '') || S.MIA.test(v.histType || '') || S.SCIS.test(v.histType || '');
const isSCC = (v) => /^Invasive squamous cell carcinoma/.test(v.histType || '');

const HIGH_GRADE = /^(solid|micropapillary|complex glandular|cribriform)$/i;
const PATTERN_ALIAS = { lep: 'lepidic', acin: 'acinar', pap: 'papillary', micropap: 'micropapillary', mp: 'micropapillary', sol: 'solid', cribriform: 'complex glandular', 'complex glandular': 'complex glandular', cg: 'complex glandular' };

/** Parse "acinar 60, papillary 25, solid 15" -> [{name, pct}] sorted by percentage (ties keep typed order). */
export function parsePatterns(text) {
  const out = [];
  for (const tok of String(text || '').split(/[,;\n]+/)) {
    const m = tok.trim().match(/^([A-Za-z][A-Za-z -]*?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%?$/) || tok.trim().match(/^(\d+(?:\.\d+)?)\s*%?\s*([A-Za-z][A-Za-z -]*)$/);
    if (!m) continue;
    const name = (/^\d/.test(m[1]) ? m[2] : m[1]).trim().toLowerCase();
    const pct = parseFloat(/^\d/.test(m[1]) ? m[1] : m[2]);
    out.push({ name: PATTERN_ALIAS[name] || name, pct });
  }
  return out.sort((a, b) => b.pct - a.pct);
}

export const patternsOf = (v) => parsePatterns(v.patterns);
export const highGradePct = (pats) => pats.filter((p) => HIGH_GRADE.test(p.name)).reduce((s, p) => s + p.pct, 0);
export const predominant = (pats) => (pats.length ? pats[0].name : '');

/** IASLC 2020 grade for invasive non-mucinous adenocarcinoma: {grade, reason} or null when patterns are missing. */
export function iaslcGrade(v) {
  const pats = patternsOf(v);
  if (!pats.length) return null;
  const hg = highGradePct(pats);
  const pred = predominant(pats);
  const grade = hg >= 20 ? 3 : pred === 'lepidic' ? 1 : 2;
  return { grade, pred, hg, value: `Grade ${grade} (IASLC 2020; ${pred} predominant, ${hg ? `${fmt(hg)} % high-grade patterns` : 'no high-grade pattern'})` };
}

/** Full histologic type as printed in the synoptic row. */
export function histTypeName(v, ctx) {
  const t = v.histType || ADENO_NM;
  const d = stripDot(v.histTypeDetail);
  if (noResidual(v)) {
    const prior = priorOf(ctx);
    return `No residual carcinoma${prior?.type ? ` (prior ${prior.procedure}${prior.accession ? ` ${prior.accession}` : ''}: ${lc1(prior.type)}${prior.sizeMm !== null ? `, ${fmt(prior.sizeMm)} mm` : ''})` : ''}`;
  }
  if (t === ADENO_NM) {
    const pats = patternsOf(v);
    if (!pats.length) return 'Invasive adenocarcinoma, predominant subtype cannot be determined';
    return `Invasive adenocarcinoma, ${predominant(pats)} predominant (${pats.map((p) => `${p.name} ${fmt(p.pct)} %`).join(', ')})`;
  }
  if (/\(specify/.test(t)) return d ? `${specify(t)} (${d})` : specify(t);
  if (/Mixed invasive mucinous|Adenosquamous/.test(t) && d) return `${t} (${d})`;
  return t;
}

/** Short type for the diagnosis line and the other-part lines ("Invasive adenocarcinoma", "Squamous cell carcinoma"). */
export function shortTypeName(v) {
  const t = v.histType || ADENO_NM;
  if (t === ADENO_NM) return 'Invasive adenocarcinoma';
  if (S.AIS.test(t)) return 'Adenocarcinoma in situ';
  if (S.MIA.test(t)) return 'Minimally invasive adenocarcinoma';
  if (S.SCIS.test(t)) return 'Squamous cell carcinoma in situ';
  if (isSCC(v)) return `Squamous cell carcinoma, ${t.replace(/^Invasive squamous cell carcinoma, /, '')}`;
  if (/^Typical carcinoid/.test(t)) return 'Typical carcinoid tumour';
  if (/^Atypical carcinoid/.test(t)) return 'Atypical carcinoid tumour';
  if (/^Carcinoid tumour, NOS/.test(t)) return 'Carcinoid tumour';
  return specify(t).replace(/\s*\((AIS|SCIS)\)/, '');
}

const GRADE_WORD = { G1: 'well differentiated', G2: 'moderately differentiated', G3: 'poorly differentiated', G4: 'undifferentiated' };

/** {value, short, source} — the synoptic grade row and the diagnosis-line grade phrase. */
export function gradeOf(v) {
  const g = v.grade || '';
  const d = stripDot(v.gradeDetail);
  if (g && !/^Derive/.test(g)) {
    if (/^(Cannot be determined|Other)/.test(g)) return { value: `${specify(g)}${d ? ` (${d})` : ''}`, short: '', source: 'typed' };
    const m = g.match(/^(G[1-4X])/);
    return { value: g, short: m && GRADE_WORD[m[1]] ? GRADE_WORD[m[1]] : '', source: 'typed' };
  }
  if (noResidual(v)) return { value: 'Not applicable (no residual tumour)', short: '', source: 'derived' };
  if (isInSitu(v) || isNeuroendocrine(v)) return { value: 'Not applicable', short: '', source: 'derived' };
  if (isInvasiveNonMucinous(v)) {
    const ia = iaslcGrade(v);
    return ia ? { value: ia.value, short: '', source: 'iaslc' } : { value: 'Cannot be determined (pattern percentages not recorded)', short: '', source: 'derived' };
  }
  return { value: 'GX: Cannot be assessed', short: '', source: 'derived' };
}

export function histologyPara(v) {
  const s = [];
  const typed = stripDot(v.microDescription);
  if (typed) s.push(`${uc1(typed)}.`);
  else {
    const t = v.histType || ADENO_NM;
    if (t === ADENO_NM) {
      const pats = patternsOf(v);
      s.push(pats.length ? `Sections show an invasive adenocarcinoma, ${predominant(pats)} predominant (${pats.map((p) => `${p.name} ${fmt(p.pct)} %`).join(', ')}).` : 'Sections show an invasive adenocarcinoma.');
    } else {
      const name = lc1(shortTypeName(v));
      s.push(`Sections show ${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name}${stripDot(v.histTypeDetail) && /\(specify|Mixed|Adenosquamous/.test(t) ? ` (${stripDot(v.histTypeDetail)})` : ''}.`);
    }
    if (isCarcinoid(v) || /Large cell neuroendocrine|Small cell/.test(t)) {
      const mit = num(v.mitoses); const nec = v.necrosis || 'Not identified';
      const bits = [mit !== null ? `${fmt(mit)} mitoses per 2 mm2` : '', /^Present/.test(nec) ? `${lc1(nec.replace(/^Present, /, ''))} necrosis` : 'no necrosis'].filter(Boolean);
      if (bits.length) s.push(`There are ${bits.join(' and ')}.`);
    }
    if (S.MIA.test(t) && num(v.invasiveSizeMm) !== null) s.push(`The invasive component measures ${fmt(num(v.invasiveSizeMm))} mm within a predominantly lepidic tumour.`);
    if (v.stas === 'Present') s.push('Spread through air spaces is present.');
    if (/^PL[12]/.test(v.pleuralInvasion || '')) s.push(`The tumour invades the visceral pleura (${v.pleuralInvasion.slice(0, 3)}${v.elasticStain === true ? ', confirmed on elastic stain' : ''}).`);
  }
  const ihc = stripDot(v.ihc);
  if (ihc) s.push(`Immunohistochemistry: ${ihc}.`);
  return s.join(' ');
}

// ---------- staging ----------

/** Prior-specimen values from the case-level fields (type-only in this version). */
export function priorOf(ctx) {
  const c = ctx?.case || {};
  const acc = stripDot(c.priorAccession);
  const T = stripDot(c.priorPT); const N = stripDot(c.priorPN);
  if (!acc && !T && !N) return null;
  return { accession: acc, procedure: lc1(stripDot(c.priorProcedure)) || 'specimen', date: stripDot(c.priorDate), type: stripDot(c.priorType), sizeMm: num(c.priorSizeMm), T, N };
}

export function staging(part, ctx) {
  const prior = priorOf(ctx);
  return deriveTNM(part.values, 'lung', prior ? { prior: { T: prior.T, N: prior.N, accession: prior.accession, procedure: prior.procedure } } : {});
}

/** "pT1a (prior wedge resection S26-01234) pN0 (0/8, this lobectomy)" when a prior specimen contributes; else st.tnm. */
export function tnmText(st, v, ctx) {
  const prior = priorOf(ctx);
  if (!prior || st.overridden || (st.origin.T !== 'prior' && st.origin.N !== 'prior')) return st.tnm;
  const label = `prior ${prior.procedure}${prior.accession ? ` ${prior.accession}` : ''}`;
  const n = S.nodes(v);
  const thisProc = lc1(procedureText(v));
  const parts = st.tnm.split(' ');
  return parts.map((p) => {
    if (/T/.test(p) && !/N|M/.test(p)) return `${p} (${st.origin.T === 'prior' ? label : `this ${thisProc}`})`;
    if (/N/.test(p)) return `${p} (${st.origin.N === 'prior' ? label : n.examined ? `${n.involved}/${n.examined}, this ${thisProc}` : `this ${thisProc}`})`;
    return p;
  }).join(' ');
}

// ---------- macro ----------

const CUT_TEXT = { Firm: 'firm', 'Tan-white': 'tan-white', 'Grey-white': 'grey-white', 'Ill-defined': 'ill-defined', 'Well-circumscribed': 'well-circumscribed', Spiculated: 'spiculated', Necrosis: 'necrotic', Haemorrhage: 'haemorrhagic', 'Anthracotic pigment': 'anthracotic', Cavitation: 'cavitating', Mucoid: 'mucoid' };

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const s = [];
  if (part.linked) {
    // The frozen part already describes the specimen as received; only additions print.
    if (stripDot(v.otherMacro)) s.push(`${uc1(stripDot(v.otherMacro))}.`);
    return s.length ? `(${part.label}) ${s.join(' ')}` : '';
  }
  const w = num(v.weight); const dims = stripDot(v.specimenDims);
  const meas = [w !== null ? `${fmt(w)} g` : '', dims ? `${dims} mm` : ''].filter(Boolean).join(', ');
  const site = lobeText(v);
  const proc = lc1(procedureText(v));
  const specPhrase = isPneumonectomy(v) ? `${site ? `${site} ` : ''}pneumonectomy specimen` : `${site ? `${site} ` : ''}${proc} specimen`;
  s.push(`The specimen consists of ${/^[aeiou]/.test(specPhrase) ? 'an' : 'a'} ${specPhrase}${meas ? ` (${meas})` : ''}.`);
  const pl = v.pleuraGross || 'Unremarkable';
  if (pl === 'Puckered') s.push('The visceral pleura is puckered over the tumour.');
  else if (pl === 'Involved grossly') s.push('The visceral pleura is involved by tumour grossly.');
  else if (pl === 'Unremarkable') s.push('The pleural surface is smooth and glistening.');
  const size = num(v.tumourSizeMm); const dimsT = stripDot(v.tumourDims);
  const cut = arr(v.cutSurface).map((c) => CUT_TEXT[c]).filter(Boolean);
  const bm = num(v.bronchialMarginMm); const pm = num(v.parenchymalMarginMm);
  const dist = [bm !== null ? `${fmt(bm)} mm from the bronchial margin` : '', pm !== null ? `${fmt(pm)} mm from the parenchymal margin` : ''].filter(Boolean);
  if (isCompletion(v) && v.residualTumour !== 'Present') {
    s.push(v.residualTumour === 'Not identified' ? 'Sectioning shows the previous staple line with surrounding fibrosis; no residual tumour is identified grossly.' : 'Sectioning shows the previous staple line.');
  } else {
    const sizeText = size !== null ? `${fmt(size)} mm in greatest dimension${dimsT ? ` (${dimsT} mm)` : ''}` : dimsT ? `${dimsT} mm` : stripDot(v.sizeCannot) ? `of indeterminate size (${lc1(stripDot(v.sizeCannot))})` : '';
    const where = /^Peripheral/.test(v.tumourSite || 'Peripheral') ? 'subpleural' : /^Central/.test(v.tumourSite || '') ? `central, ${/main bronchus/.test(v.tumourSite) ? 'involving the main bronchus' : 'involving a lobar or segmental bronchus'}` : '';
    s.push(`Sectioning reveals a ${cut.length ? `${cut.join(', ')} ` : ''}${isCompletion(v) ? 'residual ' : ''}tumour${sizeText ? ` measuring ${sizeText}` : ''}${where ? `, ${where}` : ''}${dist.length ? `, ${listJoin(dist)}` : ''}.`);
  }
  const nod = v.separateNodules || 'Not identified';
  if (/^(Same|Different|Contralateral)/.test(nod)) s.push(`Separate tumour nodule(s) are present in the ${nod === 'Same lobe' ? 'same lobe' : nod === 'Different ipsilateral lobe' ? 'other lobe' : 'contralateral lobe'}${stripDot(v.separateNodulesDetail) ? ` (${stripDot(v.separateNodulesDetail)})` : ''}.`);
  if (stripDot(v.otherMacro)) s.push(`${uc1(stripDot(v.otherMacro))}.`);
  else if (!isCompletion(v)) s.push('The remaining lung parenchyma is spongy and unremarkable.');
  return `(${part.label}) ${s.join(' ')}`;
}

/** True when the case prints part letters: more than one distinct letter (a linked pair counts once) or typed other parts. */
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1 || hasExtraParts(part);

export function blockKey(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const lines = String(part.values.blockKeyText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    const m = l.match(/^\(?([\dA-Za-z]+(?:\s*[-–,]\s*[\dA-Za-z]+)*)\)?[\s.:)-]+(.*)$/);
    return m ? `(${lettered(part, ctx) ? part.label : ''}${m[1].replace(/\s+/g, '')}) ${stripDot(m[2])}.` : `${stripDot(l)}.`;
  }).join('\n');
}

// ---------- synoptic ----------

export function nodes(v) { return S.nodes(v); }

export function nodesItem(v) {
  const n = S.nodes(v);
  if (!n.rows.length) return { label: 'Regional lymph nodes', value: v.nodeDirectExtension === true ? 'Not submitted separately; direct extension of the primary tumour into a hilar / intrapulmonary node' : 'Not submitted' };
  const sub = [
    { label: 'Stations (involved/examined)', value: n.rows.map((r) => `${r.label}: ${r.involved}/${r.examined}`).join('; ') },
    { label: 'Number examined', value: String(n.examined) },
    { label: 'Number involved', value: `${n.involved}${n.involvedStations.length ? ` (station${n.involvedStations.length === 1 ? '' : 's'} ${listJoin(n.involvedStations)})` : ''}` }
  ];
  if (v.nodeDirectExtension === true) sub.push({ label: 'Direct extension into a node', value: 'Present' });
  const dep = num(v.nodeDepositMm);
  if (n.involved && dep !== null) sub.push({ label: 'Largest metastatic deposit', value: `${fmt(dep)} mm` });
  if (n.involved && v.nodeEne && !na(v.nodeEne)) sub.push({ label: 'Extranodal extension', value: v.nodeEne });
  return { label: 'Regional lymph nodes', value: `${n.examined} examined; ${n.involved} involved`, sub };
}

export function metastasisValue(v) {
  const sites = chosen(v.distantMets); const d = stripDot(v.distantDetail);
  if (!sites.length) return arr(v.distantMets).some((s) => /^Cannot/.test(s)) ? `Cannot be determined${d ? ` (${d})` : ''}` : arr(v.distantMets).includes('Not identified') ? 'Not identified' : 'Not applicable';
  return `${listJoin(sites.map(specify))}${d ? ` (${d})` : ''}`;
}

function extensionValue(v) {
  const ext = chosen(v.tumourExtension); const d = stripDot(v.tumourExtensionDetail);
  if (!ext.length) {
    if (arr(v.tumourExtension).some((s) => /^Cannot/.test(s))) return `Cannot be assessed${d ? ` (${d})` : ''}`;
    if (arr(v.tumourExtension).includes('Adjacent structures present but not involved')) return `Adjacent structures present but not involved${d ? ` (${d})` : ''}`;
    return 'Not applicable';
  }
  return `${ext.map(specify).join('; ')}${d ? ` (${d})` : ''}`;
}

/** Invasive-size row: typed value, else the total size when no lepidic pattern is recorded, else "Not recorded". */
function invasiveText(v, size, inv) {
  if (num(v.invasiveSizeMm) !== null) return `${fmt(num(v.invasiveSizeMm))} mm`;
  if (noResidual(v)) return 'Not applicable (no residual tumour)';
  if (S.AIS.test(v.histType || '')) return 'Not applicable (in situ)';
  const lepidic = patternsOf(v).some((p) => p.name === 'lepidic');
  if (lepidic || S.MIA.test(v.histType || '')) return 'Not recorded';
  return size !== null ? `${fmt(size)} mm (no lepidic component)` : inv !== null ? `${fmt(inv)} mm` : 'Cannot be determined';
}

const marginValue = (val, mm) => (val && /^Uninvolved/.test(val) && mm !== null ? `${val} (closest distance ${fmt(mm)} mm)` : val || 'Not applicable');

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const size = num(v.tumourSizeMm); const dimsT = stripDot(v.tumourDims);
  const sizeText = size !== null ? `${fmt(size)} mm in greatest dimension${dimsT ? ` (${dimsT} mm)` : ''}` : stripDot(v.sizeCannot) ? `Cannot be determined (${lc1(stripDot(v.sizeCannot))})` : isCompletion(v) && v.residualTumour !== 'Present' ? 'Not applicable (no residual tumour)' : 'Cannot be determined';
  const inv = S.invasiveMm(v);
  const st = staging(part, ctx);
  const grade = gradeOf(v);
  const findings = arr(v.additionalFindings).map((s) => (s === 'Other (specify)' ? stripDot(v.additionalFindingsDetail) : s === 'Fibrosis' && stripDot(v.additionalFindingsDetail) ? `Fibrosis (${stripDot(v.additionalFindingsDetail)})` : s)).filter(Boolean);
  const nod = v.separateNodules || 'Not identified';
  const te = v.treatmentEffect || 'No known presurgical therapy';
  const viable = num(v.viablePct);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      item('Laterality', v.laterality || 'Not specified'),
      item('Lobe(s)', arr(v.lobes).length ? arr(v.lobes).join(', ') : 'Not specified'),
      item('Tumour site', specify(v.tumourSite || 'Peripheral')),
      item('Tumour size', sizeText),
      isInvasiveNonMucinous(v) || S.MIA.test(v.histType || '') || S.AIS.test(v.histType || '') ? item('Invasive size (lepidic component excluded)', invasiveText(v, size, inv)) : null,
      item('Separate tumour nodule(s)', /^(Same|Different|Contralateral)/.test(nod) ? `${nod}${stripDot(v.separateNodulesDetail) ? ` (${stripDot(v.separateNodulesDetail)})` : ''}` : nod),
      item('Pleural surface (gross)', v.pleuraGross || 'Unremarkable'),
      isCompletion(v) || !na(v.residualTumour) ? item('Residual tumour at the previous resection site', v.residualTumour === 'Present' ? `Present${num(v.residualTumourMm) !== null ? ` (${fmt(num(v.residualTumourMm))} mm)` : ''}` : v.residualTumour || 'Not applicable') : null
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v, ctx)),
      item('Histologic grade', grade.value),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Spread through air spaces (STAS)', v.stas || 'Not identified'),
      item('Visceral pleura invasion', `${v.pleuralInvasion || 'Not identified'}${/^PL/.test(v.pleuralInvasion || '') && v.elasticStain === true ? ' (elastic stain performed)' : ''}`),
      item('Lymphatic and / or vascular invasion', v.lvi || 'Not identified'),
      item('Tumour extension', extensionValue(v)),
      item('Treatment effect', `${te}${viable !== null && !/^No known/.test(te) ? ` (${fmt(viable)} % viable tumour)` : ''}`)
    ] },
    { heading: 'Margins', items: [
      item('Bronchial margin', marginValue(v.bronchialMargin, num(v.bronchialMarginMm))),
      item('Vascular margin', v.vascularMargin || 'Not applicable'),
      item('Parenchymal margin', marginValue(v.parenchymalMargin, num(v.parenchymalMarginMm))),
      !na(v.otherMargin) ? item('Other tissue margin(s)', `${v.otherMargin}${stripDot(v.otherMarginDetail) ? ` (${stripDot(v.otherMarginDetail)})` : ''}`) : null
    ] },
    { heading: 'Lymph nodes', items: [nodesItem(v)] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: `${tnmText(st, v, ctx)}${st.overridden ? ` [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : ''}`,
        sub: stageLine(st) ? [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] : [] }
    ] } : null,
    { heading: 'Additional findings', items: [
      ...(findings.length ? findings.map((f) => ({ text: f })) : stripDot(v.ancillary) || stripDot(v.additionalNotes) ? [] : [{ text: 'None' }]),
      stripDot(v.ancillary) ? item('Ancillary studies', stripDot(v.ancillary)) : null,
      stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null
    ] }
  ].filter(Boolean);
  const heading = lettered(part, ctx) ? `(${part.label}) ${specimenName(part)}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

/** "0 of 8 regional lymph nodes involved" / "1 of 9 regional lymph nodes involved (station 7)"; '' when none submitted. */
export function nodesPhrase(v) {
  const n = S.nodes(v);
  if (!n.rows.length) return v.nodeDirectExtension === true ? 'direct extension into a hilar / intrapulmonary lymph node' : '';
  return `${n.involved} of ${plural(n.examined, 'regional lymph node')} involved${n.involvedStations.length ? ` (station${n.involvedStations.length === 1 ? '' : 's'} ${listJoin(n.involvedStations)})` : ''}`;
}

function marginsPhrase(v) {
  const named = [['bronchial', v.bronchialMargin], ['vascular', v.vascularMargin], ['parenchymal', v.parenchymalMargin], [stripDot(v.otherMarginDetail) ? lc1(stripDot(v.otherMarginDetail).split(/[,(]/)[0]) : 'other', v.otherMargin]];
  const involved = named.filter(([, m]) => /^Involved/.test(m || '')).map(([n, m]) => `${n}${/in situ|lepidic|adenocarcinoma in situ/i.test(m) ? ` (${lc1(m.replace(/^Involved by /, ''))})` : ''}`);
  const clear = named.filter(([n, m]) => /^Uninvolved/.test(m || '') && n !== 'vascular').map(([n]) => n);
  const out = [];
  if (involved.length) out.push(`${listJoin(involved)} margin${involved.length === 1 ? '' : 's'} involved`);
  if (clear.length) out.push(`${listJoin(clear)} margin${clear.length === 1 ? '' : 's'} clear`);
  return out.join('; ');
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  const h = headParts(v);
  const head = `(${part.label}) ${typed ? upperHead(typed) : `${h.organ.toUpperCase()}${h.site ? `, ${h.site}` : ''}, ${h.proc}`}`;
  const grade = gradeOf(v);
  const size = num(v.tumourSizeMm);
  const inv = num(v.invasiveSizeMm);
  const pats = isInvasiveNonMucinous(v) ? patternsOf(v) : [];
  const first = [];
  if (isCompletion(v) && v.residualTumour !== 'Present') {
    const prior = priorOf(ctx);
    const pd = prior ? [`prior ${prior.procedure}${prior.accession ? ` ${prior.accession}` : ''}`, prior.type ? lc1(prior.type) : '', prior.sizeMm !== null ? `${fmt(prior.sizeMm)} mm` : ''].filter(Boolean) : [];
    first.push(`NO RESIDUAL ${/carcinoma/i.test(shortTypeName(v)) ? 'CARCINOMA' : 'TUMOUR'} at the previous staple line${pd.length ? ` (${pd[0]}${pd.length > 1 ? `: ${pd.slice(1).join(', ')}` : ''})` : ''}`);
    const np = nodesPhrase(v);
    if (np) first.push(np);
  } else {
    const type = [upperHead(shortTypeName(v)), pats.length ? `${predominant(pats)} predominant` : '', grade.short].filter(Boolean).join(', ');
    let clause = type;
    if (size !== null) clause += `, ${fmt(size)} mm${inv !== null && inv !== size ? ` (invasive component ${fmt(inv)} mm)` : ''}`;
    if (isCompletion(v)) clause = `RESIDUAL ${clause}`;
    if (!isInSitu(v) || S.MIA.test(v.histType || '')) {
      const pl = v.pleuralInvasion || 'Not identified';
      clause += /^PL[12]/.test(pl) ? `, visceral pleura invaded (${pl.slice(0, 3)})` : /^Cannot/.test(pl) ? '' : ', visceral pleura not invaded';
    }
    first.push(clause);
    // Structures read "extending into the main bronchus and chest wall (rib)"; the obstructive-change
    // option is a finding, not a structure, so it prints as its own clause.
    const ext = chosen(v.tumourExtension);
    const obstructive = ext.some((s) => /^Atelectasis/.test(s));
    const structures = ext.filter((s) => !/^Atelectasis/.test(s)).map((s) => lc1(specify(s)).replace(/^main bronchus \(.*\)$/, 'main bronchus').replace(/^chest wall, (.+)$/, 'chest wall ($1)').replace(/^visceral pericardium \(epicardium\)$/, 'visceral pericardium'));
    if (structures.length) first.push(`extending into the ${listJoin(structures)}`);
    if (obstructive) first.push('atelectasis / obstructive pneumonitis extending to the hilar region');
    if (/^Present/.test(v.lvi || '')) first.push('lymphovascular invasion present');
    if (v.stas === 'Present') first.push('spread through air spaces present');
    if (/^(Same|Different)/.test(v.separateNodules || '')) first.push(`separate tumour nodule(s) in the ${v.separateNodules === 'Same lobe' ? 'same lobe' : 'other ipsilateral lobe'}`);
    if (!/^No known/.test(v.treatmentEffect || 'No known presurgical therapy')) first.push(lc1(specify(v.treatmentEffect)));
    const mp = marginsPhrase(v);
    if (mp) first.push(mp);
  }
  const clauses = [`${first.join('; ')}; see synoptic report`];
  if (!(isCompletion(v) && v.residualTumour !== 'Present')) { const np = nodesPhrase(v); if (np) clauses.push(np); }
  const sites = chosen(v.distantMets);
  const spread = [];
  if (v.separateNodules === S.NODULES_CONTRA) spread.push('separate tumour nodule(s) in the contralateral lobe');
  if (sites.length) spread.push(`distant metastasis: ${listJoin(sites.map((x) => lc1(specify(x))))}`);
  if (spread.length) clauses.push(spread.join('; '));
  if (ctx?.options?.printPTNM) {
    const st = staging(part, ctx);
    let s = `${tnmText(st, v, ctx)} (${st.edition})`;
    if (st.stage) s += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
    clauses.push(s);
  }
  const main = renderDiagnosis(head, clauses);
  const others = otherParts(v).map((p) => `(${p.label}) ${upperHead(p.specimen)} - ${findingText(p.finding, v)}`);
  return [main, ...others].join('\n\n');
}

/** Case-level comment: the completion-resection staging sentence (agreed wording, docs/specs/lung-pair.md). */
export function comment(parts, ctx) {
  const prior = priorOf(ctx);
  if (!prior || !prior.accession) return '';
  const p = parts.find((x) => isCompletion(x.values) || priorOf(ctx));
  if (!p) return '';
  const thisProc = lc1(procedureText(p.values));
  return `Staging is based on the prior ${prior.procedure} (${prior.accession}) together with the lymph nodes from this ${thisProc}.`;
}

// ---------- frozen link ----------

const cmToMm = (cm) => (cm === null ? null : Math.round(cm * 100) / 10);
const FROZEN_TYPE = { Adenocarcinoma: ADENO_NM, 'Squamous cell carcinoma': 'Invasive squamous cell carcinoma, keratinising', 'Small cell carcinoma': 'Small cell carcinoma', 'Carcinoid tumour': 'Carcinoid tumour, NOS / neuroendocrine tumour, NOS' };

/**
 * Map a frozen-section part's values (frozen_section template, Lung wedge / nodule scenario) to a
 * patch of synoptic values. Pure; returns {} when the frozen part is not a lung scenario.
 */
export function prefillFromFrozen(fv) {
  if (!fv || fv.scenario !== 'Lung wedge / nodule') return {};
  const out = {};
  const side = fv.luSide || '';
  if (side) out.laterality = side;
  if (fv.luLobe) out.lobes = [fv.luLobe];
  const spec = fv.luSpecimen || 'Wedge excision';
  if (spec === 'Wedge excision') out.procedure = 'Wedge resection';
  else if (spec === 'Segmentectomy') out.procedure = 'Segmentectomy';
  else { out.procedure = 'Other (specify)'; out.procedureOther = lc1(spec.replace(/, punch$/, ' punch biopsy')); }
  const dims = String(fv.luSize || '').match(/\d+(?:\.\d+)?/g);
  if (dims) out.specimenDims = dims.map((d) => fmt(cmToMm(parseFloat(d)))).join(' x ');
  const largest = cmToMm(num(fv.luNoduleCm));
  if (largest !== null) out.tumourSizeMm = fmt(largest);
  const count = parseInt(fv.luNoduleCount ?? '1', 10);
  const second = cmToMm(num(fv.luSecondCm));
  if (count > 1) { out.separateNodules = 'Same lobe'; out.separateNodulesDetail = `${count - 1} additional nodule${count > 2 ? 's' : ''}${second !== null ? `, ${fmt(second)} mm` : ''}`; }
  const margin = cmToMm(num(fv.luMarginCm));
  if (margin !== null) out.parenchymalMarginMm = fmt(margin);
  out.parenchymalMargin = fv.lungMargin === 'Involved' ? 'Involved by invasive carcinoma' : 'Uninvolved by invasive carcinoma';
  out.bronchialMargin = 'Not applicable';
  out.vascularMargin = 'Not applicable';
  out.tumourSite = 'Peripheral';
  const pl = fv.luPleuraGross || 'Not involved grossly';
  out.pleuraGross = pl === 'Puckered' ? 'Puckered' : pl === 'Involved grossly' ? 'Involved grossly' : pl === 'Not assessable' ? 'Not applicable' : 'Unremarkable';
  if (fv.luNode === true) {
    const inv = /^Involved/.test(fv.luNodeResult || '') ? 1 : 0;
    out.nodeStations = `12: ${inv}/1`;
    if (inv) out.nodeEne = /extranodal/.test(fv.luNodeResult) ? 'Present' : 'Not identified';
  }
  const type = FROZEN_TYPE[fv.lungResult || 'Adenocarcinoma'];
  if (type) out.histType = type;
  const pats = parsePatterns(fv.luPattern);
  if (pats.length && type === ADENO_NM) out.patterns = pats.map((p) => `${p.name} ${fmt(p.pct)}`).join(', ');
  return out;
}

// ---------- validation + flags ----------

export function validate(part, ctx) {
  const v = part.values;
  const out = [];
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  const info = (m) => out.push({ level: 'info', message: m });
  const t = v.histType || ADENO_NM;
  const size = num(v.tumourSizeMm); const inv = num(v.invasiveSizeMm);
  if (size === null && !stripDot(v.tumourDims) && !stripDot(v.sizeCannot) && !(isCompletion(v) && v.residualTumour !== 'Present')) warn('Tumour size not recorded.');
  if (inv !== null && size !== null && inv > size) err('Invasive size is larger than the total tumour size.');
  if (isInvasiveNonMucinous(v)) {
    const pats = patternsOf(v);
    if (!pats.length && !noResidual(v)) warn('Adenocarcinoma patterns with percentages not recorded: the predominant pattern and the IASLC grade cannot be derived.');
    else {
      const sum = pats.reduce((s, p) => s + p.pct, 0);
      if (Math.abs(sum - 100) > 0.5) err(`Pattern percentages sum to ${fmt(sum)} %, not 100 %.`);
      if (predominant(pats) === 'lepidic' && inv !== null && inv <= 5 && size !== null && size <= 30) info('Lepidic-predominant tumour with 5 mm or less invasion: consider minimally invasive adenocarcinoma (pT1mi).');
      if (predominant(pats) === 'lepidic' && inv === null && size !== null) warn('Lepidic-predominant adenocarcinoma: record the invasive size (lepidic component excluded) - it decides pT.');
    }
  }
  if (S.MIA.test(t) && inv !== null && inv > 5) err('Minimally invasive adenocarcinoma with more than 5 mm invasion: reclassify as invasive adenocarcinoma (pT1a or higher).');
  if (S.MIA.test(t) && inv === null) warn('Minimally invasive adenocarcinoma: record the invasive size (5 mm or less).');
  if (/\(specify/.test(t) && !stripDot(v.histTypeDetail)) err('Histologic type needs the specified component / type.');
  if (isCarcinoid(v) && /NOS/.test(t)) info('Carcinoid tumour, NOS: mitoses per 2 mm2 and necrosis separate typical (< 2, no necrosis) from atypical (2-10 or necrosis) carcinoid.');
  if (isCarcinoid(v) && num(v.mitoses) !== null) {
    const mit = num(v.mitoses); const nec = /^Present/.test(v.necrosis || '');
    if (/^Typical/.test(t) && (mit >= 2 || nec)) warn('Typical carcinoid with 2 or more mitoses per 2 mm2 or necrosis: the WHO criteria give atypical carcinoid.');
    if (/^Atypical/.test(t) && mit < 2 && !nec) warn('Atypical carcinoid needs 2-10 mitoses per 2 mm2 or necrosis; neither is recorded.');
  }
  const g = gradeOf(v);
  if (g.source === 'derived' && /^GX/.test(g.value)) warn('Histologic grade: pick G1-G4 for this carcinoma type (IASLC grading applies to invasive non-mucinous adenocarcinoma only).');
  if (/^PL[12]/.test(v.pleuralInvasion || '') && v.elasticStain !== true) info('Visceral pleura invasion PL1 / PL2 recorded without an elastic stain: note the stain when performed.');
  if (v.stas === 'Present' && isSublobar(v)) info('STAS with a sublobar resection: associated with locoregional recurrence in the literature (reference note; no action derived).');
  const te = v.treatmentEffect || 'No known presurgical therapy';
  if (!/^No known/.test(te) && num(v.viablePct) !== null) {
    const pct = num(v.viablePct);
    if (/Greater than 10/.test(te) && pct <= 10) err('Treatment effect: 10 % or less viable tumour is typed but "Greater than 10 %" is selected.');
    if (/10 % or less/.test(te) && pct > 10) err('Treatment effect: more than 10 % viable tumour is typed but "10 % or less" is selected.');
  }
  const st = staging(part, ctx);
  for (const n of st.notes) if (!/overridden/.test(n)) warn(n);
  const nd = S.nodes(v);
  if (nd.bad.length) err(`Lymph node stations not understood: ${nd.bad.join('; ')}. Use "7: 2/3; 10R: 0/2".`);
  if (nd.involved && num(v.nodeDepositMm) === null) info('Lymph nodes: the largest metastatic deposit is not recorded.');
  if (nd.involved && (!v.nodeEne || na(v.nodeEne))) info('Lymph nodes involved: state the extranodal extension.');
  if (isCompletion(v)) {
    const prior = priorOf(ctx);
    if (!prior || !prior.accession) warn('Completion resection without a related prior specimen accession: the combined stage and the staging comment are not printed.');
    if (v.residualTumour === 'Not applicable') warn('Completion resection: state whether residual tumour is present at the previous staple line.');
  }
  const prior = priorOf(ctx);
  if (prior && prior.T && size !== null && !(isCompletion(v) && v.residualTumour !== 'Present')) info(`Prior pT (${prior.T}) and a tumour size in this specimen are both recorded: the higher T category governs; the origin prints with the pTNM.`);
  if (prior && !isCompletion(v)) info('A related prior specimen is typed: its pT / pN combine with this specimen for the printed stage.');
  for (const p of otherParts(v)) if (!p.finding) warn(`Part ${p.label}: no finding given - the diagnosis line prints "SEE SYNOPTIC REPORT".`);
  const labels = otherParts(v).map((p) => p.label);
  if (labels.includes(part.label)) err(`Other parts: letter ${part.label} is this part.`);
  if (new Set(labels).size !== labels.length) err('Other parts: a letter is repeated.');
  if (stripDot(v.tnmOverride) && !st.overridden) err(`pTNM override "${stripDot(v.tnmOverride)}" could not be parsed.`);
  if (st.stage) info(`AJCC 9th stage group (${st.M === 'M-' ? 'if cM0' : 'pM recorded'}): ${st.stage}${st.overridden ? ' (from the override)' : ''}.`);
  return out;
}

export function flags(parts) {
  const out = [];
  for (const p of parts) {
    const v = p.values;
    if (stripDot(v.ancillary) && /requested|pending|to follow|sent/i.test(v.ancillary)) out.push(`(${p.label}) Ancillary result pending: ${stripDot(v.ancillary)}.`);
  }
  return out;
}

export default { specimenName, specimens, otherSpecimenLines, macro, blockKey, synoptic, diagnosis, comment, validate, flags, staging, hasExtraParts, prefillFromFrozen };
