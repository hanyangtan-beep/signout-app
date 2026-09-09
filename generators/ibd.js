// IBD biopsy series generator. Pure functions: (part, ctx) -> string.
// Per-site chronicity / activity classification, optional Nancy index, and a
// case summary describing distribution and the favoured IBD pattern.
// Wording is protected by tests/ibd.test.js — change it only deliberately.

const low = (v) => String(v || '').trim().toLowerCase();

export const COLON_ORDER = ['Caecum', 'Ascending colon', 'Hepatic flexure', 'Transverse colon', 'Splenic flexure', 'Descending colon', 'Sigmoid colon', 'Rectosigmoid', 'Rectum'];
const ILEAL = ['Terminal ileum', 'Ileocaecal valve'];

export const isIleal = (site) => ILEAL.includes(site);

/** Organ + site fragment for the diagnosis line, e.g. "COLON, sigmoid colon" or "TERMINAL ILEUM". */
export function organPhrase(site) {
  if (site === 'Terminal ileum') return 'TERMINAL ILEUM';
  if (site === 'Ileocaecal valve') return 'ILEOCAECAL VALVE';
  if (site === 'Rectum') return 'RECTUM';
  if (site === 'Random colon') return 'COLON, random';
  return `COLON, ${low(site)}`;
}

/** The "-itis" noun for a site. */
export function itisNoun(site) {
  if (site === 'Terminal ileum') return 'ILEITIS';
  if (site === 'Rectum') return 'PROCTITIS';
  return 'COLITIS';
}

/** Chronicity markers: crypt distortion, basal plasmacytosis, Paneth / pyloric metaplasia. */
export function isChronic(v) {
  return (v.distortion && v.distortion !== 'Absent') || (v.basalPlasma && v.basalPlasma !== 'Absent') || (v.metaplasia && v.metaplasia !== 'Absent');
}
export const isActive = (v) => !!v.activity && v.activity !== 'Absent';
const chronicRaised = (v) => ['Mild', 'Moderate', 'Marked'].includes(v.chronic);

/** Nancy histological index (0-4) derived from the activity and chronic inflammation grades. */
export function nancyIndex(v) {
  if (v.activity === 'Severe') return 4;
  if (v.activity === 'Moderate') return 3;
  if (v.activity === 'Mild') return 2;
  if (['Moderate', 'Marked'].includes(v.chronic)) return 1;
  return 0;
}

export function specimenName(part) {
  return part.values.site || `Part ${part.label}`;
}

export function microscopy(part, ctx) {
  const v = part.values;
  const lines = [`(${part.label}) ${specimenName(part)}`];
  if (isIleal(v.site)) lines.push(`- Villous architecture: ${v.villi || 'Preserved'}`);
  lines.push(`- Crypt architectural distortion: ${v.distortion}`);
  lines.push(`- Basal plasmacytosis: ${v.basalPlasma}`);
  lines.push(`- Lamina propria chronic inflammation: ${v.chronic}`);
  lines.push(`- Activity: ${v.activity}`);
  lines.push(`- Granulomas: ${v.granulomas}`);
  lines.push(`- Metaplasia: ${v.metaplasia}`);
  lines.push(`- Dysplasia: ${v.dysplasia}`);
  if (ctx?.options?.nancy) lines.push(`- Nancy histological index: ${nancyIndex(v)}`);
  const note = (v.additionalNotes || '').trim();
  if (note !== '') lines.push(`- Additional notes: ${note}`);
  return lines.join('\n');
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const noun = itisNoun(v.site);
  const chronic = isChronic(v);
  const active = isActive(v);
  let line = `(${part.label}) ${organPhrase(v.site)}, ${ctx.schema.specimenNoun} - `;
  if (chronic && active) line += `CHRONIC ACTIVE ${noun}, ${low(v.activity)} activity`;
  else if (chronic) line += `CHRONIC INACTIVE ${noun}`;
  else if (active) line += `ACTIVE ${noun}, ${low(v.activity)}, without features of chronicity`;
  else if (chronicRaised(v)) line += 'NON-SPECIFIC INCREASE IN LAMINA PROPRIA CHRONIC INFLAMMATION, no crypt architectural distortion or activity';
  else line += `NO SIGNIFICANT HISTOLOGICAL ABNORMALITY, no evidence of active or chronic ${low(noun)}`;
  const withs = [];
  if (v.activity === 'Severe') withs.push('erosion / ulceration');
  if (v.granulomas === 'Crypt-rupture associated') withs.push('crypt-rupture associated granuloma(s)');
  if (v.granulomas === 'Present, not crypt-associated') withs.push('non-crypt-associated epithelioid granuloma(s)');
  if (isIleal(v.site) && v.villi === 'Blunted') withs.push('villous blunting');
  if (withs.length) line += `, with ${joinList(withs)}`;
  if (v.dysplasia && v.dysplasia !== 'No dysplasia') line += `; ${v.dysplasia.toUpperCase()}`;
  return line;
}

