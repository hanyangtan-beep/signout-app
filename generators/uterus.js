import { stripDot, checks } from './_house.js';
import { tubeLesion, lesionMicro, lesionCloser, lesionChecks, LESION_DX, STIC, STIL, P53_SIGNATURE } from './_tube.js';
// Uterus (benign hysterectomy / myomectomy +/- adnexa) generator. Pure functions: (part, ctx) -> string.
// One part per specimen container; the `specimenName` select decides the part type:
//   uterus     "Uterus and cervix, total hysterectomy" / "Uterus, cervix and bilateral adnexa" / "Uterus, subtotal"
//   myomectomy "Myomectomy"
//   adnexa     "Left tube and ovary" / "Right tube and ovary"
//   tubes      "Fallopian tube(s), sterilisation"
//   tube       "Left fallopian tube, salpingectomy" / "Right fallopian tube, salpingectomy"
//   paratubal  "Paratubal cyst, excision" (side from `paratubalSide`)
// Blocks produced (uterus):
//   specimens  "Uterus and cervix, total hysterectomy"
//   macro      "(A) Received in formalin is a total hysterectomy specimen weighing 180 g. The uterus measures
//               9 x 6 x 4 cm. The serosa is smooth. The cervix is unremarkable. The endometrium measures up to
//               0.3 cm in thickness. The myometrium is trabeculated. Sectioning shows three intramural
//               leiomyomas measuring up to 4 cm with a whorled cut surface. Representative sections in 8 blocks."
//   blockKey   "(A) (1-2) Anterior cervix and posterior cervix. (3-4) Anterior and posterior endomyometrium.
//               (5-7) Leiomyomas. (8) Lower uterine segment."
//   microscopy "(A) Sections of the uterus show adenomyosis with scattered islands of endometrial glands and
//               stroma in the myometrium. Intramural and subserosal leiomyomata with no coagulative necrosis are
//               seen. Mitoses are inconspicuous and there is no cytological atypia. The endometrial cavity shows
//               weakly proliferative endometrium without hyperplasia. The cervix shows no evidence of squamous
//               intraepithelial lesion, glandular dysplasia, or malignancy."
//   diagnosis  "(A) UTERUS AND CERVIX, total hysterectomy - LEIOMYOMAS; ADENOMYOSIS; weakly proliferative
//               endometrium" (Phase 66: the cervix is named only when it has a finding)
// Adnexa parts: "(B) LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy - NO SIGNIFICANT PATHOLOGY".
// Tube parts: "(A) Left FALLOPIAN TUBE, salpingectomy - PARATUBAL CYST" and "(A) FALLOPIAN TUBE, left paratubal
// cyst, excision - PARATUBAL CYST", the house heads of the 2021-2026 biopsy export (docs/specs/fallopian-tube.md).
// Hyperplasia / HSIL options give a short diagnosis line only; the schema snippets
// `uterus_endometrial_template` / `uterus_cervix_template` add the QMH cancer-template comment.
// Attached tubes and ovaries (Phase 74): a total or subtotal hysterectomy part names what came with it
// (`attachedAdnexa`): bilateral tubes and ovaries prints exactly as "Uterus, cervix and bilateral adnexa";
// bilateral tubes, or one tube and ovary, print their own head ("UTERUS, CERVIX, LEFT FALLOPIAN TUBE AND
// OVARY, total hysterectomy and left salpingo-oophorectomy"), macroscopy, block key and microscopy.
// Leiomyoma assessment (Phase 74): type, changes, atypia, mitotic count, coagulative tumour cell necrosis
// and FH immunohistochemistry; the usual type with nothing recorded prints the wording of before.
// Tube lesions (Phase 74): p53 signature, STIL and STIC on any tube or adnexa part, with p53 and Ki-67,
// read as on the benign tube and ovary form (generators/_tube.js).
// Wording is protected by tests/uterus.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
/** Option strings may carry an en dash ("HSIL – see comment") or a hyphen; compare on the hyphen form. */
const key = (s) => String(s || '').replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
export const word = (n) => (n >= 0 && n <= 9 ? WORDS[n] : String(n));

// ---------- part types ----------

export const TOTAL = 'Uterus and cervix, total hysterectomy';
export const TOTAL_BSO = 'Uterus, cervix and bilateral adnexa';
export const SUBTOTAL = 'Uterus, subtotal';
export const MYOMECTOMY = 'Myomectomy';
export const LEFT_ADNEXA = 'Left tube and ovary';
export const RIGHT_ADNEXA = 'Right tube and ovary';
export const TUBES = 'Fallopian tube(s), sterilisation';
export const LEFT_TUBE = 'Left fallopian tube, salpingectomy';
export const RIGHT_TUBE = 'Right fallopian tube, salpingectomy';
export const PARATUBAL = 'Paratubal cyst, excision';

export const kindOf = (v) => {
  switch (v.specimenName) {
    case MYOMECTOMY: return 'myomectomy';
    case LEFT_ADNEXA:
    case RIGHT_ADNEXA: return 'adnexa';
    case TUBES: return 'tubes';
    case LEFT_TUBE:
    case RIGHT_TUBE: return 'tube';
    case PARATUBAL: return 'paratubal';
    default: return 'uterus';
  }
};
export const isUterus = (v) => kindOf(v) === 'uterus';
export const hasCervix = (v) => v.specimenName === TOTAL || v.specimenName === TOTAL_BSO || !v.specimenName;

// Tubes and ovaries attached to a total or subtotal hysterectomy part (`attachedAdnexa`).
export const ATTACH_BOTH = 'Bilateral tubes and ovaries';
export const ATTACH_TUBES = 'Bilateral tubes';
export const ATTACH_LEFT = 'Left tube and ovary';
export const ATTACH_RIGHT = 'Right tube and ovary';
const ATTACH = {
  [ATTACH_BOTH]: { what: 'bilateral adnexa', proc: 'bilateral salpingo-oophorectomy' },
  [ATTACH_TUBES]: { what: 'bilateral fallopian tubes', proc: 'bilateral salpingectomy' },
  [ATTACH_LEFT]: { what: 'left fallopian tube and ovary', proc: 'left salpingo-oophorectomy' },
  [ATTACH_RIGHT]: { what: 'right fallopian tube and ovary', proc: 'right salpingo-oophorectomy' }
};
/** What came attached to a hysterectomy part; "Uterus, cervix and bilateral adnexa" is both tubes and ovaries. '' when none. */
export const attached = (v) => {
  if (v.specimenName === TOTAL_BSO) return ATTACH_BOTH;
  if (v.specimenName && v.specimenName !== TOTAL && v.specimenName !== SUBTOTAL) return '';
  return ATTACH[v.attachedAdnexa] ? v.attachedAdnexa : '';
};
export const hasAdnexa = (v) => !!attached(v) || kindOf(v) === 'adnexa' || kindOf(v) === 'tubes';
const side = (v) => (v.specimenName === LEFT_ADNEXA || attached(v) === ATTACH_LEFT ? 'left'
  : v.specimenName === RIGHT_ADNEXA || attached(v) === ATTACH_RIGHT ? 'right' : '');
const tubeSide = (v) => (v.specimenName === LEFT_TUBE ? 'left' : v.specimenName === RIGHT_TUBE ? 'right' : '');
const paratubalSide = (v) => (v.paratubalSide === 'Left' || v.paratubalSide === 'Right' ? v.paratubalSide.toLowerCase() : '');

