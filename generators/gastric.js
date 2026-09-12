// Gastric biopsy generator. Ported from legacy/gastric-legacy.cjs (v8 wording).
// Pure functions: (part, ctx) -> string. `part.values` holds the schema field values.
// Wording is protected by tests/fixtures/gastric — change it only deliberately.

const low = (v) => String(v || '').trim().toLowerCase();
const present = (v) => v && v !== 'Absent';
const hpPresent = (v) => v !== 'Absent';

/** Parse "(A) Antrum and (B) Body" into { A: 'Antrum', B: 'Body' }. Labels A–Z (the title is derived from the LIS specimen list). */
export function parseSitesFromTitle(text) {
  const out = {};
  // A parenthesis not followed by a single capital letter ("(12a)" station numbers) belongs to the site.
  const re = /\(([A-Z])\)\s*((?:[^(]|\((?![A-Z]\)))+)/g;
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

/** Mapping site when one is chosen (used as the specimen name fallback and for OLGA compartments). */
const mappedSite = (v) => (v.biopsySite && v.biopsySite !== 'Unspecified' ? v.biopsySite : '');

export function specimenName(part) {
  return part.values.specimenName || mappedSite(part.values) || `Part ${part.label}`;
}

// ---------- intestinal metaplasia subtype, extent and histochemistry ----------

const qualifier = (v) => (v && v !== 'Unspecified' ? low(v) : '');

/** "(incomplete, multifocal)" — subtype and extent qualifiers for the IM grade; "" when neither is set. */
export function imQualifier(s) {
  const q = [qualifier(s.imType), qualifier(s.imExtent)].filter(Boolean);
  return q.length ? ` (${q.join(', ')})` : '';
}

/** Histochemistry sentence for the microscopy block, or "" when no stain was performed. */
export function imStainText(s) {
  const stain = s.imStain;
  if (!stain || stain === 'Not performed' || s.imDegree === 'Absent') return '';
  const type = s.imType;
  if (stain === 'AB-PAS') {
    if (type === 'Complete') return 'AB-PAS shows acid mucin confined to goblet cells with a PAS-positive brush border, in keeping with complete (type I) intestinal metaplasia.';
    if (type === 'Incomplete') return 'AB-PAS shows acid mucin in goblet cells and in the intervening columnar cells, in keeping with incomplete (type II/III) intestinal metaplasia.';
    return 'AB-PAS highlights the metaplastic goblet cells.';
  }
  if (stain === 'HID-AB') {
    if (type === 'Complete') return 'HID-AB shows sialomucin without sulphomucin, in keeping with complete (type I) intestinal metaplasia.';
    if (type === 'Incomplete') return 'HID-AB shows sulphomucin in the intervening columnar cells, in keeping with incomplete (type III) intestinal metaplasia.';
    return 'HID-AB performed; see intestinal metaplasia subtype.';
  }
  return '';
}

// ---------- OLGA / OLGIM ----------

const ANTRAL = ['Antrum, greater curvature', 'Antrum, lesser curvature', 'Incisura angularis'];
const CORPUS = ['Body, greater curvature', 'Body, lesser curvature', 'Fundus'];
const SYDNEY = ['Antrum, greater curvature', 'Antrum, lesser curvature', 'Incisura angularis', 'Body, greater curvature', 'Body, lesser curvature'];
const GRADE = { Absent: 0, Mild: 1, Moderate: 2, Marked: 3 };
const ROMAN = ['0', 'I', 'II', 'III', 'IV'];

/** Rugge / Correa 4 x 4 table: STAGE[antrumScore][corpusScore] -> 0..4. */
export const STAGE = [
  [0, 1, 2, 2],
  [1, 1, 2, 3],
  [2, 2, 3, 4],
  [3, 3, 4, 4]
];

/** Compartment of a part from its mapping site: 'antrum', 'corpus' or null (cardia / unspecified). */
export function compartmentOf(values) {
  const site = mappedSite(values);
  if (ANTRAL.includes(site)) return 'antrum';
  if (CORPUS.includes(site)) return 'corpus';
  return null;
}

const maxGrade = (parts, field) => parts.reduce((m, p) => Math.max(m, GRADE[p.values[field]] ?? 0), 0);

/**
 * OLGA / OLGIM staging over the mapped parts. Each compartment scores the highest
 * atrophy (OLGA) or intestinal metaplasia (OLGIM) grade among its parts; the stage
 * comes from the 4 x 4 table. Returns null unless at least one antral and one corpus
 * part are mapped. `sites` counts the distinct Sydney sites sampled (of 5).
 */
export function olga(parts) {
  const antrum = parts.filter((p) => compartmentOf(p.values) === 'antrum');
  const corpus = parts.filter((p) => compartmentOf(p.values) === 'corpus');
  if (antrum.length === 0 || corpus.length === 0) return null;
  const a = { atrophy: maxGrade(antrum, 'atrophy'), im: maxGrade(antrum, 'imDegree') };
  const c = { atrophy: maxGrade(corpus, 'atrophy'), im: maxGrade(corpus, 'imDegree') };
  const sites = new Set(parts.map((p) => mappedSite(p.values)).filter((x) => SYDNEY.includes(x))).size;
  return {
    olga: STAGE[a.atrophy][c.atrophy],
    olgim: STAGE[a.im][c.im],
    antrum: a,
    corpus: c,
    sites,
    complete: sites >= 5
  };
}

/** "OLGA stage II; OLGIM stage I (incomplete mapping: 3 of 5 Sydney sites sampled)." */
export function olgaText(st) {
  if (!st) return '';
  const caveat = st.complete ? '' : ` (incomplete mapping: ${st.sites} of 5 Sydney sites sampled)`;
  return `OLGA stage ${ROMAN[st.olga]}; OLGIM stage ${ROMAN[st.olgim]}${caveat}.`;
}

/** Stage line under the diagnosis, when the case option is on and both compartments are mapped. */
export function summary(parts, ctx) {
  if (ctx.options && ctx.options.olga === false) return '';
  return olgaText(olga(parts));
}

/** Case-level flags for `auto: {flag}` snippets. */
export function flags(parts) {
  const vals = parts.map((p) => p.values);
  const hp = vals.some((v) => hpPresent(v.hp));
  const im = vals.some((v) => present(v.imDegree));
  const incomplete = vals.some((v) => present(v.imDegree) && v.imType === 'Incomplete');
  const extensiveIncomplete = vals.some((v) => present(v.imDegree) && v.imType === 'Incomplete' && v.imExtent === 'Extensive');
  const st = olga(parts);
  const olgaHigh = (st && (st.olga >= 3 || st.olgim >= 3)) || extensiveIncomplete;
  const out = [];
  if (hp && im) out.push('hpWithIm');
  if (hp && !im) out.push('hpNoIm');
  if (olgaHigh) out.push('olgaHigh');
  if (incomplete && !olgaHigh) out.push('imIncompleteAlone');
  return out;
}

/** Specimen block: the case title verbatim, else "(A) Antrum and (B) Body". */
export function specimens(parts, ctx) {
  const title = (ctx.case.caseTitle || '').trim();
  if (title) return title;
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join(' and ');
}

export function microscopy(part) {
  const s = part.values;
  const imText = s.imDegree === 'Absent' ? 'Absent' : `${s.imDegree}${imQualifier(s)}`;
  const stain = imStainText(s);
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
    ...(stain ? [`- Mucin histochemistry: ${stain}`] : []),
    `- Dysplasia / malignancy: ${s.dysplasia}`,
    `- Helicobacter pylori: ${s.hp}`
  ];
  if (note !== '') lines.push(`- Additional notes: ${note}`);
  return lines.join('\n');
}

/**
 * A biopsy with no inflammation, activity, follicles, atrophy, ulcer, intestinal metaplasia,
 * dysplasia or Helicobacter is reported as NO SIGNIFICANT ABNORMALITY rather than as an
 * inactive chronic gastritis (changed 2026-09-10; fixtures 01, 05 and 06 re-captured).
 */
export function isNormal(s) {
  return !present(s.chronic) && !present(s.activity) && !hpPresent(s.hp) && s.follicles !== 'Present'
    && !present(s.atrophy) && s.ulcer !== 'Present' && !present(s.imDegree) && (s.dysplasia === 'Absent' || !s.dysplasia);
}

export function diagnosis(part, ctx) {
  const s = part.values;
  const parsed = ctx.prepared.sites;
  const verbatimSite = parsed[part.label] ? parsed[part.label] : (s.specimenName || mappedSite(s) || 'stomach');
  const site = low(verbatimSite);
  let line = `(${part.label}) ${ctx.schema.organ}, ${site}, ${ctx.schema.specimenNoun} - `;
  if (isNormal(s)) return `${line}NO SIGNIFICANT ABNORMALITY, Helicobacter-negative`;
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
    extras.push(`${low(s.imDegree)} INTESTINAL METAPLASIA${imQualifier(s)}`);
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

export default { prepare, specimens, specimenName, microscopy, diagnosis, summary, flags };
