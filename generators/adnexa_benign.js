// Fallopian tube and ovary, benign: a salpingo-oophorectomy or salpingectomy without the uterus (Phase 74,
// 23 October 2026; user: "a template for benign salpingectomy/salpingoophrectomy specimens ... with the option
// for p53 signature/STIC").
//
// One side or both in a part; the ovary is left out for a salpingectomy. Sampling is representative, with the
// fimbria entirely submitted, or the whole tube by SEE-FIM (sectioning and extensively examining the fimbriated
// end; https://en.wikipedia.org/wiki/SEE-FIM_Protocol), which a risk-reducing specimen opens on. The tube findings add
// salpingitis isthmica nodosa and Walthard rests to the uterus form's list; the three epithelial lesions
// (p53 signature, STIL, STIC), their p53 and Ki-67 sentences, the closing sentence and the STIC comment come
// from _tube.js, shared with the uterus form's tube parts. Sources: docs/reference/fallopian-tube-lesions-sources.md.
//
// Head: "RIGHT FALLOPIAN TUBE AND OVARY, salpingo-oophorectomy"; a risk-reducing specimen reads "risk-reducing
// bilateral salpingo-oophorectomy". Findings follow the house adnexa lines ("PARATUBAL CYST", "CORPUS LUTEUM,
// ovary", "corpora albicantia, ovary", "WALTHARD CELL REST"); nothing found reads "NO SIGNIFICANT PATHOLOGY",
// or "NO EVIDENCE OF MALIGNANCY OR STIC" when STIC is the question (risk-reducing or SEE-FIM).
// Wording is protected by tests/adnexa_benign.test.js and tests/fixtures/adnexa_benign/*.json.

import { stripDot, checks } from './_house.js';
import { sizePhrase, sidedSizes, tubeMeasure } from './uterus.js';
import { tubeLesion, withoutLesions, lesionMicro, lesionCloser, lesionChecks, LESION_DX, STIC, STIL, P53_SIGNATURE } from './_tube.js';

const SO = 'Salpingo-oophorectomy';
const SEE_FIM = 'Entirely submitted (SEE-FIM)';
const FIMBRIA = 'Fimbria entirely submitted';

const arr = (x) => (Array.isArray(x) ? x : []);
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const num = (x) => {
  const n = parseFloat(String(x ?? '').trim());
  return Number.isFinite(n) ? n : null;
};

const bilateral = (v) => v.side === 'Bilateral';
const withOvary = (v) => (v.procedure || SO) === SO;
// A line that names no side leaves the field blank (the app drops the positional default), and the
// report then names none rather than guessing "right".
const sideWord = (v) => (bilateral(v) ? 'bilateral' : ['Right', 'Left'].includes(v.side) ? v.side.toLowerCase() : '');
const tubeFindings = (v) => arr(v.tubeFindings).filter((x) => x !== 'Unremarkable');
const ovaryFindings = (v) => (withOvary(v) ? arr(v.ovaryFindings).filter((x) => x !== 'Unremarkable') : []);
/** STIC is the question on a risk-reducing specimen or one examined by SEE-FIM. */
const sticQuestion = (v) => v.indication === 'Risk-reducing' || v.sampling === SEE_FIM;

const INDICATION = { 'Risk-reducing': 'risk-reducing', Opportunistic: 'opportunistic' };

/** "bilateral salpingo-oophorectomy", "risk-reducing bilateral salpingo-oophorectomy", "salpingectomy". */
function procedureWords(v) {
  const p = withOvary(v) ? 'salpingo-oophorectomy' : 'salpingectomy';
  return [INDICATION[v.indication], bilateral(v) ? 'bilateral' : '', p].filter(Boolean).join(' ');
}

/** "Right fallopian tube and ovary" / "Bilateral fallopian tubes and ovaries" / "Left fallopian tube". */
function organWords(v) {
  const tubes = bilateral(v) ? 'fallopian tubes' : 'fallopian tube';
  const ovaries = withOvary(v) ? (bilateral(v) ? ' and ovaries' : ' and ovary') : '';
  return uc1([sideWord(v), `${tubes}${ovaries}`].filter(Boolean).join(' '));
}

export function specimenName(part) {
  const v = part.values;
  return `${organWords(v)}, ${procedureWords(v)}`;
}

// ---------- macroscopy and block key ----------

