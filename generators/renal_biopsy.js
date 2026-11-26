// Medical renal biopsy — synoptic report (Banff / Oxford MEST-C / ISN-RPS).
import { renderSynoptic, renderDiagnosis } from '../src/synoptic.js';
import { stripDot, checks } from './_house.js';

const int = (v) => { const n = parseInt(String(v ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const num = (v) => { const n = parseFloat(String(v ?? '').trim()); return Number.isFinite(n) ? n : null; };
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

export function specimenName(part) {
  const v = part.values;
  const typed = stripDot(v.specimenName);
  if (typed) return uc1(typed);
  if (/transplant/i.test(v.biopsyContext || '')) return 'Transplant kidney, needle core biopsy';
  const lat = v.laterality && !/Not specified|Transplant/i.test(v.laterality) ? `${v.laterality} ` : '';
  return `${uc1(`${lat}native kidney`)}, needle core biopsy`;
}

export function specimens(parts) {
  return parts.map((p) => `(${p.label}) ${specimenName(p)}`).join('\n');
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const tag = lettered(part, ctx) ? `(${part.label}) ` : '';
  const c = int(v.coresCount);
  return `${tag}Received for medical renal evaluation ${c === 1 ? 'is 1 needle core' : `are ${c || 'multiple'} needle cores`} of renal tissue, apportioned for light microscopy, immunofluorescence and electron microscopy.`;
}

function dxLabel(v) {
  const d = v.primaryDx || 'IgA nephropathy';
  if (/specify/i.test(d) && stripDot(v.primaryDxOther)) return uc1(stripDot(v.primaryDxOther));
  return d;
}

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const tot = int(v.glomTotal);
  const gs = int(v.glomGlobalScl);
  const ss = int(v.glomSegScl);
  const cr = int(v.glomCrescents);
  const art = int(v.arteriesCount);
  const ifta = num(v.iftaPct);

  const sections = [
    { heading: 'Specimen adequacy', items: [
      item('Biopsy context', v.biopsyContext || 'Native kidney biopsy'),
      tot !== null ? item('Total glomeruli (LM)', String(tot)) : null,
      gs !== null ? item('Globally sclerosed glomeruli', `${gs}${tot ? ` (${Math.round((gs / tot) * 100)}%)` : ''}`) : null,
      ss !== null ? item('Segmentally sclerosed glomeruli', String(ss)) : null,
      cr !== null ? item('Glomeruli with crescents', String(cr)) : null,
      art !== null ? item('Arteries sampled', String(art)) : null,
      ifta !== null ? item('Interstitial fibrosis & tubular atrophy (IFTA)', `${fmt(ifta)}%`) : null
    ] },
    { heading: 'Classification & scoring', items: [
      item('Primary diagnosis', dxLabel(v)),
      stripDot(v.mestcScore) ? item('Oxford MEST-C score', stripDot(v.mestcScore)) : null,
      stripDot(v.lupusClass) ? item('ISN/RPS class & NIH indices', stripDot(v.lupusClass)) : null,
      stripDot(v.banffScores) ? item('Banff lesion scores', stripDot(v.banffScores)) : null
    ] },
    { heading: 'Microscopic examination', items: [
      stripDot(v.lmSummary) ? { label: 'Light microscopy', para: `${stripDot(v.lmSummary)}.` } : null,
      stripDot(v.ifSummary) ? { label: 'Immunofluorescence', para: `${stripDot(v.ifSummary)}.` } : null,
      stripDot(v.emSummary) ? { label: 'Electron microscopy', para: `${stripDot(v.emSummary)}.` } : null,
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
  const clauses = [dxLabel(v).toUpperCase()];
  if (stripDot(v.mestcScore)) clauses.push(`Oxford classification ${stripDot(v.mestcScore)}`);
  if (stripDot(v.lupusClass)) clauses.push(stripDot(v.lupusClass));
  if (stripDot(v.banffScores)) clauses.push(`Banff scores: ${stripDot(v.banffScores)}`);
  const ifta = num(v.iftaPct);
  if (ifta !== null) clauses.push(`Interstitial fibrosis and tubular atrophy approximately ${fmt(ifta)}%`);
  return renderDiagnosis(head, clauses.map((c, i) => (i === clauses.length - 1 ? `${c}.` : c)));
}

export function validate(part) {
  const v = part.values;
  const { out, err, warn } = checks();
  if (!v.primaryDx) err('Primary diagnosis not recorded.', 'primaryDx');
  const tot = int(v.glomTotal);
  const art = int(v.arteriesCount);
  if (/transplant/i.test(v.biopsyContext || '') && ((tot !== null && tot < 10) || (art !== null && art < 2))) {
    warn('Banff adequacy threshold (< 10 glomeruli or < 2 arteries): specimen is marginal / inadequate.', 'glomTotal');
  }
  const gs = int(v.glomGlobalScl);
  if (tot !== null && gs !== null && gs > tot) err(`Globally sclerosed glomeruli (${gs}) exceeds total glomeruli (${tot}).`, 'glomGlobalScl');
  return out;
}

export default { specimenName, specimens, macro, synoptic, diagnosis, validate };
