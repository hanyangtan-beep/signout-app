// Spleen (benign & vascular): non-neoplastic splenic resections, splenic cysts and WHO-HAEM5
// stroma-derived / vascular neoplasms (SANT, littoral cell angioma, splenic hamartoma, haemangioma,
// lymphangioma, splenic angiosarcoma, FDC sarcoma and EBV-positive inflammatory FDC sarcoma).

import { stripDot, letteredBlockKey, checks } from './_house.js';
import { renderDiagnosis } from '../src/synoptic.js';

const lettered = (part, ctx) => (ctx?.parts?.length || 1) > 1;
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) && n > 0 ? n : null; };
const withCm = (s) => (/\b(cm|mm)\b/i.test(s) ? s : `${s} cm`);

const PROC_HEAD = {
  'Total splenectomy': 'SPLEEN, total splenectomy',
  'Partial splenectomy': 'SPLEEN, partial splenectomy',
  'Excision of accessory spleen (splenunculus)': 'ACCESSORY SPLEEN (SPLENUNCULUS), excision',
  'Splenic cyst excision / decapsulation': 'SPLENIC CYST, excision',
  'Splenic biopsy': 'SPLEEN, biopsy'
};

const PROC_SPEC = {
  'Total splenectomy': 'Spleen, total splenectomy',
  'Partial splenectomy': 'Spleen, partial splenectomy',
  'Excision of accessory spleen (splenunculus)': 'Accessory spleen (splenunculus), excision',
  'Splenic cyst excision / decapsulation': 'Splenic cyst, excision',
  'Splenic biopsy': 'Spleen, biopsy'
};

const DX_LINE = {
  'Traumatic rupture / laceration': 'SPLENIC RUPTURE / LACERATION WITH HAEMORRHAGE',
  'Congestive splenomegaly': 'CONGESTIVE SPLENOMEGALY',
  'Splenic infarction': 'SPLENIC INFARCTION',
  'Accessory spleen (splenunculus)': 'ACCESSORY SPLEEN (SPLENUNCULUS)',
  'Unremarkable spleen (incidental / staging)': 'UNREMARKABLE SPLENIC PARENCHYMA',
  'Granulomatous splenitis': 'GRANULOMATOUS SPLENITIS',
  'Extramedullary haematopoiesis': 'EXTRAMEDULLARY HAEMATOPOIESIS',
  'Hyaloserositis (sugar-coated spleen)': 'SPLENIC HYALOSEROSITIS',
  'Epithelial (epidermoid / mesothelial) cyst': 'PRIMARY EPITHELIAL CYST OF THE SPLEEN',
  'Pseudocyst (post-traumatic / non-epithelial)': 'SPLENIC PSEUDOCYST',
  'Hydatid (echinococcal) cyst': 'HYDATID (ECHINOCOCCAL) CYST OF THE SPLEEN',
  'Sclerosing angiomatoid nodular transformation (SANT)': 'SCLEROSING ANGIOMATOID NODULAR TRANSFORMATION (SANT)',
  'Littoral cell angioma': 'LITTORAL CELL ANGIOMA',
  'Splenic hamartoma': 'SPLENIC HAMARTOMA',
  'Cavernous haemangioma': 'CAVERNOUS HAEMANGIOMA',
  'Lymphangioma': 'SPLENIC LYMPHANGIOMA',
  'Splenic angiosarcoma': 'PRIMARY SPLENIC ANGIOSARCOMA',
  'EBV-positive inflammatory follicular dendritic cell sarcoma': 'EBV-POSITIVE INFLAMMATORY FOLLICULAR DENDRITIC CELL SARCOMA',
  'Follicular dendritic cell sarcoma': 'FOLLICULAR DENDRITIC CELL SARCOMA'
};

