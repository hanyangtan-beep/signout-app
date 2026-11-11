// Cervical excision (LEEP / LLETZ / cone / top-hat) generator with margin reporting.
// Shares the squamous / glandular vocabulary of the cervical biopsy template.
// House wording from the LEEP corpus; protected by tests/leep.test.js.

const NP = 'Not performed';
const SQ_RANK = { Negative: 0, 'LSIL (CIN I)': 1, 'HSIL (CIN II)': 2, 'HSIL (CIN III)': 3, 'Squamous cell carcinoma': 4 };
const SQ_TEXT = { 1: 'LSIL (CIN I)', 2: 'HSIL (CIN II)', 3: 'HSIL (CIN III)', 4: 'squamous cell carcinoma' };
const GL_RANK = { Negative: 0, 'Adenocarcinoma in situ, HPV-associated': 1, 'Adenocarcinoma in situ, HPV-independent (gastric type)': 1, 'Adenocarcinoma, HPV-associated': 2, 'Adenocarcinoma, HPV-independent (gastric type)': 2 };

export const isECC = (v) => v.specimenType === 'Endocervical curettings';
export const isInadequateECC = (v) => isECC(v) && v.eccContent === 'Mucus and blood only (inadequate)';
export const squamousRank = (v) => (isInadequateECC(v) ? 0 : SQ_RANK[v.squamous] || 0);
export const glandularRank = (v) => (isInadequateECC(v) ? 0 : GL_RANK[v.glandular] || 0);
export const isHSIL = (v) => squamousRank(v) === 2 || squamousRank(v) === 3;
export const isSCC = (v) => squamousRank(v) === 4;
export const isAIS = (v) => glandularRank(v) === 1;
export const isAdenoCa = (v) => glandularRank(v) === 2;
const isInvolved = (m) => /^Involved/.test(m || '');
const isNA = (m) => /^Not assessable/.test(m || '');

const NOUN = { LEEP: 'LEEP', 'Cone biopsy': 'cone biopsy', 'Top-hat endocervical excision': 'top-hat endocervical excision', 'Endocervical curettings': 'endocervical curettings' };

export function specimenName(part) {
  const v = part.values;
  if (isECC(v)) return 'Endocervical curettings';
  return `Cervix, ${NOUN[v.specimenType] || 'LEEP'}`;
}
export function organPhrase(part) {
  const v = part.values;
  if (isECC(v)) return 'ENDOCERVIX, curettings';
  return `CERVIX, ${NOUN[v.specimenType] || 'LEEP'}`;
}

const HSIL_MORPH = 'with full thickness loss of maturation, hyperchromatic nuclei, suprabasal mitoses and loss of polarity';
const CIN2_MORPH = 'with loss of maturation and nuclear atypia involving the lower two thirds of the epithelium, with suprabasal mitoses';

function lesionLabel(v) {
  return v.squamous === 'HSIL (CIN II)' ? 'HSIL / CIN II' : v.squamous === 'HSIL (CIN III)' ? 'HSIL / CIN III' : 'LSIL / CIN I';
}

function squamousSentences(v) {
  const s = [];
  const pos = (v.positions || '').trim();
  const at = pos ? ` at ${pos}` : '';
  if (isSCC(v)) {
    const d = v.invasionDepth ? `${v.invasionDepth} mm` : 'not measurable';
    const h = v.horizontalExtent ? `${v.horizontalExtent} mm` : 'not measurable';
    s.push(`Invasive ${(v.sccType || 'non-keratinising').toLowerCase()} squamous cell carcinoma is present${at}, composed of irregular nests and cords of atypical squamous cells infiltrating the stroma with a desmoplastic response. The depth of invasion is ${d} and the horizontal extent is ${h}.`);
    s.push(`Lymphovascular invasion is ${v.lvi === 'Present' ? 'present' : 'not identified'}.`);
    s.push('Adjacent high grade squamous intraepithelial lesion (HSIL / CIN III) is present.');
  } else if (isHSIL(v)) {
    const scope = isECC(v) ? 'Detached fragments of squamous epithelium show' : 'The transformation zone shows';
    s.push(`${scope} high grade squamous intraepithelial lesion (${lesionLabel(v)})${isECC(v) ? '' : ` involving the transformation zone${at}`}, ${v.squamous === 'HSIL (CIN II)' ? CIN2_MORPH : HSIL_MORPH}.`);
    if (!isECC(v)) s.push(v.glandInvolvement === 'Involved' ? 'The lesion extends into the endocervical glands.' : 'The endocervical glands are not involved.');
    if (v.lsilBackground === 'Present') s.push('The adjacent squamous epithelium shows koilocytic atypia (LSIL / CIN I).');
    s.push('No stromal invasion is identified.');
  } else if (squamousRank(v) === 1) {
    s.push(`The squamous epithelium shows low grade squamous intraepithelial lesion (LSIL / CIN I)${at}, with koilocytic atypia and mild basal nuclear atypia confined to the lower third of the epithelium. There is no evidence of high grade dysplasia or invasion.`);
  } else if (!isECC(v)) {
    s.push(`The ectocervical squamous epithelium shows normal maturation${v.koilocytosis === 'Present' ? ' with focal koilocytosis' : ''}.`);
  } else if (v.koilocytosis === 'Present') {
    s.push('Detached squamous fragments show koilocytosis.');
  }
  if (v.p16 && v.p16 !== NP && squamousRank(v) > 0) {
    s.push(v.p16 === 'Block positive' ? `Immunostain confirms block positivity for p16 within the ${isSCC(v) ? 'tumour and adjacent HSIL' : 'lesion'}.`
      : v.p16 === 'Negative' ? 'p16 immunostain is negative within the lesion.' : 'p16 immunostain shows patchy, non-block staining within the lesion.');
  }
  return s;
}

