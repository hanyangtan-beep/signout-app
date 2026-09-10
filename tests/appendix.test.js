// Phase 4b: appendix (appendicectomy) template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/appendix.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/appendix.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  c.options = { ...c.options, ...options };
  return c;
};

test('example: acute suppurative appendicitis with faecolith reads like the house report', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Appendix, appendicectomy');
  assert.equal(r.macro, 'Received in formalin is an appendix measuring 6 cm long and 0.8 cm in diameter. The serosal surface shows areas of congestion and discolouration. The lumen contains a faecolith. The wall is unremarkable. All embedded in 3 blocks.');
  assert.equal(r.blockKey, '(1) Proximal resection margin. (2) Body, longitudinal sections. (3) Tip, bisected.');
  assert.equal(r.microscopy, 'Sections of the appendix show ulceration and suppurative inflammation extending to the serosal surface, where neutrophilic fibrinous exudates are seen. The findings are consistent with acute suppurative appendicitis. A faecolith is present within the lumen. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'APPENDIX, appendicectomy - ACUTE SUPPURATIVE APPENDICITIS; faecolith; no evidence of dysplasia or malignancy');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
});

test('house macro form with faecal material in the lumen', () => {
  const r = run(one({ length: '6', diameter: '0.8', lumen: 'Faecal material' }));
  assert.equal(r.macro, 'Received in formalin is an appendix measuring 6 cm long and 0.8 cm in diameter. The serosal surface shows areas of congestion and discolouration. The lumen contains faecal material. The wall is unremarkable. All embedded in 3 blocks.');
});

test('macro and block key are numbered (1)…(3) and vanish when options.macro is false', () => {
  const on = run(example());
  assert.match(on.blockKey, /^\(1\) .* \(2\) .* \(3\) /);
  assert.ok(on.report.indexOf(on.macro) < on.report.indexOf(on.blockKey));
  assert.ok(on.report.indexOf(on.blockKey) < on.report.indexOf(on.microscopy));
  const ex = example();
  ex.options.macro = false;
  const off = run(ex);
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
  assert.ok(!off.report.includes('Received in formalin'));
  assert.ok(!off.report.includes('BLOCK KEY'));
});

test('two-part case keeps (A)/(B) on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, length: '7', diameter: '1' };
  c.parts[1].values = { ...c.parts[1].values, inflammation: 'No acute inflammation - unremarkable' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Appendix, appendicectomy\n(B) Appendix, incidental, appendicectomy');
  assert.match(r.macro, /^\(A\) Received in formalin is an appendix measuring 7 cm long and 1 cm in diameter\.[\s\S]*\n\n\(B\) Received in formalin is an appendix\. /);
  assert.equal(r.blockKey, '(A) (1) Proximal resection margin. (2) Body, longitudinal sections. (3) Tip, bisected.\n(B) (1) Proximal resection margin. (2) Body, longitudinal sections. (3) Tip, bisected.');
  assert.match(r.microscopy, /^\(A\) Sections of the appendix[\s\S]*\n\n\(B\) Sections of the appendix show unremarkable mucosa/);
  assert.equal(r.diagnosis, '(A) APPENDIX, appendicectomy - ACUTE SUPPURATIVE APPENDICITIS; no evidence of dysplasia or malignancy\n(B) APPENDIX, incidental, appendicectomy - NO SIGNIFICANT ABNORMALITY; no evidence of dysplasia or malignancy');
});

