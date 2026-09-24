// Specimen intake: LIS paste parser + template matcher (src/intake.js).
// Fixture: tests/fixtures/intake/cases.json — six house samples plus lists that reach every template.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseIntake, matchParts, presetValues, deriveTitle, splitTriple, MAX_PARTS, GENERIC_ID, matchOption, sideOf, clockSite } from '../src/intake.js';
import { loadManifest, loadTemplate } from '../src/registry.js';
import { parseSitesFromTitle } from '../generators/gastric.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/intake/cases.json', import.meta.url), 'utf8'));
const manifest = await loadManifest();

test('parser: lettered markers only, LIS triples, prefix, history and one-per-line lists', () => {
  const s1 = parseIntake(fx.cases[0].text);
  assert.equal(s1.history, 'CA corpus');
  assert.deepEqual(s1.parts.map((p) => p.label), ['A', 'B', 'C', 'D']);
  assert.equal(s1.parts[0].text, 'Uterus and appendages, resection');
  assert.equal(s1.parts[3].text, 'Para aortic sentinel lymph node', 'trailing "and" and commas stripped');
  assert.deepEqual(s1.warnings, []);

  const s2 = parseIntake(fx.cases[1].text);
  assert.equal(s2.casePrefix, 'Breast, excision');
  assert.equal(s2.parts[0].text, 'Left 2-3H breast mass');
  assert.match(s2.history, /^Left breast mass \(fibroepithelial lesion, \?phyllodes\)\n/);
  assert.match(s2.history, /Date of specimen immersed in formalin/, 'fixation lines stay in the history block');

  const s3 = parseIntake(fx.cases[2].text);
  assert.equal(s3.parts.length, 13, 'list after a blank line without a specimen heading');
  assert.equal(s3.parts[12].text, 'Proximal margin of sigmoid');
  assert.match(s3.history, /necrotic\ntumor was seen/, 'wrapped history line kept');

  const s4 = parseIntake(fx.cases[3].text);
  assert.deepEqual(splitTriple(s4.parts[1].raw), { site: 'Lymph node', detail: 'right paratracheal LN', procedure: 'resection' });
  assert.equal(s4.parts[0].text, 'Lung, right upper lobe, resection');

  const s6 = parseIntake(fx.cases[5].text);
  assert.equal(s6.parts.length, 15, 'station numbers "(8a)" are not part markers');
  assert.equal(s6.parts[9].detail, 'Com. Hepatic A LN (8a)');
  assert.equal(s6.parts[0].text, 'Stomach, resection', 'duplicated site collapses');
  assert.equal(s6.history, 'Gastric Ca');
});

test('parser: warnings for gaps, empty pastes and the 26-part cap', () => {
  assert.deepEqual(parseIntake('').parts, []);
  assert.deepEqual(parseIntake('').warnings, []);
  // Deliberate change 2026-09-21: unlettered text is a specimen list, not a warning. The LIS letters
  // a list and not a specimen, so a one-part case carries no "(A)" and used to yield no parts at all.
  assert.deepEqual(parseIntake('Just some history').warnings, []);
  assert.equal(parseIntake('Just some history').parts.length, 1);
  assert.equal(parseIntake(', ;').parts.length, 0);
  assert.match(parseIntake(', ;').warnings[0], /No specimen text/);
  const gap = parseIntake('(A) Skin, excision, (C) Skin, excision');
  assert.match(gap.warnings[0], /labelled \(C\); expected \(B\)/);
  const many = parseIntake(Array.from({ length: 27 }, (_, i) => `(${String.fromCharCode(65 + (i % 26))}) Part`).join(', '));
  assert.ok(many.warnings.some((w) => w.includes(`at most ${MAX_PARTS}`)));
  // An unlettered list past 26 parts numbers the overflow rather than labelling it `undefined`.
  const over = parseIntake(Array.from({ length: 28 }, (_, i) => `Part ${i + 1}`).join(','));
  assert.equal(over.parts.length, 28);
  assert.equal(over.parts[26].label, '27');
  assert.ok(over.warnings.some((w) => w.includes(`at most ${MAX_PARTS}`)));
  assert.ok(!over.warnings.some((w) => /expected \(undefined\)/.test(w)));
});

test('parser: a single specimen carries no letter, and the export joins parts on a spaceless comma', () => {
  // The house LIS letters a list, not a specimen: 0 of 4545 rows in the 2024-2026 case export carry
  // "(A)" at all, so the unlettered paste is the normal single-part case rather than an error.
  const one = parseIntake('Antrum, biopsy');
  assert.equal(one.parts.length, 1);
  assert.equal(one.parts[0].label, 'A');
  assert.equal(one.parts[0].text, 'Antrum, biopsy');
  assert.equal(one.parts[0].site, 'Antrum');
  assert.equal(one.parts[0].procedure, 'biopsy');
  // A comma with no space after it separates parts; the same comma with a space is "Site, detail".
  assert.deepEqual(parseIntake('Antrum,Angular,Body').parts.map((p) => p.text), ['Antrum', 'Angular', 'Body']);
  assert.deepEqual(parseIntake('Antrum,Angular,Body').parts.map((p) => p.label), ['A', 'B', 'C']);
  assert.deepEqual(parseIntake('Breast, Right mastectomy').parts.map((p) => p.text), ['Breast, Right mastectomy']);
  assert.deepEqual(parseIntake('Others, segment 3 lesion,Others, segment 6 lesion,Gallbladder').parts.map((p) => p.text),
    ['segment 3 lesion', 'segment 6 lesion', 'Gallbladder']);
  // A procedure word alone after a spaceless comma is the same part typed without the space.
  assert.deepEqual(parseIntake('Antrum,biopsy').parts.map((p) => p.text), ['Antrum, biopsy']);
  // History above a blank line still separates, with no heading and no letters anywhere.
  const withHistory = parseIntake('Dyspepsia, H pylori eradicated\n\nAntrum');
  assert.equal(withHistory.history, 'Dyspepsia, H pylori eradicated');
  assert.deepEqual(withHistory.parts.map((p) => p.text), ['Antrum']);
  // One per line is a list too.
  assert.deepEqual(parseIntake('Specimen\nAntrum\nBody').parts.map((p) => p.text), ['Antrum', 'Body']);
  // A lettered list is untouched by any of this.
  assert.deepEqual(parseIntake('(A) Antrum and (B) Body').parts.map((p) => p.label), ['A', 'B']);
});

