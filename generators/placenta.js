import { stripDot } from './_house.js';
// Placenta generator (3-card batch: singleton house wording, multiple pregnancy macro/dx,
// dividing membrane / T-zone histology, co-twin territory comparison & RCPath G108 checks).
// Pure functions: (part, ctx) -> string.
// Spec: docs/specs/placenta.md. Wording is protected by tests/placenta.test.js.

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

const ticked = (arr) => (Array.isArray(arr) ? arr : []).filter((x) => x && x !== 'None' && x !== 'Not assessed');
export const hasMVM = (v) => ticked(v.mvm).length > 0;
export const hasFVM = (v) => ticked(v.fvm).length > 0;
const pct = (v) => stripDot(v.infarctPercent).replace(/%$/, '').trim();

export const isTwin = (v) => /^Twin/i.test(String(v.plurality || ''));
export const isTriplet = (v) => /^Triplet/i.test(String(v.plurality || ''));
export const isMultiple = (v) => isTwin(v) || isTriplet(v);

/** Resolve effective membrane layers, honouring Phase 4b saved plurality strings. */
function effectiveLayers(v) {
  const p = String(v.plurality || '');
  if (!v.membraneLayers) {
    if (/monochorionic\s+monoamniotic/i.test(p)) return 'No dividing membrane (monoamniotic)';
    if (/monochorionic\s+diamniotic/i.test(p)) return 'Two amnions without chorion';
    if (/dichorionic\s+diamniotic/i.test(p)) return 'Two amnions with chorion between them';
  }
  return v.membraneLayers || 'Two amnions with chorion between them';
}

function hasTZone(v) {
  return !!v.tZoneBlock || v.membraneSampled === 'T-zone' || v.membraneSampled === 'Roll and T-zone';
}

/** Derive chorionicity verdict for twins/triplets from layers and T-zone (docs/specs/placenta.md). */
export function deriveChorionicity(v) {
  if (!isMultiple(v)) return { code: '', label: '', qualifier: '', mono: false };
  if (isTriplet(v)) {
    const pairs = [
      v.tripletMembrane12 || 'Monochorionic (no chorion)',
      v.tripletMembrane23 || 'Dichorionic (chorion present)',
      v.tripletMembrane13 || 'Dichorionic (chorion present)'
    ];
    const dc = pairs.filter((x) => /^Dichorionic/i.test(x)).length;
    if (dc === 3) return { code: 'Triplet - TCTA', label: 'trichorionic triamniotic triplet placenta', qualifier: 'consistent with', mono: false };
    if (dc === 2) return { code: 'Triplet - DCTA', label: 'dichorionic triamniotic triplet placenta', qualifier: 'consistent with', mono: true };
    if (dc === 0) return { code: 'Triplet - MCTA', label: 'monochorionic triamniotic triplet placenta', qualifier: 'consistent with', mono: true };
    return { code: 'Triplet - indeterminate', label: 'triamniotic triplet placenta, chorionicity indeterminate', qualifier: 'indeterminate', mono: false };
  }

  const layers = effectiveLayers(v);
  if (layers === 'No dividing membrane (monoamniotic)' || v.dividingMembraneGross === 'Absent (monoamniotic)') {
    return { code: 'MCMA', label: 'monochorionic monoamniotic twin placenta', qualifier: 'consistent with', mono: true };
  }
  const tz = hasTZone(v) ? (v.tZoneFinding || 'Follow layers') : '';
  const tzDc = tz === 'Chorionic layers fused with the chorionic plate';
  const tzMc = tz === 'Two amnions over an uninterrupted chorionic plate';

  if (layers === 'Two amnions with chorion between them' || layers === 'Two amnions and two chorions') {
    return { code: 'DCDA', label: 'dichorionic diamniotic twin placenta', qualifier: 'consistent with', mono: false };
  }
  if (layers === 'Two amnions without chorion') {
    return { code: 'MCDA', label: 'monochorionic diamniotic twin placenta', qualifier: 'consistent with', mono: true };
  }
  if (layers === 'Chorion with one amnion, the other detached') {
    if (tzDc) return { code: 'DCDA', label: 'dichorionic diamniotic twin placenta', qualifier: 'consistent with', mono: false };
    if (tzMc) return { code: 'MCDA', label: 'monochorionic diamniotic twin placenta', qualifier: 'consistent with', mono: true };
    return { code: 'DCDA', label: 'dichorionic diamniotic twin placenta', qualifier: 'compatible with', mono: false };
  }
  // Incomplete
  if (tzDc) return { code: 'DCDA', label: 'dichorionic diamniotic twin placenta', qualifier: 'consistent with', mono: false };
  if (tzMc) return { code: 'MCDA', label: 'monochorionic diamniotic twin placenta', qualifier: 'consistent with', mono: true };
  return { code: 'INDETERMINATE', label: 'diamniotic twin placenta, chorionicity indeterminate', qualifier: 'indeterminate', mono: false };
}

/** "dichorionic diamniotic" for a twin placenta, '' for a singleton. */
export function chorionicity(v) {
  if (!isMultiple(v)) return '';
  const d = deriveChorionicity(v);
  return d.label.replace(/\s+(?:twin|triplet)\s+placenta.*$/i, '').trim().toLowerCase();
}

/** "third trimester" — lower-case gestation phrase. */
export const gestationPhrase = (v) => lc1(String(v.gestation || 'Third trimester').trim());

/** "singleton" / "twin (dichorionic diamniotic)" / "triplet (...)" */
export function pluralityPhrase(v) {
  if (!isMultiple(v)) return 'singleton';
  const c = chorionicity(v);
  const noun = isTriplet(v) ? 'triplet' : 'twin';
  return c ? `${noun} (${c})` : noun;
}

