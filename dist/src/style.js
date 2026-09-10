// Style layer: LIS-safe plain text. Applied to every generated block.
// British spelling is opt-in per schema (`style.british: true`) so legacy wording
// (e.g. "Cecum") stays byte-identical until you decide to change it.

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
  [/\u00B3/g, '3']
];

export const BRITISH = {
  tumor: 'tumour', tumors: 'tumours', color: 'colour', center: 'centre', fiber: 'fibre', fibers: 'fibres',
  esophagus: 'oesophagus', esophageal: 'oesophageal', edema: 'oedema', hemorrhage: 'haemorrhage',
  hemorrhagic: 'haemorrhagic', hematoxylin: 'haematoxylin', leukocyte: 'leucocyte', leukocytes: 'leucocytes',
  cecum: 'caecum', cecal: 'caecal', anemia: 'anaemia', gynecologic: 'gynaecologic',
  gynecological: 'gynaecological', pediatric: 'paediatric', diarrhea: 'diarrhoea', dyskeratosis: 'dyskeratosis',
  favorable: 'favourable', unfavorable: 'unfavourable', behavior: 'behaviour', characterized: 'characterised',
  organized: 'organised', localized: 'localised', generalized: 'generalised', vascularized: 'vascularised',
  keratinized: 'keratinised', ulcerated: 'ulcerated', fibrosed: 'fibrosed', analyzed: 'analysed', gray: 'grey'
};

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