/** "Uterus, cervix, left fallopian tube and ovary, total hysterectomy and left salpingo-oophorectomy"; capitals for the diagnosis head. */
function attachedName(v, caps) {
  const p = ATTACH[attached(v)];
  const sub = v.specimenName === SUBTOTAL;
  const organ = sub ? 'Uterus' : 'Uterus, cervix';
  const joiner = / and /.test(p.what) ? ', ' : caps ? ' AND ' : ' and ';
  const lead = `${caps ? organ.toUpperCase() : organ}${joiner}${caps ? p.what.toUpperCase() : p.what}`;
  return `${lead}, ${sub ? 'subtotal' : 'total'} hysterectomy and ${p.proc}`;
}

// A leiomyoma prints only when recorded (Phase 74; it opened Present before). A myomectomy part opens
// Present through the schema's `defaultByField`, and the pasted line or history can turn it on.
export const leiomyomaPresent = (v) => v.leiomyoma === 'Present' && (isUterus(v) || kindOf(v) === 'myomectomy');
export const adenomyosisPresent = (v) => isUterus(v) && v.adenomyosis === 'Present';
const leiomyomaCount = (v) => {
  const n = num(v.leiomyomaCount);
  return n === null ? null : Math.max(0, Math.round(n));
};
/** Singular when exactly one leiomyoma is counted; a myomectomy is singular unless counted otherwise. */
const singleLeiomyoma = (v) => {
  const n = leiomyomaCount(v);
  if (n !== null) return n === 1;
  return kindOf(v) === 'myomectomy';
};

const HYPERPLASIA = ['Hyperplasia without atypia - see comment', 'Atypical hyperplasia - see comment'];
export const endometriumNeoplastic = (v) => isUterus(v) && HYPERPLASIA.includes(key(v.endometrium));
export const cervixNeoplastic = (v) => hasCervix(v) && isUterus(v) && key(v.cervix) === 'HSIL - see comment';
export const polypPresent = (v) => isUterus(v) && (v.endometrium === 'Endometrial polyp' || !!String(v.polypSize || '').trim());

/** Ticked adnexal findings, "Unremarkable" removed; [] when nothing significant. */
export const adnexaFindings = (v) => (Array.isArray(v.adnexaFindings) ? v.adnexaFindings : []).filter((f) => f && f !== 'Unremarkable');
/** Ticked findings on a salpingectomy part or attached bilateral tubes, "Unremarkable" removed; [] when nothing significant. */
export const tubeFindings = (v) => ((kindOf(v) === 'tube' || attached(v) === ATTACH_TUBES) && Array.isArray(v.tubeFindings) ? v.tubeFindings : []).filter((f) => f && f !== 'Unremarkable');
/** The findings list that holds this part's tube lesions (p53 signature, STIL, STIC); [] for a part without a tube. */
export const lesionFindings = (v) => {
  const kind = kindOf(v);
  if (kind === 'tube') return tubeFindings(v);
  if (kind === 'adnexa' || kind === 'tubes') return adnexaFindings(v);
  if (kind === 'uterus') return attached(v) === ATTACH_TUBES ? tubeFindings(v) : attached(v) ? adnexaFindings(v) : [];
  return [];
};

// ---------- specimen phrases ----------

const SPECIMEN = {
  [TOTAL]: 'Uterus and cervix, total hysterectomy',
  [TOTAL_BSO]: 'Uterus, cervix and bilateral adnexa, total hysterectomy and bilateral salpingo-oophorectomy',
  [SUBTOTAL]: 'Uterus, subtotal hysterectomy',
  [MYOMECTOMY]: 'Myomectomy',
  [LEFT_ADNEXA]: 'Left fallopian tube and ovary, salpingo-oophorectomy',
  [RIGHT_ADNEXA]: 'Right fallopian tube and ovary, salpingo-oophorectomy',
  [TUBES]: 'Fallopian tubes, sterilisation',
  [LEFT_TUBE]: 'Left fallopian tube, salpingectomy',
  [RIGHT_TUBE]: 'Right fallopian tube, salpingectomy',
  [PARATUBAL]: 'Paratubal cyst, excision'
};

const DX_HEAD = {
  [TOTAL]: 'UTERUS AND CERVIX, total hysterectomy',
  [TOTAL_BSO]: 'UTERUS, CERVIX AND BILATERAL ADNEXA, total hysterectomy and bilateral salpingo-oophorectomy',
  [SUBTOTAL]: 'UTERUS, subtotal hysterectomy',
  [MYOMECTOMY]: 'MYOMECTOMY',
  [LEFT_ADNEXA]: 'LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy',
  [RIGHT_ADNEXA]: 'RIGHT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy',
  [TUBES]: 'FALLOPIAN TUBES, bilateral, sterilisation',
  [LEFT_TUBE]: 'Left FALLOPIAN TUBE, salpingectomy',
  [RIGHT_TUBE]: 'Right FALLOPIAN TUBE, salpingectomy',
  [PARATUBAL]: 'FALLOPIAN TUBE, paratubal cyst, excision'
};

export function specimenName(part) {
  const v = part.values;
  const raw = (v.specimenName || '').trim();
  if (raw === PARATUBAL && paratubalSide(v)) return `${uc1(paratubalSide(v))} paratubal cyst, excision`;
  if (attached(v) && raw !== TOTAL_BSO) return attachedName(v, false);
  return SPECIMEN[raw] || raw || SPECIMEN[TOTAL];
}

// ---------- macroscopic description ----------

/** "9x6x4" -> "9 x 6 x 4 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** Thickness as typed ("0.3 cm", "3 mm"); a bare number is read as mm when >= 1, else cm. '' when blank. */
export function thicknessPhrase(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (/cm|mm/i.test(s)) return s.replace(/\s*(cm|mm)$/i, ' $1').replace(/\s+/g, ' ');
  const n = num(s);
  if (n === null) return s;
  return n >= 1 ? `${fmt(n)} mm` : `${fmt(n)} cm`;
}

/** "180" -> "180 g"; '' when blank. */
export function weightPhrase(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/g$/i.test(s)) return s.replace(/\s*g$/i, ' g');
  return `${s} g`;
}

const SEROSA = {
  Smooth: 'The serosa is smooth.',
  'Distorted by nodules': 'The serosa is distorted by bosselated nodules.',
  'Fibrous adhesions': 'The serosa shows fibrous adhesions.'
};

const MYOMETRIUM = {
  Unremarkable: '',
  Trabeculated: 'The myometrium is trabeculated.',
  'Trabeculated with pinpoint haemorrhages (adenomyosis)': 'The myometrium is trabeculated with pinpoint haemorrhagic foci.'
};

const CUT_SURFACE = {
  Whorled: 'a whorled cut surface',
  Degenerate: 'a soft, degenerate cut surface',
  Haemorrhagic: 'a haemorrhagic cut surface',
  Calcified: 'a gritty, calcified cut surface'
};

const LOCATION_ADJ = { Intramural: 'intramural', Subserosal: 'subserosal', Submucosal: 'submucosal' };

/** "three intramural leiomyomas" / "leiomyomas at intramural and subserosal sites" / "a single subserosal leiomyoma". */
function leiomyomaNoun(v) {
  const n = leiomyomaCount(v);
  const loc = LOCATION_ADJ[v.leiomyomaLocation];
  const single = singleLeiomyoma(v);
  const noun = single ? 'leiomyoma' : 'leiomyomas';
  const count = n === null ? (single ? 'a' : '') : n === 1 ? 'a single' : word(n);
  const words = [count, loc, noun].filter(Boolean).join(' ');
  return loc ? words : `${words} at intramural and subserosal sites`;
}

function leiomyomaMacro(v) {
  if (!leiomyomaPresent(v)) return '';
  const size = sizePhrase(v.leiomyomaSize);
  const single = singleLeiomyoma(v);
  const cut = CUT_SURFACE[v.cutSurface] || CUT_SURFACE.Whorled;
  return `Sectioning shows ${leiomyomaNoun(v)}${size ? ` measuring ${single ? '' : 'up to '}${size}` : ''} with ${cut}.`;
}

