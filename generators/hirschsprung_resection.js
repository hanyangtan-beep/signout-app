// Hirschsprung disease — pull-through resection generator. Pure functions: (part, ctx) -> string.
const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const listJoin = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

export function specimenName(part) {
  const proc = part.values.procedure || 'Pull-through resection, NOS';
  if (proc === 'Pull-through resection, NOS') return 'Colon, pull-through resection';
  return `Colon, ${proc.charAt(0).toLowerCase()}${proc.slice(1)}`;
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const len = num(v.specimenLength);
  const narrow = num(v.narrowSegment);
  const cone = num(v.transitionCone);
  const dilated = num(v.dilatedSegment);
  const s = [];
  s.push(`Received in formalin is a ${v.procedure === 'Total colectomy / pull-through' ? 'total colectomy / pull-through specimen' : 'segment of large bowel (pull-through resection)'}${len !== null ? ` measuring ${fmt(len)} cm in length` : ''}.`);
  const segs = [];
  if (narrow !== null) segs.push(`a distal narrowed segment (${fmt(narrow)} cm)`);
  if (cone !== null) segs.push(`a transitional cone (${fmt(cone)} cm)`);
  if (dilated !== null) segs.push(`a proximal dilated segment (${fmt(dilated)} cm)`);
  if (segs.length) s.push(`Macroscopically there is ${listJoin(segs)}.`);
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 6));
  const method = v.samplingMethod || 'Full-circumference proximal margin ring + longitudinal strip';
  if (method === 'Full-circumference proximal margin ring + longitudinal strip') {
    s.push(`The proximal resection margin is submitted in toto as a circumferential ring, together with a mapped longitudinal strip from distal to proximal in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  } else if (method === 'Mapped transverse rings along specimen') {
    s.push(`Mapped transverse rings are submitted from distal to proximal, including the full-circumference proximal resection margin, in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  } else {
    s.push(`Representative sections are submitted in ${blocks} block${blocks === 1 ? '' : 's'}.`);
  }
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 6));
  const range = (a, b) => (a === b ? `(${a})` : `(${a}-${b})`);
  const method = v.samplingMethod || 'Full-circumference proximal margin ring + longitudinal strip';
  if (blocks === 1) return `(${part.label}) (1) Representative sections.`;
  if (method === 'Full-circumference proximal margin ring + longitudinal strip') {
    return `(${part.label}) (1) Proximal resection margin, full-circumference ring. ${range(2, blocks)} Longitudinal strip, distal to proximal.`;
  }
  if (method === 'Mapped transverse rings along specimen') {
    return `(${part.label}) (1) Proximal resection margin, full-circumference ring. ${range(2, blocks)} Mapped transverse rings, distal to proximal.`;
  }
  return `(${part.label}) (1) Proximal resection margin. ${range(2, blocks)} Representative sections, distal to proximal.`;
}

const TZ_MAP = {
  Hypoganglionosis: 'hypoganglionosis',
  'Partial circumferential aganglionosis': 'partial circumferential aganglionosis',
  'Nerve trunk hypertrophy (>40 um)': 'hypertrophic submucosal and myenteric nerve trunks (>40 um)',
  'Myenteric / submucosal eosinophilic or lymphocytic ganglionitis': 'myenteric / submucosal ganglionitis'
};

const PROX_MICRO = {
  'Circumferential ganglion cells, no nerve trunk hypertrophy': 'The proximal resection margin shows normal ganglion cells distributed circumferentially in both the submucosal and myenteric plexuses, with no nerve trunk hypertrophy or other transition zone features.',
  'Circumferential ganglion cells with mild nerve trunk hypertrophy (possible transition zone)': 'The proximal resection margin contains circumferential ganglion cells, but mild nerve trunk hypertrophy is present, raising the possibility of transition zone pull-through.',
  'Partial circumferential aganglionosis / hypoganglionosis (transition zone at margin)': 'The proximal resection margin shows partial circumferential aganglionosis and/or hypoganglionosis, indicating transition zone involvement at the surgical margin.',
  'Aganglionic (no ganglion cells identified)': 'The proximal resection margin is aganglionic, with no ganglion cells identified in either the submucosal or myenteric plexus.'
};

const PROX_DX = {
  'Circumferential ganglion cells, no nerve trunk hypertrophy': 'proximal resection margin circumferentially ganglionated without transition zone features',
  'Circumferential ganglion cells with mild nerve trunk hypertrophy (possible transition zone)': 'proximal resection margin circumferentially ganglionated with mild nerve trunk hypertrophy (possible transition zone)',
  'Partial circumferential aganglionosis / hypoganglionosis (transition zone at margin)': 'TRANSITION ZONE FEATURES AT PROXIMAL RESECTION MARGIN',
  'Aganglionic (no ganglion cells identified)': 'PROXIMAL RESECTION MARGIN AGANGLIONIC'
};

