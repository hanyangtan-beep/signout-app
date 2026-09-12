// Ovary, fallopian tube and primary peritoneal tumour resection generator (fourth synoptic template).
// Elements mirror the QMH Cancer Reporting Template GYN-Ovary page (CAP Ovary, Fallopian Tube, or
// Peritoneum 1.5.0.0) in the QMH order (docs/specs/ovary-pair.md, Part 3). AJCC 8th pTNM is derived by
// src/staging/ovary.js and printed only with `options.printPTNM`; FIGO 2014 is derived for the Checks
// panel (info level) and is never written into the report.
// Pure functions: (part, ctx) -> string.
//
// Blocks produced:
//   specimens  "(A) Right ovary and fallopian tube, salpingo-oophorectomy" plus one line per entry in
//              `otherParts` (contralateral adnexa, omentum, nodes, peritoneum, uterus)
//   macro      "The specimen consists of a right salpingo-oophorectomy specimen (210 g, 100 x 75 x 60 mm) …"
//   blockKey   the typed block key, one "(n) …" entry per line
//   synoptic   sectioned "- Element: value" list in QMH order with the "- Tumour histology:" paragraph
//              after the grade; no stage unless `printPTNM`
//   diagnosis  the synoptic part's specimen line + "- " clauses, then one diagnosis line per other letter
// There is no separate narrative microscopy paragraph. Wording is protected by
// tests/ovary_ft_peritoneum.test.js and tests/fixtures/ovary - change it only deliberately.

import { deriveTNM, stageLine } from '../src/staging/index.js';
import * as S from '../src/staging/ovary.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';

const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
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
const chosen = (list) => arr(list).filter((s) => !/^Not (identified|applicable|submitted)|^Cannot/.test(s));
const specify = (s) => String(s || '').replace(/\s*\((specify|explain)[^)]*\)\s*:?$/i, '').trim();
const na = (s) => !s || /^Not applicable/.test(s);

// ---------- specimen ----------

const SIDE = (s) => (/^Right/.test(s) ? 'right' : /^Left/.test(s) ? 'left' : /^Bilateral/.test(s) ? 'bilateral' : '');

/** {organ, side, proc} for the diagnosis head and the derived specimen name, from the first procedure. */
export function headParts(v) {
  const procs = arr(v.procedures);
  const main = procs[0] || 'Right salpingo-oophorectomy';
  const side = SIDE(main);
  const other = stripDot(v.procedureOther);
  if (/hysterectomy/i.test(main)) {
    const bso = /bilateral salpingo-oophorectomy/i.test(main) || procs.some((p) => /^Bilateral salpingo-oophorectomy/.test(p));
    const cervix = !/Supracervical/.test(main);
    return { organ: `Uterus ${cervix ? 'with' : 'without'} cervix${bso ? ' and bilateral adnexa' : ''}`, side: '', proc: lc1(main) };
  }
  if (/salpingo-oophorectomy/i.test(main)) return { organ: side === 'bilateral' ? 'Ovaries and fallopian tubes' : 'Ovary and fallopian tube', side, proc: 'salpingo-oophorectomy' };
  if (/oophorectomy/i.test(main)) return { organ: side === 'bilateral' ? 'Ovaries' : 'Ovary', side, proc: 'oophorectomy' };
  if (/cystectomy/i.test(main)) return { organ: 'Ovary', side, proc: 'cystectomy' };
  if (/salpingectomy/i.test(main)) return { organ: side === 'bilateral' ? 'Fallopian tubes' : 'Fallopian tube', side, proc: 'salpingectomy' };
  if (/^Omentectomy/.test(main)) return { organ: 'Omentum', side: '', proc: 'omentectomy' };
  if (/^Peritoneal biopsies/.test(main)) return { organ: 'Peritoneum', side: '', proc: 'biopsies' };
  if (/^Peritoneal tumour debulking/.test(main)) return { organ: 'Peritoneum', side: '', proc: 'tumour debulking' };
  if (/^Peritoneal washing/.test(main)) return { organ: 'Peritoneal washing', side: '', proc: 'cytology' };
  if (/^Pleurocentesis/.test(main)) return { organ: 'Pleural fluid', side: '', proc: 'pleurocentesis' };
  return { organ: other ? uc1(other.replace(/,.*$/, '')) : 'Adnexal mass', side: '', proc: other && other.includes(',') ? stripDot(other.split(',').slice(1).join(',')).trim() : 'excision' };
}

const extraProcs = (v) => arr(v.procedures).slice(1).filter((p) => p !== 'Other (specify)').map(lc1);

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  const h = headParts(v);
  const extras = extraProcs(v);
  return `${h.side && h.side !== 'bilateral' ? `${uc1(h.side)} ${lc1(h.organ)}` : h.organ}, ${h.proc}${extras.length ? `; ${extras.join('; ')}` : ''}`;
}

export function procedureText(v) {
  const procs = arr(v.procedures).map((p) => (p === 'Other (specify)' ? stripDot(v.procedureOther) : p)).filter(Boolean);
  return procs.length ? `${procs[0]}${procs.length > 1 ? `; ${procs.slice(1).map(lc1).join('; ')}` : ''}` : 'Not specified';
}

// ---------- other parts ----------

/**
 * Parse `otherParts` lines: "B) Ovary and fallopian tube, left, salpingo-oophorectomy - involved".
 * Returns [{label, specimen, finding}] with the raw finding text; `findingText()` turns it into the line.
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

/** SPECIMEN block: the synoptic part(s) and one line per typed other part, in letter order. */
export function specimens(parts) {
  const lines = parts.map((p) => ({ label: p.label, text: `(${p.label}) ${specimenName(p)}` }));
  for (const p of parts) for (const o of otherParts(p.values)) lines.push({ label: o.label, text: `(${o.label}) ${o.specimen}` });
  return lines.sort((a, b) => a.label.localeCompare(b.label)).map((l) => l.text).join('\n');
}