function glandularSentences(v) {
  const g = v.glandular;
  if (!g || g === 'Negative') return isECC(v) ? ['The endocervical epithelium shows no evidence of glandular dysplasia.'] : ['There is no evidence of glandular dysplasia.'];
  if (isAIS(v)) {
    const gastric = /gastric/.test(g);
    return [`The endocervical glands show adenocarcinoma in situ${gastric ? ', HPV-independent (gastric type),' : ''} with nuclear enlargement, hyperchromasia, apical mitoses and apoptotic bodies${gastric ? ' and abundant pale mucinous cytoplasm' : ''}. No stromal invasion is identified.`];
  }
  return [`Invasive ${/gastric/.test(g) ? 'HPV-independent (gastric type) ' : ''}adenocarcinoma is present, composed of infiltrative irregular glands with a stromal response.`];
}

function marginSentences(v) {
  if (isECC(v)) return [];
  const s = [];
  const clear = [];
  const ecto = v.ectoMargin || 'Clear';
  const endo = v.endoMargin || 'Clear';
  const deep = v.deepMargin || 'Clear';
  const pos = (p) => ((p || '').trim() ? ` at ${p.trim()}` : '');
  const lesion = (m) => m.replace(/^Involved by /, '');
  if (isInvolved(ecto)) s.push(`The ectocervical margin is ${(v.ectoPositions || '').trim() ? 'focally ' : ''}involved by ${lesion(ecto)}${pos(v.ectoPositions)}.`);
  else if (isNA(ecto)) s.push('The ectocervical margin cannot be assessed.');
  else clear.push('ectocervical');
  if (isInvolved(endo)) s.push(`The endocervical margin is involved by ${lesion(endo)}${pos(v.endoPositions)}.`);
  else if (isNA(endo)) s.push('The endocervical margin cannot be assessed.');
  else clear.push('endocervical');
  if (deep === 'Involved') s.push('The deep stromal margin is involved.');
  else if (isNA(deep)) s.push('The deep stromal margin cannot be assessed.');
  else clear.push('deep stromal');
  const anyLesion = squamousRank(v) > 0 || glandularRank(v) > 0;
  if (clear.length && anyLesion) {
    const what = isSCC(v) || isAdenoCa(v) ? 'tumour and CIN' : glandularRank(v) > 0 && squamousRank(v) === 0 ? 'AIS' : glandularRank(v) > 0 ? 'CIN and AIS' : 'CIN';
    const list = clear.length === 3 ? 'ectocervical, endocervical and deep stromal margins are' : clear.length === 2 ? `${clear[0]} and ${clear[1]} margins are` : `${clear[0]} margin is`;
    s.push(`The ${list} clear of ${what}.`);
    if (v.clearance) s.push(`The closest clearance is ${v.clearance} mm to the ${(v.clearanceMargin || 'endocervical').toLowerCase()} margin.`);
  }
  if (v.artefact && v.artefact !== 'None significant') {
    s.push(`${v.artefact === 'Cautery artefact' ? 'Cautery artefact limits' : v.artefact === 'Denudation of the epithelium' ? 'Denudation of the epithelium limits' : 'Denudation of the epithelium and cautery artefact limit'} assessment of the margins.`);
  }
  return s;
}

