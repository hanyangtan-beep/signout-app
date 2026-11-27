// Builds templates/manifest.json — the metadata-only registry the app boots from.
// Schemas and generators are then lazy-loaded on first use (src/registry.js).
//
//   node scripts/build-manifest.mjs          # write templates/manifest.json
//   import { buildManifest } from ...        # used by tests/manifest.test.js
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MANIFEST_KEYS = ['id', 'name', 'shortName', 'label', 'organ', 'system', 'kind', 'kindLabel', 'rank', 'aliases', 'match', 'version', 'generator'];
// `biomarker` was already a kind the picker groups (ROWS.top in src/picker.js, 2026-09-12) and the
// planned placeholders already used it; breast_biomarkers is the first built template to carry it.
export const KINDS = ['biopsy', 'benign resection', 'cancer resection', 'frozen', 'cytology', 'biomarker', 'generic'];
// `Biomarkers` likewise: SYSTEM_ORDER in src/picker.js has carried it since the menus were built
// and 9 planned placeholders sit in it; breast_biomarkers is the first built template there.
export const SYSTEMS = ['GI', 'Hepatobiliary', 'GU', 'Renal', 'Gynae', 'Breast', 'Thoracic', 'Head and neck', 'Skin', 'Cardiovascular', 'Lymphoid', 'Soft tissue', 'Endocrine', 'CNS', 'Frozen', 'Biomarkers', 'Cytology', 'General'];

/** One manifest entry from a schema object; throws on missing / invalid metadata. */
export function manifestEntry(schema) {
  for (const k of ['id', 'name', 'shortName', 'system', 'kind', 'version', 'generator']) {
    if (!schema[k]) throw new Error(`${schema.id || '?'}: schema is missing "${k}"`);
  }
  if (!KINDS.includes(schema.kind)) throw new Error(`${schema.id}: kind "${schema.kind}" is not one of ${KINDS.join(', ')}`);
  if (!SYSTEMS.includes(schema.system)) throw new Error(`${schema.id}: system "${schema.system}" is not one of ${SYSTEMS.join(', ')}`);
  const entry = {};
  for (const k of MANIFEST_KEYS) if (schema[k] !== undefined) entry[k] = schema[k];
  entry.label = schema.label || schema.shortName;
  entry.rank = schema.rank ?? 100;
  entry.aliases = schema.aliases || [];
  entry.generatorPath = `generators/${schema.generator}.js`;
  entry.schemaPath = `schemas/${schema.id}.json`;
  return entry;
}

export async function buildManifest(schemasDir = path.join(root, 'schemas')) {
  // `_`-prefixed files are shared partials (schemas/_shared.json), not templates; `<id>.qmh-draft.json`
  // is the scaffold's QMH element draft, left beside the schema for curation and then deleted.
  const files = (await readdir(schemasDir)).filter((f) => f.endsWith('.json') && !f.startsWith('_') && !f.endsWith('.qmh-draft.json')).sort();
  const entries = [];
  for (const f of files) entries.push(manifestEntry(JSON.parse(await readFile(path.join(schemasDir, f), 'utf8'))));
  entries.sort((a, b) => a.rank - b.rank || a.shortName.localeCompare(b.shortName));
  return { generated: 'scripts/build-manifest.mjs', count: entries.length, templates: entries };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildManifest();
  const out = path.join(root, 'templates', 'manifest.json');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${out} written (${manifest.count} templates)`);
}
