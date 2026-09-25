// Oral cavity and oropharynx biopsy / excision (free text; two-tier house dysplasia grade with the
// WHO three-tier option, p16 on oropharyngeal carcinoma) - generator, checks, intake and golden fixtures.
// Fixtures: tests/fixtures/oral_biopsy/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as G from '../generators/oral_biopsy.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'oral_biopsy');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.oral_biopsy;
const { schema, generator } = t;
const EX = schema.example.parts[0].values;
const defaults = Object.fromEntries(schema.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));
const fieldOf = (id) => schema.fields.find((f) => f.id === id);

function run(patch = {}, options = {}) {
  const values = { ...defaults, ...EX, features: [], ...patch };
  const cs = { schemaId: 'oral_biopsy', caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', templateId: 'oral_biopsy', values }] };
  return generate(schema, generator, cs);
}
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const dx = (patch) => flat(run(patch).diagnosis);
const micro = (patch) => flat(run(patch).microscopy);
const msgs = (out, level) => out.issues.filter((i) => i.level === level).map((i) => i.message);
const TONGUE = 'ORAL CAVITY, left lateral tongue, biopsy - ';
const THREE = G.THREE_TIER;
const TONSIL_SCC = { organ: 'TONSIL', site: '', side: 'Left', finding: G.SCC, sccType: 'Non-keratinising' };

const CASES = [
  // Card accept: the example, a left lateral tongue biopsy with high grade dysplasia (house two-tier).
  ['oral-biopsy-01-tongue-high-grade-dysplasia', { features: EX.features }],
  // Card accept: the WHO three-tier option, moderate dysplasia on the buccal mucosa.
  ['oral-biopsy-02-buccal-moderate-dysplasia-three-tier', {
    organ: 'BUCCAL MUCOSA', site: '', side: 'Right', dysplasiaSystem: THREE, dysplasiaGrade: '', dysplasiaGrade3: 'Moderate'
  }],
  // Card accept: a tonsil biopsy with a p16-positive non-keratinising carcinoma, HPV-associated.
  ['oral-biopsy-03-tonsil-hpv-scc', { ...TONSIL_SCC, p16: 'Positive' }],
  // Card accept: a well-differentiated tongue carcinoma with perineural invasion on a superficial biopsy.
  ['oral-biopsy-04-tongue-scc-superficial', {
    finding: G.SCC, sccGrade: 'Well differentiated', invasion: ['Perineural invasion'], superficial: true
  }],
  // Card accept: a floor of mouth ranula excision (the benign mucus lesions).
  ['oral-biopsy-05-floor-of-mouth-ranula', { organ: 'FLOOR OF MOUTH', site: '', side: 'Left', procedure: 'Excision', finding: 'Ranula' }]
];

// ---------- registration and schema ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has oral_biopsy');
  assert.equal(schema.system, 'Head and neck');
  assert.equal(schema.kind, 'biopsy');
  assert.equal(schema.label, 'Oral cavity');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.ok(manifest.some((m) => m.id === 'oral_biopsy'), 'in the manifest');
});

test('every finding is in a group, prints a diagnosis and opens its microscopy with "Sections show"', () => {
  const finding = fieldOf('finding');
  assert.deepEqual(finding.optionGroups.flatMap((g) => g.options), finding.options, 'the groups hold every finding once, in order');
  assert.equal(new Set(finding.options).size, finding.options.length);
  const lines = new Set();
  for (const f of finding.options) {
    const patch = { finding: f, dysplasiaGrade: 'Low grade', sccGrade: 'Moderately differentiated' };
    const d = dx(patch);
    assert.ok(d.startsWith(TONGUE) && !d.includes('FINDING NOT SELECTED'), `${f}: ${d}`);
    assert.ok(micro(patch).startsWith('Sections show '), `${f} microscopy`);
    lines.add(d);
  }
  assert.equal(lines.size, finding.options.length, 'no two findings print the same line');
});

test('the example reads as the house writes it', () => {
  const out = run({ features: EX.features });
  assert.equal(out.specimens, 'Oral cavity, left lateral tongue, biopsy');
  assert.equal(flat(out.microscopy), 'Sections show squamous mucosa with high grade epithelial dysplasia. There is disordered stratification with drop-shaped rete ridges and loss of basal polarity, marked nuclear pleomorphism and hyperchromasia, and mitoses high in the epithelium. There is hyperkeratosis. There is no evidence of invasive carcinoma.');
  assert.equal(flat(out.diagnosis), `${TONGUE}HIGH GRADE DYSPLASIA`);
  assert.deepEqual(out.issues, []);
});

