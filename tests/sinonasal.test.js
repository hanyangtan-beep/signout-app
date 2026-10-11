// Phase 4b: nasal polyps / sinonasal biopsy template (roadmap item 13). Wording is deliberate; update the strings only on purpose.
// Phase 45: the papilloma paragraphs and diagnosis lines follow the released reports (docs/specs/sinonasal-papilloma.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import * as gen from '../generators/sinonasal.js';
import { schemaSync } from './_schema.js';

const schema = schemaSync('nasal_polyps');
const run = (c) => generate(schema, gen, c);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  c.options = { ...c.options, ...options };
  return c;
};

const MALIGNANT = 'Malignant - see comment (QMH head and neck template)';
const AFS = 'Present on GMS, non-invasive - allergic fungal sinusitis';

test('example: bilateral nasal polyps from FESS, oedematous and eosinophil-rich, reads like the house report', () => {
  const r = run(example());
  assert.equal(r.specimens, 'Bilateral nasal polyps, FESS');
  assert.equal(r.macro, 'Received in formalin are multiple polypoid pieces of glistening translucent tissue measuring 3 x 2 x 1 cm in aggregate. All embedded in 2 blocks.');
  assert.equal(r.blockKey, '(1-2) Polyps, all embedded.');
  assert.equal(r.microscopy, 'Sections show polypoid fragments of sinonasal mucosa lined by respiratory epithelium with basement membrane thickening. The oedematous stroma contains a mixed inflammatory infiltrate rich in eosinophils and seromucinous glands. No fungal hyphae are seen on GMS. There is no evidence of dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'NASAL CAVITY, bilateral polyps, FESS - INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS');
  assert.equal(r.comment, '');
  assert.ok(!r.report.includes('(A)'));
});

test('default case gives the roadmap house diagnosis line', () => {
  const r = run(one({}));
  assert.equal(r.specimens, 'Nasal polyps, polypectomy');
  assert.equal(r.diagnosis, 'NASAL CAVITY, polyps, polypectomy - INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS');
  assert.equal(r.microscopy, 'Sections show polypoid fragments of sinonasal mucosa lined by respiratory epithelium with basement membrane thickening. The oedematous stroma contains a mixed inflammatory infiltrate rich in eosinophils and seromucinous glands. No fungal hyphae are seen on GMS. There is no evidence of dysplasia or malignancy.');
});

test('macro and block key are numbered (1-2) and vanish when options.macro is false', () => {
  const on = run(example());
  assert.match(on.blockKey, /^\(1-2\) /);
  assert.ok(on.report.indexOf(on.macro) < on.report.indexOf(on.blockKey));
  assert.ok(on.report.indexOf(on.blockKey) < on.report.indexOf(on.microscopy));
  const ex = example();
  ex.options.macro = false;
  const off = run(ex);
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
  assert.ok(!off.report.includes('Received in formalin'));
  assert.ok(!off.report.includes('BLOCK KEY'));
  assert.equal(run(one({ blocks: '1' })).blockKey, '(1) Polyps, all embedded.');
  assert.equal(run(one({ blocks: '3', allEmbedded: 'Representative sections' })).blockKey, '(1-3) Polyps, representative sections.');
  assert.ok(run(one({ blocks: '3', allEmbedded: 'Representative sections' })).macro.endsWith('Representative sections in 3 blocks.'));
  assert.equal(run(one({ procedure: 'Biopsy', blocks: '1' })).blockKey, '(1) Biopsy, all embedded.');
  assert.equal(run(one({ procedure: 'Turbinectomy', blocks: '1' })).blockKey, '(1) Turbinate, all embedded.');
});

test('two-part case (per side) keeps (A)/(B) on every block', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, specimenName: 'Right nasal polyps', procedure: 'FESS', aggregateSize: '2x1.5x1', blocks: '1' };
  c.parts[1].values = { ...c.parts[1].values, specimenName: 'Left nasal polyps', procedure: 'FESS', aggregateSize: '1.5 x 1 x 0.5', blocks: '1', lesion: 'Inflammatory polyp, fibrous', infiltrate: 'Mixed', epithelium: 'Squamous metaplasia' };
  const r = run(c);
  assert.equal(r.specimens, '(A) Right nasal polyps, FESS\n(B) Left nasal polyps, FESS');
  assert.equal(r.macro, '(A) Received in formalin are multiple polypoid pieces of glistening translucent tissue measuring 2 x 1.5 x 1 cm in aggregate. All embedded in 1 block.\n\n(B) Received in formalin are multiple polypoid pieces of glistening translucent tissue measuring 1.5 x 1 x 0.5 cm in aggregate. All embedded in 1 block.');
  assert.equal(r.blockKey, '(A) (1) Polyps, all embedded.\n(B) (1) Polyps, all embedded.');
  assert.match(r.microscopy, /^\(A\) Sections show polypoid fragments of sinonasal mucosa lined by respiratory epithelium with basement membrane thickening\. The oedematous stroma[\s\S]*\n\n\(B\) Sections show polypoid fragments of sinonasal mucosa lined by respiratory epithelium with focal squamous metaplasia and basement membrane thickening\. The fibrous stroma contains a mixed chronic inflammatory infiltrate and seromucinous glands\. No fungal hyphae are seen on GMS\. There is no evidence of dysplasia or malignancy\.$/);
  assert.equal(r.diagnosis, '(A) NASAL CAVITY, right polyps, FESS - INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS\n(B) NASAL CAVITY, left polyps, FESS - INFLAMMATORY (FIBROUS) SINONASAL POLYPS');
});