test('parser: the LIS null category and a repeated phrase are dropped from the part text', () => {
  // "Others" is the export's null category, not a site (959 of 6384 part-pieces); a part whose
  // category and description hold the same phrase (730 pieces) would otherwise print it twice.
  assert.equal(parseIntake('Others, vault biopsy').parts[0].text, 'vault biopsy');
  assert.equal(parseIntake('Placenta, Placenta').parts[0].text, 'Placenta');
  assert.equal(parseIntake('right knee tumor, right knee tumor').parts[0].text, 'right knee tumor');
  assert.equal(parseIntake('(A) Others, Left frontal tumour').parts[0].text, 'Left frontal tumour');
  // Not a repeat and not a null category: left exactly as the LIS wrote it.
  assert.equal(parseIntake('Soft tissue, right calf mass').parts[0].text, 'Soft tissue, right calf mass');
  assert.equal(parseIntake('Others').parts[0].text, 'Others');
});

test('matcher: a bare site word resolves where the corpus says it may, and stays a choice where it does not', () => {
  const one = (text, history = '') => matchParts(parseIntake(text), history, manifest)[0];
  // `match.bare` templates: the site word alone is evidence, because the rival specimen is always
  // named. Percentages are single-part rows of the 2024-2026 export naming no procedure, by test code.
  for (const text of ['antrum', 'Antrum', 'Gastric antrum', 'Body', 'Incisura', 'Angular', 'Stomach']) {
    const m = one(text);
    assert.equal(m.templateId, 'gastric_biopsy', `${text}: ${m.templateId}`);   // 157/179 biopsy
    assert.equal(m.tier, 'confident', `${text}: ${m.tier}`);
  }
  assert.equal(one('Endometrium, EA').templateId, 'endometrial_biopsy');        // 107/128 biopsy
  assert.equal(one('Thyroid, Right thyroid nodule').templateId, 'thyroid_fna'); // 125/137 cytology
  // Not flagged, and deliberately so: a bare colon segment is as likely a resection as a polyp
  // (125/162), a bare prostate as likely chips as cores (9/29), a bare cervix most often a smear.
  for (const text of ['Sigmoid', 'Ascending colon', 'Prostate', 'Cervix']) {
    assert.notEqual(one(text).tier, 'confident', `${text} should stay a choice`);
  }
  // The bonus is silence-only: name the resection and it goes away.
  assert.equal(one('Stomach, subtotal gastrectomy', 'Gastric Ca').templateId, 'gastric_carcinoma');
  assert.equal(one('Uterus and cervix, resection', 'Fibroids').templateId, 'uterus_benign');
  assert.equal(one('Thyroid, right hemithyroidectomy').templateId, 'thyroid_benign');
});

test('matcher: an organ with one routine operation beats its carcinoma twin until the history says otherwise', () => {
  const one = (text, history = '') => matchParts(parseIntake(text), history, manifest)[0];
  // A benign resection and its carcinoma twin both scored zero on a bare organ word, so the pair
  // tied and the part fell to the generic form. Every gallbladder (46 pieces) and appendix (18) in
  // the export is a surgical specimen, so the routine operation is the reading with nothing else said.
  for (const [text, id] of [['Gallbladder', 'gallbladder'], ['gallbladder, gallbladder', 'gallbladder'],
    ['Others, gallbladder', 'gallbladder'], ['Appendix', 'appendix'], ['appendix, appendix', 'appendix']]) {
    const m = one(text);
    assert.equal(m.templateId, id, `${text}: ${m.templateId}`);
    assert.equal(m.tier, 'confident', `${text}: ${m.tier}`);
  }
  // Clinical history still decides: the tie-break is only for silence, never against evidence.
  assert.equal(one('Appendix', 'Appendiceal adenocarcinoma').templateId, 'appendix_carcinoma');
  assert.equal(one('Endometrium', 'CA corpus').templateId, 'endometrial_carcinoma');
  assert.notEqual(one('Gallbladder', 'CA gallbladder').tier, 'confident');
});

