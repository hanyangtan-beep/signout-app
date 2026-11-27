import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generate, createCase } from '../src/engine.js';
import frozen from '../generators/frozen.js';

const schema = JSON.parse(fs.readFileSync(new URL('../schemas/frozen_section.json', import.meta.url), 'utf8'));

function runParts(partsList) {
  const c = createCase(schema, partsList.length);
  partsList.forEach((vals, i) => Object.assign(c.parts[i].values, vals));
  return generate(schema, frozen, c);
}

test('frozen PD scenario (b): CBD ring en face with denuded epithelium', () => {
  const out = runParts([{
    specimenName: 'Common bile duct margin',
    scenario: 'Pancreatic / bile duct margin',
    pdSite: 'Common bile duct',
    pdForm: 'Ring',
    pdEnFace: true,
    pdEpithelium: 'Denuded',
    pdResult: 'Denuded epithelium (cannot assess)',
    pieces: '1',
    tissueDesc: 'tan coloured tissue',
    size: '0.8 x 0.4 x 0.2 cm',
    handling: 'All embedded',
    blocks: '1',
  }]);
  assert.match(out.macro, /Submitted as a ring and embedded en face\./);
  assert.match(out.intraop, /Epithelium is denuded at the common bile duct margin; cannot assess for dysplasia or carcinoma\./);
  assert.match(out.microscopy, /bile duct wall with denuded surface epithelium\./);
  assert.doesNotMatch(out.microscopy, /no evidence of dysplasia or malignancy/i);
  assert.match(out.diagnosis, /EPITHELIUM DENUDED; CANNOT ASSESS MARGIN/);
});

test('frozen PD scenario (b): biliary BilIN-3 vs pancreatic PanIN-3 and denuded warning', () => {
  const outBile = runParts([{
    specimenName: 'Common hepatic duct margin',
    scenario: 'Pancreatic / bile duct margin',
    pdSite: 'Common hepatic duct',
    pdResult: 'High-grade dysplasia only',
  }]);
  assert.match(outBile.microscopy, /biliary epithelium with high-grade dysplasia \(BilIN-3\)/);

  const checks = frozen.validate({
    label: 'A',
    values: {
      scenario: 'Pancreatic / bile duct margin',
      pdSite: 'Common bile duct',
      pdEpithelium: 'Denuded',
      pdResult: 'Negative',
    }
  });
  assert.ok(checks.some((w) => w.level === 'warn' && /denuded/i.test(w.message)));
});

test('frozen PD scenario (b): stent atypia and peribiliary glands snippets exist', () => {
  const ids = (schema.snippets || []).map((s) => s.id);
  assert.ok(ids.includes('pd_stent_atypia'));
  assert.ok(ids.includes('pd_peribiliary_glands'));
});

test('frozen H&N scenario (e): named-margin presets generate grouped intraop and x frozen section', () => {
  const presets = schema.presets || [];
  assert.ok(presets.length >= 5);
  const tongue5 = presets.find((p) => p.id === 'oral_tongue_5');
  assert.ok(tongue5);
  assert.equal(tongue5.parts.length, 5);
  const out = runParts(tongue5.parts.map((p) => p.values));
  assert.match(out.intraop, /\(A\)-\(E\) No malignancy\./);
  assert.match(out.diagnosis, /TONGUE, anterior margin, excision x frozen section - NO EVIDENCE OF MALIGNANCY/);
});
