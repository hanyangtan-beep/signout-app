import { stripDot } from './_house.js';
// Ovarian cyst / cystectomy / benign adnexa generator. Pure functions: (part, ctx) -> string.
// Blocks produced (example: right ovarian cystectomy, endometriotic cyst, 5 cm, intact):
//   specimens  "Right ovarian cyst, cystectomy"
//   macro      "(A) Received in formalin is an intact right ovarian cyst measuring 5 x 4.5 x 3 cm. The cyst measures
//               5 cm in maximum dimension. The cyst wall measures up to 0.2 cm in thickness. It contains
//               chocolate-brown fluid. The inner lining is smooth. Representative sections in 4 blocks."
//   blockKey   "(A) (1-3) Cyst wall. (4) Ovarian parenchyma."   (+ "(5) Fallopian tube." when a tube is included)
//   microscopy "(A) Sections show a cyst wall lined by endometrial-type glandular epithelium ... Features are those
//               of an endometriotic cyst. There is no evidence of malignancy."
//   diagnosis  "(A) OVARY, right ovarian cyst, cystectomy - ENDOMETRIOTIC CYST"
// Other house forms: "LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy - SEROUS CYSTADENOMA; no evidence of
// borderline features or malignancy"; "BENIGN HAEMORRHAGIC CYST, in keeping with burnt-out ENDOMETRIOTIC CYST";
// "MATURE CYSTIC TERATOMA; no immature elements". Borderline / carcinoma options give a short diagnosis line
// only; the schema snippet `ovary_cancer_template` adds the comment pointing to the QMH ovarian cancer template.
// The burnt-out, serous cystadenoma and teratoma paragraphs reuse docs/case-mix-analysis.md §4.5 wording.
// Wording is protected by tests/ovary.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
/** Normalise the typographic dash in option strings so "–" and "-" variants match. */
const norm = (s) => String(s || '').replace(/[\u2013\u2014]/g, '-').trim();

export const TYPES = {
  ENDOMETRIOTIC: 'Endometriotic cyst',
  BURNT_OUT: 'Burnt-out endometriotic cyst (haemorrhagic cyst)',
  CORPUS_LUTEUM: 'Haemorrhagic corpus luteum cyst',
  FOLLICULAR: 'Follicular cyst',
  SIMPLE: 'Simple cyst',
  SEROUS: 'Serous cystadenoma',
  MUCINOUS: 'Mucinous cystadenoma',
  SEROMUCINOUS: 'Seromucinous cystadenoma',
  TERATOMA: 'Mature cystic teratoma',
  FIBROMA: 'Fibroma',
  PARATUBAL: 'Paratubal cyst',
  BORDERLINE: 'Borderline tumour - see comment',
  CARCINOMA: 'Carcinoma - see comment'
};

export const cystType = (v) => norm(v.cystType) || TYPES.ENDOMETRIOTIC;
export const isNeoplastic = (v) => [TYPES.BORDERLINE, TYPES.CARCINOMA].includes(cystType(v));
export const isCystadenoma = (v) => [TYPES.SEROUS, TYPES.MUCINOUS, TYPES.SEROMUCINOUS].includes(cystType(v));
export const tubeIncluded = (v) => !!v.tube && v.tube !== 'Not included';
const isSalpingo = (v) => v.procedure === 'Salpingo-oophorectomy';
const isOophorectomy = (v) => v.procedure === 'Oophorectomy' || isSalpingo(v);
const isCystWall = (v) => norm(v.procedure) === 'Cyst wall, excision';

const sideLc = (v) => (v.side && v.side !== 'Not stated' ? v.side.toLowerCase() : '');
const sideUc = (v) => sideLc(v).toUpperCase();
const withSide = (v, noun) => (sideLc(v) ? `${sideLc(v)} ${noun}` : noun);

// ---------- specimens ----------

