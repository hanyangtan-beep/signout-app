// LIS clipboard bridge: the marker payload both directions share (src/lisbridge.js).
// The AHK script in tools/lis-bridge.ahk splits on the same markers, so the round-trip test
// below is the contract between the two ends.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  marker, buildPayload, payloadKeys, payloadLabel, parseHarvest,
  nextCaptureTarget, PAYLOAD_KEYS, CAPTURE_ORDER,
} from '../src/lisbridge.js';

test('marker is the uppercase key between angle runs', () => {
  assert.equal(marker('diagnosis'), '<<<DIAGNOSIS>>>');
  assert.equal(marker('blockKey'), '<<<BLOCKKEY>>>');
});

test('payload carries only the blocks that have text, in report order', () => {
  const out = {
    specimens: '(A) Antrum, biopsy.',
    macro: '',
    microscopy: 'Sections show gastric antral mucosa.',
    diagnosis: 'Stomach, antrum, biopsy:\n- Chronic gastritis.',
    comment: '   ',
  };
  const payload = buildPayload(out);
  assert.deepEqual(payloadKeys(out), ['specimens', 'microscopy', 'diagnosis']);
  assert.ok(!payload.includes('<<<MACRO>>>'), 'an empty block is skipped, not emitted empty');
  assert.ok(!payload.includes('<<<COMMENT>>>'), 'whitespace counts as empty');
  assert.ok(payload.indexOf('<<<SPECIMENS>>>') < payload.indexOf('<<<MICROSCOPY>>>'));
  assert.ok(payload.indexOf('<<<MICROSCOPY>>>') < payload.indexOf('<<<DIAGNOSIS>>>'));
});

test('payload keys can be narrowed and reordered by the caller', () => {
  const out = { specimens: 'A', microscopy: 'B', diagnosis: 'C' };
  const payload = buildPayload(out, ['diagnosis', 'microscopy']);
  assert.ok(payload.startsWith('<<<DIAGNOSIS>>>'));
  assert.ok(!payload.includes('<<<SPECIMENS>>>'));
});

test('an empty report gives an empty payload rather than bare markers', () => {
  assert.equal(buildPayload({}), '');
  assert.deepEqual(payloadKeys({}), []);
});

test('block labels read as sentences', () => {
  assert.equal(payloadLabel('diagnosis'), 'Diagnosis');
  assert.equal(payloadLabel('blockKey'), 'Block key');
  assert.equal(payloadLabel('microscopy'), 'Microscopic examination');
});

test('a marked harvest routes each block to its box', () => {
  const text = [
    '<<<SPECIMEN>>>',
    'Antrum',
    '',
    '<<<HISTORY>>>',
    'Epigastric pain. Rule out H. pylori.',
    '',
    '<<<MACRO>>>',
    'Received in formalin are three grey tissue fragments,',
    'the largest measuring 3 mm.',
  ].join('\n');
  const { fields, found, unknown, marked } = parseHarvest(text);
  assert.equal(marked, true);
  assert.deepEqual(unknown, []);
  assert.deepEqual(found, ['specimen', 'clinical', 'macro']);
  assert.equal(fields.specimen, 'Antrum');
  assert.equal(fields.clinical, 'Epigastric pain. Rule out H. pylori.');
  assert.ok(fields.macro.includes('largest measuring 3 mm'), 'a multi-line block keeps its line breaks');
  assert.equal(fields.macro.split('\n').length, 2);
});

test('spelling variants reach the same box', () => {
  for (const key of ['HISTORY', 'CLINICAL', 'Clinical History']) {
    const { fields } = parseHarvest(`<<<${key}>>>\nKnown carcinoma of breast.`);
    assert.equal(fields.clinical, 'Known carcinoma of breast.', `${key} should fill the history box`);
  }
  for (const key of ['MACRO', 'MACROSCOPIC', 'Gross']) {
    const { fields } = parseHarvest(`<<<${key}>>>\nA 12 mm nodule.`);
    assert.equal(fields.macro, 'A 12 mm nodule.', `${key} should fill the macroscopic box`);
  }
});

