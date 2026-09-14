// Prostate needle core biopsy generator. Pure functions: (part, ctx) -> string.
// Per-part Gleason score with ISUP Grade Group, cores positive, extent, cribriform,
// IDC-P, PNI, EPE; case summary with the highest grade and cores involved.
// Wording is protected by tests/prostate.test.js — change it only deliberately.

const low = (v) => String(v || '').trim().toLowerCase();
const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));

/** ISUP 2014 / WHO 2022 Grade Group for a primary + secondary pattern. */
export function gradeGroup(primary, secondary) {
  const p = parseInt(primary, 10);
  const s = parseInt(secondary, 10);
  if (![3, 4, 5].includes(p) || ![3, 4, 5].includes(s)) return null;
  const score = p + s;
  if (score === 6) return 1;
  if (score === 7) return p === 3 ? 2 : 3;
  if (score === 8) return 4;
  return 5;
}

/** "3+4=7 (Grade Group 2)" */
export function gleasonText(primary, secondary) {
  const gg = gradeGroup(primary, secondary);
  if (gg === null) return '';
  return `${primary}+${secondary}=${parseInt(primary, 10) + parseInt(secondary, 10)} (Grade Group ${gg})`;
}

/**
 * The specimen block line. A pasted part with no laterality or zone ("Prostate, transperineal
 * biopsy") has no Site, so the line names the specimen itself rather than reading "Part D".
 */
export function specimenName(part, ctx) {
  const named = String(part.values.specimenName || '').trim();
  if (named) return named;
  if (ctx?.schema?.organ) {
    const organ = low(ctx.schema.organ).replace(/^[a-z]/, (c) => c.toUpperCase());
    return `${organ}, ${ctx.schema.specimenNoun}`;
  }
  return `Part ${part.label}`;
}

/**
 * The site as the diagnosis line says it. A pasted specimen with no laterality or zone
 * ("Prostate, transperineal biopsy") leaves Site empty; the line then reads
 * "(A) PROSTATE, needle core biopsy - …" rather than naming the part twice.
 */
function siteClause(part) {
  const site = String(part.values.specimenName || '').trim();
  return site ? `${low(site)}, ` : '';
}

const isCa = (part) => part.values.category === 'Adenocarcinoma';

function coreCount(part) {
  const n = num(part.values.coresTotal);
  return n === null || n < 1 ? 1 : Math.round(n);
}

function coresPositive(part) {
  const total = coreCount(part);
  const n = num(part.values.coresPositive);
  if (n === null) return Math.min(1, total);
  return Math.max(0, Math.min(Math.round(n), total));
}

export function microscopy(part) {
  const s = part.values;
  const total = coreCount(part);
  const named = String(s.specimenName || '').trim();
  const head = `(${part.label}) ${named ? `${named}, ` : ''}${total} ${total === 1 ? 'core' : 'cores'}`;
  const lines = [head];
  if (isCa(part)) {
    lines.push('- Diagnosis: Acinar adenocarcinoma');
    lines.push(`- Gleason score: ${gleasonText(s.primary, s.secondary)}${s.tertiary5 === 'Present' ? ', minor pattern 5 present' : ''}`);
    const pct = num(s.pct45);
    if (pct !== null) lines.push(`- Pattern 4/5: ${fmt(pct)}%`);
    lines.push(`- Cribriform pattern 4: ${s.cribriform}`);
    lines.push(`- Intraductal carcinoma: ${s.idcp}`);
    lines.push(`- Cores involved: ${coresPositive(part)} of ${total}`);
    const mm = num(s.extentMm);
    if (mm !== null) lines.push(`- Maximum linear extent: ${fmt(mm)} mm`);
    const pt = num(s.pctTissue);
    if (pt !== null) lines.push(`- Tissue involved: ${fmt(pt)}%`);
    lines.push(`- Perineural invasion: ${s.pni}`);
    lines.push(`- Extraprostatic extension: ${s.epe}`);
    lines.push(`- Lymphovascular invasion: ${s.lvi}`);
    lines.push(`- Adjacent high grade PIN: ${s.hgpinAdjacent}`);
  } else {
    if (s.category === 'Benign') {
      const coreText = total === 1 ? 'a core' : `${total} cores`;
      lines.push(`Sections show ${coreText} of prostatic tissue containing prostatic glands within a fibromuscular stroma. They are lined by a layer of epithelial cells and basal cells. There is no evidence of high grade prostatic intraepithelial neoplasia or malignancy.`);
      if (s.inflammation && s.inflammation !== 'Absent') lines.push(`- Inflammation: ${s.inflammation}`);
      if (s.atrophy && s.atrophy !== 'Absent') lines.push(`- Other benign changes: ${s.atrophy}`);
    } else {
      const label = { HGPIN: 'High grade prostatic intraepithelial neoplasia', ASAP: 'Atypical small acinar proliferation' }[s.category] || s.category;
      lines.push(`- Diagnosis: ${label}`);
      lines.push(`- Inflammation: ${s.inflammation || 'Absent'}`);
      lines.push(`- Other benign changes: ${s.atrophy || 'Absent'}`);
    }
  }
  const note = (s.additionalNotes || '').trim();
  if (note !== '') lines.push(`- Additional notes: ${note}`);
  return lines.join('\n');
}

