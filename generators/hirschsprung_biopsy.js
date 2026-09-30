// Hirschsprung rectal biopsy (suction, full-thickness or plain biopsy). Card: docs/roadmap.md "Hirschsprung
// disease — rectal biopsy" (pulled by the user 2026-09-30); grounding docs/reference/hirschsprung-morphology.md.
//
// House wording, measured on the five-year biopsy file (2021-2026; aggregate only, no case quoted): the
// released bowel parts that name ganglion cells print a specimen line ending ":" - "RECTUM, <n> cm from AV,
// suction rectal biopsy:" (a space before "cm", "from AV" after the distance, "suction rectal biopsy" or
// plain "biopsy" as the procedure) - and the answer as a clause of its own, "- GANGLION CELLS PRESENT." with
// the full stop. They count "serial sections", never levels. No aganglionic or inadequate answer is in the
// file, so those clauses take the IWG 2009 wording (Box 1: findings "consistent with" Hirschsprung disease;
// a biopsy "inadequate for evaluation") in the released-report register of docs/new-template-brief.md §3.2:
// what was found, in capitals, with no thresholds or exclusion logic. The grounding sits in the Checks.
//
// The microscopy follows the same cases: pieces of "large intestinal mucosa with <amount> submucosa, in
// which clusters of ganglion cells are found"; acetylcholinesterase histochemistry on frozen tissue that
// "confirms the presence of these ganglion cells in clusters, and does not reveal any overtly thickened
// nerve fibres in the muscularis mucosae or lamina propria"; calretinin as nerve fibrils in the lamina
// propria and muscularis mucosae; hypertrophic submucosal nerves named only when looked for. The house
// spelling "acetylcholineasterase" is not reproduced.
//
// Blocks: specimenName (SPECIMEN), microscopy (one paragraph per part), diagnosis (specimen line and one
// clause), validate (Checks). Wording is protected by tests/hirschsprung_biopsy.test.js.

import { stripDot, checks } from './_house.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const FULL = 'Full-thickness biopsy';
const SITES = { Rectum: 'Rectum', 'Sigmoid colon': 'Sigmoid colon', Colon: 'Colon' };

const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const count = (x) => {
  const n = Number(String(x ?? '').trim());
  return Number.isInteger(n) && n > 0 ? n : null;
};
const inWords = (n) => (n <= 10 ? WORDS[n] : String(n));

const siteOf = (v) => SITES[v.site] || 'Rectum';
const isFull = (v) => v.procedure === FULL;
// A biopsy sent as full thickness often holds only mucosa and submucosa (AJCP 2023): with the muscularis
// propria not sampled it is read, and judged for adequacy, as a mucosal biopsy.
const mucosal = (v) => !isFull(v) || v.myenteric === 'Not sampled';

/** "2 cm from AV" from what was typed: a distance alone gains "cm" and "from AV"; "2cm" gains its space. */
export function levelOf(v) {
  let s = stripDot(v.level).replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = s.replace(/(\d)\s*cm\b/gi, '$1 cm');
  const distance = /^\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?$/;
  if (distance.test(s)) return `${s} cm from AV`;
  if (/^\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*cm$/i.test(s)) return `${s} from AV`;
  return s;
}

/** The procedure as the house prints it: a suction biopsy of the rectum is a "suction rectal biopsy". */
function procedureOf(v) {
  if (isFull(v)) return 'full-thickness biopsy';
  if (v.procedure === 'Biopsy') return 'biopsy';
  return siteOf(v) === 'Rectum' ? 'suction rectal biopsy' : 'suction biopsy';
}

const line = (head, v) => [head, levelOf(v), procedureOf(v)].filter(Boolean).join(', ');

export const specimenName = (part) => line(siteOf(part.values), part.values);
export const organPhrase = (part) => line(siteOf(part.values).toUpperCase(), part.values);

// ---------- ganglion cells ----------

/** 'Present' when any plexus sampled has ganglion cells, else 'Not identified'. */
export function ganglionOf(v) {
  if (v.ganglion === 'Present') return 'Present';
  if (isFull(v) && v.myenteric === 'Present') return 'Present';
  return 'Not identified';
}

/** Why a biopsy without ganglion cells cannot be read: too little submucosa, or anal canal mucosa. */
export function inadequacyOf(v) {
  if (mucosal(v) && v.submucosa === 'Absent') return 'no submucosa';
  if (mucosal(v) && v.submucosa === 'Scant') return 'scant submucosa';
  if (v.distal && v.distal !== 'None') return 'anal canal mucosa';
  return '';
}

/** Findings that support aganglionosis: hypertrophic nerves, absent calretinin fibrils, increased AChE fibres. */
const supportive = (v) => v.nerves === 'Hypertrophic' || v.calretinin === 'No positive fibres' || v.ache === 'Increased fibres';

// ---------- microscopy ----------

