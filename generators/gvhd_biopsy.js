// GI and oral graft-versus-host disease biopsy. Card: docs/roadmap.md "GI and oral graft-versus-host disease
// biopsy" (user request and pulled by the user 2026-10-14, Phase 71); spec docs/specs/gvhd-biopsy.md; grounding
// docs/reference/gvhd_biopsy-morphology.md. Cutaneous GVHD stays on the Dermatoses form.
//
// NIH 2014 Consensus Pathology Working Group (Shulman et al., Biol Blood Marrow Transplant 2015; PMC4359636):
// three final categories (Table 2) - Not GVHD, Possible GVHD, Likely GVHD, "likely" taking in the former
// "consistent with" and "unequivocal" - and organ criteria (Table 1): crypt apoptosis in the gut ("Variable
// apoptotic criteria (>=1/piece) in crypts"); in the oral mucosa "Lichenoid interface lymphocytes with
// infiltration of mucosa (exocytosis) and variable apoptosis"; in minor salivary glands a periductal lymphocytic
// infiltrate damaging the intralobular ducts, periductal fibroplasia and acinar destruction, the specific
// criterion of chronic GVHD. In the gut "histological changes are not helpful in distinguishing chronic GVHD from
// acute GVHD", so a GI part names no phase unless one is chosen; a salivary gland part with the changes reads as
// chronic.
//
// Gut grade 1-4: the four-tier table of Nat Rev Gastroenterol Hepatol 2018 (PMC6240460) and Lerner's grades on
// PathologyOutlines (colongvhd): 1 apoptosis without crypt loss, 2 individual crypt loss, 3 contiguous crypt loss,
// 4 extensive crypt loss with denudation. Small bowel and colon only. It prints "(grade 2)" with Likely GVHD,
// as the Dermatoses form prints its Lerner grade.
//
// House wording (biopsy file 2021-2026, aggregate only: fewer than 10 GI parts name GVHD, no oral one): the head
// "ASCENDING COLON, biopsy:" and the clause under it; the microscopy "Serial sections show a piece of colonic
// mucosa ...", apoptosis "within the basal cryptal epithelium", crypt "dropout", "No viral cytopathic change or
// granuloma is seen", "Please correlate with clinical findings." The qualifier and the hyphenated name follow the
// Dermatoses form ("likely GRAFT-VERSUS-HOST DISEASE"), so the skin and gut parts of one patient read alike.
// The oral wording follows the oral biopsy form ("band-like lymphocytic infiltrate at the epithelium-lamina
// propria interface"; LICHENOID MUCOSITIS).
//
// Thresholds, the serial-section count, the 20-day conditioning window, the five-lobule rule and the eosinophil
// and mycophenolate note sit in the Checks and are never printed (docs/new-template-brief.md §3.2).
//
// Blocks: specimenName, organPhrase, microscopy (one paragraph per part), diagnosis (specimen line ending ":" and
// one "- " clause per finding), validate. Wording is protected by tests/gvhd_biopsy.test.js.

import { stripDot, checks } from './_house.js';

// ---------- sites ----------

export const OTHER_SITE = 'Other (type the site)';
const GI_SITES = {
  oesophagus: ['Oesophagus'],
  stomach: ['Stomach', 'Gastric antrum', 'Gastric body'],
  small: ['Duodenum', 'Jejunum', 'Ileum', 'Terminal ileum'],
  colon: ['Caecum', 'Ascending colon', 'Hepatic flexure', 'Transverse colon', 'Splenic flexure', 'Descending colon', 'Sigmoid colon', 'Rectosigmoid', 'Rectum', 'Colon']
};
const ORAL_SITES = ['Buccal mucosa', 'Lip', 'Tongue', 'Gingiva', 'Hard palate', 'Soft palate', 'Palate', 'Floor of mouth', 'Oral mucosa'];
export const SITES = [...Object.values(GI_SITES).flat(), ...ORAL_SITES, OTHER_SITE];
/** The region select for a typed site: label -> key. */
export const REGIONS = { Oesophagus: 'oesophagus', Stomach: 'stomach', 'Small bowel': 'small', 'Colon or rectum': 'colon', 'Oral mucosa': 'oral' };
export const REGION_LABELS = Object.keys(REGIONS);
const REGION_OF = Object.fromEntries([
  ...Object.entries(GI_SITES).flatMap(([r, sites]) => sites.map((s) => [s, r])),
  ...ORAL_SITES.map((s) => [s, 'oral'])
]);
/** The site options of the given region keys, for the schema's showIf rules. */
export const sitesOf = (...regions) => SITES.filter((s) => regions.includes(REGION_OF[s]));

