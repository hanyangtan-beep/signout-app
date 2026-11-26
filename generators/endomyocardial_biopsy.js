// Endomyocardial biopsy — synoptic report (ISHLT 2004 ACR / ISHLT 2013 pAMR / Dallas native myocarditis).
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, checks } from './_house.js';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;
const isTransplant = (v) => /allograft|ISHLT/i.test(v?.biopsyContext || '');

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  return isTransplant(v) ? 'Cardiac allograft (right ventricle), endomyocardial biopsy' : 'Right ventricle, endomyocardial biopsy';
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const f = int(v.fragmentsTotal);
  return `${tag}Received in formalin ${f === 1 ? 'is 1 tan-brown myocardial fragment' : `are ${f || 'multiple'} tan-brown myocardial fragments`}, submitted entirely for histological examination.`;
}

const ACR_MORPH = {
  'Grade 0R: No acute cellular rejection': 'Myocardium shows intact myocytes without interstitial/perivascular mononuclear infiltrate or myocyte damage.',
  'Grade 1R: Mild acute cellular rejection (interstitial/perivascular infiltrate with up to 1 focus of myocyte damage)': 'Interstitial and/or perivascular lymphocytic infiltrate is present with at most a single focus of myocyte injury.',
  'Grade 2R: Moderate acute cellular rejection (>= 2 foci of infiltrate with associated myocyte damage)': 'Two or more distinct foci of mononuclear inflammatory infiltrate (lymphocytes and macrophages) are associated with myocyte damage.',
  'Grade 3R: Severe acute cellular rejection (diffuse infiltrate with multifocal myocyte damage, +/- oedema, haemorrhage or vasculitis)': 'Diffuse polymorphous inflammatory infiltrate involves multiple myocardial fragments with multifocal myocyte injury, interstitial oedema, haemorrhage and/or vasculitis.'
};

const NATIVE_MORPH = {
  'No active myocarditis or infiltrative disease': 'Myocardial fragments show normal-calibre myocytes without inflammatory infiltrate, myocyte necrosis, granulomas or abnormal interstitial deposition.',
  'Active lymphocytic myocarditis (Dallas criteria)': 'Patchy-to-diffuse interstitial lymphocytic infiltrate is accompanied by unequivocal adjacent myocyte necrosis/degeneration not attributable to ischaemia.',
  'Borderline myocarditis (infiltrate without myocyte necrosis)': 'Interstitial and perivascular lymphocytic infiltrate is present without identifiable myocyte necrosis on sampled levels.',
  'Giant cell myocarditis': 'Diffuse mixed inflammatory infiltrate of lymphocytes, eosinophils and multinucleated giant cells is accompanied by widespread myocyte necrosis.',
  'Eosinophilic myocarditis': 'Eosinophil-rich interstitial inflammatory infiltrate with degranulation is accompanied by myocyte necrosis.',
  'Cardiac sarcoidosis (granulomatous myocarditis)': 'Well-formed non-caseating epithelioid cell granulomas with multinucleated giant cells infiltrate the myocardium amidst patchy fibrosis.',
  'Cardiac amyloidosis (Congo red positive — specify AL / ATTR)': 'Acellular, amorphous eosinophilic deposits expand the myocardial interstitium and surround individual myocytes and vessels, showing Congo red apple-green birefringence under polarised light.',
  'Non-specific myocyte hypertrophy and interstitial fibrosis (cardiomyopathy pattern)': 'Myocytes display nuclear enlargement, hyperchromasia ("box-car" nuclei) and sarcoplasmic hypertrophy with patchy interstitial and replacement fibrosis.'
};

