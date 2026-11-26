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

const DX_MORPH = {
  'IgA nephropathy': 'Glomeruli show mesangial matrix expansion and variable mesangial hypercellularity (>= 4 mesangial cells/mesangial area), with or without endocapillary hypercellularity, segmental glomerulosclerosis, crescents and tubular red-cell casts. Scored by the Oxford MEST-C classification.',
  'Lupus nephritis (ISN/RPS)': 'Glomeruli demonstrate immune-complex-mediated lesions ranging from mesangial hypercellularity (Class II) to focal (< 50%, Class III) or diffuse (>= 50%, Class IV) endocapillary hypercellularity, hyaline "wire-loop" subendothelial deposits, karyorrhexis and cellular/fibrocellular crescents, or membranous spike-like thickening (Class V). Scored with modified NIH Activity and Chronicity indices.',
  'Membranous nephropathy (PLA2R-associated / secondary)': 'Glomeruli exhibit diffuse, uniform glomerular basement membrane (GBM) thickening with subepithelial silver-positive "spikes" and pinhole lucencies on Jones methenamine silver stain, typically without significant mesangial or endocapillary hypercellularity.',
  'Minimal change disease': 'Glomeruli appear unremarkable on light microscopy with normocellular mesangium, patent capillary loops and intact tubulointerstitial architecture; diagnosis rests on diffuse podocyte foot process effacement on electron microscopy with negative immunofluorescence.',
  'Focal segmental glomerulosclerosis (FSGS)': 'Segmental obliteration of glomerular capillary tufts by hyaline insudates, foam cells and increased extracellular matrix with adhesions to Bowman capsule involves a subset of glomeruli (classified by Columbia variant: collapsing, tip, cellular, perihilar or NOS).',
  'Diabetic nephropathy (RPS)': 'Glomeruli show diffuse mesangial matrix expansion, GBM thickening, nodular mesangial sclerosis (Kimmelstiel-Wilson nodules), exudative fibrin caps/capsular drops and prominent afferent and efferent arteriolar hyalinosis.',
  'Pauci-immune crescentic glomerulonephritis (ANCA-associated)': 'Glomeruli show focal-to-diffuse necrotising and crescentic glomerulonephritis with fibrinoid necrosis of capillary tufts, GBM rupture and cellular/fibrocellular crescents in the absence of significant endocapillary hypercellularity or immune deposits.',
  'Immune complex-mediated MPGN / C3 glomerulopathy': 'Glomeruli display accentuated lobular architecture with mesangial and endocapillary hypercellularity and widespread GBM double contours ("tram-tracking") on silver stain, separated by immunofluorescence into Ig-dominant MPGN vs C3-dominant C3 glomerulopathy.',
  'Thrombotic microangiopathy (TMA)': 'Glomerular capillary loops and arterioles show endothelial swelling, mesangiolysis, fragmented erythrocytes, fibrin thrombi and mucoid intimal hyperplasia ("onion-skinning") with ischaemic wrinkling of capillary walls.',
  'Acute tubular injury / necrosis (ATN)': 'Proximal and distal tubules show epithelial flattening, loss of brush border, cytoplasmic vacuolation, apical blebbing, luminal cellular debris and mitotic regeneration with interstitial oedema and unremarkable glomeruli.',
  'Acute tubulointerstitial nephritis (AIN)': 'Interstitium is expanded by oedema and a dense inflammatory infiltrate of lymphocytes, plasma cells and variable eosinophils accompanied by lymphocytic tubulitis, while glomeruli and vessels are spared.',
  'Renal amyloidosis (AL / AA)': 'Glomerular mesangium, capillary walls and/or arterioles contain amorphous, acellular eosinophilic deposits that are weakly PAS-positive, silver-negative and show Congo red apple-green birefringence under polarised light.',
  'Light chain cast nephropathy / MGRS': 'Distal tubules contain fractured, polychromatophilic, PAS-negative/weak Tamm-Horsfall-associated protein casts surrounded by giant cell reactions and acute tubular injury, with light-chain restriction on immunofluorescence.',
  'Hypertensive arterionephrosclerosis': 'Arteries and arterioles show fibrointimal thickening, medial hypertrophy and arteriolar hyalinosis accompanied by global ischaemic glomerulosclerosis, wrinkling of glomerular capillary tufts and patchy IFTA.',
  'Allograft: No evidence of rejection (Banff Category 1)': 'Allograft cortex shows intact glomerular capillary loops, no significant interstitial inflammation or tubulitis, no arteritis and negative C4d without active rejection.',
  'Allograft: Borderline changes suspicious for acute TCMR (Banff Category 3)': 'Focal interstitial mononuclear inflammation (i1–i3) is accompanied by mild lymphocytic tubulitis (t1, or t2–t3 with i0) below the threshold for acute T-cell-mediated rejection, without intimal arteritis.',
  'Allograft: Acute T-cell-mediated rejection (TCMR, Banff Category 4)': 'Allograft cortex shows interstitial mononuclear inflammation (>= i2) with moderate-to-severe lymphocytic tubulitis (t2–t3) and/or endarteritis/intimal arteritis (v1–v3) involving arterial endothelium.',
  'Allograft: Chronic active T-cell-mediated rejection (Banff Category 4)': 'Moderate-to-severe inflammation within areas of interstitial fibrosis and tubular atrophy (i-IFTA >= 2 with ti >= 2) and tubulitis (t2–t3), or chronic allograft arteriopathy (cv) with mononuclear intimal infiltration.',
  'Allograft: Active antibody-mediated rejection (AMR, Banff Category 2)': 'Microvascular inflammation (glomerulitis g > 0 and/or peritubular capillaritis ptc > 0) and/or acute TMA is accompanied by linear C4d deposition in peritubular capillaries and/or donor-specific antibody evidence.',
  'Allograft: Chronic active antibody-mediated rejection (Banff Category 2)': 'Transplant glomerulopathy (GBM double contours cg > 0) and/or severe peritubular capillary basement membrane multilayering is accompanied by microvascular inflammation (g + ptc >= 2) and/or C4d positivity.',
  'Allograft: Polyomavirus (BK) nephropathy': 'Tubular epithelial cells show enlarged hyperchromatic ground-glass intranuclear viral inclusions, tubular injury and lymphoplasmacytic tubulointerstitial inflammation confirmed by nuclear SV40 immunostaining.',
  'Allograft: Calcineurin inhibitor (CNI) nephrotoxicity': 'Proximal tubules show isometric cytoplasmic vacuolation and arterioles display nodular peripheral arteriolar hyalinosis (replacing medial smooth muscle cells), with or without striped cortical IFTA.'
};

export function synoptic(part, ctx) {
  const v = part.values;
  const item = (label, value) => (value !== '' && value !== null && value !== undefined ? { label, value } : null);
  const tot = int(v.glomTotal);
  const gs = int(v.glomGlobalScl);
  const ss = int(v.glomSegScl);
  const cr = int(v.glomCrescents);
  const art = int(v.arteriesCount);
  const ifta = num(v.iftaPct);
  const lm = stripDot(v.lmSummary) || DX_MORPH[v.primaryDx || ''] || '';

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
      lm ? { label: 'Light microscopy', para: `${stripDot(lm)}.` } : null,
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
