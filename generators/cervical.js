// Cervical biopsy generator. Pure functions: (part, ctx) -> string.
// Colposcopic punch biopsies, endocervical curettings and cervical polyps as lettered parts.
// Squamous lesions use the two-tier LAST / WHO 5th edition scheme with the CIN grade in
// brackets (house style: "HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / CIN III)").
// Wording is protected by tests/cervical.test.js — change it only deliberately.

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

export const isECC = (v) => v.specimenType === 'Endocervical curettings';
export const isPolyp = (v) => v.specimenType === 'Cervical polyp';
export const isInadequateECC = (v) => isECC(v) && v.eccContent === 'Mucus and blood only (inadequate)';

const site = (v) => (v.specimenName || '').replace(/\s*\bcervi(x|cal)\b\s*/i, ' ').replace(/^[\s,]+|[\s,]+$/g, '').trim();

export function specimenName(part) {
  const v = part.values;
  if (isECC(v)) return 'Endocervical curettings';
  const s = site(v);
  if (isPolyp(v)) return s ? `Cervix, ${s}, polyp` : 'Cervix, polyp';
  return s ? `Cervix, ${s}, biopsy` : 'Cervix, biopsy';
}

/** "CERVIX, cervical biopsy at 12 o'clock" / "ENDOCERVICAL CURETTINGS" / "CERVIX, polyp". */
export function organPhrase(part) {
  const v = part.values;
  if (isECC(v)) return 'ENDOCERVICAL CURETTINGS';
  const s = site(v);
  if (isPolyp(v)) return `CERVIX, polyp${s ? ` at ${s}` : ''}`;
  return `CERVIX, cervical biopsy${s ? ` at ${s}` : ''}`;
}

// Squamous ranking: 0 negative, 1 HPV effect only, 2 LSIL, 3 CIN II, 4 CIN III, 5 SCC.
const SQ_RANK = { Negative: 0, 'LSIL (CIN I)': 2, 'HSIL (CIN II)': 3, 'HSIL (CIN III)': 4, 'Squamous cell carcinoma': 5 };
export function squamousRank(v) {
  if (isInadequateECC(v)) return 0;
  const r = SQ_RANK[v.squamous] ?? 0;
  if (r === 0 && v.koilocytosis === 'Present') return 1;
  return r;
}
export const isHSIL = (v) => squamousRank(v) === 3 || squamousRank(v) === 4;
export const isSCC = (v) => v.squamous === 'Squamous cell carcinoma' && !isInadequateECC(v);

const GL_RANK = { Negative: 0, 'Adenocarcinoma in situ, HPV-associated': 1, 'Adenocarcinoma in situ, HPV-independent (gastric type)': 1, 'Adenocarcinoma, HPV-associated': 2, 'Adenocarcinoma, HPV-independent (gastric type)': 2 };
export const glandularRank = (v) => (isInadequateECC(v) ? 0 : GL_RANK[v.glandular] ?? 0);
export const isAIS = (v) => glandularRank(v) === 1;
export const isAdenoca = (v) => glandularRank(v) === 2;
export const hasLesion = (v) => squamousRank(v) > 0 || glandularRank(v) > 0;
export const isInvasive = (v) => isSCC(v) || isAdenoca(v);

// ---------- microscopy ----------

const TISSUE_TEXT = {
  'Transformation zone mucosa': 'cervical transformation zone mucosa',
  'Ectocervical mucosa': 'ectocervical mucosa',
  'Endocervical mucosa': 'endocervical mucosa',
  'Ectocervical and endocervical mucosa': 'ectocervical and endocervical mucosa',
  'Detached squamous epithelium and endocervical fragments': 'detached squamous epithelium and fragments of endocervical epithelium',
};