test('each inflammation option yields the right capitalised diagnosis', () => {
  const dx = (values) => run(one(values)).diagnosis;
  assert.equal(dx({ inflammation: 'Acute suppurative appendicitis' }), 'APPENDIX, appendicectomy - ACUTE SUPPURATIVE APPENDICITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx({ inflammation: 'Acute suppurative appendicitis', perforation: 'Present' }), 'APPENDIX, appendicectomy - ACUTE SUPPURATIVE APPENDICITIS WITH PERFORATION; no evidence of dysplasia or malignancy');
  assert.equal(dx({ inflammation: 'Acute appendicitis with periappendicitis' }), 'APPENDIX, appendicectomy - ACUTE APPENDICITIS WITH PERIAPPENDICITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx({ inflammation: 'Gangrenous appendicitis', perforation: 'Present' }), 'APPENDIX, appendicectomy - GANGRENOUS APPENDICITIS WITH PERFORATION; no evidence of dysplasia or malignancy');
  assert.equal(dx({ inflammation: 'Periappendicitis only', serositis: 'Neutrophilic fibrinous exudate' }), 'APPENDIX, appendicectomy - PERIAPPENDICITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx({ inflammation: 'Chronic / interval appendicitis' }), 'APPENDIX, appendicectomy - CHRONIC (INTERVAL) APPENDICITIS; no evidence of dysplasia or malignancy');
  assert.equal(dx({ inflammation: 'Fibrous obliteration of the lumen', serositis: 'Neutrophilic fibrinous exudate' }), 'APPENDIX, appendicectomy - FIBROUS OBLITERATION; serositis; no evidence of dysplasia or malignancy');
  assert.equal(dx({ inflammation: 'No acute inflammation - unremarkable' }), 'APPENDIX, appendicectomy - NO SIGNIFICANT ABNORMALITY; no evidence of dysplasia or malignancy');
});

test('house microscopy paragraphs: periappendicitis and fibrous obliteration', () => {
  const peri = run(one({ inflammation: 'Periappendicitis only', serositis: 'Neutrophilic fibrinous exudate' }));
  assert.equal(peri.microscopy, 'Sections of the appendix show neutrophilic fibrinous exudates on the serosal surface. No acute inflammation is seen within the appendiceal mucosa. Features are in keeping with periappendicitis. There is no evidence of dysplasia or malignancy.');
  const fo = run(one({ inflammation: 'Fibrous obliteration of the lumen', serositis: 'Neutrophilic fibrinous exudate' }));
  assert.equal(fo.microscopy, 'Sections of the appendix show fibrous obliteration of the lumen with loss of the mucosa and replacement by fibrous and adipose tissue containing nerve fibres. There is no acute inflammation. Neutrophilic fibrinous exudates are present on the serosal surface. There is no evidence of dysplasia or malignancy.');
  const plain = run(one({ inflammation: 'Acute suppurative appendicitis', serositis: 'Absent' }));
  assert.ok(plain.microscopy.startsWith('Sections of the appendix show ulceration and suppurative inflammation extending through the muscularis propria. The findings are consistent with acute suppurative appendicitis.'));
});

test('secondary findings add lower-case clauses and microscopy sentences', () => {
  const r = run(one({ faecolith: 'Present', enterobius: 'Present', lymphoidHyperplasia: 'Present', diverticulum: 'Present', proximalMargin: 'Inflamed' }));
  assert.equal(r.diagnosis, 'APPENDIX, appendicectomy - ACUTE SUPPURATIVE APPENDICITIS; faecolith; lymphoid hyperplasia; Enterobius vermicularis; diverticulum; acute inflammation at the proximal margin; no evidence of dysplasia or malignancy');
  assert.ok(r.microscopy.includes('A faecolith is present within the lumen. The mucosal lymphoid tissue is hyperplastic. Enterobius vermicularis organisms are present within the lumen. A diverticulum lined by appendiceal mucosa herniates through the muscularis propria. Acute inflammation extends to the proximal resection margin.'));
  const g = run(one({ granulomas: 'Present - see comment' }));
  assert.ok(g.diagnosis.includes('; granulomas - see comment;'));
  assert.ok(g.comment.startsWith('Granulomas are present. The differential includes interval appendicitis'));
});

test('neoplasm options give a short capitalised line, the mesoappendiceal block and the QMH template comment', () => {
  const net = run(one({ inflammation: 'No acute inflammation - unremarkable', neoplasia: 'Well differentiated neuroendocrine tumour - see comment', tumourSize: '1.2', mesoMargin: 'Uninvolved' }));
  assert.equal(net.diagnosis, 'APPENDIX, appendicectomy - WELL DIFFERENTIATED NEUROENDOCRINE TUMOUR (1.2 cm); mesoappendiceal margin uninvolved; see comment');
  assert.equal(net.blockKey, '(1) Proximal resection margin. (2) Body, longitudinal sections. (3) Tip, bisected. (4) Mesoappendiceal margin.');
  assert.ok(net.microscopy.includes('In addition, there is a well differentiated neuroendocrine tumour measuring 1.2 cm, composed of nests'));
  assert.ok(!net.microscopy.includes('no evidence of dysplasia'));
  assert.ok(net.comment.includes('QMH appendix cancer template'));
  assert.ok(!net.comment.includes('{parts}'));

  const lamn = run(one({ inflammation: 'Acute suppurative appendicitis', neoplasia: 'Low grade appendiceal mucinous neoplasm (LAMN) - see comment', mesoMargin: 'Involved', mesoappendix: 'Not included' }));
  assert.equal(lamn.diagnosis, 'APPENDIX, appendicectomy - LOW GRADE APPENDICEAL MUCINOUS NEOPLASM (LAMN); mesoappendiceal margin involved; ACUTE SUPPURATIVE APPENDICITIS; see comment');
  assert.ok(!lamn.blockKey.includes('(4)'), 'no mesoappendiceal block when the mesoappendix is not included');
  assert.ok(run(one({ neoplasia: 'Adenocarcinoma - see comment' })).diagnosis.includes(' - ADENOCARCINOMA; '));
  assert.ok(run(one({ neoplasia: 'Goblet cell adenocarcinoma - see comment', tumourSize: '2 x 1.5' })).diagnosis.includes('GOBLET CELL ADENOCARCINOMA (2 x 1.5 cm)'));
  assert.ok(run(one({ neoplasia: 'Sessile serrated lesion' })).diagnosis.includes(' - SESSILE SERRATED LESION; '));
});

test('blank measurements, perforation site and tip mass produce no dangling text', () => {
  const r = run(one({ length: '', diameter: '', serosa: 'Perforated - site', perforationSite: '', tip: 'Mass - describe', tipMass: '', lumen: 'Empty', wall: 'Necrotic', mesoappendix: 'Not included', blocks: '1' }));
  assert.equal(r.macro, 'Received in formalin is an appendix. The serosal surface is congested and a perforation is present. The lumen is empty. The wall is necrotic. At the tip there is a mass. The mesoappendix is not included. All embedded in 1 block.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes(' cm long') && !r.report.includes('in diameter'));
  const d = run(one({ length: '', diameter: '0.9', serosa: 'Perforated - site', perforationSite: '0.3 cm defect at the tip', blockHandling: 'Representative sections', blocks: '4' }));
  assert.ok(d.macro.startsWith('Received in formalin is an appendix measuring 0.9 cm in diameter. The serosal surface is congested and a perforation is present (0.3 cm defect at the tip).'));
  assert.ok(d.macro.endsWith('Representative sections in 4 blocks.'));
});

test('metadata and example integrity', () => {
  assert.equal(schema.id, 'appendix');
  assert.equal(schema.generator, 'appendix');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'GI');
  assert.equal(schema.rank, 26);
  assert.equal(schema.label, 'Appendix');
  assert.equal(schema.organ, 'APPENDIX');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  assert.equal(schema.maxParts, 2);
  assert.equal(schema.defaultParts, 1);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const f of schema.fields) {
    assert.ok('default' in f, `field ${f.id} needs a default`);
    assert.ok(f.id && f.label && f.type, `field ${f.id} needs id, label and type`);
  }
  for (const p of schema.example.parts) {
    for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is not a field`);
  }
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  const idx = macroFields.map((id) => schema.fields.findIndex((f) => f.id === id));
  assert.equal(idx[idx.length - 1] - idx[0] + 1, idx.length, 'Macroscopy fields are consecutive');
  assert.equal(gen.default.macro, gen.macro);
  assert.equal(gen.default.blockKey, gen.blockKey);
});
