import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generate, createCase } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadAll } from '../src/registry.js';
import bowelBenign from '../generators/bowel_benign.js';

const reg = await loadAll();
const manifest = Object.values(reg).map((r) => r.schema);
const schema = JSON.parse(fs.readFileSync(new URL('../schemas/bowel_benign.json', import.meta.url), 'utf8'));

function runOne(values) {
  const c = createCase(schema, 1);
  Object.assign(c.parts[0].values, values);
  return { c, out: generate(schema, bowelBenign, c) };
}

test('bowel_benign: perforated sigmoid diverticulitis example', () => {
  const { out } = runOne(schema.example.parts[0].values);
  assert.match(out.macro, /Hartmann's procedure specimen of sigmoid colon measuring 18 cm in length\./);
  assert.match(out.macro, /frank perforation/);
  assert.match(out.microscopy, /acute suppurative diverticulitis, transmural necrosis, perforation and pericolic abscess/);
  assert.match(out.microscopy, /Both proximal and distal resection margins are viable and unremarkable\./);
  assert.match(out.diagnosis, /SIGMOID COLON, Hartmann's procedure - PERFORATED ACUTE DIVERTICULITIS with PERICOLIC ABSCESS; acute serositis; resection margins viable/);
});

test('bowel_benign: small bowel ischaemic infarction with ischaemic margin warning', () => {
  const { c, out } = runOne({
    bowelSegment: 'Small bowel',
    procedure: 'Small bowel resection',
    specimenLength: '35',
    serosaGross: 'Congested and dusky',
    mucosaGross: 'Haemorrhagic, dusky and necrotic mucosa',
    pattern: 'Ischaemia / infarction',
    ischaemiaAcuity: 'Transmural ischaemic infarction / gangrene',
    proximalMargin: 'Viable and unremarkable',
    distalMargin: 'Ischaemic / non-viable'
  });
  assert.match(out.microscopy, /transmural ischaemic infarction \/ gangrene/);
  assert.match(out.microscopy, /The distal resection margin is ischaemic \/ non-viable\./);
  assert.match(out.diagnosis, /SMALL BOWEL, small bowel resection - TRANSMURAL ISCHAEMIC INFARCTION; distal margin ischaemic/);
  const checks = bowelBenign.validate(c.parts[0]);
  assert.ok(checks.some((w) => w.level === 'warn' && /Ischaemic \/ non-viable resection margin/i.test(w.message)));
});

test('bowel_benign: Crohn ileocaecal resection with granulomas & margin involvement', () => {
  const { c, out } = runOne({
    bowelSegment: 'Ileocaecal / right colon',
    procedure: 'Right hemicolectomy',
    pattern: 'Inflammatory bowel disease (IBD)',
    ibdSubtype: 'Crohn disease',
    ibdActivity: 'Severely active',
    ibdFeatures: ['Transmural chronic inflammation with lymphoid aggregates', 'Non-necrotising epithelioid granulomas'],
    ibdDysplasia: 'Negative for dysplasia',
    proximalMargin: 'Involved by Crohn disease (transmural inflammation / granulomas)',
    distalMargin: 'Viable and unremarkable'
  });
  assert.match(out.microscopy, /severely active chronic inflammatory bowel disease in keeping with Crohn disease/);
  assert.match(out.diagnosis, /ILEOCAECAL SEGMENT, right hemicolectomy - CROHN DISEASE, severely active; negative for dysplasia; Crohn disease at proximal margin/);
  const checks = bowelBenign.validate(c.parts[0]);
  assert.ok(checks.some((w) => w.level === 'info' && /Crohn disease involves a resection margin/i.test(w.message)));
});

test('bowel_benign: colonic amyloidosis with Congo red confirmation and reference gallery', () => {
  const { out } = runOne({
    bowelSegment: 'Sigmoid colon',
    procedure: 'Sigmoid colectomy',
    pattern: 'Amyloidosis',
    congoRed: 'Positive with apple-green birefringence under polarised light',
    amyloidSubtype: 'Pending typing (IHC / mass spectrometry)'
  });
  assert.match(out.microscopy, /Congo red stain is positive and demonstrates characteristic apple-green birefringence under polarised light/);
  assert.match(out.diagnosis, /SIGMOID COLON, sigmoid colectomy - AMYLOIDOSIS; resection margins viable/);

  const patternField = schema.fields.find((f) => f.id === 'pattern');
  assert.ok(patternField.reference && patternField.reference.groups.length >= 4);
});

test('bowel_benign intake routing: benign bowel resections route cleanly without stealing cancer, stoma or pull-through', () => {
  const benignCases = [
    ['Sigmoid colon, diverticulitis, Hartmann resection', 'Diverticular disease'],
    ['Small bowel, ischaemic infarction, resection', 'Ischaemia / infarction'],
    ['Ileocaecal resection, Crohn disease', 'Inflammatory bowel disease (IBD)'],
    ['Sigmoid colon, amyloidosis, colectomy', 'Amyloidosis'],
    ['Colon, distal anastomotic ring', 'Resection margin only (viable / clear)']
  ];
  for (const [line, expectedPattern] of benignCases) {
    const parsed = parseIntake(line);
    const [m] = matchParts(parsed, '', manifest);
    assert.equal(m.templateId, 'bowel_benign', `${line} -> bowel_benign`);
    const vals = presetValues(schema, parsed.parts[0], m);
    assert.equal(vals.pattern, expectedPattern, `${line} prefills ${expectedPattern}`);
  }

  // Cancer colectomy, stoma closure, and pull-through keep their own templates
  const [ca] = matchParts(parseIntake('Right hemicolectomy, ascending colon carcinoma'), '', manifest);
  assert.equal(ca.templateId, 'colon_resection');
  const [st] = matchParts(parseIntake('Ileostomy, closure'), '', manifest);
  assert.equal(st.templateId, 'stoma');
  const [hs] = matchParts(parseIntake('Rectosigmoid, pull-through'), '', manifest);
  assert.equal(hs.templateId, 'hirschsprung_resection');
});
