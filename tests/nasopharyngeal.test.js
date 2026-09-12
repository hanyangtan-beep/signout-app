// Phase 10: nasopharyngeal biopsy template (roadmap "Nasopharyngeal biopsy", Next -> Now by user request).
// Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCase, generate, snippetsFor } from '../src/engine.js';
import * as gen from '../generators/nasopharyngeal.js';

const schema = JSON.parse(readFileSync(new URL('../schemas/nasopharyngeal_biopsy.json', import.meta.url), 'utf8'));
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, extras = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return { ...c, ...extras };
};

const UNDIFF = 'Nasopharyngeal carcinoma, non-keratinising, undifferentiated';
const DIFF = 'Nasopharyngeal carcinoma, non-keratinising, differentiated';

// Minimal templates map for snippet checks (mirrors what the registry hands to the engine).
const templates = () => ({ [schema.id]: { schema, generator: gen } });
const activeSnippets = (c) => snippetsFor(templates(), c).filter((s) => s.active).map((s) => s.id);

test('default: reactive lymphoid tissue reads the house benign line', () => {
  const r = run(one({}));
  assert.equal(r.specimens, 'Nasopharynx, biopsy');
  assert.equal(r.microscopy,
    'Sections show nasopharyngeal mucosa lined by respiratory epithelium with underlying lymphoid tissue. ' +
    'The lymphoid tissue shows reactive follicular hyperplasia with polarised germinal centres containing tingible body macrophages; the overlying surface epithelium is unremarkable. ' +
    'There is no evidence of malignancy.');
  assert.equal(r.diagnosis, 'NASOPHARYNX, biopsy - REACTIVE LYMPHOID HYPERPLASIA; no evidence of malignancy');
  assert.ok(!r.report.includes('(A)'));
  // Accept: the EBER-pending snippet must NOT auto-tick for a benign finding.
  assert.deepEqual(activeSnippets(one({})), []);
});

test('example: non-keratinising undifferentiated NPC with EBER-positive IHC sentence and staging comment', () => {
  const c = example();
  const r = run(c);
  assert.equal(r.specimens, 'Nasopharynx, right fossa of Rosenmuller, biopsy');
  assert.equal(r.microscopy,
    'Sections show 2 pieces of nasopharyngeal mucosa lined by respiratory epithelium with underlying lymphoid tissue. ' +
    'There is an infiltrative malignant neoplasm composed of nests and syncytial sheets of large cells with vesicular nuclei, prominent eosinophilic nucleoli and indistinct cell borders, intimately admixed with a dense lymphoplasmacytic infiltrate, in keeping with nasopharyngeal carcinoma, non-keratinising undifferentiated type. ' +
    'All biopsy fragments are involved by tumour. ' +
    'On immunohistochemistry, the tumour cells are positive for cytokeratin AE1/AE3 and p63, and in-situ hybridisation for Epstein-Barr virus-encoded RNAs (EBER) is positive in the tumour cells.');
  assert.equal(r.diagnosis, 'NASOPHARYNX, right fossa of Rosenmuller, biopsy - NASOPHARYNGEAL CARCINOMA, non-keratinising undifferentiated type; EBER positive');
  assert.ok(r.comment.includes('plasma EBV DNA level and radiological staging investigations'));
  assert.deepEqual(activeSnippets(c), ['npc_ebv_staging']);
});

test('EBER pending: sentences in the microscopy and the addendum snippet auto-ticks', () => {
  const c = one({ finding: UNDIFF, eber: 'Pending' });
  const r = run(c);
  assert.ok(r.microscopy.includes('positive for cytokeratin AE1/AE3 and p63.'));
  assert.ok(r.microscopy.includes('In-situ hybridisation for EBER has been ordered; the result will be issued in an addendum report.'));
  assert.ok(!r.microscopy.includes('EBER) is positive'));
  assert.ok(!r.diagnosis.includes('EBER positive'));
  assert.deepEqual(activeSnippets(c).sort(), ['npc_eber_pending', 'npc_ebv_staging'].sort());
});

test('differentiated subtype and keratinising / basaloid variants carry their own sentences', () => {
  const diff = run(one({ finding: DIFF, tumourFragments: 'Some fragments involved', pni: 'Present' }));
  assert.ok(diff.microscopy.includes('non-keratinising differentiated type'));
  assert.ok(diff.microscopy.includes('Tumour involves some of the biopsy fragments; the remainder is covered by unremarkable mucosa.'));
  assert.ok(diff.microscopy.includes('Perineural invasion is present.'));
  assert.equal(diff.diagnosis, 'NASOPHARYNX, biopsy - NASOPHARYNGEAL CARCINOMA, non-keratinising differentiated type; EBER positive; perineural invasion present'.replace('; EBER positive', ''));

  const kscc = run(one({ finding: 'Nasopharyngeal carcinoma, keratinising squamous cell carcinoma', eber: 'Negative' }));
  assert.ok(kscc.microscopy.includes('keratinisation and intercellular bridges, accompanied by a desmoplastic stromal response'));
  assert.ok(kscc.microscopy.includes('In-situ hybridisation for EBER is negative.'));
  assert.equal(kscc.diagnosis, 'NASOPHARYNX, biopsy - NASOPHARYNGEAL CARCINOMA, keratinising squamous cell carcinoma type');

  const bscc = run(one({ finding: 'Nasopharyngeal carcinoma, basaloid squamous cell carcinoma', eber: 'Positive in the tumour cells' }));
  assert.ok(bscc.microscopy.includes('peripheral palisading, central comedo-type necrosis and basement membrane-like hyaline stromal material'));
  assert.equal(bscc.diagnosis, 'NASOPHARYNX, biopsy - NASOPHARYNGEAL CARCINOMA, basaloid squamous cell carcinoma type; EBER positive');
});

