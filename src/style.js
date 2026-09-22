// Style layer: LIS-safe plain text. Applied to every generated block.
//
// British spelling is per-schema (`style.british: true`). It began as opt-in so legacy wording
// stayed byte-identical; every template now opts in, so the flag records that each one was
// converted deliberately rather than swept up by a default. A new template must set it.
//
// The layer rewrites the PRINTED text, not the stored value: a saved case still holds site
// "Cecum" and still prints CAECUM. Option labels are left alone for the same reason - renaming
// them would orphan every case already saved against the old string.

const ASCII_MAP = [
  [/[\u2018\u2019\u201A\u201B\u2032]/g, "'"],
  [/[\u201C\u201D\u201E\u201F\u2033]/g, '"'],
  [/[\u2013\u2014\u2212]/g, '-'],
  [/\u2026/g, '...'],
  [/\u00A0/g, ' '],
  [/\u00B5|\u03BC/g, 'micro'],
  [/\u2265/g, '>='],
  [/\u2264/g, '<='],
  [/\u00D7/g, 'x'],
  [/\u00B0/g, ' degrees'],
  [/\u00B2/g, '2'],
  [/\u00B3/g, '3'],
  [/\u03B2/g, 'beta'],
  [/\u00FC/g, 'u'],
  [/\u00E9/g, 'e']
];

export const BRITISH = {
  tumor: 'tumour', tumors: 'tumours', color: 'colour', center: 'centre', fiber: 'fibre', fibers: 'fibres',
  esophagus: 'oesophagus', esophageal: 'oesophageal', edema: 'oedema', hemorrhage: 'haemorrhage',
  hemorrhagic: 'haemorrhagic', hematoxylin: 'haematoxylin', leukocyte: 'leucocyte', leukocytes: 'leucocytes',
  cecum: 'caecum', cecal: 'caecal', anemia: 'anaemia', gynecologic: 'gynaecologic',
  gynecological: 'gynaecological', pediatric: 'paediatric', diarrhea: 'diarrhoea', dyskeratosis: 'dyskeratosis',
  favorable: 'favourable', unfavorable: 'unfavourable', behavior: 'behaviour', characterized: 'characterised',
  organized: 'organised', localized: 'localised', generalized: 'generalised', vascularized: 'vascularised',
  keratinized: 'keratinised', ulcerated: 'ulcerated', fibrosed: 'fibrosed', analyzed: 'analysed', gray: 'grey',
  // Found by scanning every printed option label, generator string and fixture report for an American
  // form the map did not cover. All five were reaching released reports, through the breast
  // biomarker block and the HER2 comment.
  // `randomized` added 2026-09-22 while building breast_biomarkers: the first pass scanned the
  // fixtures, which never select a Group 2 ISH result, so the word survived in that one comment
  // paragraph. It is the only American form left after every branch of the block is exercised.
  estrogen: 'oestrogen', estrogens: 'oestrogens', ischemia: 'ischaemia', ischemic: 'ischaemic',
  signaling: 'signalling', randomized: 'randomised'
};

// Deliberately NOT in the map, checked against it by test:
//   fetal    - house wording is "fetal", not "foetal".
//   Mullerian - an eponym, not an Americanism.
// Eponyms, gene and protein symbols, and the titles of external documents (QMH template names, CAP
// protocol names, FIGO and WHO citations) must survive this layer unchanged. Those titles are held in
// schema `source` fields and are never printed into a report, so they never reach britishise().

/** Normalise to plain ASCII the LIS will accept. Keeps line breaks. */
export function toAscii(text) {
  let out = String(text ?? '');
  for (const [re, rep] of ASCII_MAP) out = out.replace(re, rep);
  // Strip any remaining non-ASCII except newline/tab.
  out = out.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  return out;
}

/** Replace American spellings, preserving case (lower / Capitalised / UPPER). */
export function britishise(text) {
  return String(text ?? '').replace(/[A-Za-z]+/g, (w) => {
    const rep = BRITISH[w.toLowerCase()];
    if (!rep) return w;
    if (w === w.toUpperCase()) return rep.toUpperCase();
    if (w[0] === w[0].toUpperCase()) return rep[0].toUpperCase() + rep.slice(1);
    return rep;
  });
}

/** Collapse runs of 3+ blank lines and trailing spaces; keep intentional double spaces after labels. */
export function tidyBlanks(text) {
  return String(text ?? '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}

export function applyStyle(text, style = {}) {
  let out = toAscii(text);
  if (style.british) out = britishise(out);
  return tidyBlanks(out);
}
