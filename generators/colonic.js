// Colonic polyp generator. Ported from legacy/colonic-polyp-signout.html.
// Pure functions: (part, ctx) -> string. Wording protected by tests/fixtures/colonic.
//
// Diagnosis terms are in capitals and the words joining them are not: "TUBULAR ADENOMA with LOW
// GRADE DYSPLASIA", "... with at least HIGH GRADE DYSPLASIA", "TUBULAR ADENOMA with INVASIVE
// ADENOCARCINOMA". Each capitalised run is then one SNOMED term. The legacy app wrote "WITH"; the
// released reports do not (1180 of the 1201 "ADENOMA with ... GRADE DYSPLASIA" diagnoses in the
// 2021-2026 biopsy export are lower case), and the fixtures were changed deliberately on 2026-09-24.
//
// Descriptions (2026-10-05, at the user's request; docs/specs/colonic-polyp-descriptions.md): the
// sessile serrated lesion, traditional serrated adenoma and high grade dysplasia sentences now name
// the features seen, from tick lists whose defaults are the features the released reports name
// most. The `templates` table below keeps the plain sentences; the description builders extend it.

export const templates = {
  tubularAdenoma: {
    label: 'Tubular adenoma',
    micro: {
      'Low grade dysplasia': 'Sections show a polypoid piece of large intestinal mucosa featuring tubular crypts with low grade dysplasia. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a polypoid piece of large intestinal mucosa featuring tubular crypts with high grade dysplasia. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'Low grade dysplasia': 'TUBULAR ADENOMA with LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'TUBULAR ADENOMA with HIGH GRADE DYSPLASIA'
    }
  },
  tubulovillousAdenoma: {
    label: 'Tubulovillous adenoma',
    micro: {
      'Low grade dysplasia': 'Sections show a polypoid fragment of large intestinal mucosa with tubulovillous architecture and low grade dysplasia. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a polypoid fragment of large intestinal mucosa with tubulovillous architecture and high grade dysplasia. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'Low grade dysplasia': 'TUBULOVILLOUS ADENOMA with LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'TUBULOVILLOUS ADENOMA with HIGH GRADE DYSPLASIA'
    }
  },
  villousAdenoma: {
    label: 'Villous adenoma',
    micro: {
      'Low grade dysplasia': 'Sections show a polypoid fragment of large intestinal mucosa with predominant villous architecture and low grade dysplasia. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a polypoid fragment of large intestinal mucosa with predominant villous architecture and high grade dysplasia. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'Low grade dysplasia': 'VILLOUS ADENOMA with LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'VILLOUS ADENOMA with HIGH GRADE DYSPLASIA'
    }
  },
  sessileSerrated: {
    label: 'Sessile serrated lesion / adenoma',
    micro: {
      'No dysplasia': 'Sections show a serrated polyp with architectural features in keeping with a sessile serrated lesion / adenoma. No cytological dysplasia is identified. There is no evidence of invasive malignancy.',
      'Low grade dysplasia': 'Sections show a sessile serrated lesion / adenoma with superimposed low grade dysplasia. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a sessile serrated lesion / adenoma with superimposed high grade dysplasia. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'No dysplasia': 'SESSILE SERRATED LESION / ADENOMA',
      'Low grade dysplasia': 'SESSILE SERRATED LESION / ADENOMA with LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'SESSILE SERRATED LESION / ADENOMA with HIGH GRADE DYSPLASIA'
    }
  },
  hyperplasticPolyp: {
    label: 'Hyperplastic polyp',
    micro: {
      'Not applicable': 'Sections show a polypoid piece of large intestinal mucosa featuring hyperplastic crypts with stellate-shaped lumina, in keeping with hyperplastic polyp. There is no evidence of dysplasia or malignancy.'
    },
    diagnosis: {
      'Not applicable': 'HYPERPLASTIC POLYP'
    }
  },
  traditionalSerrated: {
    label: 'Traditional serrated adenoma',
    micro: {
      'Low grade dysplasia': 'Sections show a serrated polyp with ectopic crypt formation and conventional low grade dysplasia, in keeping with a traditional serrated adenoma. There is no evidence of invasive malignancy.',
      'High grade dysplasia': 'Sections show a serrated polyp with ectopic crypt formation and high grade dysplasia, in keeping with a traditional serrated adenoma. There is no evidence of invasive malignancy.'
    },
    diagnosis: {
      'Low grade dysplasia': 'TRADITIONAL SERRATED ADENOMA with LOW GRADE DYSPLASIA',
      'High grade dysplasia': 'TRADITIONAL SERRATED ADENOMA with HIGH GRADE DYSPLASIA'
    }
  },
  perineurioma: {
    label: 'Perineurioma',
    micro: {
      'Not applicable': 'Sections show a poorly circumscribed proliferation of bland spindle cells with ovoid nuclei and pale, indistinct cytoplasm within a fine collagenous stroma, filling the lamina propria and separating and entrapping serrated / hyperplastic crypts. There is no evidence of dysplasia or malignancy.'
    },
    diagnosis: {
      'Not applicable': 'PERINEURIOMA'
    }
  }
};