const TYPE_UPPER = (v) => histTypeName(v).toUpperCase();

/** Diagnosis text for one other-part finding keyword. */
export function findingText(finding, v) {
  const f = finding.trim();
  const type = TYPE_UPPER(v);
  const generic = /carcinoma/i.test(type) ? 'CARCINOMA' : type;
  let m;
  if (!f) return 'SEE SYNOPTIC REPORT';
  if (/^(involved|involvement)\b/i.test(f)) return `INVOLVED BY ${type}${(m = f.match(/^\w+\s*[,;]\s*(.+)$/)) ? `, ${m[1]}` : ''}`;
  if (/^(metastatic|positive|met)\b/i.test(f)) return `METASTATIC ${type}${(m = f.match(/^\w+\s*[,;]\s*(.+)$/)) ? `, ${m[1]}` : ''}`;
  if ((m = f.match(/^nodes?\s+(\d+)\s*\/\s*(\d+)(?:\s*[,;]\s*(.+))?$/i))) {
    const pos = parseInt(m[1], 10); const tot = parseInt(m[2], 10);
    if (pos === 0) return `NO EVIDENCE OF MALIGNANCY IN ${tot} LYMPH NODE${tot === 1 ? '' : 'S'} (0/${tot})`;
    return `METASTATIC ${generic} IN ${pos} OF ${tot} LYMPH NODE${tot === 1 ? '' : 'S'}${m[3] ? `, ${m[3]}` : ''}`;
  }
  if (/^serosa/i.test(f)) return `SEROSAL INVOLVEMENT BY ${type}; no endometrial or cervical lesion${(m = f.match(/^\w+\s*[,;]\s*(.+)$/)) ? ` (${m[1]})` : ''}`;
  if (/^(negative|no tumour|benign|nem|no evidence)/i.test(f)) return `NO EVIDENCE OF MALIGNANCY${(m = f.match(/^[^,;]+\s*[,;]\s*(.+)$/)) ? `; ${m[1]}` : ''}`;
  if (/^stic\b/i.test(f)) return `SEROUS TUBAL INTRAEPITHELIAL CARCINOMA${(m = f.match(/^\w+\s*[,;]\s*(.+)$/)) ? `; ${m[1]}` : ''}`;
  if (/^endometriosis\b/i.test(f)) return `ENDOMETRIOSIS; no evidence of malignancy`;
  // Free text: first clause upper case, the rest as typed.
  const comma = f.search(/[,;]/);
  return comma > 0 ? `${f.slice(0, comma).toUpperCase()}${f.slice(comma)}` : f.toUpperCase();
}

const upperHead = (spec) => { const c = spec.indexOf(', '); return c > 0 ? `${spec.slice(0, c).toUpperCase()}${spec.slice(c)}` : spec.toUpperCase(); };

// ---------- histology ----------

