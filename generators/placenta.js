import { stripDot } from './_house.js';
// Placenta generator (Phase 4b, roadmap item 2). Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimenName "Placenta, delivery" / "Twin placenta, delivery"
//   macro        "(A) The placenta weighs 480 g. Consists of a singleton placenta with a centrally inserted umbilical cord. ..."
//   blockKey     "(A) (1)&(2) Umbilical cord and roll of placental membranes. (3)&(4) Placental disc."
//   microscopy   "(A) Sections of the placenta show third-trimester chorionic villi with no inflammation. The umbilical cord ..."
//   diagnosis    "(A) PLACENTA, singleton, third trimester - NO SIGNIFICANT PATHOLOGY"
// Inflammatory staging follows the Amsterdam Placental Workshop Group consensus (maternal / fetal stage).
// Wording is protected by tests/placenta.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const sentence = (s) => (stripDot(s) ? `${uc1(stripDot(s))}.` : '');

export const isTwin = (v) => /^Twin/i.test(String(v.plurality || ''));

/** "dichorionic diamniotic" for a twin placenta, '' for a singleton. */
export function chorionicity(v) {
  if (!isTwin(v)) return '';
  return String(v.plurality).replace(/^Twin\s*[-–]\s*/i, '').trim().toLowerCase();
}

/** "third trimester" — lower-case gestation phrase for the diagnosis line. */
export const gestationPhrase = (v) => lc1(String(v.gestation || 'Third trimester').trim());

/** "singleton" / "twin (dichorionic diamniotic)" as printed in the diagnosis line. */
export function pluralityPhrase(v) {
  if (!isTwin(v)) return 'singleton';
  const c = chorionicity(v);
  return c ? `twin (${c})` : 'twin';
}

export function specimenName(part) {
  const v = part.values;
  const given = String(v.specimenName || '').trim();
  if (given) return given;
  return isTwin(v) ? 'Twin placenta, delivery' : 'Placenta, delivery';
}

// ---------- macroscopic description ----------

function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

const INSERTION = {
  Central: 'a centrally inserted umbilical cord',
  Eccentric: 'an eccentrically inserted umbilical cord',
  Marginal: 'a marginally inserted umbilical cord',
  Velamentous: 'a velamentously inserted umbilical cord'
};

const MEMBRANE_INSERTION = {
  Marginal: 'marginally inserted',
  Circummarginate: 'circummarginate',
  Circumvallate: 'circumvallate'
};

