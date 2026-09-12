// Uterus (benign hysterectomy / myomectomy +/- adnexa) generator. Pure functions: (part, ctx) -> string.
// One part per specimen container; the `specimenName` select decides the part type:
//   uterus     "Uterus and cervix, total hysterectomy" / "Uterus, cervix and bilateral adnexa" / "Uterus, subtotal"
//   myomectomy "Myomectomy"
//   adnexa     "Left tube and ovary" / "Right tube and ovary"
//   tubes      "Fallopian tube(s), sterilisation"
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
//               endometrium; cervix with no evidence of squamous intraepithelial lesion or malignancy"
// Adnexa parts: "(B) LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy - NO SIGNIFICANT PATHOLOGY".
// Hyperplasia / HSIL options give a short diagnosis line only; the schema snippets
// `uterus_endometrial_template` / `uterus_cervix_template` add the QMH cancer-template comment.
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
const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');
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

export const kindOf = (v) => {
  switch (v.specimenName) {
    case MYOMECTOMY: return 'myomectomy';
    case LEFT_ADNEXA:
    case RIGHT_ADNEXA: return 'adnexa';
    case TUBES: return 'tubes';
    default: return 'uterus';
  }
};
export const isUterus = (v) => kindOf(v) === 'uterus';
export const hasCervix = (v) => v.specimenName === TOTAL || v.specimenName === TOTAL_BSO || !v.specimenName;
export const hasAdnexa = (v) => v.specimenName === TOTAL_BSO || kindOf(v) === 'adnexa' || kindOf(v) === 'tubes';
const side = (v) => (v.specimenName === LEFT_ADNEXA ? 'left' : v.specimenName === RIGHT_ADNEXA ? 'right' : '');

export const leiomyomaPresent = (v) => (v.leiomyoma || 'Present') === 'Present' && (isUterus(v) || kindOf(v) === 'myomectomy');
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

// ---------- specimen phrases ----------

const SPECIMEN = {
  [TOTAL]: 'Uterus and cervix, total hysterectomy',
  [TOTAL_BSO]: 'Uterus, cervix and bilateral adnexa, total hysterectomy and bilateral salpingo-oophorectomy',
  [SUBTOTAL]: 'Uterus, subtotal hysterectomy',
  [MYOMECTOMY]: 'Myomectomy',
  [LEFT_ADNEXA]: 'Left fallopian tube and ovary, salpingo-oophorectomy',
  [RIGHT_ADNEXA]: 'Right fallopian tube and ovary, salpingo-oophorectomy',
  [TUBES]: 'Fallopian tubes, sterilisation'
};

const DX_HEAD = {
  [TOTAL]: 'UTERUS AND CERVIX, total hysterectomy',
  [TOTAL_BSO]: 'UTERUS, CERVIX AND BILATERAL ADNEXA, total hysterectomy and bilateral salpingo-oophorectomy',
  [SUBTOTAL]: 'UTERUS, subtotal hysterectomy',
  [MYOMECTOMY]: 'MYOMECTOMY',
  [LEFT_ADNEXA]: 'LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy',
  [RIGHT_ADNEXA]: 'RIGHT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy',
  [TUBES]: 'FALLOPIAN TUBES, bilateral, sterilisation'
};

