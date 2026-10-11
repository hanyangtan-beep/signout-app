import { stripDot, checks } from './_house.js';
import { stainSentences } from './abscess.js';
import { ihcPanel } from './softtissue.js';
// Bone and joint (non-neoplastic) generator (benign resection). Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Femoral head, left, total hip replacement"
//   macro      "(A) Received in formalin is a left femoral head, measuring 5 x 4.5 x 4 cm. Representative
//               sections in 3 blocks after decalcification."
//   blockKey   "(A) (1-3) Femoral head, representative sections, decalcified."
//   microscopy "(A) Sections of the articular surface show fibrillation and fissuring of the articular
//               cartilage with chondrocyte clusters and focal full-thickness cartilage loss. The subchondral
//               bone is sclerotic. The features are in keeping with moderate osteoarthritis. There is no
//               evidence of inflammatory arthropathy, crystal arthropathy, avascular necrosis or malignancy."
//   diagnosis  "(A) FEMORAL HEAD, left, total hip replacement - MODERATE OSTEOARTHRITIS"
//
// Benign batch 1 (docs/roadmap.md, "Bone and joint — non-neoplastic", pulled 2026-09-24). Before this template,
// 165 of the 179 bone and joint parts in the five-year biopsy file and the 2024-2026 LIS export landed on Generic.
// The specimen pick-list decides the diagnosis list (`optionsByField`) and which findings are asked for, per RCPath
// G105 Tissue pathways for bone and soft tissue pathology (V3, May 2023):
//   https://www.rcpath.org/static/ed61da32-4f9c-439c-b080b9a7a662090f/g105-bone-soft-tissue.pdf
//   §10.1 arthroplasty: "If the articular surface has been taken at joint replacement for osteoarthritis this
//       should be confirmed histologically and the severity of disease graded as mild, moderate or severe."
//       "Comment should be made on the presence/absence of a primary inflammatory or crystal arthropathy or
//       avascular bone necrosis." "Fractures through or below articular surfaces should always be examined to
//       exclude/identify an underlying cause (pathological fracture)." Every head therefore closes on the
//       absence sentence, and a fracture states that the adjacent bone shows no underlying lesion.
//   §3.4 synovium: "The report must record the presence and degree, or absence, of synovial hyperplasia as well
//       as the distribution and nature of any inflammatory cell infiltrate." "The presence/absence of
//       haemosiderin, crystals, bone or cartilage fragments, foreign material or granulomatous disease should be
//       recorded." "... it is good practice to state that there is no evidence of infection when reviewing
//       material from revision arthroplasties." A heavy polymorph infiltrate is the infection indicator; G105
//       gives no per-field threshold, so none is printed or enforced.
//   §6.5 disc: "The report should detail changes in both the cells and matrix. Of particular note is the
//       formation of chondrocyte clusters and fissures within the matrix." In disc biopsies, polymorphs
//       ("indicating bacterial infection") and vessel or nerve ingrowth "should be noted".
//   Ligamentum flavum is not in G105; its degenerative items (loss of elastic fibres, fibrosis, calcification,
//       chondroid metaplasia) are the histological features scored in https://pmc.ncbi.nlm.nih.gov/articles/PMC7788376/
//   §7.5 bone biopsy: lysis or sclerosis, the nature of new bone, osteomyelitis and organisms, neoplastic cells,
//       fibrosis, "enlarged frequent osteoclasts (e.g. Paget's disease) and zonal empty osteocyte lacunae (e.g.
//       avascular bone necrosis, fracture necrosis)". §9.5 adds, for curettings and resections, "bone lysis or
//       sclerosis, inflammation, organisms, fibrosis, bone remodelling activity, appearance of bone marrow".
//       §7.4: immunohistochemistry "if neoplasia (usually haematological neoplasm or metastatic carcinoma) is
//       suspected"; "Stains for organisms (most commonly Gram stain, Ziehl-Neelsen (ZN) or periodic
//       acid-Schiff) if infection is suspected."
//   §2.3: "monosodium urate crystals are water soluble and are dissolved in formalin", which is why the gout
//       sentences describe amorphous deposits with needle-shaped clefts rather than crystals.
// Primary bone and cartilage tumours stay with the planned `bone_tumour` template; this form has no grading.
//
// Wording: the house phrasing of the 179 bone and joint parts in the 2021-2026 biopsy file and the 2024-2026
// LIS export (aggregate phrase counts only; no case text is kept here). Microscopy: "There is no evidence of
// malignancy" (67 parts), "Please correlate with microbiological findings" (10), "No acute inflammation is
// seen" (5), "Cartilage is seen on the surface" (4), "Sections show trabeculae of viable bone and fibrous marrow
// tissue" and "... of partly viable bone" (3 each), "Please correlate with clinical and radiological findings
// for myeloma" (3). Diagnosis heads: BONE (94 of the 125 capitalised heads), SPINE, SYNOVIUM, KNEE, FEMORAL
// HEAD and INTERVERTEBRAL DISC. Endings: NO EVIDENCE OF MALIGNANCY (78), METASTATIC CARCINOMA or
// ADENOCARCINOMA (20, "consistent with" a LUNG primary in 2), ACUTE INFLAMMATION (6), PLASMA CELL NEOPLASM (4)
// and GOUTY ARTHRITIS (2). The file holds no graded osteoarthritis line: the grades follow G105 §10.1.
// Wording is protected by tests/bone_joint.test.js and tests/fixtures/bone_joint/.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
/** Lower-case an ordinary leading word ("Right knee" -> "right knee") but keep "L4/5", "L3", "T12". */
const lcWord = (s) => (/^[A-Z][a-z]/.test(s || '') ? lc1(s) : s || '');
/** "a, b and c" */
const andList = (xs) => (xs.length <= 1 ? xs[0] || '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const orList = (xs) => (xs.length <= 1 ? xs[0] || '' : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

export const HEADS = ['Femoral head', 'Humeral head', 'Knee joint'];
export const SOFT = ['Synovium', 'Disc', 'Ligamentum'];
export const BONES = ['Bone biopsy', 'Curettings', 'Bone', 'Reamings'];

// Diagnosis values (the option lists per specimen live in the schema's `optionsByField`).
export const OA = 'Osteoarthritis';
export const AVN = 'Avascular necrosis';
export const FRACTURE = 'Fracture';
export const INFLAMMATORY = 'Inflammatory arthropathy';
export const CRYSTAL = 'Crystal arthropathy';
export const METASTATIC = 'Metastatic carcinoma';
export const CHRONIC_SYN = 'Chronic synovitis';
export const DETRITIC = 'Detritic synovitis';
export const WEAR = 'Wear debris reaction';
export const ACUTE_SYN = 'Acute synovitis';
export const HAEMOSIDEROTIC = 'Haemosiderotic synovitis';
export const NSP = 'No significant pathology';
export const DEGENERATIVE = 'Degenerative change';
export const ACUTE_INF = 'Acute inflammation';
export const CRYSTAL_DEP = 'Crystal deposition';
export const NEM = 'No evidence of malignancy';
export const PLASMA = 'Plasma cell neoplasm';
export const ACUTE_OM = 'Acute osteomyelitis';
export const CHRONIC_OM = 'Chronic osteomyelitis';
export const OSTEONECROSIS = 'Osteonecrosis';
export const PAGET = "Paget's disease";
export const CALLUS = 'Fracture callus';
/** Infection is the working diagnosis: the microbiology comment is offered and a stain for organisms is expected. */
export const INFECTIVE = [ACUTE_SYN, ACUTE_INF, ACUTE_OM, CHRONIC_OM];

const SPEC = {
  'Femoral head': { head: 'FEMORAL HEAD', name: 'Femoral head', what: 'is a femoral head', key: 'Femoral head', whole: true, bone: true },
  'Humeral head': { head: 'HUMERAL HEAD', name: 'Humeral head', what: 'is a humeral head', key: 'Humeral head', whole: true, bone: true },
  'Knee joint': { head: 'KNEE', name: 'Knee', what: 'are pieces of bone with articular cartilage (tibial plateau and femoral condyles)', key: 'Articular surfaces', whole: true, aggregate: true, bone: true },
  Synovium: { head: 'SYNOVIUM', name: 'Synovium', what: 'are irregular pieces of tan-brown soft tissue', key: 'Tissue pieces', aggregate: true },
  Disc: { head: 'INTERVERTEBRAL DISC', name: 'Intervertebral disc', what: 'are fragments of grey-white cartilaginous tissue', key: 'Disc fragments', aggregate: true },
  Ligamentum: { head: 'LIGAMENTUM FLAVUM', name: 'Ligamentum flavum', what: 'are fragments of tan-white fibrous tissue', key: 'Ligament fragments', aggregate: true },
  'Bone biopsy': { head: 'BONE', name: 'Bone', what: 'are fragments of bone', key: 'Bone fragments', aggregate: true, bone: true },
  Curettings: { head: 'BONE', name: 'Bone', what: 'are fragments of bone and soft tissue', key: 'Bone fragments', aggregate: true, bone: true },
  Bone: { head: 'BONE', name: 'Bone', what: 'is a piece of bone', key: 'Bone', whole: true, bone: true },
  Reamings: { head: 'BONE', name: 'Bone', what: 'are fragments of bone and marrow (reamings)', key: 'Reamings', aggregate: true, bone: true }
};
const specimen = (v) => (SPEC[v.specimen] ? v.specimen : 'Femoral head');
const spec = (v) => SPEC[specimen(v)];
const isHead = (v) => HEADS.includes(specimen(v));
const dx = (v) => v.diagnosis || OA;
const CORE_PROCEDURE = ['Core biopsy', 'Trephine biopsy', 'Punch biopsy'];
export const granulomasPresent = (v) => !isHead(v) && /^Present/.test(v.granulomas || '');
export const organismsIdentified = (v) => /^Identified/.test(v.organisms || '');
export const revision = (v) => v.procedure === 'Revision arthroplasty';
export const infective = (v) => INFECTIVE.includes(dx(v)) || organismsIdentified(v);

// ---------- specimen ----------

/**
 * The typed side / site / level, first word lower-cased. Under the KNEE head a "knee" in the site is dropped
 * ("Right knee, TKR" reads "KNEE, right, total knee replacement"), so the line does not say it twice.
 */
export function sitePhrase(v) {
  const site = lcWord(stripDot(v.site));
  if (specimen(v) !== 'Knee joint') return site;
  return site.replace(/\s*\bknees?\b\s*/i, ' ').replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '');
}