test('specimen text drives the organ / site clause: sinus, turbinate, septum, nasopharynx', () => {
  const dx = (values) => run(one(values)).diagnosis;
  assert.ok(dx({ specimenName: 'Left ethmoid sinus contents', procedure: 'FESS' }).startsWith('PARANASAL SINUS, left ethmoid sinus, FESS - '));
  assert.ok(dx({ specimenName: 'Right maxillary antrum', procedure: 'FESS', lesion: 'Antrochoanal polyp' }).startsWith('PARANASAL SINUS, right maxillary antrum, FESS - ANTROCHOANAL POLYP'));
  assert.ok(dx({ specimenName: 'Left inferior turbinate', procedure: 'Turbinectomy' }).startsWith('NASAL CAVITY, left inferior turbinate, turbinectomy - '));
  assert.ok(dx({ specimenName: 'Nasal septum', procedure: 'Biopsy' }).startsWith('NASAL CAVITY, septum, biopsy - '));
  assert.ok(dx({ specimenName: 'Nasopharynx', procedure: 'Biopsy' }).startsWith('NASAL CAVITY, nasopharynx, biopsy - '));
  assert.ok(dx({ specimenName: '', procedure: 'Biopsy' }).startsWith('NASAL CAVITY, biopsy - '));
  assert.equal(run(one({ specimenName: '', procedure: 'Biopsy' })).specimens, 'Nasal polyps, biopsy');
});

test('each lesion type yields the right capitalised diagnosis', () => {
  const dx = (values) => run(one(values)).diagnosis;
  const head = 'NASAL CAVITY, polyps, polypectomy - ';
  assert.equal(dx({}), `${head}INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS`);
  assert.equal(dx({ fragments: 'One' }), `${head}INFLAMMATORY (OEDEMATOUS) SINONASAL POLYP`);
  assert.equal(dx({ lesion: 'Inflammatory polyp, fibrous' }), `${head}INFLAMMATORY (FIBROUS) SINONASAL POLYPS`);
  assert.equal(dx({ lesion: 'Antrochoanal polyp' }), `${head}ANTROCHOANAL POLYP`);
  assert.equal(dx({ lesion: 'Respiratory epithelial adenomatoid hamartoma' }), `${head}RESPIRATORY EPITHELIAL ADENOMATOID HAMARTOMA`);
  // Phase 45: the released papilloma lines (21 of 21) carry no closer and no "see comment".
  assert.equal(dx({ lesion: 'Sinonasal papilloma, inverted' }), `${head}SINONASAL PAPILLOMA, INVERTED TYPE`);
  assert.equal(dx({ lesion: 'Sinonasal papilloma, inverted', dysplasia: 'High grade' }), `${head}SINONASAL PAPILLOMA, INVERTED TYPE with HIGH GRADE DYSPLASIA`);
  assert.equal(dx({ lesion: 'Sinonasal papilloma, exophytic', dysplasia: 'Low grade' }), `${head}SINONASAL PAPILLOMA, EXOPHYTIC TYPE with LOW GRADE DYSPLASIA`);
  assert.equal(dx({ lesion: 'Sinonasal papilloma, oncocytic' }), `${head}SINONASAL PAPILLOMA, ONCOCYTIC SUBTYPE`);
  assert.equal(dx({ lesion: 'Sinonasal papilloma, oncocytic', dysplasia: 'Squamous cell carcinoma arising' }), `${head}SQUAMOUS CELL CARCINOMA ARISING IN SINONASAL PAPILLOMA, ONCOCYTIC SUBTYPE - SEE COMMENT`);
  assert.equal(dx({ lesion: 'Granulomatous inflammation' }), `${head}NECROTISING GRANULOMATOUS INFLAMMATION with VASCULITIS; features suggestive of granulomatosis with polyangiitis - correlate with ANCA serology`);
  assert.equal(dx({ lesion: 'Granulomatous inflammation', granulomaPattern: 'Sarcoid-type' }), `${head}NON-NECROTISING GRANULOMATOUS INFLAMMATION, sarcoid-type`);
  assert.equal(dx({ lesion: 'Granulomatous inflammation', granulomaPattern: 'TB - AFB' }), `${head}NECROTISING GRANULOMATOUS INFLAMMATION; tuberculosis to be excluded (AFB / culture)`);
  assert.equal(dx({ lesion: MALIGNANT }), `${head}MALIGNANT NEOPLASM - SEE COMMENT`);
  assert.equal(dx({ epithelium: 'Ulcerated' }), `${head}INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS; surface ulceration`);
});

