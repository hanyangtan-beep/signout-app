// Duodenal biopsy generator. Pure functions: (part, ctx) -> string.
// Villous architecture, intraepithelial lymphocytes and crypt hyperplasia derive a
// Marsh–Oberhuber type; peptic change, organisms and neoplasia are described alongside.
// Wording is protected by tests/duodenal.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

export function specimenName(part) {
  const site = (part.values.specimenName || '').trim();
  if (!site) return 'Duodenum, biopsy';
  return /duoden/i.test(site) ? `${site}, biopsy` : `Duodenum, ${site}, biopsy`;
}

/** "DUODENUM, D2, biopsy" — the site in lower case unless it is an abbreviation such as D2. */
export function organPhrase(part, ctx) {
  const noun = ctx?.schema?.specimenNoun || 'biopsy';
  let site = (part.values.specimenName || '').replace(/\s*\bduoden(um|al)\b\s*/i, ' ').replace(/^[\s,]+|[\s,]+$/g, '').trim();
  if (!site) return `DUODENUM, ${noun}`;
  if (!/^D\d/.test(site)) site = site.charAt(0).toLowerCase() + site.slice(1);
  return `DUODENUM, ${site}, ${noun}`;
}

export const isBlunted = (v) => ['Mild blunting', 'Marked blunting', 'Flat (absent villi)'].includes(v.villi);
export const ielIncreased = (v) => v.iel === 'Increased';

const BLUNT_TO_MARSH = { 'Mild blunting': '3a', 'Marked blunting': '3b', 'Flat (absent villi)': '3c' };
const MARSH_RANK = { 0: 0, 1: 1, 2: 2, '3a': 3, '3b': 4, '3c': 5 };

/**
 * Marsh–Oberhuber type, or null when the pattern does not fit the scheme
 * (e.g. villous blunting without intraepithelial lymphocytosis) or is overridden to "Not stated".
 */
export function marsh(v) {
  const o = v.marshOverride;
  if (o && o !== 'Auto') return o === 'Not stated' ? null : o;
  if (!ielIncreased(v)) return isBlunted(v) ? null : '0';
  if (isBlunted(v)) return BLUNT_TO_MARSH[v.villi];
  return v.cryptHyperplasia === 'Present' ? '2' : '1';
}
export const marshRank = (v) => MARSH_RANK[marsh(v)] ?? 0;

export const isPeptic = (v) => v.brunner === 'Brunner gland hyperplasia' || v.foveolar === 'Present';
export const isActive = (v) => ['Neutrophils', 'Erosion', 'Ulceration'].includes(v.activity);
export const isNeoplastic = (v) => v.neoplasia && v.neoplasia !== 'None';

// ---------- microscopy ----------

const OTHER_SENTENCE = {
  Lymphangiectasia: 'Dilated lymphatic channels are present within the lamina propria, consistent with lymphangiectasia.',
  'Foamy macrophages in the lamina propria': 'The lamina propria contains aggregates of foamy macrophages; PAS and Ziehl–Neelsen stains are recommended to exclude Whipple disease and mycobacterial infection.',
  'Amyloid deposition': 'Amorphous eosinophilic material is deposited around vessels and within the lamina propria, suspicious for amyloid; Congo red staining is recommended.',
  'Viral cytopathic change': 'Enlarged cells with intranuclear and cytoplasmic inclusions consistent with viral cytopathic change are present; immunohistochemistry for CMV is recommended.',
};

const NEOPLASIA_SENTENCE = {
  'Adenoma, low grade dysplasia': 'There is an adenoma composed of tubular glands lined by epithelium with elongated hyperchromatic nuclei, nuclear stratification confined to the basal half and preserved polarity, in keeping with low grade dysplasia. No high grade dysplasia or invasive malignancy is seen.',
  'Adenoma, high grade dysplasia': 'There is an adenoma showing complex glandular architecture with full-thickness nuclear stratification, marked nuclear pleomorphism and loss of polarity, in keeping with high grade dysplasia. No invasive malignancy is seen in the material examined.',
  Adenocarcinoma: 'Infiltrating irregular glands lined by markedly atypical cells with a desmoplastic stromal response are present, consistent with adenocarcinoma.',
  'Neuroendocrine tumour': 'Within the lamina propria and submucosa there are nests and trabeculae of uniform cells with granular cytoplasm and stippled chromatin, consistent with a well differentiated neuroendocrine tumour; synaptophysin, chromogranin and Ki-67 are recommended for confirmation and grading.',
  'Atypical lymphoid infiltrate': 'The lamina propria is expanded by a dense monotonous lymphoid infiltrate that effaces the crypts; immunohistochemistry is recommended to characterise the infiltrate and exclude lymphoma.',
};

