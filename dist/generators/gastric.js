// Gastric biopsy generator. Ported from legacy/gastric-legacy.cjs (v8 wording).
// Pure functions: (part, ctx) -> string. `part.values` holds the schema field values.
// Wording is protected by tests/fixtures/gastric — change it only deliberately.

const low = (v) => String(v || '').trim().toLowerCase();
const present = (v) => v && v !== 'Absent';
const hpPresent = (v) => v !== 'Absent';

/** Parse "(A) Antrum and (B) Body" into { A: 'Antrum', B: 'Body' }. Labels A–J. */
export function parseSitesFromTitle(text) {
  const out = {};
  const re = /\(([A-J])\)\s*([^\(]+)/gi;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    let site = (m[2] || '').trim();
    site = site.replace(/\s+(and|&)\s*$/i, '').trim();
    site = site.replace(/[;,]+$/g, '').trim();
    if (site) out[m[1].toUpperCase()] = site;
  }
  return out;
}

export function prepare(caseState) {
  return { sites: parseSitesFromTitle(caseState.caseTitle) };
}

export function specimenName(part) {
  return part.values.specimenName || `Part ${part.label}`;
}

/** Specimen block: the case title verbatim, else "(A) Antrum and (B) Body". */
export function specimens(parts, ctx) {
  const title = (ctx.case.caseTitle || '').trim();
  if (title) return title;
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join(' and ');
}

export function microscopy(part) {
  const s = part.values;
  const imText = s.imDegree === 'Absent' ? 'Absent' : (s.imType ? `${s.imDegree} (${low(s.imType)})` : s.imDegree);
  const note = (s.additionalNotes || '').trim();
  const lines = [
    `(${part.label})`,
    `- Site: ${s.siteType}`,
    `- Activity: ${s.activity}`,
    `- Chronic inflammation: ${s.chronic}`,
    `- Reactive lymphoid follicle(s): ${s.follicles}`,
    `- Atrophy: ${s.atrophy}`,
    `- Evidence of ulcer / erosion: ${s.ulcer}`,
    `- Intestinal metaplasia: ${imText}`,
    `- Dysplasia / malignancy: ${s.dysplasia}`,
    `- Helicobacter pylori: ${s.hp}`
  ];
  if (note !== '') lines.push(`- Additional notes: ${note}`);
  return lines.join('\n');
}

export function diagnosis(part, ctx) {
  const s = part.values;
  const parsed = ctx.prepared.sites;
  const verbatimSite = parsed[part.label] ? parsed[part.label] : (s.specimenName || 'stomach');
  const site = low(verbatimSite);
  let line = `(${part.label}) ${ctx.schema.organ}, ${site}, ${ctx.schema.specimenNoun} - `;
  if (hpPresent(s.hp)) {
    line += 'HELICOBACTER ASSOCIATED CHRONIC ' + (present(s.activity) ? 'ACTIVE ' : '') + 'GASTRITIS';
  } else if (present(s.activity)) {
    line += 'CHRONIC ACTIVE GASTRITIS';
  } else {
    line += 'CHRONIC GASTRITIS, inactive, Helicobacter-negative';
  }
  const extras = [];
  if (s.ulcer === 'Present') extras.push('with ULCER');
  if (present(s.imDegree)) {
    const suffix = s.imType ? ` (${low(s.imType)})` : '';
    extras.push(`${low(s.imDegree)} INTESTINAL METAPLASIA${suffix}`);
  }
  if (present(s.atrophy)) extras.push(`${low(s.atrophy)} ATROPHY`);
  if (s.dysplasia !== 'Absent') extras.push(s.dysplasia.toUpperCase());
  if (hpPresent(s.hp) && extras.length) {
    line += ' ' + extras[0];
    if (extras.length > 1) line += '; ' + extras.slice(1).join('; ');
  } else if (!hpPresent(s.hp) && extras.length) {
    line += '; ' + extras.join('; ');
  }
  return line;
}

export default { prepare, specimens, specimenName, microscopy, diagnosis };
