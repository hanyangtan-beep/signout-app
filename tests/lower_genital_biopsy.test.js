// Phase 70 (pulled by the user 2026-10-12): vaginal and vulval biopsies in the cervical biopsy form, with reference
// galleries on the squamous, p16, Ki-67, p53, Paget and benign fields. Wording is deliberate; update the strings
// only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { vvSite, pagetStainSentence } from '../generators/cervical.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = await loadAll();
const manifest = await loadManifest();
const cx = registry.cervical_biopsy;
const VUL = 'Vulval biopsy';
const VAG = 'Vaginal biopsy';
const DVIN = 'Differentiated VIN (HPV-independent)';
const SCC = 'Squamous cell carcinoma';

const build = (list) => {
  const c = createCase(cx.schema, list.length);
  list.forEach((v, i) => { c.parts[i].values = { ...c.parts[i].values, ...v }; });
  return c;
};
const run = (...list) => generate(cx.schema, cx.generator, build(list));
const shown = (values) => {
  const v = { ...createCase(cx.schema, 1).parts[0].values, ...values };
  return cx.schema.fields.filter((f) => isVisible(f, v)).map((f) => f.id);
};
const route = (line) => {
  const parsed = parseIntake(line);
  const m = matchParts(parsed, '', manifest)[0];
  return { id: m?.templateId, values: m?.templateId === 'cervical_biopsy' ? presetValues(cx.schema, parsed.parts[0], m) : {} };
};
const NEW_FIELDS = ['vvProcedure', 'vulvaTissue', 'vaginaSquamous', 'vulvaSquamous', 'appendageInvolvement', 'hpvStatus', 'paget', 'pagetStains', 'p53', 'pasd', 'vulvaBenign', 'vaginaBenign'];

test('the cervical form is renamed and offers vaginal and vulval biopsies', () => {
  assert.equal(cx.schema.name, 'Cervical, vaginal and vulval biopsy');
  assert.equal(cx.schema.label, 'Cervix / vagina / vulva');
  assert.equal(cx.schema.shortName, 'Cervix / vagina / vulva · biopsy');
  assert.equal(cx.schema.organ, 'CERVIX');
  const type = cx.schema.fields.find((f) => f.id === 'specimenType');
  assert.deepEqual(type.options.slice(-2), [VAG, VUL]);
  assert.equal(createCase(cx.schema, 1).parts[0].values.specimenType, 'Cervical biopsy', 'a new part still opens as a cervical biopsy');
});

test('vulval and vaginal parts show their own fields and hide the cervical ones', () => {
  const cervix = shown({ specimenType: 'Cervical biopsy' });
  for (const id of NEW_FIELDS) assert.ok(!cervix.includes(id), `${id} is hidden on a cervical biopsy`);
  const vulva = shown({ specimenType: VUL });
  for (const id of ['vvProcedure', 'vulvaTissue', 'vulvaSquamous', 'paget', 'p16', 'ki67', 'p53', 'pasd', 'vulvaBenign']) assert.ok(vulva.includes(id), `${id} shows on a vulval biopsy`);
  for (const id of ['squamous', 'tissue', 'koilocytosis', 'glandInvolvement', 'glandular', 'benign', 'correlation', 'vaginaSquamous', 'vaginaBenign', 'pagetStains', 'appendageInvolvement', 'sccType']) assert.ok(!vulva.includes(id), `${id} is hidden on a negative vulval biopsy`);
  const vagina = shown({ specimenType: VAG });
  for (const id of ['vvProcedure', 'vaginaSquamous', 'p53', 'vaginaBenign', 'correlation']) assert.ok(vagina.includes(id), `${id} shows on a vaginal biopsy`);
  for (const id of ['squamous', 'glandular', 'benign', 'vulvaSquamous', 'vulvaTissue', 'paget', 'pasd', 'vulvaBenign']) assert.ok(!vagina.includes(id), `${id} is hidden on a vaginal biopsy`);
  // The carcinoma fields follow the squamous field of the part's own site, never a hidden cervical value.
  const vulvalScc = shown({ specimenType: VUL, vulvaSquamous: SCC });
  for (const id of ['sccType', 'invasionDepth', 'lvi', 'hpvStatus']) assert.ok(vulvalScc.includes(id), `${id} shows for vulval carcinoma`);
  assert.ok(!shown({ specimenType: VUL, squamous: SCC }).includes('sccType'), 'a stale cervical carcinoma value does not open the carcinoma fields');
  assert.ok(shown({ specimenType: VAG, vaginaSquamous: 'HSIL (VaIN 3)' }).includes('invasionSuspicious'));
  assert.ok(shown({ specimenType: VUL, vulvaSquamous: DVIN }).includes('appendageInvolvement'));
  assert.ok(shown({ specimenType: VUL, paget: 'Primary, intraepithelial' }).includes('pagetStains'));
  assert.ok(shown({ specimenType: 'Cervical biopsy', squamous: SCC }).includes('sccType'), 'cervical carcinoma fields unchanged');
  assert.ok(!shown({ specimenType: 'Cervical biopsy', squamous: SCC }).includes('hpvStatus'));
});

