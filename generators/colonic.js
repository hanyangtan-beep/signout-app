// Colonic polyp generator. Ported from legacy/colonic-polyp-signout.html.
// Pure functions: (part, ctx) -> string. Wording protected by tests/fixtures/colonic.
//
// Diagnosis terms are in capitals and the words joining them are not: "TUBULAR ADENOMA with LOW
// GRADE DYSPLASIA", "... with at least HIGH GRADE DYSPLASIA", "TUBULAR ADENOMA with INVASIVE
// ADENOCARCINOMA". Each capitalised run is then one SNOMED term. The legacy app wrote "WITH"; the
// released reports do not (1180 of the 1201 "ADENOMA with ... GRADE DYSPLASIA" diagnoses in the
// 2021-2026 biopsy export are lower case), and the fixtures were changed deliberately on 2026-09-24.

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

const isAdenomatous = (values) => (templates[values.type] || templates.tubularAdenoma) !== templates.hyperplasticPolyp;
const isAtLeastHgd = (values) => values.dysplasia === AT_LEAST_HGD && isAdenomatous(values);
const isInvasive = (values) => values.dysplasia === INVASIVE && isAdenomatous(values);

// ---- At least high grade dysplasia -------------------------------------------------------
const HGD_SENTENCE = {
  'Fragmented material': 'Invasion cannot be excluded on this fragmented material.',
  'Superficial sampling': 'Invasion cannot be excluded on this superficial sample.',
  'Cautery artefact': 'Invasion cannot be excluded owing to cautery artefact.',
  'Tangential sectioning': 'Invasion cannot be excluded owing to tangential sectioning.'
};

function atLeastHgdMicro(values) {
  const t = templates[values.type] || templates.tubularAdenoma;
  const base = t.micro['High grade dysplasia'].replace(NO_INVASION, '');
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

function levelMicro(values) {
  if (isBiopsyOfMass(values)) return '';
  const out = [];
  if (values.haggitt && values.haggitt !== 'Not applicable') out.push(`Haggitt ${values.haggitt.toLowerCase()}`);
  if (values.kikuchi && values.kikuchi !== 'Not applicable') out.push(`Kikuchi level ${values.kikuchi}`);
  return out.length ? `The invasion corresponds to ${out.join(' / ')}.` : '';
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
    DEPTH_MICRO[values.depth] || DEPTH_MICRO['Not assessable'],
    LVI_MICRO[values.lvi] || '',
    BUDDING_MICRO[values.budding] || '',
    marginMicro(values),
    levelMicro(values),
    MMR_MICRO[values.mmr] || ''
  ];
  return parts.filter(Boolean).join(' ');
}

function invasiveDx(values) {
  let head = carcinomaTypeDx(values);
  if (hasBackgroundAdenoma(values)) head = `${ADENOMA_NAME[values.type] || ADENOMA_NAME.tubularAdenoma} with ${head}`;
  const qualifiers = [DIFF[values.differentiation] || ''].filter(Boolean);
  const clauses = [DEPTH_DX[values.depth] || '', marginDx(values), LVI_DX[values.lvi] || '', MMR_DX[values.mmr] || ''].filter(Boolean);
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
    text = t.micro[grade];
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
  else { const { t, grade } = resolve(s); dxUpper = t.diagnosis[grade]; }
  const dx = upper ? dxUpper : (isInvasive(s) ? sentenceCaseDx(dxUpper) : sentenceCase(dxUpper));
  return `(${part.label}) ${siteText}, ${specimenName(part)}, ${noun} - ${dx}.`;
}

/**
 * Case-level flags for snippet `auto: {flag}` rules. A malignant polyp (polypectomy or
 * EMR / ESD with invasive carcinoma) is flagged as `malignantPolypRisk` when any adverse
 * feature for local excision is present (poor differentiation, lymphovascular invasion,
 * high grade budding, involved margin or clearance under 1 mm), otherwise as
 * `malignantPolypFavourable` when every feature has been assessed and is favourable.
 */
export function flags(parts) {
  const out = [];
  const polyps = parts.map((p) => p.values).filter((v) => isInvasive(v) && !isBiopsyOfMass(v));
  const adverse = (v) => {
    const mm = marginMm(v);
    return v.differentiation === 'Poorly differentiated' || v.lvi === 'Present'
      || v.budding === 'High (Bd3, 10 or more buds)' || v.margin === 'Involved'
      || (v.margin === 'Clear' && mm !== null && mm < 1);
  };
  const favourable = (v) => DIFF[v.differentiation] && v.differentiation !== 'Poorly differentiated'
    && v.lvi === 'Not identified' && BUDDING_MICRO[v.budding] && v.budding !== 'High (Bd3, 10 or more buds)'
    && v.margin === 'Clear' && (marginMm(v) === null || marginMm(v) >= 1);
  if (polyps.some(adverse)) out.push('malignantPolypRisk');
  else if (polyps.length && polyps.every(favourable)) out.push('malignantPolypFavourable');
  return out;
}

export default { specimenName, microscopy, diagnosis, flags };