// ---------- dysplasia ----------

test('dysplasia: two-tier by default, the WHO three-tier grades on request', () => {
  assert.equal(fieldOf('dysplasiaSystem').default, G.TWO_TIER, 'the house default is the binary system');
  assert.deepEqual(fieldOf('dysplasiaGrade').options, ['Low grade', 'High grade']);
  assert.deepEqual(fieldOf('dysplasiaGrade3').options, ['Mild', 'Moderate', 'Severe']);
  assert.equal(dx({ dysplasiaGrade: 'Low grade' }), `${TONGUE}LOW GRADE DYSPLASIA`);
  assert.equal(dx({ dysplasiaGrade: 'High grade' }), `${TONGUE}HIGH GRADE DYSPLASIA`);
  for (const [grade, third] of [['Mild', 'lower'], ['Moderate', 'middle'], ['Severe', 'upper']]) {
    const patch = { dysplasiaSystem: THREE, dysplasiaGrade: '', dysplasiaGrade3: grade };
    assert.equal(dx(patch), `${TONGUE}${grade.toUpperCase()} DYSPLASIA`);
    assert.ok(micro(patch).includes(`${grade.toLowerCase()} epithelial dysplasia`) && micro(patch).includes(`${third} third`), grade);
  }
  // The grade of the system not in use is ignored.
  assert.equal(dx({ dysplasiaSystem: THREE, dysplasiaGrade: 'High grade', dysplasiaGrade3: 'Mild' }), `${TONGUE}MILD DYSPLASIA`);
  const none = run({ dysplasiaGrade: '' });
  assert.equal(flat(none.diagnosis), `${TONGUE}EPITHELIAL DYSPLASIA`);
  assert.deepEqual(msgs(none, 'error'), ['Choose the dysplasia grade.']);
  assert.equal(none.issues.find((i) => i.level === 'error').field, 'dysplasiaGrade');
  assert.equal(run({ dysplasiaSystem: THREE, dysplasiaGrade: '', dysplasiaGrade3: '' }).issues.find((i) => i.level === 'error').field, 'dysplasiaGrade3');
  assert.ok(micro({ dysplasiaGrade: 'High grade' }).endsWith('There is no evidence of invasive carcinoma.'));
});

// ---------- carcinoma ----------

test('carcinoma: grade, type, invasion and a superficial biopsy', () => {
  assert.equal(dx({ finding: G.SCC, sccGrade: 'Well differentiated' }), `${TONGUE}WELL-DIFFERENTIATED SQUAMOUS CELL CARCINOMA`);
  assert.ok(micro({ finding: G.SCC, sccGrade: 'Poorly differentiated' }).startsWith('Sections show a poorly differentiated invasive squamous cell carcinoma'));
  assert.equal(dx({ finding: G.SCC, sccType: 'Basaloid' }), `${TONGUE}BASALOID SQUAMOUS CELL CARCINOMA`);
  assert.ok(micro({ finding: G.SCC, sccType: 'Basaloid' }).includes('jigsaw pattern'));
  const ungraded = run({ finding: G.SCC });
  assert.deepEqual(msgs(ungraded, 'warn'), ['The carcinoma is not graded.']);
  assert.deepEqual(msgs(run({ finding: G.SCC, sccType: 'Basaloid' }), 'warn'), [], 'only keratinising carcinoma is graded');
  assert.ok(micro({ finding: G.SCC, superficial: true }).includes('The biopsy is superficial and the depth of invasion cannot be assessed.'));
  assert.ok(micro({ finding: G.VC, superficial: true }).includes('The base of the lesion is not included in the biopsy.'));
  assert.ok(/perineural invasion/i.test(micro({ finding: G.SCC, invasion: ['Perineural invasion'] })));
  assert.equal(dx({ finding: G.CIS }), `${TONGUE}SQUAMOUS CELL CARCINOMA IN SITU`);
  assert.equal(dx({ finding: G.VC }), `${TONGUE}VERRUCOUS CARCINOMA`);
});

