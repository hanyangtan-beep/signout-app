// Spleen (lymphoma, WHO-HAEM5): primary splenic B-cell lymphomas/leukaemias (SMZL, HCL, SDRPL,
// SBLPN), hepatosplenic T-cell lymphoma (HSTCL), primary/secondary DLBCL, FL, MCL, CLL/SLL,
// Hodgkin lymphoma and myeloid sarcoma involvement.

import { stripDot, letteredBlockKey, checks } from './_house.js';
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';

const lettered = (part, ctx) => (ctx?.parts?.length || 1) > 1;
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) && n > 0 ? n : null; };
const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const withCm = (s) => (/\b(cm|mm)\b/i.test(s) ? s : `${s} cm`);

const MARKERS = [
  ['CD20', 'CD20'], ['PAX5', 'PAX5'], ['CD5', 'CD5'], ['CD10', 'CD10'], ['BCL6', 'BCL6'], ['BCL2', 'BCL2'],
  ['Cyclin D1', 'CyclinD1'], ['LEF1', 'LEF1'], ['CD23', 'CD23'], ['CD25', 'CD25'], ['CD103', 'CD103'],
  ['CD123', 'CD123'], ['Annexin A1', 'AnnexinA1'], ['DBA.44', 'DBA44'], ['IgD', 'IgD'],
  ['CD3', 'CD3'], ['CD4', 'CD4'], ['CD8', 'CD8'], ['CD56', 'CD56'], ['TIA-1', 'TIA1'],
  ['Granzyme B', 'GranzymeB'], ['TCR-gamma/delta', 'TCRgd'], ['CD30', 'CD30'], ['MPO', 'MPO']
];
const MARKER_NAMES = MARKERS.map(([m]) => m);
const resultField = (m) => `r_${(MARKERS.find(([x]) => x === m) || [])[1]}`;
const resultOf = (v, m) => (has(v.panel, m) ? v[resultField(m)] || 'Positive' : '');
const panelOf = (v) => MARKER_NAMES.filter((m) => has(v.panel, m)).map((m) => [m, v[resultField(m)] || 'Positive']);

const ENTITY = {
  'Splenic marginal zone lymphoma': ['SPLENIC MARGINAL ZONE LYMPHOMA', 'splenic marginal zone lymphoma'],
  'Hairy cell leukaemia': ['HAIRY CELL LEUKAEMIA', 'hairy cell leukaemia'],
  'Splenic diffuse red pulp small B-cell lymphoma': ['SPLENIC DIFFUSE RED PULP SMALL B-CELL LYMPHOMA', 'splenic diffuse red pulp small B-cell lymphoma'],
  'Splenic B-cell lymphoma/leukaemia with prominent nucleoli': ['SPLENIC B-CELL LYMPHOMA/LEUKAEMIA WITH PROMINENT NUCLEOLI', 'splenic B-cell lymphoma/leukaemia with prominent nucleoli'],
  'Diffuse large B-cell lymphoma, NOS': ['DIFFUSE LARGE B-CELL LYMPHOMA, NOS', 'diffuse large B-cell lymphoma, NOS'],
  'Follicular lymphoma': ['FOLLICULAR LYMPHOMA', 'follicular lymphoma'],
  'Mantle cell lymphoma': ['MANTLE CELL LYMPHOMA', 'mantle cell lymphoma'],
  'Chronic lymphocytic leukaemia/small lymphocytic lymphoma': ['CHRONIC LYMPHOCYTIC LEUKAEMIA/SMALL LYMPHOCYTIC LYMPHOMA', 'chronic lymphocytic leukaemia/small lymphocytic lymphoma'],
  'Lymphoplasmacytic lymphoma': ['LYMPHOPLASMACYTIC LYMPHOMA', 'lymphoplasmacytic lymphoma'],
  'B-cell lymphoma, not further classified': ['B-CELL LYMPHOMA (please see description)', 'a B-cell lymphoma'],
  'Hepatosplenic T-cell lymphoma': ['HEPATOSPLENIC T-CELL LYMPHOMA', 'hepatosplenic T-cell lymphoma'],
  'T-cell large granular lymphocytic leukaemia': ['T-CELL LARGE GRANULAR LYMPHOCYTIC LEUKAEMIA', 'T-cell large granular lymphocytic leukaemia'],
  'Peripheral T-cell lymphoma, NOS': ['PERIPHERAL T-CELL LYMPHOMA, NOS', 'peripheral T-cell lymphoma, NOS'],
  'Classic Hodgkin lymphoma': ['CLASSIC HODGKIN LYMPHOMA', 'classic Hodgkin lymphoma'],
  'Myeloid sarcoma / myeloproliferative neoplasm involvement': ['MYELOID SARCOMA / MYELOPROLIFERATIVE NEOPLASM INVOLVEMENT', 'myeloid sarcoma / myeloproliferative neoplasm involvement']
};

