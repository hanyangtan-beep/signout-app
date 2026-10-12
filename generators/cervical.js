// Cervical biopsy generator. Pure functions: (part, ctx) -> string.
// Colposcopic punch biopsies, endocervical curettings and cervical polyps as lettered parts.
// Squamous lesions use the two-tier LAST / WHO 5th edition scheme with the CIN grade in
// brackets (house style: "HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / CIN III)").
// Wording is protected by tests/cervical.test.js — change it only deliberately.
//
// Cervical polyps (user request, 2026-10-05). Measured on the released reports (counts only): most
// cervical polyps are signed out "ENDOCERVICAL POLYP" alone, with no trailing negative, and a few are
// decidual or endometrial polyps; the commonest exact head is "CERVIX, POLYPECTOMY". The description
// follows the released microscopy (glands, columnar epithelium, fibrovascular stroma, inflammation and
// dilated glands are its commonest phrases) and the published features: a fibrovascular core with
// thick-walled vessels, cystic glands, squamous metaplasia, surface erosion and chronic inflammation
// (PathologyOutlines, Endocervical polyp); in decidual polyps the stromal cells have abundant pink
// cytoplasm and well-defined borders, with erosion and inflammation in most (PMC9158793).
//
// Vulval and vaginal biopsies (Phase 70, pulled by the user 2026-10-12) share the form through the specimen
// type and print through their own branch below, so the cervical wording is untouched. Terminology follows
// the SIL grading notes answered for the user on 2026-09-14: the vulva is two-tier, with vulval HSIL the
// HPV-associated usual-type VIN and differentiated VIN a separate HPV-independent precursor that is never
// called HSIL, and "VIN 1" is not used; the vagina keeps the VaIN grade in brackets as the cervix keeps CIN.
// The head is organ, site and procedure, as for the cervix, with a clock position after the procedure as in
// the vulval report revised with the user on 2026-09-15 ("VULVA, BIOPSY AT 7 O'CLOCK"). A dermatosis
// prints that report's negatives, condensed: "LICHEN SIMPLEX CHRONICUS; no lichen sclerosus, lichen planus,
// Paget disease, VIN or malignancy; PASD negative". Criteria and stain patterns:
// docs/reference/lower_genital_tract-morphology.md.

import { checks } from './_house.js';

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
export const isVulva = (v) => v.specimenType === 'Vulval biopsy';
export const isVagina = (v) => v.specimenType === 'Vaginal biopsy';
export const isVulvaOrVagina = (v) => isVulva(v) || isVagina(v);

export const POLYP_TYPES = ['Endocervical polyp', 'Decidual polyp', 'Endometrial polyp'];
export const polypType = (v) => (POLYP_TYPES.includes(v.polypType) ? v.polypType : 'Endocervical polyp');
const POLYP_DX = { 'Endocervical polyp': 'ENDOCERVICAL POLYP', 'Decidual polyp': 'DECIDUAL POLYP', 'Endometrial polyp': 'ENDOMETRIAL POLYP' };
const feature = (v, name) => [].concat(v.polypFeatures || []).includes(name);

/** The benign pick, unless a polyp's type already says it ("Endocervical polyp"; "Decidual change" on a decidual polyp). */
export function benignOf(v) {
  if (isVulva(v)) return v.vulvaBenign && v.vulvaBenign !== 'None' ? v.vulvaBenign : '';
  if (isVagina(v)) return v.vaginaBenign && v.vaginaBenign !== 'None' ? v.vaginaBenign : '';
  const b = v.benign && v.benign !== 'None' ? v.benign : '';
  if (!b || !isPolyp(v)) return b;
  if (b === 'Endocervical polyp') return '';
  if (b === 'Decidual change' && polypType(v) === 'Decidual polyp') return '';
  return b;
}

// Condyloma acuminatum is a low grade squamous intraepithelial lesion in the LAST terminology, which keeps
// "condyloma" as an optional qualifier (Darragh et al., Arch Pathol Lab Med 2012;
// https://documents.cap.org/documents/2012-arpa.lgt200570-v136.pdf). It ranks with LSIL and prints
// "LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CONDYLOMA ACUMINATUM)" (user decision, 2026-10-11).
export const CONDYLOMA = 'Condyloma acuminatum';
export const isCondyloma = (v) => benignOf(v) === CONDYLOMA;
const CONDYLOMA_DX = 'LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CONDYLOMA ACUMINATUM)';

const site = (v) => (v.specimenName || '').replace(/\s*\bcervi(x|cal)\b\s*/i, ' ').replace(/^[\s,]+|[\s,]+$/g, '').trim();

/**
 * The vulval or vaginal site without the organ word the head already carries, and without a lone side the
 * request repeats: "Left vulval lesion, left vulva" -> "left lesion"; "Vaginal vault" -> "vault";
 * "Vulval biopsy at 7 o'clock" -> "7 o'clock".
 */