export function histTypeName(v) {
  const t = v.histType || 'High-grade serous carcinoma';
  const d = stripDot(v.histTypeOther);
  if (/\(specify/.test(t)) return d ? `${specify(t)} (${d})` : specify(t);
  return t;
}

const ENDO = (v) => /^Endometrioid carcinoma/.test(v.histType || '');
const MUCINOUS_CA = (v) => v.histType === 'Mucinous adenocarcinoma';
const TERATOMA = (v) => v.histType === 'Immature teratoma';
const BORDERLINE = (v) => /borderline|microinvasive low-grade/i.test(v.histType || '');
const HIGH_BY_DEF = /^(High-grade serous|Clear cell carcinoma|Carcinosarcoma|Undifferentiated|Dedifferentiated|Small cell carcinoma|Malignant Brenner|Endometrioid stromal sarcoma, high|Yolk sac|Embryonal|Choriocarcinoma|Desmoplastic small round|Dysgerminoma)/;
const LOW_BY_DEF = /^(Low-grade serous|Microinvasive low-grade|Endometrioid stromal sarcoma, low)/;
const GENERIC_WHO = /^(Mesonephric-like|Sertoli-Leydig|Other sex cord-stromal|Teratoma with malignant|Malignant struma|Leiomyosarcoma|Fibrosarcoma|Adenosarcoma|Mixed carcinoma|Carcinoma, subtype|Steroid cell tumour, malignant|Gastrointestinal stromal|Solitary fibrous|Other \(specify\))/;

const solidGrade = (v) => (/^More than 50%/.test(v.solidPct || '') ? 3 : /^6-50%/.test(v.solidPct || '') ? 2 : 1);
export function figoGrade(v) {
  const g = solidGrade(v);
  return /^Nuclear grade 3/.test(v.nuclearGrade || '') && g < 3 ? g + 1 : g;
}

/** {value, short} — the synoptic grade row and the diagnosis-line grade phrase. */
export function gradeOf(v) {
  const t = v.histType || 'High-grade serous carcinoma';
  if (ENDO(v)) { const g = figoGrade(v); return { value: `FIGO grade ${g} (endometrioid carcinoma)`, short: `FIGO grade ${g}` }; }
  if (MUCINOUS_CA(v)) { const m = v.mucinousGrade || ''; return /^Low-grade/.test(m) ? { value: 'Low grade, growth pattern-based (expansile growth or infiltrative growth in 10% or less)', short: 'low grade' } : /^High-grade/.test(m) ? { value: 'High grade, growth pattern-based (infiltrative growth in more than 10% of the tumour)', short: 'high grade' } : { value: m, short: lc1(m.replace(/\s*\(.*$/, '')) }; }
  if (TERATOMA(v)) { const g = v.teratomaGrade || 'Low grade (grade 1)'; return { value: g, short: lc1(g) }; }
  if (BORDERLINE(v)) return { value: 'Not applicable (borderline tumour)', short: '' };
  if (HIGH_BY_DEF.test(t)) return { value: 'Not applicable (high grade by definition)', short: '' };
  if (LOW_BY_DEF.test(t)) return { value: 'Not applicable (low grade by definition)', short: '' };
  if (GENERIC_WHO.test(t)) { const g = v.gradeWho || 'GX: Cannot be assessed'; return { value: g, short: /^GX/.test(g) ? '' : g.slice(0, 2) }; }
  return { value: 'Not applicable', short: '' };
}

export function histologyPara(v) {
  const type = histTypeName(v);
  const article = /^[AEIOU]/i.test(type) ? 'an' : 'a';
  const s = [`Sections show ${article} ${lc1(type)}.`];
  if (ENDO(v)) s.push(`Solid non-squamous growth is ${lc1(specify(v.solidPct || '5% or less (architectural grade 1)')).replace(/\s*\(architectural.*$/, '')} with ${/^Nuclear grade 3/.test(v.nuclearGrade || '') ? 'marked nuclear atypia in the majority of the tumour' : 'mild to moderate nuclear atypia'}.`);
  if (MUCINOUS_CA(v)) s.push(/^High-grade/.test(v.mucinousGrade || '') ? 'Infiltrative (destructive) stromal invasion is present in more than 10% of the tumour.' : /^Low-grade/.test(v.mucinousGrade || '') ? 'Invasion is expansile (confluent), with infiltrative growth in 10% or less of the tumour.' : '');
  if (stripDot(v.microDescription)) s.push(`${uc1(stripDot(v.microDescription))}.`);
  const tm = v.tubalMucosa || '';
  if (/^Involved/.test(tm)) s.push('The fallopian tube mucosa is involved by invasive carcinoma.');
  else if (/entirely/.test(tm)) s.push('The fallopian tubes are examined entirely (SEE-FIM) and the mucosa is not involved.');
  const stic = arr(v.additionalFindings).some((f) => /STIC/.test(f));
  if (stic) s.push('Serous tubal intraepithelial carcinoma is present in the fimbria.');
  const ihc = [];
  if (v.p53 && v.p53 !== 'Not performed') ihc.push(`p53 shows ${p53Phrase(v)}`);
  if (stripDot(v.otherIhc)) ihc.push(stripDot(v.otherIhc));
  if (ihc.length) s.push(`Immunohistochemistry: ${ihc.join('; ')}.`);
  return s.filter(Boolean).join(' ');
}

function p53Phrase(v) {
  const p = v.p53 || '';
  if (/^Normal/.test(p)) return 'a wild-type pattern';
  if (/Overexpression/.test(p)) return 'an abnormal pattern (strong diffuse nuclear overexpression)';
  if (/Null/.test(p)) return 'an abnormal pattern (null)';
  if (/Cytoplasmic/.test(p)) return 'an abnormal pattern (cytoplasmic only)';
  if (/^Subclonal/.test(p)) return `a subclonal abnormal pattern${stripDot(v.p53Detail) ? ` (${stripDot(v.p53Detail)})` : ''}`;
  return `an indeterminate result${stripDot(v.p53Detail) ? ` (${stripDot(v.p53Detail)})` : ''}`;
}

export function p53Value(v) {
  const p = v.p53 || 'Not performed';
  if (p === 'Not performed') return p;
  return `${specify(p)}${stripDot(v.p53Detail) ? ` (${stripDot(v.p53Detail)})` : ''}`;
}

// ---------- staging ----------

export function staging(part) { return deriveTNM(part.values, 'ovary'); }

const PRIMARY_WORD = { ovary: 'ovarian', tube: 'tubal', 'tubo-ovarian': 'tubo-ovarian', peritoneum: 'primary peritoneal', undesignated: 'primary site undesignated' };

/** WHO 5th suggestion for the primary site of high-grade serous carcinoma; null when the rule does not apply. */
export function suggestedPrimary(v) {
  if (!/^High-grade serous/.test(v.histType || '')) return null;
  const stic = arr(v.additionalFindings).some((f) => /STIC/.test(f));
  const tubeInv = /^Involved/.test(v.tubalMucosa || '');
  const site = v.tumourSite || '';
  if (site === S.SITE_PERITONEUM) return 'peritoneum';
  if (stic || tubeInv) return 'tube';
  if (/entirely/.test(v.tubalMucosa || '') && /ovar/i.test(site) && !/tubo/i.test(site)) return 'ovary';
  if (/tubo-ovarian/i.test(site)) return 'tubo-ovarian';
  return null;
}

// ---------- macro ----------

const CUT_TEXT = { 'Unilocular cyst': 'a unilocular cyst', 'Multilocular cyst': 'a multilocular cyst', 'Serous fluid': 'serous fluid', 'Mucinous contents': 'mucinous contents', 'Sebaceous material and hair': 'sebaceous material and hair', 'Chocolate-brown fluid': 'chocolate-brown fluid', 'Solid areas': 'solid areas', 'Papillary excrescences (inner surface)': 'papillary excrescences on the inner surface', 'Necrosis': 'necrosis', 'Haemorrhage': 'haemorrhage', 'Torsion (haemorrhagic infarction)': 'haemorrhagic infarction consistent with torsion' };

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const h = headParts(v);
  const w = num(v.weight); const dims = stripDot(v.specimenDims);
  const meas = [w !== null ? `${fmt(w)} g` : '', dims ? `${dims} mm` : ''].filter(Boolean).join(', ');
  const integ = [v.integrityRO, v.integrityLO, v.integrityRT, v.integrityLT].filter((s) => s && !na(s));
  const received = integ.some((s) => /Fragmented/.test(s)) ? 'received fragmented' : integ.some((s) => /preoperative or unknown/.test(s)) ? 'with a capsular defect present on receipt' : integ.some((s) => /intraoperative/.test(s)) ? 'received with an intraoperative capsular breach' : 'received intact';
  const morc = stripDot(v.morcellated);
  const s = [];
  const procPhrase = /hysterectomy/.test(h.proc) ? `an ${received === 'received intact' ? 'intact ' : ''}${lc1(h.organ)} from a ${h.proc}` : `a ${h.side && h.side !== 'bilateral' ? `${h.side} ` : h.side === 'bilateral' ? 'bilateral ' : ''}${h.proc} specimen${received === 'received intact' ? ' received intact' : ` ${received}`}`;
  s.push(`The specimen consists of ${procPhrase}${meas ? ` (${meas})` : ''}${morc ? `; the ${lc1(morc)} is morcellated` : ''}.`);
  const size = num(v.tumourSizeMm); const dimsT = stripDot(v.tumourDims);
  const sizeText = size !== null ? `${fmt(size)} mm in greatest dimension${dimsT ? ` (${dimsT} mm)` : ''}` : dimsT ? `${dimsT} mm` : stripDot(v.sizeCannot) ? `of indeterminate size (${lc1(stripDot(v.sizeCannot))})` : '';
  const site = v.tumourSite || 'Right ovary';
  const siteWord = site === 'Other (specify)' ? stripDot(v.tumourSiteDetail) || 'adnexa' : site === S.SITE_PERITONEUM ? 'peritoneum' : lc1(site.replace(/, laterality cannot be determined/, '').replace(/tubo-ovarian$/, /^Bilateral/.test(site) ? 'ovaries and fallopian tubes' : 'ovary and fallopian tube'));
  const cyst = arr(v.cutSurface).some((c) => /cyst/i.test(c)) && !arr(v.cutSurface).includes('Solid areas');
  if (site === S.SITE_PERITONEUM) s.push(`The ovaries and fallopian tubes are grossly unremarkable${sizeText ? `; the peritoneal tumour measures ${sizeText}` : ''}.`);
  else s.push(`The ${siteWord} ${/^Bilateral/.test(site) || /tubo-ovarian/.test(site) ? 'are' : 'is'} replaced by a ${cyst ? 'cystic mass' : 'mass'}${sizeText ? ` measuring ${sizeText}` : ''}.`);
  const surf = v.ovarianSurface || 'Not identified';
  s.push(/^Present/.test(surf) ? 'The outer surface bears papillary excrescences.' : /^Cannot/.test(surf) ? 'The outer surface is disrupted and cannot be assessed.' : 'The outer surface is smooth.');
  const cut = arr(v.cutSurface).map((c) => CUT_TEXT[c]).filter(Boolean);
  if (cut.length) s.push(`Cut surface shows ${listJoin(cut)}.`);
  if (stripDot(v.tubeMacro)) s.push(`${uc1(stripDot(v.tubeMacro))}.`);
  else if (/salpingo-oophorectomy|salpingectomy/.test(h.proc)) s.push(`The fallopian tube${h.side === 'bilateral' ? 's are' : ' is'} unremarkable.`);
  if (/hysterectomy/.test(h.proc)) s.push(stripDot(v.uterusMacro) ? `${uc1(stripDot(v.uterusMacro))}.` : 'The uterus and cervix are unremarkable.');
  if (stripDot(v.otherMacro)) s.push(`${uc1(stripDot(v.otherMacro))}.`);
  // Lettered like the frozen-section macro; the engine drops "(A) " again in one-part cases.
  return `(${part.label}) ${s.join(' ')}`;
}

/** Part letter carried into the block numbers ("(B1-6)") when the case has other letters. */
const lettered = (part, ctx) => (ctx?.case?.parts && ctx.case.parts.length > 1) || hasExtraParts(part);

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
  const sites = stripDot(v.nodesSites);
  if (n.examined === null) return { label: 'Regional lymph nodes', value: 'Not submitted' };
  if (n.examined === 0) return { label: 'Regional lymph nodes', value: 'No lymph nodes found' };
  const sub = [
    { label: 'Number examined', value: `${n.examined}${sites ? ` (${sites})` : ''}` },
    { label: 'With metastasis more than 10 mm', value: String(n.macro) },
    { label: 'With metastasis 10 mm or less', value: String(n.micro) },
    { label: 'With isolated tumour cells only (0.2 mm or less)', value: String(n.itc) }
  ];
  const dep = num(v.nodeDepositMm); const nd = num(v.nodeMm);
  if (dep !== null) sub.push({ label: 'Largest metastatic deposit', value: `${fmt(dep)} mm${stripDot(v.nodeDepositSite) ? `, ${stripDot(v.nodeDepositSite)}` : ''}` });
  if (nd !== null) sub.push({ label: 'Largest involved lymph node', value: `${fmt(nd)} mm${stripDot(v.nodeSite) ? `, ${stripDot(v.nodeSite)}` : ''}` });
  if (n.positive && v.nodeEne && !na(v.nodeEne)) sub.push({ label: 'Extranodal extension', value: v.nodeEne });
  return { label: 'Regional lymph nodes', value: `${n.examined} examined; ${n.positive} involved${n.itc && !n.positive ? ' (isolated tumour cells only)' : ''}`, sub };
}