const COMPARTMENT_PROSE = {
  'White pulp-predominant (biphasic marginal zone nodules) with red pulp involvement': 'Sections show splenic parenchyma with prominent white pulp expansion by biphasic lymphoid nodules comprising inner small lymphocytes surrounded by a paler marginal zone, accompanied by secondary infiltration of the red pulp cords and sinusoids.',
  'Diffuse red pulp (cords and sinusoids) with white pulp atrophy': 'Sections show diffuse expansion of the splenic red pulp cords and sinusoids by an atypical lymphoid infiltrate, with marked atrophy of the white pulp.',
  'Diffuse red pulp with blood lakes / pseudosinuses and white pulp atrophy': 'Sections show diffuse infiltration of the splenic red pulp by atypical lymphoid cells forming erythrocyte-filled pseudosinuses (blood lakes), accompanied by white pulp atrophy.',
  'Intrasinusoidal and cordal red pulp infiltration with white pulp atrophy': 'Sections show expanded splenic red pulp with prominent intrasinusoidal and cordal infiltration by atypical lymphoid cells and atrophy of the white pulp.',
  'Crowded neoplastic white pulp follicles': 'Sections show replacement of the splenic white pulp by closely packed neoplastic lymphoid follicles lacking discernible mantle zones and germinal centre polarisation.',
  'Mass-forming / diffuse parenchymal effacement': 'Sections show diffuse, mass-forming effacement of the normal splenic architecture by a dense neoplastic lymphoid infiltrate.'
};

