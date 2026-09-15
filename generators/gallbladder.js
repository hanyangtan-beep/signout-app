import { stripDot } from './_house.js';
// Gallbladder (benign cholecystectomy) generator. Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Gallbladder, cholecystectomy"
//   macro      "(A) Received in formalin is a gallbladder measuring 8 x 3 x 2.5 cm which has been opened prior to
//               submission. The wall measures up to 0.3 cm in thickness. The serosa is smooth. The mucosa is
//               unremarkable. No stones are received. Representative sections in 3 blocks."
//   blockKey   "(A) (1) Cystic duct margin. (2) Body. (3) Fundus."
//   microscopy "(A) Sections of the gallbladder show thickening of the muscular wall, Rokitansky-Aschoff sinus
//               formation as well as a transmural chronic inflammatory infiltrate of lymphocytes and some plasma
//               cells. The findings are consistent with chronic cholecystitis. There is no evidence of dysplasia
//               or malignancy."
//   diagnosis  "(A) GALLBLADDER, cholecystectomy - CHRONIC CHOLECYSTITIS; no evidence of dysplasia or malignancy"
// Dysplasia / carcinoma options give a short diagnosis line only; the schema snippet
// `gallbladder_cancer_template` adds the comment pointing to the QMH cancer template.
// Wording is protected by tests/gallbladder.test.js — change it only deliberately.

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
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');

export const NEGATIVE = 'No dysplasia or malignancy';
export const hasNeoplasia = (v) => !!v.neoplasia && v.neoplasia !== NEGATIVE;
export const stonesPresent = (v) => /^Present/.test(v.stones || '');

export function specimenName(part) {
  return (part.values.specimenName || '').trim() || 'Gallbladder, cholecystectomy';
}

// ---------- macroscopic description ----------

/** "8x3x2.5" -> "8 x 3 x 2.5 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** Wall thickness as typed ("0.3 cm", "3 mm"); a bare number is read as mm when >= 1, else cm. '' when blank. */
export function wallPhrase(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (/cm|mm/i.test(s)) return s.replace(/\s*(cm|mm)$/i, ' $1').replace(/\s+/g, ' ');
  const n = num(s);
  if (n === null) return s;
  return n >= 1 ? `${fmt(n)} mm` : `${fmt(n)} cm`;
}

const SEROSA = {
  Smooth: 'The serosa is smooth.',
  Congested: 'The serosa is congested.',
  'Fibrinous exudate': 'The serosa is covered by fibrinous exudate.',
  Perforated: 'The serosa is congested and a perforation is identified.'
};

const MUCOSA = {
  Unremarkable: 'The mucosa is unremarkable.',
  'Velvety, bile-stained': 'The mucosa is velvety and bile-stained.',
  'Cholesterolosis (strawberry)': 'The mucosa is velvety and bile-stained with yellow flecks (cholesterolosis).',
  Ulcerated: 'The mucosa is ulcerated.',
  'Flattened, fibrotic': 'The mucosa is flattened and fibrotic.'
};

function mucosaSentence(v) {
  if (v.mucosa === 'Mass – describe' || v.mucosa === 'Mass - describe') {
    const d = stripDot(v.mucosaMass);
    return d ? `The mucosa shows a ${lc1(d)}.` : 'The mucosa shows a mass.';
  }
  return MUCOSA[v.mucosa] || (v.mucosa ? `The mucosa is ${lc1(stripDot(v.mucosa))}.` : '');
}