function benignQualifier(s) {
  const bits = [];
  if (s.inflammation && s.inflammation !== 'Absent') bits.push(`${low(s.inflammation)} inflammation`);
  if (s.atrophy && s.atrophy !== 'Absent') bits.push(low(s.atrophy));
  return bits.length ? ` with ${bits.join(' and ')}` : '';
}

export function diagnosis(part, ctx) {
  const s = part.values;
  let line = `(${part.label}) ${ctx.schema.organ}, ${siteClause(part)}${ctx.schema.specimenNoun} - `;
  if (s.category === 'Benign') {
    return line + 'NO EVIDENCE OF MALIGNANCY';
  }
  if (s.category === 'HGPIN') {
    return line + `HIGH GRADE PROSTATIC INTRAEPITHELIAL NEOPLASIA${benignQualifier(s)}, no evidence of invasive malignancy`;
  }
  if (s.category === 'ASAP') {
    return line + 'ATYPICAL SMALL ACINAR PROLIFERATION, suspicious for but not diagnostic of adenocarcinoma';
  }
  const total = coreCount(part);
  const pos = coresPositive(part);
  line += `ACINAR ADENOCARCINOMA, Gleason score ${gleasonText(s.primary, s.secondary)}`;
  const pct = num(s.pct45);
  if (pct !== null) line += `, pattern 4/5 ${fmt(pct)}%`;
  line += `, involving ${pos} of ${total} ${total === 1 ? 'core' : 'cores'}`;
  const mm = num(s.extentMm);
  if (mm !== null) line += `, maximum linear extent ${fmt(mm)} mm`;
  const pt = num(s.pctTissue);
  if (pt !== null) line += `, ${fmt(pt)}% of tissue`;
  const extras = [];
  if (s.tertiary5 === 'Present') extras.push('minor pattern 5 present');
  if (s.cribriform === 'Present') extras.push('cribriform pattern present');
  if (s.idcp === 'Present') extras.push('intraductal carcinoma present');
  if (s.pni === 'Present') extras.push('perineural invasion present');
  if (s.epe === 'Present') extras.push('extraprostatic extension present');
  if (s.lvi === 'Present') extras.push('lymphovascular invasion present');
  if (s.hgpinAdjacent === 'Present') extras.push('adjacent high grade PIN');
  if (extras.length) line += '; ' + extras.join('; ');
  return line;
}

/** Case summary: cores positive, highest grade, adverse features, ASAP / HGPIN parts. */
export function summary(parts, ctx) {
  if (ctx.options.summary === false || parts.length < 2) return '';
  const totalCores = parts.reduce((n, p) => n + coreCount(p), 0);
  const ca = parts.filter(isCa);
  const asap = parts.filter((p) => p.values.category === 'ASAP').map((p) => p.label);
  const hgpin = parts.filter((p) => p.values.category === 'HGPIN').map((p) => p.label);
  const multi = parts.length > 1;
  const partsWord = (labels) => (labels.length === 1 ? `part ${labels[0]}` : `parts ${labels.join(', ')}`);
  const inParts = (labels) => (multi ? ` (${partsWord(labels)})` : '');
  const bits = [];
  if (ca.length) {
    const pos = ca.reduce((n, p) => n + coresPositive(p), 0);
    let best = null;
    for (const p of ca) {
      const gg = gradeGroup(p.values.primary, p.values.secondary);
      const score = parseInt(p.values.primary, 10) + parseInt(p.values.secondary, 10);
      if (!best || gg > best.gg || (gg === best.gg && score > best.score)) best = { gg, score, p };
    }
    bits.push(`Acinar adenocarcinoma in ${pos} of ${totalCores} ${totalCores === 1 ? 'core' : 'cores'}${inParts(ca.map((p) => p.label))}`);
    if (best) bits.push(`highest Gleason score ${gleasonText(best.p.values.primary, best.p.values.secondary)}`);
    if (ca.some((p) => p.values.cribriform === 'Present')) bits.push('cribriform pattern present');
    if (ca.some((p) => p.values.idcp === 'Present')) bits.push('intraductal carcinoma present');
    if (ca.some((p) => p.values.pni === 'Present')) bits.push('perineural invasion present');
    if (ca.some((p) => p.values.epe === 'Present')) bits.push('extraprostatic extension present');
    if (ca.some((p) => p.values.lvi === 'Present')) bits.push('lymphovascular invasion present');
  } else {
    bits.push(`No evidence of malignancy in ${totalCores} ${totalCores === 1 ? 'core' : 'cores'}`);
  }
  if (asap.length) bits.push(multi ? `ASAP in ${partsWord(asap)}` : 'ASAP present');
  if (hgpin.length) bits.push(multi ? `high grade PIN in ${partsWord(hgpin)}` : 'high grade PIN present');
  return `SUMMARY: ${bits.join('; ')}.`;
}

export default { specimenName, microscopy, diagnosis, summary };
