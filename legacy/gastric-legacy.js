// Pure-function extraction of the report logic in legacy/gastric-biopsy-signout-v8.html.
// The bodies of buildMicroscopy, parseSitesFromSpecimens and buildDiagnosis are copied
// verbatim from the HTML; only DOM access has been replaced by explicit arguments.
// Do not "improve" wording here — this file is the frozen reference for golden tests.

const SITE_TYPES = ['Pyloric type', 'Body type', 'Cardiac type', 'Superficial gastric mucosa', 'Indeterminate'];
const GRADES = ['Absent', 'Mild', 'Moderate', 'Marked'];
const PRESENCE = ['Absent', 'Present'];
const IM_TYPES = ['', 'Complete', 'Incomplete'];
const DYSPLASIA = ['Absent', 'Indefinite for dysplasia', 'Low grade dysplasia', 'High grade dysplasia', 'Intramucosal carcinoma', 'Malignancy present'];
const HP = ['Absent', 'Low density', 'Moderate density', 'High density'];

function low(v) { return String(v || '').trim().toLowerCase(); }
function present(v) { return v && v !== 'Absent'; }
function hpPresent(v) { return v !== 'Absent'; }

function defaultPart(label, index) {
  return {
    label,
    specimenName: '',
    siteType: index === 0 ? 'Pyloric type' : 'Body type',
    activity: 'Absent', chronic: 'Absent', follicles: 'Absent', atrophy: 'Absent',
    ulcer: 'Absent', imDegree: 'Absent', imType: '', dysplasia: 'Absent', hp: 'Absent',
    additionalNotes: ''
  };
}

function buildMicroscopy(s) {
  const imText = s.imDegree === 'Absent' ? 'Absent' : (s.imType ? `${s.imDegree} (${low(s.imType)})` : s.imDegree);
  const note = (s.additionalNotes || '').trim();
  const lines = [
    `(${s.label})`,
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

function parseSitesFromSpecimens(text) {
  const out = {};
  const re = /\(([A-D])\)\s*([^\(]+)/gi;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    let site = (m[2] || '').trim();
    site = site.replace(/\s+(and|&)\s*$/i, '').trim();
    site = site.replace(/[;,]+$/g, '').trim();
    if (site) out[m[1].toUpperCase()] = site;
  }
  return out;
}

function buildDiagnosis(s, parsedSites) {
  const verbatimSite = (parsedSites && parsedSites[s.label]) ? parsedSites[s.label] : (s.specimenName || 'stomach');
  const site = low(verbatimSite);
  let line = `(${s.label}) STOMACH, ${site}, biopsy - `;
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

/**
 * Equivalent of generate() in the HTML.
 * @param {{caseTitle: string, parts: object[]}} input  parts = the visible parts only (1-4)
 * @returns {{specimens: string, microscopy: string, diagnosis: string}}
 */
function generate(input) {
  const items = input.parts;
  const caseTitle = input.caseTitle || '';
  const parsedSites = parseSitesFromSpecimens(caseTitle);
  return {
    specimens: caseTitle.trim() || items.map(s => `(${s.label}) ${s.specimenName || ('Part ' + s.label)}`).join(' and '),
    microscopy: items.map(buildMicroscopy).join('\n\n'),
    diagnosis: items.map(s => buildDiagnosis(s, parsedSites)).join('\n')
  };
}

module.exports = {
  SITE_TYPES, GRADES, PRESENCE, IM_TYPES, DYSPLASIA, HP,
  defaultPart, buildMicroscopy, parseSitesFromSpecimens, buildDiagnosis, generate
};