test('oropharynx: p16 makes the carcinoma HPV-associated; the oral cavity ignores p16', () => {
  assert.equal(dx({ ...TONSIL_SCC, p16: 'Positive' }), 'TONSIL, left, biopsy - SQUAMOUS CELL CARCINOMA, NON-KERATINISING, HPV-ASSOCIATED; p16 positive');
  assert.ok(micro({ ...TONSIL_SCC, p16: 'Positive' }).includes('p16 immunohistochemistry shows strong, diffuse nuclear and cytoplasmic staining of the tumour cells.'));
  assert.ok(!/HPV-ASSOCIATED/.test(dx({ ...TONSIL_SCC, p16: 'Negative' })), 'p16 negative is not HPV-associated');
  assert.ok(msgs(run({ ...TONSIL_SCC, p16: 'Not performed' }), 'warn').includes('Oropharyngeal carcinoma: p16 immunohistochemistry is not recorded.'));
  assert.ok(msgs(run({ ...TONSIL_SCC, p16: 'Positive', hpvPcr: 'Negative' }), 'warn').includes('p16 positive with a negative HPV PCR: check the HPV status before the carcinoma is called HPV-associated.'));
  assert.ok(msgs(run({ ...TONSIL_SCC, sccType: 'Keratinising', sccGrade: 'Moderately differentiated', p16: 'Positive' }), 'warn').includes('HPV-associated carcinoma is not graded; the grade does not print.'));
  // A p16 left over on an oral cavity carcinoma neither prints nor warns.
  const oral = run({ finding: G.SCC, sccGrade: 'Moderately differentiated', p16: 'Positive' });
  assert.ok(!/p16|HPV/.test(oral.diagnosis + oral.microscopy));
  assert.deepEqual(oral.issues, []);
  for (const organ of G.ORO_ORGANS) assert.ok(G.oroSite({ organ }), organ);
});

// ---------- benign findings ----------

test('benign findings: house wording, features and stains', () => {
  assert.equal(dx({ finding: 'Frictional keratosis' }), `${TONGUE}HYPERKERATOSIS, consistent with FRICTIONAL KERATOSIS`);
  assert.equal(dx({ finding: G.VH }), `${TONGUE}VERRUCOUS HYPERPLASIA`);
  assert.equal(dx({ finding: G.VH, pvl: true }), `${TONGUE}VERRUCOUS HYPERPLASIA, consistent with PROLIFERATIVE VERRUCOUS LEUKOPLAKIA`);
  assert.equal(dx({ finding: 'Pyogenic granuloma' }), `${TONGUE}PYOGENIC GRANULOMA (LOBULAR CAPILLARY HAEMANGIOMA)`);
  assert.equal(dx({ finding: 'Ulcer', features: ['Actinomyces colonies'] }), `${TONGUE}ULCER with ACTINOMYCES`);
  assert.equal(dx({ finding: 'Ulcer', features: ['Candida hyphae', 'Actinomyces colonies'] }), `${TONGUE}ULCER with CANDIDA ORGANISMS AND ACTINOMYCES`);
  assert.equal(dx({ finding: 'Candidiasis', features: ['Candida hyphae'] }), `${TONGUE}CANDIDIASIS`, 'candidiasis does not repeat its organism');
  assert.ok(micro({ finding: 'Candidiasis', stains: ['PAS'] }).includes('PAS stain highlights the fungal hyphae.'));
  assert.ok(micro({ finding: 'Granular cell tumour', gctIhc: 'S100 and CD68 positive, AE1/AE3 negative' }).includes('The granular cells are positive for S100 and CD68 and negative for AE1/AE3.'));
  assert.ok(micro({ finding: G.ASP, atypicalReason: 'Adjacent to ulceration' }).includes('The atypical epithelium lies at the edge of an ulcer.'));
  assert.ok(micro({ finding: 'Mucocele' }).includes('without an epithelial lining'));
  assert.ok(micro({ finding: G.NEM }).endsWith('There is no evidence of dysplasia or malignancy.'));
});

test('checks: finding and side', () => {
  assert.deepEqual(msgs(run({ finding: '' }), 'error'), ['Choose the finding.']);
  for (const organ of ['TONGUE', 'BUCCAL MUCOSA', 'GINGIVA', 'TONSIL']) assert.ok(msgs(run({ organ, site: '', side: 'Not stated' }), 'warn').includes('The side is not stated.'), `${organ} is paired`);
  for (const organ of ['PALATE', 'FLOOR OF MOUTH', 'BASE OF TONGUE', 'LIP']) {
    assert.ok(!msgs(run({ organ, site: '', side: 'Not stated' }), 'warn').includes('The side is not stated.'), `${organ} is often midline`);
  }
});

// ---------- intake ----------