function autoMicroscopy(v) {
  if (isTransplant(v)) {
    const bits = [ACR_MORPH[v.acrGrade || 'Grade 0R: No acute cellular rejection'] || ''];
    if (/pAMR [123]/i.test(v.pamrGrade || '')) bits.push(`Antibody-mediated rejection features (${v.pamrGrade.split(':')[0]}) are noted.`);
    if (/Quilty/i.test(v.quilty || '')) bits.push(`Endocardial lymphocytic infiltrate (${v.quilty.replace(/^Present,\s*/i, '')}) is present.`);
    return bits.filter(Boolean).join(' ');
  }
  return NATIVE_MORPH[v.nativeDx || 'No active myocarditis or infiltrative disease'] || '';
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const tot = int(v.fragmentsTotal);
  const myo = int(v.fragmentsMyocardium);
  const micro = stripDot(v.microSummary) || autoMicroscopy(v);

  const sections = [
    { heading: 'Specimen adequacy', items: [
      item('Biopsy context', v.biopsyContext || 'Cardiac allograft surveillance (ISHLT)'),
      tot !== null ? item('Total fragments', String(tot)) : null,
      myo !== null ? item('Evaluable myocardial fragments', String(myo)) : null
    ] },
    isTransplant(v)
      ? { heading: 'ISHLT allograft grading', items: [
        item('Acute cellular rejection (ISHLT 2004)', v.acrGrade || 'Grade 0R: No acute cellular rejection'),
        item('Antibody-mediated rejection (ISHLT 2013)', v.pamrGrade || 'pAMR 0: Negative for pathologic antibody-mediated rejection'),
        item('C4d / CD68 immunostaining', v.c4dIhc || 'Not performed'),
        item('Quilty lesion', v.quilty || 'Not identified')
      ] }
      : { heading: 'Native myocardial assessment', items: [
        item('Primary finding', v.nativeDx || 'No active myocarditis or infiltrative disease'),
        stripDot(v.nativeDxOther) ? item('Specification', stripDot(v.nativeDxOther)) : null
      ] },
    { heading: 'Microscopic examination', items: [
      stripDot(v.specialStains) ? item('Special stains & IHC', stripDot(v.specialStains)) : null,
      micro ? { label: 'Microscopy', para: `${stripDot(micro)}.` } : null,
      stripDot(v.additionalNotes) ? { label: 'Additional notes', para: `${stripDot(v.additionalNotes)}.` } : null
    ] }
  ].map((s) => ({ ...s, items: s.items.filter(Boolean) })).filter((s) => s.items.length);

  const heading = lettered(part, ctx) ? `(${part.label}) ${uc1(specimenName(part))}` : '';
  return renderSynoptic(sections, heading);
}

function headOf(name) {
  const idx = name.indexOf(',');
  return idx > 0 ? `${name.slice(0, idx).toUpperCase()}${name.slice(idx)}` : name.toUpperCase();
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const head = `${lettered(part, ctx) ? `(${part.label}) ` : ''}${headOf(specimenName(part))}:`;
  const clauses = [];
  if (isTransplant(v)) {
    clauses.push((v.acrGrade || 'Grade 0R: No acute cellular rejection').replace(/\s*\([^)]*\)/, '').toUpperCase());
    if (v.pamrGrade && !/Not assessed/i.test(v.pamrGrade)) clauses.push(v.pamrGrade.replace(/\s*\([^)]*\)/, ''));
    if (v.quilty && !/Not identified/i.test(v.quilty)) clauses.push(v.quilty);
  } else {
    const base = (v.nativeDx || 'No active myocarditis or infiltrative disease').replace(/\s*\([^)]*\)/, '');
    clauses.push(stripDot(v.nativeDxOther) ? `${base.toUpperCase()} (${stripDot(v.nativeDxOther)})` : base.toUpperCase());
  }
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part) {
  const v = part.values;
  const { out, warn } = checks();
  const myo = int(v.fragmentsMyocardium);
  if (isTransplant(v) && myo !== null && myo < 3) {
    warn(`Only ${myo} evaluable myocardial fragment(s) sampled (ISHLT adequacy requires >= 3).`, 'fragmentsMyocardium');
  }
  return out;
}

export default { specimenName, specimens, macro, synoptic, diagnosis, validate };