export function microscopy(part, ctx) {
  const v = part.values;
  const s = [];
  const n = num(v.pieces);
  s.push(`Sections show ${n && n > 1 ? `${n} pieces` : 'a piece'} of duodenal mucosa.`);

  // Architecture and IELs
  if (!isBlunted(v)) {
    s.push(v.cryptHyperplasia === 'Present' ? 'The villous architecture is preserved but the crypts are hyperplastic.' : 'The villous and crypt architecture are intact.');
  } else {
    const villi = v.villi === 'Flat (absent villi)' ? 'The mucosa is flat with absent villi' : v.villi === 'Marked blunting' ? 'The villi are markedly blunted' : 'The villi are mildly blunted';
    s.push(`${villi}${v.cryptHyperplasia === 'Present' ? ', with crypt hyperplasia and a reduced villous to crypt ratio' : ''}.`);
  }
  if (ielIncreased(v)) {
    const c = num(v.ielCount);
    s.push(`Intraepithelial lymphocytes are increased${c ? ` (approximately ${Math.round(c)} per 100 enterocytes)` : ''}, including at the villous tips.`);
  } else {
    s.push('Intraepithelial lymphocytes are not increased.');
  }

  // Lamina propria and activity
  const eos = v.eosinophils === 'Increased';
  if (v.lpInflammation === 'Increased chronic inflammation') s.push(`The lamina propria shows an increased chronic inflammatory infiltrate of plasma cells and lymphocytes${eos ? ' with increased eosinophils' : ''}.`);
  else s.push(eos ? 'The lamina propria contains increased numbers of eosinophils.' : 'The lamina propria contains moderate numbers of plasma cells, lymphocytes and eosinophils.');
  if (v.activity === 'Neutrophils') s.push('Neutrophils are present within the surface epithelium and crypts.');
  else if (v.activity === 'Erosion') s.push('There is surface erosion with reactive epithelial change and neutrophilic inflammation.');
  else if (v.activity === 'Ulceration') s.push('There is ulceration with granulation tissue and fibrinopurulent exudate.');

  // Peptic change
  if (v.brunner === 'Brunner gland hyperplasia' && v.foveolar === 'Present') s.push('Brunner gland hyperplasia and gastric foveolar metaplasia of the surface epithelium are present.');
  else if (v.brunner === 'Brunner gland hyperplasia') s.push('Brunner gland hyperplasia is present.');
  else if (v.foveolar === 'Present') s.push('Gastric foveolar metaplasia of the surface epithelium is present.');
  else s.push('Metaplastic changes are absent.');

  // Organisms and other
  if (v.giardia === 'Present') s.push('Pear-shaped trophozoites consistent with Giardia are present within the surface mucus.');
  if (v.hpylori === 'Present') s.push('Helicobacter-like organisms are seen on the surface of the metaplastic foveolar epithelium.');
  if (v.granuloma === 'Present') s.push('A non-necrotising epithelioid granuloma is present within the lamina propria.');
  if (OTHER_SENTENCE[v.other]) s.push(OTHER_SENTENCE[v.other]);
  if (NEOPLASIA_SENTENCE[v.neoplasia]) s.push(NEOPLASIA_SENTENCE[v.neoplasia]);

  // Negatives
  const negatives = [];
  if (!isActive(v)) negatives.push('cryptitis', 'crypt abscess');
  if (v.granuloma !== 'Present') negatives.push('granuloma');
  if (v.other !== 'Viral cytopathic change') negatives.push('viral cytopathic change');
  if (v.giardia !== 'Present') negatives.push('parasite');
  if (negatives.length) s.push(`No ${listJoin(negatives).replace(' and ', ' or ')} is present.`);
  const tail = [];
  if (v.activity !== 'Ulceration') tail.push('ulceration');
  if (!isNeoplastic(v)) tail.push('dysplasia', 'malignancy');
  if (tail.length) s.push(`There is no evidence of ${listJoin(tail).replace(' and ', ' or ')}.`);

  // Interpretation
  if (ctx?.options?.coeliacComment !== false && !isNeoplastic(v)) {
    const m = marsh(v);
    if (m && m.startsWith('3')) s.push('The combination of villous atrophy, crypt hyperplasia and intraepithelial lymphocytosis is consistent with coeliac disease in the appropriate serological context; other causes of this pattern (medication, infection, autoimmune enteropathy, common variable immunodeficiency) cannot be entirely excluded histologically.');
    else if (m === '1' || m === '2') s.push('Increased intraepithelial lymphocytes with preserved villous architecture is a non-specific finding; the differential includes coeliac disease (including treated or early disease), Helicobacter gastritis, medication effect and infection. Correlation with coeliac serology is recommended.');
    else if (isBlunted(v) && !ielIncreased(v)) s.push('Villous blunting without intraepithelial lymphocytosis is non-specific and may reflect peptic injury, medication effect or tangential sectioning; the findings are not typical of coeliac disease.');
  }

  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const NEOPLASIA_DX = {
  'Adenoma, low grade dysplasia': 'TUBULAR ADENOMA WITH LOW GRADE DYSPLASIA',
  'Adenoma, high grade dysplasia': 'ADENOMA WITH HIGH GRADE DYSPLASIA; no invasive malignancy in the material examined',
  Adenocarcinoma: 'ADENOCARCINOMA',
  'Neuroendocrine tumour': 'WELL DIFFERENTIATED NEUROENDOCRINE TUMOUR; see comment',
  'Atypical lymphoid infiltrate': 'ATYPICAL LYMPHOID INFILTRATE; immunohistochemistry to follow',
};

export function coeliacClause(v) {
  const m = marsh(v);
  if (!m || m === '0') return '';
  if (m.startsWith('3')) return `VILLOUS ATROPHY WITH INTRAEPITHELIAL LYMPHOCYTOSIS${v.cryptHyperplasia === 'Present' ? ' AND CRYPT HYPERPLASIA' : ''} (MARSH ${m}), consistent with coeliac disease in the appropriate serological context`;
  if (m === '2') return 'INCREASED INTRAEPITHELIAL LYMPHOCYTES WITH CRYPT HYPERPLASIA AND PRESERVED VILLOUS ARCHITECTURE (MARSH 2); see comment';
  return 'INCREASED INTRAEPITHELIAL LYMPHOCYTES WITH PRESERVED VILLOUS ARCHITECTURE (MARSH 1); see comment';
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const clauses = [];
  if (NEOPLASIA_DX[v.neoplasia]) clauses.push(NEOPLASIA_DX[v.neoplasia]);
  const coeliac = coeliacClause(v);
  if (coeliac) clauses.push(coeliac);
  if (isBlunted(v) && !ielIncreased(v) && !coeliac) clauses.push('VILLOUS BLUNTING WITHOUT INTRAEPITHELIAL LYMPHOCYTOSIS; see comment');

  const activity = v.activity === 'Erosion' ? ' WITH EROSION' : v.activity === 'Ulceration' ? ' WITH ULCERATION' : '';
  if (isPeptic(v)) clauses.push(`${isActive(v) ? 'ACTIVE ' : ''}PEPTIC DUODENITIS${activity}`);
  else if (isActive(v)) clauses.push(`ACTIVE DUODENITIS${activity}`);
  else if (v.lpInflammation === 'Increased chronic inflammation' && !coeliac) clauses.push('CHRONIC DUODENITIS');
  if (v.eosinophils === 'Increased' && !isPeptic(v) && !isActive(v)) clauses.push('INCREASED LAMINA PROPRIA EOSINOPHILS');
  if (v.giardia === 'Present') clauses.push('GIARDIASIS');
  if (v.granuloma === 'Present') clauses.push('GRANULOMATOUS INFLAMMATION');
  if (v.other === 'Lymphangiectasia') clauses.push('LYMPHANGIECTASIA');
  if (v.other === 'Foamy macrophages in the lamina propria') clauses.push('FOAMY MACROPHAGE INFILTRATE; special stains to follow');
  if (v.other === 'Amyloid deposition') clauses.push('DEPOSITS SUSPICIOUS FOR AMYLOID; Congo red to follow');
  if (v.other === 'Viral cytopathic change') clauses.push('VIRAL CYTOPATHIC CHANGE; CMV immunohistochemistry to follow');

  const extras = [];
  if (v.hpylori === 'Present') extras.push('Helicobacter-like organisms present');
  if (!clauses.length) clauses.push('DUODENAL MUCOSA WITH NO SIGNIFICANT HISTOLOGICAL ABNORMALITY');
  else if (!isNeoplastic(v)) extras.push('no evidence of dysplasia or malignancy');
  return `(${part.label}) ${organPhrase(part, ctx)} - ${[...clauses, ...extras].join('; ')}`;
}

// ---------- case summary ----------

const partList = (parts) => (parts.length === 1 ? `part ${parts[0].label}` : `parts ${listJoin(parts.map((p) => p.label))}`);

/** One SUMMARY line for multi-site series; omitted for single parts or when the option is off. */
export function summary(parts, ctx) {
  if (parts.length < 2 || ctx.options.summary === false) return '';
  const bits = [];
  const neo = parts.filter((p) => isNeoplastic(p.values));
  if (neo.length) bits.push(`${listJoin([...new Set(neo.map((p) => p.values.neoplasia.toLowerCase()))])} in ${partList(neo)}`);
  const top = Math.max(...parts.map((p) => marshRank(p.values)));
  if (top > 0) {
    const topParts = parts.filter((p) => marshRank(p.values) === top);
    bits.push(`highest Marsh–Oberhuber type ${marsh(topParts[0].values)} (${partList(topParts)})`);
  }
  const peptic = parts.filter((p) => isPeptic(p.values) || isActive(p.values));
  if (peptic.length) bits.push(`${peptic.some((p) => isPeptic(p.values)) ? 'peptic duodenitis' : 'active duodenitis'} in ${partList(peptic)}`);
  const giardia = parts.filter((p) => p.values.giardia === 'Present');
  if (giardia.length) bits.push(`Giardia in ${partList(giardia)}`);
  if (!bits.length) return 'SUMMARY: No significant histological abnormality at any level sampled.';
  const text = bits.join('; ');
  return `SUMMARY: ${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export default { specimenName, microscopy, diagnosis, summary };
