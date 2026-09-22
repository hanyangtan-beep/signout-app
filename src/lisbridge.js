// LIS clipboard bridge. The LIS is a Citrix published application (ahk_class "Transparent Windows
// Client", ahk_exe wfica32.exe), so it has no controls a local script can read or write: Window Spy
// reports no ClassNN because the window is a picture of a screen drawn on a server. The clipboard is
// therefore the only channel, and it was measured working in both directions (docs/specs/lis-bridge.md).
//
// Both directions carry ONE payload holding every block, each under a marker line. The app splits it
// on the way in and assembles it on the way out; tools/lis-bridge.ahk splits the same markers on the
// LIS side. The format lives here and nowhere else — a change here needs the same change to the
// MARKER pattern at the top of that script, or the two ends stop agreeing.
//
//   buildPayload(out, keys)  -> "<<<DIAGNOSIS>>>\n…" for the report blocks that have text
//   parseHarvest(text)       -> { fields, found, unknown, marked } for a paste coming back
//
// Markers are plain text on their own line rather than a control character or a rare punctuation
// run: the Citrix clipboard is a text channel of unknown fidelity, and a marker you can read in
// Notepad is one you can debug when a field arrives empty.

import { BLOCK_ORDER, HEADERS } from './engine.js';

export const MARK_OPEN = '<<<';
export const MARK_CLOSE = '>>>';

/** The marker line for one key: marker('diagnosis') -> "<<<DIAGNOSIS>>>". */
export function marker(key) {
  return `${MARK_OPEN}${String(key).toUpperCase().replace(/[^A-Z0-9]+/g, '')}${MARK_CLOSE}`;
}

/** A line that is nothing but a marker. Tolerates surrounding space the clipboard may add. */
const MARKER_LINE = /^[ \t]*<<<[ \t]*([A-Za-z][A-Za-z0-9 _-]*?)[ \t]*>>>[ \t]*$/;

/** Marker key -> the case meta field it fills. Several spellings reach the same box so the script
 *  and a hand-typed payload can both be read; MACRO and MACROSCOPIC are the same field. */
export const HARVEST_FIELDS = {
  SPECIMEN: 'specimen',
  SPECIMENS: 'specimen',
  HISTORY: 'clinical',
  CLINICAL: 'clinical',
  CLINICALHISTORY: 'clinical',
  MACRO: 'macro',
  MACROSCOPIC: 'macro',
  GROSS: 'macro',
  BLOCKKEY: 'blockKey',
  BLOCKS: 'blockKey',
};

/** Report block keys the write-back can carry, in report order. */
export const PAYLOAD_KEYS = BLOCK_ORDER;

/** The order an unmarked capture fills the boxes: the order they are read out of the LIS. */
export const CAPTURE_ORDER = ['specimen', 'clinical', 'macro', 'blockKey'];

/**
 * Which box an unmarked paste should fill: the first one still empty, in CAPTURE_ORDER. One copy in
 * the LIS then one click here, four times over, without choosing a destination each time. Returns ''
 * when every box already holds text, which the caller reports rather than overwriting silently.
 *
 * @param {object} meta case meta
 * @param {string[]} [order]
 * @returns {string} meta key, or '' when there is no empty box left
 */
export function nextCaptureTarget(meta, order = CAPTURE_ORDER) {
  for (const key of order) if (!String(meta?.[key] || '').trim()) return key;
  return '';
}

/** Normalised lookup key: "Block Key" and "blockKey" both become BLOCKKEY. */
function normKey(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

/** Trailing blank lines off, leading blank lines off, Windows line endings left alone elsewhere. */
function trimBlock(text) {
  return String(text || '').replace(/^[\r\n]+/, '').replace(/\s+$/, '');
}

/**
 * The write-back payload: one marker line per block that has text, then the text, blocks separated
 * by a blank line. Empty blocks are skipped entirely rather than emitted empty, so the script's
 * field walk does not have to guess whether a silent block means "nothing to say" or "not generated".
 *
 * @param {object} out engine output, keyed by BLOCK_ORDER
 * @param {string[]} [keys] blocks to include, defaulting to every block in report order
 * @returns {string}
 */
export function buildPayload(out, keys = PAYLOAD_KEYS) {
  const chunks = [];
  for (const key of keys) {
    const text = trimBlock(out?.[key]);
    if (!text) continue;
    chunks.push(`${marker(key)}\n${text}`);
  }
  return chunks.join('\n\n');
}

/** The blocks buildPayload would emit, for telling the user what is on the clipboard. */
export function payloadKeys(out, keys = PAYLOAD_KEYS) {
  return keys.filter((k) => trimBlock(out?.[k]));
}

/** Human label for a block key, from the report headings ("DIAGNOSIS:" -> "Diagnosis"). */
export function payloadLabel(key) {
  const h = HEADERS[key];
  if (!h) return key;
  const s = h.replace(/:$/, '').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Split a harvest paste into the case meta fields.
 *
 * A paste with no marker line at all is not an error: it is the ordinary hand paste the Specimen box
 * has always taken, so it comes back as `marked: false` with the whole text under `specimen` and the
 * existing parseIntake does the rest. Only a marked paste routes to several boxes.
 *
 * Unknown markers are collected rather than dropped silently — a renamed marker on the script side
 * shows up as a warning instead of a field that mysteriously stays empty.
 *
 * @param {string} text
 * @returns {{fields: object, found: string[], unknown: string[], marked: boolean}}
 */
export function parseHarvest(text) {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/);
  const marks = [];
  lines.forEach((line, i) => {
    const m = MARKER_LINE.exec(line);
    if (m) marks.push({ i, key: normKey(m[1]) });
  });

  if (!marks.length) {
    const body = trimBlock(raw);
    return { fields: body ? { specimen: body } : {}, found: [], unknown: [], marked: false };
  }

  const fields = {};
  const found = [];
  const unknown = [];
  marks.forEach((mark, n) => {
    const end = n + 1 < marks.length ? marks[n + 1].i : lines.length;
    const body = trimBlock(lines.slice(mark.i + 1, end).join('\n'));
    const field = HARVEST_FIELDS[mark.key];
    if (!field) { unknown.push(mark.key); return; }
    if (!body) return;
    // A repeated marker appends rather than overwrites: two SPECIMEN blocks are two parts of one list.
    fields[field] = fields[field] ? `${fields[field]}\n${body}` : body;
    if (!found.includes(field)) found.push(field);
  });

  return { fields, found, unknown, marked: true };
}