export function specimenName(part) {
  const v = part.values;
  const raw = (v.specimenName || '').trim();
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

function adnexaMacro(v) {
  const s = [];
  const tube = sizePhrase(v.tubeSize);
  const ovary = sizePhrase(v.ovarySize);
  const cyst = sizePhrase(v.cystSize);
  const findings = adnexaFindings(v);
  if (v.specimenName === TOTAL_BSO) {
    if (tube) s.push(`The fallopian tubes measure up to ${tube}.`);
    if (ovary) s.push(`The ovaries measure up to ${ovary}.`);
  } else {
    if (tube) s.push(`The fallopian tube measures ${tube}.`);
    if (ovary) s.push(`The ovary measures ${ovary}${findings.length ? '' : ' with an unremarkable cut surface'}.`);
  }
  if (cyst) {
    if (findings.includes('Paratubal cyst')) s.push(`A thin-walled paratubal cyst measuring ${cyst} is attached to the fallopian tube.`);
    else if (findings.includes('Hydrosalpinx')) s.push(`The fallopian tube is cystically dilated to ${cyst}.`);
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
    const noun = v.specimenName === SUBTOTAL ? 'subtotal hysterectomy specimen'
      : v.specimenName === TOTAL_BSO ? 'total hysterectomy and bilateral salpingo-oophorectomy specimen'
        : 'total hysterectomy specimen';
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
    if (v.specimenName === TOTAL_BSO) {
      items.push(['Left fallopian tube, sectioned', 1], ['Left ovary', 2], ['Right fallopian tube, sectioned', 1], ['Right ovary', 2]);
    }
  } else if (kind === 'myomectomy') {
    items.push([singleLeiomyoma(v) ? 'Leiomyoma, representative sections' : 'Leiomyomas, representative sections', 4]);
  } else if (kind === 'adnexa') {
    items.push(['Fallopian tube, sectioned', 1], ['Ovary', 2]);
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

const DEGENERATION = {
  Hyaline: 'hyaline degeneration',
  Cystic: 'cystic degeneration',
  Red: 'red (haemorrhagic) degeneration',
  Calcific: 'calcification'
};

const LOCATION_MICRO = {
  Intramural: 'Intramural',
  Subserosal: 'Subserosal',
  Submucosal: 'Submucosal',
  'Multiple sites': 'Intramural and subserosal'
};

function leiomyomaMicro(v, opening) {
  const single = singleLeiomyoma(v);
  const loc = (LOCATION_MICRO[v.leiomyomaLocation] || 'Intramural').toLowerCase();
  const degen = DEGENERATION[v.degeneration];
  const noun = single ? `${/^[aeiou]/.test(loc) ? 'an' : 'a'} ${loc} leiomyoma` : `${loc} leiomyomata`;
  const withDegen = degen ? ` showing ${degen}` : '';
  const verb = single ? 'is' : 'are';
  const first = opening
    ? `Sections of the uterus show ${noun}${withDegen} with no coagulative necrosis.`
    : `${uc1(noun)}${withDegen} with no coagulative necrosis ${verb} seen.`;
  return `${first} Mitoses are inconspicuous and there is no cytological atypia.`;
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

const TUBE_FINDINGS = {
  'Paratubal cyst': 'A thin-walled paratubal cyst lined by flattened cuboidal epithelium is present.',
  Hydrosalpinx: 'The fallopian tube is dilated with attenuated plicae, in keeping with hydrosalpinx.'
};
const OVARY_FINDINGS = {
  'Cystic follicle': 'a cystic follicle',
  'Corpus luteum': 'a corpus luteum',
  'Corpus albicans': 'corpora albicantia'
};

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
    return s;
  }
  if (!findings.length) {
    s.push(`Sections of the ${tubeNoun} and ${ovaryNoun} show no significant pathology.`);
    return s;
  }
  s.push(`Sections of the ${tubeNoun} show unremarkable plicae.`);
  for (const f of findings) if (TUBE_FINDINGS[f]) s.push(TUBE_FINDINGS[f]);
  const ov = findings.filter((f) => OVARY_FINDINGS[f]).map((f) => OVARY_FINDINGS[f]);
  const serous = findings.includes('Serous cystadenoma');
  const endometriosis = findings.includes('Endometriosis');
  if (ov.length) s.push(`The ${ovaryNoun} ${plural ? 'show' : 'shows'} ${listJoin(ov)}.`);
  else if (!serous && !endometriosis) s.push(`The ${ovaryNoun} ${plural ? 'are' : 'is'} unremarkable.`);
  if (serous) s.push(`The ${ovaryNoun} ${plural ? 'show' : 'shows'} a cyst lined by benign mullerian epithelium, underneath which benign fibrous stroma composed of bland spindle cells is seen. Features are those of a serous cystadenoma.`);
  if (endometriosis) s.push('Foci of endometrial glands and stroma with haemosiderin-laden macrophages are present, in keeping with endometriosis.');
  return s;
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
    s.push(ENDOMETRIUM[key(v.endometrium)] || ENDOMETRIUM.Proliferative);
    if (v.endometritis === 'Present') s.push('Plasma cells are present in the endometrial stroma, in keeping with chronic endometritis.');
    if (hasCervix(v)) {
      const c = CERVIX[key(v.cervix)] || CERVIX_NEG;
      s.push(c);
      if (!cervixNeoplastic(v) && v.cervix !== 'LSIL') closed = true;
    }
    if (v.specimenName === TOTAL_BSO) s.push(...adnexaMicro(v, true));
    if (endometriumNeoplastic(v) || cervixNeoplastic(v)) closed = true;
    else if (!closed || v.specimenName === TOTAL_BSO) { s.push('There is no evidence of malignancy.'); closed = true; }
  } else if (kind === 'myomectomy') {
    if (leiomyomaPresent(v)) {
      s.push('Sections show pieces of smooth muscle tumour tissue comprising spindle cells arranged in fascicles and whorls. Thick walled vessels are seen.');
      const degen = DEGENERATION[v.degeneration];
      if (degen) s.push(`Areas of ${degen} are present.`);
      s.push('No epithelioid tumour cells, significant nuclear atypia, coagulative tumour necrosis, or frequent mitoses are observed.');
      s.push('There is no evidence of malignancy. Features are those of leiomyoma.');
    } else {
      s.push('Sections show pieces of unremarkable myometrium. There is no evidence of malignancy.');
    }
    closed = true;
  } else {
    s.push(...adnexaMicro(v, false));
    s.push('There is no evidence of malignancy.');
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

const CERVIX_NEG_DX = 'cervix with no evidence of squamous intraepithelial lesion or malignancy';

export function diagnosis(part) {
  const v = part.values;
  const kind = kindOf(v);
  const head = DX_HEAD[v.specimenName] || DX_HEAD[TOTAL];
  const upper = [];
  const lower = [];
  let closer = 'no evidence of malignancy';

  if (kind === 'uterus') {
    const neoplastic = endometriumNeoplastic(v) || cervixNeoplastic(v);
    const endo = ENDOMETRIUM_DX[key(v.endometrium)] || ENDOMETRIUM_DX.Proliferative;
    if (endometriumNeoplastic(v)) upper.push(endo);
    if (cervixNeoplastic(v)) upper.push('HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL), cervix');
    else if (hasCervix(v) && v.cervix === 'LSIL') upper.push('LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL), cervix');
    if (leiomyomaPresent(v)) upper.push(singleLeiomyoma(v) ? 'LEIOMYOMA' : 'LEIOMYOMAS');
    if (adenomyosisPresent(v)) upper.push('ADENOMYOSIS');
    if (v.endometrium === 'Endometrial polyp') upper.push(endo);
    else if (polypPresent(v)) upper.push('ENDOMETRIAL POLYP');
    if (!endometriumNeoplastic(v) && v.endometrium !== 'Endometrial polyp') {
      if (upper.length) lower.push(endo);
      else upper.push(endo.toUpperCase());
    }
    if (v.endometritis === 'Present') lower.push('chronic endometritis');
    if (hasCervix(v)) {
      if (v.cervix === 'Chronic cervicitis') lower.push('chronic cervicitis');
      else if (v.cervix === 'Nabothian cysts') lower.push('nabothian cysts of cervix');
    }
    if (neoplastic) closer = 'see comment';
    else if (hasCervix(v) && v.cervix === 'No SIL') closer = CERVIX_NEG_DX;
    else if (hasCervix(v)) closer = 'no evidence of dysplasia or malignancy';
    else closer = 'no evidence of hyperplasia or malignancy';
    if (v.specimenName === TOTAL_BSO) {
      // The cervix clause reads better immediately after the uterine findings, before the adnexa.
      if (closer === CERVIX_NEG_DX) { lower.push(closer); closer = ''; }
      const f = adnexaFindings(v).map((x) => ADNEXA_DX[x]).filter(Boolean).map((x) => x.toLowerCase());
      lower.push(...(f.length ? f : ['bilateral tubes and ovaries with no significant pathology']));
    }
  } else if (kind === 'myomectomy') {
    upper.push(leiomyomaPresent(v) ? (singleLeiomyoma(v) ? 'LEIOMYOMA' : 'LEIOMYOMAS') : 'NO SIGNIFICANT PATHOLOGY');
    closer = leiomyomaPresent(v) ? 'no evidence of malignancy' : '';
  } else {
    const f = adnexaFindings(v).map((x) => ADNEXA_DX[x]).filter(Boolean);
    if (!f.length) { upper.push('NO SIGNIFICANT PATHOLOGY'); closer = ''; }
    for (const x of f) (/^[A-Z]/.test(x) ? upper : lower).push(x);
  }

  const clauses = [...upper, ...lower, closer].filter(Boolean);
  return `(${part.label}) ${head} - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