/** The procedure as written; curettings and reamings name themselves when no procedure is picked. */
export function procedurePhrase(v) {
  if (v.procedure) return lc1(v.procedure);
  return { Curettings: 'curettings', Reamings: 'reamings' }[specimen(v)] || '';
}

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return typed;
  return [spec(v).name, sitePhrase(v), procedurePhrase(v)].filter(Boolean).join(', ');
}

// ---------- macroscopic description ----------

/** "3x2x1" -> "3 x 2 x 1 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}
const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 2));
/** Heads, knee joint surfaces and an excised piece of bone are sampled; fragments are embedded whole. */
const representative = (v) => (v.blockScheme ? v.blockScheme === 'Representative sections' : !!spec(v).whole);
/** '' (per specimen) decalcifies every bone-bearing specimen in formic acid and nothing else. */
export function decalcification(v) {
  if (v.decalcification === 'None') return '';
  if (v.decalcification) return v.decalcification;
  return spec(v).bone ? 'Formic acid' : '';
}
const coreBiopsy = (v) => specimen(v) === 'Bone biopsy' && CORE_PROCEDURE.includes(v.procedure);

function what(v) {
  if (coreBiopsy(v)) return { what: 'are cores of bone', key: 'Bone cores', aggregate: false };
  return spec(v);
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const d = what(v);
  // The macro keeps the site as written ("labelled right knee"); only the diagnosis line drops the repeat.
  const site = lcWord(stripDot(v.site));
  const size = sizePhrase(v.dimensions);
  // A side alone reads as an adjective on a whole specimen: "is a left femoral head".
  const sideOnly = /^(left|right)$/i.test(site);
  let first = `Received in formalin ${d.what}`;
  if (site && sideOnly && /^is an? /.test(d.what)) first = `Received in formalin ${d.what.replace(/^is an? /, `is a ${site.toLowerCase()} `)}`;
  else if (site) first += ` labelled ${site}`;
  if (size) first += `, measuring ${size}${d.aggregate ? ' in aggregate' : ''}`;
  const blocks = blockCount(v);
  const plural = blocks === 1 ? '' : 's';
  const decal = decalcification(v);
  const after = decal === 'EDTA' ? ' after EDTA decalcification' : decal ? ' after decalcification' : '';
  const sampling = representative(v) ? `Representative sections in ${blocks} block${plural}${after}.` : `All embedded in ${blocks} block${plural}${after}.`;
  return `(${part.label}) ${first}. ${sampling}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = blockCount(v);
  const range = blocks === 1 ? '(1)' : `(1-${blocks})`;
  const how = representative(v) ? 'representative sections' : 'all embedded';
  return `(${part.label}) ${range} ${what(v).key}, ${how}${decalcification(v) ? ', decalcified' : ''}.`;
}

// ---------- microscopy ----------

const OA_GRADE = {
  Mild: [
    'Sections of the articular surface show fibrillation of the articular cartilage with chondrocyte clusters.',
    'The subchondral bone is unremarkable.'
  ],
  Moderate: [
    'Sections of the articular surface show fibrillation and fissuring of the articular cartilage with chondrocyte clusters and focal full-thickness cartilage loss.',
    'The subchondral bone is sclerotic.'
  ],
  Severe: [
    'Sections of the articular surface show loss of the articular cartilage with eburnation of the exposed subchondral bone.',
    'There is subchondral sclerosis with cyst formation, and marginal osteophytes are present.'
  ]
};
export const oaGrade = (v) => (OA_GRADE[v.oaGrade] ? v.oaGrade : 'Moderate');
const urate = (v) => v.crystalType !== 'Calcium pyrophosphate';

const MET_MICRO = {
  Adenocarcinoma: 'Sections show bone with the marrow spaces infiltrated by adenocarcinoma composed of irregular glands lined by cells with enlarged, pleomorphic, hyperchromatic nuclei.',
  Carcinoma: 'Sections show bone with the marrow spaces infiltrated by nests and sheets of malignant epithelial cells with enlarged, pleomorphic, hyperchromatic nuclei.',
  'Squamous cell carcinoma': 'Sections show bone with the marrow spaces infiltrated by nests of malignant squamous cells with eosinophilic cytoplasm, intercellular bridges and focal keratinisation.'
};
const metType = (v) => (MET_MICRO[v.metType] ? v.metType : 'Adenocarcinoma');
const primaryOf = (v) => stripDot(v.favouredPrimary).replace(/\s+(primary|origin)$/i, '').trim();
const pathologicalFracture = (v) => v.pathologicalFracture === 'Present';

function metastatic(v) {
  const type = metType(v);
  const primary = primaryOf(v);
  return {
    body: [
      MET_MICRO[type],
      ...ihcPanel(v, 'tumour cells'),
      primary ? `The findings are consistent with metastatic ${lc1(type)} of ${lc1(primary)} primary.` : `The findings are in keeping with metastatic ${lc1(type)}.`,
      ...(pathologicalFracture(v) ? ['There is a fracture through the involved bone.'] : [])
    ],
    absent: []
  };
}

// Synovium (G105 §3.4): the hyperplasia sentence, the infiltrate sentence, the checklist, then the conclusion.
const HYPERPLASIA = {
  Absent: 'Sections show synovium without lining hyperplasia.',
  Mild: 'Sections show synovium with mild lining hyperplasia.',
  Moderate: 'Sections show synovium with moderate lining hyperplasia.',
  Marked: 'Sections show synovium with marked lining hyperplasia and a villous architecture.'
};
const hyperplasia = (v) => HYPERPLASIA[v.hyperplasia] || HYPERPLASIA.Mild;
/** Chronic synovitis places the infiltrate; after a described deposit the sentence only adds it ("There is"). */
function infiltrateSentence(v) {
  if (v.infiltrate === 'Absent') return 'There is no significant chronic inflammatory infiltrate.';
  const where = v.infiltrate === 'Diffuse' ? 'a diffuse' : 'a patchy';
  if (dx(v) !== CHRONIC_SYN) return `There is ${where} chronic inflammatory infiltrate of lymphocytes and plasma cells.`;
  const aggregates = v.lymphoidAggregates === 'Present' ? ', with lymphoid aggregates' : '';
  return `The subsynovial tissue contains ${where} chronic inflammatory infiltrate of lymphocytes and plasma cells${aggregates}.`;
}
const DEBRIS = { Metal: 'black metallic particles', Polyethylene: 'birefringent polyethylene particles', Cement: 'cement particles' };
function debrisPhrase(v) {
  const xs = ['Metal', 'Polyethylene', 'Cement'].filter((d) => (v.debris || []).includes(d)).map((d) => DEBRIS[d]);
  return xs.length ? andList(xs) : 'particulate wear debris';
}
const EXTRA = {
  Haemosiderin: 'Haemosiderin deposits are present.',
  'Bone or cartilage fragments': 'Fragments of bone and cartilage are present in the subsynovial tissue.',
  'Wear debris': 'Particulate wear debris is present within histiocytes.'
};
const extras = (v) => (dx(v) === NSP ? [] : Object.keys(EXTRA).filter((k) => (v.synFindings || []).includes(k)));

/** The G105 §3.4 checklist: every item not described is recorded as absent, in one sentence. */
export function synoviumChecklist(v) {
  const d = dx(v);
  const x = extras(v);
  const items = [
    { name: 'haemosiderin', present: d === HAEMOSIDEROTIC || x.includes('Haemosiderin') },
    { name: 'crystals', plural: true, present: d === CRYSTAL },
    { name: 'bone or cartilage fragments', plural: true, present: d === DETRITIC || x.includes('Bone or cartilage fragments') },
    { name: 'foreign material', present: d === WEAR || x.includes('Wear debris') },
    { name: 'granulomas', plural: true, present: granulomasPresent(v) }
  ].filter((i) => !i.present);
  if (!items.length) return '';
  const last = items[items.length - 1];
  return `No ${orList(items.map((i) => i.name))} ${last.plural ? 'are' : 'is'} identified.`;
}

function synovium(v) {
  switch (dx(v)) {
    case DETRITIC:
      return { body: [hyperplasia(v), 'Fragments of bone and cartilage are embedded in the subsynovial tissue, with a surrounding histiocytic and foreign-body giant cell reaction.', infiltrateSentence(v)], conclusion: 'The features are in keeping with detritic synovitis.' };
    case WEAR:
      return { body: [hyperplasia(v), `The subsynovial tissue contains sheets of histiocytes and foreign-body giant cells containing ${debrisPhrase(v)}.`, infiltrateSentence(v)], conclusion: 'The features are in keeping with a foreign-body reaction to wear debris.' };
    case ACUTE_SYN:
      return { body: [hyperplasia(v), 'There is a heavy polymorph infiltrate in the synovial lining and subsynovial tissue, with fibrin deposition.'], conclusion: 'The features are suggestive of infection.' };
    case CRYSTAL:
      return urate(v)
        ? { body: [hyperplasia(v), 'The subsynovial tissue contains deposits of amorphous material with needle-shaped crystal clefts, surrounded by histiocytes and foreign-body giant cells.'], conclusion: 'The features are in keeping with gouty arthritis.' }
        : { body: [hyperplasia(v), 'The synovium contains deposits of rhomboid, weakly birefringent crystals, surrounded by histiocytes and foreign-body giant cells.'], conclusion: 'The features are in keeping with calcium pyrophosphate deposition disease.' };
    case HAEMOSIDEROTIC:
      return { body: [hyperplasia(v), 'There is abundant haemosiderin deposition in the synovial lining cells and subsynovial macrophages.', infiltrateSentence(v)], conclusion: 'The features are in keeping with haemosiderotic synovitis.' };
    case NSP:
      return { body: ['Sections show synovium without lining hyperplasia or significant inflammation.'] };
    default:
      return { body: [hyperplasia(v), infiltrateSentence(v)], conclusion: v.infiltrate === 'Absent' ? '' : 'The features are in keeping with chronic synovitis.' };
  }
}

// Disc and ligamentum flavum (G105 §6.5).
const DISC_CHANGE = { 'Chondrocyte clusters': 'chondrocyte clusters', 'Matrix fissures': 'fissuring of the matrix', 'Myxoid change': 'myxoid change', Calcification: 'focal calcification' };
const INGROWTH = { 'Vessel ingrowth': 'small blood vessels', 'Nerve ingrowth': 'nerve fibres' };
const LIG_CHANGE = { 'Elastic fibre fragmentation': 'fragmentation and loss of elastic fibres', Fibrosis: 'fibrosis', 'Myxoid change': 'myxoid change', Calcification: 'focal calcification', 'Chondroid metaplasia': 'chondroid metaplasia' };
const isDisc = (v) => specimen(v) === 'Disc';
const softTissue = (v) => (isDisc(v) ? 'fragments of intervertebral disc fibrocartilage' : 'fibroelastic ligamentous tissue');
const picked = (list, map) => Object.keys(map).filter((k) => (list || []).includes(k)).map((k) => map[k]);

function disc(v) {
  switch (dx(v)) {
    case ACUTE_INF:
      return {
        body: [isDisc(v) ? 'Sections show fragments of intervertebral disc fibrocartilage with a polymorph infiltrate, necrotic debris and granulation tissue.' : 'Sections show fibroelastic ligamentous tissue with a polymorph infiltrate and granulation tissue.'],
        conclusion: isDisc(v) ? 'The features are suggestive of discitis.' : 'The features are suggestive of infection.'
      };
    case CRYSTAL_DEP:
      return urate(v)
        ? { body: [`Sections show ${softTissue(v)} with deposits of amorphous material with needle-shaped crystal clefts, surrounded by histiocytes and foreign-body giant cells.`], conclusion: 'The features are in keeping with gouty tophi.' }
        : { body: [`Sections show ${softTissue(v)} with deposits of rhomboid, weakly birefringent crystals, surrounded by a histiocytic reaction.`], conclusion: 'The features are in keeping with calcium pyrophosphate deposition.' };
    case NSP:
      return { body: [`Sections show ${softTissue(v)} without significant degenerative or inflammatory change.`] };
    default: {
      const changes = isDisc(v) ? picked(v.discFeatures, DISC_CHANGE) : picked(v.ligFeatures, LIG_CHANGE);
      const body = [`Sections show ${softTissue(v)} with degenerative change${changes.length ? `, including ${andList(changes)}` : ''}.`];
      const ingrowth = isDisc(v) ? picked(v.discFeatures, INGROWTH) : [];
      if (ingrowth.length) body.push(`There is ingrowth of ${andList(ingrowth)}.`);
      body.push('No acute inflammation is seen.');
      return { body };
    }
  }
}

// Bone biopsy, curettings, excised bone and reamings (G105 §7.5).
const MARROW = { Fibrous: 'fibrous marrow tissue', Haematopoietic: 'haematopoietic marrow', Fatty: 'fatty marrow' };
const BONE_CHANGE = {
  'Reactive woven bone': 'There is reactive woven bone formation.',
  Sclerosis: 'The bone trabeculae are thickened and sclerotic.',
  'Osteoclastic resorption': 'There is increased osteoclastic bone resorption.',
  'Cartilage on the surface': 'Cartilage is seen on the surface.'
};

function bone(v) {
  switch (dx(v)) {
    case METASTATIC: return metastatic(v);
    case PLASMA:
      return { body: ['Sections show bone with the marrow spaces replaced by sheets of plasma cells.', ...ihcPanel(v, 'plasma cells'), 'The findings are in keeping with a plasma cell neoplasm.'], absent: [] };
    case ACUTE_OM:
      return { body: ['Sections show bone trabeculae with a polymorph infiltrate in the marrow spaces, marrow necrosis and osteoclastic bone resorption.'], conclusion: 'The features are in keeping with acute osteomyelitis.' };
    case CHRONIC_OM:
      return { body: ['Sections show fragments of necrotic bone with empty osteocyte lacunae, marrow fibrosis, a chronic inflammatory infiltrate of lymphocytes and plasma cells, and reactive new bone formation.'], conclusion: 'The features are in keeping with chronic osteomyelitis.' };
    case OSTEONECROSIS:
      return { body: ['Sections show necrotic bone trabeculae with empty osteocyte lacunae and necrotic marrow.'], conclusion: 'The features are in keeping with osteonecrosis.' };
    case PAGET:
      return { body: ['Sections show thickened bone trabeculae with a mosaic pattern of irregular cement lines, numerous enlarged multinucleated osteoclasts, prominent osteoblastic rimming and a fibrovascular marrow.'], conclusion: "The features are in keeping with Paget's disease of bone." };
    case CALLUS:
      return { body: ['Sections show fracture callus composed of fibrous tissue, cartilage and woven bone, with haemorrhage and fragments of necrotic bone.', 'The adjacent bone shows no underlying lesion.'] };
    default: {
      const viable = v.viability === 'Partly viable' ? 'partly viable' : 'viable';
      const body = v.marrow === 'Not included'
        ? [`Sections show trabeculae of ${viable} bone.`, 'No marrow is included.']
        : [`Sections show trabeculae of ${viable} bone and ${MARROW[v.marrow] || MARROW.Fibrous}.`];
      body.push(...Object.keys(BONE_CHANGE).filter((k) => (v.boneChanges || []).includes(k)).map((k) => BONE_CHANGE[k]));
      return { body };
    }
  }
}

// Joint replacement heads (G105 §10).
function head(v) {
  switch (dx(v)) {
    case METASTATIC: return metastatic(v);
    case AVN:
      return {
        body: [
          'Sections show a zone of necrotic bone trabeculae with empty osteocyte lacunae and necrotic marrow, bordered by fibrous tissue and reactive new bone formation.',
          v.avnCollapse === 'Present' ? 'There is a subchondral fracture with collapse of the overlying articular surface.' : 'The overlying articular cartilage is preserved.'
        ],
        conclusion: 'The features are in keeping with avascular necrosis.',
        absent: ['inflammatory arthropathy', 'crystal arthropathy']
      };
    case FRACTURE:
      return {
        body: [
          v.fractureAge === 'Healing'
            ? 'Sections show a fracture through the bone, with callus composed of fibrous tissue, cartilage and woven bone at the fracture site.'
            : 'Sections show a fracture through the bone, with haemorrhage, fibrin and fragmented bone trabeculae at the fracture site.',
          'The adjacent bone and marrow show no underlying lesion.',
          'The articular cartilage is unremarkable.'
        ],
        absent: ['inflammatory arthropathy', 'crystal arthropathy', 'avascular necrosis']
      };
    case INFLAMMATORY:
      return {
        body: [
          'Sections of the articular surface show erosion of the articular cartilage by a vascular inflammatory pannus.',
          'The synovium shows villous hyperplasia with a dense lymphoplasmacytic infiltrate and lymphoid aggregates.'
        ],
        conclusion: 'The features are in keeping with an inflammatory arthropathy.',
        absent: ['crystal arthropathy', 'avascular necrosis']
      };
    case CRYSTAL:
      return urate(v)
        ? { body: ['Sections show deposits of amorphous material with needle-shaped crystal clefts in the articular cartilage and subchondral bone, surrounded by histiocytes and foreign-body giant cells.'], conclusion: 'The features are in keeping with gouty arthritis.', absent: ['avascular necrosis'] }
        : { body: ['Sections show deposits of rhomboid, weakly birefringent crystals in the articular cartilage.'], conclusion: 'The features are in keeping with calcium pyrophosphate deposition disease.', absent: ['avascular necrosis'] };
    default:
      return {
        body: [...OA_GRADE[oaGrade(v)]],
        conclusion: `The features are in keeping with ${oaGrade(v).toLowerCase()} osteoarthritis.`,
        absent: ['inflammatory arthropathy', 'crystal arthropathy', 'avascular necrosis']
      };
  }
}

function narrative(v) {
  if (isHead(v)) return head(v);
  if (specimen(v) === 'Synovium') return synovium(v);
  if (SOFT.includes(specimen(v))) return disc(v);
  return bone(v);
}

function organismSentences(v) {
  if (organismsIdentified(v)) {
    const typed = stripDot(v.organismText);
    return [typed ? `${typed.charAt(0).toUpperCase()}${typed.slice(1)}.` : 'Organisms are identified.'];
  }
  return stainSentences(v.stains);
}

/**
 * The closing absence sentence. A malignant diagnosis has none; a revision arthroplasty records the absence
 * of infection (G105 §3.4) unless infection is the diagnosis; an infective diagnosis records the absence of
 * granulomatous inflammation unless granulomas are described.
 */
export function closing(v, n = narrative(v)) {
  if ([METASTATIC, PLASMA].includes(dx(v))) return '';
  const absent = [...(n.absent || [])];
  if (revision(v) && !infective(v)) absent.push('infection');
  if (INFECTIVE.includes(dx(v)) && !granulomasPresent(v) && specimen(v) !== 'Synovium') absent.push('granulomatous inflammation');
  absent.push('malignancy');
  return `There is no evidence of ${orList(absent)}.`;
}

export function microscopy(part) {
  const v = part.values;
  const n = narrative(v);
  const s = [...n.body];
  if (specimen(v) === 'Synovium') s.push(...extras(v).map((k) => EXTRA[k]));
  if (granulomasPresent(v)) s.push(v.granulomaType === 'Necrotising' ? 'Necrotising granulomas are present.' : 'Non-necrotising epithelioid granulomas are present.');
  s.push(...organismSentences(v));
  // The checklist is a finding, so it precedes the interpretation.
  if (specimen(v) === 'Synovium') {
    const list = synoviumChecklist(v);
    if (list) s.push(list);
  }
  if (n.conclusion) s.push(n.conclusion);
  const close = closing(v, n);
  if (close) s.push(close);
  const notes = stripDot(v.additionalNotes);
  if (notes) s.push(`${notes}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

export function mainLine(v) {
  switch (dx(v)) {
    case AVN: return v.avnCollapse === 'Present' ? 'AVASCULAR NECROSIS with SUBCHONDRAL COLLAPSE' : 'AVASCULAR NECROSIS';
    case FRACTURE: return v.fractureAge === 'Healing' ? 'HEALING FRACTURE' : 'RECENT FRACTURE';
    case INFLAMMATORY: return 'In keeping with INFLAMMATORY ARTHROPATHY';
    case CRYSTAL: return urate(v) ? 'GOUTY ARTHRITIS' : 'CALCIUM PYROPHOSPHATE DEPOSITION DISEASE';
    case METASTATIC: {
      const primary = primaryOf(v);
      return `METASTATIC ${metType(v).toUpperCase()}${primary ? `, consistent with ${primary.toUpperCase()} PRIMARY` : ''}`;
    }
    case CHRONIC_SYN:
      if (v.infiltrate !== 'Absent') return 'CHRONIC SYNOVITIS';
      return v.hyperplasia === 'Absent' ? 'NO SIGNIFICANT PATHOLOGY' : 'SYNOVIAL HYPERPLASIA';
    case DETRITIC: return 'DETRITIC SYNOVITIS';
    case WEAR: return 'FOREIGN BODY REACTION to WEAR DEBRIS';
    case ACUTE_SYN: return 'ACUTE SYNOVITIS, suggestive of INFECTION';
    case HAEMOSIDEROTIC: return 'HAEMOSIDEROTIC SYNOVITIS';
    case NSP: return 'NO SIGNIFICANT PATHOLOGY';
    case DEGENERATIVE: return 'DEGENERATIVE CHANGE';
    case ACUTE_INF: return isDisc(v) ? 'ACUTE INFLAMMATION, suggestive of DISCITIS' : 'ACUTE INFLAMMATION, suggestive of INFECTION';
    case CRYSTAL_DEP: return urate(v) ? 'GOUTY TOPHUS' : 'CALCIUM PYROPHOSPHATE DEPOSITION';
    case PLASMA: return 'PLASMA CELL NEOPLASM';
    case ACUTE_OM: return 'ACUTE OSTEOMYELITIS';
    case CHRONIC_OM: return 'CHRONIC OSTEOMYELITIS';
    case OSTEONECROSIS: return 'OSTEONECROSIS';
    case PAGET: return "PAGET'S DISEASE OF BONE";
    case CALLUS: return 'FRACTURE CALLUS';
    case NEM: return 'NO EVIDENCE OF MALIGNANCY';
    default: return `${oaGrade(v).toUpperCase()} OSTEOARTHRITIS`;
  }
}

export function diagnosis(part) {
  const v = part.values;
  const clauses = [mainLine(v)];
  if (dx(v) === METASTATIC && pathologicalFracture(v)) clauses.push('PATHOLOGICAL FRACTURE');
  if (revision(v) && !infective(v)) clauses.push('NO EVIDENCE OF INFECTION');
  if (granulomasPresent(v)) clauses.push(`${v.granulomaType === 'Necrotising' ? 'necrotising' : 'non-necrotising'} granulomas present`);
  if (organismsIdentified(v)) clauses.push('organisms identified');
  if (granulomasPresent(v) || [METASTATIC, PLASMA].includes(dx(v))) clauses.push('see comment');
  const line = [spec(v).head, sitePhrase(v), procedurePhrase(v)].filter(Boolean).join(', ');
  return `(${part.label}) ${line} - ${clauses.join('; ')}`;
}

// ---------- case flags and checks ----------

/**
 * `infective` drives the microbiology comment for the whole case. A granulomatous part is left out: its own
 * comment already asks for clinical and microbiological correlation.
 */
export function flags(parts) {
  return parts.some((p) => infective(p.values) && !granulomasPresent(p.values)) ? ['infective'] : [];
}

export function validate(part) {
  const v = part.values;
  const { out, warn } = checks();
  const stains = v.stains || [];
  if ([METASTATIC, PLASMA].includes(dx(v)) && !stripDot(v.ihcPositive) && !stripDot(v.ihcNegative)) {
    warn(dx(v) === PLASMA ? 'Plasma cell neoplasm: record the immunohistochemistry (CD138 and the light chains).' : 'Metastatic carcinoma: record the immunohistochemistry that supports it.', 'ihcPositive');
  }
  if (INFECTIVE.includes(dx(v)) && !stains.length && !organismsIdentified(v)) {
    warn('Infection is suspected: no stain for organisms (Gram, Ziehl-Neelsen or PASD) is recorded.', 'stains');
  }
  if (granulomasPresent(v) && !stains.includes('Ziehl-Neelsen')) warn('Granulomas are present but no Ziehl-Neelsen stain is recorded.', 'stains');
  if (granulomasPresent(v) && !stains.includes('PASD') && !stains.includes('Grocott')) warn('Granulomas are present but no fungal stain (PASD or Grocott) is recorded.', 'stains');
  if (organismsIdentified(v) && !stripDot(v.organismText)) warn('Organisms identified: describe what is seen and on which stain.', 'organismText');
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags, validate };