function stoneSentence(v) {
  const size = sizePhrase(v.stoneSize);
  switch (v.stones) {
    case 'Present – single':
    case 'Present - single':
      return `A single stone${size ? ` measuring ${size}` : ''} is present.`;
    case 'Present – multiple':
    case 'Present - multiple':
      return `Multiple stones${size ? ` measuring up to ${size}` : ''} are present.`;
    case 'Absent':
      return 'No stones are identified.';
    default:
      return 'No stones are received.';
  }
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const size = sizePhrase(v.dimensions);
  if (v.receivedState === 'Intact') s.push(`Received in formalin is an intact gallbladder${size ? ` measuring ${size}` : ''} which is opened in the laboratory.`);
  else s.push(`Received in formalin is a gallbladder${size ? ` measuring ${size}` : ''} which has been opened prior to submission.`);
  const wall = wallPhrase(v.wallThickness);
  if (wall) s.push(`The wall measures up to ${wall} in thickness.`);
  if (SEROSA[v.serosa]) s.push(SEROSA[v.serosa]);
  s.push(mucosaSentence(v));
  s.push(stoneSentence(v));
  if (v.cysticNode === 'Identified') s.push('A cystic duct lymph node is identified.');
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 3));
  s.push(`Representative sections in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  return `(${part.label}) ${s.filter(Boolean).join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const keys = ['(1) Cystic duct margin.', '(2) Body.', '(3) Fundus.'];
  if (v.cysticNode === 'Identified') keys.push('(4) Cystic duct lymph node.');
  return `(${part.label}) ${keys.join(' ')}`;
}

// ---------- microscopy ----------

const NEOPLASIA_MICRO = {
  'Low grade dysplasia': 'The epithelium shows low grade dysplasia (BilIN-1/2) with nuclear enlargement and stratification.',
  'High grade dysplasia (BilIN-3)': 'The epithelium shows high grade dysplasia (BilIN-3) with marked nuclear pleomorphism, loss of polarity and architectural complexity.',
  'Adenocarcinoma – see comment': 'Infiltrating malignant glands are present within the gallbladder wall, in keeping with adenocarcinoma; see comment.',
  'Adenocarcinoma - see comment': 'Infiltrating malignant glands are present within the gallbladder wall, in keeping with adenocarcinoma; see comment.',
  'Intracholecystic papillary neoplasm': 'There is an intracholecystic papillary neoplasm composed of papillary and tubular structures lined by neoplastic biliary-type epithelium; see comment.'
};

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const ras = v.rasinuses === 'Present';
  const chronicInfiltrate = 'as well as a transmural chronic inflammatory infiltrate of lymphocytes and some plasma cells';

  switch (v.cholecystitis) {
    case 'Acute-on-chronic':
      s.push('Sections of the gallbladder wall show mucosal ulceration, necrosis and acute inflammatory infiltrates extending through the full thickness of the gallbladder wall.');
      s.push(`The background shows ${ras ? 'Rokitansky-Aschoff sinus formation as well as ' : ''}chronic inflammatory infiltrates and thickening of the muscular wall.`);
      s.push('Features are in keeping with acute and chronic cholecystitis.');
      break;
    case 'Acute':
      s.push('Sections of the gallbladder wall show mucosal ulceration, oedema, congestion and acute inflammatory infiltrates extending through the full thickness of the gallbladder wall.');
      if (ras) s.push('Rokitansky-Aschoff sinuses are present.');
      s.push('Features are in keeping with acute cholecystitis.');
      break;
    case 'Gangrenous':
      s.push('Sections of the gallbladder wall show extensive transmural necrosis with haemorrhage, mucosal ulceration and acute inflammatory infiltrates extending to the serosa.');
      if (ras) s.push('Rokitansky-Aschoff sinuses are present in the viable wall.');
      s.push('Features are in keeping with gangrenous cholecystitis.');
      break;
    case 'Xanthogranulomatous':
      s.push(`Sections of the gallbladder show thickening of the wall${ras ? ', Rokitansky-Aschoff sinus formation' : ''} and a transmural inflammatory infiltrate rich in foamy histiocytes, with lymphocytes, plasma cells, multinucleated giant cells and fibrosis.`);
      s.push('Features are in keeping with xanthogranulomatous cholecystitis.');
      break;
    case 'Follicular':
      s.push(`Sections of the gallbladder show thickening of the muscular wall${ras ? ', Rokitansky-Aschoff sinus formation' : ''} as well as a transmural chronic inflammatory infiltrate with numerous lymphoid follicles showing germinal centres.`);
      s.push('The findings are consistent with chronic (follicular) cholecystitis.');
      break;
    case 'Eosinophilic':
      s.push(`Sections of the gallbladder show thickening of the muscular wall${ras ? ', Rokitansky-Aschoff sinus formation' : ''} as well as a transmural inflammatory infiltrate composed predominantly of eosinophils.`);
      s.push('The findings are consistent with eosinophilic cholecystitis.');
      break;
    case 'None – unremarkable':
    case 'None - unremarkable':
      s.push(`Sections of the gallbladder show mucosa lined by a single layer of columnar epithelium with an underlying muscular wall of normal thickness${ras ? ' and occasional Rokitansky-Aschoff sinuses' : ''}. There is no significant inflammation.`);
      break;
    default: // Chronic
      s.push(`Sections of the gallbladder show thickening of the muscular wall${ras ? ', Rokitansky-Aschoff sinus formation' : ''} ${chronicInfiltrate}.`);
      s.push('The findings are consistent with chronic cholecystitis.');
  }

  if (v.cholesterolosis === 'Present') s.push('Aggregates of foamy histiocytes are present within the lamina propria of the mucosal folds, in keeping with cholesterolosis.');
  if (v.adenomyomatous === 'Present – fundus' || v.adenomyomatous === 'Present - fundus') {
    s.push('The fundus shows adenomyomatous hyperplasia, composed of deeply penetrating, irregularly cystically dilated glands accompanied by bundles of fibromuscular proliferation.');
  } else if (v.adenomyomatous === 'Present') {
    s.push('There is adenomyomatous hyperplasia, composed of deeply penetrating, irregularly cystically dilated glands accompanied by bundles of fibromuscular proliferation.');
  }
  const meta = [];
  if (v.pyloricMetaplasia === 'Present') meta.push('pyloric gland metaplasia');
  if (v.intestinalMetaplasia === 'Present') meta.push('intestinal metaplasia');
  if (meta.length) s.push(`The mucosa shows focal ${listJoin(meta)}.`);

  if (hasNeoplasia(v)) s.push(NEOPLASIA_MICRO[v.neoplasia] || `There is ${lc1(v.neoplasia)}; see comment.`);

  if (v.cysticMargin === 'Inflamed') s.push('The cystic duct margin shows chronic inflammation.');
  else if (v.cysticMargin === 'Involved by dysplasia') s.push('The cystic duct margin is involved by dysplasia.');
  else if (v.cysticMargin === 'Unremarkable' && hasNeoplasia(v)) s.push('The cystic duct margin is not involved.');

  if (v.cysticNodeResult === 'Reactive') s.push('The cystic duct lymph node shows reactive changes only.');
  else if (v.cysticNodeResult === 'Metastatic') s.push('The cystic duct lymph node contains metastatic carcinoma.');

  if (!hasNeoplasia(v)) s.push('There is no evidence of dysplasia or malignancy.');

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const MAIN = {
  Chronic: 'CHRONIC CHOLECYSTITIS',
  'Acute-on-chronic': 'ACUTE AND CHRONIC CHOLECYSTITIS',
  Acute: 'ACUTE CHOLECYSTITIS',
  Gangrenous: 'ACUTE GANGRENOUS CHOLECYSTITIS',
  Xanthogranulomatous: 'XANTHOGRANULOMATOUS CHOLECYSTITIS',
  Follicular: 'CHRONIC FOLLICULAR CHOLECYSTITIS',
  Eosinophilic: 'EOSINOPHILIC CHOLECYSTITIS',
  'None – unremarkable': 'NO SIGNIFICANT ABNORMALITY',
  'None - unremarkable': 'NO SIGNIFICANT ABNORMALITY'
};

const NEOPLASIA_DX = {
  'Low grade dysplasia': 'LOW GRADE DYSPLASIA (BilIN-1/2)',
  'High grade dysplasia (BilIN-3)': 'HIGH GRADE DYSPLASIA (BilIN-3)',
  'Adenocarcinoma – see comment': 'ADENOCARCINOMA',
  'Adenocarcinoma - see comment': 'ADENOCARCINOMA',
  'Intracholecystic papillary neoplasm': 'INTRACHOLECYSTIC PAPILLARY NEOPLASM'
};

export function diagnosis(part) {
  const v = part.values;
  const clauses = [];
  if (hasNeoplasia(v)) {
    clauses.push(NEOPLASIA_DX[v.neoplasia] || String(v.neoplasia).toUpperCase());
    const bg = MAIN[v.cholecystitis] || 'CHRONIC CHOLECYSTITIS';
    if (bg !== 'NO SIGNIFICANT ABNORMALITY') clauses.push(`background ${bg.toLowerCase()}`);
  } else {
    clauses.push(MAIN[v.cholecystitis] || 'CHRONIC CHOLECYSTITIS');
  }
  if (stonesPresent(v)) clauses.push('cholelithiasis');
  if (v.cholesterolosis === 'Present') clauses.push('cholesterolosis');
  if (v.adenomyomatous && v.adenomyomatous !== 'Absent') clauses.push('adenomyomatous hyperplasia');
  if (v.intestinalMetaplasia === 'Present') clauses.push('intestinal metaplasia');
  if (v.cysticMargin === 'Involved by dysplasia') clauses.push('cystic duct margin involved by dysplasia');
  if (v.cysticNodeResult === 'Reactive') clauses.push('cystic duct lymph node reactive (0/1)');
  else if (v.cysticNodeResult === 'Metastatic') clauses.push('metastatic carcinoma in cystic duct lymph node (1/1)');
  clauses.push(hasNeoplasia(v) ? 'see comment' : 'no evidence of dysplasia or malignancy');
  return `(${part.label}) GALLBLADDER, cholecystectomy - ${clauses.join('; ')}`;
}

// Cross-template upgrade: when the case turned out malignant or preinvasive, offer
// "Upgrade this part" into the gallbladder carcinoma synoptic (generators/gallbladder_carcinoma.js)
// so the part keeps its label and macro while the synoptic fields are pre-filled.
export const UPGRADE_TO = {
  to: 'gallbladder_carcinoma',
  label: 'Upgrade this part',
  when: (v) => /^Adenocarcinoma|^Intracholecystic papillary neoplasm/.test(v.neoplasia || ''),
  map: (v) => ({
    specimenName: (v.specimenName || '').trim(),
    procedure: 'Simple cholecystectomy (laparoscopic or open)',
    tumourSite: ['Not specified'],
    histType: /^Intracholecystic papillary neoplasm/.test(v.neoplasia || '')
      ? 'Intracholecystic papillary neoplasm with associated invasive carcinoma'
      : 'Adenocarcinoma, biliary type',
    hgIEN: /^Involved by dysplasia/.test(v.cysticMargin || '') ? 'High-grade intraepithelial neoplasia present at the bile duct margin' : '',
    nodesExamined: v.cysticNodeResult === 'Metastatic' ? 1 : '',
    nodesInvolved: v.cysticNodeResult === 'Metastatic' ? 1 : '',
    additionalFindings: [
      v.intestinalMetaplasia === 'Present' ? 'Intestinal metaplasia' : '',
      /^Present/.test(v.stones || '') ? 'Cholelithiasis' : '',
      { 'Chronic': 'Chronic cholecystitis', 'Acute': 'Acute cholecystitis', 'Acute-on-chronic': 'Acute cholecystitis' }[v.cholecystitis || ''] || '',
      v.mucosa === 'Flattened, fibrotic' && /porcelain/i.test(v.additionalNotes || '') ? 'Diffuse calcification (porcelain gallbladder)' : ''
    ].filter(Boolean)
  })
};

export default { specimenName, macro, blockKey, microscopy, diagnosis, UPGRADE_TO };
