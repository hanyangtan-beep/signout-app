// Fibroid, morcellated or excised at hysteroscopy (Phase 81, 27 October 2026). User requests: 2026-10-23, "card a
// separate resection/excision for morcellated fibroids"; 2026-10-27, "build the morcellated fibroid/hysteroscopic
// excision template".
//
// One part per specimen received as fragments: a morcellated myomectomy, a morcellated supracervical hysterectomy or
// a fibroid excised at hysteroscopy. The macroscopy follows RCPath's tissue pathway for gynaecological pathology
// (February 2023), sections 7.1, 7.2.4 and 8: the fragments are weighed and measured in aggregate and sliced, any
// departure from a white, whorled cut surface is noted, a typical leiomyoma takes up to three representative blocks
// and anything unusual more, and a morcellated hysterectomy has its endometrial, cervical and serosal surfaces sampled
// (https://www.rcpath.org/static/94763195-0982-40ed-bbc79ca92370e9ac/Tissue-pathways-for-gynaecological-pathology.pdf).
// Seidman et al. (PLoS One 2012) is the background on morcellated uterine smooth muscle tumours and their sampling
// (https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0050058).
//
// The microscopy, the diagnosis, the STUMP, FH and intravenous leiomyomatosis comments and the leiomyoma checks are
// the uterus form's, read as a myomectomy part (generators/uterus.js), so the two forms word a leiomyoma alike. Two
// additions: the fragmentation snippet in the schema, and RCPath's caveat (section 8.2) that a leiomyoma with bizarre
// nuclei in fragments needs complete removal for a confident diagnosis. Sources: docs/reference/uterus-leiomyoma-sources.md.
//
// Heads: "UTERUS, fibroid, morcellated myomectomy", "UTERUS, morcellated supracervical hysterectomy" and
// "UTERUS, submucosal fibroid, hysteroscopic excision" (house: "UTERUS, uterine fibroid, hysteroscopy:
// - Submucosal LEIOMYOMA."). Wording is protected by tests/uterus_morcellated.test.js and
// tests/fixtures/uterus_morcellated/*.json.

import { stripDot, checks } from './_house.js';
import {
  MYOMECTOMY, CUT_SURFACE, LM_STUMP, sizePhrase, weightPhrase, word, lmType, leiomyomaDx, leiomyomaNeedsComment,
  myomectomyMicro, comment as uterusComment, validate as uterusValidate
} from './uterus.js';

export const MM = 'Morcellated myomectomy';
export const SC = 'Morcellated supracervical hysterectomy';
export const HY = 'Hysteroscopic excision';
const BIZARRE = 'With bizarre nuclei';