const BENIGN = {
  'Chronic cervicitis': 'Chronic cervicitis is present.',
  'Nabothian cysts': 'Nabothian cysts are present.',
  'Immature squamous metaplasia': 'Immature squamous metaplasia is present.',
  'Endocervical polyp': 'An endocervical polyp is present.',
  'Tuboendometrioid metaplasia': 'Tuboendometrioid metaplasia is present.',
  Endometriosis: 'Foci of endometriosis are present in the stroma.'
};

export function microscopy(part) {
  const v = part.values;
  const s = [];
  if (isECC(v)) {
    if (isInadequateECC(v)) return 'Sections show mucus and blood only. No epithelium is present for assessment.';
    s.push(v.eccContent === 'Endocervical mucosa with detached squamous fragments'
      ? 'Sections show fragments of endocervical mucosa with mucus and detached fragments of squamous epithelium.'
      : 'Sections show fragments of endocervical mucosa and mucus.');
  } else {
    const blocks = v.blocks ? `, radially sectioned and all embedded in ${v.blocks} blocks` : '';
    const orient = (v.orientation || '').trim() ? ` (${v.orientation.trim()})` : '';
    s.push(`Serial sections show ${v.specimenType === 'Top-hat endocervical excision' ? 'a piece of endocervical tissue' : 'a piece of cervical tissue including the transformation zone'}${orient}${blocks}.`);
  }
  s.push(...squamousSentences(v));
  s.push(...glandularSentences(v));
  s.push(...marginSentences(v));
  if (BENIGN[v.benign]) s.push(BENIGN[v.benign]);
  if ((v.additionalNotes || '').trim()) s.push(v.additionalNotes.trim());
  if (squamousRank(v) === 0 && glandularRank(v) === 0) s.push('There is no evidence of squamous intraepithelial lesion or malignancy.');
  return s.join(' ');
}

// ---------- diagnosis ----------

function squamousClause(v) {
  if (isSCC(v)) {
    const bits = [`INVASIVE SQUAMOUS CELL CARCINOMA, ${(v.sccType || 'non-keratinising').toLowerCase()} type`];
    if (v.invasionDepth) bits.push(`depth of invasion ${v.invasionDepth} mm`);
    if (v.horizontalExtent) bits.push(`horizontal extent ${v.horizontalExtent} mm`);
    bits.push(v.lvi === 'Present' ? 'lymphovascular invasion present' : 'no lymphovascular invasion');
    return bits.join('; ');
  }
  if (isHSIL(v)) return `HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (${lesionLabel(v)})${!isECC(v) && v.glandInvolvement === 'Involved' ? ' with endocervical gland involvement' : ''}`;
  if (squamousRank(v) === 1) return 'LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CIN I)';
  return '';
}
function glandularClause(v) {
  if (isAdenoCa(v)) return `INVASIVE ADENOCARCINOMA, ${/gastric/.test(v.glandular) ? 'HPV-independent (gastric type)' : 'HPV-associated'}`;
  if (isAIS(v)) return `ADENOCARCINOMA IN SITU, ${/gastric/.test(v.glandular) ? 'HPV-independent (gastric type)' : 'HPV-associated'}`;
  return '';
}

export function marginClause(v) {
  if (isECC(v)) return '';
  const ecto = v.ectoMargin || 'Clear';
  const endo = v.endoMargin || 'Clear';
  const deep = v.deepMargin || 'Clear';
  const involved = [];
  const na = [];
  const clear = [];
  const pos = (p) => ((p || '').trim() ? ` at ${p.trim()}` : '');
  if (isInvolved(ecto)) involved.push(`ectocervical margin involved${pos(v.ectoPositions)}`); else if (isNA(ecto)) na.push('ectocervical'); else clear.push('ectocervical');
  if (isInvolved(endo)) involved.push(`endocervical margin involved${pos(v.endoPositions)}`); else if (isNA(endo)) na.push('endocervical'); else clear.push('endocervical');
  if (deep === 'Involved') involved.push('deep stromal margin involved'); else if (isNA(deep)) na.push('deep stromal'); else clear.push('deep stromal');
  const bits = [...involved];
  if (clear.length === 3) bits.push('resection margins clear');
  else if (clear.length) bits.push(`${clear.join(' and ')} margin${clear.length > 1 ? 's' : ''} clear`);
  if (na.length) bits.push(`${na.join(' and ')} margin${na.length > 1 ? 's' : ''} not assessable`);
  return bits.join('; ');
}