test('allergic mucin and fungal hyphae: GMS / PAS sentences and diagnosis clauses', () => {
  const afs = run(one({ allergicMucin: true, fungus: AFS }));
  assert.ok(afs.microscopy.includes('Allergic mucin containing degenerating eosinophils and Charcot-Leyden crystals is present. GMS and PAS stains demonstrate non-invasive fungal hyphae within the allergic mucin; there is no tissue invasion. The features are in keeping with allergic fungal sinusitis.'));
  assert.ok(!afs.microscopy.includes('No fungal hyphae'));
  assert.equal(afs.diagnosis, 'NASAL CAVITY, polyps, polypectomy - INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS; ALLERGIC FUNGAL SINUSITIS - non-invasive fungal hyphae on GMS');
  assert.equal(afs.comment, '');
  const mucinOnly = run(one({ allergicMucin: true }));
  assert.ok(mucinOnly.microscopy.includes('Charcot-Leyden crystals is present. No fungal hyphae are seen on GMS.'));
  assert.ok(mucinOnly.diagnosis.endsWith('; allergic mucin with Charcot-Leyden crystals present'));
  const ball = run(one({ fungus: 'Fungal ball', appearance: 'Mucoid / inspissated', aggregateSize: '2' }));
  assert.equal(ball.macro, 'Received in formalin are multiple pieces of mucoid inspissated material measuring 2 cm in aggregate. All embedded in 2 blocks.');
  assert.ok(ball.microscopy.includes('in keeping with a fungal ball (mycetoma).'));
  assert.ok(ball.diagnosis.endsWith('; FUNGAL BALL (MYCETOMA), non-invasive'));
});

test('invasive fungal sinusitis leads the diagnosis and adds the urgent clinical correlation comment', () => {
  const r = run(one({ fungus: 'Invasive, angioinvasion' }));
  assert.ok(r.microscopy.includes('GMS and PAS stains demonstrate fungal hyphae invading the mucosa with angioinvasion and associated necrosis, in keeping with invasive fungal sinusitis (see comment).'));
  assert.equal(r.diagnosis, 'NASAL CAVITY, polyps, polypectomy - INVASIVE FUNGAL SINUSITIS with ANGIOINVASION - SEE COMMENT; inflammatory (oedematous) sinonasal polyps');
  assert.equal(r.comment, 'Angioinvasive fungal hyphae are present. Urgent clinical correlation advised.');
  assert.ok(!r.comment.includes('{parts}'));
});