export function vvSite(v) {
  const bits = String(v.specimenName || '').replace(/\b(?:vulva[lr]?|vagina[l]?)\b/gi, ' ').split(',')
    .map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => /[a-z0-9]/i.test(x));
  const kept = bits.filter((x, i) => !(/^(?:left|right)$/i.test(x) && bits.some((y, j) => j !== i && new RegExp(`\\b${x}\\b`, 'i').test(y))));
  const s = kept.join(', ').replace(/^\((.*)\)$/, '$1').replace(/^at\s+/i, '').trim();
  return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
const VV_PROCEDURES = ['Biopsy', 'Punch biopsy', 'Avulsion'];
const vvProcedure = (v) => (VV_PROCEDURES.includes(v.vvProcedure) ? v.vvProcedure : 'Biopsy').toLowerCase();
const vvOrgan = (v) => (isVulva(v) ? 'Vulva' : 'Vagina');

export function specimenName(part) {
  const v = part.values;
  if (isVulvaOrVagina(v)) {
    const s = vvSite(v);
    return `${vvOrgan(v)}, ${s ? `${s}, ` : ''}${vvProcedure(v)}`;
  }
  if (isECC(v)) return 'Endocervical curettings';
  const s = site(v);
  if (isPolyp(v)) return s ? `Cervix, ${s}, polyp` : 'Cervix, polyp';
  return s ? `Cervix, ${s}, biopsy` : 'Cervix, biopsy';
}

/**
 * "CERVIX, cervical biopsy at 12 o'clock" / "ENDOCERVICAL CURETTINGS" / "CERVIX, polypectomy";
 * "VULVA, biopsy at 7 o'clock" for a clock position, else "VULVA, left labium majus, punch biopsy".
 */
export function organPhrase(part) {
  const v = part.values;
  if (isVulvaOrVagina(v)) {
    const s = vvSite(v);
    const head = vvOrgan(v).toUpperCase();
    if (!s) return `${head}, ${vvProcedure(v)}`;
    return /^\d/.test(s) ? `${head}, ${vvProcedure(v)} at ${s}` : `${head}, ${s}, ${vvProcedure(v)}`;
  }
  if (isECC(v)) return 'ENDOCERVICAL CURETTINGS';
  const s = site(v);
  if (isPolyp(v)) return `CERVIX, polypectomy${s ? ` at ${s}` : ''}`;
  return `CERVIX, cervical biopsy${s ? ` at ${s}` : ''}`;
}

// Squamous ranking: 0 negative, 1 HPV effect only, 2 LSIL (CIN I or condyloma), 3 CIN II, 4 CIN III, 5 SCC.
const SQ_RANK = { Negative: 0, 'LSIL (CIN I)': 2, 'HSIL (CIN II)': 3, 'HSIL (CIN III)': 4, 'Squamous cell carcinoma': 5 };
// The vulva ranks HSIL and differentiated VIN with CIN III; the vagina ranks VaIN as the cervix ranks CIN.
export const DVIN = 'Differentiated VIN (HPV-independent)';
const VULVA_SQ_RANK = { LSIL: 2, 'LSIL (condyloma acuminatum)': 2, 'HSIL (usual-type VIN)': 4, [DVIN]: 4, 'Squamous cell carcinoma': 5 };
const VAGINA_SQ_RANK = { 'LSIL (VaIN 1)': 2, 'LSIL (condyloma acuminatum)': 2, 'HSIL (VaIN 2)': 3, 'HSIL (VaIN 3)': 4, 'Squamous cell carcinoma': 5 };
export const vvSquamous = (v) => (isVulva(v) ? v.vulvaSquamous : isVagina(v) ? v.vaginaSquamous : '') || 'Negative';
export const isDVIN = (v) => isVulva(v) && v.vulvaSquamous === DVIN;
export function squamousRank(v) {
  if (isVulva(v)) return VULVA_SQ_RANK[v.vulvaSquamous] ?? 0;
  if (isVagina(v)) return VAGINA_SQ_RANK[v.vaginaSquamous] ?? 0;
  if (isInadequateECC(v)) return 0;
  const r = SQ_RANK[v.squamous] ?? 0;
  if (r < 2 && isCondyloma(v)) return 2;
  if (r === 0 && v.koilocytosis === 'Present') return 1;
  return r;
}
export const isHSIL = (v) => (squamousRank(v) === 3 || squamousRank(v) === 4) && !isDVIN(v);
export const isSCC = (v) => (isVulvaOrVagina(v) ? vvSquamous(v) : v.squamous) === 'Squamous cell carcinoma' && !isInadequateECC(v);

const GL_RANK = { Negative: 0, 'Adenocarcinoma in situ, HPV-associated': 1, 'Adenocarcinoma in situ, HPV-independent (gastric type)': 1, 'Adenocarcinoma, HPV-associated': 2, 'Adenocarcinoma, HPV-independent (gastric type)': 2 };
export const glandularRank = (v) => (isInadequateECC(v) || isVulvaOrVagina(v) ? 0 : GL_RANK[v.glandular] ?? 0);
export const isAIS = (v) => glandularRank(v) === 1;
export const isAdenoca = (v) => glandularRank(v) === 2;