test('vulval punch biopsy with differentiated VIN and a mutant-type p53', () => {
  const out = run({ specimenType: VUL, specimenName: "Left 3 o'clock", vvProcedure: 'Punch biopsy', vulvaSquamous: DVIN, p16: 'Patchy / focal', p53: 'Mutant-type: basal overexpression' });
  assert.equal(out.specimens, "Vulva, left 3 o'clock, punch biopsy");
  assert.equal(out.microscopy, 'Serial sections show a piece of vulval skin. The squamous epithelium is acanthotic with parakeratosis and elongated, anastomosing rete ridges; the basal and parabasal keratinocytes are atypical, with abundant eosinophilic cytoplasm, enlarged vesicular nuclei and prominent nucleoli, without koilocytosis or full thickness atypia. No dermal invasion is identified. On immunohistochemistry, p16 shows patchy, non-block staining and p53 shows a mutant-type pattern, with strong continuous nuclear staining of the basal layer, supporting differentiated VIN. There is no evidence of invasive malignancy.');
  assert.equal(out.diagnosis, "VULVA, left 3 o'clock, punch biopsy - DIFFERENTIATED VULVAL INTRAEPITHELIAL NEOPLASIA (dVIN), HPV-independent");
  assert.deepEqual(out.issues, []);
});

test('vaginal biopsies: the house negative and VaIN 3 with block p16', () => {
  const neg = run({ specimenType: VAG, specimenName: 'Vault' });
  assert.equal(neg.specimens, 'Vagina, vault, biopsy');
  assert.equal(neg.microscopy, 'Serial sections show a piece of vaginal mucosa. The squamous epithelium shows normal maturation and no VaIN is seen. There is no evidence of squamous intraepithelial lesion or malignancy.');
  assert.equal(neg.diagnosis, 'VAGINA, vault, biopsy - NO EVIDENCE OF SQUAMOUS INTRAEPITHELIAL LESION OR MALIGNANCY');
  const hsil = run({ specimenType: VAG, specimenName: 'Left lateral wall', vaginaSquamous: 'HSIL (VaIN 3)', p16: 'Block positive' });
  assert.equal(hsil.microscopy, 'Serial sections show a piece of vaginal mucosa. The squamous epithelium shows full thickness loss of maturation with enlarged hyperchromatic pleomorphic nuclei, a high nuclear to cytoplasmic ratio and mitoses in the upper layers. No stromal invasion is identified. On immunohistochemistry, p16 shows strong diffuse block positivity, supporting a high grade lesion. There is no evidence of invasive malignancy.');
  assert.equal(hsil.diagnosis, 'VAGINA, left lateral wall, biopsy - HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / VaIN 3)');
  const gran = run({ specimenType: VAG, vaginaBenign: 'Granulation tissue' });
  assert.equal(gran.diagnosis, 'VAGINA, biopsy - GRANULATION TISSUE; no evidence of dysplasia or malignancy');
});

