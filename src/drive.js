// Google Drive / Sheets persistence. Drive is the only store: one Google Doc per case in the
// "Pathology reports" folder and one row per case in the "Sign-out cases" Sheet (case_json).

import { gfetch } from './gauth.js';
import { rememberForAccount } from './config.js';
import { SHEET_HEADER, normaliseAccession, buildDocText, toSheetRow, fromSheetRow, docUrlFor, statusOf, withDocStatus } from './docformat.js';

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

// ---------- Rows (docs/specs/speed.md, Phase 79) ----------
//
// A save used to read the whole Sheet, every saved case's JSON included, to find the Doc id, then
// the accession column again to find the row. One read of the accession and Doc id columns (A and
// G) now finds both. A row number seen this session is a hint, not a fact: its accession cell is
// read before the row is written, so a Sheet sorted by hand sends the write to wherever the
// accession is now.

const rowHints = new Map(); // `${sheetId}|${accession}` -> row number seen this session
const hintKey = (sheetId, accession) => `${sheetId}|${accession}`;
const DOC_COL = colLetter(SHEET_HEADER.indexOf('doc_id') + 1); // G
const LAST_COL = colLetter(SHEET_HEADER.length);                // H, the case JSON
const LIST_COL = colLetter(SHEET_HEADER.length - 1);            // G: everything but the case JSON
const STATUS_COL = colLetter(SHEET_HEADER.indexOf('status') + 1); // C

/**
 * Row number and Doc id of an accession, from one read of the accession and Doc id columns.
 * values.batchGet takes the ranges as repeated parameters and returns them in that order
 * (developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet).
 */
async function lookupRow(config, sheetId, accession, api) {
  const ranges = q([['ranges', 'A2:A'], ['ranges', `${DOC_COL}2:${DOC_COL}`], ['majorDimension', 'COLUMNS']]);
  const res = await api(config, `${SHEETS}/${sheetId}/values:batchGet?${ranges}`);
  const { valueRanges = [] } = await res.json();
  const col = valueRanges[0]?.values?.[0] || [];
  const docs = valueRanges[1]?.values?.[0] || [];
  const idx = col.findIndex((v) => normaliseAccession(v) === accession);
  if (idx === -1) { rowHints.delete(hintKey(sheetId, accession)); return { rowNumber: null, docId: '' }; }
  rowHints.set(hintKey(sheetId, accession), idx + 2);
  return { rowNumber: idx + 2, docId: docs[idx] || '' };
}

/** The row that holds this accession now: the hinted one if its cell still says so, else looked up. */
async function placeRow(config, sheetId, accession, api) {
  const hinted = rowHints.get(hintKey(sheetId, accession));
  if (hinted) {
    const res = await api(config, `${SHEETS}/${sheetId}/values/A${hinted}?majorDimension=COLUMNS`);
    const cell = (await res.json())?.values?.[0]?.[0];
    if (normaliseAccession(cell) === accession) return { rowNumber: hinted };
  }
  return lookupRow(config, sheetId, accession, api);
}