const UNSPECIFIED = 'Colon, site not specified';
const titleCaseSite = (site) => (site === UNSPECIFIED ? 'Colon' : site);
const sentenceCase = (text) => text.charAt(0) + text.slice(1).toLowerCase();

const AT_LEAST_HGD = 'At least high grade dysplasia';
const INVASIVE = 'Invasive adenocarcinoma';
const NO_INVASION = ' There is no evidence of invasive malignancy.';

/** Resolve a (type, dysplasia) pair, falling back to the first valid grade for that type. */
function resolve(values) {
  const t = templates[values.type] || templates.tubularAdenoma;
  const grade = t.micro[values.dysplasia] ? values.dysplasia : Object.keys(t.micro)[0];
  return { t, grade };
}

const NON_ADENOMATOUS = new Set([templates.hyperplasticPolyp, templates.perineurioma]);
const isAdenomatous = (values) => !NON_ADENOMATOUS.has(templates[values.type] || templates.tubularAdenoma);
const isAtLeastHgd = (values) => values.dysplasia === AT_LEAST_HGD && isAdenomatous(values);
const isInvasive = (values) => values.dysplasia === INVASIVE && isAdenomatous(values);

// ---- Descriptions: high grade dysplasia and the serrated lesions ---------------------------
const LGD = 'Low grade dysplasia';
const HGD = 'High grade dysplasia';
const CONVENTIONAL = ['tubularAdenoma', 'tubulovillousAdenoma', 'villousAdenoma'];
const listOf = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
// A saved case from before the tick lists has no value: it prints the defaults the form would show.
const ticked = (value, defaults) => (Array.isArray(value) ? value : defaults);

// High grade dysplasia: the BCSP architectural criteria (complex crowding, cribriform and
// back-to-back glands, papillary tufting) and cytological ones (loss of polarity with stratification
// through the full thickness, markedly enlarged nuclei with nucleoli, atypical mitoses), with
// pleomorphism, increased mitoses and luminal necrosis, which the released reports also name. The
// three ticked by default are the ones the released high grade dysplasia reports name most. Features
// print in this order whatever order they were ticked in.
export const HGD_FEATURES = {
  'Cribriform / back-to-back glands': 'cribriform and back-to-back glands',
  'Glandular crowding': 'complex glandular crowding and irregularity',
  'Papillary tufting': 'prominent intraluminal papillary tufting',
  'Loss of polarity': 'loss of polarity with full-thickness nuclear stratification',
  'Enlarged nuclei, prominent nucleoli': 'markedly enlarged nuclei with prominent nucleoli',
  'Pleomorphism': 'nuclear pleomorphism',
  'Increased mitoses': 'increased mitotic activity',
  'Atypical mitoses': 'atypical mitoses',
  'Luminal necrosis': 'intraluminal necrotic debris'
};
const HGD_DEFAULT = ['Cribriform / back-to-back glands', 'Loss of polarity', 'Enlarged nuclei, prominent nucleoli'];
const phrases = (table, picked) => Object.keys(table).filter((k) => picked.includes(k)).map((k) => table[k]);
const hgdShowing = (values) => {
  const f = listOf(phrases(HGD_FEATURES, ticked(values.hgdFeatures, HGD_DEFAULT)));
  return f ? `, showing ${f}` : '';
};