// Vulval Paget disease: primary (cutaneous) or secondary pagetoid spread of another carcinoma.
export const PAGET_PRIMARY = 'Primary, intraepithelial';
export const PAGET_INVASIVE = 'Primary, with dermal invasion';
export const PAGET_SECONDARY = 'Secondary (pagetoid spread)';
export const pagetOf = (v) => (isVulva(v) && [PAGET_PRIMARY, PAGET_INVASIVE, PAGET_SECONDARY].includes(v.paget) ? v.paget : '');

export const hasLesion = (v) => squamousRank(v) > 0 || glandularRank(v) > 0 || !!pagetOf(v);
export const isInvasive = (v) => isSCC(v) || isAdenoca(v) || pagetOf(v) === PAGET_INVASIVE;

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
  'Endocervical polyp': 'A polypoid fragment of endocervical glands lined by mucinous columnar epithelium in a fibrovascular stroma is also present, in keeping with an endocervical polyp.',
  'Nabothian cysts': 'Dilated mucus-filled endocervical glands (Nabothian cysts) are present.',
  'Condyloma acuminatum': 'There is a papillary squamous proliferation with acanthosis, hyperkeratosis and prominent koilocytosis, consistent with condyloma acuminatum.',
  'Tuboendometrioid metaplasia': 'Some endocervical glands are lined by ciliated tubal-type epithelium, in keeping with tuboendometrioid metaplasia.',
  'Microglandular hyperplasia': 'There is a tightly packed proliferation of small endocervical glands with neutrophils and subnuclear vacuoles, in keeping with microglandular hyperplasia.',
  Endometriosis: 'Endometrial-type glands and stroma are present within the cervical stroma, consistent with endometriosis.',
  'Decidual change': 'The stroma shows decidual change.',
  'Radiation change': 'The stroma shows hyalinisation with atypical fibroblasts and vascular change, consistent with radiation effect.',
  'Reactive / reparative change': 'The epithelium shows reactive and reparative change with nuclear enlargement, prominent nucleoli and preserved polarity, without dysplasia.',
};

/** The polyp's own sentences, by type; the surface sentence is shared. */
export function polypSentences(v, n) {
  const piece = n && n > 1 ? `${fmt(n)} polypoid pieces of tissue` : 'a polypoid piece of tissue';
  const dilated = feature(v, 'Cystically dilated glands') ? ', some cystically dilated,' : '';
  const inflamed = feature(v, 'Chronic inflammation');
  const vessels = feature(v, 'Thick-walled vessels');
  const s = [];
  const type = polypType(v);
  if (type === 'Decidual polyp') {
    s.push(`Sections show ${piece} in which the stroma is replaced by sheets of decidualised cells with abundant eosinophilic cytoplasm, well-defined cell borders and bland round nuclei.`);
    s.push(`Scattered endocervical glands${dilated} are present${inflamed ? ' and the stroma contains a chronic inflammatory infiltrate' : ''}.`);
    if (vessels) s.push('Thick-walled vessels are present.');
  } else if (type === 'Endometrial polyp') {
    s.push(`Sections show ${piece} composed of irregularly spaced endometrial-type glands${dilated} set in a fibrous stroma with thick-walled vessels${inflamed ? ' and a chronic inflammatory infiltrate' : ''}.`);
  } else {
    const stroma = listJoin([vessels && 'thick-walled vessels', inflamed && 'a chronic inflammatory infiltrate']);
    s.push(`Sections show ${piece} composed of endocervical glands${dilated} lined by mucinous columnar epithelium and set in a fibrovascular stroma${stroma ? ` with ${stroma}` : ''}.`);
  }
  const metaplasia = feature(v, 'Squamous metaplasia');
  const erosion = feature(v, 'Surface erosion');
  if (metaplasia && erosion) s.push('The surface shows squamous metaplasia and focal erosion.');
  else if (metaplasia) s.push('The surface shows squamous metaplasia.');
  else if (erosion) s.push('The surface is focally eroded.');
  return s;
}

