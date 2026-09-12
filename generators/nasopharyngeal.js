// Nasopharyngeal biopsy generator (roadmap "Nasopharyngeal biopsy", Next; built 2026-09-12).
// Small-biopsy module for the local NPC work-up: benign pick-list with the house
// "NASOPHARYNX, biopsy - ...; no evidence of malignancy" line, WHO 5th edition
// nasopharyngeal carcinoma subtypes with the epithelial-IHC + EBER sentence woven into
// the microscopy, lymphoma work-up flag, granulomatous inflammation with ZN/GMS and
// post-radiotherapy settings. Wording is protected by tests/nasopharyngeal.test.js —
// change it only deliberately.

const NP = 'Not performed';
const has = (v) => v && v !== 'Absent' && v !== NP && v !== 'Not specified';

// ---------- finding families ----------

const UNDIFF = 'Nasopharyngeal carcinoma, non-keratinising, undifferentiated';
const DIFF = 'Nasopharyngeal carcinoma, non-keratinising, differentiated';
const KSCC = 'Nasopharyngeal carcinoma, keratinising squamous cell carcinoma';
const BSCC = 'Nasopharyngeal carcinoma, basaloid squamous cell carcinoma';
const PAPADENO = 'Nasopharyngeal papillary adenocarcinoma';
const SALIVARY = 'Salivary gland-type carcinoma';
const OTHER_MAL = 'Other malignancy (describe in notes)';
const LYMPHOID = 'Atypical lymphoid infiltrate (? lymphoma)';
const NEC_GRAN = 'Granulomatous inflammation, necrotising';
const NONNEC_GRAN = 'Granulomatous inflammation, non-necrotising';

const NPC_TYPES = [UNDIFF, DIFF, KSCC, BSCC];
const CARCINOMAS = [...NPC_TYPES, PAPADENO, SALIVARY, OTHER_MAL];

export const isNPC = (v) => NPC_TYPES.includes(v.finding);
export const isCarcinoma = (v) => CARCINOMAS.includes(v.finding);
export const isAtypicalLymphoid = (v) => v.finding === LYMPHOID;
const isGranulomatous = (v) => v.finding === NEC_GRAN || v.finding === NONNEC_GRAN;
const isBenign = (v) => !isCarcinoma(v) && !isAtypicalLymphoid(v) && !isGranulomatous(v);
// Site proper nouns keep their capitals: "Right fossa of Rosenmüller" -> "right fossa of Rosenmüller".
const lcFirst = (x) => x.charAt(0).toLowerCase() + x.slice(1);
const isSuboptimal = (v) => v.adequacy === 'Crushed / scant fragments only (suboptimal)';
const isPostRT = (v) => v.setting && v.setting !== 'First diagnosis';
const isRecurrence = (v) => v.setting === 'Suspected recurrence / persistence';

// ---------- specimen / diagnosis headers ----------

function specimenText(v) {
  return String(v.specimenName || '').trim().replace(/[.,;\s]+$/, '');
}

export function specimenName(part) {
  const v = part.values;
  const text = specimenText(v);
  if (text) return `${text}, biopsy`;
  const site = has(v.site) ? `, ${lcFirst(v.site)}` : '';
  return `Nasopharynx${site}, biopsy`;
}

export function organPhrase(part) {
  const v = part.values;
  const site = has(v.site) ? `, ${lcFirst(v.site)}` : '';
  return `NASOPHARYNX${site}, biopsy`;
}

// ---------- microscopy ----------

function pieceLead(v) {
  const n = v.pieces ? `${v.pieces}` : '';
  const pieces = n ? `${n} pieces of ` : '';
  if (isSuboptimal(v)) return `Sections show ${n ? `${n} small crushed ` : 'small crushed '}fragments of tissue with crush artefact, limiting assessment.`;
  switch (v.adequacy) {
    case 'Lymphoid tissue only (no surface epithelium)':
      return `Sections show ${pieces}nasopharyngeal lymphoid tissue without representation of the surface epithelium.`;
    case 'Surface epithelium only':
      return `Sections show ${pieces}fragments of surface respiratory-type epithelium with scant underlying stroma only.`;
    default:
      return `Sections show ${pieces}nasopharyngeal mucosa lined by respiratory epithelium with underlying lymphoid tissue.`;
  }
}