export function metastasisValue(v) {
  const sites = chosen(v.distantMets); const d = stripDot(v.distantDetail);
  if (!sites.length) return arr(v.distantMets).some((s) => /^Cannot/.test(s)) ? `Cannot be determined${d ? ` (${d})` : ''}` : 'Not identified';
  return `${listJoin(sites.map(specify))}${d ? ` (${d})` : ''}`;
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const size = num(v.tumourSizeMm); const dimsT = stripDot(v.tumourDims);
  const sizeText = size !== null ? `${fmt(size)} mm in greatest dimension${dimsT ? ` (${dimsT} mm)` : ''}` : stripDot(v.sizeCannot) ? `Cannot be determined (${lc1(stripDot(v.sizeCannot))})` : 'Cannot be determined';
  const siteDetail = stripDot(v.tumourSiteDetail);
  const inv = chosen(v.otherInvolvement); const invDetail = stripDot(v.otherInvolvementDetail);
  const st = staging(part);
  const grade = gradeOf(v);
  const focusMm = num(v.extrapelvicFocusMm);
  const focusText = v.extrapelvicFocus && !na(v.extrapelvicFocus) ? `${v.extrapelvicFocus}${focusMm !== null ? ` (${fmt(focusMm)} mm)` : ''}${stripDot(v.extrapelvicSite) ? `, ${stripDot(v.extrapelvicSite)}` : ''}` : 'Not applicable';
  const fluid = v.peritonealFluid || 'Not submitted / unknown';
  const fluidText = `${specify(fluid)}${stripDot(v.peritonealFluidDetail) ? ` (${stripDot(v.peritonealFluidDetail)})` : ''}`;
  const pl = v.pleuralFluid || 'Not submitted / unknown';
  const findings = arr(v.additionalFindings).map((s) => (s === 'Other (specify)' ? stripDot(v.additionalFindingsOther) : s)).filter(Boolean);
  const integrity = [['Right ovary', v.integrityRO], ['Left ovary', v.integrityLO], ['Right fallopian tube', v.integrityRT], ['Left fallopian tube', v.integrityLT]].filter(([, s]) => s && !na(s));
  const vm = v.vaginalMargin || 'Not applicable'; const pm = v.parametrialMargin || 'Not applicable';
  const vmm = num(v.vaginalMarginMm); const pmm = num(v.parametrialMarginMm);
  const showMargins = !na(vm) || !na(pm);
  const sections = [
    { heading: 'Specimen and tumour', items: [
      item('Procedure', procedureText(v)),
      v.hysterectomyType && !na(v.hysterectomyType) && v.hysterectomyType !== 'Not specified' ? item('Hysterectomy type', v.hysterectomyType) : null,
      ...(integrity.length ? integrity.map(([o, s]) => item(`Specimen integrity (${lc1(o)})`, s)) : [item('Specimen integrity', 'Not applicable')]),
      stripDot(v.morcellated) ? item('Morcellated specimen', stripDot(v.morcellated)) : null,
      item('Tumour site', `${v.tumourSite === 'Other (specify)' ? siteDetail || 'Other' : specify(v.tumourSite || 'Right ovary')}${v.tumourSite !== 'Other (specify)' && siteDetail ? ` (${siteDetail})` : ''}`),
      item('Ovarian surface involvement', v.ovarianSurface || 'Not identified'),
      item('Fallopian tube surface involvement', v.tubalSurface || 'Not identified'),
      item('Tumour size', sizeText)
    ] },
    { heading: 'Microscopic findings', items: [
      item('Histologic type', histTypeName(v)),
      item('Histologic grade', grade.value),
      { label: 'Tumour histology', para: histologyPara(v) },
      item('Lymphovascular invasion', v.lvi || 'Not identified'),
      v.pni && v.pni !== 'Not identified' ? item('Perineural invasion', v.pni) : null,
      item('p53 immunohistochemistry', p53Value(v)),
      v.implants && BORDERLINE(v) ? item('Implants', `${specify(v.implants)}${stripDot(v.implantsSite) ? ` (${stripDot(v.implantsSite)})` : ''}`) : null,
      item('Largest extrapelvic peritoneal focus', focusText),
      item('Peritoneal / ascitic fluid', fluidText),
      pl !== 'Not submitted / unknown' ? item('Pleural fluid', `${specify(pl)}${stripDot(v.pleuralFluidDetail) ? ` (${stripDot(v.pleuralFluidDetail)})` : ''}`) : null,
      v.neoadjuvant === true ? item('Chemotherapy response score', `${v.crs || 'Cannot be determined'}${stripDot(v.crsSite) ? `, scored on the ${lc1(stripDot(v.crsSite))}` : ''}`) : null,
      item('Other tissue / organ involvement', inv.length ? `${inv.map(specify).join('; ')}${invDetail ? ` (${invDetail})` : ''}` : arr(v.otherInvolvement).some((s) => /^Cannot/.test(s)) ? `Cannot be determined${invDetail ? ` (${invDetail})` : ''}` : 'Not identified')
    ] },
    showMargins ? { heading: 'Margins', items: [
      item('Ectocervical / vaginal cuff margin', vm === 'Uninvolved by carcinoma' && vmm !== null ? `Uninvolved by carcinoma (closest distance ${fmt(vmm)} mm)` : vm),
      item('Parametrial / paracervical margin', pm === 'Uninvolved by carcinoma' && pmm !== null ? `Uninvolved by carcinoma (closest distance ${fmt(pmm)} mm)` : pm)
    ] } : null,
    { heading: 'Lymph nodes', items: [nodesItem(v)] },
    { heading: 'Distant metastasis', items: [item('Distant metastasis', metastasisValue(v))] },
    ctx?.options?.printPTNM ? { heading: `Pathological stage (${st.edition})`, items: [
      { label: 'pTNM', value: `${st.tnm}${st.overridden ? ` [pathologist override; derived ${st.derived.T}/${st.derived.N}${st.derived.M !== 'M-' ? `/${st.derived.M}` : ''}${(v.tnmOverrideReason || '').trim() ? ` - ${stripDot(v.tnmOverrideReason)}` : ''}]` : ''}`,
        sub: stageLine(st) ? [{ label: stageLine(st).split(': ')[0], value: stageLine(st).split(': ').slice(1).join(': ') }] : [] }
    ] } : null,
    { heading: 'Additional findings', items: [
      ...(findings.length ? findings.map((f) => ({ text: f })) : [{ text: 'None' }]),
      stripDot(v.ancillary) ? item('Ancillary studies', stripDot(v.ancillary)) : null,
      stripDot(v.additionalNotes) ? item('Additional notes', stripDot(v.additionalNotes)) : null
    ] }
  ].filter(Boolean);
  const heading = (ctx?.case?.parts && ctx.case.parts.length > 1) || hasExtraParts(part) ? `(${part.label}) ${specimenName(part)}` : '';
  return renderSynoptic(sections, heading);
}