export function microscopy(part, ctx) {
  const v = part.values;
  if (isVulvaOrVagina(v)) return vvMicroscopy(part, ctx);
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
    s.push(...polypSentences(v, n));
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
  } else if (!isPolyp(v) && (!isECC(v) || v.eccContent === 'Endocervical mucosa with detached squamous fragments')) {
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

  if (BENIGN_SENTENCE[benignOf(v)]) s.push(BENIGN_SENTENCE[benignOf(v)]);

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
  if (sq === 'LSIL (CIN I)') return `LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CIN I${isCondyloma(v) ? ' AND CONDYLOMA ACUMINATUM' : hpv ? ' AND HPV EFFECT' : ''})`;
  if (isCondyloma(v)) return CONDYLOMA_DX;
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
  if (isVulvaOrVagina(v)) return vvDiagnosis(part);
  if (isInadequateECC(v)) return `(${part.label}) ${organPhrase(part)} - MUCUS AND BLOOD ONLY; NO EPITHELIUM FOR ASSESSMENT (INADEQUATE)`;
  const clauses = [squamousClause(v), glandularClause(v)].filter(Boolean);
  if (isPolyp(v)) clauses.push(POLYP_DX[polypType(v)]);
  const benign = benignOf(v);
  // Condyloma prints as LSIL in the squamous clause; beside HSIL or carcinoma it keeps its own clause.
  if (benign === CONDYLOMA) { if (squamousRank(v) > 2) clauses.push(CONDYLOMA_DX); }
  else if (benign) clauses.push(benign.replace(' / ', ' AND ').toUpperCase());
  const extras = [];
  if (!clauses.length) clauses.push('NO EVIDENCE OF SQUAMOUS INTRAEPITHELIAL LESION OR MALIGNANCY');
  // A polyp is signed out by its type alone, as released, whether it is the specimen or is found in a biopsy
  // (user decision, 2026-10-11); the negative stays in the microscopy.
  else if (!hasLesion(v) && !isPolyp(v) && benign !== 'Endocervical polyp') extras.push('no evidence of dysplasia or malignancy');
  if (v.correlation === 'Lesion reported on cytology is not represented') extras.push('see comment');
  return `(${part.label}) ${organPhrase(part)} - ${[...clauses, ...extras].join('; ')}`;
}

// ---------- vulva and vagina ----------
// Criteria (PathologyOutlines: HPV-associated SIL and HPV-independent VIN of the vulva, VAIN, Paget disease,
// vulval dermatoses and vaginal cysts) are quoted with links in docs/reference/lower_genital_tract-morphology.md;
// the six p53 patterns follow Kortekaas et al., Histopathology 2020 (PMC7383647).

const VULVA_TISSUE = { 'Vulval skin': 'vulval skin', 'Vulval mucosa (vestibule)': 'vulval mucosa', 'Vulval skin and mucosa': 'vulval skin and mucosa' };
const vvTissue = (v) => (isVulva(v) ? VULVA_TISSUE[v.vulvaTissue] || 'vulval skin' : 'vaginal mucosa');

const LSIL_SENTENCE = 'Focally, the squamous epithelium shows koilocytes in the upper layers, with mild nuclear atypia and mitoses limited to the lower third and maturation towards the surface.';
const VV_SQ_SENTENCE = {
  LSIL: LSIL_SENTENCE,
  'LSIL (VaIN 1)': LSIL_SENTENCE,
  'LSIL (condyloma acuminatum)': BENIGN_SENTENCE[CONDYLOMA],
  'HSIL (VaIN 2)': 'The squamous epithelium shows loss of maturation with enlarged hyperchromatic nuclei and mitoses extending into the middle third, with maturation of the upper third.',
  'HSIL (VaIN 3)': 'The squamous epithelium shows full thickness loss of maturation with enlarged hyperchromatic pleomorphic nuclei, a high nuclear to cytoplasmic ratio and mitoses in the upper layers.',
  'HSIL (usual-type VIN)': 'The squamous epithelium shows loss of maturation, with atypical cells with enlarged hyperchromatic nuclei and suprabasal mitoses extending into the upper layers.',
  [DVIN]: 'The squamous epithelium is acanthotic with parakeratosis and elongated, anastomosing rete ridges; the basal and parabasal keratinocytes are atypical, with abundant eosinophilic cytoplasm, enlarged vesicular nuclei and prominent nucleoli, without koilocytosis or full thickness atypia.',
};

const PAGET_CELLS = 'The epidermis contains large atypical cells with abundant pale cytoplasm, large nuclei and prominent nucleoli, mainly in its lower layers and extending upwards singly and in small clusters, in keeping with Paget disease.';
const PAGET_SENTENCE = {
  [PAGET_PRIMARY]: PAGET_CELLS,
  [PAGET_INVASIVE]: `${PAGET_CELLS} Paget cells also infiltrate the underlying dermis.`,
  [PAGET_SECONDARY]: 'The epidermis contains atypical glandular cells with pale or vacuolated cytoplasm spreading singly and in small clusters in a pagetoid pattern.',
};
const PAGET_DX = {
  [PAGET_PRIMARY]: 'EXTRAMAMMARY PAGET DISEASE, intraepithelial',
  [PAGET_INVASIVE]: 'EXTRAMAMMARY PAGET DISEASE with dermal invasion',
  [PAGET_SECONDARY]: 'PAGETOID SPREAD OF A NON-CUTANEOUS CARCINOMA (SECONDARY EXTRAMAMMARY PAGET DISEASE)',
};
const pagetStainList = (v) => [].concat(v.pagetStains || []);

/** "The Paget cells are positive for CK7, GATA3 and CEA, and negative for CK20 and p63." */
export function pagetStainSentence(v) {
  const picked = pagetStainList(v);
  const by = (sign) => picked.filter((x) => x.endsWith(` ${sign}`)).map((x) => x.slice(0, -sign.length - 1));
  // Stain names keep their own case except uroplakin, which is a common noun mid-sentence.
  const pos = by('positive').map((x) => x.replace(/^Uroplakin\b/, 'uroplakin'));
  const neg = by('negative');
  if (!pos.length && !neg.length) return '';
  const said = [pos.length ? `positive for ${listJoin(pos)}` : '', neg.length ? `negative for ${listJoin(neg)}` : ''].filter(Boolean).join(', and ');
  return `${v.paget === PAGET_SECONDARY ? 'The atypical cells are' : 'The Paget cells are'} ${said}.`;
}

