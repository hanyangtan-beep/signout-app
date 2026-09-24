// Organ icons for the template menus and the Cmd-K palette.
// Pure mapping (testable in Node) + a small DOM helper. Symbols live in one sprite
// (assets/icons/organ-icons-sprite.svg) injected once at boot; every icon is drawn in
// `currentColor`, so menu state is CSS only and no second asset is needed per state.

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Sprite symbol ids that exist today. */
export const ICON_IDS = [
  'lung', 'colorectum', 'breast', 'uterus', 'adnexa', 'stomach',
  'gallbladder', 'appendix', 'kidney', 'thyroid', 'prostate', 'skin',
  'liver', 'smallbowel', 'oesophagus', 'lymphnode', 'bladder', 'parathyroid',
  'salivary', 'placenta', 'aorticvalve', 'mandible', 'nasalcavity',
  'nasopharynx', 'softtissue', 'tonsils', 'urine', 'fluid',
  'brain', 'adrenal', 'molecular', 'microscope'
];

/**
 * manifest `organ` value (case/punctuation-insensitive) -> symbol id.
 * Organs with no icon yet are absent and fall back to the neutral glyph, so a
 * new template can never render a broken icon.
 */
export const ORGAN_ICON = {
  lung: 'lung',
  pleura: 'lung',
  bronchus: 'lung',
  colon: 'colorectum',
  rectum: 'colorectum',
  colorectum: 'colorectum',
  caecum: 'colorectum',
  cecum: 'colorectum',
  anus: 'colorectum',
  breast: 'breast',
  uterus: 'uterus',
  endometrium: 'uterus',
  cervix: 'uterus',
  myometrium: 'uterus',
  ovary: 'adnexa',
  'fallopian tube': 'adnexa',
  adnexa: 'adnexa',
  stomach: 'stomach',
  gallbladder: 'gallbladder',
  appendix: 'appendix',
  kidney: 'kidney',
  'renal cortex': 'kidney',
  ureter: 'kidney',
  thyroid: 'thyroid',
  'thyroid gland': 'thyroid',
  prostate: 'prostate',
  skin: 'skin',
  liver: 'liver',
  'small bowel': 'smallbowel',
  'small intestine': 'smallbowel',
  duodenum: 'smallbowel',
  jejunum: 'smallbowel',
  ileum: 'smallbowel',
  oesophagus: 'oesophagus',
  esophagus: 'oesophagus',
  'lymph node': 'lymphnode',
  'lymph nodes': 'lymphnode',
  spleen: 'lymphnode',
  'urinary bladder': 'bladder',
  bladder: 'bladder',
  urethra: 'bladder',
  urine: 'urine',
  parathyroid: 'parathyroid',
  'parathyroid gland': 'parathyroid',
  parotid: 'salivary',
  'salivary gland': 'salivary',
  'submandibular gland': 'salivary',
  placenta: 'placenta',
  'products of conception': 'placenta',
  'aortic valve': 'aorticvalve',
  aorta: 'aorticvalve',
  heart: 'aorticvalve',
  myocardium: 'aorticvalve',
  mandible: 'mandible',
  maxilla: 'mandible',
  jaw: 'mandible',
  bone: 'mandible',
  'nasal cavity': 'nasalcavity',
  sinonasal: 'nasalcavity',
  'paranasal sinus': 'nasalcavity',
  nose: 'nasalcavity',
  nasopharynx: 'nasopharynx',
  oropharynx: 'nasopharynx',
  larynx: 'nasopharynx',
  // No ear, nail or testis glyph yet: the ear takes the head-and-neck glyph, the nail the skin glyph
  // (its system), and the testis the male genital glyph the germ-cell name hint already uses.
  ear: 'nasopharynx',
  nail: 'skin',
  testis: 'prostate',
  'soft tissue': 'softtissue',
  'subcutaneous tissue': 'softtissue',
  'skeletal muscle': 'softtissue',
  tonsil: 'tonsils',
  tonsils: 'tonsils',
  'serous fluid': 'fluid',
  'pleural fluid': 'fluid',
  'peritoneal fluid': 'fluid',
  'ascitic fluid': 'fluid',
  'pericardial fluid': 'fluid',
  csf: 'fluid',
  brain: 'brain',
  cns: 'brain',
  'central nervous system': 'brain',
  'pituitary': 'brain',
  adrenal: 'adrenal',
  'adrenal gland': 'adrenal',
  molecular: 'molecular',
  'bone marrow': 'lymphnode'
};

/**
 * Placeholders in templates/planned.json carry no `organ`, so their icon is read
 * from the template name instead. Longest phrase wins, so 'small intestine'
 * never loses to 'intestine'.
 */
