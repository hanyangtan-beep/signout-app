// Generic (free text) template: the fallback for parts with no matching template (specimen intake)
// and for anything unusual. Prints the text as typed, in the house layout.
//   specimenName "Omentum, resection"
//   macro        "(A) …" (only when typed)
//   microscopy   "(A) Sections show …"
//   diagnosis    "(A) OMENTUM, resection - NO EVIDENCE OF MALIGNANCY"
// The organ (text before the first comma) is upper-cased in the diagnosis line, as in every template.

const clean = (s) => String(s || '').replace(/\s+$/g, '').trim();

export function specimenName(part) {
  return clean(part.values.specimenName) || `Part ${part.label}`;
}

/** "OMENTUM, resection" — upper-case the organ segment, keep the rest as labelled. */
export function specimenLine(part) {
  const name = specimenName(part);
  const i = name.indexOf(',');
  return i < 0 ? name.toUpperCase() : `${name.slice(0, i).toUpperCase()}${name.slice(i)}`;
}

export function macro(part) {
  const m = clean(part.values.macro);
  return m ? `(${part.label}) ${m}` : '';
}

export function microscopy(part) {
  const m = clean(part.values.microscopy);
  if (!m || /^sections show$/i.test(m)) return '';
  return `(${part.label}) ${m}`;
}

export function diagnosis(part) {
  const d = clean(part.values.diagnosis);
  return `(${part.label}) ${specimenLine(part)}${d ? ` - ${d}` : ''}`;
}

export function validate(part) {
  const out = [];
  const m = clean(part.values.microscopy);
  if (!m || /^sections show$/i.test(m)) out.push({ level: 'warn', message: 'Generic part has no microscopy text.' });
  if (!clean(part.values.diagnosis)) out.push({ level: 'warn', message: 'Generic part has no diagnosis.' });
  return out;
}

const MARGIN_SITE_RE = /\b(margin|donut|doughnut|shave|cavity|re-?excision|anastomotic ring|cuff)\b/i;
const CLEAR_RE = /\b(no evidence of malignancy|negative for|uninvolved|free of|clear of|no tumour|no tumor|no invasive|no carcinoma|no residual|benign)\b/i;
const INVOLVED_RE = /\b(involved by|positive for|invasive carcinoma|adenocarcinoma|squamous cell carcinoma|ductal carcinoma in situ|\bdcis\b|malignancy present|tumour present|tumor present)\b/i;
const FACE_RE = /\b(anterior|posterior|superior|inferior|medial|lateral|superficial|deep)\b/i;
const DIST_MM_RE = /(\d+(?:\.\d+)?)\s*mm\b/i;

/** Structured margin summary emitted to src/reconcile.js when a generic part is a separate margin / donut / cavity shave. */
export function contribution(part) {
  const v = part?.values || {};
  const site = clean(v.specimenName);
  if (!site || !MARGIN_SITE_RE.test(site)) return null;
  const dx = clean(v.diagnosis);
  const micro = clean(v.microscopy);
  const text = `${dx} ${micro}`.trim();
  const clear = CLEAR_RE.test(dx) || (!dx && CLEAR_RE.test(micro));
  const involved = !clear && (INVOLVED_RE.test(dx) || (!dx && INVOLVED_RE.test(micro)));
  const status = clear ? 'clear' : involved ? 'involved' : 'unknown';

  const lc = site.toLowerCase();
  const faceMatch = FACE_RE.exec(site);
  const face = faceMatch ? faceMatch[1].toLowerCase() : '';
  const target = /\b(proximal|upper|oral|ileal|oesophageal|esophageal)\b/.test(lc) ? 'proximal'
    : /\b(distal|lower|anal|rectal|duodenal)\b/.test(lc) ? 'distal'
      : /\b(radial|circumferential|\bcrm\b|mesenteric)\b/.test(lc) ? 'radial'
        : /\bbronchial\b/.test(lc) ? 'bronchial'
          : /\bvascular\b/.test(lc) ? 'vascular'
            : /\b(parenchymal|staple)\b/.test(lc) ? 'parenchymal'
              : /\b(cavity|shave)\b/.test(lc) || face ? 'cavity'
                : 'other';

  const dm = DIST_MM_RE.exec(text);
  const distanceMm = dm ? parseFloat(dm[1]) : null;
  return {
    kind: 'margin',
    partLabel: part?.label || '',
    site,
    target,
    face,
    status,
    distanceMm: Number.isFinite(distanceMm) ? distanceMm : null,
    diagnosis: dx
  };
}

export default { specimenName, macro, microscopy, diagnosis, validate, contribution };