test('intake: oral and oropharyngeal biopsies and excisions come here', () => {
  const route = (line, history = '') => matchParts(parseIntake(`(A) ${line}`), history, manifest)[0];
  for (const [line, history] of [
    ['Tongue, left lateral, biopsy', 'leukoplakia'],
    ['Right buccal mucosa, incisional biopsy', 'white patch'],
    ['Left tonsil biopsy', '?SCC'],
    ['Base of tongue, biopsy', 'p16 positive'],
    ['Floor of mouth, mucocele, excision', ''],
    ['Lower lip, mucocele', ''],
    ['Gingiva, fibrous epulis, excision', ''],
    ['Palate, biopsy', '']
  ]) assert.equal(route(line, history).templateId, 'oral_biopsy', `${line} | ${history}`);
  assert.equal(route('LEFT TONSIL').templateId, 'tonsils', 'a bare tonsil is a tonsillectomy');
  assert.equal(route('Appendix, mucocele').templateId, 'appendix', 'a mucocele of the appendix is not oral');
  assert.equal(route('Right mandible, cyst, enucleation').templateId, 'jaw_cyst');
  assert.equal(route('Tongue, left lateral, partial glossectomy', 'SCC').templateId, 'oral_carcinoma');
});

test('intake: presets, with lesion words kept out of the site', () => {
  const preset = (line, history = '') => {
    const parsed = parseIntake(`(A) ${line}`);
    return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
  };
  const name = (line, history = '') => run({ site: '', side: 'Not stated', procedure: 'Biopsy', ...preset(line, history), finding: 'Ulcer' }).specimens;
  assert.deepEqual(preset('Floor of mouth, mucocele, excision'), { side: 'Not stated', organ: 'FLOOR OF MOUTH', procedure: 'Excision', finding: 'Mucocele' });
  assert.equal(name('Floor of mouth, mucocele, excision'), 'Floor of mouth, excision');
  assert.equal(name('Lower lip, mucocele'), 'Lip, lower, biopsy');
  assert.equal(name('Right lateral tongue, ulcer, incisional biopsy', '?SCC'), 'Tongue, right lateral, incisional biopsy');
  assert.equal(name('Buccal mucosa, leukoplakia, biopsy'), 'Buccal mucosa, biopsy');
  for (const line of ['Gingiva, epulis, excision', 'Gingiva, fibrous epulis, excision', 'Gingiva, pyogenic granuloma, excision']) assert.equal(name(line), 'Gingiva, excision', line);
  assert.equal(name('Floor of mouth, mucous retention cyst, excision'), 'Floor of mouth, excision');
  assert.equal(name('Tongue, fibroepithelial polyp, excision'), 'Tongue, excision');
  assert.equal(name('Tongue, granular cell tumour, excision'), 'Tongue, excision');
  assert.equal(preset('Left tonsil biopsy', '?SCC').organ, 'TONSIL');
  assert.equal(preset('Left tonsil biopsy', '?SCC').side, 'Left');
});

// ---------- golden fixtures ----------

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch, opts = {}] of CASES) {
    const out = run(patch, opts);
    const file = path.join(FIX, `${name}.json`);
    // A deliberate edit's reason lives in the fixture's description; --update keeps it.
    const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).description : undefined;
    const current = { ...(kept ? { description: kept } : {}), templateId: 'oral_biopsy', patch, options: opts, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});

test('golden fixtures: the card accept cases read as the card says', () => {
  const byName = Object.fromEntries(CASES.map(([n, p]) => [n, run(p)]));
  const line = (n) => flat(byName[n].diagnosis);
  assert.equal(line('oral-biopsy-01-tongue-high-grade-dysplasia'), `${TONGUE}HIGH GRADE DYSPLASIA`);
  assert.equal(line('oral-biopsy-02-buccal-moderate-dysplasia-three-tier'), 'BUCCAL MUCOSA, right, biopsy - MODERATE DYSPLASIA');
  assert.equal(line('oral-biopsy-03-tonsil-hpv-scc'), 'TONSIL, left, biopsy - SQUAMOUS CELL CARCINOMA, NON-KERATINISING, HPV-ASSOCIATED; p16 positive');
  assert.equal(line('oral-biopsy-04-tongue-scc-superficial'), `${TONGUE}WELL-DIFFERENTIATED SQUAMOUS CELL CARCINOMA`);
  assert.equal(line('oral-biopsy-05-floor-of-mouth-ranula'), 'FLOOR OF MOUTH, left, excision - RANULA');
  for (const [n] of CASES) assert.deepEqual(byName[n].issues, [], `${n} is clean`);
});