test('vulval negative, lichen sclerosus and lichen simplex: morphology first, then the stains', () => {
  const neg = run({ specimenType: VUL, specimenName: "3 o'clock" });
  assert.equal(neg.microscopy, 'Serial sections show a piece of vulval skin. The squamous epithelium shows normal maturation. There is no evidence of VIN, Paget disease or malignancy.');
  assert.equal(neg.diagnosis, "VULVA, biopsy at 3 o'clock - NO EVIDENCE OF VIN OR MALIGNANCY");
  const ls = run({ specimenType: VUL, vulvaBenign: 'Lichen sclerosus', p53: 'Wild-type: scattered' });
  assert.equal(ls.microscopy, 'Serial sections show a piece of vulval skin. There is hyperkeratosis with basal vacuolar change, and a band of pale homogenised collagen in the papillary dermis overlies a band-like lymphocytic infiltrate, in keeping with lichen sclerosus. On immunohistochemistry, p53 shows a wild-type pattern, with scattered nuclear staining of variable intensity. There is no evidence of VIN, Paget disease or malignancy.');
  assert.equal(ls.diagnosis, 'VULVA, biopsy - LICHEN SCLEROSUS; no evidence of VIN or malignancy');
  const dvinLs = run({ specimenType: VUL, vulvaSquamous: DVIN, vulvaBenign: 'Lichen sclerosus', p53: 'Mutant-type: null', appendageInvolvement: 'Involved' });
  assert.match(dvinLs.microscopy, /The lesion extends along hair follicles and skin appendages\. No dermal invasion is identified\. There is hyperkeratosis .* in keeping with lichen sclerosus\. On immunohistochemistry, p53 shows a mutant-type null pattern, with complete absence of staining in the lesion and a positive internal control, supporting differentiated VIN\. There is no evidence of invasive malignancy\.$/);
  assert.equal(dvinLs.diagnosis, 'VULVA, biopsy - DIFFERENTIATED VULVAL INTRAEPITHELIAL NEOPLASIA (dVIN), HPV-independent, with skin appendage involvement; LICHEN SCLEROSUS');
  const lsc = run({ specimenType: VUL, vulvaBenign: 'Lichen simplex chronicus', pasd: 'Negative', ki67: 'Confined to the basal and parabasal layers' });
  assert.match(lsc.microscopy, /in keeping with lichen simplex chronicus\. There are no features of lichen sclerosus or lichen planus\. No fungal organisms are identified on PASD stain\. On immunohistochemistry, Ki-67 is confined to the basal and parabasal layers\. There is no evidence of VIN, Paget disease or malignancy\.$/);
  assert.equal(lsc.diagnosis, 'VULVA, biopsy - LICHEN SIMPLEX CHRONICUS; no lichen sclerosus, lichen planus, Paget disease, VIN or malignancy; PASD negative');
});

test('Paget disease: primary with its stains, secondary with a correlation note', () => {
  const primary = run({ specimenType: VUL, specimenName: 'Right labium majus', paget: 'Primary, intraepithelial', pagetStains: ['CK7 positive', 'GATA3 positive', 'CEA positive', 'CK20 negative', 'p63 negative'] });
  assert.equal(primary.microscopy, 'Serial sections show a piece of vulval skin. The epidermis contains large atypical cells with abundant pale cytoplasm, large nuclei and prominent nucleoli, mainly in its lower layers and extending upwards singly and in small clusters, in keeping with Paget disease. No dermal invasion is identified. The Paget cells are positive for CK7, GATA3 and CEA, and negative for CK20 and p63.');
  assert.equal(primary.diagnosis, 'VULVA, right labium majus, biopsy - EXTRAMAMMARY PAGET DISEASE, intraepithelial');
  const secondary = run({ specimenType: VUL, paget: 'Secondary (pagetoid spread)', pagetStains: ['CK7 positive', 'CK20 positive', 'GATA3 positive', 'Uroplakin III positive'] });
  assert.match(secondary.microscopy, /The atypical cells are positive for CK7, CK20, GATA3 and uroplakin III\. Correlation for an underlying anorectal or urothelial carcinoma is suggested\.$/);
  assert.equal(secondary.diagnosis, 'VULVA, biopsy - PAGETOID SPREAD OF A NON-CUTANEOUS CARCINOMA (SECONDARY EXTRAMAMMARY PAGET DISEASE)');
  assert.equal(pagetStainSentence({ specimenType: VUL, paget: 'Primary, intraepithelial', pagetStains: ['SOX10 negative'] }), 'The Paget cells are negative for SOX10.');
});

