// QMH template importer (tools/import-qmh.js) — smoke test against a saved copy of the colon page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tool = fileURLToPath(new URL('../tools/import-qmh.js', import.meta.url));
const page = fileURLToPath(new URL('./fixtures/qmh/GI-Colon-and-rectum.html', import.meta.url));

test('importer extracts printed elements, options and the CAP protocol version from a QMH page', () => {
  const draft = JSON.parse(execFileSync(process.execPath, [tool, page], { encoding: 'utf8' }));
  assert.equal(draft.source.page, 'GI-Colon-and-rectum.html');
  assert.match(draft.source.url, /^https:\/\/awiloqmh\.github\.io\/CancerReportingTemplate\//);
  assert.match(draft.source.capProtocol, /Colon and Rectum Resection 4\.4\.0\.1/);
  assert.ok(draft.fields.length >= 20, `fields: ${draft.fields.length}`);
  const byLabel = Object.fromEntries(draft.fields.map((f) => [f.outLabel || f.label, f]));
  const grade = Object.values(byLabel).find((f) => /histologic grade/i.test(f.outLabel || f.label));
  assert.ok(grade, 'histologic grade element present');
  assert.ok(grade.options.some((o) => /G2/.test(o)));
  const ext = Object.values(byLabel).find((f) => /tumou?r extension/i.test(f.outLabel || f.label));
  assert.ok(ext && ext.options.some((o) => /muscularis propria/i.test(o)));
  assert.ok(Array.isArray(draft.notPrinted));
  assert.ok(draft.controls >= draft.fields.length);
});
