// Template registry: maps schema ids to their JSON file and generator module.
// Works in the browser (fetch + dynamic import) and in Node (fs + import).

import gastric from '../generators/gastric.js?v=mtuxyygl';
import colonic from '../generators/colonic.js?v=mtuxyygl';
import prostate from '../generators/prostate.js?v=mtuxyygl';
import ibd from '../generators/ibd.js?v=mtuxyygl';
import oesophageal from '../generators/oesophageal.js?v=mtuxyygl';
import frozen from '../generators/frozen.js?v=mtuxyygl';
import breast from '../generators/breast.js?v=mtuxyygl';
import duodenal from '../generators/duodenal.js?v=mtuxyygl';
import cervical from '../generators/cervical.js?v=mtuxyygl';
import endometrial from '../generators/endometrial.js?v=mtuxyygl';
import leep from '../generators/leep.js?v=mtuxyygl';
import lung from '../generators/lung.js?v=mtuxyygl';

export const GENERATORS = { gastric, colonic, prostate, ibd, oesophageal, frozen, breast, duodenal, cervical, endometrial, leep, lung };

export const TEMPLATE_IDS = ['gastric_biopsy', 'colonic_polyp', 'prostate_biopsy', 'ibd_biopsy', 'oesophageal_biopsy', 'frozen_section', 'breast_biopsy', 'duodenal_biopsy', 'cervical_biopsy', 'endometrial_biopsy', 'cervical_excision', 'lung_biopsy'];

export async function loadSchema(id, baseUrl) {
  if (typeof window === 'undefined') {
    const { readFile } = await import('node:fs/promises');
    const url = new URL(`../schemas/${id}.json?v=mtuxyygl`, import.meta.url);
    return JSON.parse(await readFile(url, 'utf8'));
  }
  const res = await fetch(new URL(`schemas/${id}.json?v=mtuxyygl`, baseUrl || document.baseURI));
  if (!res.ok) throw new Error(`Cannot load schema ${id}: ${res.status}`);
  return res.json();
}

export async function loadAll(baseUrl) {
  const list = await Promise.all(TEMPLATE_IDS.map((id) => loadSchema(id, baseUrl)));
  const out = {};
  for (const s of list) out[s.id] = { schema: s, generator: GENERATORS[s.generator] };
  return out;
}
