// Builds the static site into dist/ for deploy_website: bundled, content-named, with the offline
// copy's worker. The steps are in tools/build-lib.js (docs/specs/speed.md, Phase 79).
import { buildSite } from './build-lib.js';

const { release, files, core } = await buildSite();
console.log(`dist/ ready (build ${release}, ${Object.keys(files).length} files, ${core.length} stored on install)`);
