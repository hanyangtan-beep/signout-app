// Pure helpers shared by the browser Drive layer and the Node tests:
// accession normalisation, PHI guard, Doc text layout, Sheet row mapping.

export const SHEET_HEADER = ['accession', 'updated', 'status', 'template', 'parts', 'doc_url', 'doc_id', 'case_json'];

export const STATUSES = ['draft', 'ready', 'signed'];

/** Uppercase and strip spaces, hyphens, slashes and underscores so "s 25-0012" and "S250012" match the same row. */
export function normaliseAccession(raw) {
  return String(raw || '').toUpperCase().replace(/[\s\-_/]+/g, '').trim();
}

const HKID = /\b[A-Z]{1,2}\s?\d{6}\s?\([\dA]\)/i;            // e.g. A123456(7); the check digit in brackets distinguishes it from an accession like S25-00123
const HONORIFIC = /\b(Mr|Mrs|Ms|Miss|Mdm|Madam)\.?\s+[A-Z][a-z]+/;   // clinicians (Dr …) are allowed, e.g. frozen section phone reports
const PHONE = /\b(\+?852[\s-]?)?[2-9]\d{3}[\s-]?\d{4}\b/;
const DOB = /\b(dob|date of birth|d\.o\.b)\b/i;

/**
 * Returns a list of human-readable warnings if the free text looks like it contains identifiers.
 * Accession numbers and report text are the only content allowed in Drive.
 */
export function phiWarnings(texts) {
  const warnings = [];
  for (const [label, text] of Object.entries(texts)) {
    if (!text) continue;
    if (HKID.test(text)) warnings.push(`${label}: looks like an HKID`);
    if (HONORIFIC.test(text)) warnings.push(`${label}: looks like a patient name (honorific + name)`);
    if (PHONE.test(text)) warnings.push(`${label}: looks like a phone number`);
    if (DOB.test(text)) warnings.push(`${label}: mentions a date of birth`);
  }
  return warnings;
}

/** The Google Doc body. Headings are fixed so the TAT job and Perplexity can parse the draft. */
export function buildDocText(caseState, out) {
  const meta = caseState.meta || {};
  const sections = [
    ['CLINICAL HISTORY', meta.clinical],
    ['SPECIMEN', out.specimens],
    ['MACROSCOPIC DESCRIPTION', meta.macro],
    ['BLOCK KEY', meta.blockKey],
    ['MICROSCOPIC EXAMINATION', out.microscopy],
    ['DIAGNOSIS', out.diagnosis]
  ];
  const lines = [normaliseAccession(meta.accession) || 'UNASSIGNED', ''];
  for (const [title, body] of sections) {
    lines.push(`${title}:`);
    lines.push((body || '').trim() ? body.trim() : '-');
    lines.push('');
  }
  lines.push(`Template: ${caseState.schemaId} v${caseState.schemaVersion || ''} · Status: ${meta.status || 'draft'} · Saved ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  return lines.join('\n');
}

export function toSheetRow(caseState, docId, docUrl, now = new Date()) {
  const meta = caseState.meta || {};
  return [
    normaliseAccession(meta.accession),
    now.toISOString(),
    meta.status || 'draft',
    caseState.schemaId,
    String(caseState.parts.length),
    docUrl || '',
    docId || '',
    JSON.stringify(caseState)
  ];
}

export function fromSheetRow(row) {
  const o = {};
  SHEET_HEADER.forEach((h, i) => { o[h] = row[i] ?? ''; });
  let caseState = null;
  try { caseState = o.case_json ? JSON.parse(o.case_json) : null; } catch { caseState = null; }
  return { ...o, caseState };
}

export function docUrlFor(docId) {
  return docId ? `https://docs.google.com/document/d/${docId}/edit` : '';
}
