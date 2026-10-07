// Shared generator for the cytology suite (kind: cytology).
// One module serves six schemas; behaviour branches on ctx.schema.id.
// House style: preparations named and counted before the microscopy,
// microscopy and ancillary studies in one paragraph, no ROSE wording,
// diagnosis line = "(A) ORGAN, site, procedure - DIAGNOSIS (System category)".

const lower1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
// stripDot here diverges from the house form (full stop only); see generators/_house.js.
const stripDot = (s) => String(s || '').trim().replace(/\.$/, '');
const num = (x) => { const n = Number(x); return Number.isFinite(n) && String(x).trim() !== '' ? n : null; };
const plural = (n, one, many) => (n === 1 ? one : many || `${one}s`);
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const words = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const joinList = (arr) => {
  const a = arr.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
// "a benign follicular nodule" / "lymphocytic thyroiditis": add an article only to countable nouns.
const ARTICLE_NOUNS = /(nodule|cyst|adenoma|tumour|neoplasm|oncocytoma|lipoma|schwannoma|goitre|node|mucocele|population|process|lesion|primary)$/i;
const withArticle = (s) => {
  const t = stripDot(s);
  if (!t) return t;
  const lead = t.split(/[,;(]/)[0].trim();
  if (!ARTICLE_NOUNS.test(lead) || /^(a|an|the)\s/i.test(t)) return lower1(t);
  return `${/^[aeiou]/i.test(t) ? 'an' : 'a'} ${lower1(t)}`;
};

// ---------------------------------------------------------------------------
// Per-template configuration
// ---------------------------------------------------------------------------

const FLUID_IDS = new Set(['urine_cytology', 'effusion_cytology']);

function templateId(ctx) { return ctx?.schema?.id || ''; }

function procedureText(v, id) {
  if (id === 'urine_cytology') return '';
  if (id === 'effusion_cytology') return '';
  if (id === 'cervical_cytology') return v.preparation === 'Conventional smear' ? 'conventional smear' : 'liquid-based cytology';
  const p = v.procedure || 'Fine needle aspiration';
  if (p === 'EBUS-TBNA') return 'EBUS-TBNA';
  if (p === 'EUS-FNA') return 'EUS-FNA';
  return lower1(p);
}

function organLead(v, id) {
  switch (id) {
    case 'thyroid_fna': return 'Thyroid';
    case 'salivary_fna': return 'Salivary gland';
    case 'lymph_node_fna': return 'Lymph node';
    case 'cervical_cytology': return 'Cervix';
    case 'urine_cytology': {
      const t = v.specimenType || 'Voided urine';
      if (/washing/i.test(t)) return t.replace(/\s*\((left|right)\)/i, '');
      if (/ileal conduit/i.test(t)) return 'Ileal conduit urine';
      return 'Urine';
    }
    case 'effusion_cytology': {
      const t = v.specimenType || 'Pleural fluid';
      return t.replace(/\s*\(ascitic\)/i, '');
    }
    default: return 'Specimen';
  }
}

function siteText(v, id) {
  const s = stripDot(v.specimenName);
  if (id === 'urine_cytology') {
    const t = v.specimenType || 'Voided urine';
    const side = (t.match(/\((left|right)\)/i) || [])[1];
    if (/washing/i.test(t)) return side ? side.toLowerCase() : s;
    if (/catheter/i.test(t)) return 'catheterised';
    if (/voided/i.test(t)) return 'voided';
    return s;
  }
  if (id === 'effusion_cytology') {
    const t = v.specimenType || '';
    if (/ascitic/i.test(t)) return s ? `ascitic, ${s}` : 'ascitic';
    return s;
  }
  return s;
}

// "Thyroid, right lobe nodule, fine needle aspiration"
export function specimenName(part, ctx) {
  const v = part.values;
  const id = templateId(ctx);
  const bits = [organLead(v, id), siteText(v, id), procedureText(v, id)].filter(Boolean);
  return bits.join(', ');
}

// ---------------------------------------------------------------------------
// Preparations (macro line + "The smears (…) show" subject)
// ---------------------------------------------------------------------------

function prepCounts(v) {
  const air = num(v.smearsAir) || 0;
  const alc = num(v.smearsAlc) || 0;
  const lbc = v.lbc ? 1 : 0;
  const cs = num(v.cytospin) || 0;
  const cb = num(v.cellBlock) || 0;
  return { air, alc, smears: air + alc, lbc, cs, cb };
}

function prepSubject(v, id) {
  const c = prepCounts(v);
  const parts = [];
  if (id === 'cervical_cytology') {
    return v.preparation === 'Conventional smear' ? 'The smear' : 'The liquid-based preparation';
  }
  if (c.smears) parts.push(`smears (${c.smears} ${plural(c.smears, 'slide')})`);
  if (c.lbc) parts.push('liquid-based preparation (1 slide)');
  if (c.cs) parts.push(`cytospin (${c.cs} ${plural(c.cs, 'slide')})`);
  if (c.cb) parts.push(`cell block (${c.cb} ${plural(c.cb, 'slide')})`);
  if (!parts.length) return 'The preparations';
  return `The ${joinList(parts)}`;
}

function prepVerb(v, id) {
  // singular subject when only one preparation is listed
  if (id === 'cervical_cytology') return { is: 'is', shows: 'shows', are: 'is' };
  const c = prepCounts(v);
  const n = (c.smears ? 1 : 0) + (c.lbc ? 1 : 0) + (c.cs ? 1 : 0) + (c.cb ? 1 : 0);
  return n === 1 ? { is: 'is', shows: 'shows', are: 'is' } : { is: 'are', shows: 'show', are: 'are' };
}

function receivedFluid(v) {
  const vol = stripDot(v.volume);
  const app = lower1(stripDot(v.appearance) || '');
  const noun = app ? `${app} fluid` : 'fluid';
  return vol ? `Received is ${/ml|mL/.test(vol) ? vol : `${vol} ml`} of ${noun}` : `Received is a sample of ${noun}`;
}

export function macro(part, ctx) {
  if (ctx.options && ctx.options.macro === false) return '';
  const v = part.values;
  const id = templateId(ctx);
  const c = prepCounts(v);
  const processed = [];
  if (c.lbc) processed.push('one liquid-based slide');
  if (c.cs) processed.push(`cytospin (${c.cs} ${plural(c.cs, 'slide')})`);
  if (c.cb) processed.push(`cell block (${c.cb} ${plural(c.cb, 'block')})`);
  const processedText = processed.length ? `, processed as ${joinList(processed)}` : '';

  if (id === 'cervical_cytology') {
    const t = v.preparation === 'Conventional smear'
      ? 'Received is one conventional cervical smear.'
      : 'Received is one liquid-based cytology vial, processed as one slide.';
    return `(${part.label}) ${t}`;
  }
  if (FLUID_IDS.has(id)) {
    return `(${part.label}) ${receivedFluid(v)}${processedText}.`;
  }
  // FNA-type specimens
  const received = [];
  if (c.air) received.push(`${words(c.air)} air-dried`);
  if (c.alc) received.push(`${words(c.alc)} alcohol-fixed`);
  let text;
  if (received.length) {
    text = `Received are ${joinList(received)} ${plural(c.smears, 'smear')}`;
    const rinse = stripDot(v.rinse);
    if (rinse && rinse !== 'None') text += ` and a needle rinse (${lower1(rinse)})${processedText}`;
  } else {
    const rinse = stripDot(v.rinse);
    text = `Received is a needle rinse${rinse && rinse !== 'None' ? ` (${lower1(rinse)})` : ''}${processedText}`;
  }
  return `(${part.label}) ${text}.`;
}

// ---------------------------------------------------------------------------
// Adequacy
// ---------------------------------------------------------------------------

function adequacyClause(v, id) {
  const a = v.adequacy || '';
  if (id === 'cervical_cytology') {
    if (a.startsWith('Unsatisfactory')) {
      const r = lower1(stripDot(v.inadequacyReason)) || 'scant cellularity';
      return `is unsatisfactory for evaluation (${r})`;
    }
    if (a === 'Satisfactory, transformation zone component absent') return 'is satisfactory for evaluation, with no endocervical/transformation zone component,';
    if (a === 'Satisfactory, partially obscured') return `is satisfactory for evaluation, partially obscured by ${lower1(stripDot(v.obscuringFactor)) || 'inflammation'},`;
    return 'is satisfactory for evaluation, with an endocervical/transformation zone component present,';
  }
  if (a.startsWith('Inadequate') || a.startsWith('Unsatisfactory') || a.startsWith('Non-diagnostic')) {
    const r = lower1(stripDot(v.inadequacyReason));
    return r ? `${'%V'} inadequate for evaluation (${r})` : `${'%V'} inadequate for evaluation`;
  }
  if (a === 'Adequate, limited by low cellularity' || a === 'Satisfactory, limited by low cellularity') {
    return '%V adequate for evaluation, although limited by low cellularity,';
  }
  return '%V adequate for evaluation';
}

// ---------------------------------------------------------------------------
// Findings (multiselect features -> one clause), per template
// ---------------------------------------------------------------------------

const FEATURE_TEXT = {
  // thyroid
  'Abundant colloid': 'abundant colloid',
  'Scant colloid': 'scant colloid',
  'Watery colloid': 'watery colloid',
  'Follicular cells in flat sheets': 'follicular cells in flat, evenly spaced sheets',
  'Microfollicles': 'follicular cells in crowded microfollicles',
  'Oncocytic (Hurthle) cells': 'oncocytic (Hurthle) cells',
  'Lymphocytes': 'lymphocytes',
  'Haemosiderin-laden macrophages': 'haemosiderin-laden macrophages',
  'Papillary architecture': 'papillary architecture',
  'Nuclear enlargement and pallor': 'nuclear enlargement with pale, powdery chromatin',
  'Nuclear grooves': 'nuclear grooves',
  'Intranuclear pseudoinclusions': 'intranuclear pseudoinclusions',
  'Psammoma bodies': 'psammoma bodies',
  'Multinucleated giant cells': 'multinucleated giant cells',
  'Amyloid': 'amorphous amyloid-like material',
  'Plasmacytoid cells with salt-and-pepper chromatin': 'plasmacytoid cells with salt-and-pepper chromatin',
  'Marked pleomorphism': 'marked nuclear pleomorphism',
  'Necrosis': 'necrosis',
  'Mitoses': 'mitotic figures',
  // salivary
  'Chondromyxoid fibrillary matrix': 'chondromyxoid fibrillary matrix',
  'Myoepithelial cells': 'bland myoepithelial cells',
  'Plasmacytoid cells': 'plasmacytoid cells',
  'Oncocytic cells in flat sheets': 'oncocytic cells in flat sheets',
  'Polymorphous lymphoid background': 'a polymorphous lymphoid background',
  'Mucinous background': 'a mucinous background',
  'Basaloid cells with hyaline globules': 'basaloid cells with acellular hyaline globules',
  'Acinar cells': 'acinar cells',
  'Squamous and intermediate cells': 'squamous and intermediate cells',
  'Mucous cells': 'mucous cells',
  'Cystic debris': 'cystic debris',
  // urine
  'Benign urothelial cells': 'benign urothelial cells',
  'Umbrella cells': 'umbrella cells',
  'Squamous cells': 'squamous cells',
  'Degenerated cells': 'degenerated cells',
  'Inflammatory cells': 'inflammatory cells',
  'Red blood cells': 'red blood cells',
  'Polyomavirus (decoy) cells': 'polyomavirus (decoy) cells',
  'Urothelial tissue fragments': 'urothelial tissue fragments',
  'Fibrovascular cores': 'papillary fragments with fibrovascular cores',
  'Crystals': 'crystals',
  'N:C ratio 0.7 or more': 'a nuclear-to-cytoplasmic ratio of 0.7 or more',
  'Hyperchromasia': 'nuclear hyperchromasia',
  'Irregular nuclear membranes': 'irregular nuclear membranes',
  'Coarse chromatin': 'coarse, clumped chromatin',
  'Necrotic background': 'a necrotic background',
  // effusion
  'Reactive mesothelial cells': 'reactive mesothelial cells',
  'Lymphocyte-predominant': 'a lymphocyte-predominant background',
  'Neutrophils': 'neutrophils',
  'Macrophages': 'macrophages',
  'Eosinophils': 'eosinophils',
  'Blood': 'blood',
  'Three-dimensional clusters': 'three-dimensional clusters',
  'Papillary clusters': 'papillary clusters',
  'Foreign cell population': 'a second, foreign cell population',
  'Signet-ring cells': 'signet-ring cells',
  'Vacuolated cytoplasm': 'vacuolated cytoplasm',
  'Mucin': 'mucin',
  'Prominent nucleoli': 'prominent nucleoli',
  // lymph node
  'Polymorphous lymphoid population': 'a polymorphous population of small and large lymphoid cells',
  'Lymphoglandular bodies': 'lymphoglandular bodies',
  'Tingible-body macrophages': 'tingible-body macrophages',
  'Epithelioid granulomas': 'epithelioid granulomas',
  'Monotonous small lymphoid population': 'a monotonous population of small lymphoid cells',
  'Monotonous medium to large lymphoid population': 'a monotonous population of medium to large lymphoid cells',
  'Cohesive epithelial clusters': 'cohesive clusters of epithelial cells',
  'Keratinisation': 'keratinisation',
  'Anthracotic macrophages': 'anthracotic pigment-laden macrophages',
  'Bronchial epithelial cells and cartilage': 'bronchial epithelial cells and cartilage (procedural contaminant)',
  'Suppurative inflammation': 'suppurative inflammation',
  // cervical organisms / non-neoplastic
  'Trichomonas vaginalis': 'Trichomonas vaginalis',
  'Fungal organisms consistent with Candida': 'fungal organisms morphologically consistent with Candida species',
  'Shift in flora suggestive of bacterial vaginosis': 'a shift in flora suggestive of bacterial vaginosis',
  'Actinomyces': 'bacteria morphologically consistent with Actinomyces species',
  'Herpes simplex virus changes': 'cellular changes consistent with herpes simplex virus',
  'Cytomegalovirus changes': 'cellular changes consistent with cytomegalovirus',
  'Reactive changes (inflammation)': 'reactive cellular changes associated with inflammation',
  'Reactive changes (repair)': 'reactive cellular changes associated with repair',
  'Lymphocytic (follicular) cervicitis': 'lymphocytic (follicular) cervicitis',
  'Reactive changes (radiation)': 'reactive cellular changes associated with radiation',
  'Reactive changes (IUD)': 'reactive cellular changes associated with an intrauterine device',
  'Atrophy': 'atrophy',
  'Keratotic changes': 'keratotic changes',
  'Tubal metaplasia': 'tubal metaplasia',
  'Endometrial cells (45 or older)': 'endometrial cells in a woman aged 45 or older',
  'Glandular cells post hysterectomy': 'benign glandular cells following hysterectomy',
  'Koilocytes': 'koilocytes',
};

// Nuclear / cytoplasmic features are grouped as "<cells> showing X, Y and Z" after the
// background and architectural features, so the sentence reads as a description of cells.
const NUCLEAR_FEATS = new Set(['Nuclear enlargement and pallor', 'Nuclear grooves', 'Intranuclear pseudoinclusions', 'Marked pleomorphism', 'Mitoses', 'N:C ratio 0.7 or more', 'Hyperchromasia', 'Irregular nuclear membranes', 'Coarse chromatin', 'Prominent nucleoli', 'Vacuolated cytoplasm', 'Plasmacytoid cells with salt-and-pepper chromatin']);
const CELL_NOUN = { thyroid_fna: 'follicular cells', urine_cytology: 'atypical urothelial cells', effusion_cytology: 'atypical cells', lymph_node_fna: 'atypical cells', salivary_fna: 'epithelial cells' };

function featureClause(v, id) {
  const all = arr(v.features);
  const plain = all.filter((f) => !NUCLEAR_FEATS.has(f)).map((f) => FEATURE_TEXT[f] || lower1(stripDot(f))).filter(Boolean);
  const nuclear = all.filter((f) => NUCLEAR_FEATS.has(f)).map((f) => FEATURE_TEXT[f] || lower1(stripDot(f)));
  if (nuclear.length) {
    const noun = CELL_NOUN[id] || 'the cells';
    // "follicular cells showing …" reads as a list item after e.g. "scant colloid and"
    plain.push(`${noun} with ${joinList(nuclear)}`);
  }
  return joinList(plain);
}

// ---------------------------------------------------------------------------
// Category tables
// ---------------------------------------------------------------------------

export const BETHESDA = {
  'I. Nondiagnostic': { roman: 'I', name: 'Nondiagnostic', rom: '13% (5-20%)' },
  'II. Benign': { roman: 'II', name: 'Benign', rom: '4% (2-7%)' },
  'III. Atypia of undetermined significance': { roman: 'III', name: 'Atypia of undetermined significance', rom: '22% (13-30%)' },
  'IV. Follicular neoplasm': { roman: 'IV', name: 'Follicular neoplasm', rom: '30% (23-34%)' },
  'V. Suspicious for malignancy': { roman: 'V', name: 'Suspicious for malignancy', rom: '74% (67-83%)' },
  'VI. Malignant': { roman: 'VI', name: 'Malignant', rom: '97% (97-100%)' },
};

export const MILAN = {
  'I. Non-diagnostic': { roman: 'I', name: 'Non-diagnostic', rom: '15%' },
  'II. Non-neoplastic': { roman: 'II', name: 'Non-neoplastic', rom: '11%' },
  'III. Atypia of undetermined significance': { roman: 'III', name: 'Atypia of undetermined significance', rom: '30%' },
  'IVa. Benign neoplasm': { roman: 'IVa', name: 'Benign neoplasm', rom: 'less than 3%' },
  'IVb. Salivary gland neoplasm of uncertain malignant potential': { roman: 'IVb', name: 'SUMP', rom: '35%' },
  'V. Suspicious for malignancy': { roman: 'V', name: 'Suspicious for malignancy', rom: '83%' },
  'VI. Malignant': { roman: 'VI', name: 'Malignant', rom: '98%' },
};

export const PARIS = {
  'Non-diagnostic / unsatisfactory': { abbr: 'ND', name: 'Non-diagnostic / unsatisfactory' },
  'Negative for high grade urothelial carcinoma': { abbr: 'NHGUC', name: 'Negative for high grade urothelial carcinoma' },
  'Atypical urothelial cells': { abbr: 'AUC', name: 'Atypical urothelial cells' },
  'Suspicious for high grade urothelial carcinoma': { abbr: 'SHGUC', name: 'Suspicious for high grade urothelial carcinoma' },
  'High grade urothelial carcinoma': { abbr: 'HGUC', name: 'High grade urothelial carcinoma' },
  'Other malignancy': { abbr: 'Other', name: 'Other malignancy' },
};

export const TIS = {
  'Non-diagnostic': { abbr: 'ND', name: 'Non-diagnostic', rom: '17%' },
  'Negative for malignancy': { abbr: 'NFM', name: 'Negative for malignancy', rom: '21%' },
  'Atypia of undetermined significance': { abbr: 'AUS', name: 'Atypia of undetermined significance', rom: '66%' },
  'Suspicious for malignancy': { abbr: 'SFM', name: 'Suspicious for malignancy', rom: '82%' },
  'Malignant': { abbr: 'MAL', name: 'Malignant', rom: '99%' },
};

export const SYDNEY = {
  'L1. Inadequate / non-diagnostic': { code: 'L1', name: 'Inadequate / non-diagnostic' },
  'L2. Benign': { code: 'L2', name: 'Benign' },
  'L3. Atypical cells of undetermined significance': { code: 'L3', name: 'Atypical cells of undetermined significance' },
  'L4. Suspicious for malignancy': { code: 'L4', name: 'Suspicious for malignancy' },
  'L5. Malignant': { code: 'L5', name: 'Malignant' },
};

export const CERVICAL = [
  'Negative for intraepithelial lesion or malignancy',
  'Atypical squamous cells of undetermined significance (ASC-US)',
  'Atypical squamous cells, cannot exclude HSIL (ASC-H)',
  'Low grade squamous intraepithelial lesion (LSIL)',
  'High grade squamous intraepithelial lesion (HSIL)',
  'HSIL with features suspicious for invasion',
  'Squamous cell carcinoma',
  'Atypical glandular cells (AGC)',
  'Atypical glandular cells, favour neoplastic',
  'Endocervical adenocarcinoma in situ (AIS)',
  'Adenocarcinoma',
  'Other malignant neoplasm',
];

const CERVICAL_ABBR = {
  'Negative for intraepithelial lesion or malignancy': 'NILM',
  'Atypical squamous cells of undetermined significance (ASC-US)': 'ASC-US',
  'Atypical squamous cells, cannot exclude HSIL (ASC-H)': 'ASC-H',
  'Low grade squamous intraepithelial lesion (LSIL)': 'LSIL',
  'High grade squamous intraepithelial lesion (HSIL)': 'HSIL',
  'HSIL with features suspicious for invasion': 'HSIL',
  'Squamous cell carcinoma': 'SCC',
  'Atypical glandular cells (AGC)': 'AGC',
  'Atypical glandular cells, favour neoplastic': 'AGC, favour neoplastic',
  'Endocervical adenocarcinoma in situ (AIS)': 'AIS',
  'Adenocarcinoma': 'Adenocarcinoma',
  'Other malignant neoplasm': 'Other malignant neoplasm',
};

// ---------------------------------------------------------------------------
// Cervical cytology: cell descriptions and findings (Bethesda 2014)
// ---------------------------------------------------------------------------
// Each abnormal category has its own tick list in the schema (ascusFeatures to adenoFeatures). The
// ticked items print after the adequacy sentence: squamous as one sentence ("Scattered small immature
// squamous cells, present singly and in syncytial aggregates, show a high nuclear-to-cytoplasmic
// ratio, ..."), glandular as two ("Atypical endocervical cells are present in crowded sheets and
// strips. The cells show nuclear overlap, ..."). Item keys: `arch` where the cells lie, `with` an
// architectural detail after it, `cyto` cytoplasm (printed first), `nuc` nuclear features (after
// "with" when cytoplasm is named), `noun` a replacement cell noun, `bg` the background, `extra` a
// sentence of its own. Print order follows the key order below, not the order of ticking. Criteria
// and thresholds stay in the field help and the reference galleries (docs/new-template-brief.md
// §3.2). A list missing from a draft saved before 7 October 2026 prints nothing, as the form then
// shows nothing ticked, and Checks asks for a description.
const CX_EXTENT = ['Occasional', 'A few', 'Scattered', 'Numerous'];
const CX_HSIL = {
  field: 'hsilFeatures', noun: 'small immature squamous cells',
  items: {
    'Single cells': { arch: 'singly' },
    'Sheets': { arch: 'in sheets' },
    'Syncytial aggregates': { arch: 'in syncytial aggregates' },
    'Keratinised cytoplasm': { cyto: 'dense orangeophilic cytoplasm', noun: 'small squamous cells' },
    'High N:C ratio': { nuc: 'a high nuclear-to-cytoplasmic ratio' },
    'Hyperchromasia': { nuc: 'hyperchromasia' },
    'Irregular nuclear membranes': { nuc: 'irregular nuclear membranes' },
    'Coarse chromatin': { nuc: 'coarsely granular chromatin' },
  },
};
const CX_SQUAMOUS = {
  [CERVICAL[1]]: {
    field: 'ascusFeatures', noun: 'atypical squamous cells',
    items: {
      'Ill-defined perinuclear halos': { cyto: 'ill-defined perinuclear halos' },
      'Mild nuclear enlargement': { nuc: 'mild nuclear enlargement' },
      'Slightly raised N:C ratio': { nuc: 'a slightly raised nuclear-to-cytoplasmic ratio' },
      'Mild hyperchromasia': { nuc: 'mild hyperchromasia' },
      'Slightly irregular nuclear outlines': { nuc: 'slightly irregular nuclear outlines' },
      'Binucleation': { nuc: 'occasional binucleation' },
      'Atypical parakeratosis': { extra: 'Atypical parakeratotic cells with dense orangeophilic cytoplasm are also present.' },
    },
  },
  [CERVICAL[2]]: {
    field: 'aschFeatures', noun: 'atypical squamous cells',
    items: {
      'Immature metaplastic-type cells': { noun: 'small immature squamous cells of metaplastic type' },
      'Single cells': { arch: 'singly' },
      'Small groups': { arch: 'in small groups' },
      'Crowded sheets': { arch: 'in crowded sheets' },
      'High N:C ratio': { nuc: 'a high nuclear-to-cytoplasmic ratio' },
      'Hyperchromasia': { nuc: 'hyperchromasia' },
      'Irregular nuclear outlines': { nuc: 'irregular nuclear outlines' },
    },
  },
  [CERVICAL[3]]: {
    field: 'lsilFeatures', noun: 'squamous cells of superficial and intermediate type',
    items: {
      'Koilocytosis': { cyto: 'sharply defined perinuclear cavitation (koilocytosis)' },
      'Dense orangeophilic cytoplasm': { cyto: 'dense orangeophilic cytoplasm' },
      'Nuclear enlargement': { nuc: 'nuclear enlargement' },
      'Hyperchromasia': { nuc: 'hyperchromasia' },
      'Irregular nuclear outlines': { nuc: 'slightly irregular nuclear outlines' },
      'Binucleation': { nuc: 'binucleation' },
      'Smudged chromatin': { nuc: 'smudged chromatin' },
    },
  },
  [CERVICAL[4]]: CX_HSIL,
  [CERVICAL[5]]: CX_HSIL,
  [CERVICAL[6]]: {
    field: 'sccFeatures', noun: 'malignant squamous cells',
    items: {
      'Single cells': { arch: 'singly' },
      'Syncytial aggregates': { arch: 'in syncytial aggregates' },
      'Bizarre (caudate, spindle) shapes': { cyto: 'bizarre (caudate and spindle) shapes' },
      'Keratinised cytoplasm': { cyto: 'dense orangeophilic (keratinised) cytoplasm' },
      'High N:C ratio': { nuc: 'a high nuclear-to-cytoplasmic ratio' },
      'Hyperchromatic opaque nuclei': { nuc: 'hyperchromatic opaque nuclei' },
      'Coarse chromatin': { nuc: 'coarsely clumped chromatin' },
      'Prominent nucleoli': { nuc: 'prominent nucleoli' },
      'Tumour diathesis': { extra: 'The background shows a granular necrotic (tumour) diathesis.' },
    },
  },
};
// HSIL with features suspicious for invasion: one sentence after the HSIL description.
const CX_INVASION = {
  'Tumour diathesis': { np: 'a granular necrotic (tumour) diathesis' },
  'Bizarre keratinised cells': { np: 'bizarre keratinised cells' },
  'Prominent nucleoli': { cell: 'prominent nucleoli' },
  'Irregular chromatin distribution': { cell: 'irregularly distributed chromatin' },
};
const CX_GLANDULAR = {
  agc: {
    field: 'agcFeatures', noun: 'Atypical glandular cells',
    items: {
      'Crowded sheets and strips': { arch: 'in crowded sheets and strips' },
      'Small groups': { arch: 'in small groups' },
      'Vacuolated cytoplasm': { cyto: 'vacuolated cytoplasm' },
      'Nuclear overlap': { nuc: 'nuclear overlap' },
      'Pseudostratification': { nuc: 'focal pseudostratification' },
      'Enlarged nuclei': { nuc: 'enlarged nuclei' },
      'Mild hyperchromasia': { nuc: 'mild hyperchromasia' },
      'Small nucleoli': { nuc: 'small nucleoli' },
      'Mitotic figures': { nuc: 'occasional mitotic figures' },
    },
  },
  agcEndometrial: {
    field: 'agcEndometrialFeatures', noun: 'Atypical endometrial cells',
    items: {
      'Small groups': { arch: 'in small groups' },
      'Vacuolated cytoplasm': { cyto: 'scant, vacuolated cytoplasm' },
      'Ill-defined cell borders': { cyto: 'ill-defined cell borders' },
      'Enlarged nuclei': { nuc: 'slightly enlarged nuclei' },
      'Mild hyperchromasia': { nuc: 'mild hyperchromasia' },
      'Small nucleoli': { nuc: 'small nucleoli' },
    },
  },
  ais: {
    field: 'aisFeatures', noun: 'Abnormal endocervical cells',
    items: {
      'Crowded sheets and strips': { arch: 'in crowded sheets and strips' },
      'Feathering': { with: 'peripheral feathering' },
      'Rosettes': { with: 'rosettes' },
      'Elongated pseudostratified nuclei': { nuc: 'elongated pseudostratified nuclei' },
      'Hyperchromasia': { nuc: 'hyperchromasia' },
      'Coarse chromatin': { nuc: 'coarsely granular chromatin' },
      'Mitotic figures': { nuc: 'mitotic figures' },
      'Apoptotic bodies': { nuc: 'apoptotic bodies' },
      'Clean background': { extra: 'The background is clean.' },
    },
  },
  adeno: {
    field: 'adenoFeatures', noun: 'Malignant glandular cells',
    items: {
      'Single cells': { arch: 'singly' },
      'Three-dimensional clusters': { arch: 'in three-dimensional clusters' },
      'Sheets and strips': { arch: 'in sheets and strips' },
      'Papillary groups': { arch: 'in papillary groups' },
      'Vacuolated cytoplasm': { cyto: 'vacuolated cytoplasm' },
      'Enlarged pleomorphic nuclei': { nuc: 'enlarged pleomorphic nuclei' },
      'Irregular chromatin with clearing': { nuc: 'irregularly distributed chromatin with parachromatin clearing' },
      'Prominent nucleoli': { nuc: 'prominent nucleoli' },
      'Tumour diathesis': { bg: 'a granular necrotic (tumour) diathesis' },
      'Watery diathesis': { bg: 'a finely granular, watery diathesis' },
      'Psammoma bodies': { extra: 'Psammoma bodies are present.' },
    },
  },
};
// Organisms and non-neoplastic findings, one sentence each, in this order. 'Koilocytes' survives
// only on drafts saved before 7 October 2026; under LSIL it gives way to the Koilocytosis tick.
const CX_FINDINGS = {
  'Trichomonas vaginalis': 'Trichomonas vaginalis is present, as pear-shaped cyanophilic organisms with eccentric nuclei and eosinophilic cytoplasmic granules.',
  'Fungal organisms consistent with Candida': 'Fungal pseudohyphae and budding yeasts are present, morphologically consistent with Candida species.',
  'Shift in flora suggestive of bacterial vaginosis': 'There is a shift in flora suggestive of bacterial vaginosis, with a filmy background of coccobacilli and clue cells.',
  'Actinomyces': 'Bacteria morphologically consistent with Actinomyces species are present, as tangled clumps of filamentous organisms (cotton-ball clusters).',
  'Herpes simplex virus changes': 'Cellular changes consistent with herpes simplex virus are present, with multinucleated cells showing nuclear moulding, chromatin margination and ground-glass nuclei.',
  'Cytomegalovirus changes': 'Cellular changes consistent with cytomegalovirus are present, with enlarged cells bearing a large intranuclear inclusion surrounded by a clear halo.',
  'Reactive changes (inflammation)': 'Reactive cellular changes associated with inflammation are seen, with mild nuclear enlargement, smooth nuclear outlines, fine chromatin and small nucleoli.',
  'Reactive changes (repair)': 'Reactive cellular changes associated with repair are seen, as flat cohesive sheets of cells with streaming nuclei, distinct cell borders and prominent nucleoli.',
  'Lymphocytic (follicular) cervicitis': 'Lymphocytic (follicular) cervicitis is present, with a polymorphous population of lymphoid cells and tingible-body macrophages.',
  'Reactive changes (radiation)': 'Reactive cellular changes associated with radiation are seen, with cell enlargement, vacuolated or polychromatic cytoplasm and multinucleation, without a raised nuclear-to-cytoplasmic ratio.',
  'Reactive changes (IUD)': 'Reactive cellular changes associated with an intrauterine device are seen, with small groups of vacuolated glandular cells and occasional single cells with a raised nuclear-to-cytoplasmic ratio.',
  'Atrophy': 'The squamous cells are mainly parabasal cells in flat sheets with preserved nuclear polarity, in keeping with atrophy.',
  'Keratotic changes': 'Keratotic changes are seen, with anucleate squames and small parakeratotic cells bearing dense orangeophilic cytoplasm and pyknotic nuclei.',
  'Tubal metaplasia': 'Tubal metaplasia is present, as columnar cells with cilia and terminal bars.',
  'Endometrial cells (45 or older)': 'Benign-appearing endometrial cells, in small, tight three-dimensional clusters, are present in a woman aged 45 or older.',
  'Glandular cells post hysterectomy': 'Benign-appearing glandular cells are present in this post-hysterectomy sample.',
  'Koilocytes': 'Koilocytes are present.',
};

// Tick-list configuration for the selected interpretation (and glandular origin), or null.
function cxConfig(v) {
  const i = v.interpretation || CERVICAL[0];
  if (CX_SQUAMOUS[i]) return { kind: 'squamous', cfg: CX_SQUAMOUS[i] };
  if (i === CERVICAL[7] || i === CERVICAL[8]) {
    if (v.glandularOrigin === 'Endometrial') return { kind: 'glandular', cfg: CX_GLANDULAR.agcEndometrial };
    const noun = v.glandularOrigin === 'Endocervical' ? 'Atypical endocervical cells' : 'Atypical glandular cells';
    return { kind: 'glandular', cfg: { ...CX_GLANDULAR.agc, noun } };
  }
  if (i === CERVICAL[9]) return { kind: 'glandular', cfg: CX_GLANDULAR.ais };
  if (i === CERVICAL[10]) return { kind: 'glandular', cfg: CX_GLANDULAR.adeno };
  return null;
}

function cxParts(cfg, v) {
  const list = Array.isArray(v[cfg.field]) ? v[cfg.field] : [];
  const on = Object.keys(cfg.items).filter((k) => list.includes(k)).map((k) => cfg.items[k]);
  const get = (key) => on.map((x) => x[key]).filter(Boolean);
  return { arch: get('arch'), with: get('with'), cyto: get('cyto'), nuc: get('nuc'), bg: get('bg'), extra: get('extra'), noun: get('noun').pop() || cfg.noun };
}

const cxCellFeatures = (p) => (p.cyto.length && p.nuc.length ? `${joinList(p.cyto)}, with ${joinList(p.nuc)}` : joinList([...p.cyto, ...p.nuc]));

function cxSquamous(cfg, v) {
  const p = cxParts(cfg, v);
  const feats = cxCellFeatures(p);
  const arch = joinList(p.arch);
  // No extent word when the draft has none (saved before the field existed): print what the form shows.
  const cells = CX_EXTENT.includes(v.extent) ? `${v.extent} ${p.noun}` : `${p.noun.charAt(0).toUpperCase()}${p.noun.slice(1)}`;
  const out = [];
  if (arch && feats) out.push(`${cells}, present ${arch}, show ${feats}.`);
  else if (feats) out.push(`${cells} show ${feats}.`);
  else if (arch) out.push(`${cells} are present ${arch}.`);
  for (const e of p.extra) out.push(out.length ? e : e.replace(' also ', ' '));
  return out;
}

function cxInvasion(v, also) {
  const list = Array.isArray(v.invasionFeatures) ? v.invasionFeatures : [];
  const on = Object.keys(CX_INVASION).filter((k) => list.includes(k)).map((k) => CX_INVASION[k]);
  const items = on.map((x) => x.np).filter(Boolean);
  const cells = on.map((x) => x.cell).filter(Boolean);
  if (cells.length) items.push(`cells with ${joinList(cells)}`);
  if (!items.length) return '';
  return `There ${/^an? /.test(items[0]) ? 'is' : 'are'}${also ? ' also' : ''} ${joinList(items)}.`;
}

function cxGlandular(cfg, v) {
  const p = cxParts(cfg, v);
  const feats = cxCellFeatures(p);
  const withText = p.with.length ? `with ${joinList(p.with)}` : '';
  const where = p.arch.length ? `${joinList(p.arch)}${withText ? `, ${withText}` : ''}` : withText ? `in groups ${withText}` : '';
  const out = [];
  if (where) {
    out.push(`${p.noun} are present ${where}.`);
    if (feats) out.push(`The cells show ${feats}.`);
  } else if (feats) out.push(`${p.noun} show ${feats}.`);
  if (p.bg.length) out.push(`The background shows ${joinList(p.bg)}.`);
  out.push(...p.extra);
  return out;
}

// Sentences describing the abnormal cells for the selected interpretation ([] when nothing is ticked).
export function cervicalDescription(v) {
  if ((v.adequacy || '').startsWith('Unsatisfactory')) return [];
  const c = cxConfig(v);
  if (!c) return [];
  if (c.kind === 'glandular') return cxGlandular(c.cfg, v);
  const out = cxSquamous(c.cfg, v);
  if (v.interpretation === CERVICAL[5]) {
    const inv = cxInvasion(v, out.length > 0);
    if (inv) out.push(inv);
  }
  return out;
}

function cervicalFindings(v) {
  const feats = arr(v.features);
  const lsilKoilo = v.interpretation === CERVICAL[3] && arr(v.lsilFeatures).includes('Koilocytosis');
  const known = Object.keys(CX_FINDINGS).filter((f) => feats.includes(f) && !(f === 'Koilocytes' && lsilKoilo)).map((f) => CX_FINDINGS[f]);
  const other = feats.filter((f) => !CX_FINDINGS[f] && stripDot(f)).map((f) => `${stripDot(f)}.`);
  return [...known, ...other];
}

function isNonDiagnostic(v, id) {
  const c = v.category || '';
  if (id === 'cervical_cytology') return (v.adequacy || '').startsWith('Unsatisfactory');
  return /^I\.\s|^L1\.|^Non-diagnostic/.test(c);
}

function categoryTag(v, id) {
  const c = v.category || '';
  switch (id) {
    case 'thyroid_fna': { const e = BETHESDA[c]; return e ? `Bethesda ${e.roman}: ${e.name}` : ''; }
    case 'salivary_fna': { const e = MILAN[c]; return e ? `Milan ${e.roman}: ${e.name}` : ''; }
    case 'urine_cytology': { const e = PARIS[c]; return e ? `Paris System: ${e.abbr}` : ''; }
    case 'effusion_cytology': { const e = TIS[c]; return e ? `TIS: ${e.name}` : ''; }
    case 'lymph_node_fna': { const e = SYDNEY[c]; return e ? `Sydney System ${e.code}: ${e.name}` : ''; }
    case 'cervical_cytology': { const a = CERVICAL_ABBR[v.interpretation]; return a ? `Bethesda 2014: ${a}` : ''; }
    default: return '';
  }
}

// ---------------------------------------------------------------------------
// Category-specific interpretation sentence (closes the microscopy paragraph)
// ---------------------------------------------------------------------------

function interpretation(v, id) {
  const c = v.category || '';
  const sub = (k) => withArticle(v[k]);
  switch (id) {
    case 'thyroid_fna': {
      if (c.startsWith('II.')) return `Features are those of ${sub('benignDx') || 'a benign follicular nodule'}.`;
      if (c.startsWith('III.')) return `The findings are insufficient in degree or extent for a more definitive interpretation and are classified as atypia of undetermined significance${v.ausSubtype ? ` (${sub('ausSubtype')})` : ''}.`;
      if (c.startsWith('IV.')) return `Features are those of ${sub('fnSubtype') || 'a follicular neoplasm'}.`;
      if (c.startsWith('V.')) return `Features are suspicious for ${sub('suspSubtype') || 'malignancy'}, but fall short of a definitive diagnosis.`;
      if (c.startsWith('VI.')) return `Features are those of ${sub('malignantDx') || 'malignancy'}.`;
      return '';
    }
    case 'salivary_fna': {
      if (c.startsWith('II.')) return `Features are those of ${sub('nonNeoplasticDx') || 'a non-neoplastic process'}.`;
      if (c.startsWith('III.')) return 'The findings are insufficient in degree or extent for a more definitive interpretation and are classified as atypia of undetermined significance.';
      if (c.startsWith('IVa.')) return `Features are those of ${sub('benignNeoplasmDx') || 'a benign neoplasm'}.`;
      if (c.startsWith('IVb.')) return `Features are those of ${sub('sumpDx') || 'a salivary gland neoplasm of uncertain malignant potential'}; definitive classification requires histological examination.`;
      if (c.startsWith('V.')) return `Features are suspicious for ${sub('suspDx') || 'malignancy'}, but fall short of a definitive diagnosis.`;
      if (c.startsWith('VI.')) return `Features are those of ${sub('malignantDx') || 'malignancy'}.`;
      return '';
    }
    case 'urine_cytology': {
      if (c === 'Negative for high grade urothelial carcinoma') {
        return v.lgun ? 'Papillary urothelial fragments with fibrovascular cores are present, raising the possibility of a low grade urothelial neoplasm; there is no evidence of high grade urothelial carcinoma.' : 'There is no evidence of high grade urothelial carcinoma.';
      }
      if (c === 'Atypical urothelial cells') return 'The atypical cells fall short of the criteria for suspicious for high grade urothelial carcinoma.';
      if (c === 'Suspicious for high grade urothelial carcinoma') return 'The number of abnormal cells falls short of the threshold for a definitive diagnosis of high grade urothelial carcinoma.';
      if (c === 'High grade urothelial carcinoma') return 'Features are those of high grade urothelial carcinoma.';
      if (c === 'Other malignancy') return `Features are those of ${sub('otherMalignancy') || 'a malignant neoplasm'}.`;
      return '';
    }
    case 'effusion_cytology': {
      if (c === 'Negative for malignancy') return 'There is no evidence of malignancy.';
      if (c === 'Atypia of undetermined significance') return 'The atypical cells are insufficient in number or degree for a more definitive interpretation.';
      if (c === 'Suspicious for malignancy') return `Features are suspicious for ${sub('malignantType') || 'malignancy'}, but fall short of a definitive diagnosis.`;
      if (c === 'Malignant') return `Features are those of ${sub('malignantType') || 'malignancy'}${v.favourPrimary && v.favourPrimary !== 'Not stated' ? `, ${lower1(v.favourPrimary)}` : ''}.`;
      return '';
    }
    case 'lymph_node_fna': {
      if (c.startsWith('L2.')) return `Features are those of ${sub('benignDx') || 'a reactive lymph node'}; there is no evidence of malignancy.`;
      if (c.startsWith('L3.')) return 'The atypical cells are insufficient in number or degree for a more definitive interpretation.';
      if (c.startsWith('L4.')) return `Features are suspicious for ${sub('suspDx') || 'malignancy'}, but fall short of a definitive diagnosis.`;
      if (c.startsWith('L5.')) return `Features are those of ${sub('malignantDx') || 'malignancy'}${v.favourPrimary && v.favourPrimary !== 'Not stated' ? `, ${lower1(v.favourPrimary)}` : ''}.`;
      return '';
    }
    case 'cervical_cytology': {
      const i = v.interpretation || CERVICAL[0];
      const o = v.glandularOrigin && v.glandularOrigin !== 'Not otherwise specified' ? v.glandularOrigin : '';
      // With the cells described, the closing sentence states where the category sits; without a
      // description it names the cells instead (the wording before Phase 55).
      const described = cervicalDescription(v).length > 0;
      const shortOf = o === 'Endometrial' || o === 'Extrauterine' ? 'adenocarcinoma' : `${o === 'Endocervical' ? 'endocervical ' : ''}adenocarcinoma in situ or invasive adenocarcinoma`;
      if (i === CERVICAL[0]) return 'There is no intraepithelial lesion or malignancy.';
      if (/ASC-US/.test(i)) return described ? 'The changes are insufficient in degree or extent for a definitive interpretation of a squamous intraepithelial lesion.' : 'Atypical squamous cells of undetermined significance are present.';
      if (/ASC-H/.test(i)) return described ? 'The changes are insufficient for a definitive interpretation, but a high grade squamous intraepithelial lesion cannot be excluded.' : 'Atypical squamous cells are present in which a high grade squamous intraepithelial lesion cannot be excluded.';
      if (/^Low grade/.test(i)) return 'Features are those of a low grade squamous intraepithelial lesion.';
      if (/^High grade/.test(i)) return 'Features are those of a high grade squamous intraepithelial lesion.';
      if (/suspicious for invasion/.test(i)) return 'Features are those of a high grade squamous intraepithelial lesion with features suspicious for invasion.';
      if (i === 'Squamous cell carcinoma') return 'Features are those of squamous cell carcinoma.';
      if (/favour neoplastic/.test(i)) return described ? `The features are suspicious for, but fall short of, ${shortOf}.` : `Atypical glandular cells${o ? ` (${lower1(o)})` : ''} are present, favouring a neoplastic process.`;
      if (/^Atypical glandular/.test(i)) return described ? `The atypia exceeds reactive change but falls short of ${shortOf}.` : `Atypical glandular cells${o ? ` (${lower1(o)})` : ''} are present.`;
      if (/AIS/.test(i)) return 'Features are those of endocervical adenocarcinoma in situ.';
      if (i === 'Adenocarcinoma') return `Features are those of ${o ? `${lower1(o)} ` : ''}adenocarcinoma.`;
      return 'Features are those of a malignant neoplasm.';
    }
    default: return '';
  }
}

// ---------------------------------------------------------------------------
// Microscopy
// ---------------------------------------------------------------------------

export function microscopy(part, ctx) {
  const v = part.values;
  const id = templateId(ctx);
  const subject = prepSubject(v, id);
  const verb = prepVerb(v, id);
  const adequacy = adequacyClause(v, id).replace('%V', verb.are);
  const feats = featureClause(v, id);
  const nd = isNonDiagnostic(v, id);

  const sentences = [];
  if (nd) {
    // Inadequate: adequacy sentence, then what little is present, then stop.
    sentences.push(`${subject} ${adequacy}${feats ? `, showing only ${feats}` : ''}.`);
  } else if (id === 'cervical_cytology') {
    // Adequacy, then the abnormal cells, then each organism or non-neoplastic finding.
    sentences.push(`${`${subject} ${adequacy}`.replace(/,$/, '')}.`);
    sentences.push(...cervicalDescription(v), ...cervicalFindings(v));
  } else {
    let first = `${subject} ${adequacy}`;
    if (feats) first += ` and ${verb.shows} ${feats}`;
    sentences.push(`${first.replace(/,$/, '')}.`);
  }
  const extra = stripDot(v.additionalFindings);
  if (extra) sentences.push(`${extra}.`);
  const anc = stripDot(v.ancillary);
  if (anc) sentences.push(`${anc}.`);
  if (id === 'cervical_cytology') {
    const hpv = stripDot(v.hpv);
    if (hpv && hpv !== 'Not performed') sentences.push(`HPV testing: ${lower1(hpv)}.`);
  }
  if (!nd) {
    const interp = interpretation(v, id);
    if (interp) sentences.push(interp);
  }
  return `(${part.label}) ${sentences.join(' ')}`;
}

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

function diagnosisText(v, id) {
  const c = v.category || '';
  const up = (s) => stripDot(s).toUpperCase();
  const tag = categoryTag(v, id);
  const withTag = (t) => (tag ? `${stripDot(t).toUpperCase()} (${tag})` : stripDot(t).toUpperCase());
  const ndReason = lower1(stripDot(v.inadequacyReason));
  switch (id) {
    case 'thyroid_fna': {
      if (c.startsWith('I.')) return withTag(`NONDIAGNOSTIC${ndReason ? `, ${ndReason}` : ''}`);
      if (c.startsWith('II.')) return withTag(v.benignDx || 'Benign follicular nodule');
      if (c.startsWith('III.')) return withTag(`ATYPIA OF UNDETERMINED SIGNIFICANCE${v.ausSubtype ? `, ${lower1(stripDot(v.ausSubtype))}` : ''}`);
      if (c.startsWith('IV.')) return withTag(up(v.fnSubtype || 'Follicular neoplasm'));
      if (c.startsWith('V.')) return withTag(`SUSPICIOUS FOR ${up(v.suspSubtype || 'malignancy')}`);
      if (c.startsWith('VI.')) return withTag(v.malignantDx || 'Malignant');
      return 'SEE MICROSCOPY';
    }
    case 'salivary_fna': {
      if (c.startsWith('I.')) return withTag(`NON-DIAGNOSTIC${ndReason ? `, ${ndReason}` : ''}`);
      if (c.startsWith('II.')) return withTag(v.nonNeoplasticDx || 'Non-neoplastic');
      if (c.startsWith('III.')) return withTag('ATYPIA OF UNDETERMINED SIGNIFICANCE');
      if (c.startsWith('IVa.')) return withTag(v.benignNeoplasmDx || 'Benign neoplasm');
      if (c.startsWith('IVb.')) return withTag(`${v.sumpDx || 'Salivary gland neoplasm'} of uncertain malignant potential`);
      if (c.startsWith('V.')) return withTag(`SUSPICIOUS FOR ${up(v.suspDx || 'malignancy')}`);
      if (c.startsWith('VI.')) return withTag(v.malignantDx || 'Malignant');
      return 'SEE MICROSCOPY';
    }
    case 'urine_cytology': {
      if (c === 'Non-diagnostic / unsatisfactory') return withTag(`NON-DIAGNOSTIC${ndReason ? `, ${ndReason}` : ''}`);
      if (c === 'Negative for high grade urothelial carcinoma') return withTag(`NEGATIVE FOR HIGH GRADE UROTHELIAL CARCINOMA${v.lgun ? '; low grade urothelial neoplasm cannot be excluded' : ''}`);
      if (c === 'Atypical urothelial cells') return withTag('ATYPICAL UROTHELIAL CELLS');
      if (c === 'Suspicious for high grade urothelial carcinoma') return withTag('SUSPICIOUS FOR HIGH GRADE UROTHELIAL CARCINOMA');
      if (c === 'High grade urothelial carcinoma') return withTag('HIGH GRADE UROTHELIAL CARCINOMA');
      if (c === 'Other malignancy') return withTag(v.otherMalignancy || 'Malignant');
      return 'SEE MICROSCOPY';
    }
    case 'effusion_cytology': {
      const fav = v.favourPrimary && v.favourPrimary !== 'Not stated' ? `, ${lower1(v.favourPrimary)}` : '';
      if (c === 'Non-diagnostic') return withTag(`NON-DIAGNOSTIC${ndReason ? `, ${ndReason}` : ''}`);
      if (c === 'Negative for malignancy') return withTag('NO EVIDENCE OF MALIGNANCY');
      if (c === 'Atypia of undetermined significance') return withTag('ATYPICAL CELLS OF UNDETERMINED SIGNIFICANCE');
      if (c === 'Suspicious for malignancy') return withTag(`SUSPICIOUS FOR ${up(v.malignantType || 'malignancy')}`);
      if (c === 'Malignant') return withTag(`${v.malignantType || 'Malignant cells present'}${fav}`);
      return 'SEE MICROSCOPY';
    }
    case 'lymph_node_fna': {
      const fav = v.favourPrimary && v.favourPrimary !== 'Not stated' ? `, ${lower1(v.favourPrimary)}` : '';
      if (c.startsWith('L1.')) return withTag(`INADEQUATE${ndReason ? `, ${ndReason}` : ''}`);
      if (c.startsWith('L2.')) return withTag(`No evidence of malignancy; ${lower1(stripDot(v.benignDx)) || 'reactive lymphoid population'}`);
      if (c.startsWith('L3.')) return withTag('ATYPICAL CELLS OF UNDETERMINED SIGNIFICANCE');
      if (c.startsWith('L4.')) return withTag(`SUSPICIOUS FOR ${up(v.suspDx || 'malignancy')}`);
      if (c.startsWith('L5.')) return withTag(`${v.malignantDx || 'Malignant'}${fav}`);
      return 'SEE MICROSCOPY';
    }
    case 'cervical_cytology': {
      if ((v.adequacy || '').startsWith('Unsatisfactory')) return `UNSATISFACTORY FOR EVALUATION${ndReason ? `, ${ndReason.toUpperCase()}` : ''}`;
      const i = v.interpretation || CERVICAL[0];
      // No tag when the category has no abbreviation ("ADENOCARCINOMA", not "ADENOCARCINOMA (Adenocarcinoma)").
      const abbr = CERVICAL_ABBR[i] !== i ? CERVICAL_ABBR[i] : '';
      let text = (i === CERVICAL[5] ? 'High grade squamous intraepithelial lesion, with features suspicious for invasion' : i).replace(/\s*\((ASC-US|ASC-H|LSIL|HSIL|AGC|AIS)\)$/, '').toUpperCase();
      if (/^Atypical glandular/.test(i) && v.glandularOrigin && v.glandularOrigin !== 'Not otherwise specified') text += `, ${lower1(v.glandularOrigin)}`;
      if (i === 'Adenocarcinoma' && v.glandularOrigin && v.glandularOrigin !== 'Not otherwise specified') text += `, ${lower1(v.glandularOrigin)}`;
      const orgs = arr(v.features).filter((f) => ['Trichomonas vaginalis', 'Fungal organisms consistent with Candida', 'Shift in flora suggestive of bacterial vaginosis', 'Actinomyces', 'Herpes simplex virus changes', 'Cytomegalovirus changes'].includes(f));
      if (i === CERVICAL[0] && orgs.length) text += `; ${joinList(orgs.map((o) => FEATURE_TEXT[o]))}`;
      return abbr && abbr !== text ? `${text} (${abbr})` : text;
    }
    default: return 'SEE MICROSCOPY';
  }
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const id = templateId(ctx);
  const lead = organLead(v, id);
  const rest = [siteText(v, id), procedureText(v, id)].filter(Boolean).join(', ');
  return `(${part.label}) ${lead.toUpperCase()}${rest ? `, ${rest}` : ''} - ${diagnosisText(v, id)}`;
}

// ---------------------------------------------------------------------------
// Validation (category vs findings, adequacy vs category)
// ---------------------------------------------------------------------------

export function validate(part, ctx) {
  const v = part.values;
  const id = templateId(ctx);
  const out = [];
  const err = (m) => out.push({ level: 'error', message: m });
  const warn = (m) => out.push({ level: 'warn', message: m });
  const c = v.category || '';
  const a = v.adequacy || '';
  const nd = isNonDiagnostic(v, id);
  const inadequate = /^Inadequate|^Unsatisfactory|^Non-diagnostic/.test(a);

  if (id !== 'cervical_cytology') {
    if (inadequate && !nd) err('Adequacy is inadequate but the category is not the non-diagnostic category.');
    if (nd && !inadequate) warn('Non-diagnostic category selected but adequacy is marked adequate. Confirm the category.');
    if (nd && !stripDot(v.inadequacyReason)) warn('State the reason for inadequacy.');
    if (!c) err('Select a diagnostic category.');
  }
  const c2 = prepCounts(v);
  if (id !== 'cervical_cytology' && !c2.smears && !c2.lbc && !c2.cs && !c2.cb) warn('No preparations counted; the microscopy will read "The preparations".');
  if (FLUID_IDS.has(id) && !stripDot(v.volume)) warn('Fluid volume not stated.');

  const feats = arr(v.features);
  const has = (f) => feats.includes(f);
  if (id === 'thyroid_fna') {
    const ptcFeats = ['Nuclear grooves', 'Intranuclear pseudoinclusions', 'Nuclear enlargement and pallor', 'Papillary architecture', 'Psammoma bodies'].filter(has);
    if (c.startsWith('II.') && ptcFeats.length >= 2) warn('Two or more nuclear features of papillary carcinoma are ticked but the category is Benign.');
    if (c.startsWith('VI.') && v.malignantDx === 'Papillary thyroid carcinoma' && ptcFeats.length === 0) warn('Papillary carcinoma diagnosed without any papillary nuclear features ticked.');
    if (c.startsWith('IV.') && has('Abundant colloid')) warn('Abundant colloid is unusual for a follicular neoplasm.');
    if (c.startsWith('I.') && v.inadequacyReason === 'Cyst fluid only' && (has('Microfollicles') || has('Follicular cells in flat sheets'))) warn('Cyst fluid only is inconsistent with follicular cells being present.');
  }
  if (id === 'salivary_fna') {
    if (c.startsWith('IVa.') && v.benignNeoplasmDx === 'Pleomorphic adenoma' && !has('Chondromyxoid fibrillary matrix')) warn('Pleomorphic adenoma without chondromyxoid matrix ticked; consider IVb (cellular neoplasm) if matrix is scant.');
    if (c.startsWith('II.') && (has('Necrosis') || has('Marked pleomorphism'))) warn('Necrosis or marked pleomorphism ticked in a non-neoplastic category.');
  }
  if (id === 'urine_cytology') {
    const hg = ['N:C ratio 0.7 or more', 'Hyperchromasia', 'Irregular nuclear membranes', 'Coarse chromatin'].filter(has).length;
    if (c === 'Negative for high grade urothelial carcinoma' && hg >= 3) warn('Three or more high grade features are ticked but the category is NHGUC.');
    if (c === 'High grade urothelial carcinoma' && hg < 2) warn('HGUC requires a high N:C ratio plus at least two of hyperchromasia, irregular membranes and coarse chromatin.');
    if (v.lgun && c !== 'Negative for high grade urothelial carcinoma') warn('Low grade urothelial neoplasm is reported under NHGUC in the Paris System 2.0.');
  }
  if (id === 'effusion_cytology') {
    if (c === 'Negative for malignancy' && (has('Foreign cell population') || has('Signet-ring cells'))) warn('A foreign cell population or signet-ring cells are ticked but the category is negative.');
    if (c === 'Malignant' && !stripDot(v.malignantType)) warn('State the type of malignancy.');
  }
  if (id === 'lymph_node_fna') {
    if (c.startsWith('L2.') && (has('Cohesive epithelial clusters') || has('Keratinisation') || has('Monotonous medium to large lymphoid population'))) warn('Epithelial clusters, keratinisation or a monotonous large-cell population are ticked in a benign category.');
    if (c.startsWith('L5.') && !stripDot(v.malignantDx)) warn('State the type of malignancy.');
    if (/lymphoma/i.test(v.malignantDx || v.suspDx || '') && !stripDot(v.ancillary)) warn('Lymphoma favoured without flow cytometry or immunostaining recorded.');
  }
  if (id === 'cervical_cytology') {
    const i = v.interpretation || CERVICAL[0];
    const unsat = a.startsWith('Unsatisfactory');
    if (unsat && v.interpretation && v.interpretation !== CERVICAL[0]) warn('An epithelial abnormality is selected on an unsatisfactory specimen; an abnormality makes the specimen satisfactory by definition.');
    if (!unsat && cxConfig(v) && !cervicalDescription(v).length) warn(`No cell description is ticked for ${CERVICAL_ABBR[i]}; the microscopy names the category only.`);
    if (!unsat && i === CERVICAL[5] && !arr(v.invasionFeatures).length) warn('HSIL with features suspicious for invasion: tick the feature that raised the suspicion.');
    if (has('Koilocytes') && i !== CERVICAL[3]) warn('Koilocytes are ticked (a draft saved before 7 October 2026); koilocytosis is now described under LSIL. Untick it or change the interpretation.');
    if ([CERVICAL[2], CERVICAL[4], CERVICAL[5], CERVICAL[6]].includes(i) && v.hpv === 'Negative for high-risk HPV') warn('A high grade squamous interpretation with a negative high-risk HPV result: confirm both.');
    if (has('Glandular cells post hysterectomy') && a === 'Satisfactory') warn('Glandular cells post hysterectomy are ticked, but the adequacy states that a transformation zone component is present; a vault sample has none.');
  }
  return out;
}

export default { specimenName, macro, microscopy, diagnosis, validate };