test('matcher: house subsite abbreviations need a specimen word beside them', () => {
  const one = (text, history = '') => matchParts(parseIntake(text), history, manifest)[0];
  // Counted in the 2021-2026 biopsy export, where each of these appears only in colorectal context:
  // AC 10 rows, ICV 7, TC 6, DC 4, HF 2. Before this they matched no site list and every part after
  // the first fell to the generic form - an eleven-part screening colonoscopy arrived with one
  // template suggested and ten blanks.
  for (const text of ['DC polyp 1', 'AC polyp 2', 'TC polyps', 'HF polyp 1', 'ICV biopsy', 'AC cancer', 'ICV SMT', 'DC tumour']) {
    assert.equal(one(text, 'Screening for colonic polyps').templateId, 'colonic_polyp', `${text}`);
  }
  // Two letters are weak evidence, so the abbreviation only counts when the part also names what was
  // taken. In the same corpus AC is the acromioclavicular joint and an axillary clearance margin.
  for (const text of ['AC joint, excision', 'superior AC final margin', 'AC', 'DC']) {
    const m = one(text);
    assert.notEqual(m.templateId, 'colonic_polyp', `${text} is not a colonic polyp`);
    assert.notEqual(m.templateId, 'colon_resection', `${text} is not a colon resection`);
  }
  // Excluded on the same evidence: in this corpus AV is the aortic valve and an arteriovenous
  // fistula as often as the anal verge, and SC is the squamocolumnar junction, never sigmoid colon.
  // "Rectum, 2cm from AV" already matches on "Rectum", so the anal verge loses nothing. Asserted on
  // the schema rather than on behaviour, because a rival template happens to outscore the colon on
  // these phrases either way - which would let the exclusion be reverted with every test still green.
  const ambiguous = ['AV', 'SC', 'LN', 'GU', 'POD', 'IC'];
  for (const t of manifest) {
    const abbrev = t.match?.siteAbbrev || [];
    for (const a of ambiguous) {
      assert.ok(!abbrev.includes(a), `${t.id} lists ${a}, which is not a subsite in this corpus`);
    }
  }
  assert.equal(one('Rectum, 2cm from AV, biopsy').templateId, 'colonic_polyp');
  assert.notEqual(one('Aortic valve, replacement').templateId, 'colonic_polyp');
  assert.notEqual(one('Stomach, SC junction biopsy').templateId, 'colonic_polyp');
  // Every abbreviation that is declared must be short enough to need the gate; a full word here
  // would silently stop matching when the part names no specimen.
  for (const t of manifest) {
    for (const a of t.match?.siteAbbrev || []) {
      assert.ok(a.length <= 4, `${t.id}: "${a}" is a word, and belongs in match.site`);
    }
  }
  // A word boundary keeps the short forms out of longer abbreviations that share their letters.
  assert.notEqual(one('Left breast, DCIS, mastectomy', 'DCIS on core').templateId, 'colonic_polyp');
  assert.notEqual(one('Skin, left cheek, SCC, excision').templateId, 'colonic_polyp');
});

test('matcher: an eleven-part screening colonoscopy resolves every part', () => {
  const specimen = '(A) Caecal polyp, (B) DC polyp 1, (C) DC polyp 2, (D) DC polyp 3, (E) DC polyp 4, '
    + '(F) DC polyp 5, (G) DC polyp 6, (H) DC polyp 7, (I) DC polyp 8, (J) DC polyp 9 and (K) DC polyp 10';
  const parsed = parseIntake(specimen);
  assert.equal(parsed.parts.length, 11);
  const rows = matchParts(parsed, 'Colonic polyp\nScreening for colonic polyps', manifest);
  assert.equal(rows.length, 11);
  for (const r of rows) assert.equal(r.templateId, 'colonic_polyp', `(${r.label}) ${r.text}`);
  for (const r of rows) assert.equal(r.tier, 'confident', `(${r.label}) should not need a choice`);
});

test('matcher: export vocabulary that matched no site list', () => {
  const one = (text, history = '') => matchParts(parseIntake(text), history, manifest)[0];
  assert.equal(one('Caecal Polyp').templateId, 'colonic_polyp');                    // 36 pieces, 33 biopsies
  assert.equal(one('Cecal polyp').templateId, 'colonic_polyp');
  assert.equal(one('Prostate, 4 right anterior sector').templateId, 'prostate_biopsy');  // 91 pieces, all coded B3
  assert.equal(one('Prostate, 6 right posterior sector').tier, 'confident');
  assert.equal(one('Left hemithyroid').templateId, 'thyroid_benign');
  // "Angular" is the house word for the incisura and reaches the subsite pick-list, not just the template.
  const angular = one('Angular');
  assert.equal(angular.templateId, 'gastric_biopsy');
  assert.equal(matchOption(['Unspecified', 'Antrum, greater curvature', 'Incisura angularis', 'Fundus'], 'Angular'), 'Incisura angularis');
  // "Antrum" alone still refuses to choose between the two antral options.
  assert.equal(matchOption(['Antrum, greater curvature', 'Antrum, lesser curvature'], 'Antrum'), '');
});