test('vulval carcinoma carries its HPV status; checks flag contradictory stains', () => {
  const scc = run({ specimenType: VUL, specimenName: 'Left labium majus', vulvaSquamous: SCC, sccType: 'Keratinising', hpvStatus: 'HPV-independent', p53: 'Mutant-type: diffuse overexpression' });
  assert.equal(scc.diagnosis, 'VULVA, left labium majus, biopsy - INVASIVE SQUAMOUS CELL CARCINOMA, keratinising type, HPV-independent');
  const msgs = (values) => run(values).issues.map((i) => i.message);
  assert.match(msgs({ specimenType: VUL, vulvaSquamous: DVIN, p16: 'Block positive', p53: 'Mutant-type: null' })[0], /^Differentiated VIN is HPV-independent, but p16 is block positive/);
  assert.match(msgs({ specimenType: VUL, vulvaSquamous: DVIN })[0], /^No p53 is recorded/);
  assert.match(msgs({ specimenType: VAG, vaginaSquamous: 'HSIL (VaIN 3)', p16: 'Negative' })[0], /^Vaginal HSIL is HPV-associated, but p16 is negative\./);
  assert.match(msgs({ specimenType: VUL, vulvaSquamous: SCC, hpvStatus: 'HPV-independent', p16: 'Block positive' })[0], /^HPV-independent carcinoma is chosen, but p16 is block positive\./);
  assert.match(msgs({ specimenType: VUL, paget: 'Primary, intraepithelial', pagetStains: ['CK7 positive', 'CK20 positive'] })[0], /^Primary Paget disease is chosen, but CK20 is positive/);
  assert.match(msgs({ specimenType: VUL, paget: 'Primary, intraepithelial' })[0], /^No Paget stains are recorded/);
  assert.deepEqual(run({ specimenType: 'Cervical biopsy', squamous: 'HSIL (CIN III)', p16: 'Negative' }).issues, [], 'cervical parts carry no vulval checks');
});

test('a mixed cervix, vagina and vulva case summarises each site in its own terms', () => {
  const out = run(
    { specimenType: 'Cervical biopsy', specimenName: "12 o'clock", squamous: 'HSIL (CIN III)' },
    { specimenType: VAG, specimenName: 'Vault', vaginaSquamous: 'HSIL (VaIN 3)' },
    { specimenType: VUL, vulvaBenign: 'Lichen sclerosus' },
  );
  assert.equal(out.specimens, "(A) Cervix, 12 o'clock, biopsy\n(B) Vagina, vault, biopsy\n(C) Vulva, biopsy");
  assert.match(out.diagnosis, /\(C\) VULVA, biopsy - LICHEN SCLEROSUS; no evidence of VIN or malignancy\n\nSUMMARY: Highest grade squamous lesion HSIL \(CIN III\) in part A and HSIL \(VaIN 3\) in part B\.$/);
  const negatives = run({ specimenType: VAG }, { specimenType: VUL });
  assert.match(negatives.diagnosis, /SUMMARY: No squamous intraepithelial lesion, VIN, Paget disease or malignancy in any part\.$/);
});

test('intake: vulval and vaginal lines open the form with their type and site; look-alikes do not', () => {
  const cases = [
    ["Vulva, left 3 o'clock, punch biopsy", VUL, "Left 3 o'clock", 'Punch biopsy'],
    ['Left labium majus, punch biopsy', VUL, 'Left labium majus', 'Punch biopsy'],
    ['Vulva, punch biopsy ?LS ?VIN', VUL, undefined, 'Punch biopsy'],
    ['Vulval lesion, avulsion', VUL, 'Lesion', 'Avulsion'],
    ['Vaginal vault biopsy', VAG, 'Vault', undefined],
    ['Vaginal wall biopsy ?VAIN', VAG, 'Wall', undefined],
  ];
  for (const [line, type, name, proc] of cases) {
    const { id, values } = route(line);
    assert.equal(id, 'cervical_biopsy', line);
    assert.equal(values.specimenType, type, `${line}: type`);
    assert.equal(values.specimenName || undefined, name, `${line}: site`);
    assert.equal(values.vvProcedure || undefined, proc, `${line}: procedure`);
  }
  assert.equal(route('Vaginal vault granulation').values.vaginaBenign, 'Granulation tissue');
  assert.equal(route('Vaginal vault granulation').values.specimenName, 'Vault');
  // Look-alikes keep their forms: tissue passed per vaginam, skin excisions, cysts, lipomas, tags, margins.
  assert.equal(route('Tissue mass, vagina').id, 'endometrial_biopsy');
  assert.equal(route('Tissue mass per vaginam').id, 'endometrial_biopsy');
  assert.equal(route('Endometrial aspirate, vagina').id, 'endometrial_biopsy');
  assert.equal(route('Skin, right vulva, excision').id, 'skin_cyst');
  for (const line of ['Vulval skin tag', 'Right vulval lipoma', 'Bartholin cyst', 'Vulva, wide local excision', 'Right vulval lesion, posterior margin', 'Vaginal tumour stitched at 3', 'Left nose vestibule lesion', 'Soft tissue, vaginal / miscarriage']) {
    assert.notEqual(route(line).id, 'cervical_biopsy', line);
  }
  // Cervical lines are unchanged.
  assert.deepEqual(route("Cervix, 12 o'clock, biopsy").values.specimenName, "12 o'clock");
  assert.equal(route('ECC').values.specimenType, 'Endocervical curettings');
  assert.equal(route('ECC').values.specimenName, undefined);
  assert.notEqual(route('Cervix').id, 'cervical_biopsy', 'a bare organ word stays non-confident');
  // The printed site drops a leading "at" and a side the line repeats.
  assert.equal(vvSite({ specimenName: "At 7 o'clock" }), "7 o'clock");
  assert.equal(vvSite({ specimenName: 'Left lesion, left' }), 'left lesion');
});