export function specimenName(part) {
  const proc = part.values.procedure || 'Total splenectomy';
  return `Spleen, ${proc.toLowerCase()}`;
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const how = v.fixation === 'In formalin' ? 'in formalin' : 'fresh';
  const noun = v.procedure === 'Partial splenectomy' ? 'a partial splenectomy specimen'
    : v.procedure === 'Splenic core / incisional biopsy' ? 'splenic biopsy tissue'
      : 'a spleen';
  const w = int(v.weight);
  const dim = stripDot(v.dimensions);
  const measures = [w ? `weighing ${w} g` : '', dim ? `measuring ${withCm(dim)}` : ''].filter(Boolean).join(' and ');
  const out = [`Received ${how} is ${noun}${measures ? ` ${measures}` : ''}.`];
  if (v.cutSurface) out.push(`The cut surface shows ${v.cutSurface.toLowerCase()}.`);
  const msz = stripDot(v.massSize);
  if (msz) out.push(`The dominant mass measures ${withCm(msz)}.`);
  if (how === 'fresh' && Array.isArray(v.freshFor) && v.freshFor.length) {
    const fresh = v.freshFor.filter((x) => x !== 'Touch imprints').map((x) => x.toLowerCase());
    if (fresh.length) out.push(`Fresh tissue is sampled for ${list(fresh)}.`);
    if (has(v.freshFor, 'Touch imprints')) out.push('Touch imprints are prepared.');
  }
  const b = int(v.blocks);
  if (b) out.push(`Representative sections are submitted in ${b} block${b === 1 ? '' : 's'}.`);
  const notes = stripDot(v.macroNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

function ihcProse(v) {
  const panel = panelOf(v);
  const by = (r) => panel.filter(([, res]) => res === r).map(([m]) => m);
  const pos = by('Positive');
  const weak = by('Weak');
  const neg = by('Negative');
  const sub = by('Positive (subset)');
  const out = [];
  const clauses = [];
  if (pos.length) clauses.push(`positive for ${list(pos)}`);
  if (weak.length) clauses.push(`weakly positive for ${list(weak)}`);
  if (neg.length) clauses.push(`negative for ${list(neg)}`);
  if (clauses.length) out.push(`Immunohistochemistry shows the neoplastic cells are ${clauses.join('; ')}.`);
  if (sub.length) out.push(`A subset of neoplastic cells is positive for ${list(sub)}.`);
  const ki = num(v.ki67);
  if (ki !== null) out.push(`The Ki-67 proliferative index is approximately ${ki}%.`);
  if (v.eber && v.eber !== 'Not performed') out.push(`In situ hybridisation for EBER is ${v.eber.toLowerCase()}.`);
  return out;
}

export function microscopy(part) {
  const v = part.values;
  const out = [];
  out.push(COMPARTMENT_PROSE[v.compartment] || 'Sections show splenic parenchyma involved by an atypical lymphoid infiltrate.');
  if (Array.isArray(v.cytology) && v.cytology.length) {
    out.push(`Cytologically, the infiltrate comprises ${list(v.cytology.map((c) => c.toLowerCase()))}.`);
  }
  if (v.largeCellTransform) {
    out.push('Areas of large-cell transformation comprising sheets of large atypical lymphoid cells are present.');
  }
  if (v.hilarNodes === 'Involved by lymphoma') out.push('Splenic hilar lymph nodes are involved by lymphoma.');
  else if (v.hilarNodes === 'Negative for lymphoma') out.push('Splenic hilar lymph nodes show no evidence of lymphoma.');
  const notes = stripDot(v.morphNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  out.push(...ihcProse(v));

  const ent = v.dx === 'Other (specify)' ? [stripDot(v.dxOther).toUpperCase(), stripDot(v.dxOther).toLowerCase()] : (ENTITY[v.dx] || ['', '']);
  if (ent[1]) {
    const verb = { 'Consistent with': 'are consistent with', 'In keeping with': 'are in keeping with', 'Suspicious for': 'are suspicious for' }[v.certainty] || 'are those of';
    out.push(`The overall morphological and immunophenotypic features ${verb} ${ent[1]}${v.largeCellTransform ? ' with large-cell transformation' : ''}.`);
  }
  return `(${part.label}) ${out.join(' ')}`;
}

export function panelList(part) {
  const v = part.values;
  const items = panelOf(v).map(([m, r]) => ({ label: m, value: r }));
  const ki = num(v.ki67);
  if (ki !== null) items.push({ label: 'Ki-67', value: `approximately ${ki}%` });
  const ish = v.eber && v.eber !== 'Not performed' ? [{ label: 'EBER', value: v.eber }] : [];
  return renderSynoptic([{ heading: 'Immunohistochemistry', items }, { heading: 'In situ hybridisation', items: ish }]);
}

export function synoptic(part, ctx) {
  const narrative = microscopy(part, ctx);
  const showList = !(ctx?.options && ctx.options.ihcList === false);
  const listText = showList ? panelList(part) : '';
  return [narrative, listText].filter(Boolean).join('\n\n');
}

export function molecular(part, ctx) {
  const v = part.values;
  const items = [
    ['BRAF p.V600E', v.brafV600E],
    ['MAP2K1', v.map2k1],
    ['TP53 / del(17p)', v.tp53]
  ].filter(([, val]) => val && val !== 'Not performed').map(([label, value]) => ({ label, value }));
  const other = stripDot(v.otherMolecular);
  if (other) items.push({ text: other });
  if (!items.length) return '';
  return renderSynoptic([{ heading: 'Molecular & ancillary findings', items }], lettered(part, ctx) ? `(${part.label})` : '');
}

export function diagnosis(part) {
  const v = part.values;
  const proc = (v.procedure || 'Total splenectomy').toLowerCase();
  const head = `(${part.label}) SPLEEN, ${proc}`;
  const ent = v.dx === 'Other (specify)' ? (stripDot(v.dxOther).toUpperCase() || 'SPLENIC LYMPHOMA (please see description)') : (ENTITY[v.dx]?.[0] || v.dx.toUpperCase());
  const qual = { 'Consistent with': 'Consistent with ', 'In keeping with': 'In keeping with ', 'Suspicious for': 'Suspicious for ' }[v.certainty] || '';
  const main = `${qual}${ent}${v.largeCellTransform ? ', with LARGE-CELL TRANSFORMATION (DIFFUSE LARGE B-CELL LYMPHOMA)' : ''}`;
  const lines = [main];
  if (v.hilarNodes === 'Involved by lymphoma') lines.push('Splenic hilar lymph nodes: INVOLVED BY LYMPHOMA');
  else if (v.hilarNodes === 'Negative for lymphoma') lines.push('Splenic hilar lymph nodes: negative for lymphoma');
  return renderDiagnosis(head, lines);
}

export function flags(parts) {
  const out = [];
  const listP = parts || [];
  if (listP.some((p) => p.values?.dx === 'Splenic B-cell lymphoma/leukaemia with prominent nucleoli')) out.push('sblpn');
  if (listP.some((p) => p.values?.dx === 'Splenic diffuse red pulp small B-cell lymphoma')) out.push('sdrpl');
  if (listP.some((p) => p.values?.dx === 'Hepatosplenic T-cell lymphoma')) out.push('hstcl');
  if (listP.some((p) => [p.values?.brafV600E, p.values?.map2k1, p.values?.tp53].includes('Pending'))) out.push('pending');
  return out;
}

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const r = (m) => resultOf(v, m);

  if (v.dx === 'Other (specify)' && !stripDot(v.dxOther)) err('Specify the diagnosis.', 'dxOther');
  if (!panelOf(v).length) warn('No immunohistochemistry is recorded for a splenic lymphoma diagnosis.', 'panel');

  if (v.dx === 'Hairy cell leukaemia') {
    if (v.brafV600E === 'Not detected (wild-type)') {
      warn('Classic hairy cell leukaemia carries BRAF p.V600E in >95% of cases; if BRAF wild-type and Annexin A1/CD25 negative, consider SBLPN or SDRPL.', 'brafV600E');
    }
    if (r('Annexin A1') === 'Negative' && r('CD25') === 'Negative') {
      warn('Hairy cell leukaemia is characteristically positive for Annexin A1 and CD25; double-negative cases favour SBLPN or SDRPL.', 'panel');
    }
  }

  if (v.dx === 'Splenic B-cell lymphoma/leukaemia with prominent nucleoli') {
    if (v.brafV600E === 'Detected (mutated)') {
      warn('BRAF p.V600E is characteristically absent in SBLPN (WHO-HAEM5); review for classic hairy cell leukaemia.', 'brafV600E');
    }
    if (r('Annexin A1') === 'Positive' || r('CD25') === 'Positive') {
      warn('SBLPN is characteristically negative for Annexin A1 and CD25; positivity favours classic hairy cell leukaemia.', 'panel');
    }
  }

  if (v.dx === 'Splenic diffuse red pulp small B-cell lymphoma') {
    if (v.brafV600E === 'Detected (mutated)' || r('Annexin A1') === 'Positive' || r('CD25') === 'Positive') {
      warn('SDRPL is characteristically negative for BRAF p.V600E, Annexin A1 and CD25; positivity favours classic hairy cell leukaemia.', 'panel');
    }
  }

  if (v.dx === 'Splenic marginal zone lymphoma' && r('Cyclin D1') === 'Positive') {
    warn('Cyclin D1 positivity in a splenic B-cell lymphoma should prompt exclusion of mantle cell lymphoma (SOX11 / t(11;14)).', 'panel');
  }

  if (v.dx === 'Hepatosplenic T-cell lymphoma') {
    if (r('CD3') === 'Negative' || r('CD20') === 'Positive') {
      warn('Hepatosplenic T-cell lymphoma is expected to be CD3 positive and CD20 negative.', 'panel');
    }
    if (!has(v.panel, 'TIA-1') && !has(v.panel, 'TCR-gamma/delta')) {
      info('Consider recording TIA-1 and TCR-gamma/delta (or beta-F1) for hepatosplenic T-cell lymphoma.', 'panel');
    }
  }

  return out;
}

export default { specimenName, macro, blockKey, synoptic, microscopy, molecular, diagnosis, flags, validate };
