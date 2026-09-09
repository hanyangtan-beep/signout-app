// Template registry: maps schema ids to their JSON file and generator module.
// Works in the browser (fetch + dynamic import) and in Node (fs + import).

import gastric from '../generators/gastric.js?v=mtu7szsw';
import colonic from '../generators/colonic.js?v=mtu7szsw';

export const GENERATORS = { gastric, colonic };

export const TEMPLATE_IDS = ['gastric_biopsy', 'colonic_polyp'];

export async function loadSchema(id, baseUrl) {
  if (typeof window === 'undefined') {
    const { readFile } = await import('node:fs/promises');
    const url = new URL(`../schemas/${id}.json?v=mtu7szsw`, import.meta.url);
    return JSON.parse(await readFile(url, 'utf8'));
  }
  const res = await fetch(new URL(`schemas/${id}.json?v=mtu7szsw`, baseUrl || document.baseURI));
  if (!res.ok) throw new Error(`Cannot load schema ${id}: ${res.status}`);
  return res.json();
}

export async function loadAll(baseUrl) {
  const list = await Promise.all(TEMPLATE_IDS.map((id) => loadSchema(id, baseUrl)));
  const out = {};
  for (const s of list) out[s.id] = { schema: s, generator: GENERATORS[s.generator] };
  return out;
}