test('galleries: squamous, p16, Ki-67, p53, Paget and benign fields, with open licences and credits', () => {
  const fields = new Map(cx.schema.fields.map((f) => [f.id, f]));
  const dir = 'assets/reference/lower_genital/';
  const skinDir = 'assets/reference/skin_inflammatory/';
  const reused = ['lichen_sclerosus.jpg', 'lsc_irregular.jpg', 'lichen_planus_band.jpg', 'civatte_body.jpg'];
  const skinImages = new Map(registry.skin_inflammatory.schema.fields.flatMap((f) => (f.reference?.groups || []).flatMap((g) => g.images || [])).map((im) => [im.src, im]));
  const files = new Set();
  const count = {};
  for (const id of ['squamous', 'vaginaSquamous', 'vulvaSquamous', 'p16', 'ki67', 'p53', 'paget', 'pagetStains', 'vulvaBenign', 'vaginaBenign']) {
    const f = fields.get(id);
    assert.ok(f && f.reference && f.reference.title, `${id} has a reference gallery`);
    for (const g of f.reference.groups) assert.ok(f.options.includes(g.heading), `${id}: ${g.heading} is one of the options`);
    const withImages = f.reference.groups.filter((g) => (g.images || []).length > 0);
    assert.ok(withImages.length >= 1, `${id} has an illustrated group`);
    if (withImages.length < f.reference.groups.length) assert.match(f.reference.note || '', /^Room for your own photographs/, `${id} names its text-only groups in the note`);
    count[id] = 0;
    for (const g of f.reference.groups) {
      assert.ok(Array.isArray(g.points) && g.points.length > 0, `${id}: ${g.heading} has criteria`);
      for (const im of g.images || []) {
        count[id] += 1;
        assert.ok(existsSync(path.join(root, im.src)), `${im.src} exists`);
        if (im.src.startsWith(skinDir)) {
          assert.ok(reused.includes(im.src.slice(skinDir.length)), `${im.src} is one of the reused dermatoses images`);
          const orig = skinImages.get(im.src);
          for (const k of ['caption', 'credit', 'license', 'url']) assert.equal(im[k], orig[k], `${im.src}: ${k} matches the dermatoses gallery`);
        } else {
          assert.ok(im.src.startsWith(dir), `${im.src} is under ${dir}`);
          files.add(im.src.slice(dir.length));
        }
        assert.match(im.caption, /\((H&E|[\w-]+ immunostain)\)\.$/, `${im.src} caption names its stain`);
        assert.ok(im.credit, `${im.src} has a credit`);
        assert.match(im.license, /^(CC0|CC BY|CC BY-SA|Public domain)/, `${im.src} is CC0 / CC BY / CC BY-SA / public domain`);
        assert.ok(!/NC|ND/.test(im.license), `${im.src} is not NC/ND`);
        assert.match(im.url, /^https:\/\//, `${im.src} carries a source url`);
      }
    }
  }
  assert.deepEqual([...files].sort(), readdirSync(path.join(root, dir)).sort(), 'every file in the folder is used and nothing else');
  assert.equal(count.p53, 7, 'six Kortekaas patterns and a dVIN basal pattern');
  assert.equal(count.pagetStains, 5);
  const atrophy = fields.get('vaginaBenign').reference.groups.find((g) => g.heading === 'Atrophy').images[0];
  assert.match(atrophy.caption, /cervix/, 'the atrophy image says it is from the cervix');
});
