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

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const tot = int(v.fragmentsTotal);
  const myo = int(v.fragmentsMyocardium);

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
      stripDot(v.microSummary) ? { label: 'Microscopy', para: `${stripDot(v.microSummary)}.` } : null,
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
