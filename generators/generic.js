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

export default { specimenName, macro, microscopy, diagnosis, validate };