export function specimenName(part) {
  const v = part.values;
  const typed = (v.specimenName || '').trim();
  if (typed) return typed;
  const side = sideLc(v);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (isSalpingo(v)) return `${cap(withSide(v, 'ovary and fallopian tube'))}, salpingo-oophorectomy`;
  if (isOophorectomy(v)) return `${cap(withSide(v, 'ovary'))}, oophorectomy${tubeIncluded(v) ? ' with fallopian tube' : ''}`;
  if (isCystWall(v)) return `${cap(withSide(v, 'ovarian cyst wall'))}, excision`;
  return `${cap(side ? `${side} ovarian cyst` : 'ovarian cyst')}, cystectomy`;
}

// ---------- macroscopic description ----------

/** "5x4.5x3" -> "5 x 4.5 x 3 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** Wall thickness as typed ("0.2 cm", "2 mm"); a bare number is read as mm when >= 1, else cm. '' when blank. */
export function wallPhrase(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (/cm|mm/i.test(s)) return s.replace(/\s*(cm|mm)$/i, ' $1').replace(/\s+/g, ' ');
  const n = num(s);
  if (n === null) return s;
  return n >= 1 ? `${fmt(n)} mm` : `${fmt(n)} cm`;
}

const CONTENTS = {
  'Chocolate-brown fluid': 'It contains chocolate-brown fluid.',
  'Serous fluid': 'It contains thin serous fluid.',
  'Mucinous material': 'It contains thick mucinous material.',
  'Sebaceous material and hair': 'It contains yellow sebaceous material and hair.',
  'Blood clot': 'It contains blood clot.',
  'Clear fluid': 'It contains clear fluid.'
};

function liningSentence(v) {
  const l = norm(v.lining);
  const d = stripDot(v.liningDescription);
  if (l === 'Papillary excrescences - describe') return d ? `The inner lining shows ${lc1(d)}.` : 'The inner lining shows papillary excrescences.';
  if (l === 'Solid areas - describe') return d ? `The inner lining shows ${lc1(d)}.` : 'The inner lining shows solid areas.';
  return 'The inner lining is smooth.';
}

function tubeMacroSentence(v) {
  if (!tubeIncluded(v)) return '';
  const len = sizePhrase(v.tubeLength);
  const lenPhrase = len ? ` measuring ${len} in length` : '';
  switch (v.tube) {
    case 'Hydrosalpinx':
      return `The attached fallopian tube${lenPhrase} is dilated and thin-walled, in keeping with hydrosalpinx.`;
    case 'Paratubal cyst':
      return `The attached fallopian tube${lenPhrase} bears a thin-walled paratubal cyst containing clear fluid.`;
    default:
      return `The attached fallopian tube${lenPhrase} is unremarkable.`;
  }
}

