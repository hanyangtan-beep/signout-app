// Endometrial biopsy / curettings generator. Pure functions: (part, ctx) -> string.
// House wording taken from the corpus (phase sentences, hyperplasia, endometrioid and
// serous carcinoma, MMR / p53 lines). Protected by tests/endometrial.test.js.

const NP = 'Not performed';
const has = (v) => v && v !== NP && v !== 'None' && v !== 'Absent';

export const isInadequate = (v) => v.amount === 'Scanty (inadequate for assessment)' || v.amount === 'No endometrium (mucus, blood and cervical tissue only)';
export const noEndometrium = (v) => v.amount === 'No endometrium (mucus, blood and cervical tissue only)';
export const hasCarcinoma = (v) => has(v.carcinoma) && !isInadequate(v);
export const hasHyperplasia = (v) => has(v.hyperplasia) && !isInadequate(v) && !hasCarcinoma(v);
export const isAtypical = (v) => hasHyperplasia(v) && v.hyperplasia === 'Atypical hyperplasia / EIN';
export const hasPolyp = (v) => (v.polyp === 'Present' || v.polyp === 'Fragments suggestive of polyp') && !noEndometrium(v);
export const hasEndometritis = (v) => has(v.endometritis) && !noEndometrium(v);
export const isGestational = (v) => v.phase === 'Gestational (decidua and hypersecretory glands)' && !isInadequate(v);

const NOUN = {
  'Endometrial curettings': 'curettings',
  'Endometrial biopsy (Pipelle)': 'Pipelle biopsy',
  'Hysteroscopic biopsy': 'hysteroscopic biopsy',
  'Endometrial polypectomy': 'polypectomy'
};

export function specimenName(part) {
  return `Endometrium, ${NOUN[part.values.specimenType] || 'curettings'}`;
}
export function organPhrase(part) {
  return `ENDOMETRIUM, ${NOUN[part.values.specimenType] || 'curettings'}`;
}

// ---------- microscopy ----------

const AMOUNT = {
  Moderate: 'Sections show a moderate amount of fragmented endometrium.',
  Abundant: 'Sections show abundant fragmented endometrium.',
  'Scanty (limited assessment)': 'Sections show scanty fragments of endometrium; assessment is limited.',
  'Scanty (inadequate for assessment)': 'Sections show only scanty, poorly preserved strips of endometrial epithelium, which are inadequate for assessment.',
  'No endometrium (mucus, blood and cervical tissue only)': 'Sections show mucus, blood and fragments of endocervical tissue. No endometrium is present.'
};

const PHASE = {
  Proliferative: 'The glands are tubular and lined by pseudostratified columnar epithelium with mitoses, set in a cellular stroma, in keeping with proliferative endometrium. The gland to stromal ratio is within normal limits.',
  'Weakly proliferative': 'The endometrium is weakly proliferative, composed of tubular glands with only occasional mitoses. The gland to stromal ratio is within normal limits.',
  'Disordered proliferative': 'The endometrial glands show disordered proliferation, composed of tubular glands with cystic dilatation, lined by columnar epithelium with occasional mitosis. The gland to stromal ratio is not significantly increased.',
  Secretory: 'The glands are tortuous with secretory vacuoles and luminal secretions, and the stroma is oedematous, in keeping with secretory endometrium.',
  'Menstrual / disintegrating': 'The endometrium shows stromal breakdown with collapsed glands, fibrin and neutrophils, in keeping with menstrual / disintegrating endometrium.',
  'Inactive (atrophic)': 'The endometrium is inactive, composed of small tubular glands lined by cuboidal epithelium without mitoses.',
  'Progestogen effect': 'The glands are small and inactive and the stroma is compact and shows areas of decidualisation, consistent with progestogen effect.',
  'Gestational (decidua and hypersecretory glands)': 'Decidua and hypersecretory endometrium are present.',
  'Not assessable (replaced by lesion)': 'The background endometrium is not assessable.'
};

const META = {
  'Tubal (ciliated) metaplasia': 'Focal tubal metaplasia is present.',
  'Squamous metaplasia / morules': 'Squamous morules are present.',
  'Mucinous metaplasia': 'Focal mucinous metaplasia is present.',
  'Eosinophilic and papillary syncytial change': 'Eosinophilic and papillary syncytial change is present.',
  'Stromal breakdown': 'Focal stromal breakdown is present.'
};