test('the clipboard may pad a marker line with spaces', () => {
  const { fields, marked } = parseHarvest('   <<< SPECIMEN >>>   \nAntrum');
  assert.equal(marked, true);
  assert.equal(fields.specimen, 'Antrum');
});

test('an unmarked paste is the ordinary Specimen paste it has always been', () => {
  const text = 'History\nFibroids\n\nSpecimen\n(A) Uterus, resection';
  const { fields, marked, found } = parseHarvest(text);
  assert.equal(marked, false);
  assert.deepEqual(found, []);
  assert.equal(fields.specimen, text, 'the whole paste goes to the box parseIntake already reads');
});

test('an unknown marker is reported, not silently dropped', () => {
  const { fields, unknown } = parseHarvest('<<<CYTOLOGY>>>\nSome text\n\n<<<SPECIMEN>>>\nAntrum');
  assert.deepEqual(unknown, ['CYTOLOGY']);
  assert.equal(fields.specimen, 'Antrum', 'the known markers still land');
});

test('an empty block under a marker leaves the box alone', () => {
  const { fields, found } = parseHarvest('<<<SPECIMEN>>>\nAntrum\n\n<<<HISTORY>>>\n\n<<<MACRO>>>\nA nodule.');
  assert.equal(found.includes('clinical'), false, 'a field the LIS had nothing in is not reported as captured');
  assert.equal(fields.clinical, undefined);
  assert.equal(fields.macro, 'A nodule.');
});

test('a repeated marker appends rather than overwrites', () => {
  const { fields } = parseHarvest('<<<SPECIMEN>>>\n(A) Antrum\n\n<<<SPECIMEN>>>\n(B) Body');
  assert.equal(fields.specimen, '(A) Antrum\n(B) Body');
});

test('capture fills the first empty box in read order', () => {
  assert.deepEqual(CAPTURE_ORDER, ['specimen', 'clinical', 'macro', 'blockKey']);
  assert.equal(nextCaptureTarget({}), 'specimen');
  assert.equal(nextCaptureTarget({ specimen: 'Antrum' }), 'clinical');
  assert.equal(nextCaptureTarget({ specimen: 'Antrum', clinical: 'Pain' }), 'macro');
  assert.equal(nextCaptureTarget({ specimen: 'A', clinical: 'B', macro: 'C' }), 'blockKey');
  assert.equal(nextCaptureTarget({ specimen: 'A', clinical: 'B', macro: 'C', blockKey: 'D' }), '');
  assert.equal(nextCaptureTarget({ specimen: '   \n ' }), 'specimen', 'whitespace is an empty box');
});

test('round trip: what the app emits is what a splitter reads back', () => {
  // The AHK script does this split on the LIS side. Keeping it here means a format change that
  // breaks the script breaks a test first.
  const out = {
    specimens: '(A) Antrum, biopsy.',
    microscopy: 'Sections show gastric antral mucosa with chronic inflammation.',
    diagnosis: 'Stomach, antrum, biopsy:\n- Chronic gastritis.\n- No evidence of malignancy.',
  };
  const payload = buildPayload(out);
  const blocks = {};
  let key = '';
  for (const line of payload.split('\n')) {
    const m = /^<<<([A-Z]+)>>>$/.exec(line.trim());
    if (m) { key = m[1]; blocks[key] = []; continue; }
    if (key) blocks[key].push(line);
  }
  assert.deepEqual(Object.keys(blocks), ['SPECIMENS', 'MICROSCOPY', 'DIAGNOSIS']);
  assert.equal(blocks.DIAGNOSIS.join('\n').trim(), out.diagnosis);
  assert.equal(blocks.SPECIMENS.join('\n').trim(), out.specimens);
});

