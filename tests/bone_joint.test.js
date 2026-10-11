// Bone and joint, non-neoplastic template (benign batch 1). Card: docs/roadmap.md, pulled into Now
// 2026-09-24. Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/bone_joint/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible, snippetsFor } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { HEADS, SOFT, BONES, INFECTIVE, synoviumChecklist, closing, sizePhrase, decalcification, sitePhrase, procedurePhrase } from '../generators/bone.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.bone_joint;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'bone_joint');
const UPDATE = process.argv.includes('--update');
const field = (id) => schema.fields.find((f) => f.id === id);
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const suggested = (values) => {
  const c = { ...one(values), parts: one(values).parts.map((p) => ({ ...p, templateId: schema.id })) };
  return snippetsFor({ [schema.id]: t }, c).filter((sn) => sn.suggested).map((sn) => sn.id);
};
const defaults = () => ({ ...createCase(schema, 1).parts[0].values });
const GRAN = 'Present – see comment';
const ORG = 'Identified – describe';
const SYN = { specimen: 'Synovium', site: 'right knee' };
const DISC = { specimen: 'Disc', site: 'L4/5' };
const LIG = { specimen: 'Ligamentum', site: 'L4/5' };
const BONE = { specimen: 'Bone', site: 'left tibia' };

const HEAD_DX = ['Osteoarthritis', 'Avascular necrosis', 'Fracture', 'Inflammatory arthropathy', 'Crystal arthropathy', 'Metastatic carcinoma'];
const SYN_DX = ['Chronic synovitis', 'Detritic synovitis', 'Wear debris reaction', 'Acute synovitis', 'Crystal arthropathy', 'Haemosiderotic synovitis', 'No significant pathology'];
const DISC_DX = ['Degenerative change', 'Acute inflammation', 'Crystal deposition', 'No significant pathology'];
const BONE_DX = ['No evidence of malignancy', 'Metastatic carcinoma', 'Plasma cell neoplasm', 'Acute osteomyelitis', 'Chronic osteomyelitis', 'Osteonecrosis', "Paget's disease", 'Fracture callus'];

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has bone_joint');
  assert.equal(schema.system, 'Soft tissue');
  assert.equal(schema.kind, 'benign resection');
  assert.equal(schema.label, 'Bone / joint');
  assert.equal(schema.organ, 'BONE');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.deepEqual(schema.aliases, ['bone', 'femoral head', 'humeral head', 'synovium', 'joint', 'reamings', 'curettings', 'disc', 'ligamentum flavum', 'osteomyelitis']);
  assert.deepEqual(field('specimen').options, [...HEADS, ...SOFT, ...BONES]);
  assert.equal(manifest.find((m) => m.id === 'bone_joint').kind, 'benign resection');
});

test('the specimen decides the diagnosis list', () => {
  const by = field('diagnosis').optionsByField;
  assert.equal(by.field, 'specimen');
  for (const s of HEADS) assert.deepEqual(by.map[s], HEAD_DX, s);
  assert.deepEqual(by.map.Synovium, SYN_DX);
  for (const s of ['Disc', 'Ligamentum']) assert.deepEqual(by.map[s], DISC_DX, s);
  for (const s of BONES) assert.deepEqual(by.map[s], BONE_DX, s);
  // The default osteoarthritis pick moves to the first diagnosis the new specimen offers.
  assert.equal(run({ specimen: 'Synovium' }).diagnosis, 'SYNOVIUM - CHRONIC SYNOVITIS');
  assert.equal(run({ specimen: 'Disc' }).diagnosis, 'INTERVERTEBRAL DISC - DEGENERATIVE CHANGE');
  assert.equal(run({ specimen: 'Bone biopsy' }).diagnosis, 'BONE - NO EVIDENCE OF MALIGNANCY');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  assert.match(r.report, /SPECIMENS?:/);
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);
  assert.match(r.report, /MICROSCOPIC EXAMINATION:/);
  assert.match(r.report, /DIAGNOSIS:/);
  assert.equal(r.specimens, 'Femoral head, left, total hip replacement');
  assert.equal(r.macro, 'Received in formalin is a left femoral head, measuring 5 x 4.5 x 4 cm. Representative sections in 3 blocks after decalcification.');
  assert.equal(r.blockKey, '(1-3) Femoral head, representative sections, decalcified.');
  assert.equal(r.diagnosis, 'FEMORAL HEAD, left, total hip replacement - MODERATE OSTEOARTHRITIS');
  assert.deepEqual(r.issues, []);
});

test('a multi-part case letters its specimens', () => {
  const r = generate(schema, t.generator, createCase(schema, 2));
  assert.match(r.specimens, /\(A\) Femoral head/);
  assert.match(r.specimens, /\(B\) Femoral head/);
  assert.match(r.diagnosis, /\(A\) FEMORAL HEAD - MODERATE OSTEOARTHRITIS\n\(B\) FEMORAL HEAD - MODERATE OSTEOARTHRITIS/);
});