// [with a size, on its own] for one ovary and for both.
const OVARY_CUT = {
  Unremarkable: { one: ['with an unremarkable cut surface', 'has an unremarkable cut surface'], both: ['with unremarkable cut surfaces', 'have unremarkable cut surfaces'] },
  'Small cysts': { one: ['with small cysts on the cut surface', 'shows small cysts on the cut surface'], both: ['with small cysts on the cut surfaces', 'show small cysts on the cut surfaces'] },
  'Corpus luteum': { one: ['with a corpus luteum on the cut surface', 'shows a corpus luteum on the cut surface'], both: ['with a corpus luteum', 'show a corpus luteum'] }
};

/** The block key as [label, blocks]; both sides are keyed left first, as on the uterus form. */
export function blockItems(v) {
  const sides = bilateral(v) ? ['Left ', 'Right '] : [''];
  const items = [];
  const cyst = tubeFindings(v).includes('Paratubal cyst');
  for (const sd of sides) {
    const tube = `${sd}${sd ? 'fallopian tube' : 'Fallopian tube'}`;
    const fimbria = `${sd}${sd ? 'fimbria' : 'Fimbria'}`;
    if (v.sampling === SEE_FIM) items.push([`${fimbria}, longitudinal sections`, 1], [`${tube}, cross sections`, 2]);
    else if (v.sampling === FIMBRIA) items.push([`${fimbria}, entirely submitted`, 1], [`${tube}, cross sections`, 1]);
    else items.push([`${tube}, fimbria and cross sections`, 1]);
    if (cyst && !sd) items.push(['Paratubal cyst', 1]);
    if (withOvary(v)) items.push([`${sd ? `${sd}ovary` : 'Ovary'}`, 2]);
  }
  if (cyst && bilateral(v)) items.push(['Paratubal cyst', 1]);
  return items;
}

export function blockCount(v) {
  const typed = num(v.blocks);
  if (typed !== null) return Math.max(1, Math.round(typed));
  return Math.max(1, blockItems(v).reduce((t, [, n]) => t + n, 0));
}

function tubeMacro(v) {
  const s = [];
  const both = bilateral(v);
  const absent = v.fimbria === 'Not identified';
  const cut = (OVARY_CUT[v.ovaryCut] || OVARY_CUT.Unremarkable)[both ? 'both' : 'one'];
  if (both) {
    const t2 = sidedSizes(v.tubeSize);
    const tube = sizePhrase(v.tubeSize);
    const fimbria = absent ? '; the fimbriated ends are not identified' : ', both with fimbriated ends';
    if (t2) s.push(`The right fallopian tube measures ${t2.right} and the left fallopian tube ${t2.left}${fimbria}.`);
    else if (tube) s.push(`The fallopian tubes measure up to ${tube}${fimbria}.`);
    else if (absent) s.push('The fimbriated ends are not identified.');
    if (withOvary(v)) {
      const o2 = sidedSizes(v.ovarySize);
      const ovary = sizePhrase(v.ovarySize);
      if (o2) s.push(`The right ovary measures ${o2.right} and the left ovary ${o2.left}, ${cut[0]}.`);
      else if (ovary) s.push(`The ovaries measure up to ${ovary}, ${cut[0]}.`);
      else s.push(`The ovaries ${cut[1]}.`);
    }
  } else {
    const tube = tubeMeasure(v.tubeSize);
    if (tube) s.push(`The fallopian tube measures ${tube}${absent ? '; the fimbriated end is not identified' : ', with a fimbriated end'}.`);
    else if (absent) s.push('The fimbriated end is not identified.');
    if (withOvary(v)) {
      const ovary = sizePhrase(v.ovarySize);
      s.push(ovary ? `The ovary measures ${ovary}, ${cut[0]}.` : `The ovary ${cut[1]}.`);
    }
  }
  const cyst = sizePhrase(v.cystSize);
  if (cyst || tubeFindings(v).includes('Paratubal cyst')) s.push(`A thin-walled paratubal cyst${cyst ? ` measuring ${cyst}` : ''} is attached to the fallopian tube.`);
  return s;
}