const POC = {
  'Chorionic villi present': 'Chorionic villi are present, confirming an intrauterine gestation.',
  'Decidua and hypersecretory endometrium without villi': 'No chorionic villi or trophoblast are identified in the sections examined.',
  'Implantation-site trophoblast without villi': 'Implantation-site intermediate trophoblast is present, confirming an intrauterine gestation, although no chorionic villi are identified.'
};

const CARC = {
  'Endometrioid carcinoma': (v) => `The fragments feature complex crowding of tubulovillous glandular structures with no intervening stroma, consistent with endometrioid carcinoma, FIGO grade ${v.figoGrade || '1'}.`,
  'Serous carcinoma': () => 'The tumour shows papillary and glandular architecture lined by markedly pleomorphic cells with high grade nuclei, hobnailing, prominent nucleoli and frequent mitoses, consistent with serous carcinoma.',
  'Serous endometrial intraepithelial carcinoma (SEIC)': () => 'The surface epithelium and glands are replaced by markedly atypical cells with high grade nuclei and frequent mitoses, without stromal invasion in the fragments examined. The features are consistent with serous endometrial intraepithelial carcinoma (SEIC).',
  'Clear cell carcinoma': () => 'The tumour shows tubulocystic and papillary architecture lined by cells with clear to eosinophilic cytoplasm, hobnailing and high grade nuclei, consistent with clear cell carcinoma.',
  Carcinosarcoma: () => 'The tumour shows a high grade carcinomatous component intimately admixed with a malignant spindle cell (sarcomatous) component, consistent with carcinosarcoma.',
  'Undifferentiated / dedifferentiated carcinoma': () => 'The tumour is composed of sheets of discohesive monotonous cells without glandular differentiation, consistent with undifferentiated carcinoma.',
  'Other malignancy (specify in notes)': () => 'The fragments are involved by a malignant neoplasm (see additional notes).'
};

const MI = {
  'Not identified in the fragments': 'No myometrial invasion is identified in the fragments examined.',
  'Present in fragments of myometrium': 'Tumour infiltrates the fragments of myometrium present.'
};

function ihcSentence(v) {
  const bits = [];
  if (v.p53 && v.p53 !== NP) bits.push(v.p53 === 'Wild type' ? 'p53 shows a wild type pattern' : `p53 shows an aberrant ${v.p53.replace(/^Aberrant \((.*)\)$/, '$1')} pattern`);
  if (v.mmr && v.mmr !== NP) bits.push(v.mmr === 'Retained (MMR proficient)' ? 'mismatch repair proteins (MLH1, PMS2, MSH2 and MSH6) are retained' : `there is ${v.mmr.toLowerCase()} with retention of the remaining mismatch repair proteins`);
  const hr = [];
  if (v.er && v.er !== NP) hr.push(`${v.er === 'Positive' ? 'positive' : v.er === 'Patchy positive' ? 'patchy positive' : 'negative'} for ER`);
  if (v.pr && v.pr !== NP) hr.push(`${v.pr === 'Positive' ? 'positive' : v.pr === 'Patchy positive' ? 'patchy positive' : 'negative'} for PR`);
  if (hr.length) bits.push(`the tumour cells are ${hr.length === 2 && hr[0].split(' for ')[0] === hr[1].split(' for ')[0] ? `${hr[0].split(' for ')[0]} for ER and PR` : hr.join(' and ')}`);
  if ((v.ihcOther || '').trim()) bits.push(v.ihcOther.trim().replace(/[.;]\s*$/, ''));
  if (!bits.length) return '';
  return `On immunohistochemistry, ${bits.join(', ')}.`;
}