export const NAME_HINTS = {
  'nasal cavity': 'nasalcavity',
  'paranasal sinus': 'nasalcavity',
  sinonasal: 'nasalcavity',
  nasopharyn: 'nasopharynx',
  oropharyn: 'nasopharynx',
  hypopharynx: 'nasopharynx',
  laryn: 'nasopharynx',
  'oral cavity': 'mandible',
  lip: 'mandible',
  jaw: 'mandible',
  salivary: 'salivary',
  parotid: 'salivary',
  thyroid: 'thyroid',
  parathyroid: 'parathyroid',
  'small intestine': 'smallbowel',
  'small bowel': 'smallbowel',
  duodenum: 'smallbowel',
  ampulla: 'smallbowel',
  'anal canal': 'colorectum',
  colon: 'colorectum',
  rectum: 'colorectum',
  appendice: 'appendix',
  appendix: 'appendix',
  gastric: 'stomach',
  stomach: 'stomach',
  oesophag: 'oesophagus',
  gallbladder: 'gallbladder',
  'bile duct': 'gallbladder',
  cholangio: 'gallbladder',
  pancrea: 'gallbladder',
  liver: 'liver',
  hepat: 'liver',
  lung: 'lung',
  pleura: 'lung',
  thymus: 'lung',
  mediastin: 'lung',
  breast: 'breast',
  uter: 'uterus',
  endometri: 'uterus',
  cervi: 'uterus',
  vulva: 'uterus',
  vagina: 'uterus',
  ovar: 'adnexa',
  'fallopian': 'adnexa',
  placenta: 'placenta',
  gestational: 'placenta',
  kidney: 'kidney',
  renal: 'kidney',
  ureter: 'kidney',
  bladder: 'bladder',
  urethra: 'bladder',
  urine: 'urine',
  prostate: 'prostate',
  testi: 'prostate',
  penile: 'prostate',
  skin: 'skin',
  melanoma: 'skin',
  'soft tissue': 'softtissue',
  sarcoma: 'softtissue',
  lipoma: 'softtissue',
  bone: 'mandible',
  lymph: 'lymphnode',
  lymphoma: 'lymphnode',
  spleen: 'lymphnode',
  marrow: 'lymphnode',
  tonsil: 'tonsils',
  heart: 'aorticvalve',
  aort: 'aorticvalve',
  valve: 'aorticvalve',
  vascular: 'aorticvalve',
  effusion: 'fluid',
  fluid: 'fluid',
  glioma: 'brain',
  ependymoma: 'brain',
  meningioma: 'brain',
  pituitary: 'brain',
  brain: 'brain',
  'cns': 'brain',
  adrenal: 'adrenal',
  phaeochromocytoma: 'adrenal',
  paraganglioma: 'adrenal',
  neuroblastoma: 'adrenal',
  'wilms': 'kidney',
  nephrectomy: 'kidney',
  myocardi: 'aorticvalve',
  dermatos: 'skin',
  peritone: 'fluid',
  'germ cell': 'prostate',
  immunohistochemistry: 'molecular',
  'pcr': 'molecular',
  fish: 'molecular',
  ngs: 'molecular',
  'pd-l1': 'molecular',
  biomarker: 'molecular',
  'dna': 'molecular',
  'rna': 'molecular',
  autopsy: 'microscope'
};

const HINT_ORDER = Object.keys(NAME_HINTS).sort((a, b) => b.length - a.length);

/** Icon id guessed from a template name, or null. */
export function iconIdFromName(text) {
  const t = normaliseOrgan(text);
  if (!t) return null;
  const hit = HINT_ORDER.find((k) => t.includes(k));
  return hit ? NAME_HINTS[hit] : null;
}

/** Normalise a manifest organ string: 'THYROID GLAND' / 'Thyroid gland' -> 'thyroid gland'. */
export function normaliseOrgan(organ) {
  return String(organ || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Symbol id for a manifest entry (or a bare organ string), or null when no icon
 * exists yet — planned placeholders and the generic free-text template included.
 */
export function iconIdFor(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return ORGAN_ICON[normaliseOrgan(entry)] || null;
  const byOrgan = ORGAN_ICON[normaliseOrgan(entry.organ)];
  if (byOrgan) return byOrgan;
  // planned placeholders have no organ field — read the name instead
  return iconIdFromName(`${entry.name || ''} ${entry.label || ''}`);
}

/** How many installed templates currently resolve to an icon (used by the tests). */
export function iconCoverage(manifest) {
  const withIcon = manifest.filter((t) => iconIdFor(t));
  return { total: manifest.length, covered: withIcon.length };
}

/**
 * One icon element. Decorative by default: the template name sits beside it as
 * text, so a label would just be read twice.
 */
export function organIcon(entry, { label = '' } = {}) {
  const id = iconIdFor(entry);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', id ? 'organ-icon' : 'organ-icon organ-icon--generic');
  svg.setAttribute('viewBox', '0 0 1024 1024');
  if (label) { svg.setAttribute('role', 'img'); svg.append(titleEl(label)); }
  else { svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); }

  if (id) {
    const use = document.createElementNS(SVG_NS, 'use');
    // href for modern browsers; xlink:href kept for older WebKit on the hospital iPads
    use.setAttribute('href', `#organ-${id}`);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#organ-${id}`);
    svg.append(use);
  } else {
    svg.append(
      rect(232, 140, 560, 744, 48),
      path('M352 380h320M352 540h320M352 700h200')
    );
  }
  return svg;
}

function titleEl(text) {
  const t = document.createElementNS(SVG_NS, 'title');
  t.textContent = text;
  return t;
}

function rect(x, y, w, h, r) {
  const n = document.createElementNS(SVG_NS, 'rect');
  Object.entries({ x, y, width: w, height: h, rx: r }).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
}

function path(d) {
  const n = document.createElementNS(SVG_NS, 'path');
  n.setAttribute('d', d);
  return n;
}

/**
 * Inject the sprite once. Never rejects: if the fetch fails the menus simply
 * show the neutral glyph rather than the app failing to boot.
 */
export async function mountOrganSprite(url = 'assets/icons/organ-icons-sprite.svg') {
  if (typeof document === 'undefined') return false;
  if (document.querySelector('[data-sprite="organ-icons"]')) return true;
  try {
    const res = await fetch(new URL(url, document.baseURI));
    if (!res.ok) throw new Error(String(res.status));
    const host = document.createElement('div');
    host.hidden = true;
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = await res.text();
    const sprite = host.firstElementChild;
    if (sprite) sprite.setAttribute('data-sprite', 'organ-icons');
    document.body.prepend(host);
    return true;
  } catch {
    return false;
  }
}