function samplingSentence(v, blocks) {
  const n = `${blocks} block${blocks === 1 ? '' : 's'}`;
  if (v.sampling === SEE_FIM) {
    const what = withOvary(v) ? (bilateral(v) ? 'the remaining tubes and the ovaries are' : 'the remaining tube and the ovary are') : (bilateral(v) ? 'the remaining tubes are' : 'the remaining tube is');
    return `The fimbriated end${bilateral(v) ? 's are' : ' is'} amputated and sectioned longitudinally, and ${what} sectioned serially (SEE-FIM protocol). All embedded in ${n}.`;
  }
  if (v.sampling === FIMBRIA) return `The fimbriated end${bilateral(v) ? 's are' : ' is'} entirely submitted, with representative sections of the remainder, in ${n}.`;
  return `Representative sections in ${n}.`;
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const noun = [INDICATION[v.indication], sideWord(v), withOvary(v) ? 'salpingo-oophorectomy' : 'salpingectomy'].filter(Boolean).join(' ');
  const s = [`Received in formalin is ${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun} specimen.`];
  s.push(...tubeMacro(v));
  s.push(samplingSentence(v, blockCount(v)));
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const override = stripDot(v.blockKeyText);
  if (override) return `(${part.label}) ${override}.`;
  const items = blockItems(v);
  const typed = num(v.blocks);
  // A typed block total that differs from the automatic key is absorbed by the last item, as on the uterus form.
  if (typed !== null && items.length) {
    const auto = items.reduce((t, [, n]) => t + n, 0);
    const last = items[items.length - 1];
    last[1] = Math.max(1, last[1] + Math.max(1, Math.round(typed)) - auto);
  }
  let start = 1;
  const keys = items.map(([label, n]) => {
    const range = n === 1 ? `(${start})` : `(${start}-${start + n - 1})`;
    start += n;
    return `${range} ${label}.`;
  });
  return `(${part.label}) ${keys.join(' ')}`;
}

// ---------- microscopy ----------

const TUBE_SENTENCE = {
  'Paratubal cyst': 'A paratubal cyst is seen, with a fibrous wall lined by ciliated tubal-type epithelium.',
  'Chronic salpingitis': 'The plicae contain a chronic inflammatory infiltrate with plasma cells, in keeping with chronic salpingitis.',
  'Salpingitis isthmica nodosa': 'The isthmic wall contains nodular smooth muscle hypertrophy around diverticula of tubal epithelium, in keeping with salpingitis isthmica nodosa.',
  Endometriosis: 'Foci of endometrial glands and stroma with haemosiderin-laden macrophages are present, in keeping with endometriosis.',
  'Walthard rests': 'Walthard rests are seen on the tubal serosa.'
};
const OVARY_PHRASE = {
  'Cystic follicles': 'cystic follicles',
  'Corpus luteum': 'a corpus luteum',
  'Corpora albicantia': 'corpora albicantia',
  'Surface inclusion cysts': 'surface epithelial inclusion cysts',
  'Stromal hyperplasia': 'stromal hyperplasia'
};

function tubeMicro(v) {
  const sd = bilateral(v) ? 'both fallopian tubes' : ['the', sideWord(v), 'fallopian tube'].filter(Boolean).join(' ');
  const f = withoutLesions(tubeFindings(v));
  const s = [];
  // No fimbrial tissue is claimed when the fimbriated end was not identified at grossing.
  const fimbrial = v.fimbria === 'Not identified' ? '' : 'fimbrial tissue and ';
  if (f.includes('Hydrosalpinx')) s.push(`Sections of ${sd} show a dilated lumen lined by benign tubal epithelium, consistent with hydrosalpinx.`);
  else if (f.includes('Chronic salpingitis') || f.includes('Salpingitis isthmica nodosa')) s.push(`Sections show ${fimbrial}cross sections of ${sd}.`);
  else s.push(`Sections show ${fimbrial}cross sections of ${sd} with unremarkable plicae.`);
  // Endometriosis in the tube and the ovary reads once, with the ovary.
  const once = ovaryFindings(v).includes('Endometriosis');
  for (const x of Object.keys(TUBE_SENTENCE)) if (f.includes(x) && !(x === 'Endometriosis' && once)) s.push(TUBE_SENTENCE[x]);
  return s;
}