test('each diagnosis prints its own line under the specimen head', () => {
  const lines = [
    [{ oaGrade: 'Mild' }, 'FEMORAL HEAD - MILD OSTEOARTHRITIS'],
    [{ oaGrade: 'Severe' }, 'FEMORAL HEAD - SEVERE OSTEOARTHRITIS'],
    [{ diagnosis: 'Avascular necrosis' }, 'FEMORAL HEAD - AVASCULAR NECROSIS'],
    [{ diagnosis: 'Avascular necrosis', avnCollapse: 'Present' }, 'FEMORAL HEAD - AVASCULAR NECROSIS with SUBCHONDRAL COLLAPSE'],
    [{ diagnosis: 'Fracture' }, 'FEMORAL HEAD - RECENT FRACTURE'],
    [{ diagnosis: 'Fracture', fractureAge: 'Healing' }, 'FEMORAL HEAD - HEALING FRACTURE'],
    [{ diagnosis: 'Inflammatory arthropathy' }, 'FEMORAL HEAD - In keeping with INFLAMMATORY ARTHROPATHY'],
    [{ diagnosis: 'Crystal arthropathy' }, 'FEMORAL HEAD - GOUTY ARTHRITIS'],
    [{ diagnosis: 'Crystal arthropathy', crystalType: 'Calcium pyrophosphate' }, 'FEMORAL HEAD - CALCIUM PYROPHOSPHATE DEPOSITION DISEASE'],
    [{ diagnosis: 'Metastatic carcinoma' }, 'FEMORAL HEAD - METASTATIC ADENOCARCINOMA; see comment'],
    [{ specimen: 'Humeral head', site: 'right', procedure: 'Hemiarthroplasty', diagnosis: 'Fracture' }, 'HUMERAL HEAD, right, hemiarthroplasty - RECENT FRACTURE'],
    [{ specimen: 'Knee joint', site: 'right knee', procedure: 'Total knee replacement', oaGrade: 'Severe' }, 'KNEE, right, total knee replacement - SEVERE OSTEOARTHRITIS'],
    [{ ...SYN, diagnosis: 'Chronic synovitis' }, 'SYNOVIUM, right knee - CHRONIC SYNOVITIS'],
    [{ ...SYN, diagnosis: 'Chronic synovitis', infiltrate: 'Absent' }, 'SYNOVIUM, right knee - SYNOVIAL HYPERPLASIA'],
    [{ ...SYN, diagnosis: 'Chronic synovitis', infiltrate: 'Absent', hyperplasia: 'Absent' }, 'SYNOVIUM, right knee - NO SIGNIFICANT PATHOLOGY'],
    [{ ...SYN, diagnosis: 'Detritic synovitis' }, 'SYNOVIUM, right knee - DETRITIC SYNOVITIS'],
    [{ ...SYN, diagnosis: 'Wear debris reaction' }, 'SYNOVIUM, right knee - FOREIGN BODY REACTION to WEAR DEBRIS'],
    [{ ...SYN, diagnosis: 'Acute synovitis' }, 'SYNOVIUM, right knee - ACUTE SYNOVITIS, suggestive of INFECTION'],
    [{ ...SYN, diagnosis: 'Crystal arthropathy' }, 'SYNOVIUM, right knee - GOUTY ARTHRITIS'],
    [{ ...SYN, diagnosis: 'Haemosiderotic synovitis' }, 'SYNOVIUM, right knee - HAEMOSIDEROTIC SYNOVITIS'],
    [{ ...SYN, diagnosis: 'No significant pathology' }, 'SYNOVIUM, right knee - NO SIGNIFICANT PATHOLOGY'],
    [{ ...DISC, diagnosis: 'Degenerative change' }, 'INTERVERTEBRAL DISC, L4/5 - DEGENERATIVE CHANGE'],
    [{ ...DISC, diagnosis: 'Acute inflammation' }, 'INTERVERTEBRAL DISC, L4/5 - ACUTE INFLAMMATION, suggestive of DISCITIS'],
    [{ ...DISC, diagnosis: 'Crystal deposition' }, 'INTERVERTEBRAL DISC, L4/5 - GOUTY TOPHUS'],
    [{ ...LIG, diagnosis: 'Acute inflammation' }, 'LIGAMENTUM FLAVUM, L4/5 - ACUTE INFLAMMATION, suggestive of INFECTION'],
    [{ ...LIG, diagnosis: 'Crystal deposition', crystalType: 'Calcium pyrophosphate' }, 'LIGAMENTUM FLAVUM, L4/5 - CALCIUM PYROPHOSPHATE DEPOSITION'],
    [{ ...BONE, diagnosis: 'No evidence of malignancy' }, 'BONE, left tibia - NO EVIDENCE OF MALIGNANCY'],
    [{ ...BONE, diagnosis: 'Plasma cell neoplasm' }, 'BONE, left tibia - PLASMA CELL NEOPLASM; see comment'],
    [{ ...BONE, diagnosis: 'Acute osteomyelitis' }, 'BONE, left tibia - ACUTE OSTEOMYELITIS'],
    [{ ...BONE, diagnosis: 'Chronic osteomyelitis' }, 'BONE, left tibia - CHRONIC OSTEOMYELITIS'],
    [{ ...BONE, diagnosis: 'Osteonecrosis' }, 'BONE, left tibia - OSTEONECROSIS'],
    [{ ...BONE, diagnosis: "Paget's disease" }, "BONE, left tibia - PAGET'S DISEASE OF BONE"],
    [{ ...BONE, diagnosis: 'Fracture callus' }, 'BONE, left tibia - FRACTURE CALLUS']
  ];
  for (const [values, want] of lines) assert.equal(run(values).diagnosis, want, JSON.stringify(values));
});

test('every diagnosis opens on "Sections" and closes on a house sentence', () => {
  const groups = [[{}, HEAD_DX], [SYN, SYN_DX], [DISC, DISC_DX], [LIG, DISC_DX], [BONE, BONE_DX]];
  for (const [base, list] of groups) {
    for (const diagnosis of list) {
      const r = run({ ...base, diagnosis });
      const label = `${base.specimen || 'Femoral head'} / ${diagnosis}`;
      assert.match(r.microscopy, /^Sections (show|of the articular surface show) /, label);
      if (['Metastatic carcinoma', 'Plasma cell neoplasm'].includes(diagnosis)) {
        assert.match(r.microscopy, /The findings are (in keeping|consistent) with (metastatic|a plasma cell neoplasm)[^.]*\.$/, label);
        assert.doesNotMatch(r.microscopy, /no evidence of/i, label);
      } else {
        assert.match(r.microscopy, /There is no evidence of [^.]*malignancy\.$/, label);
      }
    }
  }
});