// ---------- diagnosis ----------

export function diagnosis(part, ctx) {
  const v = part.values;
  const h = headParts(v);
  const typed = stripDot(v.specimenName);
  const head = `(${part.label}) ${typed ? upperHead(typed) : `${h.organ.toUpperCase()}, ${h.side ? `${h.side}, ` : ''}${h.proc}`}`;
  const grade = gradeOf(v).short;
  const prim = S.primarySite(v);
  const size = num(v.tumourSizeMm);
  const cap = S.capsule(v);
  const first = [`${histTypeName(v).toUpperCase()}${grade ? `, ${grade}` : ''}`];
  if (!BORDERLINE(v) && v.tumourSite !== S.SITE_PERITONEUM && (prim !== 'ovary' || /tubo-ovarian|fallopian/i.test(v.tumourSite || ''))) first.push(PRIMARY_WORD[prim]);
  else if (v.tumourSite === S.SITE_PERITONEUM) first.push('primary peritoneal');
  if (/^Bilateral/.test(v.tumourSite || '')) first.push('bilateral');
  if (size !== null) first.push(`${fmt(size)} mm`);
  if (cap.surface) first.push('ovarian surface involved');
  else if (cap.spill) first.push('capsule ruptured intraoperatively');
  else if (cap.ruptured) first.push([v.integrityRO, v.integrityLO, v.integrityRT, v.integrityLT].some((s) => /Fragmented/.test(s || '')) ? 'received fragmented' : 'capsule ruptured');
  else if (v.tumourSite !== S.SITE_PERITONEUM && !/hysterectomy/.test(h.proc)) first.push('capsule intact');
  const local = [];
  if (BORDERLINE(v) && v.implants) local.push(/^Present/.test(v.implants) ? `${lc1(specify(v.implants).replace(/^Present, /, ''))} implants${stripDot(v.implantsSite) ? `, ${stripDot(v.implantsSite)}` : ''}` : v.implants === 'Not identified' ? 'no implants identified' : v.implants === 'Not sampled' ? 'no implants identified (peritoneal biopsies not submitted)' : v.implants === 'Indeterminate' ? 'implants of indeterminate type' : '');
  const inv = chosen(v.otherInvolvement);
  if (inv.length) local.push(`involving the ${listJoin(inv.map((s) => lc1(specify(s))))}`);
  const focus = S.extrapelvicFocus(v);
  if (focus) local.push(focus === 'micro' ? 'microscopic extrapelvic peritoneal disease' : `largest extrapelvic peritoneal focus ${num(v.extrapelvicFocusMm) !== null ? `${fmt(num(v.extrapelvicFocusMm))} mm` : focus === 'le2' ? '2 cm or less' : 'more than 2 cm'}`);
  if (v.peritonealFluid === S.FLUID_MALIGNANT) local.push('peritoneal fluid positive for malignant cells');
  if (v.lvi === 'Present') local.push('lymphovascular invasion present');
  if (v.vaginalMargin === 'Involved by carcinoma') local.push('vaginal cuff margin involved');
  if (v.parametrialMargin === 'Involved by carcinoma') local.push('parametrial margin involved');
  const spread = [];
  const n = S.nodes(v);
  if (n.examined) spread.push(`${n.positive} of ${n.examined} regional lymph node${n.examined === 1 ? '' : 's'} involved${n.itc && !n.positive ? ' (isolated tumour cells only)' : ''}`);
  const sites = chosen(v.distantMets);
  if (sites.length) spread.push(`distant metastasis: ${listJoin(sites.map((x) => lc1(specify(x))))}`);
  if (v.neoadjuvant === true && v.crs) spread.push(`chemotherapy response score ${v.crs.replace(/\s*\(.*$/, '')}`);
  const stage = [];
  if (ctx?.options?.printPTNM) {
    const st = staging(part);
    let s = `${st.tnm} (${st.edition})`;
    if (st.stage) s += `, stage ${st.stage}${st.M === 'M-' ? ' (if cM0)' : ''}`;
    stage.push(s);
  }
  const clauses = [`${first.filter(Boolean).join(', ')}; see synoptic report`, ...[local, spread, stage].map((g) => g.filter(Boolean).join('; '))];
  const main = renderDiagnosis(head, clauses);
  const others = otherParts(v).map((p) => `(${p.label}) ${upperHead(p.specimen)} - ${findingText(p.finding, v)}`);
  return [main, ...others].join('\n\n');
}