// Sessile serrated lesion (WHO 2019): architecturally distorted serrated crypts - dilatation of the
// crypt base, serration reaching it, and horizontal (L-shaped or inverted T) growth along the
// muscularis mucosae. One unequivocal distorted crypt is enough for the diagnosis.
export const SSL_FEATURES = {
  'Basal dilatation': 'basal dilatation',
  'Serration into the crypt base': 'serration extending into the crypt bases',
  'Horizontal growth (L / inverted T)': 'horizontal growth along the muscularis mucosae (L-shaped and inverted T-shaped crypts)',
  'Branching': 'branching',
  'Herniation through the muscularis mucosae': 'herniation through the muscularis mucosae'
};
const SSL_DEFAULT = ['Basal dilatation', 'Serration into the crypt base'];
// The lesion is flat more often than polypoid, so the sentence does not say "polypoid piece".
function sslSentence(values) {
  const f = listOf(phrases(SSL_FEATURES, ticked(values.sslFeatures, SSL_DEFAULT)));
  return `Sections show large intestinal mucosa with architecturally distorted serrated crypts${f ? `, which show ${f}` : ''}, in keeping with a sessile serrated lesion / adenoma.`;
}

// Traditional serrated adenoma: villiform architecture, slit-like serrations, ectopic crypt foci and
// tall columnar cells with eosinophilic cytoplasm and pencillate nuclei - the four the released TSA
// reports name. Its own cytology is the low grade dysplasia, so a low grade TSA has no second sentence.
export const TSA_FEATURES = {
  'Villiform architecture': 'villiform architecture',
  'Slit-like serrations': 'slit-like serrations',
  'Ectopic crypt foci': 'ectopic crypt foci'
};
const TSA_CELLS = 'Eosinophilic cells, pencillate nuclei';
const TSA_DEFAULT = [...Object.keys(TSA_FEATURES), TSA_CELLS];
function tsaSentence(values, grade) {
  const picked = ticked(values.tsaFeatures, TSA_DEFAULT);
  const arch = listOf(phrases(TSA_FEATURES, picked));
  const cells = picked.includes(TSA_CELLS) ? 'lined by tall columnar cells with abundant eosinophilic cytoplasm and pencillate nuclei' : '';
  const name = `a traditional serrated adenoma${grade === LGD ? ' with low grade dysplasia' : ''}`;
  const body = [arch ? `with ${arch}` : '', cells].filter(Boolean).join(', ');
  return body
    ? `Sections show a polypoid piece of large intestinal mucosa ${body}, in keeping with ${name}.`
    : `Sections show a polypoid piece of large intestinal mucosa with features of ${name}.`;
}

// Dysplasia in a serrated lesion: intestinal (adenomatous) or serrated. The house grades it low or
// high, as the released reports do.
const SERRATED_DYSPLASIA = {
  'Intestinal (adenomatous)': { lgd: ' of intestinal (adenomatous) type, with elongated, pseudostratified, hyperchromatic nuclei', hgd: ' of intestinal (adenomatous) type' },
  'Serrated': { lgd: ' of serrated type, with cuboidal cells, eosinophilic cytoplasm and enlarged vesicular nuclei', hgd: ' of serrated type' },
  'Not specified': { lgd: '', hgd: '' }
};
function serratedDysplasiaSentence(values, grade) {
  const t = SERRATED_DYSPLASIA[values.serratedDysplasia] || SERRATED_DYSPLASIA['Intestinal (adenomatous)'];
  return grade === LGD
    ? `There is a focus of low grade dysplasia${t.lgd}.`
    : `There is a focus of high grade dysplasia${t.hgd}${hgdShowing(values)}.`;
}

const isFocalHgd = (values) => !!values.hgdFocal && values.dysplasia === HGD && CONVENTIONAL.includes(values.type);

/**
 * The description of a polyp without invasion, ending before the closing invasion sentence. `grade` is
 * the resolved grade; "at least high grade" passes 'High grade dysplasia'. Hyperplastic polyps keep
 * their own closing sentence.
 */