const BENIGN_SENTENCE = {
  'Reactive lymphoid hyperplasia': 'The lymphoid tissue shows reactive follicular hyperplasia with polarised germinal centres containing tingible body macrophages; the overlying surface epithelium is unremarkable.',
  'Chronic nasopharyngitis with lymphoid follicles': 'There is chronic inflammation of the mucosa with lymphoid follicle formation; the surface epithelium is unremarkable.',
  'Benign surface epithelium (respiratory / squamous)': 'Benign respiratory-type epithelium, focally undergoing squamous metaplasia, overlies unremarkable lymphoid stroma.',
  'Adenoid remnant': 'There is adenoid tissue comprising mucosal folds lined by ciliated respiratory epithelium over prominent reactive lymphoid germinal centres, in keeping with an adenoid remnant.',
  'Tornwaldt cyst': 'There is a cystic space lined by benign respiratory epithelium overlying reactive lymphoid tissue, in keeping with a Tornwaldt cyst (nasopharyngeal bursa cyst).'
};

function tumourSentence(v) {
  switch (v.finding) {
    case UNDIFF:
      return 'There is an infiltrative malignant neoplasm composed of nests and syncytial sheets of large cells with vesicular nuclei, prominent eosinophilic nucleoli and indistinct cell borders, intimately admixed with a dense lymphoplasmacytic infiltrate, in keeping with nasopharyngeal carcinoma, non-keratinising undifferentiated type.';
    case DIFF:
      return 'There is an infiltrative malignant neoplasm composed of nests and cords of atypical epithelial cells with more distinct cell borders and focal squamoid differentiation set in a lymphoid-rich stroma, in keeping with nasopharyngeal carcinoma, non-keratinising differentiated type.';
    case KSCC:
      return 'There is an infiltrative malignant neoplasm composed of irregular nests of malignant squamous cells with keratinisation and intercellular bridges, accompanied by a desmoplastic stromal response, in keeping with keratinising squamous cell carcinoma of the nasopharynx.';
    case BSCC:
      return 'There is an infiltrative malignant neoplasm composed of basaloid nests and lobules with peripheral palisading, central comedo-type necrosis and basement membrane-like hyaline stromal material, in keeping with basaloid squamous cell carcinoma of the nasopharynx.';
    case PAPADENO:
      return 'There is a papillary epithelial neoplasm with thin fibrovascular cores lined by pseudostratified columnar cells showing mild to moderate atypia and scattered mitoses, in keeping with nasopharyngeal papillary adenocarcinoma.';
    case SALIVARY:
      return 'There is an infiltrative carcinoma, morphologically of salivary gland type (see additional notes for subtyping).';
    default:
      return 'There is a malignant neoplasm (see additional notes).';
  }
}

/** "(All) biopsy fragments are involved." / "Tumour involves some of the biopsy fragments." */
function fragmentsSentence(v) {
  if (!isNPC(v)) return '';
  switch (v.tumourFragments) {
    case 'Some fragments involved': return 'Tumour involves some of the biopsy fragments; the remainder is covered by unremarkable mucosa.';
    case 'Focal involvement': return 'Tumour involvement is focal within the biopsy fragments.';
    default: return 'All biopsy fragments are involved by tumour.';
  }
}

function invasionSentences(v) {
  const s = [];
  if (v.lvi === 'Present') s.push('Lymphovascular invasion is present.');
  if (v.pni === 'Present') s.push('Perineural invasion is present.');
  return s;
}

/** Epithelial IHC + EBER, in the microscopy paragraph. */
function ancillarySentences(v) {
  const s = [];
  const markersOn = v.epithelialMarkers !== 'Pending' && has(v.epithelialMarkers);
  if (markersOn) {
    const markers = v.epithelialMarkers === 'Cytokeratin (AE1/AE3) and p40 positive' ? 'cytokeratin AE1/AE3 and p40' : 'cytokeratin AE1/AE3 and p63';
    let sentence = `On immunohistochemistry, the tumour cells are positive for ${markers}`;
    if (v.eber === 'Positive in the tumour cells') sentence += ', and in-situ hybridisation for Epstein-Barr virus-encoded RNAs (EBER) is positive in the tumour cells';
    sentence += '.';
    s.push(sentence);
  }
  if (v.eber === 'Positive in the tumour cells' && !markersOn) s.push('In-situ hybridisation for Epstein-Barr virus-encoded RNAs (EBER) is positive in the tumour cells.');
  if (v.epithelialMarkers === 'Pending') s.push('Immunohistochemistry for epithelial markers has been ordered; the result will follow in an addendum report.');
  if (v.eber === 'Pending') s.push('In-situ hybridisation for EBER has been ordered; the result will be issued in an addendum report.');
  if (v.eber === 'Negative') s.push('In-situ hybridisation for EBER is negative.');
  return s;
}