/** Write the case's row in place, or append it; the row it went to becomes this session's hint. */
async function writeRow(config, sheetId, rowNumber, row, accession, api) {
  const body = JSON.stringify({ values: [row] });
  if (rowNumber) {
    await api(config, `${SHEETS}/${sheetId}/values/A${rowNumber}:${LAST_COL}${rowNumber}?valueInputOption=RAW`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body
    });
    rowHints.set(hintKey(sheetId, accession), rowNumber);
    return rowNumber;
  }
  const res = await api(config, `${SHEETS}/${sheetId}/values/A1:${LAST_COL}1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body
  });
  // The reply names the range it wrote (updates.updatedRange, e.g. "Sheet1!A12:H12").
  const written = /!\$?[A-Z]+\$?(\d+)/.exec((await res.json().catch(() => null))?.updates?.updatedRange || '');
  if (!written) return null;
  rowHints.set(hintKey(sheetId, accession), Number(written[1]));
  return Number(written[1]);
}

/**
 * The row that holds this accession now, A to H, with its number: one read when the row seen last
 * still holds the accession, else the row is looked up first. null when there is none.
 */
async function readCaseRow(config, sheetId, accession, api) {
  const readRow = async (n) => {
    const res = await api(config, `${SHEETS}/${sheetId}/values/A${n}:${LAST_COL}${n}?majorDimension=ROWS`);
    const values = (await res.json())?.values?.[0];
    const row = values ? fromSheetRow(values) : null;
    return row && normaliseAccession(row.accession) === accession ? { rowNumber: n, ...row } : null;
  };
  const hinted = rowHints.get(hintKey(sheetId, accession));
  const row = hinted ? await readRow(hinted) : null;
  if (row) return row;
  const { rowNumber } = await lookupRow(config, sheetId, accession, api);
  return rowNumber ? readRow(rowNumber) : null;
}

/** Every saved case for the Open list: columns A to G, without the case JSON. */
export async function listCases(config, api = gfetch) {
  const id = await ensureSheet(config, api);
  const res = await api(config, `${SHEETS}/${id}/values/A2:${LIST_COL}?majorDimension=ROWS`);
  const { values = [] } = await res.json();
  const rows = values.map((row, i) => ({ rowNumber: i + 2, ...fromSheetRow(row) })).filter((r) => r.accession);
  for (const r of rows) rowHints.set(hintKey(id, normaliseAccession(r.accession)), r.rowNumber);
  return rows;
}

// ---------- Doc ----------

function multipart(metadata, text) {
  const boundary = 'signout' + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n--${boundary}--`;
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

/**
 * Create the Doc (text/plain converted to a Google Doc) or replace its content. A new Doc goes in
 * `folderId` when the caller has already checked the folder, else the folder is checked here.
 */
async function writeDoc(config, docId, name, text, api = gfetch, folderId = '') {
  if (docId) {
    // Replacing the media on an existing Google Doc re-imports the text as the document body.
    const res = await api(config, `${UPLOAD}/files/${docId}?${q({ uploadType: 'media', fields: 'id' })}`, {
      method: 'PATCH', headers: { 'Content-Type': 'text/plain; charset=UTF-8' }, body: text
    });
    return (await res.json()).id;
  }
  const parent = folderId || await ensureFolder(config, api);
  const { body, contentType } = multipart({
    name, mimeType: 'application/vnd.google-apps.document', parents: parent ? [parent] : undefined
  }, text);
  const res = await api(config, `${UPLOAD}/files?${q({ uploadType: 'multipart', fields: 'id' })}`, {
    method: 'POST', headers: { 'Content-Type': contentType }, body
  });
  return (await res.json()).id;
}

/** writeDoc, recreating the Doc when the one on record was deleted. */
async function writeDocOrRecreate(config, docId, name, text, api, folderId = '') {
  try {
    return await writeDoc(config, docId, name, text, api, folderId);
  } catch (err) {
    if (docId && err.status === 404) return writeDoc(config, '', name, text, api, folderId); // Doc was deleted; recreate
    throw err;
  }
}

// ---------- public API ----------

/**
 * Save a case: Doc in the folder (create or update) + Sheet row upsert. The row is written only
 * once the Doc is, as before; what changed is what runs alongside (docs/specs/speed.md):
 *   case new to this tab: look up the row and Doc id | check the folder, then the Doc, then the row
 *     (three rounds of calls, where there were five);
 *   re-save: the Doc | the row's accession cell, then the row (two rounds, where there were three).
 * Mutates caseState.drive with { docId, docUrl, savedAt }.
 */
export async function saveCase(config, caseState, out, api = gfetch) {
  const accession = normaliseAccession(caseState.meta?.accession);
  if (!accession) throw new Error('Enter an accession number before saving.');
  const sheetId = await ensureSheet(config, api);
  const text = buildDocText(caseState, out);
  const known = caseState.drive?.docId || '';
  let docId;
  let placed;
  if (known) {
    [docId, placed] = await Promise.all([
      writeDocOrRecreate(config, known, accession, text, api),
      placeRow(config, sheetId, accession, api)
    ]);
  } else {
    // Reuse the Doc recorded in the Sheet for this accession, if any; the folder is checked alongside.
    const [found, folderId] = await Promise.all([lookupRow(config, sheetId, accession, api), ensureFolder(config, api)]);
    placed = found;
    docId = await writeDocOrRecreate(config, found.docId, accession, text, api, folderId);
  }
  const docUrl = docUrlFor(docId);
  caseState.drive = { docId, docUrl, savedAt: new Date().toISOString() };
  await writeRow(config, sheetId, placed.rowNumber, toSheetRow(caseState, docId, docUrl), accession, api);
  return caseState.drive;
}

/**
 * One saved case, from its own row (A to H): one read when the Open list has just seen the row and
 * it still holds the accession, else the row is looked up first. The status is the row's status
 * column, which the Open list shows and changes, when it holds one (docs/specs/open-status.md).
 */
export async function openCase(config, accession, api = gfetch) {
  const sheetId = await ensureSheet(config, api);
  const row = await readCaseRow(config, sheetId, normaliseAccession(accession), api);
  if (!row?.caseState) throw new Error(`No saved case for ${accession}`);
  const status = statusOf(row.status);
  if (status) row.caseState.meta = { ...(row.caseState.meta || {}), status };
  row.caseState.drive = { docId: row.doc_id, docUrl: row.doc_url, savedAt: row.updated };
  return row.caseState;
}

/** A Google Doc's text (files.export as text/plain), or null when it cannot be read. */
async function readDocText(config, docId, api) {
  if (!docId) return null;
  try {
    const res = await api(config, `${DRIVE}/files/${docId}/export?${q({ mimeType: 'text/plain' })}`);
    return await res.text();
  } catch { return null; }
}

/**
 * Change a saved case's status from the Open list (user request 2026-10-27,
 * docs/specs/open-status.md). The row, its accession checked, and the Doc's text are read
 * together; the status column and the saved case are written in one values.batchUpdate
 * (developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate),
 * and only then the Doc: its own text as files.export gives it
 * (developers.google.com/workspace/drive/api/reference/rest/v3/files/export), with the status
 * word in its last line changed. The row's saved time is left alone, so the list keeps its order.
 * `docId` is the Doc the list showed; a row that names another has that one changed.
 * Resolves to { status, doc }, doc being 'updated', 'current' (it already said so), 'none' (no Doc
 * on record), 'no-line' (no status line to change) or 'failed' (not read or not written).
 */
export async function setCaseStatus(config, accession, status, docId = '', api = gfetch) {
  const next = statusOf(status);
  if (!next) throw new Error(`Not a status: ${status}`);
  const sheetId = await ensureSheet(config, api);
  const [row, listed] = await Promise.all([
    readCaseRow(config, sheetId, normaliseAccession(accession), api),
    readDocText(config, docId, api)
  ]);
  if (!row) throw new Error(`No saved case for ${accession}`);
  const data = [{ range: `${STATUS_COL}${row.rowNumber}`, values: [[next]] }];
  if (row.caseState) {
    row.caseState.meta = { ...(row.caseState.meta || {}), status: next };
    data.push({ range: `${LAST_COL}${row.rowNumber}`, values: [[JSON.stringify(row.caseState)]] });
  }
  await api(config, `${SHEETS}/${sheetId}/values:batchUpdate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'RAW', data })
  });
  const doc = row.doc_id || docId;
  if (!doc) return { status: next, doc: 'none' };
  const text = doc === docId ? listed : await readDocText(config, doc, api);
  if (text === null) return { status: next, doc: 'failed' };
  const changed = withDocStatus(text, next);
  if (!changed.found) return { status: next, doc: 'no-line' };
  if (changed.text === null) return { status: next, doc: 'current' };
  try {
    await api(config, `${UPLOAD}/files/${doc}?${q({ uploadType: 'media', fields: 'id' })}`, {
      method: 'PATCH', headers: { 'Content-Type': 'text/plain; charset=UTF-8' }, body: changed.text
    });
    return { status: next, doc: 'updated' };
  } catch { return { status: next, doc: 'failed' }; }
}