test('osteoarthritis is confirmed and graded, and the head records the arthropathies as absent', () => {
  assert.equal(run({ oaGrade: 'Mild' }).microscopy,
    'Sections of the articular surface show fibrillation of the articular cartilage with chondrocyte clusters. The subchondral bone is unremarkable. The features are in keeping with mild osteoarthritis. There is no evidence of inflammatory arthropathy, crystal arthropathy, avascular necrosis or malignancy.');
  assert.equal(run({}).microscopy,
    'Sections of the articular surface show fibrillation and fissuring of the articular cartilage with chondrocyte clusters and focal full-thickness cartilage loss. The subchondral bone is sclerotic. The features are in keeping with moderate osteoarthritis. There is no evidence of inflammatory arthropathy, crystal arthropathy, avascular necrosis or malignancy.');
  assert.equal(run({ oaGrade: 'Severe' }).microscopy,
    'Sections of the articular surface show loss of the articular cartilage with eburnation of the exposed subchondral bone. There is subchondral sclerosis with cyst formation, and marginal osteophytes are present. The features are in keeping with severe osteoarthritis. There is no evidence of inflammatory arthropathy, crystal arthropathy, avascular necrosis or malignancy.');
  // The diagnosis made drops out of the absence list.
  assert.match(run({ diagnosis: 'Avascular necrosis' }).microscopy, /empty osteocyte lacunae and necrotic marrow, bordered by fibrous tissue and reactive new bone formation\. The overlying articular cartilage is preserved\. The features are in keeping with avascular necrosis\. There is no evidence of inflammatory arthropathy, crystal arthropathy or malignancy\.$/);
  assert.match(run({ diagnosis: 'Avascular necrosis', avnCollapse: 'Present' }).microscopy, /There is a subchondral fracture with collapse of the overlying articular surface\./);
  assert.match(run({ diagnosis: 'Inflammatory arthropathy' }).microscopy, /in keeping with an inflammatory arthropathy\. There is no evidence of crystal arthropathy, avascular necrosis or malignancy\.$/);
  assert.match(run({ diagnosis: 'Crystal arthropathy' }).microscopy, /needle-shaped crystal clefts in the articular cartilage and subchondral bone, surrounded by histiocytes and foreign-body giant cells\. The features are in keeping with gouty arthritis\. There is no evidence of avascular necrosis or malignancy\.$/);
});

test('a fracture states that no underlying lesion is seen', () => {
  assert.equal(run({ diagnosis: 'Fracture' }).microscopy,
    'Sections show a fracture through the bone, with haemorrhage, fibrin and fragmented bone trabeculae at the fracture site. The adjacent bone and marrow show no underlying lesion. The articular cartilage is unremarkable. There is no evidence of inflammatory arthropathy, crystal arthropathy, avascular necrosis or malignancy.');
  assert.match(run({ diagnosis: 'Fracture', fractureAge: 'Healing' }).microscopy, /^Sections show a fracture through the bone, with callus composed of fibrous tissue, cartilage and woven bone at the fracture site\./);
  assert.equal(run({ ...BONE, diagnosis: 'Fracture callus' }).microscopy,
    'Sections show fracture callus composed of fibrous tissue, cartilage and woven bone, with haemorrhage and fragments of necrotic bone. The adjacent bone shows no underlying lesion. There is no evidence of malignancy.');
});

test('synovium: hyperplasia and the infiltrate, the checklist, then the interpretation', () => {
  assert.equal(run({ ...SYN, diagnosis: 'Chronic synovitis', hyperplasia: 'Moderate', infiltrate: 'Diffuse', lymphoidAggregates: 'Present' }).microscopy,
    'Sections show synovium with moderate lining hyperplasia. The subsynovial tissue contains a diffuse chronic inflammatory infiltrate of lymphocytes and plasma cells, with lymphoid aggregates. No haemosiderin, crystals, bone or cartilage fragments, foreign material or granulomas are identified. The features are in keeping with chronic synovitis. There is no evidence of malignancy.');
  assert.equal(run({ ...SYN, diagnosis: 'Chronic synovitis', infiltrate: 'Absent' }).microscopy,
    'Sections show synovium with mild lining hyperplasia. There is no significant chronic inflammatory infiltrate. No haemosiderin, crystals, bone or cartilage fragments, foreign material or granulomas are identified. There is no evidence of malignancy.');
  assert.match(run({ ...SYN, diagnosis: 'Haemosiderotic synovitis', hyperplasia: 'Marked' }).microscopy,
    /^Sections show synovium with marked lining hyperplasia and a villous architecture\. There is abundant haemosiderin deposition in the synovial lining cells and subsynovial macrophages\. There is a patchy chronic inflammatory infiltrate of lymphocytes and plasma cells\. No crystals, bone or cartilage fragments, foreign material or granulomas are identified\. The features are in keeping with haemosiderotic synovitis\./);
  assert.match(run({ ...SYN, diagnosis: 'Detritic synovitis' }).microscopy, /Fragments of bone and cartilage are embedded in the subsynovial tissue, with a surrounding histiocytic and foreign-body giant cell reaction\. There is a patchy chronic inflammatory infiltrate of lymphocytes and plasma cells\. No haemosiderin, crystals, foreign material or granulomas are identified\. The features are in keeping with detritic synovitis\./);
  assert.match(run({ ...SYN, diagnosis: 'Wear debris reaction', debris: ['Metal', 'Polyethylene'] }).microscopy, /sheets of histiocytes and foreign-body giant cells containing black metallic particles and birefringent polyethylene particles\./);
  assert.match(run({ ...SYN, diagnosis: 'Wear debris reaction' }).microscopy, /containing particulate wear debris\./);
  assert.equal(run({ ...SYN, diagnosis: 'No significant pathology' }).microscopy,
    'Sections show synovium without lining hyperplasia or significant inflammation. No haemosiderin, crystals, bone or cartilage fragments, foreign material or granulomas are identified. There is no evidence of malignancy.');
});

