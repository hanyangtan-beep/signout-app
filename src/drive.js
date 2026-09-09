// Google Drive / Sheets persistence. Drive is the only store: one Google Doc per case in the
// "Pathology reports" folder and one row per case in the "Sign-out cases" Sheet (case_json).

import { gfetch } from './gauth.js';
import { saveConfig } from './config.js';
import { SHEET_HEADER, normaliseAccession, buildDocText, toSheetRow, fromSheetRow, docUrlFor } from './docformat.js';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';

const q = (obj) => new URLSearchParams(obj).toString();

// ---------- Sheet ----------

/** Find (or create) the case Sheet; caches its id in config. */
export async function ensureSheet(config) {
  if (config.sheetId) return config.sheetId;
  const search = await gfetch(config, `${DRIVE}/files?${q({
    q: `name='${config.sheetName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id,name)', pageSize: '5'
  })}`);
  const { files } = await search.json();
  let id = files?.[0]?.id;
  if (!id) {
    const created = await gfetch(config, `${DRIVE}/files?${q({ fields: 'id' })}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: config.sheetName, mimeType: 'application/vnd.google-apps.spreadsheet', parents: config.folderId ? [config.folderId] : undefined })
    });
    id = (await created.json()).id;
    await gfetch(config, `${SHEETS}/${id}/values/A1:${colLetter(SHEET_HEADER.length)}1?valueInputOption=RAW`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [SHEET_HEADER] })
    });
  }
  saveConfig({ sheetId: id });
  config.sheetId = id;
  return id;
}

function colLetter(n) { return String.fromCharCode(64 + n); }

/** All rows (excluding header) as objects with parsed caseState. */
export async function listCases(config) {
  const id = await ensureSheet(config);
  const res = await gfetch(config, `${SHEETS}/${id}/values/A2:${colLetter(SHEET_HEADER.length)}?majorDimension=ROWS`);
  const { values = [] } = await res.json();
  return values.map((row, i) => ({ rowNumber: i + 2, ...fromSheetRow(row) })).filter((r) => r.accession);
}

async function findRow(config, accession) {
  const id = await ensureSheet(config);
  const res = await gfetch(config, `${SHEETS}/${id}/values/A2:A?majorDimension=COLUMNS`);
  const { values = [[]] } = await res.json();
  const col = values[0] || [];
  const idx = col.findIndex((v) => normaliseAccession(v) === accession);
  return idx === -1 ? null : idx + 2;
}

async function upsertRow(config, caseState, docId, docUrl) {
  const id = await ensureSheet(config);
  const accession = normaliseAccession(caseState.meta?.accession);
  const row = toSheetRow(caseState, docId, docUrl);
  const rowNumber = await findRow(config, accession);
  const last = colLetter(SHEET_HEADER.length);
  if (rowNumber) {
    await gfetch(config, `${SHEETS}/${id}/values/A${rowNumber}:${last}${rowNumber}?valueInputOption=RAW`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] })
    });
    return rowNumber;
  }
  await gfetch(config, `${SHEETS}/${id}/values/A1:${last}1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] })
  });
  return null;
}

// ---------- Doc ----------

function multipart(metadata, text) {
  const boundary = 'signout' + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n--${boundary}--`;
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

/** Create the Doc (text/plain converted to a Google Doc) or replace its content. */
async function writeDoc(config, docId, name, text) {
  if (docId) {
    // Replacing the media on an existing Google Doc re-imports the text as the document body.
    const res = await gfetch(config, `${UPLOAD}/files/${docId}?${q({ uploadType: 'media', fields: 'id' })}`, {
      method: 'PATCH', headers: { 'Content-Type': 'text/plain; charset=UTF-8' }, body: text
    });
    return (await res.json()).id;
  }
  const { body, contentType } = multipart({
    name, mimeType: 'application/vnd.google-apps.document', parents: config.folderId ? [config.folderId] : undefined
  }, text);
  const res = await gfetch(config, `${UPLOAD}/files?${q({ uploadType: 'multipart', fields: 'id' })}`, {
    method: 'POST', headers: { 'Content-Type': contentType }, body
  });
  return (await res.json()).id;
}

// ---------- public API ----------

/**
 * Save a case: Doc in the folder (create or update) + Sheet row upsert.
 * Mutates caseState.drive with { docId, docUrl, savedAt }.
 */
export async function saveCase(config, caseState, out) {
  const accession = normaliseAccession(caseState.meta?.accession);
  if (!accession) throw new Error('Enter an accession number before saving.');
  let docId = caseState.drive?.docId || '';
  if (!docId) {
    // Reuse the Doc recorded in the Sheet for this accession, if any.
    const rows = await listCases(config);
    docId = rows.find((r) => r.accession === accession)?.doc_id || '';
  }
  const text = buildDocText(caseState, out);
  let newId;
  try {
    newId = await writeDoc(config, docId, accession, text);
  } catch (err) {
    if (docId && err.status === 404) newId = await writeDoc(config, '', accession, text); // Doc was deleted; recreate
    else throw err;
  }
  const docUrl = docUrlFor(newId);
  caseState.drive = { docId: newId, docUrl, savedAt: new Date().toISOString() };
  await upsertRow(config, caseState, newId, docUrl);
  return caseState.drive;
}

export async function openCase(config, accession) {
  const rows = await listCases(config);
  const row = rows.find((r) => r.accession === normaliseAccession(accession));
  if (!row?.caseState) throw new Error(`No saved case for ${accession}`);
  row.caseState.drive = { docId: row.doc_id, docUrl: row.doc_url, savedAt: row.updated };
  return row.caseState;
}