const PERINEURIOMA_IHC = {
  'EMA / GLUT1 / claudin-1 positive; S100 negative': 'Immunohistochemistry shows weak / focal EMA and diffuse GLUT1, claudin-1 and collagen IV positivity, with negative S100, CD34, CD117, SMA and desmin, supporting the diagnosis of a mucosal perineurioma.',
  'EMA / claudin-1 positive; S100 negative': 'Immunohistochemistry shows EMA and claudin-1 positivity with negative S100, supporting the diagnosis of a mucosal perineurioma.',
  'S100 positive': 'Immunohistochemistry shows S100 positivity in the spindle cell proliferation.'
};

function perineuriomaMicro(values) {
  const parts = [
    'Sections show a poorly circumscribed proliferation of bland spindle cells with ovoid nuclei and pale, indistinct cytoplasm within a fine collagenous stroma, filling the lamina propria and separating and entrapping serrated / hyperplastic crypts.',
    PERINEURIOMA_IHC[values.perineuriomaIhc] || '',
    values.perineuriomaGanglion ? 'Scattered ganglion cells are identified within the spindle cell proliferation.' : '',
    'There is no evidence of dysplasia or malignancy.'
  ];
  return parts.filter(Boolean).join(' ');
}

function lesionMicro(values, grade) {
  const type = templates[values.type] ? values.type : 'tubularAdenoma';
  const t = templates[type];
  if (type === 'hyperplasticPolyp') return t.micro[grade];
  if (type === 'perineurioma') return perineuriomaMicro(values);
  if (type === 'sessileSerrated') {
    if (grade === 'No dysplasia') return `${sslSentence(values)} No cytological dysplasia is identified.`;
    return `${sslSentence(values)} ${serratedDysplasiaSentence(values, grade)}`;
  }
  if (type === 'traditionalSerrated') {
    return grade === LGD ? tsaSentence(values, LGD) : `${tsaSentence(values, HGD)} ${serratedDysplasiaSentence(values, HGD)}`;
  }
  if (grade === LGD) return t.micro[LGD].replace(NO_INVASION, '');
  if (isFocalHgd(values)) {
    return `${t.micro[LGD].replace(NO_INVASION, '')} There is focal high grade dysplasia${hgdShowing(values)}.`;
  }
  return `${t.micro[HGD].replace(NO_INVASION, '').replace(/\.$/, '')}${hgdShowing(values)}.`;
}

// ---- At least high grade dysplasia -------------------------------------------------------
const HGD_SENTENCE = {
  'Fragmented material': 'Invasion cannot be excluded on this fragmented material.',
  'Superficial sampling': 'Invasion cannot be excluded on this superficial sample.',
  'Cautery artefact': 'Invasion cannot be excluded owing to cautery artefact.',
  'Tangential sectioning': 'Invasion cannot be excluded owing to tangential sectioning.'
};

function atLeastHgdMicro(values) {
  const base = lesionMicro(values, HGD);
  return `${base} ${HGD_SENTENCE[values.hgdReason] || 'Invasion cannot be excluded on this material.'}`;
}

function atLeastHgdDx(values) {
  const t = templates[values.type] || templates.tubularAdenoma;
  return t.diagnosis['High grade dysplasia'].replace('with HIGH GRADE DYSPLASIA', 'with at least HIGH GRADE DYSPLASIA');
}