test('synovium: added findings leave the checklist, and the verb follows the last item', () => {
  const r = run({ ...SYN, diagnosis: 'Chronic synovitis', synFindings: ['Haemosiderin', 'Bone or cartilage fragments'] });
  assert.match(r.microscopy, /plasma cells\. Haemosiderin deposits are present\. Fragments of bone and cartilage are present in the subsynovial tissue\. No crystals, foreign material or granulomas are identified\. The features are in keeping with chronic synovitis\./);
  const v = { ...defaults(), ...SYN, diagnosis: 'Chronic synovitis' };
  assert.equal(synoviumChecklist(v), 'No haemosiderin, crystals, bone or cartilage fragments, foreign material or granulomas are identified.');
  assert.equal(synoviumChecklist({ ...v, granulomas: GRAN }), 'No haemosiderin, crystals, bone or cartilage fragments or foreign material is identified.');
  assert.equal(synoviumChecklist({ ...v, diagnosis: 'Crystal arthropathy' }), 'No haemosiderin, bone or cartilage fragments, foreign material or granulomas are identified.');
  // No significant pathology describes nothing, so a stray tick is not printed or removed from the list.
  assert.equal(synoviumChecklist({ ...v, diagnosis: 'No significant pathology', synFindings: ['Haemosiderin'] }), 'No haemosiderin, crystals, bone or cartilage fragments, foreign material or granulomas are identified.');
});

test('revision arthroplasty states the absence of infection unless infection is the finding', () => {
  const r = run({ specimen: 'Synovium', site: 'left hip', procedure: 'Revision arthroplasty', diagnosis: 'Chronic synovitis' });
  assert.match(r.microscopy, /The features are in keeping with chronic synovitis\. There is no evidence of infection or malignancy\.$/);
  assert.equal(r.diagnosis, 'SYNOVIUM, left hip, revision arthroplasty - CHRONIC SYNOVITIS; NO EVIDENCE OF INFECTION');
  const wear = run({ specimen: 'Synovium', site: 'left hip', procedure: 'Revision arthroplasty', diagnosis: 'Wear debris reaction' });
  assert.equal(wear.diagnosis, 'SYNOVIUM, left hip, revision arthroplasty - FOREIGN BODY REACTION to WEAR DEBRIS; NO EVIDENCE OF INFECTION');
  const acute = run({ specimen: 'Synovium', site: 'left hip', procedure: 'Revision arthroplasty', diagnosis: 'Acute synovitis', stains: ['Gram'] });
  assert.match(acute.microscopy, /The features are suggestive of infection\. There is no evidence of malignancy\.$/);
  assert.equal(acute.diagnosis, 'SYNOVIUM, left hip, revision arthroplasty - ACUTE SYNOVITIS, suggestive of INFECTION');
  const organisms = run({ specimen: 'Synovium', site: 'left hip', procedure: 'Revision arthroplasty', stains: ['Gram'], organisms: ORG, organismText: 'gram-positive cocci are seen on Gram stain' });
  assert.doesNotMatch(organisms.diagnosis, /NO EVIDENCE OF INFECTION/);
  assert.match(organisms.diagnosis, /; organisms identified$/);
  // Outside a revision the sentence is not added.
  assert.doesNotMatch(run({ ...SYN, diagnosis: 'Chronic synovitis' }).microscopy, /infection/);
});

test('disc and ligamentum: degenerate cells and matrix, ingrowth, polymorphs', () => {
  assert.equal(run({ ...DISC, discFeatures: ['Chondrocyte clusters', 'Matrix fissures', 'Vessel ingrowth', 'Nerve ingrowth'] }).microscopy,
    'Sections show fragments of intervertebral disc fibrocartilage with degenerative change, including chondrocyte clusters and fissuring of the matrix. There is ingrowth of small blood vessels and nerve fibres. No acute inflammation is seen. There is no evidence of malignancy.');
  assert.equal(run({ ...DISC, discFeatures: [] }).microscopy,
    'Sections show fragments of intervertebral disc fibrocartilage with degenerative change. No acute inflammation is seen. There is no evidence of malignancy.');
  assert.equal(run({ ...DISC, diagnosis: 'Acute inflammation', stains: ['Gram'] }).microscopy,
    'Sections show fragments of intervertebral disc fibrocartilage with a polymorph infiltrate, necrotic debris and granulation tissue. No bacterial organisms are identified on Gram stain. The features are suggestive of discitis. There is no evidence of granulomatous inflammation or malignancy.');
  assert.equal(run(LIG).microscopy,
    'Sections show fibroelastic ligamentous tissue with degenerative change, including fragmentation and loss of elastic fibres and fibrosis. No acute inflammation is seen. There is no evidence of malignancy.');
  assert.match(run({ ...LIG, ligFeatures: ['Calcification', 'Chondroid metaplasia'] }).microscopy, /with degenerative change, including focal calcification and chondroid metaplasia\./);
  assert.equal(run({ ...DISC, diagnosis: 'No significant pathology' }).microscopy,
    'Sections show fragments of intervertebral disc fibrocartilage without significant degenerative or inflammatory change. There is no evidence of malignancy.');
  assert.match(run({ ...DISC, diagnosis: 'Crystal deposition' }).microscopy, /The features are in keeping with gouty tophi\. There is no evidence of malignancy\.$/);
});