test('recurrence setting prefixes the diagnosis and adds post-radiotherapy changes', () => {
  const r = run(one({ finding: UNDIFF, setting: 'Suspected recurrence / persistence', eber: 'Positive in the tumour cells' }));
  assert.equal(r.diagnosis, 'NASOPHARYNX, biopsy - PERSISTENT / RECURRENT NASOPHARYNGEAL CARCINOMA, non-keratinising undifferentiated type; EBER positive');
  assert.ok(r.microscopy.includes('post-radiotherapy changes with stromal fibrosis'));
});

test('post-radiotherapy surveillance benign: RT changes and the no-recurrence line', () => {
  const r = run(one({ finding: 'Chronic nasopharyngitis with lymphoid follicles', setting: 'Post-radiotherapy surveillance' }));
  assert.equal(r.diagnosis, 'NASOPHARYNX, biopsy - POST-RADIOTHERAPY CHANGES; chronic nasopharyngitis with lymphoid follicles; no evidence of recurrent carcinoma');
  assert.ok(r.microscopy.includes('chronic inflammation of the mucosa with lymphoid follicle formation'));
  assert.ok(r.microscopy.includes('post-radiotherapy changes with stromal fibrosis'));
  assert.ok(r.microscopy.endsWith('There is no evidence of malignancy.'));
});

test('atypical lymphoid infiltrate: comment-referred wording and the work-up snippet', () => {
  const c = one({ finding: 'Atypical lymphoid infiltrate (? lymphoma)', eber: 'Not performed' });
  const r = run(c);
  assert.ok(r.microscopy.includes('effacing the normal architecture (see comment)'));
  assert.equal(r.diagnosis, 'NASOPHARYNX, biopsy - ATYPICAL LYMPHOID INFILTRATE; lymphoma cannot be excluded - immunohistochemical work-up recommended (see comment)');
  assert.deepEqual(activeSnippets(c), ['npc_lymphoma_workup']);
});

test('necrotising granulomatous inflammation: ZN/GMS negative and TB correlation; AFB positive tags the diagnosis', () => {
  const a = one({ finding: 'Granulomatous inflammation, necrotising', afStains: 'ZN and GMS negative' });
  const ra = run(a);
  assert.ok(ra.microscopy.includes('Necrotising epithelioid granulomas with multinucleated giant cells and caseous necrosis are present.'));
  assert.ok(ra.microscopy.includes('Ziehl-Neelsen and GMS stains do not highlight any acid-fast bacilli or fungal elements.'));
  assert.equal(ra.diagnosis, 'NASOPHARYNX, biopsy - NECROTISING GRANULOMATOUS INFLAMMATION; no acid-fast bacilli or fungal elements on special stains; tuberculosis to be correlated with microbiology; no evidence of malignancy');

  const b = run(one({ finding: 'Granulomatous inflammation, necrotising', afStains: 'Acid-fast bacilli identified (ZN)' }));
  assert.ok(b.microscopy.includes('Ziehl-Neelsen stain highlights acid-fast bacilli.'));
  assert.equal(b.diagnosis, 'NASOPHARYNX, biopsy - NECROTISING GRANULOMATOUS INFLAMMATION; ACID-FAST BACILLI IDENTIFIED on Ziehl-Neelsen stain; no evidence of malignancy');
});

test('suboptimal crushed material short-circuits the microscopy and keeps the notes', () => {
  const r = run(one({ adequacy: 'Crushed / scant fragments only (suboptimal)', additionalNotes: 'Repeat biopsy is suggested if clinical suspicion persists' }));
  assert.equal(r.microscopy,
    'Sections show small crushed fragments of tissue with crush artefact, limiting assessment. ' +
    'Repeat biopsy is suggested if clinical suspicion persists.');
  assert.equal(r.diagnosis, 'NASOPHARYNX, biopsy - CRUSHED / SCANT TISSUE ONLY, SUBOPTIMAL FOR ASSESSMENT; no definite malignancy identified');
});