function ovaryMicro(v) {
  if (!withOvary(v)) return [];
  const f = ovaryFindings(v);
  const noun = bilateral(v) ? 'ovaries' : 'ovary';
  const ph = f.filter((x) => OVARY_PHRASE[x]).map((x) => OVARY_PHRASE[x]);
  const s = [];
  if (ph.length) s.push(`The ${noun} ${bilateral(v) ? 'show' : 'shows'} ${listJoin(ph)}.`);
  else if (!f.includes('Endometriosis')) s.push(`The ${noun} ${bilateral(v) ? 'are' : 'is'} unremarkable.`);
  if (f.includes('Endometriosis')) {
    const where = withoutLesions(tubeFindings(v)).includes('Endometriosis') ? `${bilateral(v) ? 'tubes' : 'tube'} and ${noun}` : noun;
    s.push(`Foci of endometrial glands and stroma with haemosiderin-laden macrophages are present in the ${where}, in keeping with endometriosis.`);
  }
  return s;
}

export function microscopy(part) {
  const v = part.values;
  const s = [...tubeMicro(v), ...lesionMicro(v, tubeFindings(v)), ...ovaryMicro(v)];
  s.push(lesionCloser(tubeFindings(v), { sticQuestion: sticQuestion(v) }));
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

// ---------- diagnosis ----------

const TUBE_DX = {
  Hydrosalpinx: 'HYDROSALPINX',
  'Paratubal cyst': 'PARATUBAL CYST',
  'Chronic salpingitis': 'CHRONIC SALPINGITIS',
  'Salpingitis isthmica nodosa': 'SALPINGITIS ISTHMICA NODOSA',
  Endometriosis: 'ENDOMETRIOSIS',
  'Walthard rests': 'WALTHARD CELL REST'
};
const OVARY_DX = {
  'Cystic follicles': 'CYSTIC FOLLICLES, ovary',
  'Corpus luteum': 'CORPUS LUTEUM, ovary',
  'Corpora albicantia': 'corpora albicantia, ovary',
  'Surface inclusion cysts': 'surface epithelial inclusion cysts, ovary',
  'Stromal hyperplasia': 'stromal hyperplasia, ovary',
  Endometriosis: 'ENDOMETRIOSIS, ovary'
};

export function diagnosis(part) {
  const v = part.values;
  const head = `${organWords(v).toUpperCase()}, ${procedureWords(v)}`;
  const lesion = tubeLesion(tubeFindings(v));
  const upper = [];
  const lower = [];
  if (lesion === STIC) upper.push(LESION_DX[STIC]);
  else if (lesion) upper.push(LESION_DX[lesion]);
  const tube = withoutLesions(tubeFindings(v));
  for (const x of Object.keys(TUBE_DX)) if (tube.includes(x)) upper.push(TUBE_DX[x]);
  // Endometriosis in both reads once.
  for (const x of Object.keys(OVARY_DX)) {
    if (!ovaryFindings(v).includes(x)) continue;
    if (x === 'Endometriosis' && tube.includes('Endometriosis')) continue;
    (/^[A-Z]/.test(OVARY_DX[x]) ? upper : lower).push(OVARY_DX[x]);
  }
  let closer = '';
  if (lesion === STIC) closer = 'see comment';
  else if (lesion) closer = 'NO EVIDENCE OF MALIGNANCY';
  else if (sticQuestion(v)) closer = 'NO EVIDENCE OF MALIGNANCY OR STIC';
  else if (!upper.length && !lower.length) closer = 'NO SIGNIFICANT PATHOLOGY';
  const clauses = [...upper, ...lower, closer].filter(Boolean);
  return `(${part.label}) ${head} - ${clauses.join('; ')}`;
}

// ---------- checks ----------

/** Checks beside the report, never printed. */
export function validate(part) {
  const v = part.values || {};
  const c = checks();
  if (!['Right', 'Left', 'Bilateral'].includes(v.side)) c.at('info', 'The side is not recorded.', 'side');
  lesionChecks(v, tubeFindings(v), c);
  if (v.indication === 'Risk-reducing' && v.sampling !== SEE_FIM) c.at('info', 'Risk-reducing specimen: SEE-FIM sampling is not recorded.', 'sampling');
  const lesion = tubeLesion(tubeFindings(v));
  if ((lesion === STIL || lesion === STIC) && v.sampling === 'Representative') c.at('info', `${lesion === STIC ? 'STIC' : 'STIL'} in a representatively sampled tube: consider submitting the remaining tube.`, 'sampling');
  if (lesion === P53_SIGNATURE && v.ki67 === 'Increased') c.warn('p53 signature with an increased Ki-67: consider STIL.', 'ki67');
  return c.out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
