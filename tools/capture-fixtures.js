#!/usr/bin/env node
// Generates tests/fixtures/**/*.json from tools/fixture-inputs.js.
//
// For every input state it (1) runs the extracted legacy functions and (2) drives the
// ORIGINAL HTML app inside jsdom, then asserts both produce identical text before
// writing the fixture. This guarantees the fixtures reflect real app behaviour, not
// a paraphrase of it.
//
// Usage: node tools/capture-fixtures.js            (fails if a fixture already exists)
//        node tools/capture-fixtures.js --force    (overwrite — only after a deliberate wording change)

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const inputs = require('./fixture-inputs');
const gastricLegacy = require('../legacy/gastric-legacy');
const colonicLegacy = require('../legacy/colonic-legacy');

const ROOT = path.resolve(__dirname, '..');
const FORCE = process.argv.includes('--force');

function loadApp(file) {
  const html = fs.readFileSync(path.join(ROOT, 'legacy', file), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    // jsdom lacks matchMedia; both apps call it in their theme toggle
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }); }
  });
  return dom;
}

function setField(doc, el, value) {
  el.value = value;
  el.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
  el.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
}

// ---- gastric: drive the real DOM -------------------------------------------------
function gastricViaDom(fx) {
  const dom = loadApp('gastric-biopsy-signout-v8.html');
  const doc = dom.window.document;
  // The app initialises with an example in parts[]; clear the visible parts first.
  setField(doc, doc.getElementById('specimenCount'), String(fx.parts.length));
  doc.getElementById('clearBtn').click();
  setField(doc, doc.getElementById('caseTitle'), fx.caseTitle || '');
  fx.parts.forEach((p, i) => {
    const fields = ['specimenName', 'siteType', 'activity', 'chronic', 'follicles', 'atrophy', 'ulcer', 'imDegree', 'imType', 'dysplasia', 'hp', 'additionalNotes'];
    for (const f of fields) {
      const el = doc.querySelector(`[data-index="${i}"][data-field="${f}"]`);
      if (!el) throw new Error(`gastric DOM: missing field ${f} for part ${i}`);
      setField(doc, el, p[f]);
    }
  });
  doc.getElementById('generateBtn').click();
  return {
    specimens: doc.getElementById('specimensOutput').textContent,
    microscopy: doc.getElementById('findingsOutput').textContent,
    diagnosis: doc.getElementById('diagnosisOutput').textContent
  };
}

// ---- colonic: drive the real DOM -------------------------------------------------
function colonicViaDom(fx) {
  const dom = loadApp('colonic-polyp-signout.html');
  const doc = dom.window.document;
  doc.getElementById('clearAll').click();
  for (let i = 1; i < fx.specimens.length; i++) doc.getElementById('addSpecimen').click();
  fx.specimens.forEach((s, idx) => {
    // type first (it re-renders and resets dysplasia), then the rest
    setField(doc, doc.getElementById(`type-${idx}`), s.type);
    setField(doc, doc.getElementById(`site-${idx}`), s.site);
    setField(doc, doc.getElementById(`dysplasia-${idx}`), s.dysplasia);
    setField(doc, doc.getElementById(`custom-${idx}`), s.customSpecimen);
    setField(doc, doc.getElementById(`comment-${idx}`), s.comment);
  });
  const header = doc.getElementById('includeHeader');
  const upper = doc.getElementById('uppercaseDx');
  if (header.checked !== !!fx.includeHeader) header.click();
  if (upper.checked !== !!fx.uppercaseDx) upper.click();
  return { report: doc.getElementById('output').value };
}

function writeFixture(dir, fx, input, expected) {
  const file = path.join(ROOT, 'tests', 'fixtures', dir, `${fx.name}.json`);
  if (fs.existsSync(file) && !FORCE) {
    console.log(`  skip (exists) ${dir}/${fx.name}.json`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ name: fx.name, description: fx.description, input, expected }, null, 2) + '\n');
  console.log(`  wrote ${dir}/${fx.name}.json`);
}

function assertEqual(a, b, label) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) {
    console.error(`MISMATCH in ${label}\n  extracted: ${sa}\n  dom:       ${sb}`);
    process.exit(1);
  }
}

console.log('gastric');
for (const fx of inputs.gastric) {
  const input = { caseTitle: fx.caseTitle, parts: fx.parts };
  const viaFn = gastricLegacy.generate(input);
  const viaDom = gastricViaDom(fx);
  assertEqual(viaFn, viaDom, `gastric/${fx.name}`);
  writeFixture('gastric', fx, input, viaFn);
}

console.log('colonic');
for (const fx of inputs.colonic) {
  const input = { specimens: fx.specimens, includeHeader: fx.includeHeader, uppercaseDx: fx.uppercaseDx };
  const viaFn = { report: colonicLegacy.buildReport(input) };
  const viaDom = colonicViaDom(fx);
  assertEqual(viaFn, viaDom, `colonic/${fx.name}`);
  writeFixture('colonic', fx, input, viaFn);
}
console.log('done — extracted functions and original HTML apps agree on every fixture.');