/** Number of blocks printed in the macro: the typed count plus one for an attached tube. */
export function totalBlocks(v) {
  const n = Math.max(1, Math.round(num(v.blocks) ?? 4));
  return n + (tubeIncluded(v) ? 1 : 0);
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const size = sizePhrase(v.dimensions);
  const measuring = size ? ` measuring ${size}` : '';
  const ruptured = v.receivedState === 'Ruptured';
  if (isSalpingo(v)) {
    s.push(`Received in formalin is a ${withSide(v, 'ovary')} with attached fallopian tube${measuring}.`);
  } else if (isOophorectomy(v)) {
    s.push(`Received in formalin is a ${withSide(v, 'ovary')}${measuring}.`);
  } else if (isCystWall(v)) {
    s.push(`Received in formalin ${ruptured ? 'are fragments of a ruptured' : 'is a'} ${withSide(v, 'ovarian cyst wall')}${measuring}${ruptured && size ? ' in aggregate' : ''}.`);
  } else {
    s.push(`Received in formalin is ${ruptured ? 'a ruptured, collapsed' : 'an intact'} ${withSide(v, 'ovarian cyst')}${measuring}.`);
  }
  const cyst = sizePhrase(v.cystSize);
  if (cyst) {
    if (isOophorectomy(v)) s.push(`On sectioning, the ovary contains a ${ruptured ? 'ruptured ' : ''}cyst measuring ${cyst} in maximum dimension.`);
    else s.push(`The cyst measures ${cyst} in maximum dimension.`);
  } else if (isOophorectomy(v)) {
    s.push(`On sectioning, the ovary contains a ${ruptured ? 'ruptured ' : ''}cyst.`);
  }
  const wall = wallPhrase(v.wallThickness);
  if (wall) s.push(`The cyst wall measures up to ${wall} in thickness.`);
  if (CONTENTS[v.contents]) s.push(CONTENTS[v.contents]);
  s.push(liningSentence(v));
  s.push(tubeMacroSentence(v));
  const blocks = totalBlocks(v);
  s.push(`Representative sections in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const n = Math.max(1, Math.round(num(v.blocks) ?? 4));
  const keys = [];
  if (isCystWall(v) || n === 1) {
    keys.push(n === 1 ? '(1) Cyst wall.' : `(1-${n}) Cyst wall.`);
  } else {
    keys.push(n === 2 ? '(1) Cyst wall.' : `(1-${n - 1}) Cyst wall.`);
    keys.push(`(${n}) Ovarian parenchyma.`);
  }
  if (tubeIncluded(v)) keys.push(`(${n + 1}) Fallopian tube.`);
  return `(${part.label}) ${keys.join(' ')}`;
}

// ---------- microscopy ----------

const STROMA_YES = 'Ovarian stroma is noted in the periphery.';
const STROMA_NO = 'No ovarian stroma is identified in the sections examined.';
const NEM = 'There is no evidence of malignancy.';
const NO_BORDERLINE = 'There is no evidence of borderline features or malignancy.';

function stromaSentence(v) {
  if (v.ovarianStroma === 'No') return STROMA_NO;
  return STROMA_YES;
}

function papillaryNote(v) {
  return norm(v.lining) === 'Papillary excrescences - describe'
    ? 'The papillary excrescences seen macroscopically are lined by the same single layer of bland epithelium without stratification, tufting or atypia.'
    : '';
}

/** Type-specific sentences: [opening..., features/closer...]. The stroma sentence is inserted between them. */
function typeParagraph(v) {
  const t = cystType(v);
  switch (t) {
    case TYPES.BURNT_OUT:
      return {
        open: ['Sections show a fibrocollagenous cyst wall with extensive old haemorrhage, abundant haemosiderin-laden macrophages, and focal chronic inflammation. The lining epithelium is largely absent. No definite viable endometrial glands are identified.'],
        close: ['No epithelial atypia or malignancy is seen. These features are those of a benign haemorrhagic cyst, in keeping with a burnt-out endometriotic cyst.'],
        negative: null
      };
    case TYPES.CORPUS_LUTEUM:
      return {
        open: ['Sections show a haemorrhagic cyst whose wall is composed of a convoluted layer of large luteinised granulosa cells with an outer layer of smaller theca-lutein cells, with blood clot and fibrin within the lumen.'],
        close: ['Features are those of a haemorrhagic corpus luteum cyst.'],
        negative: NEM
      };
    case TYPES.FOLLICULAR:
      return {
        open: ['Sections show a thin-walled cyst lined by an inner layer of granulosa cells and an outer layer of theca interna cells, without luteinisation or atypia.'],
        close: ['Features are those of a follicular cyst.'],
        negative: NEM
      };
    case TYPES.SIMPLE:
      return {
        open: ['Sections show a thin-walled fibrous cyst lined by a single layer of attenuated, flattened to cuboidal epithelium without atypia.'],
        close: ['Features are those of a benign simple cyst.'],
        negative: NEM
      };
    case TYPES.SEROUS:
      return {
        open: ['Sections of the ovary show a cyst lined by benign mullerian epithelium, underneath which benign fibrous stroma composed of bland spindle cells is seen.', papillaryNote(v)],
        close: ['Features are those of a serous cystadenoma.'],
        negative: NO_BORDERLINE
      };
    case TYPES.MUCINOUS:
      return {
        open: ['Sections show a cyst lined by a single layer of bland mucinous columnar epithelium with basally located nuclei and no significant stratification or atypia, underneath which benign fibrous stroma is seen.', papillaryNote(v)],
        close: ['Features are those of a mucinous cystadenoma.'],
        negative: NO_BORDERLINE
      };
    case TYPES.SEROMUCINOUS:
      return {
        open: ['Sections show a cyst lined by an admixture of bland ciliated serous-type and endocervical-type mucinous epithelium in a single layer without stratification or atypia, underneath which benign fibrous stroma is seen.', papillaryNote(v)],
        close: ['Features are those of a seromucinous cystadenoma.'],
        negative: NO_BORDERLINE
      };
    case TYPES.TERATOMA:
      return {
        open: ['Sections show a mature cystic teratoma including components from at least two lineages of differentiation, comprising keratinising squamous epithelium with underlying sebaceous glands and hair follicles, adipose tissue and smooth muscle fibres.', 'No immature neuroepithelial tissue is seen.'],
        close: [],
        negative: 'There is no evidence of other germ cell tumour components, borderline component, or malignancy.'
      };
    case TYPES.FIBROMA:
      return {
        open: ['Sections show a well-circumscribed spindle cell tumour composed of bland fibroblastic cells arranged in intersecting fascicles and storiform patterns with variable collagen deposition and areas of oedema. Mitotic activity is inconspicuous and there is no cytological atypia or necrosis.'],
        close: ['Features are those of a fibroma.'],
        negative: NEM
      };
    case TYPES.PARATUBAL:
      return {
        open: ['Sections show a thin-walled cyst lined by a single layer of bland ciliated cuboidal to columnar tubal-type epithelium with a fibromuscular wall.'],
        close: ['Features are those of a paratubal cyst.'],
        negative: NEM
      };
    case TYPES.BORDERLINE:
      return {
        open: ['Sections show a cystic epithelial tumour with hierarchically branching papillae, epithelial stratification and tufting and mild to moderate nuclear atypia, without destructive stromal invasion.'],
        close: ['Features are those of a borderline tumour; see comment.'],
        negative: null
      };
    case TYPES.CARCINOMA:
      return {
        open: ['Sections show a malignant epithelial tumour with destructive stromal invasion.'],
        close: ['Features are those of a carcinoma; see comment.'],
        negative: null
      };
    default: // Endometriotic cyst
      return {
        open: ['Sections show a cyst wall lined by endometrial-type glandular epithelium with underlying endometrial-type stroma, accompanied by old haemorrhage and abundant haemosiderin-laden macrophages within the fibrotic wall.'],
        close: ['Features are those of an endometriotic cyst.'],
        negative: NEM
      };
  }
}

const TUBE_MICRO = {
  Unremarkable: 'The fallopian tube is unremarkable.',
  Hydrosalpinx: 'The fallopian tube shows a dilated lumen with attenuated, flattened plicae and a thinned muscular wall, in keeping with hydrosalpinx.',
  'Paratubal cyst': 'A thin-walled paratubal cyst lined by bland tubal-type epithelium is present. The fallopian tube is otherwise unremarkable.',
  'Chronic salpingitis': 'The fallopian tube shows chronic inflammatory infiltrates within the plicae, in keeping with chronic salpingitis.',
  Endometriosis: 'Foci of endometriosis are present in the fallopian tube serosa.'
};

export function microscopy(part) {
  const v = part.values;
  const p = typeParagraph(v);
  const s = [...p.open];
  if (v.torsion === 'Present') s.push('There is extensive haemorrhagic infarction of the cyst wall and adjacent ovarian tissue, in keeping with torsion.');
  if (v.endometriosisElsewhere === 'Present') s.push('Separate foci of endometriosis, composed of endometrial-type glands and stroma with haemosiderin-laden macrophages, are present on the ovarian surface and in the adjacent tissue.');
  s.push(stromaSentence(v));
  s.push(...p.close);
  if (tubeIncluded(v)) s.push(TUBE_MICRO[v.tubeFindings] || TUBE_MICRO.Unremarkable);
  if (p.negative) s.push(p.negative);
  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

// ---------- diagnosis ----------

const MAIN = {
  [TYPES.ENDOMETRIOTIC]: 'ENDOMETRIOTIC CYST',
  [TYPES.BURNT_OUT]: 'BENIGN HAEMORRHAGIC CYST, in keeping with burnt-out ENDOMETRIOTIC CYST',
  [TYPES.CORPUS_LUTEUM]: 'HAEMORRHAGIC CORPUS LUTEUM CYST',
  [TYPES.FOLLICULAR]: 'FOLLICULAR CYST',
  [TYPES.SIMPLE]: 'BENIGN SIMPLE CYST',
  [TYPES.SEROUS]: 'SEROUS CYSTADENOMA',
  [TYPES.MUCINOUS]: 'MUCINOUS CYSTADENOMA',
  [TYPES.SEROMUCINOUS]: 'SEROMUCINOUS CYSTADENOMA',
  [TYPES.TERATOMA]: 'MATURE CYSTIC TERATOMA',
  [TYPES.FIBROMA]: 'FIBROMA',
  [TYPES.PARATUBAL]: 'PARATUBAL CYST',
  [TYPES.BORDERLINE]: 'BORDERLINE TUMOUR',
  [TYPES.CARCINOMA]: 'CARCINOMA'
};

/** "OVARY, right ovarian cyst, cystectomy" / "LEFT OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy" … */
export function diagnosisHeader(v) {
  const side = sideLc(v);
  const SIDE = sideUc(v);
  if (isSalpingo(v)) return `${SIDE ? `${SIDE} ` : ''}OVARY AND FALLOPIAN TUBE, salpingo-oophorectomy`;
  if (isOophorectomy(v)) return `${SIDE ? `${SIDE} ` : ''}OVARY${tubeIncluded(v) ? ' AND FALLOPIAN TUBE' : ''}, oophorectomy`;
  if (cystType(v) === TYPES.PARATUBAL) return `ADNEXA, ${side ? `${side} ` : ''}paratubal cyst, ${isCystWall(v) ? 'excision' : 'cystectomy'}`;
  if (isCystWall(v)) return `OVARY, ${side ? `${side} ` : ''}ovarian cyst wall, excision`;
  return `OVARY, ${side ? `${side} ` : ''}ovarian cyst, cystectomy`;
}

export function diagnosis(part) {
  const v = part.values;
  const t = cystType(v);
  const clauses = [MAIN[t] || String(t).toUpperCase()];
  if (v.torsion === 'Present') clauses.push('haemorrhagic infarction, in keeping with torsion');
  if (v.endometriosisElsewhere === 'Present' && t !== TYPES.ENDOMETRIOTIC && t !== TYPES.BURNT_OUT) clauses.push('endometriosis');
  if (tubeIncluded(v)) {
    const tf = v.tubeFindings;
    if (tf === 'Hydrosalpinx') clauses.push('hydrosalpinx');
    else if (tf === 'Paratubal cyst') clauses.push('paratubal cyst');
    else if (tf === 'Chronic salpingitis') clauses.push('chronic salpingitis');
    else if (tf === 'Endometriosis') clauses.push('endometriosis of fallopian tube');
  }
  if (isNeoplastic(v)) clauses.push('see comment');
  else if (isCystadenoma(v)) clauses.push('no evidence of borderline features or malignancy');
  else if (t === TYPES.TERATOMA) clauses.push('no immature elements');
  else if (t === TYPES.FIBROMA) clauses.push('no evidence of malignancy');
  return `(${part.label}) ${diagnosisHeader(v)} - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