export function diagnosis(part) {
  const v = part.values;
  if (isInadequateECC(v)) return `(${part.label}) ${organPhrase(part)} - MUCUS AND BLOOD ONLY; NO EPITHELIUM FOR ASSESSMENT (INADEQUATE)`;
  const clauses = [squamousClause(v), glandularClause(v)].filter(Boolean);
  const lesion = clauses.length > 0;
  if (!lesion) {
    clauses.push('NO EVIDENCE OF SQUAMOUS INTRAEPITHELIAL LESION OR MALIGNANCY');
    if (v.benign && v.benign !== 'None') clauses.push(v.benign.replace(' / ', ' AND ').toUpperCase());
    return `(${part.label}) ${organPhrase(part)} - ${clauses.join('; ')}`;
  }
  if (isHSIL(v) || isSCC(v)) {
    if (v.lsilBackground === 'Present') clauses.push('background LSIL (CIN I)');
  }
  if (!isSCC(v) && !isAdenoCa(v)) clauses.push('no stromal invasion identified');
  const m = marginClause(v);
  if (m) clauses.push(m);
  if (v.benign && v.benign !== 'None' && v.benign !== 'Chronic cervicitis') clauses.push(v.benign.toLowerCase());
  return `(${part.label}) ${organPhrase(part)} - ${clauses.join('; ')}`;
}

// ---------- summary (multi-part) ----------

const partList = (parts) => {
  const l = parts.map((p) => `(${p.label})`);
  return l.length === 1 ? l[0] : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
};

export function summary(parts, ctx) {
  if (parts.length < 2 || ctx.options.summary === false) return '';
  const bits = [];
  const sqTop = Math.max(...parts.map((p) => squamousRank(p.values)));
  if (sqTop > 0) bits.push(`highest grade squamous lesion ${SQ_TEXT[sqTop]} in ${partList(parts.filter((p) => squamousRank(p.values) === sqTop))}`);
  const glTop = Math.max(...parts.map((p) => glandularRank(p.values)));
  if (glTop > 0) bits.push(`${glTop === 2 ? 'invasive adenocarcinoma' : 'adenocarcinoma in situ'} in ${partList(parts.filter((p) => glandularRank(p.values) === glTop))}`);
  const excisions = parts.filter((p) => !isECC(p.values));
  for (const p of excisions) {
    const m = marginClause(p.values);
    if (m && (squamousRank(p.values) > 0 || glandularRank(p.values) > 0)) bits.push(`${m} in (${p.label})`);
  }
  const ecc = parts.filter((p) => isECC(p.values));
  if (ecc.length) {
    bits.push(ecc.map((p) => `endocervical curettings (${p.label}) ${isInadequateECC(p.values) ? 'inadequate' : squamousRank(p.values) === 0 && glandularRank(p.values) === 0 ? 'negative' : 'involved'}`).join('; '));
  }
  if (!bits.length) bits.push('no evidence of squamous intraepithelial lesion or malignancy in any part');
  return `SUMMARY: ${bits.join('; ')}.`;
}

// ---------- upgrade to the cervical carcinoma synoptic (Phase 85) ----------

const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');
const UP_PROCEDURE = { LEEP: 'Loop excision (LEEP / LLETZ)', 'Cone biopsy': 'Cone biopsy', 'Top-hat endocervical excision': 'Other (specify)' };
const UP_HSIL = 'High-grade squamous intraepithelial lesion (CIN 2 or 3)';
const UP_AIS = 'Endocervical adenocarcinoma in situ';
const UP_CANNOT = 'Cannot be assessed';

/** One margin of the excision on the carcinoma form: the invasive status, the precursor and the site. */
function upMargin(out, m, value, positions) {
  if (isNA(value)) {
    out[`${m}Margin`] = UP_CANNOT;
    out[`${m}MarginSite`] = /cautery/.test(value) && /denuded/.test(value) ? 'denuded / cautery artefact' : /denuded/.test(value) ? 'denuded' : 'cautery artefact';
  } else if (value === 'Involved by HSIL') {
    out[`${m}Precursor`] = 'Involved by HSIL (CIN 2-3)';
    if (stripDot(positions)) out[`${m}PrecursorSite`] = stripDot(positions);
  } else if (value === 'Involved by AIS') {
    out[`${m}Precursor`] = 'Involved by AIS';
    if (stripDot(positions)) out[`${m}PrecursorSite`] = stripDot(positions);
  }
}