function cutSurfaceSentence(v) {
  switch (v.cutSurface) {
    case 'Infarct(s)': {
      const pct = stripDot(v.cutSurfaceInfarctPercent).replace(/%$/, '').trim();
      return `The cut surfaces show infarction${pct ? ` involving approximately ${pct}% of the disc` : ''}.`;
    }
    case 'Retroplacental haematoma': return 'The cut surfaces show a retroplacental haematoma.';
    case 'Intervillous thrombi': return 'The cut surfaces show intervillous thrombi.';
    case 'Other - describe': {
      const d = stripDot(v.cutSurfaceOther);
      return d ? `The cut surfaces show ${lc1(d)}.` : 'The cut surfaces are unremarkable.';
    }
    default: return 'The cut surfaces are unremarkable.';
  }
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const w = num(v.weight);
  if (w !== null) s.push(`The placenta weighs ${fmt(w)} g.`);
  const kind = isTwin(v) ? `${chorionicity(v) ? `${chorionicity(v)} ` : ''}twin placenta` : 'singleton placenta';
  const insertion = INSERTION[v.cordInsertion] || 'an umbilical cord';
  s.push(`Consists of a ${kind} with ${insertion}.`);

  const len = num(v.cordLength);
  const dia = num(v.cordDiameter);
  const dims = [];
  if (len !== null) dims.push(`${fmt(len)} cm long`);
  if (dia !== null) dims.push(`${fmt(dia)} cm in diameter`);
  const vessels = v.cordVessels === 'Two' ? 'two vessels' : v.cordVessels === 'Three' ? 'three vessels' : '';
  if (dims.length && vessels) s.push(`The umbilical cord measures ${dims.join(' and ')} and contains ${vessels}.`);
  else if (dims.length) s.push(`The umbilical cord measures ${dims.join(' and ')}.`);
  else if (vessels) s.push(`The umbilical cord contains ${vessels}.`);
  const cordNote = stripDot(v.cordFeatures);
  if (cordNote) s.push(`The umbilical cord is ${lc1(cordNote)}.`);

  const mem = [];
  if (v.membranes) mem.push(lc1(v.membranes));
  if (v.membraneColour) mem.push(lc1(v.membraneColour));
  if (MEMBRANE_INSERTION[v.membraneInsertion]) mem.push(MEMBRANE_INSERTION[v.membraneInsertion]);
  if (mem.length) s.push(`The membranes are ${listJoin(mem)}.`);

  const size = sizePhrase(v.discSize);
  if (size) s.push(`The placental disc measures ${size}.`);
  s.push(cutSurfaceSentence(v));

  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 4));
  s.push(`Representative sections in ${blocks} ${blocks === 1 ? 'block' : 'blocks'}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

/** Standard key: (1)&(2) cord + membrane roll, (3)&(4) disc; extra blocks are disc. */
export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const n = Math.max(1, Math.round(num(part.values.blocks) ?? 4));
  let key;
  if (n === 1) key = '(1) Umbilical cord, roll of placental membranes and placental disc.';
  else if (n === 2) key = '(1) Umbilical cord and roll of placental membranes. (2) Placental disc.';
  else if (n === 3) key = '(1)&(2) Umbilical cord and roll of placental membranes. (3) Placental disc.';
  else if (n === 4) key = '(1)&(2) Umbilical cord and roll of placental membranes. (3)&(4) Placental disc.';
  else key = `(1)&(2) Umbilical cord and roll of placental membranes. (3)-(${n}) Placental disc.`;
  return `(${part.label}) ${key}`;
}

// ---------- microscopy ----------

const MATERNAL = {
  'Stage 1 - acute subchorionitis': {
    micro: 'Neutrophils are present in the subchorionic fibrin and chorionic trophoblast layer of the placental membranes, consistent with acute subchorionitis (maternal stage 1).',
    dx: 'ACUTE SUBCHORIONITIS (maternal stage 1)'
  },
  'Stage 2 - acute chorioamnionitis': {
    micro: 'Mild neutrophilic infiltration is seen in the chorion and amnion, consistent with acute chorioamnionitis (maternal stage 2).',
    dx: 'ACUTE CHORIOAMNIONITIS (maternal stage 2)'
  },
  'Stage 3 - necrotising': {
    micro: 'Dense neutrophilic infiltration is seen in the chorion and amnion with amniocyte necrosis and karyorrhexis of neutrophils, consistent with necrotising chorioamnionitis (maternal stage 3).',
    dx: 'NECROTISING CHORIOAMNIONITIS (maternal stage 3)'
  }
};

const FETAL = {
  'Stage 1 - umbilical phlebitis or chorionic vasculitis': {
    micro: 'with mild neutrophilic infiltrates in the wall of the umbilical vein, consistent with funisitis (fetal stage 1)',
    dx: 'FUNISITIS (fetal stage 1)'
  },
  'Stage 2 - umbilical arteritis': {
    micro: 'with neutrophilic infiltrates in the walls of the umbilical vein and arteries, consistent with funisitis (fetal stage 2)',
    dx: 'FUNISITIS (fetal stage 2)'
  },
  'Stage 3 - necrotising funisitis': {
    micro: "with neutrophilic infiltrates in the umbilical vessel walls extending into Wharton's jelly with concentric bands of necrotic debris, consistent with necrotising funisitis (fetal stage 3)",
    dx: 'NECROTISING FUNISITIS (fetal stage 3)'
  }
};

const VILLITIS = {
  'Chronic villitis of unknown aetiology - low grade': {
    micro: 'There is a patchy lymphohistiocytic infiltrate within the villous stroma, consistent with chronic villitis of unknown aetiology, low grade.',
    dx: 'CHRONIC VILLITIS OF UNKNOWN AETIOLOGY, LOW GRADE'
  },
  'Chronic villitis of unknown aetiology - high grade': {
    micro: 'There is a multifocal to diffuse lymphohistiocytic infiltrate within the villous stroma, consistent with chronic villitis of unknown aetiology, high grade.',
    dx: 'CHRONIC VILLITIS OF UNKNOWN AETIOLOGY, HIGH GRADE'
  }
};

const ticked = (arr) => (Array.isArray(arr) ? arr : []).filter((x) => x && x !== 'None');
export const hasMVM = (v) => ticked(v.mvm).length > 0;
export const hasFVM = (v) => ticked(v.fvm).length > 0;
const pct = (v) => stripDot(v.infarctPercent).replace(/%$/, '').trim();

/** "third-trimester" for the villi sentence. */
const trimesterAdj = (v) => gestationPhrase(v).replace(/\s+/, '-');

export function microscopy(part) {
  const v = part.values;
  const s = [];

  // Villi
  const villitis = VILLITIS[v.villitis];
  let villi = `Sections of the placenta show ${trimesterAdj(v)} chorionic villi`;
  let maturation = '';
  if (v.villousMaturation === 'Accelerated') maturation = 'accelerated villous maturation';
  else if (v.villousMaturation === 'Delayed - distal villous immaturity') maturation = 'delayed villous maturation (distal villous immaturity)';
  if (maturation) villi += ` with ${maturation}`;
  if (!villitis) villi += maturation ? ' and no inflammation' : ' with no inflammation';
  s.push(`${villi}.`);

  // Umbilical cord
  const vesselsPhrase = v.cordVessels === 'Two' ? 'a single artery and one vein' : 'two arteries and one vein';
  const fetal = FETAL[v.fetalResponse];
  s.push(`The umbilical cord contains ${vesselsPhrase} ${fetal ? fetal.micro : 'with no features of funisitis'}.`);

  // Membranes
  const maternal = MATERNAL[v.chorioamnionitis];
  s.push(maternal ? maternal.micro : 'No chorioamnionitis is seen within the placental membranes.');

  // Villitis
  s.push(villitis ? villitis.micro : 'There is no evidence of villitis.');

  // Secondary findings
  if (v.infarcts === 'Present - recent' || v.infarcts === 'Present - remote') {
    const age = v.infarcts === 'Present - recent' ? 'Recent' : 'Remote';
    const p = pct(v);
    s.push(`${age} infarcts are present${p ? `, involving approximately ${p}% of the parenchyma` : ''}.`);
  }
  if (v.retroplacentalHaematoma === 'Present') s.push('A retroplacental haematoma is present.');
  if (v.intervillousThrombi === 'Present') s.push('Intervillous thrombi are present.');
  if (hasMVM(v)) s.push(`Features of maternal vascular malperfusion are present, including ${listJoin(ticked(v.mvm).map(lc1))}.`);
  if (hasFVM(v)) s.push(`Features of fetal vascular malperfusion are present, including ${listJoin(ticked(v.fvm).map(lc1))}.`);
  if (v.meconium === 'Present - membranes') s.push('Meconium-laden macrophages are present within the membranes.');
  else if (v.meconium === 'Present - membranes and cord') s.push('Meconium-laden macrophages are present within the membranes and umbilical cord.');

  const notes = sentence(v.additionalNotes);
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

export function diagnosis(part) {
  const v = part.values;
  const main = [];
  const maternal = MATERNAL[v.chorioamnionitis];
  const fetal = FETAL[v.fetalResponse];
  if (maternal && fetal) main.push(`${maternal.dx} WITH ${fetal.dx}`);
  else if (maternal) main.push(maternal.dx);
  else if (fetal) main.push(fetal.dx);
  if (VILLITIS[v.villitis]) main.push(VILLITIS[v.villitis].dx);

  const minor = [];
  if (v.infarcts === 'Present - recent' || v.infarcts === 'Present - remote') {
    const p = pct(v);
    minor.push(`infarcts${p ? ` (${p}%)` : ''}`);
  }
  if (v.retroplacentalHaematoma === 'Present') minor.push('retroplacental haematoma');
  if (v.intervillousThrombi === 'Present') minor.push('intervillous thrombi');
  if (hasMVM(v)) minor.push('features of maternal vascular malperfusion');
  if (hasFVM(v)) minor.push('features of fetal vascular malperfusion');
  if (v.villousMaturation === 'Delayed - distal villous immaturity') minor.push('delayed villous maturation');
  else if (v.villousMaturation === 'Accelerated' && !hasMVM(v)) minor.push('accelerated villous maturation');
  if (v.meconium === 'Present - membranes') minor.push('meconium staining of the membranes');
  else if (v.meconium === 'Present - membranes and cord') minor.push('meconium staining of the membranes and cord');
  if (v.cordVessels === 'Two') minor.push('two-vessel umbilical cord (single umbilical artery)');

  let result;
  if (main.length) result = [...main, ...minor].join('; ');
  else if (minor.length) result = [minor[0].toUpperCase(), ...minor.slice(1)].join('; ');
  else result = 'NO SIGNIFICANT PATHOLOGY';

  return `(${part.label}) PLACENTA, ${pluralityPhrase(v)}, ${gestationPhrase(v)} - ${result}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