// ---------- frozen link ----------

const FROZEN_TYPE = { 'serous borderline tumour': 'Serous borderline tumour', 'mucinous borderline tumour': 'Mucinous borderline tumour', 'seromucinous borderline tumour': 'Seromucinous borderline tumour', 'high-grade serous carcinoma': 'High-grade serous carcinoma', 'low-grade serous carcinoma': 'Low-grade serous carcinoma', 'endometrioid carcinoma': 'Endometrioid carcinoma', 'clear cell carcinoma': 'Clear cell carcinoma', 'mucinous carcinoma': 'Mucinous adenocarcinoma', carcinosarcoma: 'Carcinosarcoma (malignant mixed Mullerian tumour)', 'adult granulosa cell tumour': 'Granulosa cell tumour, adult type', dysgerminoma: 'Dysgerminoma', 'yolk sac tumour': 'Yolk sac tumour', 'immature teratoma': 'Immature teratoma' };

/**
 * Map a frozen-section part's values (frozen_section template, Ovarian / adnexal mass scenario) to a
 * patch of synoptic values. Pure; returns {} when the frozen part is not an ovarian scenario.
 */
export function prefillFromFrozen(fv) {
  if (!fv || fv.scenario !== 'Ovarian / adnexal mass') return {};
  const side = fv.ovSide || '';
  const s = side.toLowerCase();
  const spec = fv.ovSpecimen || '';
  const out = {};
  if (spec === 'Salpingo-oophorectomy') out.procedures = [side === 'Bilateral' ? 'Bilateral salpingo-oophorectomy' : side ? `${side} salpingo-oophorectomy` : 'Salpingo-oophorectomy, side not specified'];
  else if (spec === 'Oophorectomy') out.procedures = [side && side !== 'Bilateral' ? `${side} oophorectomy` : 'Oophorectomy, side not specified'];
  else if (spec === 'Ovarian cystectomy') out.procedures = [side && side !== 'Bilateral' ? `${side} ovarian cystectomy` : 'Other (specify)'];
  else if (spec) { out.procedures = ['Other (specify)']; out.procedureOther = `${s ? `${s} ` : ''}${lc1(spec.replace(/, NOS$/, ''))}`; }
  if (side) out.tumourSite = side === 'Bilateral' ? 'Bilateral ovaries' : `${side} ovary`;
  const rec = fv.ovReceived || 'Intact';
  const ovInteg = /^Ruptured/.test(rec) ? 'Capsule ruptured, preoperative or unknown timing' : /^Fragmented/.test(rec) ? 'Fragmented' : /^Opened/.test(rec) ? 'Capsule ruptured, intraoperative (surgical spill)' : 'Capsule intact';
  const withTube = spec === 'Salpingo-oophorectomy';
  out.integrityRO = side === 'Right' || side === 'Bilateral' ? ovInteg : 'Not applicable';
  out.integrityLO = side === 'Left' || side === 'Bilateral' ? ovInteg : 'Not applicable';
  out.integrityRT = withTube && (side === 'Right' || side === 'Bilateral') ? 'Serosa intact' : 'Not applicable';
  out.integrityLT = withTube && (side === 'Left' || side === 'Bilateral') ? 'Serosa intact' : 'Not applicable';
  if (num(fv.ovSizeMm) !== null) out.tumourSizeMm = String(fv.ovSizeMm).trim();
  if (num(fv.ovWeightG) !== null) out.weight = String(fv.ovWeightG).trim();
  out.ovarianSurface = fv.ovSurface === 'Excrescences or papillary projections' ? `Present, ${s || 'right'}` : fv.ovSurface === 'Not assessable' ? 'Cannot be determined' : 'Not identified';
  if (Array.isArray(fv.ovCut) && fv.ovCut.length) out.cutSurface = [...fv.ovCut];
  const type = FROZEN_TYPE[(fv.ovType || '').toLowerCase()];
  if (type) out.histType = type;
  return out;
}

