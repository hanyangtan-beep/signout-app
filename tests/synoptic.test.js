// Synoptic layout invariants (docs/specs/synoptic-layout.md) for the three synoptic templates,
// plus a byte-for-byte check that the spec's "Agreed example" blocks are what the engine prints.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { generate, HEADERS } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { parseSynoptic, renderSynoptic, renderDiagnosis, wrap } from '../src/synoptic.js';

const reg = await loadAll();
const SYNOPTIC_IDS = ['endometrial_carcinoma', 'gist_resection', 'colon_resection'];

function runExample(id, patch = {}, options = {}) {
  const { schema, generator } = reg[id];
  const values = { ...schema.example.parts[0].values, ...patch };
  return generate(schema, generator, { schemaId: id, caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', values }] });
}

// Every case we lay out: the three schema examples and the endometrium golden fixtures (which cover polyp, carcinosarcoma, ovarian spread, glandular-only cervix).
function allCases() {
  const cases = SYNOPTIC_IDS.map((id) => [id, runExample(id)]);
  for (const f of readdirSync('tests/fixtures/endometrium').filter((n) => n.endsWith('.json')).sort()) {
    const fx = JSON.parse(readFileSync(`tests/fixtures/endometrium/${f}`, 'utf8'));
    cases.push([`endometrium/${f}`, runExample('endometrial_carcinoma', fx.patch, fx.options || {})]);
  }
  return cases;
}

test('layout: 80-column wrap, spaces only, no trailing whitespace', () => {
  for (const [name, out] of allCases()) {
    for (const block of ['synoptic', 'diagnosis']) {
      for (const line of out[block].split('\n')) {
        assert.ok(line.length <= 80, `${name} ${block}: >80 chars: ${line}`);
        assert.ok(!line.includes('\t'), `${name} ${block}: tab in line`);
        assert.equal(line, line.trimEnd(), `${name} ${block}: trailing whitespace`);
      }
    }
  }
});

test('layout: sentence-case section headings, blank line between sections, no blank line inside a section', () => {
  for (const [name, out] of allCases()) {
    const lines = out.synoptic.split('\n');
    assert.ok(/^[A-Z][a-z]/.test(lines[0]), `${name}: starts with a heading`);
    lines.forEach((l, i) => {
      if (l === '' || l.startsWith('- ') || l.startsWith('  ')) return;
      // Anything else is a section heading: sentence case, never all caps, preceded by a blank line (except the first).
      assert.ok(/^[A-Z][a-z]/.test(l) && l !== l.toUpperCase(), `${name}: heading not sentence case: ${l}`);
      assert.ok(!l.endsWith(':'), `${name}: heading carries a colon: ${l}`);
      if (i > 0) assert.equal(lines[i - 1], '', `${name}: heading "${l}" not preceded by a blank line`);
      assert.ok(lines[i + 1] && lines[i + 1].startsWith('- '), `${name}: heading "${l}" not followed by a bullet`);
    });
    lines.forEach((l, i) => {
      if (l === '' && i > 0) assert.ok(lines[i + 1] && !lines[i + 1].startsWith('- ') && !lines[i + 1].startsWith('  '), `${name}: blank line inside a section before "${lines[i + 1]}"`);
    });
  }
});

test('layout: bullets and hanging indents parse back to rows; Tumour histology is a paragraph after Histologic grade', () => {
  for (const [name, out] of allCases()) {
    const rows = parseSynoptic(out.synoptic);
    assert.ok(rows.length > 10, `${name}: rows parsed`);
    for (const r of rows) assert.ok(r.label || r.para || r.section === 'Additional findings' || r.depth > 0, `${name}: unlabelled row outside Additional findings: ${JSON.stringify(r)}`);
    const labels = rows.filter((r) => r.depth === 0).map((r) => r.label);
    assert.equal(labels.indexOf('Tumour histology'), labels.indexOf('Histologic grade') + 1, `${name}: Tumour histology follows Histologic grade`);
    const hist = rows.find((r) => r.label === 'Tumour histology');
    assert.ok(hist.para, `${name}: Tumour histology is the paragraph form`);
    assert.ok(hist.value.startsWith('Sections show '), `${name}: histology paragraph starts "Sections show"`);
    assert.ok(!/FIGO(?! grade)/.test(out.synoptic + out.diagnosis), `${name}: no FIGO staging text`);
    // No narrative microscopy block; the combined heading carries the synoptic.
    assert.equal(out.microscopy, out.synoptic);
    assert.ok(out.report.includes(out.synoptic));
  }
  assert.equal(HEADERS.synoptic, 'MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:');
});

test('layout: diagnosis is a specimen line followed by one "- " clause per line', () => {
  for (const [name, out] of allCases()) {
    const lines = out.diagnosis.split('\n');
    assert.ok(/^[A-Z]/.test(lines[0]) && !lines[0].startsWith('- '), `${name}: specimen line first`);
    const clauses = lines.filter((l) => l.startsWith('- '));
    assert.ok(clauses.length >= 2, `${name}: at least two clauses`);
    for (const l of lines.slice(1)) assert.ok(l.startsWith('- ') || l.startsWith('  ') || !lines[0].startsWith('- '), `${name}: unexpected diagnosis line: ${l}`);
    assert.ok(!out.diagnosis.includes(' - '), `${name}: no inline " - " joiner left over`);
  }
});

test('renderer primitives: wrap, renderSynoptic, renderDiagnosis', () => {
  const long = 'x'.repeat(30) + ' ' + 'y'.repeat(30) + ' ' + 'z'.repeat(30);
  const w = wrap(`- Label: ${long}`, 2).split('\n');
  assert.deepEqual(w.map((l) => l.length <= 80), [true, true]);
  assert.ok(w[1].startsWith('  ') && !w[1].startsWith('   '));
  assert.ok(!w.some((l) => l.includes('\t')));
  assert.equal(wrap('mitotic count 2 per 5 mm2', 0, 20), 'mitotic count 2 per\n5 mm2', 'a bare figure never ends a line');
  const s = renderSynoptic([
    { heading: 'Specimen and tumour', items: [{ label: 'Procedure', value: 'Wedge resection' }] },
    { heading: 'Additional findings', items: [{ text: 'None' }] }
  ]);
  assert.equal(s, 'Specimen and tumour\n- Procedure: Wedge resection\n\nAdditional findings\n- None');
  const d = renderDiagnosis('STOMACH, wedge resection', ['GASTROINTESTINAL STROMAL TUMOUR', 'margins clear']);
  assert.equal(d, 'STOMACH, wedge resection\n- GASTROINTESTINAL STROMAL TUMOUR\n- margins clear');
});

// The spec's three "Agreed example" code blocks must be exactly what the engine prints for
// (a) endometrium fixture 01, (b) the GIST schema example, (c) the colorectal schema example.
function specBlock(out) {
  const parts = [`${HEADERS.synoptic}\n${out.synoptic}`, `${HEADERS.diagnosis}\n${out.diagnosis}`];
  if (out.comment) parts.push(`${HEADERS.comment}\n${out.comment}`);
  return parts.join('\n\n');
}
export { specBlock };

test('spec examples reproduce byte-for-byte from the engine', () => {
  const spec = readFileSync('docs/specs/synoptic-layout.md', 'utf8');
  const blocks = [...spec.matchAll(/## Agreed example — ([^\n]+)\n\n```\n([\s\S]*?)\n```/g)].map((m) => [m[1], m[2]]);
  assert.equal(blocks.length, 3, 'three agreed examples in the spec');
  const fx01 = JSON.parse(readFileSync('tests/fixtures/endometrium/01-endometrioid-ia2-nsmp.json', 'utf8'));
  const expected = {
    'endometrium fixture 01': runExample('endometrial_carcinoma', fx01.patch, fx01.options || {}),
    'GIST (schema example, stomach wedge)': runExample('gist_resection'),
    'colorectal (schema example, right hemicolectomy)': runExample('colon_resection')
  };
  for (const [title, text] of blocks) {
    assert.ok(expected[title], `unknown example title: ${title}`);
    assert.equal(text, specBlock(expected[title]), `spec example "${title}" differs from engine output`);
  }
});