test('every report block key survives a round trip through marker naming', () => {
  for (const key of PAYLOAD_KEYS) {
    const payload = buildPayload({ [key]: 'text' }, [key]);
    const { fields, unknown } = parseHarvest(payload);
    // Report keys are not all harvest keys; the ones that are must land in the right box.
    if (!unknown.length) assert.ok(Object.keys(fields).length === 1, `${key} routed to one box`);
  }
});

// ---------------------------------------------------------------------------------------------
// The AHK script is the other half of the bridge and nothing here can run it. These checks read
// it as text and assert the things that would otherwise only fail on the user's machine.
//
// Written after shipping a script that would not load at all: the settings array was named
// HARVEST and the function below it Harvest(). AutoHotkey names are case-insensitive, so the
// assignment tried to overwrite the function and the launcher refused the file with "This Func
// cannot be used as an output variable". Every JS test passed; the script was dead on arrival.
import { readFileSync } from 'node:fs';

const AHK = readFileSync(new URL('../tools/lis-bridge.ahk', import.meta.url), 'utf8');

const ahkFunctions = () => [...AHK.matchAll(/^([A-Za-z_]\w*)\([^)]*\)\s*\{/gm)].map((m) => m[1]);
const ahkAssigned = () => [...AHK.matchAll(/^\s*([A-Za-z_]\w*)\s*:=/gm)].map((m) => m[1]);
const ahkBody = (name) => {
  const m = new RegExp(`${name}\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`).exec(AHK);
  assert.ok(m, `${name}() not found`);
  return m[1];
};
const ahkSends = (body) => [...body.matchAll(/Send\s+(?:"([^"]+)"|(\w+))/g)].map((m) => m[1] || m[2]);


test('no AHK variable collides with a function name', () => {
  const funcs = new Set(ahkFunctions().map((n) => n.toLowerCase()));
  assert.ok(funcs.size >= 5, `found only ${funcs.size} functions; the parse is wrong, not the file`);
  const clash = ahkAssigned().filter((n) => funcs.has(n.toLowerCase()));
  assert.deepEqual(clash, [], `assigning to these overwrites a function of the same name: ${clash.join(', ')}`);
});

test('every hotkey calls a function that exists', () => {
  const funcs = new Set(ahkFunctions().map((n) => n.toLowerCase()));
  const bound = [...AHK.matchAll(/^\s*[\^!+#]+[a-z]::([A-Za-z_]\w*)\(\)/gm)].map((m) => m[1]);
  assert.ok(bound.length >= 5, `found ${bound.length} hotkeys`);
  for (const fn of bound) assert.ok(funcs.has(fn.toLowerCase()), `hotkey calls ${fn}(), which is not defined`);
});

// FIELDS is the LIS report entry screen, one row per field in Ctrl+] order. It is the only place
// the layout is written down and it drives both directions, so a wrong row misfiles text either
// into the app or into the patient's report. The order itself is a property of the LIS and cannot
// be checked here; what can be checked is that every name resolves and every block has a home.
const screenFields = () => {
  const m = /FIELDS\s*:=\s*\[([\s\S]*?)\]\n/.exec(AHK);
  assert.ok(m, 'the FIELDS table was not found');
  return [...m[1].matchAll(/\{\s*name:\s*"([^"]*)"\s*,\s*get:\s*"([^"]*)"\s*,\s*put:\s*\[([^\]]*)\]\s*\}/g)]
    .map((r) => ({
      name: r[1],
      get: r[2],
      put: [...r[3].matchAll(/"([^"]+)"/g)].map((p) => p[1]),
    }));
};

test('the screen table parses and every field is named', () => {
  const rows = screenFields();
  assert.ok(rows.length >= 5, `parsed only ${rows.length} rows; the table shape changed`);
  for (const [i, r] of rows.entries()) assert.ok(r.name.trim() !== '', `field ${i + 1} has no name`);
});

test('every field read lands in a capture box', () => {
  const gets = screenFields().map((r) => r.get).filter(Boolean);
  assert.ok(gets.length > 0, 'the table reads nothing out of the LIS');
  assert.equal(new Set(gets).size, gets.length, `a read name is repeated: ${gets.join(', ')}`);
  const { fields, unknown } = parseHarvest(gets.map((l) => `<<<${l}>>>\ntext`).join('\n\n'));
  assert.deepEqual(unknown, [], `the script reads markers the app does not know: ${unknown.join(', ')}`);
  assert.equal(Object.keys(fields).length, gets.length, 'two read names collapsed into one box');
  for (const k of Object.keys(fields)) assert.ok(CAPTURE_ORDER.includes(k), `${k} is not a capture box`);
});

test('every report block has exactly one destination field', () => {
  const puts = screenFields().flatMap((r) => r.put);
  const seen = new Set();
  for (const p of puts) {
    assert.ok(!seen.has(p), `${p} is written into two different fields`);
    seen.add(p);
  }
  // The marker the app emits is what the script matches on, so compare against those, not the keys.
  const emitted = PAYLOAD_KEYS.map((k) => marker(k).replace(/[<>]/g, ''));
  for (const p of puts) assert.ok(emitted.includes(p), `nothing in the report is called ${p}`);
  // A block with no destination is silently dropped on the way to the LIS, so every omission has to
  // be deliberate and named. SPECIMENS is read out of the LIS but never written back: that field is
  // the clerical entry the app copied in the first place, and rewriting it in the app's own
  // formatting changes someone else's data for no gain. MOLECULAR (a biomarker report's Molecular
  // findings, 2026-10-08) has no field on the screen FIELDS describes, and the biomarker screen has
  // not been probed, so the fill walk names it for pasting by hand rather than guessing a row.
  const deliberatelyUnwritten = ['SPECIMENS', 'MOLECULAR'];
  const homeless = emitted.filter((e) => !seen.has(e) && !deliberatelyUnwritten.includes(e));
  assert.deepEqual(homeless, [], `these blocks would never reach the LIS: ${homeless.join(', ')}`);
  for (const d of deliberatelyUnwritten) {
    assert.ok(emitted.includes(d), `${d} is not a block the app emits; the exception is stale`);
  }
});

// The fill walk counts Ctrl+] presses from wherever the caret happens to be, so a caret in the
// wrong field puts every block one or more fields out. Checking the destination is empty does NOT
// catch that - on an unreported case the wrong fields are empty too, the check passes, and the
// diagnosis lands in the wrong box. The anchor is the starting field read back and shown to the
// user before anything is typed, so these are the order-sensitive guarantees.
test('the fill walk anchors before it types', () => {
  const body = ahkBody('FillFields');
  const at = (re) => body.search(re);
  const anchorRead = at(/here := ReadField\(/);
  const confirm = at(/MsgBox\(msg/);
  const firstPaste = at(/Send "\^v"/);
  assert.ok(anchorRead > -1, 'the walk must read its starting field as an anchor');
  assert.ok(confirm > -1, 'the walk must be confirmed before it types into a live case');
  assert.ok(firstPaste > -1, 'the walk never pastes');
  assert.ok(anchorRead < confirm, 'the anchor must be read before the dialog, so it can be shown');
  assert.ok(confirm < firstPaste, 'the dialog must come before the first paste');
  // The dialog steals focus; sending keys before the LIS has it back pastes into another window.
  const reactivate = at(/WinWaitActive\(LIS_WIN/);
  assert.ok(reactivate > confirm && reactivate < firstPaste,
    'the LIS must be confirmed active between the dialog and the first paste');
  assert.match(body, /Loop last/, 'the walk must be bounded by the last field it needs');
});

test('the fill walk does not overwrite a field that has text', () => {
  assert.match(AHK, /SKIP_FILLED\s*:=\s*true/, 'must ship leaving existing text alone');
  const body = ahkBody('FillFields');
  assert.match(body, /existing := SKIP_FILLED \? ReadField\(/, 'each destination must be read first');
  assert.match(body, /if \(existing != ""\)/, 'a non-empty destination must take a different path');
  assert.match(body, /skipped \.=/, 'a skipped field must be reported, not silently dropped');
});

// Reading a field is Ctrl+A then Ctrl+C, which leaves the text selected. Any later keystroke in that
// state replaces the field, so this helper is the one place a slip turns a read into a write.
// Harvest, the probe and the fill walk all read through it.
test('reading a field cannot write to it', () => {
  const body = ahkBody('ReadField');
  assert.deepEqual(ahkSends(body).sort(), ['^a', '^c'], 'ReadField must only select and copy');
  assert.ok(!/SendText|\^v/.test(body), 'ReadField must never paste or type');
});

test('the probe is read-only', () => {
  const body = ahkBody('Probe');
  // It walks and reads. Anything that types into a live LIS screen has no business in a probe.
  assert.deepEqual([...new Set(ahkSends(body))], ['FIELD_NEXT'], 'the probe must only advance fields');
  assert.match(body, /ReadField\(/, 'the probe must read through ReadField');
  assert.ok(!/SendText|\^v/.test(body), 'a probe must not type or paste');
  assert.match(AHK, /PROBE_DEPTH\s*:=\s*\d+/, 'PROBE_DEPTH not set');
});

test('the script splits markers on the pattern the app emits', () => {
  const m = /RegExMatch\(Trim\(line\), "(\^<<<[^"]+>>>\$)"/.exec(AHK);
  assert.ok(m, 'the marker pattern was not found in LoadQueue');
  // AHK string -> JS regex: \s stays, the anchors stay. Both sides must accept every real marker.
  const re = new RegExp(m[1].replace(/\\\\/g, '\\'));
  for (const key of PAYLOAD_KEYS) {
    const line = marker(key);
    assert.ok(re.test(line), `the script would not recognise ${line}, which the app emits`);
  }
  assert.ok(!re.test('not a marker'), 'the script pattern matches ordinary text');
});

test('the script sends in event mode, never SendInput', () => {
  assert.match(AHK, /SendMode\s+"Event"/, 'Citrix drops SendInput; event mode is required');
  assert.match(AHK, /SetKeyDelay\s+\d+,\s*\d+/, 'a key delay is required over a remote session');
  // Comments explain why SendInput is wrong here, so only code lines count.
  const code = AHK.split('\n').map((l) => l.replace(/(^|\s);.*$/, '')).join('\n');
  assert.ok(!/\bSendInput\b/.test(code), 'SendInput is unsafe over Citrix');
  // Report prose moves as one clipboard paste, never as thousands of simulated keypresses.
  assert.match(code, /Send "\^v"/, 'the write-back must paste, not type');
});

test('field advance is the LIS key, and auto-advance ships off', () => {
  assert.match(AHK, /FIELD_NEXT\s*:=\s*"\^\]"/, 'the LIS advances on Ctrl+], not Tab');
  assert.match(AHK, /AUTO_NEXT\s*:=\s*false/, 'auto-advance must ship off; one wrong advance misfiles a diagnosis');
});

test('the window criteria carry a title, not bare wfica32', () => {
  const m = /LIS_WIN\s*:=\s*"([^"]*)"/.exec(AHK);
  assert.ok(m, 'LIS_WIN not found');
  assert.ok(/\bahk_exe\s+wfica32\.exe/i.test(m[1]), 'the Citrix executable must be part of the criteria');
  const title = m[1].replace(/\s*ahk_exe\s+wfica32\.exe\s*/i, '').trim();
  assert.ok(title.length > 0, 'wfica32.exe alone matches every published app the user has open');
  assert.match(AHK, /SetTitleMatchMode\s+2/, 'a partial title needs match mode 2');
});