// ---------- validation + flags ----------

export function validate(part) {
  const v = part.values;
  const out = [];
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  const info = (m) => out.push({ level: 'info', message: m });
  const t = v.histType || '';
  if (/\(specify/.test(t) && !stripDot(v.histTypeOther)) err('Histologic type needs the types / percentages or the specified type.');
  if (num(v.tumourSizeMm) === null && !stripDot(v.tumourDims) && !stripDot(v.sizeCannot)) warn('Tumour size not recorded.');
  const st = staging(part);
  for (const n of st.notes) if (!/overridden/.test(n)) warn(n);
  if (v.tumourSite === S.SITE_PERITONEUM || v.primarySite === 'Peritoneum') info('Primary peritoneal carcinoma: stage cannot be I; the ovaries and tubes must be grossly normal and microscopically free or minimally involved (WHO 5th).');
  const sug = suggestedPrimary(v);
  const picked = v.primarySite && v.primarySite !== S.PRIMARY_DERIVE ? S.primarySite(v) : null;
  if (sug && picked && sug !== picked) warn(`Primary site: the WHO 5th rule suggests ${PRIMARY_WORD[sug]} (${sug === 'tube' ? 'STIC or tubal mucosal carcinoma present' : sug === 'ovary' ? 'tubes examined entirely and free' : 'both involved without STIC'}); ${PRIMARY_WORD[picked]} is selected.`);
  if (/^High-grade serous/.test(t) && !sug && !picked) info('High-grade serous carcinoma: state the STIC status and tubal mucosal involvement - the primary-site assignment (tubal / ovarian / tubo-ovarian) depends on them; the site is undesignated on the current entries.');
  if (MUCINOUS_CA(v)) info('Mucinous carcinoma: exclude a metastasis (bilateral, less than 100 mm, surface involvement, nodular or infiltrative growth favour metastasis; consider CK7, CK20, CDX2, SATB2, PAX8).');
  if (/^(Mucinous borderline|Mucinous adenocarcinoma)/.test(t) && /^Bilateral/.test(v.tumourSite || '')) warn('Bilateral mucinous tumour: strongly consider a metastasis from a gastrointestinal or other primary.');
  if (/preoperative or unknown timing/.test([v.integrityRO, v.integrityLO, v.integrityRT, v.integrityLT].join('|'))) info('Capsule rupture of unknown timing is staged pT1c2 / IC2; if the operative note records rupture at surgery, choose the intraoperative option (pT1c1 / IC1).');
  if (S.capsule(v).fluid && !/^T1/.test(st.T)) info('Positive peritoneal fluid is recorded; it only sets the stage (pT1c3 / IC3) when the tumour is confined to the ovaries or tubes.');
  if (S.capsule(v).fluid && BORDERLINE(v)) info('Borderline tumour with positive fluid: IC3 applies only when malignant cells are stated; report atypical or borderline tumour cells if that is what is seen.');
  if (/^Present/.test(v.implants || '') && !BORDERLINE(v)) err('Implants are recorded but the histologic type is not a serous / seromucinous borderline tumour.');
  if (/^CRS[123]/.test(v.crs || '') && v.neoadjuvant !== true) warn('A chemotherapy response score is entered but the neoadjuvant box is unticked (y prefix and CRS row).');
  if (num(v.nodeDepositMm) !== null && num(v.nodeMm) !== null && num(v.nodeDepositMm) > num(v.nodeMm)) err('Lymph nodes: the largest deposit is larger than the largest involved node.');
  if (S.involvement(v).extrapelvic && (na(v.extrapelvicFocus) || !v.extrapelvicFocus) && num(v.extrapelvicFocusMm) === null) warn('Extrapelvic peritoneal involvement is recorded but the size of the largest focus is not: pT3a/b/c cannot be assigned.');
  if (S.involvement(v).capsuleT3c && chosen(v.distantMets).some((s) => /parenchyma/.test(s))) info('Liver / splenic capsule involvement alone is pT3c (IIIC); parenchymal metastasis is pM1b (IVB). Both are ticked - confirm the parenchymal deposit.');
  if (BORDERLINE(v)) {
    if (/^Present, invasive/i.test(v.implants || '')) err('"Invasive implant" is low-grade serous carcinoma by WHO 5th; reclassify the histologic type.');
    if (/Serous borderline|Seromucinous/.test(t) && (!v.implants || v.implants === 'Not sampled')) info('Borderline tumour: peritoneal biopsies / omentum not sampled - implants cannot be assessed.');
  }
  if (v.neoadjuvant === true && !/^High-grade serous/.test(t)) info('Chemotherapy response score is validated for high-grade serous carcinoma only.');
  if (v.neoadjuvant !== true && /^High-grade serous/.test(t) && /interval|neoadjuvant|NACT/i.test(String(v.additionalNotes || ''))) warn('Notes mention neoadjuvant therapy / interval debulking but the neoadjuvant box is unticked (y prefix and CRS).');
  const n = S.nodes(v);
  if (n.examined !== null && n.positive + n.itc > n.examined) err('Lymph nodes: involved plus ITC nodes exceed the number examined.');
  if (n.positive && num(v.nodeDepositMm) === null) warn('Lymph nodes: record the largest metastatic deposit (10 mm boundary decides pN1a versus pN1b).');
  if (num(v.nodeDepositMm) !== null && num(v.nodeDepositMm) <= 0.2 && n.positive) warn('A largest deposit of 0.2 mm or less is isolated tumour cells (pN0(i+)), not a positive node.');
  if (/hysterectomy/.test(headParts(v).proc) && na(v.vaginalMargin) && na(v.parametrialMargin)) info('Hysterectomy specimen: margins are recorded as not applicable.');
  for (const p of otherParts(v)) if (!p.finding) warn(`Part ${p.label}: no finding given - the diagnosis line prints "SEE SYNOPTIC REPORT".`);
  const labels = otherParts(v).map((p) => p.label);
  if (labels.includes(part.label)) err(`Other parts: letter ${part.label} is this part.`);
  if (new Set(labels).size !== labels.length) err('Other parts: a letter is repeated.');
  if (stripDot(v.tnmOverride) && !st.overridden) err(`pTNM override "${stripDot(v.tnmOverride)}" could not be parsed.`);
  for (const line of S.referenceLines(v)) info(line);
  if (st.stage) info(`AJCC 8th stage group (${st.M === 'M-' ? 'if cM0' : 'pM recorded'}): ${st.stage}${st.overridden ? ' (from the override)' : ''}.`);
  return out;
}

export function flags(parts) {
  const out = [];
  for (const p of parts) {
    const v = p.values;
    if (/^High-grade serous/.test(v.histType || '') && (!v.p53 || v.p53 === 'Not performed')) out.push(`(${p.label}) p53 not recorded for high-grade serous carcinoma.`);
    if (stripDot(v.ancillary) && /requested|pending|to follow/i.test(v.ancillary)) out.push(`(${p.label}) Ancillary result pending: ${stripDot(v.ancillary)}.`);
  }
  return out;
}

export default { specimenName, specimens, macro, blockKey, synoptic, diagnosis, validate, flags, staging, hasExtraParts };