const arr = (x) => (Array.isArray(x) ? x : []);
const num = (x) => {
  const n = parseFloat(String(x ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

const proc = (v) => ([MM, SC, HY].includes(v.procedure) ? v.procedure : MM);
const morcellated = (v) => proc(v) !== HY;
const lmOn = (v) => (v.leiomyoma ?? 'Present') === 'Present';
/** The part as a myomectomy part of the uterus form, whose leiomyoma helpers then apply unchanged. */
const asMyomectomy = (v) => ({ ...v, specimenName: MYOMECTOMY, leiomyoma: lmOn(v) ? 'Present' : 'Absent' });
const has = (v, t) => arr(v.tissueTypes).includes(t);
const adenomyosis = (v) => has(v, 'Myometrium') && v.adenomyosis === 'Present';
const bizarre = (v) => lmOn(v) && lmType(v) === BIZARRE;
const blocksTyped = (v) => {
  const n = num(v.blocks);
  return n === null ? null : Math.max(1, Math.round(n));
};

const NAME = {
  [MM]: 'Uterus, fibroid, morcellated myomectomy',
  [SC]: 'Uterus, morcellated supracervical hysterectomy',
  [HY]: 'Uterus, submucosal fibroid, hysteroscopic excision'
};
const HEAD = {
  [MM]: 'UTERUS, fibroid, morcellated myomectomy',
  [SC]: 'UTERUS, morcellated supracervical hysterectomy',
  [HY]: 'UTERUS, submucosal fibroid, hysteroscopic excision'
};

export function specimenName(part) {
  return NAME[proc(part.values)];
}

// ---------- macroscopy and block key ----------

// The fragments as usually received: house myomectomy pieces are "firm whitish tissue", hysteroscopic fibroid
// fragments "tan-coloured tissue".
const TISSUE = { [MM]: 'firm whitish tissue', [SC]: 'uterine tissue', [HY]: 'tan tissue' };
// Hysteroscopic fragments are small and are described whole rather than sectioned.
const APPEARANCE = {
  Whorled: 'The fragments have a whorled appearance.',
  Degenerate: 'The fragments are soft and degenerate.',
  Haemorrhagic: 'The fragments are haemorrhagic.',
  Calcified: 'The fragments are gritty and calcified.'
};
const UNUSUAL = {
  'Not identified': 'No fleshy area or necrosis is identified.',
  'Fleshy area': 'A soft, fleshy area is present.',
  Necrosis: 'An area of necrosis is present.',
  'Fleshy area and necrosis': 'Soft, fleshy and necrotic areas are present.'
};

function fragments(v) {
  const n = num(v.fragmentCount);
  const count = n === null ? null : Math.max(1, Math.round(n));
  const kind = morcellated(v) ? 'morcellated ' : '';
  const tissue = stripDot(v.fragmentTissue) || TISSUE[proc(v)];
  if (count === 1) return { one: true, text: `a ${kind}fragment of ${tissue}` };
  return { one: false, text: `${count === null ? 'multiple' : word(count)} ${kind}fragments of ${tissue}` };
}

function aggregate(v, one) {
  const w = weightPhrase(v.weight);
  const d = sizePhrase(v.dimensions);
  const tail = one ? '' : ' in aggregate';
  if (w && d) return `, weighing ${w} and measuring ${d}${tail}`;
  if (w) return `, weighing ${w}${tail}`;
  if (d) return `, measuring ${d}${tail}`;
  return '';
}

/** "0.5 to 4" or "0.5-4" -> "from 0.5 to 4 cm across"; "4" -> "up to 4 cm across". '' when blank or one fragment. */
function rangeSentence(v, one) {
  const raw = String(v.fragmentSize ?? '').trim();
  if (!raw || one) return '';
  const unit = /mm/i.test(raw) ? 'mm' : 'cm';
  const ns = raw.match(/\d+(?:\.\d+)?/g) || [];
  if (ns.length >= 2) return `The fragments measure from ${ns[0]} to ${ns[1]} ${unit} across.`;
  if (ns.length === 1) return `The fragments measure up to ${ns[0]} ${unit} across.`;
  return '';
}

function surfaceSentence(v, one) {
  const c = CUT_SURFACE[v.cutSurface] ? v.cutSurface : 'Whorled';
  if (morcellated(v)) return `Sectioning shows ${CUT_SURFACE[c]}.`;
  const s = APPEARANCE[c];
  return one ? s.replace('The fragments have', 'The fragment has').replace('The fragments are', 'The fragment is') : s;
}

function samplingSentence(v) {
  const n = blocksTyped(v);
  const b = n === null ? '' : ` in ${n} block${n === 1 ? '' : 's'}`;
  if (v.sampling === 'All embedded') return `All embedded${b}.`;
  return n === null ? 'Representative sections are submitted.' : `Representative sections${b}.`;
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const f = fragments(v);
  const s = [`Received in formalin ${f.one ? 'is' : 'are'} ${f.text}${aggregate(v, f.one)}.`];
  s.push(rangeSentence(v, f.one), surfaceSentence(v, f.one), UNUSUAL[v.unusualArea] || UNUSUAL['Not identified'], samplingSentence(v));
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const override = stripDot(v.blockKeyText);
  if (override) return `(${part.label}) ${override}.`;
  const n = blocksTyped(v);
  if (n === null) return '';
  const label = v.sampling === 'All embedded' ? 'Fragments, all embedded' : 'Representative fragments';
  return `(${part.label}) ${n === 1 ? '(1)' : `(1-${n})`} ${label}.`;
}

// ---------- microscopy ----------

const ENDOMETRIUM = {
  Benign: 'Benign endometrium',
  Proliferative: 'Proliferative endometrium',
  Secretory: 'Secretory endometrium',
  'Weakly proliferative': 'Weakly proliferative endometrium',
  'Inactive-atrophic': 'Inactive, atrophic endometrium',
  'Disordered proliferative': 'Disordered proliferative endometrium with cystically dilated glands'
};
// The house sentence for endometrium among fibroid fragments.
const ENDOMETRIUM_TAIL = ' is included, without features of atypical hyperplasia or chronic endometritis.';
const POLYP = 'Fragments of endometrial polyp with fibrotic stroma and thick-walled vessels are included, without atypical hyperplasia.';
const CAUTERY = {
  Present: 'Cautery artefact is present at the edges of the fragments.',
  'Marked, limiting assessment': 'Marked cautery artefact limits the assessment of some fragments.'
};
const BIZARRE_CLOSE = 'Features are those of leiomyoma with bizarre nuclei.';

function endometriumSentence(v) {
  if (!has(v, 'Endometrium')) return '';
  if (v.endometrium === 'Endometrial polyp') return POLYP;
  return `${ENDOMETRIUM[v.endometrium] || ENDOMETRIUM.Benign}${ENDOMETRIUM_TAIL}`;
}

/** Myometrium (unless it opened the paragraph), endocervix and serosa among the fragments; `after`: a sentence precedes. */
function otherTissues(v, opened, after) {
  const s = [];
  const items = [];
  if (has(v, 'Myometrium') && !opened) items.push(adenomyosis(v) ? 'myometrium with adenomyosis' : 'unremarkable myometrium');
  if (has(v, 'Cervix')) items.push('benign endocervix');
  if (items.length) s.push(`Fragments of ${listJoin(items)} are ${after ? 'also ' : ''}present.`);
  if (has(v, 'Serosa')) s.push('Unremarkable serosa is present on some fragments.');
  return s;
}

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const lm = lmOn(v);
  if (lm) {
    const p = myomectomyMicro(asMyomectomy(v));
    s.push(bizarre(v) ? p.replace(BIZARRE_CLOSE, 'Features are those of leiomyoma with bizarre nuclei; see comment.') : p);
  } else if (has(v, 'Myometrium') || !arr(v.tissueTypes).length) {
    // No leiomyoma: myometrium opens when it is recorded, or when nothing else is.
    s.push(adenomyosis(v) ? 'Sections show pieces of myometrium with adenomyosis.' : 'Sections show pieces of unremarkable myometrium.');
  }
  if (proc(v) === HY && CAUTERY[v.cautery]) s.push(CAUTERY[v.cautery]);
  const e = endometriumSentence(v);
  s.push(e, ...otherTissues(v, !lm, s.length > 0 || !!e));
  if (!lm) s.push('There is no evidence of malignancy.');
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

// ---------- diagnosis ----------

const ENDOMETRIUM_DX = {
  Benign: 'benign endometrium',
  Proliferative: 'proliferative endometrium',
  Secretory: 'secretory endometrium',
  'Weakly proliferative': 'weakly proliferative endometrium',
  'Inactive-atrophic': 'inactive, atrophic endometrium',
  'Disordered proliferative': 'disordered proliferative endometrium'
};

export function diagnosis(part) {
  const v = part.values;
  const upper = [];
  const lower = [];
  let closer = '';
  if (lmOn(v)) {
    upper.push(leiomyomaDx(asMyomectomy(v)));
    if (leiomyomaNeedsComment(asMyomectomy(v)) || bizarre(v)) closer = 'see comment';
  }
  if (adenomyosis(v)) upper.push('ADENOMYOSIS');
  if (has(v, 'Endometrium')) {
    if (v.endometrium === 'Endometrial polyp') upper.push('ENDOMETRIAL POLYP');
    else if (proc(v) === SC || !lmOn(v)) {
      // The hysterectomy names its endometrium, as the uterus form does; a fibroid excision only when no
      // leiomyoma is found.
      const e = ENDOMETRIUM_DX[v.endometrium] || ENDOMETRIUM_DX.Benign;
      if (upper.length) lower.push(e); else upper.push(e.toUpperCase());
    }
  }
  if (!upper.length) upper.push('NO SIGNIFICANT PATHOLOGY');
  return `(${part.label}) ${HEAD[proc(v)]} - ${[...upper, ...lower, closer].filter(Boolean).join('; ')}`;
}

// ---------- comment and checks ----------

// RCPath section 8.2: the diagnosis of a leiomyoma with bizarre nuclei on a morcellated specimen carries a caveat.
export const BIZARRE_CAVEAT = 'As the specimen is fragmented, the diagnosis of leiomyoma with bizarre nuclei can be made with confidence only if the lesion has been completely removed.';

/** The uterus form's STUMP, FH and intravenous leiomyomatosis comments, then the bizarre nuclei caveat. */
export function comment(parts) {
  const notes = [];
  for (const part of parts) {
    const v = part.values;
    const lead = parts.length > 1 ? `(${part.label}) ` : '';
    const own = uterusComment([{ label: part.label, values: asMyomectomy(v) }]);
    if (own) notes.push(`${lead}${own}`);
    if (bizarre(v)) notes.push(`${lead}${BIZARRE_CAVEAT}`);
  }
  return notes.join('\n');
}

/** The uterus form's leiomyoma checks, and RCPath's sampling advice for fragments; shown beside the report, never printed. */
export function validate(part) {
  const v = part.values || {};
  const c = checks();
  c.out.push(...uterusValidate({ label: part.label, values: asMyomectomy(v) }));
  // RCPath 8.1: up to three representative blocks for a typical leiomyoma, more when anything is unusual.
  const n = blocksTyped(v);
  const routine = v.sampling !== 'All embedded' && (n === null || n <= 3);
  if (routine && v.unusualArea && v.unusualArea !== 'Not identified') {
    c.warn('A fleshy or necrotic area is recorded with three blocks or fewer: sample the area, and more extensively than for a typical leiomyoma (RCPath).', 'blocks');
  }
  const t = lmType(v);
  const atypia = v.atypia === 'Focal moderate to severe' || v.atypia === 'Diffuse moderate to severe';
  const atypical = lmOn(v) && (t === LM_STUMP || t === BIZARRE || atypia || v.tumourNecrosis === 'Present');
  if (routine && atypical) c.at('info', 'Atypical features with three blocks or fewer: RCPath advises sampling more of the specimen.', 'blocks');
  if (proc(v) === SC && !has(v, 'Endometrium')) {
    c.at('info', 'Morcellated hysterectomy: no endometrium is recorded among the fragments; RCPath advises sampling the endometrial, cervical and serosal surfaces.', 'tissueTypes');
  }
  return c.out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, comment, validate };