test('inverted and exophytic papillomas print the house paragraph; the follow-up comment is ticked by hand only', () => {
  const inv = run(one({ lesion: 'Sinonasal papilloma, inverted', appearance: 'Papillary' }));
  assert.ok(inv.macro.includes('polypoid pieces of papillary tissue'));
  assert.equal(inv.microscopy, 'Sections show polypoid pieces of mucosal tissue lined by respiratory type to transitional type epithelium. An endophytic growth of round epithelial nests with smooth contour is seen. The epithelium is hyperplastic with transmigrating neutrophils and neutrophilic microabscesses. The features are those of a sinonasal papilloma, inverted type. No high grade cytological atypia or invasion is identified.');
  assert.equal(inv.comment, '');
  const ticked = one({ lesion: 'Sinonasal papilloma, inverted' });
  ticked.snippets = { inverted_papilloma: true };
  assert.equal(run(ticked).comment, 'Inverted sinonasal papilloma is present. Inverted papillomas carry a risk of local recurrence and of malignant transformation; complete excision and clinical follow-up are recommended.');
  const exo = run(one({ lesion: 'Sinonasal papilloma, exophytic' }));
  assert.equal(exo.microscopy, 'Sections show polypoid pieces of mucosal tissue with an exophytic papillary growth of epithelium over fibrovascular cores. The papillae are lined by hyperplastic squamous to transitional type epithelium with scattered mucous cells and transmigrating neutrophils. The features are those of a sinonasal papilloma, exophytic type. No high grade cytological atypia or invasion is identified.');
  assert.equal(exo.comment, '');
});

test('inverted papilloma with high grade dysplasia: one piece, squamous lining, grade sentence and the "with" line', () => {
  const r = run(one({ lesion: 'Sinonasal papilloma, inverted', dysplasia: 'High grade', fragments: 'One', epithelium: 'Squamous metaplasia' }));
  assert.equal(r.microscopy, 'Sections show a polypoid piece of mucosal tissue lined by squamous type epithelium. An endophytic growth of round epithelial nests with smooth contour is seen. The epithelium is hyperplastic with transmigrating neutrophils and neutrophilic microabscesses. The features are those of a sinonasal papilloma, inverted type. High grade dysplasia is present. No invasion is identified.');
  assert.equal(r.diagnosis, 'NASAL CAVITY, polyps, polypectomy - SINONASAL PAPILLOMA, INVERTED TYPE with HIGH GRADE DYSPLASIA');
  assert.equal(r.comment, '');
  const bx = run(one({ lesion: 'Sinonasal papilloma, inverted', procedure: 'Biopsy', epithelium: 'Ulcerated' }));
  assert.ok(bx.microscopy.startsWith('Sections show pieces of mucosal tissue with surface ulceration. An endophytic growth'));
});

test('oncocytic papilloma prints its house paragraph and the ONCOCYTIC SUBTYPE line', () => {
  const r = run(one({ lesion: 'Sinonasal papilloma, oncocytic' }));
  assert.equal(r.microscopy, 'Sections show a papillary epithelial proliferation with mixed exophytic and endophytic growth. It is lined by multilayered pseudostratified to columnar oncocytic epithelium with abundant eosinophilic cytoplasm and small uniform nuclei. Numerous intraepithelial mucin-filled microcysts and neutrophilic microabscesses are present. The features are those of a sinonasal papilloma, oncocytic subtype. No destructive stromal invasion is present. No dysplasia or malignancy is seen.');
  assert.equal(r.diagnosis, 'NASAL CAVITY, polyps, polypectomy - SINONASAL PAPILLOMA, ONCOCYTIC SUBTYPE');
  assert.equal(r.comment, '');
  const low = run(one({ lesion: 'Sinonasal papilloma, oncocytic', dysplasia: 'Low grade' }));
  assert.ok(low.microscopy.endsWith('oncocytic subtype. Low grade dysplasia is present. No destructive stromal invasion is present.'));
  assert.equal(low.diagnosis, 'NASAL CAVITY, polyps, polypectomy - SINONASAL PAPILLOMA, ONCOCYTIC SUBTYPE with LOW GRADE DYSPLASIA');
  const lymph = run(one({ lesion: 'Sinonasal papilloma, oncocytic', lymphomaSuspicion: true }));
  assert.ok(lymph.microscopy.includes('No destructive stromal invasion is present. No dysplasia is seen. In addition, there is an atypical lymphoid infiltrate'));
});

