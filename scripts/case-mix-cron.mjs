#!/usr/bin/env node
// Monthly case-mix re-ranking. Answers one question: what should the next template be?
//
//   node scripts/case-mix-cron.mjs [--months 12] [--out docs/case-mix/<YYYY-MM>.md] [--csv <export.csv>]
//
// Run it with api_credentials=["gws"] — it reads Google Drive and Sheets through the gws CLI.
//
// Two sources, neither of which needs the user to do anything:
//
//   1. The app's own "Sign-out cases" sheet. Which templates are actually being used, and
//      which were built and never touched. Always available; grows as cases are signed out.
//   2. The newest LIS case export CSV in Drive, if one is there. Which specimen types arrive
//      by volume, including the ones no template covers. Optional — the run degrades to
//      source 1 alone and says so.
//
// It writes a dated markdown report and proposes an ordering. It never edits the roadmap: the
// Next order is the user's call, and a script that reorders work behind them is worse than no
// script at all.
//
// The LIS export is PHI. It is downloaded to a temp path inside the sandbox, classified into
// aggregate counts, and deleted in a finally block. No accession, site text or patient field
// reaches the report — only category totals.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const MONTHS = Number(arg('--months', 12));
const today = new Date();
const stamp = today.toISOString().slice(0, 7);
const since = new Date(today.getFullYear(), today.getMonth() - MONTHS, today.getDate())
  .toISOString().slice(0, 10);
// Generated reports live in their own directory so they never collide with the hand-written
// analyses in docs/, which are assets the user holds.
const OUT = join(ROOT, arg('--out', `docs/case-mix/${stamp}.md`));
mkdirSync(dirname(OUT), { recursive: true });