test('matcher: every fixture part gets the expected template; >=90% top-1 and no confident miss', () => {
  let total = 0; let top1 = 0; const misses = []; const confidentWrong = [];
  for (const c of fx.cases) {
    const parsed = parseIntake(c.text);
    if (c.casePrefix !== undefined) assert.equal(parsed.casePrefix, c.casePrefix, `${c.name}: prefix`);
    if (c.history !== undefined) assert.equal(parsed.history, c.history, `${c.name}: history`);
    const matched = matchParts(parsed, parsed.history, manifest);
    assert.equal(matched.length, c.expect.length, `${c.name}: part count`);
    matched.forEach((m, i) => {
      const e = c.expect[i];
      total++;
      assert.equal(m.label, e.label, `${c.name}: label ${i}`);
      const ok = m.templateId === e.templateId && m.tier === e.tier;
      if (ok) top1++; else misses.push(`${c.name} (${m.label}) ${m.text}: got ${m.templateId}/${m.tier}, expected ${e.templateId}/${e.tier}`);
      if (m.tier === 'confident' && m.templateId !== e.templateId) confidentWrong.push(`${c.name} (${m.label})`);
      if (c.texts?.[m.label]) assert.equal(m.text, c.texts[m.label], `${c.name}: display text ${m.label}`);
    });
  }
  assert.deepEqual(confidentWrong, [], 'confident tier must never be wrong');
  assert.ok(top1 / total >= 0.9, `top-1 ${top1}/${total}\n${misses.join('\n')}`);
  assert.deepEqual(misses, [], 'all fixture parts match (tighten deliberately if a template is added)');
});

test('matcher: biopsy templates never match resections; generic is the fallback', () => {
  const lung = matchParts(parseIntake('(A) Lung, right upper lobe, resection'), 'Lung Ca', manifest)[0];
  assert.equal(lung.templateId, 'lung_carcinoma', 'the lung carcinoma resection template (Phase 7) takes a lung resection with a cancer history');
  assert.ok(!lung.candidates.some((cd) => cd.id === 'lung_biopsy' && cd.score >= 0), 'lung_biopsy is penalised for a resection');
  const kidney = matchParts(parseIntake('(A) Kidney, right, resection'), 'RCC', manifest)[0];
  assert.equal(kidney.templateId, GENERIC_ID, 'no resection template for the organ: generic');
  const gastric = matchParts(parseIntake('(A) Stomach, stomach, Resection'), 'Gastric Ca', manifest)[0];
  assert.equal(gastric.templateId, 'gastric_carcinoma', 'the gastric carcinoma resection template (Phase 11) takes a gastric resection with a cancer history');
  assert.ok(gastric.candidates.some((cd) => cd.id === 'gastric_biopsy'), 'still offered in the dropdown');
  const unknown = matchParts(parseIntake('(A) Something odd'), '', manifest)[0];
  assert.equal(unknown.templateId, GENERIC_ID);
  assert.equal(unknown.tier, 'none');
  assert.deepEqual(unknown.candidates, []);
});

test('matcher: clinical history decides between templates of the same organ', () => {
  const list = '(A) Uterus, resection';
  assert.equal(matchParts(parseIntake(list), 'Fibroids', manifest)[0].templateId, 'uterus_benign');
  assert.equal(matchParts(parseIntake(list), 'CA corpus', manifest)[0].templateId, 'endometrial_carcinoma');
  assert.equal(matchParts(parseIntake(list), 'Leiomyomas', manifest)[0].templateId, 'uterus_benign');
  const serous = matchParts(parseIntake(list), 'Serous carcinoma', manifest)[0];
  assert.equal(serous.tier, 'choose', 'a bare cancer word does not fix the primary');
  const none = matchParts(parseIntake(list), '', manifest)[0];
  assert.equal(none.tier, 'choose');
});

test('presets: a house abbreviation reaches the Site field, but only where the field offers it', async () => {
  const polyp = (await loadTemplate('colonic_polyp')).schema;
  const ibd = (await loadTemplate('ibd_biopsy')).schema;
  const site = (schema, text) => {
    const m = matchParts(parseIntake(`(A) ${text}`), 'Screening for colonic polyps', manifest)[0];
    return presetValues(schema, m, m).site;
  };
  // Matching the template was only half of it: the part still arrived with an empty Site field, so
  // the subsite had to be picked eleven times by hand on a screening colonoscopy.
  assert.equal(site(polyp, 'DC polyp 1'), 'Descending colon');
  assert.equal(site(polyp, 'AC polyp 2'), 'Ascending colon');
  assert.equal(site(polyp, 'TC polyps'), 'Transverse colon');
  assert.equal(site(polyp, 'HF polyp 1'), 'Hepatic flexure');
  // The adjective names the same option as the noun.
  assert.equal(site(polyp, 'Caecal polyp'), 'Cecum');
  assert.equal(site(polyp, 'Cecal polyp'), 'Cecum');
  assert.equal(site(polyp, 'Rectal polyp'), 'Rectum');
  // Unchanged: a full site word, and a bare organ word that names no subsite.
  assert.equal(site(polyp, 'Descending colon polyp'), 'Descending colon');
  assert.equal(site(polyp, 'Sigmoid polyp'), 'Sigmoid');
  assert.equal(site(polyp, 'Colonic polyp'), undefined, 'no subsite named, so nothing to fill');
  // The expansion is contained by the field: it fires only when this list offers the result. ICV is
  // on the IBD list and not on the polyp list, so the polyp form is left for the reporter to set
  // rather than rounded to the nearest neighbouring site.
  assert.equal(site(ibd, 'ICV biopsy'), 'Ileocaecal valve');
  assert.equal(site(polyp, 'ICV polyp'), undefined, 'no ileocaecal option here, so no guess');
});

