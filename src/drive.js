// Google Drive / Sheets persistence. Drive is the only store: one Google Doc per case in the
// "Pathology reports" folder and one row per case in the "Sign-out cases" Sheet (case_json).

import { gfetch } from './gauth.js';
import { rememberForAccount } from './config.js';
import { SHEET_HEADER, normaliseAccession, buildDocText, toSheetRow, fromSheetRow, docUrlFor } from './docformat.js';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';

const q = (obj) => new URLSearchParams(obj).toString();
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const esc = (s) => String(s).replace(/'/g, "\\'");

// ---------- Folder ----------
//
// Every signed-in account works in its own folder. A folder id belongs to whoever created it, so
// the id shipped in the defaults is usable only by that account: under drive.file another
// colleague's token cannot even see it, and writing a Doc into it would fail on the parent. So the
// configured id is probed first, and an account that cannot add children to it gets a folder of
// its own named after `folderName`, remembered under its address.

/** Can this account actually file reports in `id`? A refusal of any kind means no. */
async function folderUsable(config, id, api) {
  try {
    const res = await api(config, `${DRIVE}/files/${id}?${q({ fields: 'id,trashed,mimeType,capabilities(canAddChildren)' })}`);
    const f = await res.json();
    return !!f?.id && f.trashed !== true && f.mimeType === FOLDER_MIME && f.capabilities?.canAddChildren !== false;
  } catch { return false; }
}

/**
 * The folder this account files reports in, created on first use. `api` is injected so the
 * resolution can be tested without a Google session.
 */
export async function ensureFolder(config, api = gfetch) {
  if (config.folderId && await folderUsable(config, config.folderId, api)) return config.folderId;
  const name = config.folderName || 'Pathology reports';
  const search = await api(config, `${DRIVE}/files?${q({
    q: `name='${esc(name)}' and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: 'files(id,name)', pageSize: '5'
  })}`);
  let id = (await search.json())?.files?.[0]?.id;
  if (!id) {
    const created = await api(config, `${DRIVE}/files?${q({ fields: 'id' })}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME })
    });
    id = (await created.json()).id;
  }
  // A folder that is not the configured one is a different account's workspace: the cached Sheet
  // id belongs to the old folder, so it is dropped and looked up again inside the new one.
  if (id !== config.folderId) rememberForAccount(config, { folderId: id, sheetId: '' });
  return id;
}

// ---------- Sheet ----------

/** Find (or create) the case Sheet in this account's folder; caches its id for that account. */
export async function ensureSheet(config, api = gfetch) {
  if (config.sheetId) return config.sheetId;
  const folderId = await ensureFolder(config, api);
  const search = await api(config, `${DRIVE}/files?${q({
    q: `name='${esc(config.sheetName)}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
      + (folderId ? ` and '${esc(folderId)}' in parents` : ''),
    fields: 'files(id,name)', pageSize: '5'
  })}`);
  const { files } = await search.json();
  let id = files?.[0]?.id;
  if (!id) {
    const created = await api(config, `${DRIVE}/files?${q({ fields: 'id' })}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: config.sheetName, mimeType: 'application/vnd.google-apps.spreadsheet', parents: folderId ? [folderId] : undefined })
    });
    id = (await created.json()).id;
    await api(config, `${SHEETS}/${id}/values/A1:${colLetter(SHEET_HEADER.length)}1?valueInputOption=RAW`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [SHEET_HEADER] })
    });
  }
  rememberForAccount(config, { sheetId: id });
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
  const folderId = docId ? '' : await ensureFolder(config);
  if (docId) {
    // Replacing the media on an existing Google Doc re-imports the text as the document body.
    const res = await gfetch(config, `${UPLOAD}/files/${docId}?${q({ uploadType: 'media', fields: 'id' })}`, {
      method: 'PATCH', headers: { 'Content-Type': 'text/plain; charset=UTF-8' }, body: text
    });
    return (await res.json()).id;
  }
  const { body, contentType } = multipart({
    name, mimeType: 'application/vnd.google-apps.document', parents: folderId ? [folderId] : undefined
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