export function specimenName(part) {
  const v = part.values;
  const given = String(v.specimenName || '').trim();
  if (given) return given;
  if (isTriplet(v)) return 'Triplet placenta';
  if (isTwin(v)) return 'Twin placenta';
  return 'Placenta';
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

function membranesSentence(v) {
  switch (v.membranesAppearance || 'Smooth and no loss of lustre') {
    case 'Smooth': return 'The placental membranes are smooth.';
    case 'Dull': return 'The placental membranes are dull.';
    case 'Meconium-stained': return 'The placental membranes are meconium-stained.';
    default: return 'The placental membranes are smooth and show no loss of lustre.';
  }
}

function cutSurfaceSentence(v) {
  const sz = sizePhrase(v.cutSurfaceSize);
  const twinSuffix = isMultiple(v) && v.findingTwin && v.findingTwin !== 'Both'
    ? ` in the placental disc of ${lc1(v.findingTwin)}`
    : '';
  switch (v.cutSurface || 'Unremarkable') {
    case 'Focal infarct':
      return `Focally, an infarcted area is seen${twinSuffix || ' within the placenta'}${sz ? `, measuring ${sz} across` : ''}.`;
    case 'Peripheral infarcts':
      return `Sectioning of the placenta shows several peripheral infarcts${twinSuffix}${sz ? `, the largest of which measures ${sz} across` : ''}.`;
    case 'Infarct(s)': {
      const p = stripDot(v.cutSurfaceInfarctPercent).replace(/%$/, '').trim();
      return `Focally, an infarcted area is seen${twinSuffix || ' within the placenta'}${p ? `, involving approximately ${p}% of the disc` : ''}.`;
    }
    case 'Retroplacental haematoma':
      return `Focal retroplacental haematoma is seen${twinSuffix}${sz ? `, measuring ${sz} in area` : ''}.`;
    case 'Intervillous thrombi':
      return `Sectioning of the placenta shows intervillous thrombi${twinSuffix}.`;
    case 'Other - describe': {
      const d = stripDot(v.cutSurfaceOther);
      return d ? `The cut surfaces show ${lc1(d)}.` : 'No significant retroplacental haematoma or infarct is seen.';
    }
    default:
      return 'No significant retroplacental haematoma or infarct is seen.';
  }
}

function defaultBlocks(v) {
  if (isTriplet(v)) return hasTZone(v) ? 16 : 15;
  if (isTwin(v)) return hasTZone(v) ? 10 : 9;
  return v.blockKeyStyle === '3-block combined' ? 3 : 4;
}

function blockCount(v) {
  const n = num(v.blocks);
  if (n !== null && n >= 1) return Math.round(n);
  return defaultBlocks(v);
}

function twinMacro(part, ctx) {
  const v = part.values;
  const s = [];
  if (v.formalin) s.push('(Specimen received in formalin)');
  const label = stripDot(v.containerLabel);
  if (label) s.push(`'${label}'.`);
  const w = num(v.weight);
  if (w !== null) s.push(`Specimen weighs ${fmt(w)} g.`);
  const tw = num(v.trimmedWeight);
  if (tw !== null) s.push(`The trimmed weight of the placenta is ${fmt(tw)} g.`);

  const separate = v.discConfiguration === 'Separate';
  if (isTriplet(v)) {
    s.push(`It consists of a triplet placenta with ${separate ? 'three discrete cotyledons' : 'a single fused cotyledon'}.`);
    s.push(`The umbilical cord with ${v.twin1Clips || 'one clip'} is designated as triplet I, the umbilical cord with ${v.twin2Clips || 'two clips'} is designated as triplet II, and the umbilical cord with ${v.twin3Clips || 'three clips'} is designated as triplet III.`);
  } else {
    s.push(`It consists of a twin placenta with ${separate ? 'two discrete cotyledons' : 'a single cotyledon'}.`);
    s.push(`The umbilical cord with ${v.twin1Clips || 'one clip'} is designated as twin I, and the umbilical cord with ${v.twin2Clips || 'two clips'} is designated as twin II.`);
  }

  // Cords
  const c1 = [num(v.twin1CordLength) !== null ? `${fmt(num(v.twin1CordLength))} cm long` : '', num(v.twin1CordDiameter) !== null ? `${fmt(num(v.twin1CordDiameter))} cm in diameter` : ''].filter(Boolean).join(' and ');
  const c2 = [num(v.twin2CordLength) !== null ? `${fmt(num(v.twin2CordLength))} cm long` : '', num(v.twin2CordDiameter) !== null ? `${fmt(num(v.twin2CordDiameter))} cm in diameter` : ''].filter(Boolean).join(' and ');
  const v1 = v.twin1CordVessels || 'Three';
  const v2 = v.twin2CordVessels || 'Three';
  const v3 = v.twin3CordVessels || 'Three';
  const noun1 = isTriplet(v) ? 'triplet I' : 'twin I';
  const noun2 = isTriplet(v) ? 'triplet II' : 'twin II';

  if (c1 && c2) {
    const vesselTail = !isTriplet(v) && v1 === v2 ? `; their cut surfaces show ${lc1(v1)} vessels` : '';
    s.push(`The umbilical cord of ${noun1} measures ${c1}, while that of ${noun2} measures ${c2}${vesselTail}.`);
  } else if (c1) {
    s.push(`The umbilical cord of ${noun1} measures ${c1}; its cut surface shows ${lc1(v1)} vessels.`);
  } else if (c2) {
    s.push(`The umbilical cord of ${noun2} measures ${c2}; its cut surface shows ${lc1(v2)} vessels.`);
  } else if (!isTriplet(v) && v1 === v2) {
    s.push(`The cut surfaces of both umbilical cords show ${lc1(v1)} vessels.`);
  }

  if (isTriplet(v)) {
    const c3 = [num(v.twin3CordLength) !== null ? `${fmt(num(v.twin3CordLength))} cm long` : '', num(v.twin3CordDiameter) !== null ? `${fmt(num(v.twin3CordDiameter))} cm in diameter` : ''].filter(Boolean).join(' and ');
    if (c3) s.push(`The umbilical cord of triplet III measures ${c3}; its cut surface shows ${lc1(v3)} vessels.`);
  }

  if (!isTriplet(v) && v1 !== v2) {
    s.push(`The umbilical cord of twin I shows ${lc1(v1)} vessels, while that of twin II shows ${lc1(v2)} vessels.`);
  }

  if (v.twin1CordInsertion === 'Velamentous') s.push(`The umbilical cord of ${noun1} is inserted into the extraplacental membranes, in keeping with velamentous insertion.`);
  if (v.twin2CordInsertion === 'Velamentous') s.push(`The umbilical cord of ${noun2} is inserted into the extraplacental membranes, in keeping with velamentous insertion.`);
  if (isTriplet(v) && v.twin3CordInsertion === 'Velamentous') s.push('The umbilical cord of triplet III is inserted into the extraplacental membranes, in keeping with velamentous insertion.');

  // Dividing membrane gross
  const dmg = v.dividingMembraneGross || 'Equidistant';
  if (dmg !== 'Absent (monoamniotic)') {
    s.push('A dividing membrane is noted approximately equidistantly between the umbilical cords.');
    if (dmg === 'Thin') s.push('The dividing membrane is thin.');
    else if (dmg === 'Thin, translucent and mobile') s.push('The dividing membrane is thin and translucent, and moves over the placental surface.');
    else if (dmg === 'Thick, opaque and tethered by a chorionic ridge') s.push('The dividing membrane is thick and opaque, and is tethered to the placental surface by a chorionic ridge.');
  } else {
    s.push('No dividing membrane is present between the umbilical cords.');
  }

  // Disc(s)
  if (separate) {
    const d1 = sizePhrase(v.twin1DiscSize);
    const d2 = sizePhrase(v.twin2DiscSize);
    if (d1 && d2) s.push(`The placental disc of ${noun1} measures ${d1}, while that of ${noun2} measures ${d2}.`);
    else if (d1) s.push(`The placental disc of ${noun1} measures ${d1}.`);
    else if (d2) s.push(`The placental disc of ${noun2} measures ${d2}.`);
    if (isTriplet(v) && sizePhrase(v.twin3DiscSize)) s.push(`The placental disc of triplet III measures ${sizePhrase(v.twin3DiscSize)}.`);
  } else {
    const sz = sizePhrase(v.discSize);
    if (sz) s.push(`The placental disc measures ${sz}.`);
  }

  // Monochorionic fetal surface
  const dist = num(v.cordDistanceCm);
  if (dist !== null) s.push(`The umbilical cord insertions are ${fmt(dist)} cm apart.`);
  const eq = String(v.vascularEquator || '').trim();
  if (eq) {
    const m = /^(\d+)\s*[/,-]\s*(\d+)$/.exec(eq);
    if (m) s.push(`The vascular equator divides the disc into about ${m[1]}% for twin I and ${m[2]}% for twin II.`);
    else s.push(`The vascular equator divides the disc (${eq}).`);
  }
  const anast = Array.isArray(v.anastomoses) ? v.anastomoses : [];
  if (anast.includes('None seen')) {
    s.push('No vascular anastomosis is seen on the fetal surface.');
  } else {
    const found = anast.filter((x) => x !== 'Not assessed' && x !== 'None seen').map((x) => lc1(x.replace(/\s*\([A-Z]+\)$/, '')));
    if (found.length) s.push(`${uc1(listJoin(found))} anastomoses are seen on the fetal surface.`);
  }
  if (v.laserSites) s.push('Laser coagulation sites are seen along the vascular equator.');

  s.push(membranesSentence(v));
  if (v.discFragmented) s.push('The placental disc has been fragmented prior to submission, and completeness cannot be assessed.');
  s.push(cutSurfaceSentence(v));

  const n = blockCount(v);
  s.push(`${n} representative ${n === 1 ? 'block' : 'blocks'}.`);
  const prefix = (ctx?.case?.parts?.length || 1) > 1 ? `(${part.label}) ` : '';
  return `${prefix}${s.join(' ')}`;
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  if (isMultiple(v)) return twinMacro(part, ctx);

  const s = [];
  if (v.formalin) s.push('(Specimen received in formalin)');
  const label = stripDot(v.containerLabel);
  if (label) s.push(`'${label}'.`);
  const w = num(v.weight);
  if (w !== null) s.push(`Specimen weighs ${fmt(w)} g.`);
  const tw = num(v.trimmedWeight);
  if (tw !== null) s.push(`The trimmed weight of the placenta is ${fmt(tw)} g.`);

  const insertion = INSERTION[v.cordInsertion] || INSERTION.Eccentric;
  s.push(`It consists of a singleton placenta with ${insertion}.`);

  const len = num(v.cordLength);
  const dia = num(v.cordDiameter);
  const dims = [];
  if (len !== null) dims.push(`${fmt(len)} cm long`);
  if (dia !== null) dims.push(`${fmt(dia)} cm in diameter`);
  const vessels = v.cordVessels === 'Two' ? 'two vessels' : 'three vessels';
  const velam = v.cordInsertion === 'Velamentous' ? '; it is inserted into the extraplacental membranes, in keeping with velamentous insertion' : '';
  if (dims.length) s.push(`The umbilical cord measures ${dims.join(' and ')}; its cut surface shows ${vessels}${velam}.`);
  else s.push(`The cut surface of the umbilical cord shows ${vessels}${velam}.`);

  const fk = num(v.falseKnotCm);
  if (fk !== null) s.push(`A false knot is seen ${fmt(fk)} cm from the umbilical cord insertion site.`);
  const cordNote = stripDot(v.cordFeatures);
  if (cordNote) s.push(`The umbilical cord is ${lc1(cordNote)}.`);

  const sz = sizePhrase(v.discSize);
  if (sz) s.push(`The placental disc measures ${sz}.`);
  s.push(membranesSentence(v));
  if (v.discFragmented) s.push('The placental disc has been fragmented prior to submission, and completeness cannot be assessed.');
  s.push(cutSurfaceSentence(v));

  const n = blockCount(v);
  s.push(`${n} representative ${n === 1 ? 'block' : 'blocks'}.`);
  const prefix = (ctx?.case?.parts?.length || 1) > 1 ? `(${part.label}) ` : '';
  return `${prefix}${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const prefix = (ctx?.case?.parts?.length || 1) > 1 ? `(${part.label}) ` : '';
  const extra = stripDot(v.lesionBlock);

  if (isTriplet(v)) {
    let key = '(1) Umbilical cord, triplet I. (2) Placental membranes, triplet I. (3)-(4) Placental disc, triplet I. (5) Umbilical cord, triplet II. (6) Placental membranes, triplet II. (7)-(8) Placental disc, triplet II. (9) Umbilical cord, triplet III. (10) Placental membranes, triplet III. (11)-(12) Placental disc, triplet III. (13) Dividing membrane I/II. (14) Dividing membrane II/III. (15) Dividing membrane I/III.';
    if (hasTZone(v)) key += ' (16) T-zone.';
    return `${prefix}${key}`;
  }
  if (isTwin(v)) {
    let key = '(1) Umbilical cord, twin I. (2) Placental membranes, twin I. (3)-(4) Placental disc, twin I. (5) Umbilical cord, twin II. (6) Placental membranes, twin II. (7)-(8) Placental disc, twin II.';
    const layers = effectiveLayers(v);
    if (layers !== 'No dividing membrane (monoamniotic)' && v.dividingMembraneGross !== 'Absent (monoamniotic)' && v.membraneSampled !== 'Not sampled') {
      key += ' (9) Dividing membrane.';
      if (hasTZone(v)) key += ' (10) T-zone.';
      if (extra) key += ` (${hasTZone(v) ? 11 : 10}) ${uc1(extra)}.`;
    } else if (extra) {
      key += ` (9) ${uc1(extra)}.`;
    }
    return `${prefix}${key}`;
  }

  const n = blockCount(v);
  let key;
  if (v.blockKeyStyle === '3-block combined') {
    if (n <= 3) key = '(1) Umbilical cord and membrane roll. (2)&(3) Placental disc.';
    else if (extra) key = `(1) Umbilical cord and membrane roll. (2)&(3) Placental disc. (${n}) ${uc1(extra)}.`;
    else key = `(1) Umbilical cord and membrane roll. (2)-(${n}) Placental disc.`;
  } else if (n === 1) {
    key = '(1) Umbilical cord, placental membranes and placental disc.';
  } else if (n === 2) {
    key = '(1) Umbilical cord and placental membranes. (2) Placental disc.';
  } else if (n === 3) {
    key = '(1) Umbilical cord. (2) Placental membranes. (3) Placental disc.';
  } else if (n === 4) {
    key = '(1) Umbilical cord. (2) Placental membranes. (3)&(4) Placental disc.';
  } else if (extra && n === 5) {
    key = `(1) Umbilical cord. (2) Placental membranes. (3)&(4) Placental disc. (5) ${uc1(extra)}.`;
  } else if (extra) {
    key = `(1) Umbilical cord. (2) Placental membranes. (3)-(${n - 1}) Placental disc. (${n}) ${uc1(extra)}.`;
  } else {
    key = `(1) Umbilical cord. (2) Placental membranes. (3)-(${n}) Placental disc.`;
  }
  return `${prefix}${key}`;
}

// ---------- microscopy ----------

const MATERNAL = {
  'Stage 1 - acute subchorionitis': {
    check: 'Present, acute subchorionitis (maternal stage 1)',
    micro: 'Neutrophils are present in the subchorionic fibrin and chorionic trophoblast layer of the placental membranes, consistent with acute subchorionitis (maternal stage 1).',
    dx: 'Acute SUBCHORIONITIS (maternal stage 1)'
  },
  'Stage 2 - acute chorioamnionitis': {
    check: 'Present, acute chorioamnionitis (maternal stage 2)',
    micro: 'Neutrophilic infiltration is seen in the chorion and amnion, consistent with acute chorioamnionitis (maternal stage 2).',
    dx: 'Acute CHORIOAMNIONITIS (maternal stage 2)'
  },
  'Stage 3 - necrotising': {
    check: 'Present, necrotising chorioamnionitis (maternal stage 3)',
    micro: 'Dense neutrophilic infiltration is seen in the chorion and amnion with amniocyte necrosis and karyorrhexis of neutrophils, consistent with necrotising chorioamnionitis (maternal stage 3).',
    dx: 'Necrotising CHORIOAMNIONITIS (maternal stage 3)'
  }
};

const FETAL = {
  'Stage 1 - umbilical phlebitis or chorionic vasculitis': {
    check: 'Present, mild (fetal stage 1)',
    micro: 'Neutrophilic infiltrates are noted within the wall of the umbilical vein or chorionic plate vessels, in keeping with early acute funisitis (fetal stage 1).',
    dx: 'Early acute FUNISITIS (fetal stage 1)'
  },
  'Stage 2 - umbilical arteritis': {
    check: 'Present, moderate (fetal stage 2)',
    micro: 'Neutrophilic infiltrates are noted within the walls of the umbilical vein and arteries, consistent with acute funisitis (fetal stage 2).',
    dx: 'Acute FUNISITIS (fetal stage 2)'
  },
  'Stage 3 - necrotising funisitis': {
    check: 'Present, necrotising (fetal stage 3)',
    micro: "Neutrophilic infiltrates are seen in the umbilical vessel walls extending into Wharton's jelly with concentric bands of necrotic debris, consistent with necrotising funisitis (fetal stage 3).",
    dx: 'Necrotising FUNISITIS (fetal stage 3)'
  }
};

const VILLITIS = {
  'Chronic villitis of unknown aetiology - low grade': {
    check: 'Present, chronic villitis of unknown aetiology (low grade)',
    micro: 'There is a patchy lymphohistiocytic infiltrate within the villous stroma, consistent with chronic villitis of unknown aetiology, low grade.',
    dx: 'Chronic VILLITIS OF UNKNOWN AETIOLOGY, low grade'
  },
  'Chronic villitis of unknown aetiology - high grade': {
    check: 'Present, chronic villitis of unknown aetiology (high grade)',
    micro: 'There is a multifocal to diffuse lymphohistiocytic infiltrate within the villous stroma, consistent with chronic villitis of unknown aetiology, high grade.',
    dx: 'Chronic VILLITIS OF UNKNOWN AETIOLOGY, high grade'
  }
};

function secondaryFindingsSentences(v) {
  const s = [];
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
  return s;
}

function singletonChecklist(v, vesselsOverride, positiveOnlyForThisTwin = true) {
  const maternal = positiveOnlyForThisTwin ? MATERNAL[v.chorioamnionitis] : null;
  const fetal = positiveOnlyForThisTwin ? FETAL[v.fetalResponse] : null;
  const villitis = positiveOnlyForThisTwin ? VILLITIS[v.villitis] : null;

  const gest = uc1(gestationPhrase(v));
  const notes = [];
  if (v.villousMaturation === 'Accelerated') notes.push(`${gest} chorionic villi with accelerated villous maturation are seen.`);
  else if (v.villousMaturation === 'Delayed - distal villous immaturity') notes.push(`${gest} chorionic villi with delayed villous maturation (distal villous immaturity) are seen.`);
  else notes.push(`${gest} chorionic villi are seen.`);

  const vessels = (vesselsOverride || v.cordVessels) === 'Two' ? 'a single artery and one vein' : 'two arteries and one vein';
  notes.push(`The umbilical cord contains ${vessels}.`);
  if (positiveOnlyForThisTwin) notes.push(...secondaryFindingsSentences(v));
  const extra = sentence(v.additionalNotes);
  if (extra && positiveOnlyForThisTwin) notes.push(extra);

  return [
    `- Villitis:  ${villitis ? villitis.check : 'Absent'}`,
    `- Chorioamnionitis:  ${maternal ? maternal.check : 'Absent'}`,
    `- Funisitis:  ${fetal ? fetal.check : 'Absent'}`,
    `- Additional notes:  ${notes.join(' ')}`
  ].join('\n');
}

function singletonSentences(v, vesselsOverride, positiveOnlyForThisTwin = true) {
  const s = [];
  const maternal = positiveOnlyForThisTwin ? MATERNAL[v.chorioamnionitis] : null;
  const fetal = positiveOnlyForThisTwin ? FETAL[v.fetalResponse] : null;
  const villitis = positiveOnlyForThisTwin ? VILLITIS[v.villitis] : null;
  const vessels = (vesselsOverride || v.cordVessels) === 'Two' ? 'two patent vessels (a single artery and one vein)' : 'three patent vessels';

  if (fetal) s.push(`The umbilical cord contains ${vessels}. ${fetal.micro}`);
  else s.push(`The umbilical cord contains ${vessels} with no evidence of vasculitis or funisitis.`);

  s.push(maternal ? maternal.micro : 'The extraplacental membranes show no significant inflammation.');

  const gest = gestationPhrase(v);
  if (v.villousMaturation === 'Accelerated') s.push(`The chorionic villi show accelerated villous maturation for ${gest} gestation.`);
  else if (v.villousMaturation === 'Delayed - distal villous immaturity') s.push(`The chorionic villi show delayed villous maturation (distal villous immaturity) for ${gest} gestation.`);
  else s.push(`The chorionic villi show appropriate development for ${gest} gestation.`);

  s.push(villitis ? villitis.micro : 'There is no acute or chronic villitis or intervillositis.');
  s.push('No viral inclusions are seen.');

  const mvm = positiveOnlyForThisTwin && hasMVM(v);
  const fvm = positiveOnlyForThisTwin && hasFVM(v);
  if (!mvm && !fvm) {
    s.push('There are no features of fetal or maternal vascular malperfusion.');
  } else {
    if (mvm) s.push(`Features of maternal vascular malperfusion are present, including ${listJoin(ticked(v.mvm).map(lc1))}.`);
    if (fvm) s.push(`Features of fetal vascular malperfusion are present, including ${listJoin(ticked(v.fvm).map(lc1))}.`);
  }
  s.push('Maternal vessels show appropriate transformation for the gestational age.');

  if (positiveOnlyForThisTwin && v.retroplacentalHaematoma === 'Present') {
    s.push('There is no chronic deciduitis. A retroplacental haematoma is present.');
  } else {
    s.push('There is no chronic deciduitis or retroplacental haemorrhage.');
  }

  if (positiveOnlyForThisTwin) {
    if (v.infarcts === 'Present - recent' || v.infarcts === 'Present - remote') {
      const age = v.infarcts === 'Present - recent' ? 'Recent' : 'Remote';
      const p = pct(v);
      s.push(`${age} infarcts are present${p ? `, involving approximately ${p}% of the parenchyma` : ''}.`);
    }
    if (v.intervillousThrombi === 'Present') s.push('Intervillous thrombi are present.');
    if (v.meconium === 'Present - membranes') s.push('Meconium-laden macrophages are present within the membranes.');
    else if (v.meconium === 'Present - membranes and cord') s.push('Meconium-laden macrophages are present within the membranes and umbilical cord.');
    const extra = sentence(v.additionalNotes);
    if (extra) s.push(extra);
  }
  return s.join(' ');
}

function dividingMembraneParagraph(v) {
  const derived = deriveChorionicity(v);
  if (isTriplet(v)) {
    const m12 = v.tripletMembrane12 || 'Monochorionic (no chorion)';
    const m23 = v.tripletMembrane23 || 'Dichorionic (chorion present)';
    const m13 = v.tripletMembrane13 || 'Dichorionic (chorion present)';
    const contents = ticked(v.chorionContents).map(lc1);
    const containing = contents.length ? ` containing ${listJoin(contents)}` : '';
    const desc = (m) => (/^Monochorionic/i.test(m)
      ? 'two layers of amnion without an intervening chorion'
      : `two layers of amnion with an intervening layer of chorion${containing}`);
    const s1 = `The dividing membrane between triplets I and II consists of ${desc(m12)}, that between triplets II and III consists of ${desc(m23)}, and that between triplets I and III consists of ${desc(m13)}.`;
    const s2 = derived.qualifier === 'indeterminate'
      ? 'Chorionicity cannot be determined on the sampled dividing membranes.'
      : `The overall findings are ${derived.qualifier} a ${derived.label}.`;
    return `${s1} ${s2}`;
  }

  const layers = effectiveLayers(v);
  if (layers === 'No dividing membrane (monoamniotic)' || v.dividingMembraneGross === 'Absent (monoamniotic)') return '';
  if (v.membraneSampled === 'Not sampled') return '';

  const contents = ticked(v.chorionContents).map(lc1);
  const hasTz = hasTZone(v);
  const tz = v.tZoneFinding || 'Follow layers';
  const s = [];

  // Compact one-sentence house form when nothing extra is ticked and no T-zone block
  if (!hasTz && contents.length === 0 && v.membraneInflammation === 'None') {
    if (layers === 'Two amnions with chorion between them') {
      return 'The dividing membrane consists of two layers of amnion with an intervening layer of chorion, consistent with a dichorionic diamniotic twin placenta.';
    }
    if (layers === 'Two amnions without chorion' && !v.noTrophoblastBetween) {
      return 'The dividing membrane consists of two layers of amnion without an intervening chorion, consistent with a monochorionic diamniotic twin placenta.';
    }
  }

  if (layers === 'Two amnions with chorion between them') {
    s.push(`The dividing membrane consists of two layers of amnion with an intervening layer of chorion${contents.length ? ` containing ${listJoin(contents)}` : ''}.`);
  } else if (layers === 'Two amnions and two chorions') {
    s.push(`The dividing membrane consists of two layers of amnion and two layers of chorion${contents.length ? ` containing ${listJoin(contents)}` : ''}.`);
  } else if (layers === 'Two amnions without chorion') {
    s.push(`The dividing membrane consists of two layers of amnion without an intervening chorion${v.noTrophoblastBetween !== false ? ', with no trophoblast or atrophic villi between them' : ''}.`);
  } else if (layers === 'Chorion with one amnion, the other detached') {
    s.push('The sampled dividing membrane consists of a fused chorionic layer with one layer of amnion, while the other amnion is detached.');
  } else {
    s.push('The sampled dividing membrane is incomplete, and its layers cannot be assessed.');
  }

  if (hasTz) {
    if (tz === 'Junction not in the section') {
      s.push('The junction of the dividing membrane is not represented in the T-zone section.');
    } else if (tz === 'Chorionic layers fused with the chorionic plate' || (tz === 'Follow layers' && !derived.mono && derived.code === 'DCDA')) {
      s.push('At the T-zone, the chorionic layers of the dividing membrane fuse with the chorionic plate, with atrophic villi and fibrinoid at the junction.');
    } else if (tz === 'Two amnions over an uninterrupted chorionic plate' || (tz === 'Follow layers' && derived.code === 'MCDA')) {
      s.push('At the T-zone, the two amnions separate over an uninterrupted chorionic plate, with no intervening chorion.');
    }
  }

  if (v.membraneInflammation === 'Twin I aspect') s.push('Acute inflammation involves the twin I aspect of the dividing membrane.');
  else if (v.membraneInflammation === 'Twin II aspect') s.push('Acute inflammation involves the twin II aspect of the dividing membrane.');
  else if (v.membraneInflammation === 'Both aspects') s.push('Acute inflammation involves both aspects of the dividing membrane.');

  if (derived.qualifier === 'indeterminate') {
    s.push('Chorionicity cannot be determined on the sampled dividing membrane.');
  } else {
    s.push(`The overall findings are ${derived.qualifier} a ${derived.label}.`);
  }
  return s.join(' ');
}

function territorySentence(v) {
  const derived = deriveChorionicity(v);
  if (!derived.mono) return '';
  if (v.territoryComparison === 'Discordant — twin I less mature') {
    return 'The villi of the twin I territory are immature and hydropic, while those of twin II are mature and well vascularised.';
  }
  if (v.territoryComparison === 'Discordant — twin II less mature') {
    return 'The villi of the twin II territory are immature and hydropic, while those of twin I are mature and well vascularised.';
  }
  return 'The villi of the two twin territories are of similar maturity and vascularity.';
}

export function microscopy(part, ctx) {
  const v = part.values;
  const prefix = (ctx?.case?.parts?.length || 1) > 1 ? `(${part.label}) ` : '';
  const style = v.microStyle === 'Auto' || !v.microStyle
    ? (isMultiple(v) ? 'Sentences' : 'Checklist')
    : v.microStyle;

  if (!isMultiple(v)) {
    const body = style === 'Checklist' ? singletonChecklist(v) : singletonSentences(v);
    return prefix ? `${prefix}${body}` : body;
  }

  // Multiple pregnancy — By twin layout
  if (v.microLayout === 'By twin') {
    const ft = v.findingTwin || 'Both';
    const blocks = [];
    const t1Pos = ft === 'Both' || ft === 'Twin I';
    const t2Pos = ft === 'Both' || ft === 'Twin II';
    const t1Body = style === 'Checklist' ? singletonChecklist(v, v.twin1CordVessels, t1Pos) : singletonSentences(v, v.twin1CordVessels, t1Pos);
    const t2Body = style === 'Checklist' ? singletonChecklist(v, v.twin2CordVessels, t2Pos) : singletonSentences(v, v.twin2CordVessels, t2Pos);
    blocks.push(`Twin I:\n${t1Body}`);
    blocks.push(`Twin II:\n${t2Body}`);
    if (isTriplet(v)) {
      const t3Pos = ft === 'Both' || ft === 'Twin III';
      const t3Body = style === 'Checklist' ? singletonChecklist(v, v.twin3CordVessels, t3Pos) : singletonSentences(v, v.twin3CordVessels, t3Pos);
      blocks.push(`Triplet III:\n${t3Body}`);
    }
    const terr = territorySentence(v);
    if (terr) blocks.push(terr);
    const dm = dividingMembraneParagraph(v);
    if (dm) blocks.push(`Dividing membrane:  ${dm}`);
    return `${prefix}${blocks.join('\n\n')}`;
  }

  // Multiple pregnancy — Combined layout
  if (style === 'Checklist') {
    const body = singletonChecklist(v, v.twin1CordVessels, true);
    const dm = dividingMembraneParagraph(v);
    const terr = territorySentence(v);
    return `${prefix}${[body, terr, dm ? `Dividing membrane:  ${dm}` : ''].filter(Boolean).join('\n\n')}`;
  }

  const s = [];
  const maternal = MATERNAL[v.chorioamnionitis];
  const fetal = FETAL[v.fetalResponse];
  const villitis = VILLITIS[v.villitis];
  const ft = v.findingTwin && v.findingTwin !== 'Both' ? ` of ${lc1(v.findingTwin)}` : '';
  const allThree = v.twin1CordVessels !== 'Two' && v.twin2CordVessels !== 'Two' && (!isTriplet(v) || v.twin3CordVessels !== 'Two');

  if (fetal) {
    s.push(`Sections of the umbilical cords show ${allThree ? 'two arteries and one vein' : 'cord vessel configuration as described macroscopically'}. ${fetal.micro.replace(/vessels,/, `vessels${ft},`)}`);
  } else {
    s.push(`Sections of both umbilical cords show ${allThree ? 'two arteries and one vein' : 'cord vessels as described macroscopically'} with no funisitis.`);
  }

  if (maternal) s.push(maternal.micro);
  else s.push(`The placental membranes of ${isTriplet(v) ? 'all triplets' : 'both twins'} show no chorioamnionitis.`);

  const gest = gestationPhrase(v);
  if (villitis) s.push(`The chorionic villi of ${isTriplet(v) ? 'all triplets' : 'both twins'} are of the ${gest}. ${villitis.micro}`);
  else s.push(`The chorionic villi of ${isTriplet(v) ? 'all triplets' : 'both twins'} are of the ${gest}, and there is no evidence of villitis.`);

  const terr = territorySentence(v);
  if (terr) s.push(terr);

  s.push(...secondaryFindingsSentences(v));
  const dm = dividingMembraneParagraph(v);
  if (dm) s.push(dm);
  const extra = sentence(v.additionalNotes);
  if (extra) s.push(extra);

  return `${prefix}${s.join(' ')}`;
}

// ---------- diagnosis ----------

function dxHead(part, ctx) {
  const v = part.values;
  const raw = String(v.specimenName || '').trim();
  const prefix = (ctx?.case?.parts?.length || 1) > 1 ? `(${part.label}) ` : '';
  if (raw) {
    const m = /^placenta\s*,\s*(.+)$/i.exec(raw);
    if (m) return `${prefix}PLACENTA, ${stripDot(m[1])}:`;
  }
  return `${prefix}PLACENTA:`;
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const lines = [];
  const twinTag = isMultiple(v) && v.findingTwin && v.findingTwin !== 'Both' ? `, ${lc1(v.findingTwin)}` : '';

  if (isMultiple(v)) {
    const d = deriveChorionicity(v);
    const req = v.requestChorionicity || 'Not stated';
    const confirmed = req !== 'Not stated' && req === d.code ? ', confirmed' : '';
    if (d.qualifier === 'compatible with') {
      lines.push(`Compatible with ${d.label.toUpperCase()}`);
    } else if (d.qualifier === 'indeterminate') {
      lines.push(d.label.replace(/^([^,]+)/, (m) => m.toUpperCase()));
    } else {
      lines.push(`${d.label.toUpperCase()}${confirmed}`);
    }
    if (d.mono && v.territoryComparison === 'Discordant — twin I less mature') {
      lines.push('DISCORDANT VILLOUS MATURATION, twin I territory less mature');
    } else if (d.mono && v.territoryComparison === 'Discordant — twin II less mature') {
      lines.push('DISCORDANT VILLOUS MATURATION, twin II territory less mature');
    }
  }

  const maternal = MATERNAL[v.chorioamnionitis];
  const fetal = FETAL[v.fetalResponse];
  const villitis = VILLITIS[v.villitis];
  if (maternal) lines.push(`${maternal.dx}${twinTag}`);
  if (fetal) lines.push(`${fetal.dx}${twinTag}`);
  if (villitis) lines.push(`${villitis.dx}${twinTag}`);

  if (v.infarcts === 'Present - recent' || v.infarcts === 'Present - remote') {
    const p = pct(v);
    lines.push(`Focal INFARCT${p ? ` (${p}%)` : ''}${twinTag}`);
  } else if (v.cutSurface === 'Focal infarct' || v.cutSurface === 'Peripheral infarcts') {
    lines.push(`Focal INFARCT${twinTag}`);
  }
  if (v.retroplacentalHaematoma === 'Present' || v.cutSurface === 'Retroplacental haematoma') {
    lines.push(`Retroplacental HAEMATOMA${twinTag}`);
  }
  if (v.intervillousThrombi === 'Present') lines.push(`Intervillous THROMBI${twinTag}`);
  if (hasMVM(v)) lines.push(`Features of MATERNAL VASCULAR MALPERFUSION${twinTag}`);
  if (hasFVM(v)) lines.push(`Features of FETAL VASCULAR MALPERFUSION${twinTag}`);
  if (v.villousMaturation === 'Delayed - distal villous immaturity') lines.push(`DELAYED VILLOUS MATURATION${twinTag}`);
  else if (v.villousMaturation === 'Accelerated' && !hasMVM(v)) lines.push(`ACCELERATED VILLOUS MATURATION${twinTag}`);
  if (v.meconium === 'Present - membranes') lines.push(`MECONIUM STAINING of the membranes${twinTag}`);
  else if (v.meconium === 'Present - membranes and cord') lines.push(`MECONIUM STAINING of the membranes and cord${twinTag}`);

  if (!isMultiple(v)) {
    if (v.cordInsertion === 'Velamentous') lines.push('VELAMENTOUS INSERTION of the umbilical cord');
    if (v.cordVessels === 'Two') lines.push('TWO-VESSEL UMBILICAL CORD (single umbilical artery)');
  } else {
    if (v.twin1CordInsertion === 'Velamentous') lines.push('VELAMENTOUS INSERTION of the umbilical cord, twin I');
    if (v.twin2CordInsertion === 'Velamentous') lines.push('VELAMENTOUS INSERTION of the umbilical cord, twin II');
    if (isTriplet(v) && v.twin3CordInsertion === 'Velamentous') lines.push('VELAMENTOUS INSERTION of the umbilical cord, triplet III');
    if (v.twin1CordVessels === 'Two') lines.push('Umbilical cord of twin I with one artery and one vein');
    if (v.twin2CordVessels === 'Two') lines.push('Umbilical cord of twin II with one artery and one vein');
    if (isTriplet(v) && v.twin3CordVessels === 'Two') lines.push('Umbilical cord of triplet III with one artery and one vein');
  }

  if (!lines.length) lines.push('NO SIGNIFICANT PATHOLOGY');
  const formatted = lines.map((l, i) => `- ${l}${i < lines.length - 1 ? ';' : '.'}`).join('\n');
  return `${dxHead(part, ctx)}\n${formatted}`;
}

// ---------- checks (RCPath G108 / APMIS 2018 / Best Practice No 178) ----------

export function validate(part, ctx) {
  const v = part.values;
  const out = [];
  const warn = (message, field) => out.push({ level: 'warn', message, ...(field ? { field } : {}) });
  const info = (message, field) => out.push({ level: 'info', message, ...(field ? { field } : {}) });

  if (!isMultiple(v)) {
    if (v.cordVessels === 'Two') info('Two-vessel umbilical cord (single umbilical artery): correlate with fetal anomaly scan.', 'cordVessels');
    return out;
  }

  const d = deriveChorionicity(v);
  const layers = effectiveLayers(v);
  const req = v.requestChorionicity || 'Not stated';

  if (v.membraneSampled === 'Not sampled' && layers !== 'No dividing membrane (monoamniotic)' && v.dividingMembraneGross !== 'Absent (monoamniotic)') {
    warn('No dividing membrane block sampled: the dividing membrane (roll or T-zone) is the sample that proves chorionicity (Best Practice No 178).', 'membraneSampled');
  }
  if (req !== 'Not stated' && d.code !== 'INDETERMINATE' && req !== d.code) {
    warn(`Request states ${req} but the dividing membrane histology indicates ${d.code}.`, 'requestChorionicity');
  }
  if (hasTZone(v) && v.tZoneFinding && v.tZoneFinding !== 'Follow layers' && v.tZoneFinding !== 'Junction not in the section') {
    const layersDc = layers === 'Two amnions with chorion between them' || layers === 'Two amnions and two chorions';
    const layersMc = layers === 'Two amnions without chorion';
    if ((layersDc && v.tZoneFinding === 'Two amnions over an uninterrupted chorionic plate')
      || (layersMc && v.tZoneFinding === 'Chorionic layers fused with the chorionic plate')) {
      warn('Dividing membrane layers and T-zone finding point to different chorionicities.', 'tZoneFinding');
    }
  }
  if (layers === 'Two amnions without chorion' && v.discConfiguration === 'Separate') {
    warn('Amnion-only dividing membrane with two separate discs: a monochorionic diamniotic placenta is a single disc.', 'discConfiguration');
  }
  if (layers === 'Chorion with one amnion, the other detached' && !hasTZone(v)) {
    warn('One amnion detached with no T-zone block: a dislodged amnion is a frequent artefact, and a T-zone section is the best sample to prove chorionicity.', 'tZoneBlock');
  }
  if (d.qualifier === 'indeterminate') {
    warn('Chorionicity is indeterminate on the sampled membrane: take a T-zone block if tissue remains.', 'membraneLayers');
  }
  if (d.code === 'MCMA') {
    info('Monoamniotic twins: take sections from any cord stricture and examine the parenchyma for fetal vascular malperfusion (APMIS 2018).', 'membraneLayers');
  }
  if (d.mono && d.code !== 'MCMA') {
    const anast = Array.isArray(v.anastomoses) ? v.anastomoses : [];
    if (!anast.length || (anast.length === 1 && anast[0] === 'Not assessed')) {
      info('Monochorionic placenta: record fetal-surface vascular anastomoses and vascular equator shares (RCPath G108).', 'anastomoses');
    }
  }
  const history = String(ctx?.case?.clinicalHistory || '').toLowerCase();
  if (/\b(?:ttts|twin[- ]to[- ]twin|taps|laser|growth discordance|sgr|sfgr)\b/i.test(history)) {
    info('Clinical history mentions TTTS, TAPS, laser therapy or growth discordance: sample each twin territory, compare them and record laser sites / anastomoses (RCPath G108).', 'territoryComparison');
  }
  if ((v.chorioamnionitis !== 'Absent' || v.fetalResponse !== 'Absent') && v.findingTwin === 'Twin II') {
    info('Chorioamnionitis or funisitis recorded in twin II only: the lower, presenting twin usually shows the stronger response (APMIS 2018); check cord labels.', 'findingTwin');
  }
  if (isTriplet(v)) {
    const pairs = [
      v.tripletMembrane12 || 'Monochorionic (no chorion)',
      v.tripletMembrane23 || 'Dichorionic (chorion present)',
      v.tripletMembrane13 || 'Dichorionic (chorion present)'
    ];
    const dc = pairs.filter((x) => /^Dichorionic/i.test(x)).length;
    if (dc === 1) {
      warn('Impossible triplet membrane combination: two pairs without chorion and the third with chorion cannot all be true.', 'tripletMembrane12');
    }
  }

  return out;
}

export default {
  specimenName,
  macro,
  blockKey,
  microscopy,
  diagnosis,
  validate,
  pluralityPhrase,
  gestationPhrase,
  chorionicity,
  deriveChorionicity,
  isTwin,
  isTriplet,
  isMultiple,
  hasMVM,
  hasFVM
};