const P53_TEXT = {
  'Wild-type: scattered': 'p53 shows a wild-type pattern, with scattered nuclear staining of variable intensity',
  'Wild-type: mid-epithelial, basal sparing': 'p53 shows a wild-type mid-epithelial pattern with sparing of the basal layer',
  'Mutant-type: basal overexpression': 'p53 shows a mutant-type pattern, with strong continuous nuclear staining of the basal layer',
  'Mutant-type: diffuse overexpression': 'p53 shows a mutant-type pattern, with strong continuous nuclear staining extending from the basal layer into the upper layers',
  'Mutant-type: null': 'p53 shows a mutant-type null pattern, with complete absence of staining in the lesion and a positive internal control',
  'Mutant-type: cytoplasmic': 'p53 shows a mutant-type cytoplasmic pattern',
};
const isMutantP53 = (v) => /^Mutant-type/.test(v.p53 || '');

function vvIhc(v) {
  const ihc = [];
  if (v.p16 === 'Block positive') ihc.push('p16 shows strong diffuse block positivity');
  else if (v.p16 === 'Negative') ihc.push('p16 is negative');
  else if (v.p16 === 'Patchy / focal') ihc.push('p16 shows patchy, non-block staining');
  if (v.ki67 === 'Extends into the upper two-thirds') ihc.push('Ki-67 labels nuclei extending into the upper two-thirds of the epithelium');
  else if (v.ki67 === 'Confined to the basal and parabasal layers') ihc.push('Ki-67 is confined to the basal and parabasal layers');
  if (P53_TEXT[v.p53]) ihc.push(P53_TEXT[v.p53]);
  if (!ihc.length) return '';
  const support = isHSIL(v) && v.p16 === 'Block positive' ? ', supporting a high grade lesion'
    : isDVIN(v) && isMutantP53(v) ? ', supporting differentiated VIN' : '';
  return `On immunohistochemistry, ${listJoin(ihc)}${support}.`;
}

const FEP_SENTENCE = 'There is a polypoid fragment covered by squamous epithelium, with a loose fibrovascular stroma containing stellate and multinucleate stromal cells, in keeping with a fibroepithelial stromal polyp.';
const VULVA_BENIGN_SENTENCE = {
  'Lichen sclerosus': 'There is hyperkeratosis with basal vacuolar change, and a band of pale homogenised collagen in the papillary dermis overlies a band-like lymphocytic infiltrate, in keeping with lichen sclerosus.',
  'Lichen simplex chronicus': 'There is compact hyperkeratosis, irregular acanthosis and hypergranulosis, with vertically oriented collagen in the papillary dermis, in keeping with lichen simplex chronicus.',
  'Lichen planus': 'There is a band-like lymphocytic infiltrate at the dermo-epidermal junction with basal cell damage and apoptotic (Civatte) bodies, without dermal sclerosis, in keeping with lichen planus.',
  'Spongiotic dermatitis': 'The epidermis shows spongiosis with a superficial perivascular lymphocytic infiltrate, in keeping with a spongiotic dermatitis.',
  'Psoriasiform dermatitis': 'The epidermis shows regular psoriasiform acanthosis with parakeratosis, in keeping with a psoriasiform dermatitis.',
  Candidiasis: 'The stratum corneum contains neutrophils and fungal pseudohyphae and yeasts, in keeping with candidiasis.',
  'Fibroepithelial stromal polyp': FEP_SENTENCE,
  'Hidradenoma papilliferum': 'There is a circumscribed dermal nodule of branching tubules and papillae lined by an inner layer of columnar cells with apocrine snouts and an outer layer of myoepithelial cells, in keeping with hidradenoma papilliferum.',
  Melanosis: 'There is increased melanin pigment in the basal layer without an increase in melanocytes or melanocytic atypia, in keeping with melanosis.',
  'Melanocytic naevus': 'There is a melanocytic naevus composed of nests of bland melanocytes that mature with depth.',
  'Non-specific chronic inflammation': 'The dermis contains a mild chronic inflammatory infiltrate.',
};
const VAGINA_BENIGN_SENTENCE = {
  Atrophy: BENIGN_SENTENCE.Atrophy,
  'Non-specific chronic inflammation': 'The lamina propria contains a chronic inflammatory infiltrate of lymphocytes and plasma cells.',
  'Granulation tissue': 'There is granulation tissue with proliferating capillaries in an oedematous stroma with mixed inflammation.',
  'Fibroepithelial stromal polyp': FEP_SENTENCE,
  'Vaginal adenosis': 'Glands lined by mucinous columnar or tuboendometrial-type epithelium are present in the lamina propria, in keeping with vaginal adenosis.',
  'Gartner duct cyst': 'There is a cyst in the lamina propria lined by a single layer of cuboidal to low columnar non-mucinous epithelium, in keeping with a Gartner duct cyst.',
  'Müllerian cyst': 'There is a cyst in the lamina propria lined by mucinous or ciliated columnar epithelium, in keeping with a Müllerian cyst.',
  Endometriosis: 'Endometrial-type glands and stroma are present within the lamina propria, consistent with endometriosis.',
  'Hyperkeratosis and acanthosis (prolapse)': 'The squamous epithelium shows hyperkeratosis and acanthosis, in keeping with prolapse.',
  'Radiation change': BENIGN_SENTENCE['Radiation change'],
  'Reactive / reparative change': BENIGN_SENTENCE['Reactive / reparative change'],
};
// Dermatoses that print the lichen sclerosus and lichen planus negatives when nothing else is found.
const VULVA_LSC_LIKE = ['Lichen simplex chronicus', 'Spongiotic dermatitis', 'Psoriasiform dermatitis', 'Non-specific chronic inflammation'];