test('other malignancies: papillary adenocarcinoma, salivary type and free-text malignancy', () => {
  const pa = run(one({ finding: 'Nasopharyngeal papillary adenocarcinoma' }));
  assert.ok(pa.microscopy.includes('in keeping with nasopharyngeal papillary adenocarcinoma'));
  assert.equal(pa.diagnosis, 'NASOPHARYNX, biopsy - NASOPHARYNGEAL PAPILLARY ADENOCARCINOMA');

  const sal = run(one({ finding: 'Salivary gland-type carcinoma', additionalNotes: 'The morphology is in keeping with low-grade salivary adenocarcinoma' }));
  assert.equal(sal.diagnosis, 'NASOPHARYNX, biopsy - SALIVARY GLAND-TYPE CARCINOMA (see microscopic description)');
  assert.ok(sal.microscopy.includes('morphologically of salivary gland type'));
  assert.ok(sal.microscopy.endsWith('low-grade salivary adenocarcinoma.'));

  const om = run(one({ finding: 'Other malignancy (describe in notes)' }));
  assert.equal(om.diagnosis, 'NASOPHARYNX, biopsy - MALIGNANT NEOPLASM (see microscopic description)');
});

test('benign pick-list: chronicity, surface epithelium, adenoid remnant, Tornwaldt cyst', () => {
  const dx = (values) => run(one(values)).diagnosis;
  assert.equal(dx({ finding: 'Chronic nasopharyngitis with lymphoid follicles' }), 'NASOPHARYNX, biopsy - CHRONIC NASOPHARYNGITIS WITH LYMPHOID FOLLICLES; no evidence of malignancy');
  assert.equal(dx({ finding: 'Benign surface epithelium (respiratory / squamous)' }), 'NASOPHARYNX, biopsy - BENIGN NASOPHARYNGEAL EPITHELIUM AND LYMPHOID TISSUE; no evidence of malignancy');
  assert.equal(dx({ finding: 'Adenoid remnant' }), 'NASOPHARYNX, biopsy - ADENOID REMNANT; no evidence of malignancy');
  assert.equal(dx({ finding: 'Tornwaldt cyst' }), 'NASOPHARYNX, biopsy - TORNWALDT CYST; no evidence of malignancy');
  assert.ok(run(one({ finding: 'Tornwaldt cyst' })).microscopy.includes('Tornwaldt cyst (nasopharyngeal bursa cyst)'));
});

test('adequacy caveat when only lymphoid tissue is sampled', () => {
  const r = run(one({ adequacy: 'Lymphoid tissue only (no surface epithelium)' }));
  assert.ok(r.microscopy.startsWith('Sections show nasopharyngeal lymphoid tissue without representation of the surface epithelium.'));
  assert.ok(r.microscopy.includes('a small submucosal lesion cannot be entirely excluded (see comment)'));
  assert.equal(r.diagnosis, 'NASOPHARYNX, biopsy - REACTIVE LYMPHOID HYPERPLASIA; no evidence of malignancy');
});

test('two parts keep (A)/(B) labels and join in a SUMMARY line', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'Nasopharynx, right fossa of Rosenmüller', site: 'Right fossa of Rosenmüller', finding: UNDIFF, eber: 'Positive in the tumour cells' };
  c.parts[1].values = { ...c.parts[1].values, specimenName: 'Nasopharynx, left fossa of Rosenmüller', site: 'Left fossa of Rosenmüller', finding: 'Reactive lymphoid hyperplasia' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Nasopharynx, right fossa of Rosenmuller, biopsy\n(B) Nasopharynx, left fossa of Rosenmuller, biopsy');
  assert.match(r.microscopy, /^\(A\) Sections/);
  assert.match(r.microscopy, /\n\n\(B\) Sections/);
  assert.equal(r.diagnosis,
    '(A) NASOPHARYNX, right fossa of Rosenmuller, biopsy - NASOPHARYNGEAL CARCINOMA, non-keratinising undifferentiated type; EBER positive\n' +
    '(B) NASOPHARYNX, left fossa of Rosenmuller, biopsy - REACTIVE LYMPHOID HYPERPLASIA; no evidence of malignancy\n' +
    '\n' +
    'SUMMARY: nasopharyngeal carcinoma (non-keratinising undifferentiated) in (A); no evidence of malignancy in (B).');
});

test('metadata: biopsy kind, NPC label, aliases and the planned-card keys', () => {
  assert.equal(schema.kind, 'biopsy');
  assert.equal(schema.system, 'Head and neck');
  assert.equal(schema.label, 'NPC');
  assert.equal(schema.organ, 'NASOPHARYNX');
  assert.equal(schema.generator, 'nasopharyngeal');
  for (const a of ['nasopharynx', 'NPC', 'EBER', 'EBV', 'adenoid']) assert.ok(schema.aliases.includes(a), a);
  const ids = schema.fields.map((f) => f.id);
  for (const id of ['specimenName', 'site', 'adequacy', 'setting', 'finding', 'tumourFragments', 'lvi', 'pni', 'epithelialMarkers', 'eber', 'afStains', 'additionalNotes']) assert.ok(ids.includes(id), id);
  assert.equal(schema.snippets.length, 4);
});