/** "right 2 x 1.5 x 0.8, left 2.5 x 1.5 x 1" → { right, left } size phrases; null for a single value. */
export function sidedSizes(raw) {
  const m = /^\s*(right|left)\s+([^,;]+?)\s*[,;]\s*(right|left)\s+(.+?)\s*$/i.exec(String(raw || ''));
  if (!m || m[1].toLowerCase() === m[3].toLowerCase()) return null;
  const unit = /cm|mm/i.exec(m[4])?.[0] || '';
  const withUnit = (t) => sizePhrase(/cm|mm/i.test(t) ? t : `${t}${unit ? ` ${unit}` : ''}`);
  const out = {};
  out[m[1].toLowerCase()] = withUnit(m[2]);
  out[m[3].toLowerCase()] = withUnit(m[4]);
  return out;
}

/** "5 x 0.6" -> "5 cm in length and 0.6 cm in diameter"; "5" -> "5 cm in length"; any other form as a size phrase. */
export function tubeMeasure(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  const m = /^(\d+(?:\.\d+)?)\s*(?:cm)?(?:\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:cm)?)?$/.exec(t);
  if (!m) return sizePhrase(t);
  return `${m[1]} cm in length${m[2] ? ` and ${m[2]} cm in diameter` : ''}`;
}