/** 'oesophagus' | 'stomach' | 'small' | 'colon' | 'oral'. */
export function regionOf(v) {
  if (v.site === OTHER_SITE) return REGIONS[v.region] || 'colon';
  return REGION_OF[v.site] || 'colon';
}
export const isGut = (v) => regionOf(v) !== 'oral';
const gradable = (v) => ['small', 'colon'].includes(regionOf(v));
const hasGlands = (v) => ['stomach', 'small', 'colon'].includes(regionOf(v));

const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const lower1 = (s) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const has = (x, item) => arr(x).includes(item);
const list = (items) => {
  const a = items.filter(Boolean);
  return a.length <= 1 ? a[0] || '' : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const count = (x) => {
  const n = Number(String(x ?? '').trim());
  return Number.isInteger(n) && n > 0 ? n : null;
};
const inWords = (n) => (n <= 10 ? WORDS[n] : String(n));

const siteName = (v) => (v.site === OTHER_SITE ? cap1(stripDot(v.siteOther)) || 'Biopsy site' : v.site || 'Colon');
const detailOf = (v) => stripDot(v.detail).replace(/\s+/g, ' ').trim();
const procWord = (v) => String(v.procedure || 'Biopsy').toLowerCase();

export function specimenName(part) {
  const v = part.values;
  const detail = detailOf(v);
  return [siteName(v), detail ? lower1(detail) : '', procWord(v)].filter(Boolean).join(', ');
}

/** "SIGMOID COLON, biopsy"; the detail in lower case unless it is an abbreviation ("DUODENUM, D2, biopsy"). */
export function organPhrase(part) {
  const v = part.values;
  const detail = detailOf(v);
  return [siteName(v).toUpperCase(), detail ? lower1(detail) : '', procWord(v)].filter(Boolean).join(', ');
}

// ---------- findings ----------

export const APOPTOSIS = ['None seen', 'Isolated', 'At least one per piece', 'Numerous', 'Exploding crypts'];
export const CRYPT_LOSS = ['None', 'Individual crypts', 'Contiguous crypts', 'Extensive, with denudation'];
export const CRYPT_CHANGES = ['Withering', 'Regenerative epithelial changes', 'Architectural distortion'];
export const PANETH = ['Not stated', 'Preserved', 'Reduced', 'Absent', 'Paneth cell metaplasia'];
export const GUT_FEATURES = ['Cryptitis', 'Crypt abscesses', 'Erosion', 'Ulceration', 'Lamina propria fibrosis', 'Submucosal fibrosis'];
export const OESO_FEATURES = ['Lymphocytic exocytosis', 'Epithelial atrophy', 'Desquamation', 'Ulceration', 'Submucosal fibrosis'];
export const LAMINA_PROPRIA = ['Sparse', 'Mild', 'Moderate', 'Marked'];
export const ORAL_FEATURES = ['Lichenoid interface inflammation', 'Lymphocytic exocytosis', 'Apoptotic keratinocytes', 'Satellitosis', 'Basal vacuolar change', 'Epithelial atrophy', 'Ulceration'];
export const SALIVARY_FEATURES = ['Periductal lymphocytic inflammation', 'Plasma cells in the infiltrate', 'Exocytosis into ducts', 'Exocytosis into acini', 'Damaged intralobular ducts', 'Acinar loss', 'Periductal fibrosis'];
export const VIRAL = ['Not seen', 'Cytomegalovirus inclusions', 'Other viral cytopathic change'];
export const CMV = ['Not performed', 'Negative', 'Positive, near the apoptotic cells', 'Positive, away from the apoptotic cells'];
export const DIFFERENTIAL = ['CMV-related injury', 'Mycophenolate effect', 'Other drug effect', 'Other infection', 'Conditioning effect'];
export const NIH = ['Likely GVHD', 'Possible GVHD', 'Not GVHD'];
export const PHASES = ['Not stated', 'Acute', 'Chronic'];
export const GRADES = ['Auto', 'Not graded', '1', '2', '3', '4'];

const apoptotic = (v) => !!v.apoptosis && v.apoptosis !== 'None seen';
const cryptLoss = (v) => hasGlands(v) && !!v.cryptLoss && v.cryptLoss !== 'None';
const oralHit = (v) => regionOf(v) === 'oral' && arr(v.oralFeatures).length > 0;
const salivaryIn = (v) => regionOf(v) === 'oral' && v.salivary === 'Included';
const sialadenitis = (v) => salivaryIn(v) && SALIVARY_FEATURES.some((f) => has(v.salivaryFeatures, f));
const cmvPositive = (v) => String(v.cmv || '').startsWith('Positive') || v.viral === 'Cytomegalovirus inclusions';
export const nihOf = (v) => (NIH.includes(v.nih) ? v.nih : 'Likely GVHD');

/** The grade the crypt findings read: '' when the site is not graded or nothing is recorded. */
export function autoGrade(v) {
  if (!gradable(v)) return '';
  if (v.cryptLoss === 'Extensive, with denudation') return '4';
  if (v.cryptLoss === 'Contiguous crypts') return '3';
  if (v.cryptLoss === 'Individual crypts') return '2';
  return apoptotic(v) ? '1' : '';
}
/** The printed grade: a chosen grade, else the auto grade; '' for Not graded and for the upper GI tract and mouth. */
export function gradeOf(v) {
  if (!gradable(v) || v.grade === 'Not graded') return '';
  if (v.grade && v.grade !== 'Auto') return v.grade;
  return autoGrade(v);
}

// ---------- microscopy ----------

const MUCOSA = {
  Oesophagus: 'oesophageal squamous mucosa', Stomach: 'gastric mucosa', 'Gastric antrum': 'gastric antral mucosa', 'Gastric body': 'gastric body mucosa',
  Duodenum: 'duodenal mucosa', Jejunum: 'jejunal mucosa', Ileum: 'ileal mucosa', 'Terminal ileum': 'ileal mucosa', Rectum: 'rectal mucosa'
};
const REGION_MUCOSA = { oesophagus: 'oesophageal squamous mucosa', stomach: 'gastric mucosa', small: 'small intestinal mucosa', colon: 'colonic mucosa', oral: 'squamous mucosa' };
const mucosaOf = (v) => MUCOSA[v.site] || REGION_MUCOSA[regionOf(v)];
const unitOf = (v) => (regionOf(v) === 'stomach' ? 'gland' : 'crypt');

function opening(v) {
  const n = count(v.pieces);
  const pieces = n === 1 ? 'a piece' : n ? `${inWords(n)} pieces` : 'pieces';
  const glands = salivaryIn(v) ? ' with underlying minor salivary glands' : '';
  return `Serial sections show ${pieces} of ${mucosaOf(v)}${glands}.`;
}

const WHERE = {
  small: 'the basal crypt epithelium', colon: 'the basal crypt epithelium',
  stomach: 'the glandular epithelium of the neck region', oesophagus: 'the basal layer of the squamous epithelium'
};
function apoptosisSentences(v) {
  const r = regionOf(v);
  const where = WHERE[r];
  const out = [];
  const a = v.apoptosis;
  if (a === 'Isolated') out.push(`Occasional apoptotic bodies are seen in ${where}.`);
  else if (a === 'At least one per piece') out.push(`Apoptotic bodies are seen in ${where} of every piece.`);
  else if (a === 'Numerous' || (a === 'Exploding crypts' && r === 'oesophagus')) out.push(`Numerous apoptotic bodies are seen in ${where}.`);
  else if (a === 'Exploding crypts') {
    // "Exploding crypts" is the bowel term; a gastric biopsy is described without it.
    const named = r === 'stomach' ? '' : ' (exploding crypts)';
    out.push(`Numerous apoptotic bodies are seen in ${where}, with ${unitOf(v)}s containing clusters of apoptotic bodies and karyorrhectic debris${named}.`);
  }
  if (v.superficial) out.push(apoptotic(v) ? 'Apoptotic debris is also seen in the surface epithelium and lamina propria.' : 'Apoptotic debris is confined to the surface epithelium and lamina propria.');
  if (!apoptotic(v) && !v.superficial) out.push(r === 'oesophagus' ? 'No basal apoptosis is seen.' : `No ${unitOf(v)} apoptosis is seen.`);
  return out;
}

function cryptSentences(v) {
  if (!hasGlands(v)) return [];
  const u = unitOf(v);
  const out = [];
  if (v.cryptLoss === 'Individual crypts') out.push(`There is dropout of individual ${u}s.`);
  else if (v.cryptLoss === 'Contiguous crypts') out.push(`There is dropout of contiguous ${u}s.`);
  else if (v.cryptLoss === 'Extensive, with denudation') out.push(`There is extensive ${u} dropout, with denudation of the surface epithelium.`);
  const changes = CRYPT_CHANGES.filter((c) => has(v.cryptChanges, c)).map((c) => c.toLowerCase());
  if (changes.length) out.push(`The ${cryptLoss(v) ? 'remaining ' : ''}${u}s show ${list(changes)}.`);
  if (gradable(v)) {
    const p = { Preserved: 'Paneth cells are preserved.', Reduced: 'Paneth cells are reduced in number.', Absent: 'Paneth cells are absent.', 'Paneth cell metaplasia': 'Paneth cell metaplasia is seen.' }[v.paneth];
    if (p) out.push(p);
  }
  return out;
}

const GUT_WORDS = { Cryptitis: 'cryptitis', 'Crypt abscesses': 'crypt abscess formation', Erosion: 'surface erosion', Ulceration: 'ulceration', 'Lamina propria fibrosis': 'lamina propria fibrosis', 'Submucosal fibrosis': 'submucosal fibrosis' };
const OESO_WORDS = { 'Lymphocytic exocytosis': 'lymphocytic exocytosis into the epithelium', 'Epithelial atrophy': 'epithelial atrophy', Desquamation: 'desquamation of the superficial epithelium', Ulceration: 'ulceration', 'Submucosal fibrosis': 'submucosal fibrosis' };
function featureSentence(v) {
  const words = regionOf(v) === 'oesophagus'
    ? OESO_FEATURES.filter((f) => has(v.oesoFeatures, f)).map((f) => OESO_WORDS[f])
    : GUT_FEATURES.filter((f) => has(v.gutFeatures, f)).map((f) => GUT_WORDS[f]);
  return words.length ? `There is ${list(words)}.` : '';
}

function laminaPropriaSentences(v) {
  const out = [];
  if (hasGlands(v)) {
    const lp = LAMINA_PROPRIA.includes(v.laminaPropria) ? v.laminaPropria : 'Sparse';
    out.push(lp === 'Sparse' ? 'The lamina propria contains a sparse inflammatory infiltrate.'
      : `The lamina propria shows a ${lp.toLowerCase()} chronic inflammatory infiltrate of lymphocytes and plasma cells.`);
  }
  if (v.eosinophils === 'Increased') out.push('Eosinophils are increased.');
  else if (v.eosinophils === 'Inconspicuous') out.push('Eosinophils are inconspicuous.');
  return out;
}

function oralSentences(v) {
  const f = arr(v.oralFeatures);
  const out = [];
  const lichenoid = f.includes('Lichenoid interface inflammation');
  const exo = f.includes('Lymphocytic exocytosis');
  if (lichenoid) out.push(`There is a band-like lymphocytic infiltrate at the epithelium-lamina propria interface${exo ? ', with lymphocytic exocytosis into the epithelium' : ''}.`);
  else if (exo) out.push('There is lymphocytic exocytosis into the epithelium.');
  if (f.includes('Basal vacuolar change')) out.push('There is basal vacuolar change.');
  const sat = f.includes('Satellitosis');
  if (f.includes('Apoptotic keratinocytes') || sat) out.push(`Apoptotic keratinocytes are seen in the basal and parabasal layers${sat ? ', some with adjacent lymphocytes (satellitosis)' : ''}.`);
  if (f.includes('Epithelial atrophy')) out.push('The epithelium is atrophic.');
  if (f.includes('Ulceration')) out.push('There is surface ulceration.');
  if (!out.length) out.push('There is no interface inflammation or apoptosis.');
  return out;
}

function salivarySentences(v) {
  if (!salivaryIn(v)) return [];
  const n = count(v.lobules);
  const out = [n ? `${cap1(inWords(n))} ${n === 1 ? 'lobule' : 'lobules'} of minor salivary gland ${n === 1 ? 'is' : 'are'} present.` : 'Lobules of minor salivary gland are present.'];
  const f = arr(v.salivaryFeatures);
  const plasma = f.includes('Plasma cells in the infiltrate');
  const base = f.includes('Periductal lymphocytic inflammation')
    ? `periductal lymphocytic inflammation${plasma ? ' with plasma cells' : ''}`
    : plasma ? 'a mixed lymphocytic and plasmacytic infiltrate' : '';
  const ducts = f.includes('Exocytosis into ducts');
  const acini = f.includes('Exocytosis into acini');
  const exo = ducts && acini ? 'lymphocytic exocytosis into the ducts and acini' : ducts ? 'lymphocytic exocytosis into the intralobular ducts' : acini ? 'lymphocytic exocytosis into the acini' : '';
  const rest = [base, exo, f.includes('Damaged intralobular ducts') ? 'damage to the intralobular ducts' : '', f.includes('Acinar loss') ? 'acinar loss' : '', f.includes('Periductal fibrosis') ? 'periductal fibrosis' : ''];
  const pronoun = n === 1 ? 'It shows' : 'They show';
  out.push(rest.some(Boolean) ? `${pronoun} ${list(rest)}.` : `${pronoun} no significant inflammation.`);
  return out;
}

function infectionSentences(v) {
  const out = [];
  const granuloma = v.granuloma === 'Present';
  if (v.viral === 'Cytomegalovirus inclusions') out.push('Enlarged cells with cytomegalovirus inclusions are seen.');
  else if (v.viral === 'Other viral cytopathic change') out.push('Viral cytopathic change is seen.');
  else out.push(granuloma ? 'No viral cytopathic change is seen.' : 'No viral cytopathic change or granuloma is seen.');
  if (granuloma) out.push('Granulomas are present.');
  const cmv = {
    Negative: 'Immunohistochemistry for cytomegalovirus (CMV) is negative.',
    'Positive, near the apoptotic cells': 'Immunohistochemistry for cytomegalovirus (CMV) highlights infected cells close to the apoptotic epithelial cells.',
    'Positive, away from the apoptotic cells': 'Immunohistochemistry for cytomegalovirus (CMV) highlights infected cells, which are not associated with the apoptotic epithelial cells.'
  }[v.cmv];
  if (cmv) out.push(cmv);
  const other = stripDot(v.otherStains);
  if (other) out.push(`${cap1(other)}.`);
  return out;
}

/** "graft-versus-host disease", "chronic graft-versus-host disease": the phase chosen, else chronic for salivary changes. */
function diseaseOf(v) {
  const phase = v.phase && v.phase !== 'Not stated' ? v.phase : sialadenitis(v) ? 'Chronic' : '';
  return `${phase ? `${phase.toLowerCase()} ` : ''}graft-versus-host disease`;
}

function overallSentence(v) {
  const nih = nihOf(v);
  if (nih === 'Not GVHD') return 'There is no evidence of graft-versus-host disease.';
  const grade = nih === 'Likely GVHD' ? gradeOf(v) : '';
  return `The overall features ${nih === 'Possible GVHD' ? 'may' : 'likely'} represent ${diseaseOf(v)}${grade ? ` (grade ${grade})` : ''}.`;
}

const DIFF_WORDS = {
  'CMV-related injury': 'cytomegalovirus-related injury', 'Mycophenolate effect': 'mycophenolate-related injury',
  'Other drug effect': 'other drug-related injury', 'Other infection': 'other infection', 'Conditioning effect': 'injury from the conditioning regimen'
};
/** The differential as one phrase, from the ticked options and the typed text. */
export function differentialOf(v) {
  const words = DIFFERENTIAL.filter((d) => has(v.differential, d)).map((d) => DIFF_WORDS[d]);
  // A lone "other" reads without the word: "drug-related injury", "infection".
  if (words.length === 1) words[0] = words[0].replace(/^other /, '');
  const typed = stripDot(v.differentialOther);
  if (typed) words.push(typed);
  return list(words);
}

export function microscopy(part) {
  const v = part.values;
  const s = [opening(v)];
  if (isGut(v)) {
    s.push(...apoptosisSentences(v), ...cryptSentences(v));
    const feat = featureSentence(v);
    if (feat) s.push(feat);
    s.push(...laminaPropriaSentences(v));
  } else s.push(...oralSentences(v), ...salivarySentences(v));
  s.push(...infectionSentences(v));
  const extra = stripDot(v.additionalNotes);
  if (extra) s.push(`${cap1(extra)}.`);
  s.push(overallSentence(v));
  const ddx = differentialOf(v);
  if (ddx) s.push(`The differential diagnosis includes ${ddx}.`);
  if (v.noDysplasia !== false) s.push('There is no evidence of dysplasia or malignancy.');
  if (v.correlate !== false) s.push('Please correlate with clinical findings.');
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

/** The findings phrase before the qualifier: "CRYPT APOPTOSIS", "LICHENOID MUCOSITIS AND LYMPHOCYTIC SIALADENITIS". */
export function findingsOf(v) {
  const r = regionOf(v);
  if (r === 'oral') {
    const f = arr(v.oralFeatures);
    const mucosa = f.includes('Lichenoid interface inflammation') ? 'LICHENOID MUCOSITIS'
      : ['Lymphocytic exocytosis', 'Apoptotic keratinocytes', 'Satellitosis', 'Basal vacuolar change'].some((x) => f.includes(x)) ? 'INTERFACE MUCOSITIS' : '';
    const glands = sialadenitis(v) ? 'LYMPHOCYTIC SIALADENITIS' : '';
    return [mucosa, glands].filter(Boolean).join(' AND ');
  }
  if (r === 'oesophagus') return apoptotic(v) ? 'BASAL EPITHELIAL APOPTOSIS' : '';
  const u = unitOf(v).toUpperCase();
  const apoptosis = apoptotic(v) ? `${r === 'stomach' ? 'GLANDULAR' : 'CRYPT'} APOPTOSIS` : '';
  if (v.cryptLoss === 'Extensive, with denudation') return `EXTENSIVE ${u} DROPOUT WITH MUCOSAL DENUDATION`;
  if (cryptLoss(v)) return apoptosis ? `${apoptosis} AND ${u} DROPOUT` : `${u} DROPOUT`;
  return apoptosis;
}

const CMV_ITIS = { oesophagus: 'OESOPHAGITIS', stomach: 'GASTRITIS', colon: 'COLITIS', oral: 'INFECTION' };
function cmvClause(v) {
  if (!cmvPositive(v)) return '';
  const r = regionOf(v);
  let itis = CMV_ITIS[r];
  if (r === 'small') itis = v.site === 'Duodenum' ? 'DUODENITIS' : 'ENTERITIS';
  if (v.site === 'Rectum') itis = 'PROCTITIS';
  return `CYTOMEGALOVIRUS ${itis}`;
}

/** The GVHD clause: "CRYPT APOPTOSIS, likely GRAFT-VERSUS-HOST DISEASE (grade 2)". */
export function gvhdClause(v) {
  const nih = nihOf(v);
  const ddx = !!differentialOf(v);
  const pointer = v.seeDescription !== false && (nih === 'Possible GVHD' || ddx) ? 'please see description' : '';
  if (nih === 'Not GVHD') return `NO EVIDENCE OF GRAFT-VERSUS-HOST DISEASE${pointer ? ` (${pointer})` : ''}`;
  const grade = nih === 'Likely GVHD' ? gradeOf(v) : '';
  const note = [grade ? `grade ${grade}` : '', pointer].filter(Boolean).join('; ');
  const word = nih === 'Possible GVHD' ? 'possible' : 'likely';
  const disease = diseaseOf(v).toUpperCase();
  const findings = findingsOf(v);
  const head = findings ? `${findings}, ${word} ${disease}` : `${cap1(word)} ${disease}`;
  return `${head}${note ? ` (${note})` : ''}`;
}

export function diagnosis(part) {
  const v = part.values;
  const clauses = [gvhdClause(v), cmvClause(v), v.viral === 'Other viral cytopathic change' ? 'VIRAL CYTOPATHIC CHANGE' : '', stripDot(v.extraDx)].filter(Boolean);
  return `(${part.label}) ${organPhrase(part)}:\n${clauses.map((c) => `- ${c}.`).join('\n')}`;
}

// ---------- checks (never printed) ----------

// The clinical history, read for the day after the transplant and for mycophenolate when the case fields are blank.
const DAY_RES = [/\bday\s*\+\s*(\d{1,4})\b/i, /\bD\s*\+\s*(\d{1,4})\b/, /\bday\s+(\d{1,4})\s+(?:post|after)\b/i, /\b(\d{1,4})\s*days?\s+(?:post|after|since)\b/i];
const MMF_RE = /\b(?:MMF|mycophenol\w*|cellcept|myfortic)\b/i;
/** Days since the transplant: the case field, else the first "day +15", "D+15" or "15 days post" in the history. */
export function transplantDayOf(caseState) {
  const typed = Number.parseInt(String(caseState?.transplantDay ?? '').replace(/^\s*(?:day|D)\s*\+?\s*/i, ''), 10);
  if (Number.isFinite(typed)) return typed;
  const h = String(caseState?.meta?.clinical || '');
  for (const re of DAY_RES) {
    const m = h.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}
/** True when mycophenolate is named: the case field, else the history. */
export function mmfOf(caseState) {
  if (caseState?.mmf === 'Yes') return true;
  if (caseState?.mmf === 'No') return false;
  return MMF_RE.test(String(caseState?.meta?.clinical || ''));
}

export function validate(part, ctx) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  const nih = nihOf(v);
  const gut = isGut(v);
  const r = regionOf(v);
  if (v.site === OTHER_SITE && !stripDot(v.siteOther)) err('Type the site: the specimen line prints "Biopsy site" until it is filled.', 'siteOther');
  // NIH 2014 Table 1: crypt apoptosis is the minimal criterion in the gut; lichenoid interface change with exocytosis
  // and apoptosis in the oral mucosa; periductal inflammation with duct damage in minor salivary glands.
  if (nih === 'Likely GVHD' && gut && !apoptotic(v)) {
    warn(`Likely GVHD is chosen without ${r === 'oesophagus' ? 'basal' : unitOf(v)} apoptosis recorded; in the gut apoptosis is the minimal criterion (NIH 2014: variable, at least one per piece).`, 'apoptosis');
  }
  if (nih === 'Likely GVHD' && !gut && !oralHit(v) && !sialadenitis(v)) {
    warn('Likely GVHD is chosen without lichenoid interface change, apoptosis or salivary gland changes recorded (NIH 2014 oral criteria).', 'oralFeatures');
  }
  if (nih === 'Possible GVHD' && !differentialOf(v)) info('Possible GVHD: name the other explanations in the differential (NIH 2014).', 'differential');
  if (v.superficial && !apoptotic(v) && nih !== 'Not GVHD') {
    warn('Apoptotic debris limited to the surface epithelium and lamina propria is non-specific and is not used to diagnose GVHD (NIH 2014).', 'superficial');
  }
  if (gut && v.eosinophils === 'Increased' && nih !== 'Not GVHD') {
    if (mmfOf(ctx?.case)) warn('Eosinophils are increased and mycophenolate is named: increased eosinophils favour MMF-induced injury over GVHD (NIH 2014). Consider Possible GVHD with mycophenolate in the differential.', 'eosinophils');
    else info('Eosinophils are increased: they favour MMF-induced injury over GVHD (NIH 2014). Check the drug history.', 'eosinophils');
  }
  // NIH 2014 Table 2: CMV enteritis with inclusions near the apoptotic changes is Possible GVHD; abundant apoptosis
  // not associated with CMV-infected cells by immunostaining can still be Likely GVHD.
  if (nih === 'Likely GVHD' && (v.cmv === 'Positive, near the apoptotic cells' || (v.viral === 'Cytomegalovirus inclusions' && !String(v.cmv || '').startsWith('Positive')))) {
    warn('Cytomegalovirus is recorded close to the apoptotic cells: NIH 2014 places CMV with inclusions near the apoptotic changes under Possible GVHD.', 'cmv');
  }
  if (gut && apoptotic(v) && v.cmv === 'Not performed' && v.viral !== 'Cytomegalovirus inclusions') {
    info('Apoptosis is recorded and no CMV immunohistochemistry: CMV is worth excluding in suspected GVHD (PathologyOutlines).', 'cmv');
  }
  if (salivaryIn(v)) {
    const n = count(v.lobules);
    if (n !== null && n < 5) warn(`${n} ${n === 1 ? 'lobule' : 'lobules'} of minor salivary gland: an oral biopsy for GVHD should include at least five lobules (NIH 2014).`, 'lobules');
    else if (n === null) info('Record the number of minor salivary gland lobules: at least five are advised (NIH 2014).', 'lobules');
  }
  if (v.phase === 'Acute' && sialadenitis(v)) warn('Salivary gland changes are the specific criterion of chronic GVHD (NIH 2014), but the phase is set to acute.', 'phase');
  if (!gut && v.phase === 'Chronic' && !sialadenitis(v)) {
    info('Oral mucosa alone: acute and chronic GVHD are told apart by the distinctive clinical oral manifestations, not by the histology (NIH 2014).', 'phase');
  }
  if (gut && v.phase && v.phase !== 'Not stated') info('In the gut the histology does not separate acute from chronic GVHD (NIH 2014): the phase prints as chosen, from the clinical findings.', 'phase');
  const day = transplantDayOf(ctx?.case);
  if (day !== null && day < 20 && nih !== 'Not GVHD') {
    warn(`Day ${day} after the transplant: conditioning changes usually resolve within 20 days (PathologyOutlines). NIH 2014 treats recent conditioning as a mitigating factor under Likely GVHD.`, 'nih');
  }
  if (gradable(v) && v.grade && !['Auto', 'Not graded'].includes(v.grade) && autoGrade(v) && v.grade !== autoGrade(v)) {
    warn(`Grade ${v.grade} is chosen; the crypt findings read grade ${autoGrade(v)} (1 apoptosis, 2 individual crypt loss, 3 contiguous crypt loss, 4 extensive loss with denudation).`, 'grade');
  }
  const sections = count(v.sections);
  if (sections !== null && sections < 8) info(`${sections} serial ${sections === 1 ? 'section' : 'sections'} examined: NIH 2014 advises at least 8, and up to 20, to avoid missing infrequent apoptosis.`, 'sections');
  return out;
}

// The registry loads this default export; a generator without one is not wired in.
export default { specimenName, organPhrase, microscopy, diagnosis, validate };