function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Distribution summary and favoured IBD pattern. */
export function summary(parts, ctx) {
  if (ctx.options.summary === false || parts.length < 2) return '';
  const vals = parts.map((p) => p.values);
  const colon = vals.filter((v) => !isIleal(v.site));
  const ileal = vals.filter((v) => isIleal(v.site));
  const chronicColon = colon.filter(isChronic);
  const activeOnly = colon.filter((v) => !isChronic(v) && isActive(v));
  const chronicIleum = ileal.filter(isChronic);
  const granNonCrypt = vals.some((v) => v.granulomas === 'Present, not crypt-associated');
  const dysplastic = vals.filter((v) => v.dysplasia && v.dysplasia !== 'No dysplasia');
  const siteNames = (list) => joinList(list.map((v) => low(v.site)));
  const bits = [];

  if (chronicColon.length) {
    const anyActive = chronicColon.some(isActive);
    // Continuity among the sampled colonic sites, in anatomical order.
    const ordered = colon.filter((v) => COLON_ORDER.includes(v.site)).sort((a, b) => COLON_ORDER.indexOf(a.site) - COLON_ORDER.indexOf(b.site));
    const idx = ordered.map((v, i) => (isChronic(v) ? i : -1)).filter((i) => i >= 0);
    const contiguous = idx.length > 0 && idx[idx.length - 1] - idx[0] + 1 === idx.length;
    const rectumSampled = colon.some((v) => v.site === 'Rectum');
    const rectumInvolved = colon.some((v) => v.site === 'Rectum' && isChronic(v));
    const rectalSparing = rectumSampled && !rectumInvolved;
    const allSampledInvolved = chronicColon.length === colon.length;

    let where;
    if (allSampledInvolved && colon.length > 1) where = `all sampled colonic sites (${siteNames(ordered.length ? ordered : colon)})`;
    else if (contiguous && idx.length > 1) where = `the ${low(ordered[idx[0]].site)} to the ${low(ordered[idx[idx.length - 1]].site)}`;
    else where = `the ${siteNames(chronicColon)}`;
    let pattern = '';
    if (colon.length > 1) {
      pattern = contiguous || allSampledInvolved ? ', in a continuous distribution' : ', in a discontinuous (patchy) distribution';
      if (rectumSampled) pattern += rectumInvolved ? ' with rectal involvement' : ' with rectal sparing';
    }
    bits.push(`Chronic ${anyActive ? 'active ' : 'inactive '}colitis involving ${where}${pattern}`);

    const spared = colon.filter((v) => !isChronic(v) && !isActive(v));
    if (spared.length) bits.push(`${siteNames(spared)} without chronicity or activity`);
    if (ileal.length) bits.push(chronicIleum.length ? `chronic ${chronicIleum.some(isActive) ? 'active ' : ''}ileitis` : 'terminal ileum without significant abnormality');
    bits.push(granNonCrypt ? 'non-crypt-associated granulomas present' : 'no non-crypt-associated granulomas');
    bits.push(dysplastic.length ? `${low(dysplastic[0].dysplasia)} in the ${siteNames(dysplastic)}` : 'no dysplasia');

    let crohn = 0;
    if (granNonCrypt) crohn += 2;
    if (!contiguous && idx.length > 1) crohn += 1;
    if (rectalSparing) crohn += 1;
    if (chronicIleum.length) crohn += 1;
    let verdict;
    if (crohn >= 2) verdict = 'the features favour Crohn\'s disease';
    else if (crohn === 1) verdict = 'the distribution is not specific for ulcerative colitis or Crohn\'s disease';
    else if (colon.length > 1) verdict = 'the distribution favours ulcerative colitis';
    else verdict = 'the pattern cannot be assigned on a single site';
    return `SUMMARY: ${bits.join('; ')}. The features are those of chronic idiopathic inflammatory bowel disease; ${verdict}.`;
  }

  if (activeOnly.length) {
    bits.push(`Active colitis without features of chronicity involving the ${siteNames(activeOnly)}`);
    if (chronicIleum.length) bits.push('chronic ileitis');
    bits.push(dysplastic.length ? `${low(dysplastic[0].dysplasia)} in the ${siteNames(dysplastic)}` : 'no dysplasia');
    return `SUMMARY: ${bits.join('; ')}. The pattern may represent an infective or early-phase colitis; established inflammatory bowel disease is not demonstrated.`;
  }

  if (chronicIleum.length) {
    bits.push(`Chronic ${chronicIleum.some(isActive) ? 'active ' : ''}ileitis with no chronic colitis in the ${colon.length} colonic ${colon.length === 1 ? 'site' : 'sites'} sampled`);
    if (granNonCrypt) bits.push('non-crypt-associated granulomas present');
    bits.push(dysplastic.length ? `${low(dysplastic[0].dysplasia)} in the ${siteNames(dysplastic)}` : 'no dysplasia');
    return `SUMMARY: ${bits.join('; ')}.`;
  }

  const n = vals.length;
  bits.push(`No histological evidence of chronic or active colitis in the ${n} ${n === 1 ? 'site' : 'sites'} sampled`);
  bits.push(dysplastic.length ? `${low(dysplastic[0].dysplasia)} in the ${siteNames(dysplastic)}` : 'no dysplasia');
  return `SUMMARY: ${bits.join('; ')}.`;
}

export default { specimenName, microscopy, diagnosis, summary };