// ---- Invasive adenocarcinoma --------------------------------------------------------------
const ARCHITECTURE = {
  tubularAdenoma: 'tubular architecture',
  tubulovillousAdenoma: 'tubulovillous architecture',
  villousAdenoma: 'predominant villous architecture',
  sessileSerrated: 'features of a sessile serrated lesion / adenoma',
  traditionalSerrated: 'features of a traditional serrated adenoma'
};
const ADENOMA_NAME = {
  tubularAdenoma: 'TUBULAR ADENOMA',
  tubulovillousAdenoma: 'TUBULOVILLOUS ADENOMA',
  villousAdenoma: 'VILLOUS ADENOMA',
  sessileSerrated: 'SESSILE SERRATED LESION / ADENOMA',
  traditionalSerrated: 'TRADITIONAL SERRATED ADENOMA'
};
const TYPE_MICRO = {
  'Adenocarcinoma NOS': 'adenocarcinoma composed of irregular malignant glands with a desmoplastic stromal response',
  'Mucinous adenocarcinoma': 'mucinous adenocarcinoma with malignant glands and clusters floating in pools of extracellular mucin comprising more than 50% of the tumour',
  'Signet-ring cell carcinoma': 'carcinoma composed predominantly of signet-ring cells with intracytoplasmic mucin displacing the nucleus',
  'Medullary carcinoma': 'carcinoma with a solid, syncytial growth pattern, vesicular nuclei and a prominent intraepithelial lymphocytic infiltrate, in keeping with medullary carcinoma'
};
const TYPE_DX = {
  'Adenocarcinoma NOS': 'INVASIVE ADENOCARCINOMA',
  'Mucinous adenocarcinoma': 'INVASIVE MUCINOUS ADENOCARCINOMA',
  'Signet-ring cell carcinoma': 'INVASIVE SIGNET-RING CELL CARCINOMA',
  'Medullary carcinoma': 'INVASIVE MEDULLARY CARCINOMA'
};
const DIFF = {
  'Well differentiated': 'well differentiated',
  'Moderately differentiated': 'moderately differentiated',
  'Poorly differentiated': 'poorly differentiated'
};
const DEPTH_MICRO = {
  'Not assessable': 'The depth of invasion cannot be assessed on this material.',
  'At least submucosa (biopsy)': 'Invasion extends at least into the submucosa; the deeper extent cannot be assessed on this biopsy.',
  'Submucosa': 'Invasion extends into the submucosa.',
  'Muscularis propria': 'Invasion extends into the muscularis propria.'
};
const DEPTH_DX = {
  'At least submucosa (biopsy)': 'at least submucosal invasion',
  'Submucosa': 'submucosal invasion',
  'Muscularis propria': 'invasion into muscularis propria'
};
const LVI_MICRO = {
  'Not identified': 'Lymphovascular invasion is not identified.',
  'Present': 'Lymphovascular invasion is present.',
  'Indeterminate': 'Lymphovascular invasion is indeterminate.'
};
const LVI_DX = { 'Not identified': 'no lymphovascular invasion', 'Present': 'lymphovascular invasion present' };
const BUDDING_MICRO = {
  'Low (Bd1, 0-4 buds)': 'Tumour budding is low grade (Bd1).',
  'Intermediate (Bd2, 5-9 buds)': 'Tumour budding is intermediate grade (Bd2).',
  'High (Bd3, 10 or more buds)': 'Tumour budding is high grade (Bd3).'
};
const MMR_MICRO = {
  'Retained (MLH1, PMS2, MSH2, MSH6)': 'Immunohistochemistry shows retained nuclear expression of MLH1, PMS2, MSH2 and MSH6 in the tumour cells (mismatch repair proficient).',
  'Loss of MLH1 and PMS2': 'Immunohistochemistry shows loss of nuclear expression of MLH1 and PMS2 in the tumour cells, with retained MSH2 and MSH6 (mismatch repair deficient).',
  'Loss of MSH2 and MSH6': 'Immunohistochemistry shows loss of nuclear expression of MSH2 and MSH6 in the tumour cells, with retained MLH1 and PMS2 (mismatch repair deficient).',
  'Isolated loss of PMS2': 'Immunohistochemistry shows isolated loss of nuclear expression of PMS2 in the tumour cells, with retained MLH1, MSH2 and MSH6 (mismatch repair deficient).',
  'Isolated loss of MSH6': 'Immunohistochemistry shows isolated loss of nuclear expression of MSH6 in the tumour cells, with retained MLH1, PMS2 and MSH2 (mismatch repair deficient).'
};
const MMR_DX = {
  'Retained (MLH1, PMS2, MSH2, MSH6)': 'MMR proficient',
  'Loss of MLH1 and PMS2': 'MMR deficient (loss of MLH1 / PMS2)',
  'Loss of MSH2 and MSH6': 'MMR deficient (loss of MSH2 / MSH6)',
  'Isolated loss of PMS2': 'MMR deficient (isolated loss of PMS2)',
  'Isolated loss of MSH6': 'MMR deficient (isolated loss of MSH6)'
};