function openingSentence(v) {
  const n = count(v.fragments);
  const pieces = n === 1 ? 'a piece' : n ? `${inWords(n)} pieces` : 'pieces';
  const present = ganglionOf(v) === 'Present';
  if (!mucosal(v)) {
    const wall = `Sections show ${n === 1 || !n ? 'a full-thickness piece' : `${inWords(n)} full-thickness pieces`} of large intestinal wall, including the muscularis propria.`;
    let g;
    if (v.ganglion === 'Present' && v.myenteric === 'Present') g = 'Clusters of ganglion cells are found in the submucosal and myenteric plexuses.';
    else if (v.ganglion === 'Present') g = 'Clusters of ganglion cells are found in the submucosa; no ganglion cells are found in the myenteric plexus.';
    else if (v.myenteric === 'Present') g = 'Clusters of ganglion cells are found in the myenteric plexus; no ganglion cells are found in the submucosa.';
    else g = 'No ganglion cells are found in the submucosal or myenteric plexus.';
    return [wall, g];
  }
  const sub = v.submucosa === 'Absent' ? 'without submucosa' : v.submucosa === 'Scant' ? 'with very scanty submucosa' : 'with submucosa';
  const head = `Sections show ${pieces} of large intestinal mucosa ${sub}`;
  const wall = isFull(v) ? ['The muscularis propria is not included.'] : [];
  if (present) return [`${head}, in which clusters of ganglion cells are found.`, ...wall];
  return [`${head}.`, 'No ganglion cells are found.', ...wall];
}

function distalSentence(v) {
  const kind = { 'Transitional mucosa': 'transitional', 'Squamous mucosa': 'squamous', 'Squamous and transitional mucosa': 'squamous and transitional' }[v.distal];
  return kind ? `The biopsy also includes ${kind} mucosa of the anal canal.` : '';
}

// The IWG 2009 asks for the number of sections evaluated; the house lines count serial sections.
function sectionsSentence(v) {
  const n = count(v.sections);
  if (!n) return '';
  if (n === 1) return 'One section is examined.';
  return n <= 10 ? `${cap1(inWords(n))} serial sections are examined.` : `A total of ${n} serial sections are examined.`;
}

function nerveSentence(v) {
  if (v.nerves === 'Hypertrophic') {
    const d = count(v.nerveDiameter);
    return `Hypertrophic submucosal nerves are seen${d ? `, measuring up to ${d} microns in diameter` : ''}.`;
  }
  if (v.nerves === 'Not hypertrophic') return 'No hypertrophic submucosal nerves are seen.';
  return '';
}

function acheSentence(v) {
  if (v.ache !== 'No increase' && v.ache !== 'Increased fibres') return '';
  const present = ganglionOf(v) === 'Present';
  const fibres = v.ache === 'Increased fibres'
    ? 'shows increased, thickened nerve fibres in the muscularis mucosae and lamina propria'
    : 'does not reveal any overtly thickened nerve fibres in the muscularis mucosae or lamina propria';
  if (present) return `Histochemical staining for acetylcholinesterase confirms the presence of these ganglion cells in clusters, and ${fibres}.`;
  return `Histochemical staining for acetylcholinesterase ${fibres}.`;
}

function calretininSentence(v) {
  if (v.calretinin === 'Positive fibres') return 'Immunostaining for calretinin shows positive nerve fibrils in the lamina propria and muscularis mucosae.';
  // Mast cells are the internal control of an absent pattern (Ambartsumyan 2020): printed as seen, when ticked.
  if (v.calretinin === 'No positive fibres') return `Immunostaining for calretinin shows no positive nerve fibrils in the lamina propria or muscularis mucosae${v.mastCells ? '; mast cells are positive' : ''}.`;
  return '';
}