const DX_MICRO = {
  'Traumatic rupture / laceration': 'Sections show splenic parenchyma with capsular disruption, subcapsular and parenchymal haemorrhage, and fibrinous exudate. No underlying neoplasm is identified.',
  'Congestive splenomegaly': 'Sections show expanded, congested red pulp with dilated sinusoids, increased cordal fibrosis and relative attenuation of the white pulp.',
  'Splenic infarction': 'Sections show sharply demarcated area(s) of coagulative necrosis involving both red and white pulp, bordered by haemorrhage, fibrin and a zone of granulation tissue/fibrosis.',
  'Accessory spleen (splenunculus)': 'Sections show encapsulated splenic tissue composed of normal white pulp lymphoid follicles and red pulp cords and sinusoids.',
  'Unremarkable spleen (incidental / staging)': 'Sections show splenic parenchyma with preserved white pulp lymphoid follicles and unremarkable red pulp cords and sinusoids. No neoplasm is seen.',
  'Granulomatous splenitis': 'Sections show splenic parenchyma containing epithelioid granulomas with multinucleated giant cells.',
  'Extramedullary haematopoiesis': 'Sections show trilineage extramedullary haematopoiesis within the splenic red pulp, including erythroid precursors, myeloid cells and megakaryocytes.',
  'Hyaloserositis (sugar-coated spleen)': 'Sections show dense hyalinised, paucicellular collagenous thickening of the splenic capsule over unremarkable underlying parenchyma.',
  'Epithelial (epidermoid / mesothelial) cyst': 'Sections show a fibrous-walled splenic cyst.',
  'Pseudocyst (post-traumatic / non-epithelial)': 'Sections show a fibrous-walled splenic cyst devoid of an epithelial lining, with inner fibrinous debris, haemosiderin-laden macrophages and focal calcification.',
  'Hydatid (echinococcal) cyst': 'Sections show a parasitic cyst with a fibrous pericyst and characteristic acellular eosinophilic laminated membrane.',
  'Sclerosing angiomatoid nodular transformation (SANT)': 'Sections show a well-circumscribed, unencapsulated splenic lesion composed of multiple coalescing angiomatoid nodules set within a dense, concentric fibrosclerotic and myofibroblastic stroma containing scattered lymphocytes, plasma cells and haemosiderin-laden macrophages. The nodules comprise slit-like to irregular vascular spaces lined by plump endothelial cells without significant cytological atypia or mitotic activity.',
  'Littoral cell angioma': 'Sections show a splenic vascular lesion composed of anastomosing, blood-filled vascular channels with papillary projections lined by tall, plump endothelial cells with bland nuclei and occasional intraluminal exfoliated histiocyte-like cells showing haemophagocytosis. Mitotic activity and cytological atypia are absent.',
  'Splenic hamartoma': 'Sections show a well-demarcated, unencapsulated nodule composed of disorganised red pulp elements, including slit-like sinusoids and fibrous cords, without organised white pulp lymphoid follicles.',
  'Cavernous haemangioma': 'Sections show a well-circumscribed vascular lesion composed of dilated, thin-walled, blood-filled vascular channels lined by a single layer of flattened, cytologically bland endothelial cells.',
  'Lymphangioma': 'Sections show dilated, thin-walled lymphatic channels containing pale eosinophilic proteinaceous fluid and lined by flattened, bland endothelial cells.',
  'Splenic angiosarcoma': 'Sections show a destructive malignant vasoformative neoplasm composed of irregular anastomosing vascular channels and solid sheets of markedly atypical spindle and epithelioid endothelial cells with hyperchromatic nuclei, frequent mitotic figures, areas of haemorrhage and coagulative tumour necrosis.',
  'EBV-positive inflammatory follicular dendritic cell sarcoma': 'Sections show a well-circumscribed splenic mass composed of loosely arranged fascicles and whorls of mildly atypical spindle-to-ovoid cells with vesicular nuclei, small nucleoli and indistinct cell borders, set in a dense lymphoplasmacytic inflammatory background.',
  'Follicular dendritic cell sarcoma': 'Sections show a neoplasm composed of fascicles, storiform arrays and whorls of spindle-to-ovoid cells with eosinophilic cytoplasm, indistinct cell borders, vesicular nuclei and admixed small lymphocytes.'
};