test('presets: the abbreviations cannot leak onto a field that means something else by them', async () => {
  const { matchOption } = await import('../src/intake.js');
  // Expanding "AC" inserts the word "colon" into the text, and two shipped lists offer a bare
  // "Colon" option - one of them a staging field. Ungated, "AC margin" on a Whipple would set
  // pancreatic tumour extension to Colon, which is a pT change. So the expansion is asserted here
  // against the real lists rather than a made-up one: these are the fields that would actually be
  // hit. A synthetic list passed this test while the gate was removed.
  const optionsOf = async (id, fieldId) => {
    const schema = (await loadTemplate(id)).schema;
    const fields = Array.isArray(schema.fields) ? schema.fields : Object.values(schema.fields || {}).flat();
    return fields.find((f) => f.id === fieldId).options;
  };
  const pancreas = await optionsOf('pancreas_carcinoma', 'tumourExtension');
  const gist = await optionsOf('gist_resection', 'tumourSite');
  assert.ok(pancreas.includes('Colon') && gist.includes('Colon'), 'the bare Colon option moved; re-point this test');
  for (const text of ['AC margin', 'DC segment', 'TC lesion', 'AC joint', 'post AC chemotherapy']) {
    assert.equal(matchOption(pancreas, text), '', `pancreas extension took "${text}"`);
    assert.equal(matchOption(gist, text), '', `GIST site took "${text}"`);
  }
  // Still works where it is meant to: a spelled-out colon does reach those same lists.
  assert.equal(matchOption(gist, 'Colon, resection'), 'Colon');
  // And a list offering only a near-miss never takes the colonic expansion.
  assert.equal(matchOption(['Ascending aorta', 'Aortic arch', 'Descending aorta'], 'DC segment'), '');
  assert.equal(matchOption(['Superior', 'Inferior', 'Medial', 'Lateral'], 'AC margin'), '');
});

test('presets: lymph node station, breast margins and generic specimen name', async () => {
  const ln = (await loadTemplate('lymph_node')).schema;
  const br = (await loadTemplate('breast_excision')).schema;
  const gen = (await loadTemplate(GENERIC_ID)).schema;
  const gb = (await loadTemplate('gastric_biopsy')).schema;
  const lung = matchParts(parseIntake(fx.cases[3].text), 'Lung Ca', manifest);
  assert.deepEqual(presetValues(ln, lung[1], lung[1]), { specimenName: 'right paratracheal LN', procedure: 'Resection' });
  assert.equal(presetValues(gen, lung[0], lung[0]).specimenName, 'Lung, right upper lobe, resection');
  const s1 = matchParts(parseIntake(fx.cases[0].text), 'CA corpus', manifest);
  assert.equal(presetValues(ln, s1[1], s1[1]).procedure, 'Sentinel lymph node biopsy');
  assert.equal(presetValues(ln, s1[1], s1[1]).specimenName, 'Left sentinel pelvic lymph node');
  assert.equal(presetValues(ln, s1[3], s1[3]).side, undefined);
  const breast = matchParts(parseIntake(fx.cases[1].text), '', manifest);
  assert.deepEqual(presetValues(br, breast[0], breast[0]), { side: 'Left', partType: 'Breast lesion excision', site: 'Left 2-3H breast mass' });
  assert.deepEqual(presetValues(br, breast[1], breast[1]), { side: 'Left', partType: 'Cavity shave margin', margin: 'Anterior' }, 'margin side follows the main breast part');
  const odd = matchParts(parseIntake('Breast, excision: (A) Breast lump and (B) Superolateral margin'), '', manifest);
  assert.deepEqual(presetValues(br, odd[1], odd[1]), { partType: 'Cavity shave margin', margin: 'Other', marginOther: 'superolateral' }, 'no side when the case does not say');
  const gastric = matchParts(parseIntake(fx.cases[6].text), '', manifest);
  assert.equal(presetValues(gb, gastric[0], gastric[0]).specimenName, 'antrum', 'match.fill from the LIS detail');
  // Fixture-declared values
  for (const c of fx.cases) {
    if (!c.values) continue;
    const matched = matchParts(parseIntake(c.text), parseIntake(c.text).history, manifest);
    for (const [label, want] of Object.entries(c.values)) {
      const m = matched.find((x) => x.label === label);
      const schema = (await loadTemplate(m.templateId)).schema;
      const got = presetValues(schema, m, m);
      for (const [k, v] of Object.entries(want)) assert.equal(got[k] ?? '', v, `${c.name} (${label}).${k}`); // '' in the fixture = must stay unset
    }
  }
});