export function microscopy(part) {
  const v = part.values;
  const s = [...openingSentence(v)];
  if (v.immature && ganglionOf(v) === 'Present') s.push('The ganglion cells are immature.');
  for (const x of [distalSentence(v), sectionsSentence(v), nerveSentence(v), acheSentence(v), calretininSentence(v)]) if (x) s.push(x);
  const extra = stripDot(v.additionalNotes);
  if (extra) s.push(`${cap1(extra)}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

/** The clause under the specimen line, without its dash. */
export function answerOf(v) {
  const c = v.conclusion && v.conclusion !== 'Auto' ? v.conclusion : '';
  const reason = inadequacyOf(v);
  const inadequate = `INADEQUATE FOR EVALUATION${reason ? ` (${reason})` : ''}`;
  if (c === 'Ganglion cells present') return 'GANGLION CELLS PRESENT';
  if (c === 'No ganglion cells identified') return 'NO GANGLION CELLS IDENTIFIED';
  if (c === 'Consistent with Hirschsprung disease') return 'NO GANGLION CELLS IDENTIFIED, consistent with HIRSCHSPRUNG DISEASE';
  if (c === 'Inadequate for evaluation') return inadequate;
  if (ganglionOf(v) === 'Present') return 'GANGLION CELLS PRESENT';
  if (reason) return inadequate;
  return supportive(v) ? 'NO GANGLION CELLS IDENTIFIED, consistent with HIRSCHSPRUNG DISEASE' : 'NO GANGLION CELLS IDENTIFIED';
}

export function diagnosis(part) {
  return `(${part.label}) ${organPhrase(part)}:\n- ${answerOf(part.values)}.`;
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const { out, err, warn, at } = checks();
  const info = (m, f) => at('info', m, f);
  const present = ganglionOf(v) === 'Present';
  const chosen = v.conclusion && v.conclusion !== 'Auto' ? v.conclusion : '';
  const reason = inadequacyOf(v);
  if (!stripDot(v.level)) info('The level is not recorded: the specimen line prints without a distance.', 'level');
  if (chosen === 'Ganglion cells present' && !present) err('The diagnosis line says ganglion cells are present, but none are recorded.', 'conclusion');
  if (['No ganglion cells identified', 'Consistent with Hirschsprung disease', 'Inadequate for evaluation'].includes(chosen) && present) {
    err(`The diagnosis line reads "${chosen.toLowerCase()}", but ganglion cells are recorded as present.`, 'conclusion');
  }
  if (!present && reason) {
    const why = reason === 'anal canal mucosa'
      ? 'the biopsy includes anal canal mucosa, and the zone just above the dentate line normally has few or no ganglion cells'
      : `the biopsy has ${reason}, and submucosal ganglion cells can only be judged absent where enough submucosa is sampled`;
    if (chosen === 'No ganglion cells identified' || chosen === 'Consistent with Hirschsprung disease') warn(`No ganglion cells is reported, but ${why}.`, reason === 'anal canal mucosa' ? 'distal' : 'submucosa');
    else if (!chosen) info(`No ganglion cells: the diagnosis line reads inadequate because ${why}.`, reason === 'anal canal mucosa' ? 'distal' : 'submucosa');
  }
  // Calretinin-positive mucosal fibrils reach 1-2 cm into aganglionic bowel (Kapur 2014), and a low biopsy
  // sits in the physiological hypoganglionic zone (IWG 2009): neither reading settles the disagreement.
  if (!present && v.calretinin === 'Positive fibres') {
    warn('No ganglion cells are recorded, but calretinin shows positive mucosal nerve fibrils: the two disagree. The fibrils can extend 1-2 cm into aganglionic bowel (Kapur 2014), and a low biopsy may be physiologically hypoganglionic: review the level and the sections.', 'calretinin');
  }
  if (present && v.calretinin === 'No positive fibres') warn('Ganglion cells are recorded, but calretinin shows no positive mucosal nerve fibrils: the two disagree.', 'calretinin');
  if (present && v.ache === 'Increased fibres') warn('Ganglion cells are recorded, but acetylcholinesterase shows increased nerve fibres: the two disagree.', 'ache');
  // Ganglion cells with hypertrophic nerves can be the transition zone of very-short-segment disease
  // (Ambartsumyan 2020; Monforte 2025).
  if (present && v.nerves === 'Hypertrophic') warn('Ganglion cells are recorded with hypertrophic submucosal nerves: consider the transition zone of very-short-segment disease (Ambartsumyan 2020).', 'nerves');
  // Freeze-thaw can remove calretinin, a false result for Hirschsprung disease (Ambartsumyan 2020; AJCP 2023).
  if (v.calretinin === 'No positive fibres' && v.ache && v.ache !== 'Not performed') {
    info('Calretinin is negative and acetylcholinesterase was done: calretinin on tissue that has been frozen and thawed can lose its staining (Ambartsumyan 2020).', 'calretinin');
  }
  if (v.calretinin === 'No positive fibres' && !v.mastCells) info('Calretinin is negative: tick the mast cells when they stain, the internal control (Ambartsumyan 2020).', 'mastCells');
  if (isFull(v) && v.myenteric === 'Not sampled') info('The muscularis propria is not included: the myenteric plexus is not assessed, and the biopsy is judged on its submucosa.', 'myenteric');
  if (!present && !count(v.sections)) info('No ganglion cells: the IWG 2009 asks for the number of sections examined.', 'sections');
  if (!present && !reason && !chosen && !supportive(v)) {
    info('No ganglion cells, and no hypertrophic nerves, calretinin or acetylcholinesterase result recorded: the diagnosis line prints without the Hirschsprung statement.', 'calretinin');
  }
  if (chosen === 'Consistent with Hirschsprung disease' && !present && !supportive(v)) {
    warn('The Hirschsprung statement is chosen with no hypertrophic nerves, calretinin or acetylcholinesterase result recorded in support.', 'conclusion');
  }
  // IWG 2009: most practices treat the diagnosis as a critical result; RCPath G085: it needs specialist input.
  if (/HIRSCHSPRUNG/.test(answerOf(v))) {
    info('Hirschsprung disease is a critical result in most practices: record when and to whom it was communicated (IWG 2009). A positive diagnosis needs specialist input (RCPath G085).', 'conclusion');
  }
  return out;
}

// The registry loads this default export; a generator without one is not wired in.
export default { specimenName, organPhrase, microscopy, diagnosis, validate };