test('bone: the house viable-bone sentence, marrow and the §7.5 changes', () => {
  assert.equal(run({ specimen: 'Bone biopsy', site: 'L3 vertebral body', procedure: 'Core biopsy' }).microscopy,
    'Sections show trabeculae of viable bone and fibrous marrow tissue. There is no evidence of malignancy.');
  assert.equal(run({ specimen: 'Bone biopsy', viability: 'Partly viable', marrow: 'Not included', boneChanges: ['Reactive woven bone', 'Sclerosis', 'Osteoclastic resorption', 'Cartilage on the surface'] }).microscopy,
    'Sections show trabeculae of partly viable bone. No marrow is included. There is reactive woven bone formation. The bone trabeculae are thickened and sclerotic. There is increased osteoclastic bone resorption. Cartilage is seen on the surface. There is no evidence of malignancy.');
  assert.match(run({ specimen: 'Bone biopsy', marrow: 'Haematopoietic' }).microscopy, /^Sections show trabeculae of viable bone and haematopoietic marrow\./);
  assert.match(run({ specimen: 'Bone biopsy', marrow: 'Fatty' }).microscopy, /^Sections show trabeculae of viable bone and fatty marrow\./);
  assert.match(run({ ...BONE, diagnosis: 'Osteonecrosis' }).microscopy, /^Sections show necrotic bone trabeculae with empty osteocyte lacunae and necrotic marrow\. The features are in keeping with osteonecrosis\./);
  assert.match(run({ ...BONE, diagnosis: "Paget's disease" }).microscopy, /mosaic pattern of irregular cement lines, numerous enlarged multinucleated osteoclasts, prominent osteoblastic rimming and a fibrovascular marrow\. The features are in keeping with Paget's disease of bone\./);
  assert.match(run({ ...BONE, diagnosis: 'Acute osteomyelitis', stains: ['Gram'] }).microscopy, /^Sections show bone trabeculae with a polymorph infiltrate in the marrow spaces, marrow necrosis and osteoclastic bone resorption\. No bacterial organisms are identified on Gram stain\. The features are in keeping with acute osteomyelitis\. There is no evidence of granulomatous inflammation or malignancy\.$/);
  assert.match(run({ ...BONE, diagnosis: 'Chronic osteomyelitis', stains: ['Gram'] }).microscopy, /^Sections show fragments of necrotic bone with empty osteocyte lacunae, marrow fibrosis, a chronic inflammatory infiltrate of lymphocytes and plasma cells, and reactive new bone formation\./);
});

test('metastatic carcinoma: the morphology, the IHC sentence, the favoured primary and a pathological fracture', () => {
  const r = run({ specimen: 'Bone biopsy', site: 'L3 vertebral body', procedure: 'Core biopsy', diagnosis: 'Metastatic carcinoma', ihcPositive: 'CK7, TTF-1, napsin A', ihcNegative: 'CK20, CDX2', favouredPrimary: 'Lung', pathologicalFracture: 'Present' });
  assert.equal(r.microscopy,
    'Sections show bone with the marrow spaces infiltrated by adenocarcinoma composed of irregular glands lined by cells with enlarged, pleomorphic, hyperchromatic nuclei. On immunohistochemistry, the tumour cells are positive for CK7, TTF-1 and napsin A. They are negative for CK20 and CDX2. The findings are consistent with metastatic adenocarcinoma of lung primary. There is a fracture through the involved bone.');
  assert.equal(r.diagnosis, 'BONE, L3 vertebral body, core biopsy - METASTATIC ADENOCARCINOMA, consistent with LUNG PRIMARY; PATHOLOGICAL FRACTURE; see comment');
  assert.equal(r.comment, 'Please correlate with clinical and radiological findings.');
  assert.deepEqual(r.issues, []);
  const scc = run({ ...BONE, diagnosis: 'Metastatic carcinoma', metType: 'Squamous cell carcinoma', ihcPositive: 'p40, CK5/6' });
  assert.match(scc.microscopy, /nests of malignant squamous cells with eosinophilic cytoplasm, intercellular bridges and focal keratinisation\. On immunohistochemistry, the tumour cells are positive for p40 and CK5\/6\. The findings are in keeping with metastatic squamous cell carcinoma\.$/);
  assert.equal(scc.diagnosis, 'BONE, left tibia - METASTATIC SQUAMOUS CELL CARCINOMA; see comment');
  assert.equal(run({ ...BONE, diagnosis: 'Metastatic carcinoma', metType: 'Carcinoma', ihcPositive: 'AE1/AE3' }).diagnosis, 'BONE, left tibia - METASTATIC CARCINOMA; see comment');
  // "Lung primary" typed in full reads the same.
  assert.match(run({ ...BONE, diagnosis: 'Metastatic carcinoma', ihcPositive: 'CK7', favouredPrimary: 'lung primary' }).diagnosis, /, consistent with LUNG PRIMARY; see comment$/);
});

test('plasma cell neoplasm asks for myeloma correlation', () => {
  const r = run({ specimen: 'Bone biopsy', site: 'T10 vertebral body', diagnosis: 'Plasma cell neoplasm', ihcPositive: 'CD138', ihcNegative: 'CD20' });
  assert.equal(r.microscopy, 'Sections show bone with the marrow spaces replaced by sheets of plasma cells. On immunohistochemistry, the plasma cells are positive for CD138. They are negative for CD20. The findings are in keeping with a plasma cell neoplasm.');
  assert.equal(r.diagnosis, 'BONE, T10 vertebral body - PLASMA CELL NEOPLASM; see comment');
  assert.equal(r.comment, 'Please correlate with clinical and radiological findings for myeloma.');
});

test('granulomas add a sentence, a clause and the comment, and take the place of the microbiology comment', () => {
  const r = run({ specimen: 'Curettings', site: 'left tibia', diagnosis: 'Chronic osteomyelitis', granulomas: GRAN, granulomaType: 'Necrotising', stains: ['Ziehl-Neelsen', 'Grocott'] });
  assert.match(r.microscopy, /reactive new bone formation\. Necrotising granulomas are present\. No acid-fast bacilli are identified on Ziehl-Neelsen stain\. No fungal organisms are identified on Grocott stain\. The features are in keeping with chronic osteomyelitis\. There is no evidence of malignancy\.$/);
  assert.equal(r.diagnosis, 'BONE, left tibia, curettings - CHRONIC OSTEOMYELITIS; necrotising granulomas present; see comment');
  assert.equal(r.comment, 'Granulomatous inflammation is present. The differential diagnosis includes tuberculosis and other mycobacterial infection, fungal infection and sarcoidosis. Correlation with the clinical and microbiological findings is suggested.');
  assert.deepEqual(r.issues, []);
  assert.deepEqual(suggested({ specimen: 'Curettings', diagnosis: 'Chronic osteomyelitis', granulomas: GRAN }), ['bone_granulomas']);
  // A joint head never asks about granulomas: the field is hidden and ignored.
  assert.doesNotMatch(run({ granulomas: GRAN }).microscopy, /granulomas are present/);
});

test('infection: stains, organisms and the microbiology comment', () => {
  for (const diagnosis of INFECTIVE) {
    const base = diagnosis === 'Acute synovitis' ? SYN : diagnosis === 'Acute inflammation' ? DISC : BONE;
    assert.deepEqual(suggested({ ...base, diagnosis }), ['bone_microbiology'], diagnosis);
  }
  assert.deepEqual(suggested({}), []);
  assert.deepEqual(suggested({ ...BONE, diagnosis: 'Metastatic carcinoma' }), ['bone_metastatic']);
  assert.deepEqual(suggested({ ...BONE, diagnosis: 'Plasma cell neoplasm' }), ['bone_myeloma']);
  const r = run({ ...SYN, procedure: 'Synovectomy', diagnosis: 'Acute synovitis', stains: ['Gram'], organisms: ORG, organismText: 'gram-positive cocci are seen on Gram stain' });
  assert.match(r.microscopy, /with fibrin deposition\. Gram-positive cocci are seen on Gram stain\. No haemosiderin/);
  assert.doesNotMatch(r.microscopy, /No bacterial organisms/);
  assert.equal(r.diagnosis, 'SYNOVIUM, right knee, synovectomy - ACUTE SYNOVITIS, suggestive of INFECTION; organisms identified');
  assert.equal(r.comment, 'Please correlate with microbiological findings.');
  // Organisms found on a non-infective diagnosis still ask for microbiology.
  assert.deepEqual(suggested({ ...BONE, organisms: ORG, organismText: 'fungal hyphae are seen on Grocott stain' }), ['bone_microbiology']);
});

test('checks: IHC for a neoplasm, stains for infection and granulomas, a described organism', () => {
  const fields = (values) => run(values).issues.map((i) => i.field);
  assert.deepEqual(fields({ ...BONE, diagnosis: 'Metastatic carcinoma' }), ['ihcPositive']);
  assert.match(run({ ...BONE, diagnosis: 'Plasma cell neoplasm' }).issues[0].message, /CD138 and the light chains/);
  assert.deepEqual(fields({ ...BONE, diagnosis: 'Acute osteomyelitis' }), ['stains']);
  assert.deepEqual(fields({ ...BONE, diagnosis: 'Acute osteomyelitis', stains: ['Gram'] }), []);
  assert.deepEqual(fields({ ...BONE, diagnosis: 'Chronic osteomyelitis', granulomas: GRAN }), ['stains', 'stains', 'stains']);
  assert.deepEqual(fields({ ...BONE, granulomas: GRAN, stains: ['Ziehl-Neelsen'] }), ['stains']);
  assert.deepEqual(fields({ ...BONE, granulomas: GRAN, stains: ['Ziehl-Neelsen', 'PASD'] }), []);
  assert.deepEqual(fields({ ...BONE, organisms: ORG }), ['organismText']);
  assert.deepEqual(fields({}), []);
});

test('sub-fields show only for their specimen or diagnosis', () => {
  const vis = (id, values) => isVisible(field(id), { ...defaults(), ...values });
  assert.equal(vis('oaGrade', {}), true);
  assert.equal(vis('oaGrade', { diagnosis: 'Fracture' }), false);
  assert.equal(vis('avnCollapse', { diagnosis: 'Avascular necrosis' }), true);
  assert.equal(vis('fractureAge', { diagnosis: 'Fracture' }), true);
  assert.equal(vis('crystalType', { ...DISC, diagnosis: 'Crystal deposition' }), true);
  assert.equal(vis('hyperplasia', { ...SYN, diagnosis: 'Chronic synovitis' }), true);
  assert.equal(vis('hyperplasia', { ...SYN, diagnosis: 'No significant pathology' }), false);
  assert.equal(vis('infiltrate', { ...SYN, diagnosis: 'Acute synovitis' }), false);
  assert.equal(vis('lymphoidAggregates', { ...SYN, diagnosis: 'Chronic synovitis', infiltrate: 'Patchy' }), true);
  assert.equal(vis('lymphoidAggregates', { ...SYN, diagnosis: 'Chronic synovitis', infiltrate: 'Absent' }), false);
  assert.equal(vis('debris', { ...SYN, diagnosis: 'Wear debris reaction' }), true);
  assert.equal(vis('discFeatures', { ...DISC, diagnosis: 'Degenerative change' }), true);
  assert.equal(vis('discFeatures', { ...LIG, diagnosis: 'Degenerative change' }), false);
  assert.equal(vis('ligFeatures', { ...LIG, diagnosis: 'Degenerative change' }), true);
  assert.equal(vis('marrow', { ...BONE, diagnosis: 'No evidence of malignancy' }), true);
  assert.equal(vis('marrow', { ...BONE, diagnosis: 'Osteonecrosis' }), false);
  assert.equal(vis('ihcPositive', { ...BONE, diagnosis: 'Plasma cell neoplasm' }), true);
  assert.equal(vis('favouredPrimary', { ...BONE, diagnosis: 'Plasma cell neoplasm' }), false);
  assert.equal(vis('granulomas', {}), false);
  assert.equal(vis('granulomas', SYN), true);
  assert.equal(vis('granulomaType', { ...BONE, granulomas: GRAN }), true);
  assert.equal(vis('organismText', { organisms: ORG }), true);
});

test('macroscopy and block key follow the specimen, sampling and decalcification', () => {
  const syn = run({ ...SYN, dimensions: '3x2x1' });
  assert.equal(syn.macro, 'Received in formalin are irregular pieces of tan-brown soft tissue labelled right knee, measuring 3 x 2 x 1 cm in aggregate. All embedded in 2 blocks.');
  assert.equal(syn.blockKey, '(1-2) Tissue pieces, all embedded.');
  const core = run({ specimen: 'Bone biopsy', site: 'L3 vertebral body', procedure: 'Core biopsy', blocks: '1' });
  assert.equal(core.macro, 'Received in formalin are cores of bone labelled L3 vertebral body. All embedded in 1 block after decalcification.');
  assert.equal(core.blockKey, '(1) Bone cores, all embedded, decalcified.');
  const knee = run({ specimen: 'Knee joint', site: 'right knee', procedure: 'Total knee replacement' });
  assert.equal(knee.macro, 'Received in formalin are pieces of bone with articular cartilage (tibial plateau and femoral condyles) labelled right knee. Representative sections in 2 blocks after decalcification.');
  assert.equal(knee.blockKey, '(1-2) Articular surfaces, representative sections, decalcified.');
  assert.equal(run({ specimen: 'Reamings', site: 'left femur' }).macro, 'Received in formalin are fragments of bone and marrow (reamings) labelled left femur. All embedded in 2 blocks after decalcification.');
  assert.equal(run({ ...BONE, procedure: 'Excision' }).macro, 'Received in formalin is a piece of bone labelled left tibia. Representative sections in 2 blocks after decalcification.');
  assert.equal(run({ decalcification: 'EDTA', site: 'right' }).macro, 'Received in formalin is a right femoral head. Representative sections in 2 blocks after EDTA decalcification.');
  const none = run({ decalcification: 'None', blockScheme: 'All embedded', blocks: '4' });
  assert.equal(none.macro, 'Received in formalin is a femoral head. All embedded in 4 blocks.');
  assert.equal(none.blockKey, '(1-4) Femoral head, all embedded.');
  assert.equal(decalcification({ specimen: 'Disc', decalcification: '' }), '');
  assert.equal(decalcification({ specimen: 'Curettings', decalcification: '' }), 'Formic acid');
  assert.equal(sizePhrase('2 X 1.5X0.5'), '2 x 1.5 x 0.5 cm');
  assert.equal(sizePhrase('12 mm'), '12 mm');
  assert.equal(sizePhrase(''), '');
  const c = one({});
  c.options = { ...c.options, macro: false };
  const off = generate(schema, t.generator, c);
  assert.equal(off.macro, '');
  assert.equal(off.blockKey, '');
});

test('specimen line: typed name wins, the knee is not said twice, curettings and reamings name themselves', () => {
  assert.equal(run({ specimenName: 'Right femoral head, hemiarthroplasty.' }).specimens, 'Right femoral head, hemiarthroplasty');
  assert.equal(run({ specimen: 'Knee joint', site: 'Right knee', procedure: 'Total knee replacement' }).specimens, 'Knee, right, total knee replacement');
  assert.equal(sitePhrase({ specimen: 'Knee joint', site: 'left knee' }), 'left');
  assert.equal(sitePhrase({ specimen: 'Synovium', site: 'Left knee' }), 'left knee');
  assert.equal(procedurePhrase({ specimen: 'Curettings', procedure: '' }), 'curettings');
  assert.equal(procedurePhrase({ specimen: 'Curettings', procedure: 'Curettage' }), 'curettage');
  assert.equal(run({ specimen: 'Reamings', site: 'left femur' }).specimens, 'Bone, left femur, reamings');
  assert.equal(run({ ...DISC, procedure: 'Discectomy' }).specimens, 'Intervertebral disc, L4/5, discectomy');
  assert.equal(run({ ...LIG, procedure: 'Laminectomy' }).specimens, 'Ligamentum flavum, L4/5, laminectomy');
});

test('closing sentence: revision adds infection, an infective diagnosis adds granulomatous inflammation', () => {
  const v = (values) => ({ ...defaults(), ...values });
  assert.equal(closing(v({ ...BONE, diagnosis: 'No evidence of malignancy' })), 'There is no evidence of malignancy.');
  assert.equal(closing(v({ ...BONE, diagnosis: 'Acute osteomyelitis' })), 'There is no evidence of granulomatous inflammation or malignancy.');
  assert.equal(closing(v({ ...BONE, diagnosis: 'Acute osteomyelitis', granulomas: GRAN })), 'There is no evidence of malignancy.');
  assert.equal(closing(v({ ...SYN, procedure: 'Revision arthroplasty', diagnosis: 'Chronic synovitis' })), 'There is no evidence of infection or malignancy.');
  assert.equal(closing(v({ ...BONE, diagnosis: 'Metastatic carcinoma' })), '');
});

// ---------- intake ----------

const route = (line) => matchParts(parseIntake(line), '', manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};

test('intake: the card lines land on the bone and joint form first', () => {
  for (const line of ['Femoral head', 'Synovium, right knee', 'Bone, L3 vertebral biopsy', 'Left femoral head, THR', 'Right knee, TKR', 'Synovium, left hip, revision THR', 'Bone, left tibia, curettings', 'Right femur, reamings', 'Intervertebral disc, L4/5, discectomy', 'Ligamentum flavum, L4/5', 'Bone, L2 vertebral body, core biopsy']) {
    const m = route(line);
    assert.equal(m.templateId, 'bone_joint', line);
    assert.equal(m.tier, 'confident', line);
  }
});

test('intake: specimen, procedure and site are pre-filled from the line', () => {
  assert.deepEqual(preset('Femoral head'), { specimen: 'Femoral head', procedure: '' });
  assert.deepEqual(preset('Synovium, right knee'), { specimen: 'Synovium', procedure: '', site: 'Right knee' });
  assert.deepEqual(preset('Bone, L3 vertebral biopsy'), { specimen: 'Bone biopsy', procedure: 'Biopsy', site: 'L3 vertebral' });
  assert.deepEqual(preset('Left femoral head, THR'), { specimen: 'Femoral head', procedure: 'Total hip replacement', site: 'Left' });
  assert.deepEqual(preset('Right NOF, hemiarthroplasty'), { specimen: 'Femoral head', procedure: 'Hemiarthroplasty', site: 'Right' });
  assert.deepEqual(preset('Right knee, TKR'), { specimen: 'Knee joint', procedure: 'Total knee replacement', site: 'Right knee' });
  assert.deepEqual(preset('Right humeral head, hemiarthroplasty'), { specimen: 'Humeral head', procedure: 'Hemiarthroplasty', site: 'Right' });
  // The map is ordered: a revision THR is a revision first.
  assert.deepEqual(preset('Synovium, left hip, revision THR'), { specimen: 'Synovium', procedure: 'Revision arthroplasty', site: 'Left hip' });
  assert.deepEqual(preset('Bone, left tibia, curettings'), { specimen: 'Curettings', procedure: 'Curettage', site: 'Left tibia' });
  assert.deepEqual(preset('Right femur, reamings'), { specimen: 'Reamings', procedure: '', site: 'Right femur' });
  assert.deepEqual(preset('Intervertebral disc, L4/5, discectomy'), { specimen: 'Disc', procedure: 'Discectomy', site: 'L4/5' });
  assert.deepEqual(preset('Bone, L2 vertebral body, core biopsy'), { specimen: 'Bone biopsy', procedure: 'Core biopsy', site: 'L2 vertebral body' });
});

test('intake: fluid, nodes, jaws, marrow, digits, ossicles and vessels keep their own route', () => {
  assert.equal(route('Joint fluid, right knee').templateId, 'effusion_cytology');
  assert.equal(route('Iliac lymph node, excision').templateId, 'lymph_node');
  assert.equal(route('Stomach, body, biopsy').templateId, 'gastric_biopsy');
  for (const line of ['Mandible, biopsy', 'Bone marrow trephine', 'Right thumb, bone, excision', 'Left malleus', 'Left femoral artery, endarterectomy', 'Right below knee amputation', 'Skin, right knee, excision']) {
    assert.notEqual(route(line).templateId, 'bone_joint', line);
  }
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-femoral-head-moderate-oa', { specimen: 'Femoral head', site: 'left', procedure: 'Total hip replacement', dimensions: '5 x 4.5 x 4', blocks: '3', diagnosis: 'Osteoarthritis', oaGrade: 'Moderate' }],
  ['02-revision-synovium-no-infection', { specimen: 'Synovium', site: 'left hip', procedure: 'Revision arthroplasty', dimensions: '3 x 2 x 1', blocks: '2', diagnosis: 'Chronic synovitis', hyperplasia: 'Mild', infiltrate: 'Patchy', stains: ['Gram'] }],
  ['03-degenerate-lumbar-disc', { specimen: 'Disc', site: 'L4/5', procedure: 'Discectomy', dimensions: '2 x 1.5 x 0.5', blocks: '1', diagnosis: 'Degenerative change', discFeatures: ['Chondrocyte clusters', 'Matrix fissures', 'Vessel ingrowth'] }],
  ['04-vertebral-biopsy-metastatic-carcinoma', { specimen: 'Bone biopsy', site: 'L3 vertebral body', procedure: 'Core biopsy', blocks: '2', diagnosis: 'Metastatic carcinoma', metType: 'Adenocarcinoma', ihcPositive: 'CK7, TTF-1, napsin A', ihcNegative: 'CK20, CDX2', favouredPrimary: 'Lung' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'bone_joint', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