function adnexaMacro(v) {
  const s = [];
  const tube = sizePhrase(v.tubeSize);
  const ovary = sizePhrase(v.ovarySize);
  const cyst = sizePhrase(v.cystSize);
  const a = attached(v);
  const tubesOnly = a === ATTACH_TUBES;
  const findings = tubesOnly ? tubeFindings(v) : adnexaFindings(v);
  if (a === ATTACH_BOTH || tubesOnly) {
    const t2 = sidedSizes(v.tubeSize), o2 = sidedSizes(v.ovarySize);
    if (t2) s.push(`The right fallopian tube measures ${t2.right} and the left fallopian tube ${t2.left}.`);
    else if (tube) s.push(`The fallopian tubes measure up to ${tube}.`);
    if (!tubesOnly) {
      if (o2) s.push(`The right ovary measures ${o2.right} and the left ovary ${o2.left}.`);
      else if (ovary) s.push(`The ovaries measure up to ${ovary}.`);
    }
  } else {
    // A separate tube-and-ovary part is its own side; one attached to a uterus names it.
    const sd = a ? `${side(v)} ` : '';
    if (tube) s.push(`The ${sd}fallopian tube measures ${tube}.`);
    if (ovary) s.push(`The ${sd}ovary measures ${ovary}${findings.length ? '' : ' with an unremarkable cut surface'}.`);
  }
  if (cyst) {
    if (findings.includes('Paratubal cyst')) s.push(`A thin-walled paratubal cyst measuring ${cyst} is attached to the fallopian tube.`);
    else if (findings.includes('Hydrosalpinx')) s.push(`The fallopian tube is cystically dilated to ${cyst}.`);
    else if (tubesOnly) s.push(`A thin-walled cyst measuring ${cyst} is attached to the fallopian tube.`);
    else s.push(`The ovary contains a thin-walled cyst measuring ${cyst}.`);
  }
  return s;
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const weight = weightPhrase(v.weight);
  const size = sizePhrase(v.dimensions);
  const kind = kindOf(v);
  const blocks = blockCount(v);
  if (kind === 'uterus') {
    const a = attached(v);
    const noun = `${v.specimenName === SUBTOTAL ? 'subtotal' : 'total'} hysterectomy${a ? ` and ${ATTACH[a].proc}` : ''} specimen`;
    s.push(`Received in formalin is a ${noun}${weight ? ` weighing ${weight}` : ''}.`);
    if (size) s.push(`The uterus measures ${size}.`);
    s.push(SEROSA[v.serosa] || '');
    if (hasCervix(v)) s.push(v.cervixMacro === 'Nabothian cysts' ? 'The cervix shows nabothian cysts.' : 'The cervix is unremarkable.');
    const thick = thicknessPhrase(v.endometriumThickness);
    if (thick) s.push(`The endometrium measures up to ${thick} in thickness.`);
    const polyp = sizePhrase(v.polypSize);
    if (polyp) s.push(`A polyp measuring ${polyp} is present in the endometrial cavity.`);
    else if (polypPresent(v)) s.push('A polyp is present in the endometrial cavity.');
    s.push(MYOMETRIUM[v.myometrium] || '');
    s.push(leiomyomaMacro(v));
    if (hasAdnexa(v)) s.push(...adnexaMacro(v));
    s.push(`Representative sections in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  } else if (kind === 'myomectomy') {
    const n = leiomyomaCount(v);
    const single = singleLeiomyoma(v);
    const pieces = single ? 'a well-circumscribed firm nodule' : n === null ? 'well-circumscribed firm nodules' : `${word(n)} well-circumscribed firm nodules`;
    const largest = sizePhrase(v.leiomyomaSize);
    const verb = single ? 'is' : 'are';
    const details = [weight ? `weighing ${weight}` : '', size ? `measuring ${size} in aggregate` : ''].filter(Boolean).join(' and ');
    s.push(`Received in formalin ${verb} ${pieces}${details ? ` ${details}` : ''}.`);
    if (largest) s.push(single ? `The nodule measures ${largest}.` : `The largest nodule measures ${largest}.`);
    s.push(`The cut surface is ${(CUT_SURFACE[v.cutSurface] || CUT_SURFACE.Whorled).replace(/^a /, '').replace(/ cut surface$/, '')}.`);
    s.push(`Representative sections in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  } else if (kind === 'adnexa') {
    s.push(`Received in formalin is a ${side(v)} salpingo-oophorectomy specimen.`);
    s.push(...adnexaMacro(v));
    s.push(`Representative sections in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  } else if (kind === 'tube') {
    const length = tubeMeasure(v.tubeSize);
    const cyst = sizePhrase(v.cystSize);
    const findings = tubeFindings(v);
    s.push(`Received in formalin is a ${tubeSide(v)} fallopian tube${length ? ` measuring ${length}` : ''}.`);
    if (findings.includes('Paratubal cyst')) s.push(`A thin-walled paratubal cyst${cyst ? ` measuring ${cyst}` : ''} is attached.`);
    else if (cyst && findings.includes('Hydrosalpinx')) s.push(`The fallopian tube is cystically dilated to ${cyst}.`);
    else if (cyst) s.push(`A thin-walled cyst measuring ${cyst} is attached.`);
    s.push(`All embedded in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  } else if (kind === 'paratubal') {
    const cyst = sizePhrase(v.cystSize);
    s.push(`Received in formalin is a thin-walled paratubal cyst${cyst ? ` measuring ${cyst}` : ''}.`);
    s.push(`All embedded in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  } else {
    const tube = String(v.tubeSize || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
    s.push(`Received in formalin are two segments of fallopian tube${tube ? ` measuring ${/cm|mm/i.test(tube) ? tube : `${tube} cm`} in length` : ''}.`);
    const cyst = sizePhrase(v.cystSize);
    if (cyst) s.push(`A thin-walled paratubal cyst measuring ${cyst} is attached.`);
    s.push(`All embedded in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  }
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

/** Block key items as [label, blockCount] pairs for the part type. */
export function blockItems(v) {
  const kind = kindOf(v);
  const items = [];
  if (kind === 'uterus') {
    if (hasCervix(v)) items.push(['Anterior cervix and posterior cervix', 2]);
    items.push(['Anterior and posterior endomyometrium', 2]);
    if (leiomyomaPresent(v)) items.push([singleLeiomyoma(v) ? 'Leiomyoma' : 'Leiomyomas', 3]);
    if (polypPresent(v)) items.push(['Endometrial polyp', 1]);
    items.push(['Lower uterine segment', 1]);
    const a = attached(v);
    if (a === ATTACH_BOTH) {
      items.push(['Left fallopian tube, sectioned', 1], ['Left ovary', 2], ['Right fallopian tube, sectioned', 1], ['Right ovary', 2]);
    } else if (a === ATTACH_TUBES) {
      items.push(['Left fallopian tube, sectioned', 1], ['Right fallopian tube, sectioned', 1]);
    } else if (a) {
      items.push([`${uc1(side(v))} fallopian tube, sectioned`, 1], [`${uc1(side(v))} ovary`, 2]);
    }
  } else if (kind === 'myomectomy') {
    items.push([singleLeiomyoma(v) ? 'Leiomyoma, representative sections' : 'Leiomyomas, representative sections', 4]);
  } else if (kind === 'adnexa') {
    items.push(['Fallopian tube, sectioned', 1], ['Ovary', 2]);
  } else if (kind === 'tube') {
    items.push(['Fimbria', 1], ['Cross sections of the fallopian tube', 1]);
    if (tubeFindings(v).includes('Paratubal cyst')) items.push(['Paratubal cyst', 1]);
  } else if (kind === 'paratubal') {
    items.push(['Cyst wall', 1]);
  } else {
    items.push(['Left fallopian tube', 1], ['Right fallopian tube', 1]);
  }
  return items;
}

/** Block count: the typed number, else the total of the automatic block key (8 for a uterus with leiomyomas, 3 for adnexa). */
export function blockCount(v) {
  const typed = num(v.blocks);
  if (typed !== null) return Math.max(1, Math.round(typed));
  return Math.max(1, blockItems(v).reduce((t, [, n]) => t + n, 0));
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const override = stripDot(v.blockKeyText);
  if (override) return `(${part.label}) ${override}.`;
  const items = blockItems(v);
  const typed = num(v.blocks);
  // When the typed block total differs from the automatic key, the last item absorbs the difference.
  if (typed !== null && items.length) {
    const auto = items.reduce((t, [, n]) => t + n, 0);
    const diff = Math.max(1, Math.round(typed)) - auto;
    const last = items[items.length - 1];
    last[1] = Math.max(1, last[1] + diff);
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

// ---------- leiomyoma assessment (Phase 74) ----------
// Types and changes follow PathologyOutlines (https://www.pathologyoutlines.com/topic/uterusleiomyoma.html,
// https://www.pathologyoutlines.com/topic/uterusstump.html, https://www.pathologyoutlines.com/topic/stainsFH2SC.html);
// infarct-type necrosis is told from coagulative tumour cell necrosis by the granulation tissue or
// hyalinisation between necrotic and viable tumour (https://www.nature.com/articles/modpathol2015139).
// Sources and the criteria behind each choice: docs/reference/uterus-leiomyoma-sources.md. The printed
// sentences say what is seen; no criterion or threshold is printed.
export const LM_STUMP = 'STUMP - see comment';
export const LM_FH = 'Fumarate hydratase-deficient - see comment';
export const LM_IVL = 'Intravenous leiomyomatosis - see comment';
const LM_DIFFUSE = 'Diffuse leiomyomatosis';
// adj: word before "leiomyoma" in the microscopy; noun: replaces it; note: the type's own sentence;
// dx: the diagnosis (singular; "LEIOMYOMA" takes "S" for several); fixed: no plural and no change suffix;
// comment: prints "see comment" and a comment.
const LM = {
  Usual: { dx: 'LEIOMYOMA' },
  Cellular: { adj: 'cellular', dx: 'CELLULAR LEIOMYOMA', note: 'Cellularity is increased compared with the surrounding myometrium.' },
  'Mitotically active': { adj: 'mitotically active', dx: 'MITOTICALLY ACTIVE LEIOMYOMA' },
  'With bizarre nuclei': { dx: 'LEIOMYOMA with BIZARRE NUCLEI', note: 'Bizarre cells with enlarged, hyperchromatic, multilobated nuclei are present in a background of usual leiomyoma.' },
  [LM_FH]: { adj: 'fumarate hydratase-deficient', dx: 'FUMARATE HYDRATASE-DEFICIENT LEIOMYOMA', comment: true,
    note: 'Staghorn vessels, alveolar-pattern oedema, eosinophilic cytoplasmic globules and nuclei with prominent eosinophilic nucleoli and perinucleolar halos are seen.' },
  Lipoleiomyoma: { noun: 'lipoleiomyoma', dx: 'LIPOLEIOMYOMA', note: 'Mature adipocytes are intermingled with the spindled smooth muscle cells.' },
  Epithelioid: { adj: 'epithelioid', dx: 'EPITHELIOID LEIOMYOMA', note: 'The tumour cells are round to polygonal, with eosinophilic to clear cytoplasm.' },
  Myxoid: { adj: 'myxoid', dx: 'MYXOID LEIOMYOMA', note: 'The smooth muscle cells are widely separated by myxoid matrix, with a well-circumscribed border.' },
  Apoplectic: { dx: 'LEIOMYOMA with APOPLECTIC CHANGE', note: 'Stellate zones of recent haemorrhage are surrounded by hypercellular smooth muscle, in keeping with apoplectic change.' },
  Hydropic: { adj: 'hydropic', dx: 'HYDROPIC LEIOMYOMA', note: 'Oedema fluid separates the smooth muscle cells into cords and nodules.' },
  Dissecting: { adj: 'dissecting', dx: 'DISSECTING LEIOMYOMA', note: 'Tongues of bland smooth muscle dissect between the bundles of the surrounding myometrium.' },
  [LM_DIFFUSE]: { dx: 'DIFFUSE LEIOMYOMATOSIS', fixed: true, note: 'Innumerable small, ill-defined nodules of bland smooth muscle involve the myometrium diffusely.' },
  [LM_IVL]: { dx: 'INTRAVENOUS LEIOMYOMATOSIS', fixed: true, comment: true, note: 'Bland smooth muscle tumour is also present within vascular spaces, in keeping with intravenous leiomyomatosis.' },
  [LM_STUMP]: { dx: 'SMOOTH MUSCLE TUMOUR OF UNCERTAIN MALIGNANT POTENTIAL (STUMP)', fixed: true, comment: true }
};
/** The leiomyoma type key (hyphen form); 'Usual' when blank or unknown. */
export const lmType = (v) => (LM[key(v.leiomyomaType)] ? key(v.leiomyomaType) : 'Usual');

const CHANGE = {
  'Hyaline degeneration': 'hyaline degeneration',
  'Hydropic change': 'hydropic change',
  'Myxoid change': 'myxoid change',
  'Cystic degeneration': 'cystic degeneration',
  'Red degeneration': 'red (haemorrhagic) degeneration',
  'Infarct-type necrosis': 'infarct-type necrosis',
  Calcification: 'calcification'
};
// The single `degeneration` select of before Phase 74; a case saved with it (no `changes` key) still prints it.
const LEGACY_DEGENERATION = { Hyaline: 'Hyaline degeneration', Cystic: 'Cystic degeneration', Red: 'Red degeneration', Calcific: 'Calcification' };
/** Ticked leiomyoma changes (option names, in option order). */
export const lmChanges = (v) => {
  if (!Array.isArray(v.changes)) return LEGACY_DEGENERATION[v.degeneration] ? [LEGACY_DEGENERATION[v.degeneration]] : [];
  return Object.keys(CHANGE).filter((c) => v.changes.includes(c));
};
const INFARCT = 'Infarct-type necrosis';
const ATYPIA = { Mild: 'mild', 'Focal moderate to severe': 'focal moderate to severe', 'Diffuse moderate to severe': 'diffuse moderate to severe' };
const atypiaWord = (v) => ATYPIA[v.atypia] || '';
const tumourNecrosis = (v) => v.tumourNecrosis === 'Present';

/** "6" or "6/10 HPF" -> "6 per 10 HPF"; "2/mm2" or "2 per mm²" -> "2 per mm2"; '' when blank; other text as typed. */
export function mitoticPhrase(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const n = '(\\d+(?:\\.\\d+)?)\\s*(?:mitos[ie]s|mitotic figures|mf)?\\s*(?:\\/|per)?\\s*';
  let m = new RegExp(`^${n}(?:10\\s*(?:hpfs?|high[- ]power fields?))?$`, 'i').exec(s);
  if (m) return `${m[1]} per 10 HPF`;
  m = new RegExp(`^${n}(?:1\\s*)?(?:mm2|mm\u00b2|mm\\^2|sq\\.?\\s*mm|square mm)$`, 'i').exec(s);
  if (m) return `${m[1]} per mm2`;
  return s;
}

/** The leiomyoma diagnosis: "CELLULAR LEIOMYOMAS", "LEIOMYOMA with BIZARRE NUCLEI and INFARCT-TYPE NECROSIS", "STUMP" in full. */
export function leiomyomaDx(v) {
  const T = LM[lmType(v)];
  let dx = !T.fixed && !singleLeiomyoma(v) ? T.dx.replace(/LEIOMYOMA\b/, 'LEIOMYOMAS') : T.dx;
  if (!T.fixed && lmChanges(v).includes(INFARCT)) dx += / with /.test(dx) ? ' and INFARCT-TYPE NECROSIS' : ' with INFARCT-TYPE NECROSIS';
  return dx;
}
export const leiomyomaNeedsComment = (v) => leiomyomaPresent(v) && !!LM[lmType(v)].comment;

const FH_SENTENCE = {
  Lost: 'Immunohistochemistry shows loss of fumarate hydratase expression in the tumour cells, with retained staining in the vessels.',
  Retained: 'Immunohistochemistry shows retained fumarate hydratase expression in the tumour cells.'
};

const LOCATION_MICRO = {
  Intramural: 'Intramural',
  Subserosal: 'Subserosal',
  Submucosal: 'Submucosal',
  'Multiple sites': 'Intramural and subserosal'
};

/** "Mitoses number 6 per 10 HPF and there is mild cytological atypia."; the usual type reads as before Phase 74. */
function mitosesAtypia(v, t) {
  const m = mitoticPhrase(v.mitoticCount);
  const mit = m ? `Mitoses number ${m}` : t === 'Mitotically active' ? 'Mitotic activity is increased' : 'Mitoses are inconspicuous';
  const a = atypiaWord(v);
  const aty = a ? `there is ${a} cytological atypia` : t === 'With bizarre nuclei' ? '' : 'there is no cytological atypia';
  return aty ? `${mit} and ${aty}.` : `${mit}.`;
}

function stumpMicro(v, opening, loc) {
  const noun = `${/^[aeiou]/.test(loc) ? 'an' : 'a'} ${loc} smooth muscle tumour composed of intersecting fascicles of spindle cells`;
  const s = [opening ? `Sections of the uterus show ${noun}.` : `${uc1(noun)} is seen.`];
  const a = atypiaWord(v);
  s.push(a ? `There is ${a} cytological atypia.` : 'There is no significant cytological atypia.');
  const m = mitoticPhrase(v.mitoticCount);
  s.push(m ? `Mitoses number ${m}.` : 'Mitoses are inconspicuous.');
  const changes = lmChanges(v);
  const infarct = changes.includes(INFARCT);
  if (tumourNecrosis(v)) s.push(`Coagulative tumour cell necrosis is present${infarct ? ', with areas of infarct-type necrosis' : ''}.`);
  else s.push(infarct ? 'Areas of infarct-type necrosis are present, with no coagulative tumour cell necrosis.' : 'There is no coagulative tumour cell necrosis.');
  const other = changes.filter((c) => c !== INFARCT).map((c) => CHANGE[c]);
  if (other.length) s.push(`Areas of ${listJoin(other)} are present.`);
  if (FH_SENTENCE[v.fhIhc]) s.push(FH_SENTENCE[v.fhIhc]);
  s.push('The features are those of a smooth muscle tumour of uncertain malignant potential (STUMP); see comment.');
  return s.join(' ');
}

function leiomyomaMicro(v, opening) {
  const t = lmType(v);
  const T = LM[t];
  const loc = (LOCATION_MICRO[v.leiomyomaLocation] || 'Intramural').toLowerCase();
  if (t === LM_STUMP) return stumpMicro(v, opening, loc);
  const single = singleLeiomyoma(v);
  const changes = lmChanges(v);
  const infarct = changes.includes(INFARCT);
  const shown = changes.filter((c) => c !== INFARCT).map((c) => CHANGE[c]);
  const withDegen = shown.length ? ` showing ${listJoin(shown)}` : '';
  // Infarct-type necrosis has its own sentence; with nothing recorded the line reads as before Phase 74.
  const necrosis = tumourNecrosis(v) ? ' with coagulative tumour cell necrosis' : infarct ? '' : ' with no coagulative necrosis';
  let first;
  if (t === LM_DIFFUSE) {
    first = opening ? `Sections of the uterus show diffuse leiomyomatosis${withDegen}${necrosis}.` : `Diffuse leiomyomatosis${withDegen}${necrosis} is seen.`;
  } else {
    const base = T.noun || [T.adj, 'leiomyoma'].filter(Boolean).join(' ');
    const core = `${loc} ${single ? base : base.replace(/leiomyoma$/, 'leiomyomata')}`;
    const noun = single ? `${/^[aeiou]/.test(core) ? 'an' : 'a'} ${core}` : core;
    first = opening
      ? `Sections of the uterus show ${noun}${withDegen}${necrosis}.`
      : `${uc1(noun)}${withDegen}${necrosis} ${single ? 'is' : 'are'} seen.`;
  }
  const s = [first];
  if (infarct) s.push(tumourNecrosis(v) ? 'Areas of infarct-type necrosis are also present.' : 'Areas of infarct-type necrosis are present, with no coagulative tumour cell necrosis.');
  if (T.note && t !== LM_IVL) s.push(T.note);
  s.push(mitosesAtypia(v, t));
  if (t === LM_IVL) s.push(`${T.note.replace(/\.$/, '')}; see comment.`);
  if (FH_SENTENCE[v.fhIhc]) s.push(FH_SENTENCE[v.fhIhc]);
  return s.join(' ');
}

/** Myomectomy microscopy: the house paragraph, with the type and the assessment where recorded. */
function myomectomyMicro(v) {
  const t = lmType(v);
  const T = LM[t];
  const s = ['Sections show pieces of smooth muscle tumour tissue comprising spindle cells arranged in fascicles and whorls. Thick walled vessels are seen.'];
  const changes = lmChanges(v).map((c) => CHANGE[c]);
  if (changes.length) s.push(`Areas of ${listJoin(changes)} are present.`);
  if (T.note && t !== 'Cellular') s.push(T.note);
  const a = atypiaWord(v);
  const m = mitoticPhrase(v.mitoticCount);
  if (a) s.push(`There is ${a} cytological atypia.`);
  if (m) s.push(`Mitoses number ${m}.`);
  else if (t === 'Mitotically active') s.push('Mitotic activity is increased.');
  if (tumourNecrosis(v)) s.push('Coagulative tumour cell necrosis is present.');
  // The house negative sentence, less whatever is recorded above.
  const neg = [];
  if (t !== 'Epithelioid') neg.push('epithelioid tumour cells');
  if (!a && t !== 'With bizarre nuclei') neg.push('significant nuclear atypia');
  if (!tumourNecrosis(v)) neg.push('coagulative tumour necrosis');
  if (!m && t !== 'Mitotically active') neg.push('frequent mitoses');
  if (neg.length) {
    const list = neg.length > 2 ? `${neg.slice(0, -1).join(', ')}, or ${neg[neg.length - 1]}` : neg.join(' or ');
    const verb = neg.length > 1 || /cells$|mitoses$/.test(neg[0]) ? 'are' : 'is';
    s.push(t === 'Cellular' ? `While the tumour cellularity is high, no ${list} ${verb} observed.` : `No ${list} ${verb} observed.`);
  } else if (t === 'Cellular') s.push('The tumour cellularity is high.');
  if (FH_SENTENCE[v.fhIhc]) s.push(FH_SENTENCE[v.fhIhc]);
  if (t === LM_STUMP) {
    s.push('The features are those of a smooth muscle tumour of uncertain malignant potential (STUMP); see comment.');
  } else {
    const name = T.dx.toLowerCase();
    s.push(`There is no evidence of malignancy. Features are those of ${name}${T.comment ? '; see comment' : ''}.`);
  }
  return s.join(' ');
}

const ENDOMETRIUM = {
  Proliferative: 'The endometrial cavity shows proliferative endometrium without hyperplasia.',
  Secretory: 'The endometrial cavity shows secretory endometrium without hyperplasia.',
  'Weakly proliferative': 'The endometrial cavity shows weakly proliferative endometrium without hyperplasia.',
  'Inactive-atrophic': 'The endometrial cavity shows inactive, atrophic endometrium without hyperplasia.',
  'Disordered proliferative': 'The endometrial cavity shows disordered proliferative endometrium with cystically dilated glands but no atypical hyperplasia.',
  'Endometrial polyp': 'Endometrial polyp with fibrotic stroma and thick-walled vessels is sampled. The background endometrium shows no hyperplasia.',
  'Hyperplasia without atypia - see comment': 'The endometrium shows crowded glands with an increased gland to stroma ratio and no cytological atypia, in keeping with endometrial hyperplasia without atypia; see comment.',
  'Atypical hyperplasia - see comment': 'The endometrium shows crowded glands with nuclear enlargement, rounding and loss of polarity, in keeping with atypical hyperplasia / endometrioid intraepithelial neoplasia; see comment.'
};

const CERVIX_NEG = 'The cervix shows no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy.';
const CERVIX = {
  'No SIL': CERVIX_NEG,
  'Chronic cervicitis': 'The cervix shows chronic cervicitis with no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy.',
  'Nabothian cysts': 'The cervix shows nabothian cysts with no evidence of squamous intraepithelial lesion, glandular dysplasia, or malignancy.',
  LSIL: 'The cervix shows a low grade squamous intraepithelial lesion (LSIL). There is no glandular dysplasia or invasive malignancy.',
  'HSIL - see comment': 'The cervix shows a high grade squamous intraepithelial lesion (HSIL); see comment.'
};

// One paratubal cyst sentence for adnexa, sterilisation and tube parts. The released adnexa reports
// name the cyst ("A right paratubal cyst is seen.") and none describes a flattened cuboidal lining;
// the tube reports that describe it say ciliated tubal-type epithelium (2021-2026 biopsy export).
const PARATUBAL_SENTENCE = 'A paratubal cyst is seen, with a fibrous wall lined by ciliated tubal-type epithelium.';

const TUBE_FINDINGS = {
  'Paratubal cyst': PARATUBAL_SENTENCE,
  Hydrosalpinx: 'The fallopian tube is dilated with attenuated plicae, in keeping with hydrosalpinx.'
};
const OVARY_FINDINGS = {
  'Cystic follicle': 'a cystic follicle',
  'Corpus luteum': 'a corpus luteum',
  'Corpus albicans': 'corpora albicantia'
};

// Salpingectomy and paratubal cyst parts. RCPath tissue pathways for gynaecological pathology (2023)
// section 10.3.1: confirm the tube and a complete cross-sectional profile, and report any abnormality.
// Sentences follow the house forms of the 2021-2026 biopsy export: "fibrous cyst wall lined by a single
// layer of ciliated tubal-type epithelium", "The features are consistent with paratubal cyst.", "a dilated
// lumen lined by benign tubal epithelium, consistent with hydrosalpinx". The adnexa sentences above
// (TUBE_FINDINGS) share the paratubal cyst sentence and keep their own hydrosalpinx sentence.
const TUBE_ONLY = {
  'Paratubal cyst': PARATUBAL_SENTENCE,
  'Chronic salpingitis': 'The plicae contain a chronic inflammatory infiltrate with plasma cells, in keeping with chronic salpingitis.',
  Endometriosis: 'Foci of endometrial glands and stroma with haemosiderin-laden macrophages are present, in keeping with endometriosis.'
};
const PARATUBAL_MICRO = 'Sections show a fibrous cyst wall lined by a single layer of ciliated tubal-type epithelium. The features are consistent with paratubal cyst.';

function tubeMicro(v) {
  const sd = tubeSide(v);
  const f = tubeFindings(v);
  const s = [];
  if (f.includes('Hydrosalpinx')) s.push(`Sections of the ${sd} fallopian tube show a dilated lumen lined by benign tubal epithelium, consistent with hydrosalpinx.`);
  else if (f.includes('Chronic salpingitis')) s.push(`Sections show fimbrial tissue and cross sections of the ${sd} fallopian tube.`);
  else s.push(`Sections show fimbrial tissue and cross sections of the ${sd} fallopian tube with unremarkable plicae.`);
  for (const x of Object.keys(TUBE_ONLY)) if (f.includes(x)) s.push(TUBE_ONLY[x]);
  return s;
}

/** Adnexal microscopy sentences; `plural` for bilateral adnexa in one part. */
function adnexaMicro(v, plural) {
  const findings = adnexaFindings(v);
  const kind = kindOf(v);
  const sd = side(v);
  const tubeNoun = plural ? 'fallopian tubes' : `${sd ? `${sd} ` : ''}fallopian tube`;
  const ovaryNoun = plural ? 'ovaries' : 'ovary';
  const s = [];
  if (kind === 'tubes') {
    s.push('Sections show complete cross sections of fallopian tube from both sides with unremarkable plicae.');
    for (const f of findings) if (TUBE_FINDINGS[f]) s.push(TUBE_FINDINGS[f]);
    s.push(...lesionMicro(v, findings));
    return s;
  }
  if (!findings.length) {
    s.push(`Sections of the ${tubeNoun} and ${ovaryNoun} show no significant pathology.`);
    return s;
  }
  s.push(`Sections of the ${tubeNoun} show unremarkable plicae.`);
  for (const f of findings) if (TUBE_FINDINGS[f]) s.push(TUBE_FINDINGS[f]);
  s.push(...lesionMicro(v, findings));
  const ov = findings.filter((f) => OVARY_FINDINGS[f]).map((f) => OVARY_FINDINGS[f]);
  const serous = findings.includes('Serous cystadenoma');
  const endometriosis = findings.includes('Endometriosis');
  if (ov.length) s.push(`The ${ovaryNoun} ${plural ? 'show' : 'shows'} ${listJoin(ov)}.`);
  else if (!serous && !endometriosis) s.push(`The ${ovaryNoun} ${plural ? 'are' : 'is'} unremarkable.`);
  if (serous) s.push(`The ${ovaryNoun} ${plural ? 'show' : 'shows'} a cyst lined by benign mullerian epithelium, underneath which benign fibrous stroma composed of bland spindle cells is seen. Features are those of a serous cystadenoma.`);
  if (endometriosis) s.push('Foci of endometrial glands and stroma with haemosiderin-laden macrophages are present, in keeping with endometriosis.');
  return s;
}

/** Both tubes attached to a hysterectomy without the ovaries (bilateral salpingectomy). */
function bilateralTubesMicro(v) {
  const f = tubeFindings(v);
  if (!f.length) return ['Sections of the fallopian tubes show no significant pathology.'];
  const plain = !f.includes('Hydrosalpinx') && !f.includes('Chronic salpingitis');
  const s = [`Sections show fimbrial tissue and cross sections of both fallopian tubes${plain ? ' with unremarkable plicae' : ''}.`];
  if (f.includes('Hydrosalpinx')) s.push(TUBE_FINDINGS.Hydrosalpinx);
  for (const x of Object.keys(TUBE_ONLY)) if (f.includes(x)) s.push(TUBE_ONLY[x]);
  s.push(...lesionMicro(v, f));
  return s;
}

/** Microscopy of the tubes and ovaries attached to a hysterectomy part. */
function attachedMicro(v) {
  const a = attached(v);
  if (a === ATTACH_TUBES) return bilateralTubesMicro(v);
  return adnexaMicro(v, a === ATTACH_BOTH);
}

export function microscopy(part) {
  const v = part.values;
  const kind = kindOf(v);
  const s = [];
  let closed = false;

  if (kind === 'uterus') {
    const adeno = adenomyosisPresent(v);
    const lm = leiomyomaPresent(v);
    if (adeno) {
      s.push('Sections of the uterus show adenomyosis with scattered islands of endometrial glands and stroma in the myometrium.');
      if (lm) s.push(leiomyomaMicro(v, false));
    } else if (lm) {
      s.push(leiomyomaMicro(v, true));
    } else {
      s.push('Sections of the uterus show unremarkable myometrium.');
    }
    // A STUMP is not followed by "There is no evidence of malignancy".
    const stump = lm && lmType(v) === LM_STUMP;
    s.push(ENDOMETRIUM[key(v.endometrium)] || ENDOMETRIUM.Proliferative);
    if (v.endometritis === 'Present') s.push('Plasma cells are present in the endometrial stroma, in keeping with chronic endometritis.');
    if (hasCervix(v)) {
      const c = CERVIX[key(v.cervix)] || CERVIX_NEG;
      s.push(c);
      if (!cervixNeoplastic(v) && v.cervix !== 'LSIL') closed = true;
    }
    if (attached(v)) s.push(...attachedMicro(v));
    // A STIC in an attached tube is not followed by a closing negative; a p53 signature or STIL reads
    // "There is no evidence of STIC or invasive malignancy."
    const stic = tubeLesion(lesionFindings(v)) === STIC;
    if (endometriumNeoplastic(v) || cervixNeoplastic(v) || stump || stic) closed = true;
    else if (!closed || attached(v)) { s.push(attached(v) ? lesionCloser(lesionFindings(v)) : 'There is no evidence of malignancy.'); closed = true; }
  } else if (kind === 'myomectomy') {
    if (leiomyomaPresent(v)) {
      s.push(myomectomyMicro(v));
    } else {
      s.push('Sections show pieces of unremarkable myometrium. There is no evidence of malignancy.');
    }
    closed = true;
  } else if (kind === 'tube') {
    s.push(...tubeMicro(v), ...lesionMicro(v, tubeFindings(v)));
    s.push(lesionCloser(tubeFindings(v)));
    closed = true;
  } else if (kind === 'paratubal') {
    s.push(PARATUBAL_MICRO);
    s.push('There is no evidence of malignancy.');
    closed = true;
  } else {
    s.push(...adnexaMicro(v, false));
    s.push(lesionCloser(adnexaFindings(v)));
    closed = true;
  }

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

// ---------- diagnosis ----------

const ENDOMETRIUM_DX = {
  Proliferative: 'proliferative endometrium',
  Secretory: 'secretory endometrium',
  'Weakly proliferative': 'weakly proliferative endometrium',
  'Inactive-atrophic': 'inactive, atrophic endometrium',
  'Disordered proliferative': 'disordered proliferative endometrium',
  'Endometrial polyp': 'ENDOMETRIAL POLYP',
  'Hyperplasia without atypia - see comment': 'ENDOMETRIAL HYPERPLASIA WITHOUT ATYPIA',
  'Atypical hyperplasia - see comment': 'ATYPICAL ENDOMETRIAL HYPERPLASIA / ENDOMETRIOID INTRAEPITHELIAL NEOPLASIA'
};

const ADNEXA_DX = {
  'Paratubal cyst': 'PARATUBAL CYST',
  Hydrosalpinx: 'HYDROSALPINX',
  'Cystic follicle': 'CYSTIC FOLLICLE, ovary',
  'Corpus luteum': 'CORPUS LUTEUM, ovary',
  'Corpus albicans': 'corpora albicantia, ovary',
  Endometriosis: 'ENDOMETRIOSIS',
  'Serous cystadenoma': 'SEROUS CYSTADENOMA, ovary'
};

// House diagnosis lines for a tube on its own: "PARATUBAL CYST" and "Consistent with HYDROSALPINX" stand without
// a closing clause; an unremarkable salpingectomy reads "NO EVIDENCE OF MALIGNANCY".
const TUBE_DX = {
  Hydrosalpinx: 'Consistent with HYDROSALPINX',
  'Paratubal cyst': 'PARATUBAL CYST',
  'Chronic salpingitis': 'CHRONIC SALPINGITIS',
  Endometriosis: 'ENDOMETRIOSIS'
};
// Attached bilateral tubes: lower-case clauses after the uterine findings, as for attached adnexa.
const TUBES_DX = {
  Hydrosalpinx: 'hydrosalpinx',
  'Paratubal cyst': 'paratubal cyst',
  'Chronic salpingitis': 'chronic salpingitis',
  Endometriosis: 'endometriosis'
};

export function diagnosis(part) {
  const v = part.values;
  const kind = kindOf(v);
  const head = kind === 'paratubal' && paratubalSide(v)
    ? `FALLOPIAN TUBE, ${paratubalSide(v)} paratubal cyst, excision`
    : attached(v) && v.specimenName !== TOTAL_BSO ? attachedName(v, true)
      : DX_HEAD[v.specimenName] || DX_HEAD[TOTAL];
  const upper = [];
  const lower = [];
  // Named findings stand alone (trailing negatives, Phase 66); the cervix is named only when it has a finding.
  let closer = '';

  if (kind === 'uterus') {
    const neoplastic = endometriumNeoplastic(v) || cervixNeoplastic(v);
    const endo = ENDOMETRIUM_DX[key(v.endometrium)] || ENDOMETRIUM_DX.Proliferative;
    if (endometriumNeoplastic(v)) upper.push(endo);
    if (cervixNeoplastic(v)) upper.push('HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL), cervix');
    else if (hasCervix(v) && v.cervix === 'LSIL') upper.push('LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL), cervix');
    // A STUMP leads the line; the other types keep the leiomyoma's place.
    if (leiomyomaPresent(v)) {
      if (lmType(v) === LM_STUMP) upper.unshift(leiomyomaDx(v));
      else upper.push(leiomyomaDx(v));
    }
    if (adenomyosisPresent(v)) upper.push('ADENOMYOSIS');
    if (v.endometrium === 'Endometrial polyp') upper.push(endo);
    else if (polypPresent(v)) upper.push('ENDOMETRIAL POLYP');
    // A STIC in an attached tube leads the line and a STIL keeps the capitals; a p53 signature reads with
    // the benign tube and ovary findings.
    const a = attached(v);
    const l = tubeLesion(lesionFindings(v));
    const where = a === ATTACH_LEFT || a === ATTACH_RIGHT ? `${side(v)} fallopian tube` : 'fallopian tube';
    if (l === STIC) upper.unshift(`${LESION_DX[STIC]}, ${where}`);
    else if (l === STIL) upper.push(`${LESION_DX[STIL]}, ${where}`);
    if (!endometriumNeoplastic(v) && v.endometrium !== 'Endometrial polyp') {
      if (upper.length) lower.push(endo);
      else upper.push(endo.toUpperCase());
    }
    if (v.endometritis === 'Present') lower.push('chronic endometritis');
    if (hasCervix(v)) {
      if (v.cervix === 'Chronic cervicitis') lower.push('chronic cervicitis');
      else if (v.cervix === 'Nabothian cysts') lower.push('nabothian cysts of cervix');
    }
    if (neoplastic || leiomyomaNeedsComment(v) || l === STIC) closer = 'see comment';
    if (l === P53_SIGNATURE) lower.push(`p53 signature, ${where}`);
    if (a === ATTACH_TUBES) {
      const f = tubeFindings(v).map((x) => TUBES_DX[x]).filter(Boolean);
      lower.push(...(f.length || l ? f : ['bilateral fallopian tubes with no significant pathology']));
    } else if (a) {
      const f = adnexaFindings(v).map((x) => ADNEXA_DX[x]).filter(Boolean).map((x) => x.toLowerCase());
      lower.push(...(f.length || l ? f : [a === ATTACH_BOTH ? 'bilateral tubes and ovaries with no significant pathology' : `${side(v)} tube and ovary with no significant pathology`]));
    }
  } else if (kind === 'myomectomy') {
    upper.push(leiomyomaPresent(v) ? leiomyomaDx(v) : 'NO SIGNIFICANT PATHOLOGY');
    if (leiomyomaNeedsComment(v)) closer = 'see comment';
  } else if (kind === 'tube') {
    const f = tubeFindings(v);
    const l = tubeLesion(f);
    const dx = Object.keys(TUBE_DX).filter((x) => f.includes(x)).map((x) => TUBE_DX[x]);
    if (l) upper.push(LESION_DX[l]);
    upper.push(...dx);
    if (l === STIC) closer = 'see comment';
    else if (l) closer = 'NO EVIDENCE OF MALIGNANCY';
    else if (!dx.length) upper.push('NO EVIDENCE OF MALIGNANCY');
  } else if (kind === 'paratubal') {
    upper.push('PARATUBAL CYST');
    closer = '';
  } else {
    const l = tubeLesion(adnexaFindings(v));
    const f = adnexaFindings(v).map((x) => ADNEXA_DX[x]).filter(Boolean);
    if (l) upper.push(LESION_DX[l]);
    if (!f.length && !l) upper.push('NO SIGNIFICANT PATHOLOGY');
    for (const x of f) (/^[A-Z]/.test(x) ? upper : lower).push(x);
    if (l === STIC) closer = 'see comment';
    else if (l) closer = 'NO EVIDENCE OF MALIGNANCY';
  }

  const clauses = [...upper, ...lower, closer].filter(Boolean);
  return `(${part.label}) ${head} - ${clauses.join('; ')}`;
}

// ---------- comment and checks (Phase 74) ----------

/** "cytological atypia", "a mitotic count of 6 per 10 HPF" ...: the STUMP features recorded, present first. */
function stumpFeatures(v) {
  const pos = [];
  const neg = [];
  const a = atypiaWord(v);
  if (a) pos.push(`${a} cytological atypia`); else neg.push('significant cytological atypia');
  const m = mitoticPhrase(v.mitoticCount);
  if (m) pos.push(`a mitotic count of ${m}`); else neg.push('increased mitotic activity');
  if (tumourNecrosis(v)) pos.push('coagulative tumour cell necrosis'); else neg.push('coagulative tumour cell necrosis');
  if (lmChanges(v).includes(INFARCT)) pos.push('areas of infarct-type necrosis');
  const or = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}` : xs[0]);
  if (!pos.length) return `shows no ${or(neg)}`;
  return `shows ${listJoin(pos)}${neg.length ? `, with no ${or(neg)}` : ''}`;
}

const FH_COMMENT = {
  Lost: ', with loss of fumarate hydratase expression on immunohistochemistry',
  Retained: '; fumarate hydratase expression is retained on immunohistochemistry'
};

/**
 * Case-level comment for a STUMP, a fumarate hydratase-deficient leiomyoma and intravenous leiomyomatosis,
 * which print "see comment": the features recorded, in report prose (docs/reference/uterus-leiomyoma-sources.md).
 */
export function comment(parts) {
  const notes = [];
  for (const part of parts) {
    const v = part.values;
    if (!leiomyomaNeedsComment(v)) continue;
    const lead = parts.length > 1 ? `(${part.label}) ` : '';
    const t = lmType(v);
    if (t === LM_STUMP) {
      notes.push(`${lead}The smooth muscle tumour ${stumpFeatures(v)}. Clinical follow-up is suggested.`);
    } else if (t === LM_FH) {
      notes.push(`${lead}The leiomyoma shows the morphological features of fumarate hydratase deficiency${FH_COMMENT[v.fhIhc] || ''}. Referral for genetic counselling is suggested, to assess for hereditary leiomyomatosis and renal cell carcinoma (HLRCC) syndrome.`);
    } else if (t === LM_IVL) {
      notes.push(`${lead}Correlation with the operative and imaging findings is suggested, to assess for extension beyond the uterus.`);
    }
  }
  return notes.join('\n');
}

/** Checks on the leiomyoma assessment; shown beside the report, never printed. */
export function validate(part) {
  const v = part.values || {};
  const c = checks();
  const { out, warn, at } = c;
  if (tubeLesion(lesionFindings(v))) lesionChecks(v, lesionFindings(v), c);
  if (!leiomyomaPresent(v)) return out;
  const t = lmType(v);
  const a = atypiaWord(v);
  const m = mitoticPhrase(v.mitoticCount);
  if (t === LM_STUMP && !a && !m && !tumourNecrosis(v)) warn('STUMP is chosen but no atypia, mitotic count or coagulative tumour cell necrosis is recorded.', 'atypia');
  if (t !== LM_STUMP && tumourNecrosis(v)) warn('Coagulative tumour cell necrosis is recorded with a leiomyoma: consider STUMP, or the leiomyosarcoma criteria.', 'tumourNecrosis');
  if (t !== LM_STUMP && t !== 'With bizarre nuclei' && v.atypia === 'Diffuse moderate to severe') warn('Diffuse moderate to severe atypia is recorded with a leiomyoma: consider leiomyoma with bizarre nuclei or STUMP.', 'atypia');
  if (t === 'Mitotically active' && !m) at('info', 'Mitotically active leiomyoma: record the mitotic count.', 'mitoticCount');
  if (t === LM_FH && (v.fhIhc || 'Not performed') === 'Not performed') at('info', 'Fumarate hydratase-deficient leiomyoma: FH immunohistochemistry is not recorded.', 'fhIhc');
  if (t !== LM_FH && v.fhIhc === 'Lost') warn('FH loss is recorded: consider the fumarate hydratase-deficient type.', 'leiomyomaType');
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, comment, validate };