test('carcinoma arising in a papilloma: capitalised line, carcinoma sentence and the QMH head and neck template comment', () => {
  const r = run(one({ lesion: 'Sinonasal papilloma, inverted', dysplasia: 'Squamous cell carcinoma arising' }));
  assert.equal(r.diagnosis, 'NASAL CAVITY, polyps, polypectomy - SQUAMOUS CELL CARCINOMA ARISING IN SINONASAL PAPILLOMA, INVERTED TYPE - SEE COMMENT');
  assert.ok(r.microscopy.endsWith('The features are those of a sinonasal papilloma, inverted type. Invasive squamous cell carcinoma arising in the papilloma is present (see comment).'));
  assert.equal(r.comment, 'A malignant neoplasm is present. Tumour type, grade, extent and margin status should be reported on the QMH head and neck cancer template; a supplementary synoptic report will follow.');
  // The option is hidden off a papilloma; a stale value there changes nothing.
  const polyp = run(one({ dysplasia: 'Squamous cell carcinoma arising' }));
  assert.equal(polyp.comment, '');
  assert.equal(polyp.diagnosis, 'NASAL CAVITY, polyps, polypectomy - INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS');
});

test('a second finding follows the finished papilloma paragraph', () => {
  const r = run(one({ lesion: 'Sinonasal papilloma, inverted', fungus: AFS, allergicMucin: true }));
  assert.ok(r.microscopy.includes('inverted type. No high grade cytological atypia or invasion is identified. Allergic mucin containing degenerating eosinophils'));
  assert.equal(r.diagnosis, 'NASAL CAVITY, polyps, polypectomy - SINONASAL PAPILLOMA, INVERTED TYPE; ALLERGIC FUNGAL SINUSITIS - non-invasive fungal hyphae on GMS');
});

test('granulomatous patterns write the GPA / sarcoid / TB sentences', () => {
  const gpa = run(one({ lesion: 'Granulomatous inflammation' }));
  assert.ok(gpa.microscopy.includes('The features raise the possibility of granulomatosis with polyangiitis; correlation with ANCA serology is recommended.'));
  assert.ok(gpa.microscopy.endsWith('There is no evidence of dysplasia or malignancy.'));
  const sarc = run(one({ lesion: 'Granulomatous inflammation', granulomaPattern: 'Sarcoid-type' }));
  assert.ok(sarc.microscopy.includes('Well-formed non-necrotising epithelioid granulomas are present.'));
  const tb = run(one({ lesion: 'Granulomatous inflammation', granulomaPattern: 'TB - AFB' }));
  assert.ok(tb.microscopy.includes('Ziehl-Neelsen stain for acid-fast bacilli'));
});

test('NK/T-cell lymphoma flag adds the EBER comment and withholds the negative closer', () => {
  const r = run(one({ lymphomaSuspicion: true, epithelium: 'Ulcerated', infiltrate: 'Mixed' }));
  assert.ok(r.microscopy.endsWith('In addition, there is an atypical lymphoid infiltrate with angiocentric growth and necrosis (see comment).'));
  assert.ok(!r.microscopy.includes('no evidence of dysplasia'));
  assert.equal(r.diagnosis, 'NASAL CAVITY, polyps, polypectomy - INFLAMMATORY (OEDEMATOUS) SINONASAL POLYPS; surface ulceration; ATYPICAL LYMPHOID INFILTRATE - SEE COMMENT');
  assert.ok(r.comment.includes('extranodal NK/T-cell lymphoma, nasal type'));
  assert.ok(r.comment.includes('EBER in situ hybridisation'));
});

test('malignancy gives a short capitalised line and the QMH head and neck template comment', () => {
  const r = run(one({ lesion: MALIGNANT, appearance: 'Fleshy' }));
  assert.equal(r.diagnosis, 'NASAL CAVITY, polyps, polypectomy - MALIGNANT NEOPLASM - SEE COMMENT');
  assert.ok(r.macro.includes('polypoid pieces of fleshy tissue'));
  assert.ok(r.microscopy.endsWith('In addition, there is a malignant neoplasm (see comment).'));
  assert.ok(!r.microscopy.includes('no evidence of dysplasia'));
  assert.ok(r.comment.includes('QMH head and neck cancer template'));
  assert.ok(!r.comment.includes('{parts}'));
});