const BENIGN_SENTENCE = {
  'Chronic cervicitis': 'The stroma contains a chronic inflammatory infiltrate of lymphocytes and plasma cells.',
  'Follicular cervicitis': 'The stroma contains lymphoid follicles with germinal centres, in keeping with follicular cervicitis.',
  'Immature squamous metaplasia': 'Immature squamous metaplasia is present in the transformation zone.',
  Atrophy: 'The squamous epithelium is thin and atrophic with reduced glycogenation and no maturation abnormality.',
  'Endocervical polyp': 'The polyp consists of endocervical glands and fibrovascular stroma with surface squamous metaplasia and focal erosion.',
  'Nabothian cysts': 'Dilated mucus-filled endocervical glands (Nabothian cysts) are present.',
  'Condyloma acuminatum': 'There is a papillary squamous proliferation with acanthosis, hyperkeratosis and prominent koilocytosis, consistent with condyloma acuminatum.',
  'Tuboendometrioid metaplasia': 'Some endocervical glands are lined by ciliated tubal-type epithelium, in keeping with tuboendometrioid metaplasia.',
  'Microglandular hyperplasia': 'There is a tightly packed proliferation of small endocervical glands with neutrophils and subnuclear vacuoles, in keeping with microglandular hyperplasia.',
  Endometriosis: 'Endometrial-type glands and stroma are present within the cervical stroma, consistent with endometriosis.',
  'Decidual change': 'The stroma shows decidual change.',
  'Radiation change': 'The stroma shows hyalinisation with atypical fibroblasts and vascular change, consistent with radiation effect.',
  'Reactive / reparative change': 'The epithelium shows reactive and reparative change with nuclear enlargement, prominent nucleoli and preserved polarity, without dysplasia.',
};

