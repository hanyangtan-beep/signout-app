// Specimen intake: LIS paste parser + template matcher (src/intake.js).
// Fixture: tests/fixtures/intake/cases.json — six house samples plus lists that reach every template.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseIntake, matchParts, presetValues, deriveTitle, splitTriple, MAX_PARTS, GENERIC_ID, matchOption } from '../src/intake.js';
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
  assert.match(parseIntake('Just some history').warnings[0], /No lettered parts/);
  const gap = parseIntake('(A) Skin, excision, (C) Skin, excision');
  assert.match(gap.warnings[0], /labelled \(C\); expected \(B\)/);
  const many = parseIntake(Array.from({ length: 27 }, (_, i) => `(${String.fromCharCode(65 + (i % 26))}) Part`).join(', '));
  assert.ok(many.warnings.some((w) => w.includes(`at most ${MAX_PARTS}`)));
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