/**
 * "Upgrade this part": a LEEP, cone or top-hat excision with an invasive squamous cell carcinoma or adenocarcinoma
 * ticked hands off to the cervical carcinoma synoptic (`cervical_carcinoma`). The procedure, orientation, blocks,
 * type, depth, horizontal extent, lymphovascular invasion, p16, margins and positions carry over; the staging
 * items start at the synoptic's defaults. Endocervical curettings are not offered the upgrade.
 */
export const UPGRADE_TO = {
  to: 'cervical_carcinoma',
  label: 'Upgrade this part',
  when: (v) => !isECC(v) && (isSCC(v) || isAdenoCa(v)),
  map: (v) => {
    const out = { procedure: UP_PROCEDURE[v.specimenType] || 'Loop excision (LEEP / LLETZ)' };
    if (v.specimenType === 'Top-hat endocervical excision') out.procedure = 'Other (specify)';
    if (out.procedure === 'Other (specify)') out.procedureOther = 'Top-hat endocervical excision';
    if (stripDot(v.orientation)) out.orientation = stripDot(v.orientation);
    if (v.blocks !== undefined && v.blocks !== '') out.blocks = v.blocks;
    if (stripDot(v.positions)) { out.tumourSite = ['Other (specify)']; out.tumourSiteOther = stripDot(v.positions); }
    // Both an invasive squamous and an invasive glandular carcinoma ticked: the type is left for the pathologist.
    if (isSCC(v) && !isAdenoCa(v)) {
      out.histType = v.p16 === 'Block positive' ? 'Squamous cell carcinoma, HPV-associated' : 'Squamous cell carcinoma, NOS';
      if (v.sccType) out.sccPattern = v.sccType;
    } else if (isAdenoCa(v) && !isSCC(v)) {
      out.histType = v.glandular === 'Adenocarcinoma, HPV-independent (gastric type)' ? 'Adenocarcinoma, HPV-independent, gastric type' : 'Adenocarcinoma, HPV-associated';
    }
    if (v.invasionDepth !== undefined && v.invasionDepth !== '') out.doiMm = v.invasionDepth;
    if (v.horizontalExtent !== undefined && v.horizontalExtent !== '') { out.horizontal = 'Specify (mm)'; out.horizontalMm = v.horizontalExtent; }
    if (v.lvi) out.lvi = v.lvi;
    if (v.p16 === 'Block positive') out.p16 = 'Positive';
    else if (v.p16 === 'Negative') out.p16 = 'Negative';
    // The LEEP report states adjacent HSIL beside a squamous cell carcinoma; HSIL or AIS at a margin is adjacent too.
    const adjacent = [];
    if (isSCC(v) || v.ectoMargin === 'Involved by HSIL' || v.endoMargin === 'Involved by HSIL') adjacent.push(UP_HSIL);
    if (v.endoMargin === 'Involved by AIS') adjacent.push(UP_AIS);
    if (v.lsilBackground === 'Present' || v.ectoMargin === 'Involved by LSIL' || v.endoMargin === 'Involved by LSIL') adjacent.unshift('Low-grade squamous intraepithelial lesion (CIN 1)');
    if (v.benign === 'Chronic cervicitis') adjacent.push('Inflammation');
    if (adjacent.length) out.adjacent = adjacent;
    if (v.benign && !['None', 'Chronic cervicitis'].includes(v.benign)) out.additionalFindings = v.benign;
    upMargin(out, 'ecto', v.ectoMargin, v.ectoPositions);
    upMargin(out, 'endo', v.endoMargin, v.endoPositions);
    if (v.deepMargin === 'Involved') out.radialMargin = 'Involved by invasive carcinoma';
    else if (isNA(v.deepMargin)) { out.radialMargin = UP_CANNOT; out.radialMarginSite = 'cautery artefact'; }
    const closest = { Endocervical: 'endo', Ectocervical: 'ecto', 'Deep stromal': 'radial' }[v.clearanceMargin];
    if (closest && v.clearance !== undefined && v.clearance !== '' && !out[`${closest}Margin`]) out[`${closest}MarginMm`] = v.clearance;
    if (stripDot(v.additionalNotes)) out.additionalNotes = stripDot(v.additionalNotes);
    return out;
  }
};

export default { specimenName, microscopy, diagnosis, summary, UPGRADE_TO };