export function microscopy(part, ctx) {
  const v = part.values;
  const s = [];
  const n = num(v.pieces);
  const pieces = n && n > 1 ? `${fmt(n)} pieces of` : 'a piece of';

  if (isECC(v)) {
    if (isInadequateECC(v)) {
      s.push('Sections show mucus and blood only. No epithelium is present for assessment.');
      const notes = (v.additionalNotes || '').trim();
      if (notes) s.push(notes);
      return `(${part.label}) ${s.join(' ')}`;
    }
    s.push(v.eccContent === 'Endocervical mucosa with detached squamous fragments'
      ? 'Sections show fragments of endocervical mucosa and mucus together with detached strips of squamous epithelium.'
      : 'Sections show fragments of endocervical mucosa and mucus.');
  } else if (isPolyp(v)) {
    s.push(`Sections show ${pieces} polypoid cervical tissue.`);
  } else {
    s.push(`Serial sections show ${pieces} ${TISSUE_TEXT[v.tissue] || 'cervical mucosa'}.`);
  }

  // Squamous epithelium
  const sq = v.squamous;
  const koilo = v.koilocytosis === 'Present';
  if (isSCC(v)) {
    const depth = num(v.invasionDepth);
    s.push(`There is an invasive ${v.sccType === 'Keratinising' ? 'keratinising' : 'non-keratinising'} squamous cell carcinoma infiltrating the stroma as irregular nests and cords of atypical squamous cells with a desmoplastic and inflammatory response${depth ? `, to a depth of at least ${fmt(depth)} mm in this biopsy` : ''}.`);
    s.push(v.lvi === 'Present' ? 'Lymphovascular invasion is present.' : 'No lymphovascular invasion is identified.');
  } else if (sq === 'HSIL (CIN III)') {
    s.push('The squamous epithelium shows full thickness loss of maturation with enlarged hyperchromatic pleomorphic nuclei, a high nuclear to cytoplasmic ratio and mitoses in the upper layers.');
  } else if (sq === 'HSIL (CIN II)') {
    s.push('The squamous epithelium shows loss of maturation with enlarged hyperchromatic nuclei and mitoses extending into the middle third, with maturation of the upper third.');
  } else if (sq === 'LSIL (CIN I)') {
    s.push('Focally, the squamous epithelium shows enlarged hyperchromatic nuclei limited to the basal third, with maturation towards the surface.');
  } else if (!isECC(v) || v.eccContent === 'Endocervical mucosa with detached squamous fragments') {
    s.push('The squamous epithelium shows normal maturation and no CIN is seen.');
  }
  if (koilo && !isSCC(v)) s.push(sq === 'Negative' ? 'Koilocytosis is present.' : 'Koilocytosis is also seen.');
  if (isHSIL(v)) {
    if (v.glandInvolvement === 'Involved') s.push('The lesion extends into endocervical glands.');
    s.push(v.invasionSuspicious === 'Cannot be excluded'
      ? 'There are irregular nests at the epithelial–stromal interface with a stromal response; early stromal invasion cannot be excluded in this biopsy.'
      : 'No stromal invasion is identified.');
  }

  // Immunohistochemistry
  const ihc = [];
  if (v.p16 === 'Block positive') ihc.push('p16 shows strong diffuse block positivity');
  else if (v.p16 === 'Negative') ihc.push('p16 is negative');
  else if (v.p16 === 'Patchy / focal') ihc.push('p16 shows patchy, non-block staining');
  if (v.ki67 === 'Extends into the upper two-thirds') ihc.push('Ki-67 labels nuclei extending into the upper two-thirds of the epithelium');
  else if (v.ki67 === 'Confined to the basal and parabasal layers') ihc.push('Ki-67 is confined to the basal and parabasal layers');
  if (ihc.length) s.push(`On immunohistochemistry, ${listJoin(ihc)}${isHSIL(v) && v.p16 === 'Block positive' ? ', supporting a high grade lesion' : ''}.`);

  // Glandular epithelium
  const gl = v.glandular;
  if (gl === 'Adenocarcinoma in situ, HPV-associated') {
    s.push('The endocervical glands are partly replaced by stratified columnar cells with elongated hyperchromatic nuclei, apical mitoses and apoptotic bodies, with preservation of the normal glandular architecture, in keeping with adenocarcinoma in situ of HPV-associated type. No stromal invasion is identified.');
  } else if (gl === 'Adenocarcinoma in situ, HPV-independent (gastric type)') {
    s.push('The endocervical glands are lined by cells with abundant pale to clear mucinous cytoplasm, distinct cell borders and enlarged irregular nuclei, with preserved glandular architecture, in keeping with adenocarcinoma in situ of gastric type. No stromal invasion is identified.');
  } else if (gl === 'Adenocarcinoma, HPV-associated') {
    s.push('Infiltrating irregular glands lined by stratified columnar cells with hyperchromatic nuclei, apical mitoses and apoptotic bodies are present within the stroma with a desmoplastic response, consistent with adenocarcinoma of HPV-associated type.');
  } else if (gl === 'Adenocarcinoma, HPV-independent (gastric type)') {
    s.push('Infiltrating irregular and claw-like glands lined by cells with abundant clear or foamy cytoplasm, distinct cell borders and atypical nuclei are present within the stroma, consistent with adenocarcinoma of gastric type.');
  } else if (!isPolyp(v) && !(isHSIL(v) && v.glandInvolvement === 'Involved') && (isECC(v) || ['Endocervical mucosa', 'Ectocervical and endocervical mucosa', 'Transformation zone mucosa', 'Detached squamous epithelium and endocervical fragments'].includes(v.tissue))) {
    s.push('The endocervical glands are unremarkable.');
  }

  if (BENIGN_SENTENCE[v.benign]) s.push(BENIGN_SENTENCE[v.benign]);

  // Closing negatives
  if (!hasLesion(v)) s.push('There is no evidence of squamous intraepithelial lesion, glandular dysplasia or malignancy.');
  else if (squamousRank(v) <= 2 && glandularRank(v) === 0) s.push('There is no evidence of high grade squamous intraepithelial lesion or malignancy.');
  else if (!isInvasive(v)) s.push('There is no evidence of invasive malignancy.');

  // Cytology correlation
  if (v.correlation === 'Lesion reported on cytology is not represented') {
    const cyto = String(ctx?.case?.cytology || '').trim();
    s.push(`The ${cyto ? `${cyto} ` : 'lesion '}reported on cytology is not represented in this biopsy; correlation with the colposcopic findings and further sampling are suggested if clinically indicated.`);
  }

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

export function squamousClause(v) {
  if (isSCC(v)) {
    const depth = num(v.invasionDepth);
    return `INVASIVE SQUAMOUS CELL CARCINOMA, ${v.sccType === 'Keratinising' ? 'keratinising' : 'non-keratinising'} type${depth ? `, depth of invasion at least ${fmt(depth)} mm` : ''}${v.lvi === 'Present' ? ', with lymphovascular invasion' : ''}`;
  }
  const sq = v.squamous;
  const hpv = v.koilocytosis === 'Present';
  if (sq === 'HSIL (CIN III)' || sq === 'HSIL (CIN II)') {
    let t = `HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / ${sq === 'HSIL (CIN III)' ? 'CIN III' : 'CIN II'}${hpv ? ' AND HPV EFFECT' : ''})`;
    if (v.glandInvolvement === 'Involved') t += ' with endocervical gland involvement';
    if (v.invasionSuspicious === 'Cannot be excluded') t += '; early stromal invasion cannot be excluded, excision recommended for definitive assessment';
    return t;
  }
  if (sq === 'LSIL (CIN I)') return `LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CIN I${hpv ? ' AND HPV EFFECT' : ''})`;
  if (hpv) return 'LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (HPV EFFECT)';
  return '';
}

export function glandularClause(v) {
  switch (v.glandular) {
    case 'Adenocarcinoma in situ, HPV-associated': return 'ADENOCARCINOMA IN SITU, HPV-associated';
    case 'Adenocarcinoma in situ, HPV-independent (gastric type)': return 'ADENOCARCINOMA IN SITU, HPV-independent (gastric type)';
    case 'Adenocarcinoma, HPV-associated': return 'INVASIVE ADENOCARCINOMA, HPV-associated';
    case 'Adenocarcinoma, HPV-independent (gastric type)': return 'INVASIVE ADENOCARCINOMA, HPV-independent (gastric type)';
    default: return '';
  }
}

export function diagnosis(part, ctx) {
  const v = part.values;
  if (isInadequateECC(v)) return `(${part.label}) ${organPhrase(part)} - MUCUS AND BLOOD ONLY; NO EPITHELIUM FOR ASSESSMENT (INADEQUATE)`;
  const clauses = [squamousClause(v), glandularClause(v)].filter(Boolean);
  if (v.benign && v.benign !== 'None') clauses.push(v.benign.replace(' / ', ' AND ').toUpperCase());
  const extras = [];
  if (!clauses.length) clauses.push('NO EVIDENCE OF SQUAMOUS INTRAEPITHELIAL LESION OR MALIGNANCY');
  else if (!hasLesion(v)) extras.push('no evidence of dysplasia or malignancy');
  if (v.correlation === 'Lesion reported on cytology is not represented') extras.push('see comment');
  return `(${part.label}) ${organPhrase(part)} - ${[...clauses, ...extras].join('; ')}`;
}

// ---------- case summary ----------

const SQ_TEXT = { 1: 'HPV effect', 2: 'LSIL (CIN I)', 3: 'HSIL (CIN II)', 4: 'HSIL (CIN III)', 5: 'invasive squamous cell carcinoma' };
const GL_TEXT = { 1: 'adenocarcinoma in situ', 2: 'invasive adenocarcinoma' };
const partList = (parts) => (parts.length === 1 ? `part ${parts[0].label}` : `parts ${listJoin(parts.map((p) => p.label))}`);

/** One SUMMARY line for multi-part cases; omitted for single parts or when the option is off. */
export function summary(parts, ctx) {
  if (parts.length < 2 || ctx.options.summary === false) return '';
  const bits = [];
  const sqTop = Math.max(...parts.map((p) => squamousRank(p.values)));
  if (sqTop > 0) bits.push(`highest grade squamous lesion ${SQ_TEXT[sqTop]} in ${partList(parts.filter((p) => squamousRank(p.values) === sqTop))}`);
  const glTop = Math.max(...parts.map((p) => glandularRank(p.values)));
  if (glTop > 0) bits.push(`${GL_TEXT[glTop]} in ${partList(parts.filter((p) => glandularRank(p.values) === glTop))}`);
  const inadequate = parts.filter((p) => isInadequateECC(p.values));
  if (inadequate.length) bits.push(`${partList(inadequate)} inadequate`);
  if (!bits.length) return 'SUMMARY: No squamous intraepithelial lesion, glandular dysplasia or malignancy in any part.';
  const text = bits.join('; ');
  return `SUMMARY: ${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export default { specimenName, microscopy, diagnosis, summary };