const BG_PHRASES = {
  'Red pulp congestion': 'red pulp congestion',
  'Subcapsular / parenchymal haemorrhage': 'subcapsular and parenchymal haemorrhage',
  'Coagulative necrosis / infarction': 'areas of coagulative necrosis',
  'Gamna-Gandy bodies': 'Gamna-Gandy (siderotic) bodies',
  'Extramedullary haematopoiesis': 'foci of extramedullary haematopoiesis',
  'Haemosiderosis': 'haemosiderin deposition',
  'Hyaloserositis': 'capsular hyaloserositis',
  'Unremarkable white and red pulp': 'otherwise unremarkable white and red pulp'
};

export function specimenName(part) {
  return PROC_SPEC[part.values.procedure] || 'Spleen, splenectomy';
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const out = [];
  const noun = v.procedure === 'Excision of accessory spleen (splenunculus)' ? 'an accessory spleen'
    : v.procedure === 'Splenic cyst excision / decapsulation' ? 'a splenic cyst specimen'
      : v.procedure === 'Partial splenectomy' ? 'a partial splenectomy specimen'
        : v.procedure === 'Splenic biopsy' ? 'splenic tissue'
          : 'a spleen';
  const w = int(v.weight);
  const dim = stripDot(v.dimensions);
  const measures = [w ? `weighing ${w} g` : '', dim ? `measuring ${withCm(dim)}` : ''].filter(Boolean).join(' and ');
  out.push(`Received in formalin is ${noun}${measures ? ` ${measures}` : ''}.`);
  if (v.capsule && v.capsule !== 'Not assessable') out.push(`The capsule is ${v.capsule.toLowerCase()}.`);
  if (v.cutSurface) out.push(`The cut surface shows ${v.cutSurface.toLowerCase()}.`);
  const lsz = stripDot(v.lesionSize);
  if (lsz) {
    const mult = v.lesionCount === 'Multiple' ? 'The largest lesion measures' : 'The lesion measures';
    out.push(`${mult} ${withCm(lsz)}.`);
  }
  if (v.hilarNodes && v.hilarNodes !== 'None identified') out.push(`Splenic hilar lymph nodes are ${v.hilarNodes.replace(/^Present,\s*/i, '').toLowerCase()}.`);
  const b = int(v.blocks);
  if (b) out.push(`Representative sections are submitted in ${b} block${b === 1 ? '' : 's'}.`);
  const notes = stripDot(v.macroNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

export function microscopy(part) {
  const v = part.values;
  const out = [];
  if (v.dx === 'Other (specify)') {
    const custom = stripDot(v.dxOther);
    out.push(custom ? `Sections show splenic parenchyma with features of ${custom.toLowerCase()}.` : 'Sections show splenic parenchyma.');
  } else {
    out.push(DX_MICRO[v.dx] || 'Sections show splenic parenchyma.');
  }

  if (v.dx === 'Epithelial (epidermoid / mesothelial) cyst' && v.cystLining) {
    const lining = {
      'Stratified squamous (epidermoid)': 'The cyst is lined by stratified squamous epithelium without skin adnexa.',
      'Cuboidal / flattened mesothelial': 'The cyst is lined by a single layer of cuboidal to flattened mesothelial epithelium.',
      'Mixed squamous and mesothelial': 'The cyst is lined by cuboidal mesothelial epithelium with areas of stratified squamous metaplasia.'
    }[v.cystLining];
    if (lining) out.push(lining);
  }

  const bg = (Array.isArray(v.backgroundFeatures) ? v.backgroundFeatures : [])
    .map((k) => BG_PHRASES[k])
    .filter(Boolean);
  if (bg.length) out.push(`The background splenic parenchyma shows ${list(bg)}.`);

  const ihcSum = stripDot(v.ihcSummary);
  if (ihcSum) out.push(`Immunohistochemistry: ${cap1(ihcSum)}.`);
  else if (Array.isArray(v.ihcDone) && v.ihcDone.length) out.push(`Immunohistochemical stains performed include ${list(v.ihcDone)}.`);

  if (v.eber && v.eber !== 'Not performed') {
    out.push(`In situ hybridisation for EBER is ${v.eber.toLowerCase()}.`);
  }

  if (v.hilarNodeStatus === 'Reactive / unremarkable') out.push('Splenic hilar lymph nodes show reactive changes without tumour involvement.');
  else if (v.hilarNodeStatus === 'Involved by tumour') out.push('Splenic hilar lymph node involvement by tumour is present.');

  const notes = stripDot(v.morphNotes);
  if (notes) out.push(`${cap1(notes)}.`);

  return `(${part.label}) ${out.join(' ')}`;
}

export function diagnosis(part) {
  const v = part.values;
  const head = `(${part.label}) ${PROC_HEAD[v.procedure] || 'SPLEEN, splenectomy'}`;
  const main = v.dx === 'Other (specify)' ? (stripDot(v.dxOther).toUpperCase() || 'SPLENIC LESION (see description)') : (DX_LINE[v.dx] || v.dx.toUpperCase());
  const lines = [main];
  if (v.hilarNodeStatus === 'Reactive / unremarkable') lines.push('Splenic hilar lymph nodes: reactive, negative for tumour');
  else if (v.hilarNodeStatus === 'Involved by tumour') lines.push('Splenic hilar lymph nodes: INVOLVED BY TUMOUR');
  return renderDiagnosis(head, lines);
}

export function flags(parts) {
  const out = [];
  const dxs = (parts || []).map((p) => p.values?.dx);
  if (dxs.includes('Sclerosing angiomatoid nodular transformation (SANT)')) out.push('sant');
  if (dxs.includes('Littoral cell angioma')) out.push('lca');
  if (dxs.includes('EBV-positive inflammatory follicular dendritic cell sarcoma')) out.push('ebvFdcs');
  if (dxs.includes('Splenic angiosarcoma')) out.push('angiosarcoma');
  return out;
}

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const ihc = Array.isArray(v.ihcDone) ? v.ihcDone : [];

  if (v.dx === 'Other (specify)' && !stripDot(v.dxOther)) err('Specify the diagnosis.', 'dxOther');

  if (v.dx === 'Sclerosing angiomatoid nodular transformation (SANT)') {
    const missing = ['CD31', 'CD34', 'CD8'].filter((m) => !has(ihc, m));
    if (missing.length) info(`SANT confirmation typically demonstrates the triphasic vascular immunophenotype (CD34, CD31 and CD8); consider recording ${list(missing)}.`, 'ihcDone');
  }

  if (v.dx === 'Littoral cell angioma') {
    const hasEndo = has(ihc, 'CD31') || has(ihc, 'ERG');
    const hasHist = has(ihc, 'CD68') || has(ihc, 'CD163') || has(ihc, 'CD21');
    if (!hasEndo || !hasHist || !has(ihc, 'CD8')) {
      info('Littoral cell angioma characteristically shows dual endothelial/histiocytic staining (CD31+, CD68+/CD163+/CD21+) with loss of CD8 and CD34.', 'ihcDone');
    }
  }

  if (v.dx === 'EBV-positive inflammatory follicular dendritic cell sarcoma') {
    if (v.eber !== 'Positive in neoplastic spindle cells') {
      warn('WHO-HAEM5 EBV-positive inflammatory follicular dendritic cell sarcoma requires EBER ISH positivity in the neoplastic spindle cells.', 'eber');
    }
    if (!['CD21', 'CD23', 'CD35'].some((m) => has(ihc, m))) {
      warn('Record at least one follicular dendritic cell marker (CD21, CD23 or CD35) to confirm FDC differentiation.', 'ihcDone');
    }
  }

  if (v.dx === 'Splenic angiosarcoma') {
    if (!['CD31', 'ERG', 'CD34'].some((m) => has(ihc, m))) {
      warn('Primary splenic angiosarcoma should be confirmed with endothelial markers (e.g. CD31, ERG, CD34).', 'ihcDone');
    }
  }

  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags, validate };