const CALRETININ_MICRO = {
  'Loss of mucosal nerve fibres in aganglionic segment; intact at proximal margin': 'Calretinin immunohistochemistry confirms loss of mucosal nerve fibres in the aganglionic segment, with intact calretinin-positive nerve fibres at the proximal resection margin.',
  'Intact at proximal margin': 'Calretinin immunohistochemistry shows intact mucosal nerve fibres at the proximal resection margin.',
  'Absent at proximal margin': 'Calretinin immunohistochemistry shows absence of mucosal nerve fibres at the proximal resection margin.'
};

const ENTEROCOLITIS_MICRO = {
  Absent: 'There is no histological evidence of Hirschsprung-associated enterocolitis.',
  'Present - mild (crypt dilatation / mucin retention)': 'Mild Hirschsprung-associated enterocolitis is present, with crypt dilatation and mucin retention.',
  'Present - moderate (cryptitis / crypt abscesses)': 'Moderate Hirschsprung-associated enterocolitis is present, with cryptitis and crypt abscesses.',
  'Present - severe (mucosal ulceration / pseudomembranes)': 'Severe Hirschsprung-associated enterocolitis is present, with mucosal ulceration and pseudomembrane formation.'
};

export function microscopy(part) {
  const v = part.values;
  const s = [];
  const agLen = num(v.aganglionicLength);
  s.push(`Sections of the distal ${agLen !== null ? `${fmt(agLen)} cm ` : ''}bowel show complete absence of ganglion cells in both the submucosal (Meissner) and myenteric (Auerbach) plexuses, accompanied by hypertrophic submucosal and myenteric nerve trunks, confirming Hirschsprung disease.`);
  const tz = (Array.isArray(v.transitionZone) ? v.transitionZone : []).map((k) => TZ_MAP[k]).filter(Boolean);
  if (tz.length) s.push(`The intervening transition zone demonstrates ${listJoin(tz)}.`);
  s.push(PROX_MICRO[v.proximalMargin] || PROX_MICRO['Circumferential ganglion cells, no nerve trunk hypertrophy']);
  if (CALRETININ_MICRO[v.calretinin]) s.push(CALRETININ_MICRO[v.calretinin]);
  s.push(ENTEROCOLITIS_MICRO[v.enterocolitis] || ENTEROCOLITIS_MICRO.Absent);
  if (v.totalColonic) {
    if (v.appendixStatus === 'Aganglionic (supports total colonic aganglionosis)') {
      s.push('The included appendix is aganglionic, supporting total colonic aganglionosis.');
    } else if (v.appendixStatus === 'Ganglion cells present') {
      s.push('Ganglion cells are identified within the included appendix.');
    } else {
      s.push('Aganglionosis involves the entire resected colon (total colonic aganglionosis).');
    }
  }
  const note = (v.additionalNotes || '').trim();
  if (note) s.push(note);
  return `(${part.label}) ${s.join(' ')}`;
}

export function diagnosis(part) {
  const v = part.values;
  const agLen = num(v.aganglionicLength);
  const clauses = [];
  const main = v.totalColonic
    ? `TOTAL COLONIC AGANGLIONOSIS (HIRSCHSPRUNG DISEASE${agLen !== null ? `, aganglionic segment ${fmt(agLen)} cm` : ''})`
    : `HIRSCHSPRUNG DISEASE${agLen !== null ? ` (aganglionic segment ${fmt(agLen)} cm)` : ''}`;
  clauses.push(main);
  clauses.push(PROX_DX[v.proximalMargin] || PROX_DX['Circumferential ganglion cells, no nerve trunk hypertrophy']);
  if (v.enterocolitis && v.enterocolitis !== 'Absent') {
    const grade = v.enterocolitis.replace(/^Present - /, '').replace(/\s*\(.*\)$/, '');
    clauses.push(`Hirschsprung-associated enterocolitis (${grade})`);
  }
  return `(${part.label}) COLON, pull-through resection - ${clauses.join('; ')}.`;
}

export function validate(part) {
  const v = part.values || {};
  const issues = [];
  const specLen = num(v.specimenLength);
  const agLen = num(v.aganglionicLength);
  if (specLen !== null && agLen !== null && agLen > specLen) {
    issues.push({
      level: 'error',
      field: 'aganglionicLength',
      message: `Aganglionic segment length (${fmt(agLen)} cm) exceeds total specimen length (${fmt(specLen)} cm).`
    });
  }
  if (v.proximalMargin && v.proximalMargin !== 'Circumferential ganglion cells, no nerve trunk hypertrophy') {
    issues.push({
      level: 'warn',
      field: 'proximalMargin',
      message: 'Transition zone features or aganglionosis at the proximal resection margin carry a high risk of post-operative obstructive symptoms — communicate directly with the paediatric surgical team.'
    });
  }
  if (v.totalColonic && v.appendixStatus === 'Not included') {
    issues.push({
      level: 'warn',
      field: 'appendixStatus',
      message: 'Total colonic aganglionosis is ticked: document whether the appendix / distal ileum was sampled and confirm its ganglionation status.'
    });
  }
  return issues;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