test('blank size field and single fragment produce no dangling text', () => {
  const r = run(one({ aggregateSize: '', blocks: '1' }));
  assert.equal(r.macro, 'Received in formalin are multiple polypoid pieces of glistening translucent tissue. All embedded in 1 block.');
  assert.ok(!r.report.includes('undefined'));
  assert.ok(!r.report.includes('__'));
  assert.ok(!r.report.includes(' cm'));
  const single = run(one({ fragments: 'One', aggregateSize: '1.2x0.8x0.5', blocks: '1' }));
  assert.equal(single.macro, 'Received in formalin is a polypoid piece of glistening translucent tissue measuring 1.2 x 0.8 x 0.5 cm. All embedded in 1 block.');
  assert.equal(single.blockKey, '(1) Polyp, all embedded.');
  assert.ok(single.microscopy.startsWith('Sections show a polypoid fragment of sinonasal mucosa'));
  const bx = run(one({ procedure: 'Biopsy', fragments: 'Two', aggregateSize: '0.4', blocks: '1' }));
  assert.equal(bx.macro, 'Received in formalin are two pieces of glistening translucent tissue measuring 0.4 cm in aggregate. All embedded in 1 block.');
  const bare = run(one({ epithelium: 'Ulcerated', basementMembrane: 'Absent', glandHyperplasia: 'Absent', infiltrate: 'Sparse' }));
  assert.ok(bare.microscopy.startsWith('Sections show polypoid fragments of sinonasal mucosa with surface ulceration and granulation tissue. The oedematous stroma contains a sparse inflammatory infiltrate. No fungal hyphae are seen on GMS.'));
  const noBm = run(one({ basementMembrane: 'Absent' }));
  assert.ok(noBm.microscopy.startsWith('Sections show polypoid fragments of sinonasal mucosa lined by respiratory epithelium. The oedematous stroma'));
});

test('metadata and example integrity', () => {
  assert.equal(schema.id, 'nasal_polyps');
  assert.equal(schema.generator, 'sinonasal');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.system, 'Head and neck');
  assert.equal(schema.rank, 36);
  assert.equal(schema.label, 'Nasal polyps');
  assert.equal(schema.organ, 'NASAL CAVITY');
  assert.equal(schema.name, 'Nasal polyps / sinonasal biopsy');
  assert.equal(schema.shortName, 'Nose · polypectomy / biopsy');
  assert.ok(schema.shortName.includes(' · '));
  assert.ok(schema.aliases.length >= 6);
  for (const a of ['nasal polyp', 'sinonasal', 'FESS', 'antrochoanal', 'inverted papilloma', 'oncocytic papilloma', 'sinonasal papilloma', 'fungal sinusitis', 'Schneiderian']) assert.ok(schema.aliases.includes(a), `alias ${a}`);
  assert.equal(schema.maxParts, 4);
  assert.equal(schema.defaultParts, 1);
  assert.equal(schema.version, '2026.09');
  assert.deepEqual(Object.keys(schema).slice(0, 10), ['id', 'version', 'name', 'shortName', 'label', 'organ', 'system', 'kind', 'rank', 'aliases']);
  assert.ok(schema.options.some((o) => o.id === 'includeHeader'));
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const f of schema.fields) {
    assert.ok('default' in f, `field ${f.id} needs a default`);
    assert.ok(f.id && f.label && f.type, `field ${f.id} needs id, label and type`);
    if (f.type === 'select') assert.ok(f.options.includes(f.default), `default of ${f.id} is an option`);
    if (f.showIf) assert.ok(ids.has(f.showIf.field), `showIf of ${f.id} points at a field`);
  }
  for (const p of schema.example.parts) {
    for (const k of Object.keys(p.values)) assert.ok(ids.has(k), `example key ${k} is not a field`);
    for (const id of ids) assert.ok(id in p.values, `example lacks field ${id}`);
  }
  // Snippet rules may be plain, any / all (the carcinoma-arising rule), or absent (ticked by hand).
  const ruleFields = (r) => (r.any || r.all ? (r.any || r.all).flatMap(ruleFields) : [r.field]);
  for (const sn of schema.snippets) for (const f of sn.auto ? ruleFields(sn.auto) : []) assert.ok(ids.has(f), `snippet ${sn.id} auto field ${f} exists`);
  assert.equal(schema.snippets.find((sn) => sn.id === 'inverted_papilloma').auto, undefined);
  const macroFields = schema.fields.filter((f) => f.group === 'Macroscopy').map((f) => f.id);
  const idx = macroFields.map((id) => schema.fields.findIndex((f) => f.id === id));
  assert.equal(idx[idx.length - 1] - idx[0] + 1, idx.length, 'Macroscopy fields are consecutive');
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.equal(gen.default.macro, gen.macro);
  assert.equal(gen.default.blockKey, gen.blockKey);
  assert.equal(gen.default.specimenName, gen.specimenName);
  assert.equal(gen.default.microscopy, gen.microscopy);
  assert.equal(gen.default.diagnosis, gen.diagnosis);
});