function granulomaSentence(v) {
  if (v.finding === NEC_GRAN) return 'Necrotising epithelioid granulomas with multinucleated giant cells and caseous necrosis are present.';
  return 'Non-necrotising epithelioid granulomas with multinucleated giant cells are present.';
}

function stainSentence(v) {
  switch (v.afStains) {
    case 'ZN and GMS negative': return 'Ziehl-Neelsen and GMS stains do not highlight any acid-fast bacilli or fungal elements.';
    case 'Acid-fast bacilli identified (ZN)': return 'Ziehl-Neelsen stain highlights acid-fast bacilli.';
    case 'Fungal elements identified (GMS)': return 'GMS stain highlights fungal elements.';
    default: return '';
  }
}

function rtSentence(v) {
  return 'The background stroma shows post-radiotherapy changes with stromal fibrosis and scattered atypical radiated fibroblasts.';
}

export function microscopy(part) {
  const v = part.values;
  const s = [pieceLead(v)];

  if (isSuboptimal(v)) {
    const n = String(v.additionalNotes || '').trim();
    if (n) s.push(n.replace(/[.;\s]+$/, '') + '.');
    return `(${part.label}) ${s.join(' ')}`;
  }

  if (isCarcinoma(v)) {
    s.push(tumourSentence(v));
    const frag = fragmentsSentence(v);
    if (frag) s.push(frag);
    s.push(...invasionSentences(v));
    if (isNPC(v)) s.push(...ancillarySentences(v));
    if (isPostRT(v)) s.push(rtSentence(v));
  } else if (isAtypicalLymphoid(v)) {
    s.push('The lymphoid tissue is expanded by a dense atypical lymphoid infiltrate composed of cells with enlarged, irregular and vesicular nuclei, effacing the normal architecture (see comment).');
    if (v.eber === 'Positive in the tumour cells') s.push('In-situ hybridisation for EBER is positive in the atypical cells.');
    if (v.eber === 'Pending') s.push('In-situ hybridisation for EBER has been ordered; the result will be issued in an addendum report.');
    if (isPostRT(v)) s.push(rtSentence(v));
  } else if (isGranulomatous(v)) {
    s.push(granulomaSentence(v));
    const st = stainSentence(v);
    if (st) s.push(st);
    if (isPostRT(v)) s.push(rtSentence(v));
    s.push('There is no evidence of malignancy.');
  } else {
    s.push(BENIGN_SENTENCE[v.finding] || BENIGN_SENTENCE['Reactive lymphoid hyperplasia']);
    if (isPostRT(v)) s.push(rtSentence(v));
    s.push('There is no evidence of malignancy.');
    if (v.adequacy === 'Lymphoid tissue only (no surface epithelium)') s.push('As the surface epithelium is not represented, a small submucosal lesion cannot be entirely excluded (see comment).');
  }

  const notes = String(v.additionalNotes || '').trim();
  if (notes) s.push(notes.replace(/[.;\s]+$/, '') + '.');
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

function npcDxText(v) {
  const subtype = {
    [UNDIFF]: 'non-keratinising undifferentiated type',
    [DIFF]: 'non-keratinising differentiated type',
    [KSCC]: 'keratinising squamous cell carcinoma type',
    [BSCC]: 'basaloid squamous cell carcinoma type'
  }[v.finding];
  const bits = [`NASOPHARYNGEAL CARCINOMA, ${subtype}`];
  if (v.eber === 'Positive in the tumour cells') bits.push('EBER positive');
  if (v.lvi === 'Present') bits.push('lymphovascular invasion present');
  if (v.pni === 'Present') bits.push('perineural invasion present');
  return bits.join('; ');
}

const BENIGN_DX = {
  'Reactive lymphoid hyperplasia': 'REACTIVE LYMPHOID HYPERPLASIA',
  'Chronic nasopharyngitis with lymphoid follicles': 'CHRONIC NASOPHARYNGITIS WITH LYMPHOID FOLLICLES',
  'Benign surface epithelium (respiratory / squamous)': 'BENIGN NASOPHARYNGEAL EPITHELIUM AND LYMPHOID TISSUE',
  'Adenoid remnant': 'ADENOID REMNANT',
  'Tornwaldt cyst': 'TORNWALDT CYST'
};

function stainTag(v) {
  switch (v.afStains) {
    case 'ZN and GMS negative': return '; no acid-fast bacilli or fungal elements on special stains';
    case 'Acid-fast bacilli identified (ZN)': return '; ACID-FAST BACILLI IDENTIFIED on Ziehl-Neelsen stain';
    case 'Fungal elements identified (GMS)': return '; FUNGAL ELEMENTS IDENTIFIED on GMS stain';
    default: return '';
  }
}

export function diagnosisText(part) {
  const v = part.values;
  if (isSuboptimal(v)) return 'CRUSHED / SCANT TISSUE ONLY, SUBOPTIMAL FOR ASSESSMENT; no definite malignancy identified';

  if (isNPC(v)) {
    const dx = npcDxText(v);
    return isRecurrence(v) ? `PERSISTENT / RECURRENT NASOPHARYNGEAL CARCINOMA, ${dx.replace(/^NASOPHARYNGEAL CARCINOMA, /, '')}` : dx;
  }
  if (v.finding === PAPADENO) return 'NASOPHARYNGEAL PAPILLARY ADENOCARCINOMA';
  if (v.finding === SALIVARY) return 'SALIVARY GLAND-TYPE CARCINOMA (see microscopic description)';
  if (v.finding === OTHER_MAL) return 'MALIGNANT NEOPLASM (see microscopic description)';
  if (isAtypicalLymphoid(v)) return 'ATYPICAL LYMPHOID INFILTRATE; lymphoma cannot be excluded - immunohistochemical work-up recommended (see comment)';
  if (isGranulomatous(v)) {
    const nec = v.finding === NEC_GRAN;
    const tb = nec && v.afStains !== 'Acid-fast bacilli identified (ZN)' ? '; tuberculosis to be correlated with microbiology' : '';
    return `${nec ? 'NECROTISING' : 'NON-NECROTISING'} GRANULOMATOUS INFLAMMATION${stainTag(v)}${tb}; no evidence of malignancy`;
  }
  const benign = BENIGN_DX[v.finding] || 'NO SIGNIFICANT ABNORMALITY';
  if (isPostRT(v)) {
    return `POST-RADIOTHERAPY CHANGES; ${benign.toLowerCase()}; no evidence of recurrent carcinoma`;
  }
  return `${benign}; no evidence of malignancy`;
}

export function diagnosis(part) {
  return `(${part.label}) ${organPhrase(part)} - ${diagnosisText(part)}`;
}

// ---------- summary + flags ----------

const partList = (parts) => {
  const l = parts.map((p) => `(${p.label})`);
  return l.length === 1 ? l[0] : `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`;
};

export function summary(parts, ctx) {
  if (parts.length < 2 || (ctx && ctx.options && ctx.options.summary === false)) return '';
  const ca = parts.filter((p) => isCarcinoma(p.values));
  const benign = parts.filter((p) => !isCarcinoma(p.values));
  const bits = [];
  if (ca.length) {
    const types = [...new Set(ca.map((p) => isNPC(p.values) ? `nasopharyngeal carcinoma (${{
      [UNDIFF]: 'non-keratinising undifferentiated',
      [DIFF]: 'non-keratinising differentiated',
      [KSCC]: 'keratinising',
      [BSCC]: 'basaloid'
    }[p.values.finding]})` : p.values.finding === PAPADENO ? 'papillary adenocarcinoma' : p.values.finding === SALIVARY ? 'salivary gland-type carcinoma' : 'malignancy'))];
    bits.push(`${types.join(' and ')} in ${partList(ca)}`);
  }
  if (benign.length) bits.push(`no evidence of malignancy in ${partList(benign)}`);
  return bits.length ? `SUMMARY: ${bits.join('; ')}.` : '';
}

/** Case-level flags for `auto: {flag}` snippets. */
export function flags(parts) {
  const out = [];
  if (parts.some((p) => isCarcinoma(p.values))) out.push('carcinoma');
  if (parts.some((p) => (isCarcinoma(p.values) || isAtypicalLymphoid(p.values)) && p.values.eber === 'Pending')) out.push('eberPending');
  if (parts.some((p) => isAtypicalLymphoid(p.values))) out.push('atypicalLymphoid');
  return out;
}

export default { specimenName, microscopy, diagnosis, summary, flags };
