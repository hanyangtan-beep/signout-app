// Builds a standalone bundle of the CNS algorithm trial so it can be deployed as its own asset,
// separate from the sign-out app. The trial itself is not wired into the app; this only flattens
// the ../../ references so index.html can sit at the root of the deployed folder.
//
// It walks the trial's own import graph rather than copying src/ wholesale. app.js, store.js and
// gauth.js touch localStorage and the Google client, which the preview iframe rejects, and the
// trial reaches none of them.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';

const ROOT = '/home/user/workspace/signout-app';
const OUT = '/home/user/workspace/cns-trial-dist';

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const seen = new Set();
async function follow(rel) {
  if (seen.has(rel)) return;
  seen.add(rel);
  const text = await readFile(join(ROOT, rel), 'utf8');
  const dir = dirname(rel);
  for (const m of text.matchAll(/from\s+'(\.[^']+\.js)'/g)) {
    await follow(normalize(join(dir, m[1])));
  }
}
await follow('lab/cns-algorithm/trial.js');

for (const rel of seen) {
  if (rel.startsWith('lab/')) continue;
  const dest = join(OUT, rel);
  await mkdir(dirname(dest), { recursive: true });
  await cp(join(ROOT, rel), dest);
}

await mkdir(join(OUT, 'schemas'), { recursive: true });
for (const s of ['cns_tumour.json', 'cns_biopsy.json']) {
  await cp(join(ROOT, 'schemas', s), join(OUT, 'schemas', s));
}
await cp(join(ROOT, 'styles.css'), join(OUT, 'styles.css'));

for (const f of ['index.html', 'trial.js', 'trial.css', 'nodefields.js']) {
  const t = await readFile(join(ROOT, 'lab/cns-algorithm', f), 'utf8');
  await writeFile(join(OUT, f), t.replaceAll('../../', './'));
}

console.log('bundled modules:', [...seen].filter((r) => !r.startsWith('lab/')).join(' '));