function gws(args) {
  const raw = execFileSync('gws', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(raw);
}

const warnings = [];
const warn = (m) => { warnings.push(m); process.stderr.write(`warning: ${m}\n`); };

// ---------- source 1: the app's own sign-out log ----------

function signoutUsage() {
  let sheetId;
  try {
    const found = gws(['drive', 'files', 'list', '--params', JSON.stringify({
      q: 'name = "Sign-out cases" and trashed = false',
      pageSize: 5,
      fields: 'files(id,name,modifiedTime)'
    })]);
    sheetId = found.files?.[0]?.id;
  } catch (e) {
    warn(`could not search Drive for the sign-out sheet: ${e.message.split('\n')[0]}`);
    return null;
  }
  if (!sheetId) { warn('no "Sign-out cases" sheet in Drive — template usage is unknown this run'); return null; }

  let values;
  try {
    values = gws(['sheets', 'spreadsheets', 'values', 'get', '--params', JSON.stringify({
      spreadsheetId: sheetId, range: 'A1:H100000'
    })]).values || [];
  } catch (e) {
    warn(`could not read the sign-out sheet: ${e.message.split('\n')[0]}`);
    return null;
  }
  if (values.length < 2) { warn('the sign-out sheet has no case rows yet'); return null; }

  const head = values[0].map((h) => String(h).trim().toLowerCase());
  const iTpl = head.indexOf('template');
  const iUpd = head.indexOf('updated');
  if (iTpl < 0) { warn('the sign-out sheet has no "template" column'); return null; }

  const counts = new Map();
  let inWindow = 0;
  let total = 0;
  for (const row of values.slice(1)) {
    const tpl = (row[iTpl] || '').trim();
    if (!tpl) continue;
    total += 1;
    const when = iUpd >= 0 ? String(row[iUpd] || '').slice(0, 10) : '';
    if (when && when < since) continue;
    inWindow += 1;
    // A multi-template case logs as "a+b+c". Count each template, so "built but unused" means
    // genuinely untouched rather than only-ever-used-alongside-something-else.
    for (const one of tpl.split('+').map((x) => x.trim()).filter(Boolean)) {
      counts.set(one, (counts.get(one) || 0) + 1);
    }
  }
  return { counts, inWindow, total };
}

// ---------- source 2: the newest LIS export in Drive ----------

const CSV_MIMES = ['text/csv', 'application/vnd.google-apps.spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

function lisTally() {
  // --csv runs the same classification against a local export, for testing the report and for
  // a one-off run when the export has not been put in Drive. The file is read, never copied.
  const local = arg('--csv', null);
  if (local) {
    if (!existsSync(local)) { warn(`--csv ${local} does not exist`); return null; }
    const jsonPath = join(ROOT, 'analysis', `tally-${Date.now()}.json`);
    try {
      execFileSync('python3', [join(ROOT, 'tools', 'classify-case-export.py'), local, '--since', since, '--json', jsonPath],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const t = JSON.parse(readFileSync(jsonPath, 'utf8'));
      return { ...t, sourceName: local.split('/').pop(), sourceModified: new Date().toISOString() };
    } catch (e) {
      warn(`could not classify ${local}: ${e.message.split('\n')[0]}`);
      return null;
    } finally {
      rmSync(jsonPath, { force: true });
    }
  }

  let file;
  try {
    const q = '(name contains "export" or name contains "LIS" or name contains "caseload") and trashed = false and mimeType != "application/vnd.google-apps.folder"';
    const found = gws(['drive', 'files', 'list', '--params', JSON.stringify({
      q, pageSize: 50, orderBy: 'modifiedTime desc', fields: 'files(id,name,mimeType,modifiedTime)'
    })]);
    // Narrow deliberately. Drive's `contains` matches inside words, so a bare /lis/ picks up
    // "TAT priority list"; the name has to look like a case export, not merely mention one.
    const looksLikeExport = /(^|[^a-z])export[-_ ]?cases|cases?[-_ ]?export|caseload|(^|[^a-z])LIS([^a-z]|$)/i;
    file = (found.files || []).find((f) => CSV_MIMES.includes(f.mimeType) && looksLikeExport.test(f.name));
  } catch (e) {
    warn(`could not search Drive for an LIS export: ${e.message.split('\n')[0]}`);
    return null;
  }
  if (!file) {
    warn('no LIS case export found in Drive — specimen-type volume is not refreshed this run. Drop a CSV named like "export-cases-<date>.csv" in Drive and the next run will pick it up.');
    return null;
  }

  // Inside the workspace: gws refuses output paths outside it. Removed in the finally block.
  const dir = mkdtempSync(join(ROOT, 'analysis', 'casemix-'));
  const csv = join(dir, 'export.csv');
  try {
    if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
      gws(['drive', 'files', 'export', '--params', JSON.stringify({ fileId: file.id, mimeType: 'text/csv' }), '--output', csv]);
    } else {
      gws(['drive', 'files', 'get', '--params', JSON.stringify({ fileId: file.id, alt: 'media' }), '--output', csv]);
    }
    if (!existsSync(csv)) { warn(`the export "${file.name}" did not download`); return null; }
    const jsonPath = join(dir, 'tally.json');
    execFileSync('python3', [join(ROOT, 'tools', 'classify-case-export.py'), csv, '--since', since, '--json', jsonPath],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const t = JSON.parse(readFileSync(jsonPath, 'utf8'));
    return { ...t, sourceName: file.name, sourceModified: file.modifiedTime };
  } catch (e) {
    warn(`could not classify "${file.name}": ${e.message.split('\n')[0]}`);
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });  // PHI does not outlive the run
  }
}

// ---------- coverage ----------

// Category names come from tools/classify-case-export.py. The mapping to template ids is by
// hand because it is a clinical judgement, not a string match: "Breast" covers the biopsy, the
// excision and the carcinoma templates, and a category is only "covered" if the template that
// would actually be reached exists.
const COVER = {
  // Every category tools/classify-case-export.py can emit, in its order. A category maps to the
  // templates a case in it would actually be signed out on. An empty array means no template is
  // reached — which is the whole point of the uncovered list, so leave it empty rather than
  // reaching for `generic`.
  'Gastric biopsy': ['gastric_biopsy', 'gastric_carcinoma'],
  'Oesophageal biopsy': ['oesophageal_biopsy', 'oesophageal_carcinoma'],
  'Duodenal / small bowel biopsy': ['duodenal_biopsy'],
  'Colorectal polyp / biopsy': ['colonic_polyp', 'ibd_biopsy', 'colon_resection'],
  Appendix: ['appendix', 'appendix_carcinoma'],
  Haemorrhoid: ['generic'],
  Gallbladder: ['gallbladder', 'gallbladder_carcinoma'],
  Liver: ['liver_benign', 'liver_biopsy', 'liver_lesion_biopsy', 'hcc'],
  'Bile duct / pancreas': ['bile_duct_carcinoma', 'pancreas_carcinoma', 'ampulla_carcinoma'],
  'Lung / pleura': ['lung_biopsy', 'lung_carcinoma'],
  'Respiratory cytology': ['respiratory_cytology'],
  'Serous effusion cytology': ['effusion_cytology'],
  'Urine cytology': ['urine_cytology'],
  'CSF cytology': [],
  'Joint fluid cytology': [],
  'Cervical smear': ['cervical_cytology'],
  'Thyroid FNA': ['thyroid_fna'],
  'Lymph node FNA': ['lymph_node_fna'],
  'Salivary FNA': ['salivary_fna'],
  'Other FNA / non-gynae': [],
  Breast: ['breast_biopsy', 'breast_excision', 'breast_carcinoma', 'breast_dcis', 'phyllodes'],
  'Endometrium / curettings': ['endometrial_biopsy', 'endometrial_carcinoma'],
  'Uterus resection': ['uterus_benign', 'uterine_sarcoma'],
  'Cervix biopsy / LEEP': ['cervical_biopsy', 'cervical_excision', 'cervical_carcinoma'],
  'Ovary / fallopian tube': ['ovarian_cyst', 'ovary_ft_peritoneum', 'uterus_benign'],
  Placenta: ['placenta'],
  'Vulva / vagina': ['cervical_biopsy', 'vulval_carcinoma', 'vaginal_carcinoma'],
  Prostate: ['prostate_biopsy', 'turp', 'prostate_radical'],
  'Bladder / urothelium': ['turbt', 'bladder_carcinoma'],
  Kidney: ['renal_biopsy', 'kidney_carcinoma'],
  'Testis / penis / scrotum': ['testis_tumour', 'penile_carcinoma'],
  Skin: ['skin_excision', 'skin_cyst', 'melanoma', 'skin_scc'],
  'Soft tissue': ['soft_tissue_benign', 'soft_tissue_sarcoma'],
  'Bone / joint': ['bone_tumour', 'bone_joint'],
  'Lymph node (histology)': ['lymph_node', 'lymphoma_node'],
  'Thyroid / parathyroid': ['thyroid_benign', 'parathyroid', 'thyroid_carcinoma'],
  'Oral cavity / oropharynx': ['oral_biopsy', 'oral_carcinoma'],
  'Nasopharynx / sinonasal': ['nasopharyngeal_biopsy', 'nasal_polyps', 'nasopharyngeal_carcinoma', 'sinonasal_carcinoma'],
  'Larynx / pharynx': ['larynx_carcinoma', 'hypopharynx_oropharynx_carcinoma'],
  'Salivary gland': ['salivary_benign', 'salivary_carcinoma'],
  'Tonsil / adenoid': ['tonsils'],
  'Ear / temporal bone': [],
  'Nail / digit': ['skin_excision'],
  'Brain / CNS': ['cns_tumour', 'meningioma'],
  Cardiovascular: ['aortic_valve_aorta', 'endomyocardial_biopsy'],
  'Hernia sac': [],
  'Abscess / inflammatory': ['abscess_granulation']
};


const manifest = JSON.parse(readFileSync(join(ROOT, 'templates', 'manifest.json'), 'utf8'));
const built = new Set((Array.isArray(manifest) ? manifest : manifest.templates || []).map((t) => t.id));
const plannedRaw = JSON.parse(readFileSync(join(ROOT, 'templates', 'planned.json'), 'utf8'));
const planned = new Set((plannedRaw.planned || []).map((p) => p.id));

// ---------- report ----------

const usage = signoutUsage();
const lis = lisTally();

const L = [];
L.push(`# Case mix — ${stamp}`);
L.push('');
L.push(`Trailing ${MONTHS} months, from ${since}. Generated by \`scripts/case-mix-cron.mjs\`; it proposes an ordering and changes no roadmap.`);
L.push('');

if (lis) {
  const rows = Object.entries(lis.tally)
    .filter(([c]) => c !== 'UNCLASSIFIED')
    .sort((a, b) => b[1] - a[1]);
  const pct = (v) => `${((100 * v) / lis.total).toFixed(1)}%`;

  const uncovered = rows.filter(([c]) => (COVER[c] || []).length === 0);
  const thin = rows.filter(([c]) => {
    const ids = COVER[c] || [];
    return ids.length > 0 && ids.some((id) => !built.has(id));
  });

  L.push('## Uncovered by volume');
  L.push('');
  if (uncovered.length) {
    L.push('| Category | Cases | Share | Status |');
    L.push('| --- | ---: | ---: | --- |');
    for (const [c, v] of uncovered.slice(0, 15)) L.push(`| ${c} | ${v} | ${pct(v)} | no template |`);
  } else L.push('Every category with volume has a template.');
  L.push('');

  L.push('## Covered but thin');
  L.push('');
  L.push('A template exists for the category, but one in the pathway is still unbuilt — usually the cancer resection behind a benign or biopsy template.');
  L.push('');
  if (thin.length) {
    L.push('| Category | Cases | Share | Missing |');
    L.push('| --- | ---: | ---: | --- |');
    for (const [c, v] of thin.slice(0, 15)) {
      const missing = (COVER[c] || []).filter((id) => !built.has(id));
      L.push(`| ${c} | ${v} | ${pct(v)} | ${missing.map((m) => `\`${m}\`${planned.has(m) ? '' : ' (not planned)'}`).join(', ')} |`);
    }
  } else L.push('No gaps.');
  L.push('');

  L.push('## Full tally');
  L.push('');
  L.push('| Category | Cases | Share |');
  L.push('| --- | ---: | ---: |');
  for (const [c, v] of rows) L.push(`| ${c} | ${v} | ${pct(v)} |`);
  L.push('');
  L.push(`Source: \`${lis.sourceName}\`, modified ${String(lis.sourceModified).slice(0, 10)}. ${lis.total} cases in window; ${lis.tally.UNCLASSIFIED || 0} unclassified.`);
  L.push('');
} else {
  L.push('## Specimen-type volume');
  L.push('');
  L.push('Not refreshed this run — see the notes at the end.');
  L.push('');
}

L.push('## Template usage');
L.push('');
if (usage) {
  const used = [...usage.counts.entries()].sort((a, b) => b[1] - a[1]);
  L.push(`${usage.inWindow} of ${usage.total} logged cases fall in the window, across ${used.length} templates.`);
  L.push('');
  L.push('| Template | Cases |');
  L.push('| --- | ---: |');
  for (const [t, v] of used) L.push(`| \`${t}\` | ${v} |`);
  L.push('');
  const never = [...built].filter((id) => !usage.counts.has(id)).sort();
  L.push(`**Built but unused in the window (${never.length} of ${built.size}):** ${never.length ? never.map((n) => `\`${n}\``).join(', ') : 'none'}.`);
  L.push('');
  L.push('An unused template is not a wasted one — it may cover a specimen that simply has not arrived. Read this list against the volume table above, not on its own.');
} else {
  L.push('Not available this run — see the notes at the end.');
}
L.push('');

L.push('## Proposed ordering');
L.push('');
if (lis) {
  const candidates = Object.entries(lis.tally)
    .filter(([c]) => c !== 'UNCLASSIFIED')
    .map(([c, v]) => ({ c, v, missing: (COVER[c] || []).filter((id) => !built.has(id)), uncovered: (COVER[c] || []).length === 0 }))
    .filter((x) => x.uncovered || x.missing.length)
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);
  if (candidates.length) {
    candidates.forEach((x, i) => {
      L.push(`${i + 1}. **${x.c}** — ${x.v} cases (${((100 * x.v) / lis.total).toFixed(1)}%). ${x.uncovered ? 'No template at all.' : `Missing ${x.missing.map((m) => `\`${m}\``).join(', ')}.`}`);
    });
    L.push('');
    L.push('Ranked on measured volume alone. It does not know what is clinically urgent, what a rotation is about to change, or how hard a template is to build — weigh those yourself before pulling a card.');
  } else L.push('Nothing to propose: every category with volume is fully covered.');
} else {
  L.push('No ordering this run without volume data.');
}
L.push('');

if (warnings.length) {
  L.push('## Notes from this run');
  L.push('');
  for (const w of warnings) L.push(`- ${w}`);
  L.push('');
}

writeFileSync(OUT, `${L.join('\n')}\n`);
process.stdout.write(`${OUT} written${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''}\n`);