function vvMicroscopy(part, ctx) {
  const v = part.values;
  const vulva = isVulva(v);
  const s = [];
  const n = num(v.pieces);
  s.push(`Serial sections show ${n && n > 1 ? `${fmt(n)} pieces of` : 'a piece of'} ${vvTissue(v)}.`);
  const benign = benignOf(v);
  const paget = pagetOf(v);

  if (isSCC(v)) {
    const depth = num(v.invasionDepth);
    s.push(`There is an invasive ${v.sccType === 'Keratinising' ? 'keratinising' : 'non-keratinising'} squamous cell carcinoma infiltrating the ${vulva ? 'dermis' : 'stroma'} as irregular nests and cords of atypical squamous cells with a desmoplastic and inflammatory response${depth ? `, to a depth of at least ${fmt(depth)} mm in this biopsy` : ''}.`);
    s.push(v.lvi === 'Present' ? 'Lymphovascular invasion is present.' : 'No lymphovascular invasion is identified.');
  } else if (VV_SQ_SENTENCE[vvSquamous(v)]) {
    s.push(VV_SQ_SENTENCE[vvSquamous(v)]);
  } else if (!benign && !paget) {
    // The vulval closing line already names VIN; the vaginal one follows the cervical house paragraph.
    s.push(vulva ? 'The squamous epithelium shows normal maturation.' : 'The squamous epithelium shows normal maturation and no VaIN is seen.');
  }
  if (isHSIL(v) || isDVIN(v)) {
    if (vulva && v.appendageInvolvement === 'Involved') s.push('The lesion extends along hair follicles and skin appendages.');
    s.push(v.invasionSuspicious === 'Cannot be excluded'
      ? `There are irregular nests at the epithelial–${vulva ? 'dermal' : 'stromal'} interface with a stromal response; early ${vulva ? '' : 'stromal '}invasion cannot be excluded in this biopsy.`
      : `No ${vulva ? 'dermal' : 'stromal'} invasion is identified.`);
  }

  if (paget) {
    s.push(PAGET_SENTENCE[paget]);
    if (paget !== PAGET_INVASIVE && !isHSIL(v) && !isDVIN(v) && !isSCC(v)) s.push('No dermal invasion is identified.');
    const stains = pagetStainSentence(v);
    if (stains) s.push(stains);
    if (paget === PAGET_SECONDARY) s.push('Correlation for an underlying anorectal or urothelial carcinoma is suggested.');
  }

  const benignText = (vulva ? VULVA_BENIGN_SENTENCE : VAGINA_BENIGN_SENTENCE)[benign];
  if (benignText) s.push(benignText);
  if (vulva && VULVA_LSC_LIKE.includes(benign) && !hasLesion(v)) s.push('There are no features of lichen sclerosus or lichen planus.');
  if (vulva && v.pasd === 'Negative') s.push('No fungal organisms are identified on PASD stain.');
  else if (vulva && v.pasd === 'Positive') s.push(benign === 'Candidiasis' ? 'PASD stain highlights the fungal organisms.' : 'PASD stain shows fungal hyphae and yeasts in the stratum corneum.');

  // Immunostains follow the morphology they qualify, as in the cervical paragraph.
  const ihc = vvIhc(v);
  if (ihc) s.push(ihc);

  // Closing negatives
  if (!hasLesion(v)) s.push(vulva ? 'There is no evidence of VIN, Paget disease or malignancy.' : 'There is no evidence of squamous intraepithelial lesion or malignancy.');
  else if (paget && squamousRank(v) === 0) { /* the Paget sentences carry the invasion statement */ }
  else if (squamousRank(v) <= 2 && !paget) s.push(`There is no evidence of high grade squamous intraepithelial lesion${vulva ? ', differentiated VIN' : ''} or malignancy.`);
  else if (!isInvasive(v)) s.push('There is no evidence of invasive malignancy.');

  if (!vulva && v.correlation === 'Lesion reported on cytology is not represented') {
    const cyto = String(ctx?.case?.cytology || '').trim();
    s.push(`The ${cyto ? `${cyto} ` : 'lesion '}reported on cytology is not represented in this biopsy; correlation with the colposcopic findings and further sampling are suggested if clinically indicated.`);
  }

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

function vvSquamousClause(v) {
  if (isSCC(v)) {
    const depth = num(v.invasionDepth);
    const hpv = ['HPV-associated', 'HPV-independent'].includes(v.hpvStatus) ? `, ${v.hpvStatus}` : '';
    return `INVASIVE SQUAMOUS CELL CARCINOMA, ${v.sccType === 'Keratinising' ? 'keratinising' : 'non-keratinising'} type${hpv}${depth ? `, depth of invasion at least ${fmt(depth)} mm` : ''}${v.lvi === 'Present' ? ', with lymphovascular invasion' : ''}`;
  }
  const sq = vvSquamous(v);
  const vulva = isVulva(v);
  const appendages = vulva && v.appendageInvolvement === 'Involved' ? ' with skin appendage involvement' : '';
  const caveat = v.invasionSuspicious === 'Cannot be excluded' ? `; early ${vulva ? '' : 'stromal '}invasion cannot be excluded, excision recommended for definitive assessment` : '';
  if (sq === 'HSIL (VaIN 3)' || sq === 'HSIL (VaIN 2)') return `HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / ${sq === 'HSIL (VaIN 3)' ? 'VaIN 3' : 'VaIN 2'})${caveat}`;
  if (sq === 'HSIL (usual-type VIN)') return `HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / USUAL-TYPE VIN)${appendages}${caveat}`;
  if (sq === DVIN) return `DIFFERENTIATED VULVAL INTRAEPITHELIAL NEOPLASIA (dVIN), HPV-independent${appendages && `,${appendages}`}${caveat}`;
  if (sq === 'LSIL (VaIN 1)') return 'LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / VaIN 1)';
  if (sq === 'LSIL (condyloma acuminatum)') return CONDYLOMA_DX;
  if (sq === 'LSIL') return 'LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL)';
  return '';
}

function vvDiagnosis(part) {
  const v = part.values;
  const vulva = isVulva(v);
  const benign = benignOf(v);
  const clauses = [vvSquamousClause(v), PAGET_DX[pagetOf(v)]].filter(Boolean);
  if (benign) clauses.push(benign.replace(' / ', ' AND ').toUpperCase());
  if (vulva && v.pasd === 'Positive' && benign !== 'Candidiasis') clauses.push('FUNGAL ORGANISMS IDENTIFIED ON PASD STAIN');
  const extras = [];
  if (!clauses.length) clauses.push(vulva ? 'NO EVIDENCE OF VIN OR MALIGNANCY' : 'NO EVIDENCE OF SQUAMOUS INTRAEPITHELIAL LESION OR MALIGNANCY');
  else if (!hasLesion(v)) {
    if (!vulva) extras.push('no evidence of dysplasia or malignancy');
    else extras.push(VULVA_LSC_LIKE.includes(benign) ? 'no lichen sclerosus, lichen planus, Paget disease, VIN or malignancy' : 'no evidence of VIN or malignancy');
  }
  if (vulva && !hasLesion(v) && v.pasd === 'Negative') extras.push('PASD negative');
  if (!vulva && v.correlation === 'Lesion reported on cytology is not represented') extras.push('see comment');
  return `(${part.label}) ${organPhrase(part)} - ${[...clauses, ...extras].join('; ')}`;
}

// ---------- case summary ----------

const SQ_TEXT = { 1: 'HPV effect', 2: 'LSIL (CIN I)', 3: 'HSIL (CIN II)', 4: 'HSIL (CIN III)', 5: 'invasive squamous cell carcinoma' };
const GL_TEXT = { 1: 'adenocarcinoma in situ', 2: 'invasive adenocarcinoma' };
const partList = (parts) => (parts.length === 1 ? `part ${parts[0].label}` : `parts ${listJoin(parts.map((p) => p.label))}`);

// LSIL parts are named by kind: "LSIL (CIN I)", "LSIL (condyloma acuminatum)" or both.
const lsilKind = (v) => ((SQ_RANK[v.squamous] ?? 0) < 2 && isCondyloma(v) ? 'condyloma acuminatum' : 'CIN I');
const lsilText = (ps) => `LSIL (${[...new Set(ps.map((p) => lsilKind(p.values)))].sort().join(' and ')})`;

// Vulval and vaginal parts are named by their own lesion; cervical parts keep the CIN text above.
const VV_SUMMARY_TEXT = {
  LSIL: 'LSIL', 'LSIL (condyloma acuminatum)': 'LSIL (condyloma acuminatum)', 'HSIL (usual-type VIN)': 'HSIL (usual-type VIN)', [DVIN]: 'differentiated VIN',
  'LSIL (VaIN 1)': 'LSIL (VaIN 1)', 'HSIL (VaIN 2)': 'HSIL (VaIN 2)', 'HSIL (VaIN 3)': 'HSIL (VaIN 3)',
};
const PAGET_SUMMARY_TEXT = { [PAGET_PRIMARY]: 'Paget disease', [PAGET_INVASIVE]: 'invasive Paget disease', [PAGET_SECONDARY]: 'secondary Paget disease' };

/** Parts grouped by their own text, in part order: "HSIL (CIN III) in part A and HSIL (usual-type VIN) in part B". */
function byText(parts, textOf) {
  const groups = [];
  for (const p of parts) {
    const t = textOf(p);
    const g = groups.find((x) => x.text === t);
    if (g) g.parts.push(p);
    else groups.push({ text: t, parts: [p] });
  }
  return groups.map((g) => `${g.text} in ${partList(g.parts)}`).join(' and ');
}

/** One SUMMARY line for multi-part cases; omitted for single parts or when the option is off. */
export function summary(parts, ctx) {
  if (parts.length < 2 || ctx.options.summary === false) return '';
  const bits = [];
  const sqTop = Math.max(...parts.map((p) => squamousRank(p.values)));
  const sqParts = parts.filter((p) => squamousRank(p.values) === sqTop);
  if (sqTop > 0) {
    const cervixText = sqTop === 2 ? lsilText(sqParts.filter((p) => !isVulvaOrVagina(p.values))) : SQ_TEXT[sqTop];
    bits.push(`highest grade squamous lesion ${byText(sqParts, (p) => (isVulvaOrVagina(p.values) && sqTop < 5 ? VV_SUMMARY_TEXT[vvSquamous(p.values)] : cervixText))}`);
  }
  const glTop = Math.max(...parts.map((p) => glandularRank(p.values)));
  if (glTop > 0) bits.push(`${GL_TEXT[glTop]} in ${partList(parts.filter((p) => glandularRank(p.values) === glTop))}`);
  const paget = parts.filter((p) => pagetOf(p.values));
  if (paget.length) bits.push(byText(paget, (p) => PAGET_SUMMARY_TEXT[pagetOf(p.values)]));
  const inadequate = parts.filter((p) => isInadequateECC(p.values));
  if (inadequate.length) bits.push(`${partList(inadequate)} inadequate`);
  if (!bits.length) {
    const cervix = parts.some((p) => !isVulvaOrVagina(p.values));
    const vulva = parts.some((p) => isVulva(p.values));
    const vagina = parts.some((p) => isVagina(p.values));
    const none = [(cervix || vagina) && 'squamous intraepithelial lesion', vulva && 'VIN', vulva && 'Paget disease', cervix && 'glandular dysplasia'].filter(Boolean);
    return `SUMMARY: No ${none.join(', ')} or malignancy in any part.`;
  }
  const text = bits.join('; ');
  return `SUMMARY: ${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

// ---------- checks (vulva and vagina) ----------

/** Stain and HPV-status contradictions for vulval and vaginal parts; cervical parts return none. */
export function validate(part) {
  const v = part.values;
  const { out, warn, at } = checks();
  const info = (message, field) => at('info', message, field);
  if (!isVulvaOrVagina(v)) return out;
  if (isDVIN(v) && v.p16 === 'Block positive') warn('Differentiated VIN is HPV-independent, but p16 is block positive: block-type p16 points to HPV-associated HSIL.', 'p16');
  if (isDVIN(v) && (v.p53 || 'Not performed') === 'Not performed') info('No p53 is recorded: a mutant-type pattern supports differentiated VIN, which can be hard to separate from lichen simplex chronicus in a punch biopsy.', 'p53');
  if (isHSIL(v) && v.p16 === 'Negative') warn(`${isVulva(v) ? 'Vulval' : 'Vaginal'} HSIL is HPV-associated, but p16 is negative.`, 'p16');
  if (isSCC(v) && v.hpvStatus === 'HPV-associated' && ['Negative', 'Patchy / focal'].includes(v.p16)) warn('HPV-associated carcinoma is chosen, but p16 is not block positive.', 'hpvStatus');
  if (isSCC(v) && v.hpvStatus === 'HPV-independent' && v.p16 === 'Block positive') warn('HPV-independent carcinoma is chosen, but p16 is block positive.', 'hpvStatus');
  const paget = pagetOf(v);
  const stains = pagetStainList(v);
  if (paget && !stains.length) info('No Paget stains are recorded: CK7 and GATA3 support Paget cells, and CK20, p63 and GCDFP-15 help separate secondary spread and pagetoid squamous lesions.', 'pagetStains');
  if (paget && paget !== PAGET_SECONDARY && stains.includes('CK20 positive')) warn('Primary Paget disease is chosen, but CK20 is positive: CK20 positivity raises secondary spread from an anorectal or urothelial carcinoma.', 'paget');
  if (paget && stains.includes('CK20 positive') && stains.includes('CK20 negative')) warn('CK20 is recorded as both positive and negative.', 'pagetStains');
  return out;
}

export default { specimenName, microscopy, diagnosis, summary, validate };