export function microscopy(part) {
  const v = part.values;
  const s = [AMOUNT[v.amount] || AMOUNT.Moderate];
  if (noEndometrium(v)) {
    if (v.endocervix === 'Fragments of endocervical polyp also present') s.push('Fragments of an endocervical polyp are present.');
    return s.join(' ');
  }
  if (v.amount === 'Scanty (inadequate for assessment)') {
    if (v.endocervix === 'Unremarkable endocervical tissue also present') s.push('Fragments of unremarkable endocervical tissue are also present.');
    return s.join(' ');
  }

  if (hasCarcinoma(v)) {
    s.push(CARC[v.carcinoma](v));
    if (MI[v.mi]) s.push(MI[v.mi]);
    const ihc = ihcSentence(v);
    if (ihc) s.push(ihc);
    if (v.phase && v.phase !== 'Not assessable (replaced by lesion)' && PHASE[v.phase]) s.push(`The background endometrium is ${v.phase.toLowerCase().replace(/ \(.*\)$/, '')}.`);
    if (hasPolyp(v)) s.push('Fragments of endometrial polyp are also present.');
  } else {
    if (PHASE[v.phase]) s.push(PHASE[v.phase]);
    if (isGestational(v) && POC[v.poc]) s.push(POC[v.poc]);
    if (hasPolyp(v)) s.push(v.polyp === 'Present'
      ? 'Fragments of endometrial polyp with fibrotic stroma and thick-walled vessels are present.'
      : 'Several clusters of thick-walled vessels are present in several pieces of endometrium, compatible with an endometrial polyp.');
    if (META[v.metaplasia]) s.push(META[v.metaplasia]);
    if (hasHyperplasia(v)) {
      const ext = v.hyperplasiaExtent === 'Diffuse' ? 'Diffusely, there is' : 'Focally, there is';
      s.push(isAtypical(v)
        ? `${ext} crowding of irregularly shaped glands lined by atypical epithelium with enlarged, rounded nuclei, prominent nucleoli and frequent mitoses, consistent with atypical hyperplasia / endometrioid intraepithelial neoplasia.`
        : `${ext} crowding of irregular and branched glands with an increased gland to stromal ratio. These glands display pale or eosinophilic cytoplasm and round to oval nuclei without significant nuclear atypia, consistent with endometrial hyperplasia without atypia.`);
    }
    if (hasEndometritis(v)) {
      if (v.endometritis === 'Acute endometritis') s.push('The stroma contains neutrophils with microabscesses, in keeping with acute endometritis.');
      else s.push(`The stroma contains plasma cells${v.cd138 === 'Confirms plasma cells' ? ', confirmed on CD138 immunostaining' : ''}, in keeping with chronic endometritis.`);
    }
  }
  if (v.endocervix === 'Unremarkable endocervical tissue also present') s.push('Fragments of unremarkable endocervical tissue are also present.');
  if (v.endocervix === 'Fragments of endocervical polyp also present') s.push('Fragments of an endocervical polyp are also present.');
  if ((v.additionalNotes || '').trim()) s.push(v.additionalNotes.trim());

  // Closing line.
  if (hasCarcinoma(v)) {
    // none — the tumour sentence carries the diagnosis
  } else if (isAtypical(v)) {
    s.push('There is no evidence of invasive carcinoma in the fragments examined.');
  } else if (hasHyperplasia(v)) {
    s.push('There is no evidence of atypical hyperplasia or malignancy.');
  } else {
    const parts = [];
    if (!hasEndometritis(v)) parts.push('chronic endometritis');
    parts.push('hyperplasia', 'malignancy');
    s.push(`There is no evidence of ${parts.length === 3 ? `${parts[0]}, ${parts[1]} or ${parts[2]}` : `${parts[0]} or ${parts[1]}`}.`);
  }
  return s.join(' ');
}

// ---------- diagnosis ----------

const DX_CARC = {
  'Endometrioid carcinoma': (v) => `ENDOMETRIOID CARCINOMA, FIGO grade ${v.figoGrade || '1'}`,
  'Serous carcinoma': () => 'SEROUS CARCINOMA',
  'Serous endometrial intraepithelial carcinoma (SEIC)': () => 'SEROUS ENDOMETRIAL INTRAEPITHELIAL CARCINOMA (SEIC); no frankly invasive component identified',
  'Clear cell carcinoma': () => 'CLEAR CELL CARCINOMA',
  Carcinosarcoma: () => 'CARCINOSARCOMA',
  'Undifferentiated / dedifferentiated carcinoma': () => 'UNDIFFERENTIATED CARCINOMA',
  'Other malignancy (specify in notes)': () => 'MALIGNANT NEOPLASM, see microscopic description'
};