const isBiopsyOfMass = (values) => (values.caKind || 'Biopsy of mass') === 'Biopsy of mass';
const hasBackgroundAdenoma = (values) => (values.backgroundAdenoma || '') === 'Present (polyp type above)';
const marginMm = (values) => {
  const n = parseFloat(values.marginDistance);
  return Number.isFinite(n) ? n : null;
};
const fmtMm = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)} mm`;

function carcinomaNoun(values) {
  const kind = values.caKind || 'Biopsy of mass';
  if (kind === 'Polypectomy') return 'polypectomy';
  if (kind === 'EMR / ESD fragments') return 'EMR / ESD';
  return 'biopsy';
}

function carcinomaTypeMicro(values) {
  const ht = values.histType || 'Adenocarcinoma NOS';
  if (ht === 'Other') {
    const o = (values.histTypeOther || '').trim();
    return o ? `${o.charAt(0).toLowerCase()}${o.slice(1)}` : 'carcinoma';
  }
  return TYPE_MICRO[ht] || TYPE_MICRO['Adenocarcinoma NOS'];
}

function carcinomaTypeDx(values) {
  const ht = values.histType || 'Adenocarcinoma NOS';
  if (ht === 'Other') {
    const o = (values.histTypeOther || '').trim();
    return o ? `INVASIVE ${o.toUpperCase()}` : 'INVASIVE CARCINOMA';
  }
  return TYPE_DX[ht] || TYPE_DX['Adenocarcinoma NOS'];
}

function marginMicro(values) {
  if (isBiopsyOfMass(values) || (values.margin || '') === 'Not applicable (biopsy)') return '';
  const noun = values.caKind === 'Polypectomy' ? 'polypectomy' : 'resection';
  if (values.margin === 'Involved') return `The ${noun} margin is involved by carcinoma.`;
  if (values.margin === 'Not assessable (piecemeal)') return `The ${noun} margin cannot be assessed in this piecemeal specimen.`;
  if (values.margin === 'Clear') {
    const mm = marginMm(values);
    return mm === null ? `The ${noun} margin is clear of carcinoma.` : `Carcinoma is clear of the ${noun} margin by ${fmtMm(mm)}.`;
  }
  return '';
}

function marginDx(values) {
  if (isBiopsyOfMass(values) || (values.margin || '') === 'Not applicable (biopsy)') return '';
  if (values.margin === 'Involved') return 'margin involved';
  if (values.margin === 'Not assessable (piecemeal)') return 'margin not assessable (piecemeal)';
  if (values.margin === 'Clear') {
    const mm = marginMm(values);
    return mm === null ? 'margin clear' : `margin clear (${fmtMm(mm)})`;
  }
  return '';
}

// ---- Haggitt and Kikuchi levels (malignant polyps) -----------------------------------------
// Haggitt for a pedunculated polyp, Kikuchi for a sessile one (UK BCSP guidance; USMSTF 2020). On a
// polypectomy or EMR / ESD the recorded level is the depth sentence, in place of the plain
// "Invasion extends into the submucosa." A biopsy of a mass, or invasion into the muscularis propria,
// prints no level. The stored option values are the ones saved before 2026-10-05.
const HAGGITT = {
  'Level 1': { micro: 'Invasion extends into the submucosa of the polyp head', tag: 'Haggitt level 1' },
  'Level 2': { micro: 'Invasion extends into the submucosa at the neck of the polyp', tag: 'Haggitt level 2' },
  'Level 3': { micro: 'Invasion extends into the submucosa of the stalk', tag: 'Haggitt level 3' },
  'Level 4': { micro: 'Invasion extends into the submucosa below the stalk', tag: 'Haggitt level 4' }
};
const KIKUCHI = {
  sm1: { micro: 'Invasion is confined to the upper third of the submucosa', tag: 'Kikuchi level sm1' },
  sm2: { micro: 'Invasion extends into the middle third of the submucosa', tag: 'Kikuchi level sm2' },
  sm3: { micro: 'Invasion extends into the lower third of the submucosa', tag: 'Kikuchi level sm3' }
};
const NOT_ASSESSABLE = 'Not assessable';
const levelsApply = (values) => !isBiopsyOfMass(values) && values.depth !== 'Muscularis propria';
function levels(values) {
  if (!levelsApply(values)) return [];
  return [HAGGITT[values.haggitt], KIKUCHI[values.kikuchi]].filter(Boolean);
}

function depthMicro(values) {
  const lv = levels(values);
  if (lv.length) return `${lv[0].micro} (${lv.map((l) => l.tag).join('; ')}).`;
  return DEPTH_MICRO[values.depth] || DEPTH_MICRO['Not assessable'];
}

function levelCaveats(values) {
  if (!levelsApply(values)) return [];
  return [
    values.haggitt === NOT_ASSESSABLE ? 'The Haggitt level cannot be assessed on this specimen.' : '',
    values.kikuchi === NOT_ASSESSABLE ? 'The Kikuchi level cannot be assessed, as muscularis propria is not represented.' : ''
  ].filter(Boolean);
}

const mmValue = (raw) => {
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function measureMicro(values) {
  if (isBiopsyOfMass(values)) return '';
  const depth = mmValue(values.invasionDepth);
  const width = mmValue(values.invasionWidth);
  if (depth !== null && width !== null) return `The depth of submucosal invasion is ${fmtMm(depth)} and the width of invasion is ${fmtMm(width)}.`;
  if (depth !== null) return `The depth of submucosal invasion is ${fmtMm(depth)}.`;
  if (width !== null) return `The width of invasion is ${fmtMm(width)}.`;
  return '';
}

function depthDx(values) {
  const lv = levels(values);
  if (lv.length) return `submucosal invasion (${lv.map((l) => l.tag).join(', ')})`;
  return DEPTH_DX[values.depth] || '';
}

function invasiveMicro(values) {
  const diff = DIFF[values.differentiation] ? `${DIFF[values.differentiation]} ` : '';
  const lesion = `an invasive ${diff}${carcinomaTypeMicro(values)}`;
  let text;
  if (hasBackgroundAdenoma(values)) {
    const arch = ARCHITECTURE[values.type] || ARCHITECTURE.tubularAdenoma;
    const piece = isBiopsyOfMass(values) ? 'fragments of large intestinal mucosa' : 'a polypoid piece of large intestinal mucosa';
    text = `Sections show ${piece} with ${arch} and high grade dysplasia, from which arises ${lesion}.`;
  } else {
    const piece = isBiopsyOfMass(values) ? 'fragments of large intestinal mucosa' : 'a polypoid piece of large intestinal mucosa';
    text = `Sections show ${piece} infiltrated by ${lesion}.`;
  }
  const parts = [
    text,
    depthMicro(values),
    ...levelCaveats(values),
    measureMicro(values),
    LVI_MICRO[values.lvi] || '',
    BUDDING_MICRO[values.budding] || '',
    marginMicro(values),
    MMR_MICRO[values.mmr] || ''
  ];
  return parts.filter(Boolean).join(' ');
}

function invasiveDx(values) {
  let head = carcinomaTypeDx(values);
  if (hasBackgroundAdenoma(values)) head = `${ADENOMA_NAME[values.type] || ADENOMA_NAME.tubularAdenoma} with ${head}`;
  const qualifiers = [DIFF[values.differentiation] || ''].filter(Boolean);
  const clauses = [depthDx(values), marginDx(values), LVI_DX[values.lvi] || '', MMR_DX[values.mmr] || ''].filter(Boolean);
  let dx = head;
  if (qualifiers.length) dx += `, ${qualifiers.join(', ')}`;
  if (clauses.length) dx += `; ${clauses.join('; ')}`;
  return dx;
}

/** Sentence case that preserves capitalised abbreviations (MMR, MLH1, PMS2, MSH2, MSH6, EMR, ESD). */
function sentenceCaseDx(text) {
  return sentenceCase(text).replace(/\bmmr\b/g, 'MMR').replace(/\b(mlh1|pms2|msh2|msh6)\b/g, (m) => m.toUpperCase());
}

export function specimenName(part) {
  const s = part.values;
  const custom = (s.customSpecimen || '').trim();
  if (custom) return custom;
  if (isInvasive(s) && isBiopsyOfMass(s)) return `${titleCaseSite(s.site)} mass`;
  return `${titleCaseSite(s.site)} polyp`;
}

export function microscopy(part) {
  const s = part.values;
  let text;
  if (isInvasive(s)) text = invasiveMicro(s);
  else if (isAtLeastHgd(s)) text = atLeastHgdMicro(s);
  else {
    const { t, grade } = resolve(s);
    text = t === templates.hyperplasticPolyp ? t.micro[grade] : t === templates.perineurioma ? perineuriomaMicro(s) : `${lesionMicro(s, grade)}${NO_INVASION}`;
  }
  const c = (s.comment || '').trim();
  if (c) text += ` ${c}`;
  return `(${part.label})  ${text}`;
}

export function diagnosis(part, ctx) {
  const s = part.values;
  const upper = !!ctx.options.uppercaseDx;
  const siteText = upper ? (s.site === UNSPECIFIED ? 'COLON' : s.site.toUpperCase()) : titleCaseSite(s.site);
  let dxUpper;
  let noun = ctx.schema.specimenNoun;
  if (isInvasive(s)) { dxUpper = invasiveDx(s); noun = carcinomaNoun(s); }
  else if (isAtLeastHgd(s)) dxUpper = atLeastHgdDx(s);
  else {
    const { t, grade } = resolve(s);
    dxUpper = t.diagnosis[grade];
    if (isFocalHgd(s)) dxUpper = dxUpper.replace('with HIGH GRADE DYSPLASIA', 'with focal HIGH GRADE DYSPLASIA');
  }
  const dx = upper ? dxUpper : (isInvasive(s) ? sentenceCaseDx(dxUpper) : sentenceCase(dxUpper));
  return `(${part.label}) ${siteText}, ${specimenName(part)}, ${noun} - ${dx}.`;
}

/**
 * Case-level flags for snippet `auto: {flag}` rules. A malignant polyp (polypectomy or
 * EMR / ESD with invasive carcinoma) is flagged as `malignantPolypRisk` when any adverse
 * feature for local excision is present (poor differentiation, lymphovascular invasion,
 * high grade budding, involved margin or clearance under 1 mm, and since 2026-10-05 deep
 * submucosal invasion: Haggitt level 4, or Kikuchi sm2 or sm3, which USMSTF 2020 and the BCSP
 * guidance give lymph node metastasis rates that warrant surgery), otherwise as
 * `malignantPolypFavourable` when every feature has been assessed and is favourable. A measured
 * depth alone does not set the flag: whether 1 mm matters turns on the polyp's configuration,
 * which the form does not record.
 */
export function flags(parts) {
  const out = [];
  const polyps = parts.map((p) => p.values).filter((v) => isInvasive(v) && !isBiopsyOfMass(v));
  const deepSubmucosal = (v) => levelsApply(v) && (v.haggitt === 'Level 4' || v.kikuchi === 'sm2' || v.kikuchi === 'sm3');
  const adverse = (v) => {
    const mm = marginMm(v);
    return v.differentiation === 'Poorly differentiated' || v.lvi === 'Present'
      || v.budding === 'High (Bd3, 10 or more buds)' || v.margin === 'Involved'
      || (v.margin === 'Clear' && mm !== null && mm < 1) || deepSubmucosal(v);
  };
  const favourable = (v) => DIFF[v.differentiation] && v.differentiation !== 'Poorly differentiated'
    && v.lvi === 'Not identified' && BUDDING_MICRO[v.budding] && v.budding !== 'High (Bd3, 10 or more buds)'
    && v.margin === 'Clear' && (marginMm(v) === null || marginMm(v) >= 1);
  if (polyps.some(adverse)) out.push('malignantPolypRisk');
  else if (polyps.length && polyps.every(favourable)) out.push('malignantPolypFavourable');
  return out;
}

export function validate(part) {
  const v = part.values || {};
  const issues = [];
  if (v.type === 'perineurioma') {
    if (v.perineuriomaIhc === 'S100 positive') {
      issues.push({
        level: 'warn',
        field: 'perineuriomaIhc',
        message: 'S100 positivity favours mucosal Schwann cell hamartoma rather than perineurioma (perineurioma is S100 negative, EMA/GLUT1/claudin-1 positive).'
      });
    }
    if (v.perineuriomaGanglion) {
      issues.push({
        level: 'warn',
        field: 'perineuriomaGanglion',
        message: 'Ganglion cells within a mucosal spindle cell proliferation favour ganglioneuroma rather than perineurioma.'
      });
    }
  }
  return issues;
}

export default { specimenName, microscopy, diagnosis, flags, validate };
