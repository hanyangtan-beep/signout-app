// Copies the static site into dist/ for deploy_website. No bundling; ES modules are served as-is.
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const item of ['index.html', 'styles.css', 'favicon.svg', 'src', 'schemas', 'generators', 'snippets']) {
  try { await cp(path.join(root, item), path.join(dist, item), { recursive: true }); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
}
console.log('dist/ ready');