const PHASE_DX = {
  Proliferative: 'PROLIFERATIVE ENDOMETRIUM',
  'Weakly proliferative': 'WEAKLY PROLIFERATIVE ENDOMETRIUM',
  'Disordered proliferative': 'DISORDERED PROLIFERATIVE ENDOMETRIUM',
  Secretory: 'SECRETORY ENDOMETRIUM',
  'Menstrual / disintegrating': 'MENSTRUAL / DISINTEGRATING ENDOMETRIUM',
  'Inactive (atrophic)': 'INACTIVE (ATROPHIC) ENDOMETRIUM',
  'Progestogen effect': 'ENDOMETRIUM WITH PROGESTOGEN EFFECT',
  'Gestational (decidua and hypersecretory glands)': 'DECIDUA AND HYPERSECRETORY ENDOMETRIUM',
  'Not assessable (replaced by lesion)': ''
};

export function diagnosisText(part) {
  const v = part.values;
  if (noEndometrium(v)) return 'NO ENDOMETRIUM PRESENT; MUCUS, BLOOD AND ENDOCERVICAL TISSUE ONLY (INADEQUATE FOR ASSESSMENT)';
  if (v.amount === 'Scanty (inadequate for assessment)') return 'SCANTY ENDOMETRIUM, INADEQUATE FOR ASSESSMENT';
  if (hasCarcinoma(v)) {
    let d = DX_CARC[v.carcinoma](v);
    if (v.mi === 'Present in fragments of myometrium') d += '; myometrial invasion present in the fragments';
    return d;
  }
  const items = [];
  if (hasHyperplasia(v)) items.push(isAtypical(v) ? 'ATYPICAL HYPERPLASIA / ENDOMETRIOID INTRAEPITHELIAL NEOPLASIA' : 'ENDOMETRIAL HYPERPLASIA WITHOUT ATYPIA');
  if (hasPolyp(v)) items.push(v.polyp === 'Present' ? 'ENDOMETRIAL POLYP' : 'FRAGMENTS SUGGESTIVE OF ENDOMETRIAL POLYP');
  if (hasEndometritis(v)) items.push(v.endometritis === 'Acute endometritis' ? 'ACUTE ENDOMETRITIS' : 'CHRONIC ENDOMETRITIS');
  if (isGestational(v)) {
    if (v.poc === 'Chorionic villi present') items.push('PRODUCTS OF CONCEPTION (CHORIONIC VILLI PRESENT)');
    else if (v.poc === 'Implantation-site trophoblast without villi') items.push('IMPLANTATION-SITE TROPHOBLAST WITHOUT CHORIONIC VILLI');
    else if (v.poc === 'Decidua and hypersecretory endometrium without villi') items.push('DECIDUA AND HYPERSECRETORY ENDOMETRIUM; NO CHORIONIC VILLI IDENTIFIED');
    else items.push(PHASE_DX[v.phase]);
  }
  if (!items.length) {
    const p = PHASE_DX[v.phase] || 'BENIGN ENDOMETRIUM';
    let d = p;
    if (v.amount === 'Scanty (limited assessment)') d += ' (scanty sample)';
    return `${d}; no evidence of hyperplasia or malignancy`;
  }
  let d = items.join('; ');
  const background = PHASE_DX[v.phase];
  if (background && !isGestational(v) && !hasHyperplasia(v)) d += `; background ${background.toLowerCase()}`;
  if (isAtypical(v)) d += '; no evidence of invasive carcinoma in the fragments examined';
  else if (hasHyperplasia(v)) d += '; no evidence of atypia or malignancy';
  else if (!isGestational(v)) d += '; no evidence of hyperplasia or malignancy';
  else d += '; no evidence of hyperplasia, gestational trophoblastic disease or malignancy';
  return d;
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const lines = [`(${part.label}) ${organPhrase(part)} - ${diagnosisText(part)}`];
  if (hasCarcinoma(v) && ctx?.options?.mmrLine !== false) {
    if (v.mmr && v.mmr !== NP) {
      lines.push(v.mmr === 'Retained (MMR proficient)'
        ? '- Mismatch repair proteins: no loss of nuclear expression of MLH1, PMS2, MSH2 or MSH6 (MMR proficient); low probability of microsatellite instability-high (MSI-H).'
        : `- Mismatch repair proteins: ${v.mmr.toLowerCase()} (MMR deficient).`);
    }
    if (v.p53 && v.p53 !== NP) lines.push(`- p53 status: ${v.p53 === 'Wild type' ? 'Normal (wild type)' : `Abnormal (${v.p53.replace(/^Aberrant \((.*)\)$/, '$1')})`}.`);
  }
  return lines.join('\n');
}

export default { specimenName, microscopy, diagnosis };