test('subsite pre-fill: option matching from the specimen text', async () => {
  const ibd = ['Terminal ileum', 'Ileocaecal valve', 'Caecum', 'Ascending colon', 'Hepatic flexure', 'Transverse colon', 'Splenic flexure', 'Descending colon', 'Sigmoid colon', 'Rectosigmoid', 'Rectum', 'Random colon'];
  assert.equal(matchOption(ibd, 'Terminal ileum, biopsy'), 'Terminal ileum');
  assert.equal(matchOption(ibd, 'TI, biopsy'), 'Terminal ileum', 'TI shorthand');
  const proc = ['Right hemicolectomy', 'Anterior resection', 'Low anterior resection', 'Abdominoperineal resection', 'Other'];
  assert.equal(matchOption(proc, 'Sigmoid colon, anterior resection'), 'Anterior resection');
  assert.equal(matchOption(proc, 'Rectum, low anterior resection'), 'Low anterior resection', 'longest option wins');
  assert.equal(matchOption(proc, 'Rectum, APR'), 'Abdominoperineal resection', 'APR shorthand');
  assert.equal(matchOption(proc, 'Rectum, LAR'), 'Low anterior resection', 'LAR shorthand');
  assert.equal(matchOption(ibd, 'Cecum, biopsy'), 'Caecum', 'spelling folded');
  assert.equal(matchOption(ibd, 'Ascending, biopsy'), 'Ascending colon', '"colon" optional in the option');
  assert.equal(matchOption(ibd, 'Rectosigmoid junction, biopsy'), 'Rectosigmoid');
  assert.equal(matchOption(ibd, 'Rectum, biopsy'), 'Rectum', 'rectum does not match rectosigmoid');
  assert.equal(matchOption(ibd, 'Random colonic biopsies'), 'Random colon');
  assert.equal(matchOption(ibd, 'Colon, biopsy'), '', 'no site named → default kept');
  const ut = ['Uterus and cervix, total hysterectomy', 'Uterus, cervix and bilateral adnexa', 'Uterus, subtotal', 'Myomectomy', 'Left tube and ovary', 'Right tube and ovary', 'Fallopian tube(s), sterilisation'];
  assert.equal(matchOption(ut, 'Uterus and appendages, TLHBSO'), 'Uterus, cervix and bilateral adnexa', 'TLHBSO / appendages shorthand');
  assert.equal(matchOption(ut, 'Uterus, cervix, bilateral tubes and ovaries, TAHBSO'), 'Uterus, cervix and bilateral adnexa');
  assert.equal(matchOption(ut, 'Uterus, TAH'), 'Uterus and cervix, total hysterectomy', 'TAH shorthand');
  assert.equal(matchOption(ut, 'Right ovary and tube, excision'), 'Right tube and ovary');
  assert.equal(matchOption(ut, 'Bilateral fallopian tubes, sterilization'), 'Fallopian tube(s), sterilisation');
  assert.equal(matchOption(ut, 'Uterus, hysterectomy'), '', 'bare hysterectomy keeps the default');
  const gastric = ['Unspecified', 'Antrum, greater curvature', 'Antrum, lesser curvature', 'Incisura angularis', 'Body, greater curvature', 'Body, lesser curvature', 'Fundus', 'Cardia'];
  assert.equal(matchOption(gastric, 'Stomach, antrum, biopsy'), '', 'curvature unknown → Unspecified');
  assert.equal(matchOption(gastric, 'Stomach, antrum GC, biopsy'), 'Antrum, greater curvature');
  assert.equal(matchOption(gastric, 'Stomach, incisura, biopsy'), 'Incisura angularis');
  assert.equal(matchOption(['Mandible', 'Maxilla'], 'Left mandibular cyst, enucleation'), 'Mandible');
  assert.equal(matchOption(['Colon, not otherwise specified', 'Sigmoid colon', 'Rectum'], 'Colon, right hemicolectomy'), '', 'unspecific options never chosen');
  // through presetValues on the real schemas
  const ibdSchema = (await loadTemplate('ibd_biopsy')).schema;
  const rows = matchParts(parseIntake(fx.cases[8].text), parseIntake(fx.cases[8].text).history, manifest);
  assert.equal(presetValues(ibdSchema, rows[1], rows[1]).site, 'Ascending colon');
  const polyp = (await loadTemplate('colonic_polyp')).schema;
  const prow = matchParts(parseIntake('(A) Ascending colon, polypectomy'), 'polyp', manifest)[0];
  assert.equal(prow.templateId, 'colonic_polyp');
  assert.equal(presetValues(polyp, prow, prow).site, 'Ascending colon');
});

test('derived title feeds the gastric site parser for every letter A–Z', () => {
  const parsed = parseIntake(fx.cases[6].text);
  const title = deriveTitle(parsed.parts);
  assert.equal(title, fx.cases[6].title);
  assert.deepEqual(parseSitesFromTitle(title), { A: 'antrum', B: 'body' });
  const many = parseIntake(fx.cases[5].text);
  const sites = parseSitesFromTitle(deriveTitle(many.parts));
  assert.equal(Object.keys(sites).length, 15);
  assert.equal(sites.O, 'Hepatoduodenal LN (12a)');
  assert.equal(deriveTitle([]), '');
  assert.equal(deriveTitle(parseIntake('(A) Omentum').parts), '(A) Omentum');
});

test('generic template prints free text in the house layout and warns when empty', async () => {
  const { generateCase } = await import('../src/engine.js');
  const t = await loadTemplate(GENERIC_ID);
  const cs = {
    schemaId: GENERIC_ID, caseTitle: '', options: { includeHeader: false }, meta: {},
    parts: [
      { label: 'A', templateId: GENERIC_ID, values: { specimenName: 'Omentum, resection', macro: '', microscopy: 'Sections show fibroadipose tissue. There is no evidence of malignancy.', diagnosis: 'NO EVIDENCE OF MALIGNANCY' } },
      { label: 'B', templateId: GENERIC_ID, values: { specimenName: 'Spleen', macro: 'Received is a spleen weighing 120 g.', microscopy: 'Sections show ', diagnosis: '' } }
    ]
  };
  const out = generateCase({ [GENERIC_ID]: t }, cs);
  assert.equal(out.diagnosis, '(A) OMENTUM, resection - NO EVIDENCE OF MALIGNANCY\n(B) SPLEEN');
  assert.equal(out.microscopy, '(A) Sections show fibroadipose tissue. There is no evidence of malignancy.');
  assert.equal(out.macro, '(B) Received is a spleen weighing 120 g.');
  assert.deepEqual(out.issues.map((i) => `${i.part}:${i.message}`), ['B:Generic part has no microscopy text.', 'B:Generic part has no diagnosis.']);
  const single = generateCase({ [GENERIC_ID]: t }, { ...cs, parts: [cs.parts[0]] });
  assert.equal(single.diagnosis, 'OMENTUM, resection - NO EVIDENCE OF MALIGNANCY', 'single part drops the letter');
});

test('pasted prostate specimen copies into Site and flows into the diagnosis line', async () => {
  const { schema } = await loadTemplate('prostate_biopsy');
  const site = (text) => {
    const row = matchParts(parseIntake(`Specimen\n${text}`), '', manifest)[0];
    assert.equal(row.templateId, 'prostate_biopsy', text);
    return presetValues(schema, row, row).specimenName || '';
  };
  // The LIS triple parses: the middle bit is the site.
  assert.equal(site('(A) Prostate, right base, biopsy'), 'Right base');
  assert.equal(site('(A) Prostate, systematic core, right lateral base, biopsy'), 'Right lateral base');
  // No trailing procedure word, so no triple — the whole pasted part is copied and tidied.
  assert.equal(site('(A) Prostate biopsy, left apex'), 'Left apex');
  assert.equal(site('(A) TRUS guided prostate biopsy, right mid'), 'Right mid');
  assert.equal(site('(A) Left apex prostatic cores'), 'Left apex');
  assert.equal(site('(A) Prostate, target 1 (left anterior), biopsy'), 'Target 1 (left anterior)');
  // Nothing but the organ and the procedure: Site stays empty rather than inventing one.
  assert.equal(site('(A) Prostate, transperineal biopsy'), '');

  const { generateCase } = await import('../src/engine.js');
  const t = await loadTemplate('prostate_biopsy');
  const build = (specimenName) => generateCase({ prostate_biopsy: t }, {
    schemaId: 'prostate_biopsy', caseTitle: '', options: { includeHeader: false, summary: false }, meta: {},
    parts: [{ label: 'A', templateId: 'prostate_biopsy', values: { specimenName, coresTotal: 2, category: 'Benign' } },
      { label: 'B', templateId: 'prostate_biopsy', values: { specimenName: 'Right base', coresTotal: 2, category: 'Benign' } }]
  }).diagnosis.split('\n')[0];
  assert.equal(build('Left apex'), '(A) PROSTATE, left apex, needle core biopsy - NO EVIDENCE OF MALIGNANCY');
  assert.equal(build(''), '(A) PROSTATE, needle core biopsy - NO EVIDENCE OF MALIGNANCY', 'no site, no "part a"');

  // The microscopy heading drops the site the same way, so a part with none reads "2 cores".
  const micro = (specimenName) => generateCase({ prostate_biopsy: t }, {
    schemaId: 'prostate_biopsy', caseTitle: '', options: { includeHeader: false, summary: false }, meta: {},
    parts: [{ label: 'A', templateId: 'prostate_biopsy', values: { specimenName, coresTotal: 2, category: 'Benign' } }]
  }).microscopy.split('\n')[0];
  assert.equal(micro('Left apex'), 'Left apex, 2 cores', 'single part drops the letter');
  assert.equal(micro(''), '2 cores');
});

test('matcher: Whipple phrasings route to the pancreas and ampulla synoptics', () => {
  const one = (text, history) => matchParts(parseIntake(`(A) ${text}`), history, manifest)[0];
  const panc = [
    ['Pancreas and duodenum, pancreaticoduodenectomy', 'CA pancreas'],
    ['Whipple resection', 'Pancreatic head mass'],
    ['Pancreas, head, Whipple', 'Pancreatic ductal adenocarcinoma'],
  ];
  for (const [text, history] of panc) {
    const m = one(text, history);
    assert.equal(m.templateId, 'pancreas_carcinoma', `${text}: ${m.templateId}`);
    assert.equal(m.tier, 'confident', `${text}: ${m.tier}`);
  }
  const amp = [
    ['Ampulla of Vater, pancreaticoduodenectomy', 'CA ampulla'],
    ['Ampullary carcinoma, Whipple resection', 'Ampullary carcinoma'],
    ['Periampullary tumour, Whipple', 'CA ampulla'],
  ];
  for (const [text, history] of amp) {
    const m = one(text, history);
    assert.equal(m.templateId, 'ampulla_carcinoma', `${text}: ${m.templateId}`);
    assert.equal(m.tier, 'confident', `${text}: ${m.tier}`);
  }
});

test('sideOf: words, Lt / Rt, and the letter on a clock hour; nothing when unstated or both', () => {
  const cases = [
    ['breast, L11H lesion, biopsy', 'Left'], ['Breast, R2H mass, core biopsy', 'Right'], ['L 11H', 'Left'],
    ['L10-11H', 'Left'], ["R 2 o'clock", 'Right'], ['Lt 11H', 'Left'], ['Lt. breast', 'Left'], ['Rt axilla', 'Right'],
    ['Left breast, core biopsy', 'Left'], ["Right 2 O'clock 3cm FN", 'Right'], ['Parotid, right, excision', 'Right'],
    ['breast, 11H lesion, biopsy', ''], ['Breast, core biopsy', ''], ['Left breast and right axilla', ''],
    ['post-RT changes', ''], ['RT', ''], ['LN, core biopsy', ''], ['L 3 cores', ''], ['cleft', ''], ['2 H&E levels', '']
  ];
  for (const [text, side] of cases) assert.equal(sideOf(text), side, text);
});

test('clockSite: the breast site the house way, side and generic nouns out', () => {
  const cases = [
    ['L11H lesion', "11 o'clock"], ['R2H', "2 o'clock"], ['L 11H mass', "11 o'clock"], ['Lt 11H lesion', "11 o'clock"],
    ["Right 2 O'clock, 3cm FN", "2 o'clock, 3 cm FN"], ['R10-11H PA lesion', "10-11 o'clock, PA"], ['L10/11H', "10-11 o'clock"],
    ['left 11 oclock 2FN', "11 o'clock, 2 cm FN"], ["left breast 11 o\u2019clock", "11 o'clock"], ['3 cm from the nipple, 1H', "1 o'clock, 3 cm FN"],
    ['left UOQ', 'UOQ'], ['left axillary tail lesion', 'axillary tail'], ['left breast', ''], ['lesion', ''], ['', '']
  ];
  for (const [text, want] of cases) assert.equal(clockSite(text), want, text);
  assert.equal(clockSite('Left breast 11H lesion core biopsy', { tokensOnly: true }), "11 o'clock", 'not a triple: clock only');
  assert.equal(clockSite('Left breast core biopsy', { tokensOnly: true }), '');
});

test('pasted breast core: "L11H" gives the left side and the 11 o\'clock site, and the lines mirror it', async () => {
  const t = await loadTemplate('breast_biopsy');
  const { generateCase, createPart } = await import('../src/engine.js');
  const intake = (text) => {
    const row = matchParts(parseIntake(text), '', manifest)[0];
    assert.equal(row.templateId, 'breast_biopsy', text);
    return presetValues(t.schema, row, row);
  };
  assert.deepEqual(intake('breast, L11H lesion, biopsy'), { laterality: 'Left', specimenName: "11 o'clock" });
  assert.deepEqual(intake('Breast, R2H 3cm FN, core biopsy'), { laterality: 'Right', specimenName: "2 o'clock, 3 cm FN" });
  assert.deepEqual(intake("Breast, core biopsy, left 11 o'clock"), { laterality: 'Left', specimenName: "11 o'clock" }, 'not a triple');
  assert.deepEqual(intake('Left breast, core biopsy'), { laterality: 'Left' });
  // No side named: the chips stay blank rather than keeping the form's default Right.
  assert.deepEqual(intake('breast, 11H lesion, biopsy'), { laterality: '', specimenName: "11 o'clock" });

  const report = (values) => {
    const part = { ...createPart(t.schema, 0), templateId: 'breast_biopsy' };
    Object.assign(part.values, values);
    return generateCase({ breast_biopsy: t }, { schemaId: 'breast_biopsy', caseTitle: '', options: { includeHeader: false }, meta: {}, parts: [part] });
  };
  const left = report(intake('breast, L11H lesion, biopsy'));
  assert.equal(left.specimens, "Left breast, 11 o'clock, core biopsy");
  assert.equal(left.diagnosis.split('\n')[0], "BREAST, left 11 o'clock, core biopsy - FIBROADENOMA (B2)");
  assert.deepEqual(left.issues.filter((i) => /side/i.test(i.message)), []);
  const unstated = report(intake('breast, 11H lesion, biopsy'));
  assert.equal(unstated.specimens, "Breast, 11 o'clock, core biopsy");
  assert.equal(unstated.diagnosis.split('\n')[0], "BREAST, 11 o'clock, core biopsy - FIBROADENOMA (B2)");
  assert.ok(unstated.issues.some((i) => i.level === 'warn' && /Right or Left/.test(i.message)), 'the Checks panel asks for the side');
  assert.equal(report({ laterality: '', specimenName: '' }).diagnosis.split('\n')[0], 'BREAST, core biopsy - FIBROADENOMA (B2)', 'no empty comma');
  assert.equal(report({ laterality: '', category: 'LN', lnResult: 'Negative for malignancy' }).diagnosis.split('\n')[0], 'AXILLARY LYMPH NODE, core biopsy - NO EVIDENCE OF MALIGNANCY');
  assert.equal(report({}).diagnosis.split('\n')[0], 'BREAST, right, core biopsy - FIBROADENOMA (B2)', 'a part added by hand keeps the Right default');
});

test('a stated side reaches every template\'s side field (eight used to keep their default)', async () => {
  const side = async (id, text, key = 'laterality') => {
    const row = matchParts(parseIntake(text), '', manifest)[0];
    assert.equal(row.templateId, id, text);
    return presetValues((await loadTemplate(id)).schema, row, row)[key];
  };
  assert.equal(await side('salivary_benign', 'Parotid, right parotid, excision'), 'Right', 'default was Left');
  assert.equal(await side('lung_carcinoma', 'Lung, left lower lobe, lobectomy'), 'Left', 'default was Right');
  assert.equal(await side('breast_biopsy', 'Left breast, core biopsy'), 'Left', 'default was Right');
  // The CNS options are lower case; "Left" never matched them.
  assert.equal(await side('cns_biopsy', 'Brain, left frontal tumour, biopsy', 'side'), 'left', 'default was right');
  assert.equal(await side('cns_tumour', 'Brain, left frontal lesion, excision', 'side'), 'left', 'default was right');
  // The breast margin takes its side from the main part, shorthand included.
  const br = (await loadTemplate('breast_excision')).schema;
  const rows = matchParts(parseIntake('(A) Breast, L2-3H mass, excision\n(B) Anterior margin'), '', manifest);
  assert.equal(presetValues(br, rows[1], rows[1]).side, 'Left');
});
