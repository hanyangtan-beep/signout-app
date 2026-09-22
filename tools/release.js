#!/usr/bin/env node
// One command to take the repo from "edited" to "ready to ship".
//
//   npm run release            full gate: lint, test, build, archive
//   npm run release -- --skip-archive
//
// Why this exists: every phase so far has been shipped by remembering the right
// sequence by hand, and the phase zips were built from the working directory, so
// they carried node_modules/ and dist/ — 33.7 MB and 3211 files for an 18 MB,
// 537-file source tree. The archive step below uses `git archive`, so it can only
// ever contain tracked files.
//
// Every step runs even if an earlier one fails, so one run tells you everything
// that is wrong rather than only the first thing.

import { execFileSync, execSync } from 'node:child_process';
import { statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const skipArchive = process.argv.includes('--skip-archive');

const steps = [];
function step(name, detail, fn) {
  const started = Date.now();
  let ok = true;
  let note = '';
  try {
    note = fn() || '';
  } catch (err) {
    ok = false;
    note = (err.stdout ? String(err.stdout) : '') + (err.stderr ? String(err.stderr) : '');
    note = note.trim().split('\n').slice(-12).join('\n') || String(err.message || err);
  }
  steps.push({ name, detail, ok, note, ms: Date.now() - started });
  process.stdout.write(`${ok ? '  ok  ' : ' FAIL '} ${name.padEnd(22)} ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
  if (!ok) process.stdout.write(note.split('\n').map((l) => '        ' + l).join('\n') + '\n');
  return ok;
}

function run(cmd, args) {
  return execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

process.stdout.write('\nrelease gate\n------------\n');

step('lint', 'eslint .', () => {
  // eslint exits non-zero only on errors, so warnings pass the gate by design.
  // eslint exits 1 when it finds errors, so read the report off the thrown result too.
  let out;
  try { out = run('npx', ['eslint', '.', '--format', 'json']); }
  catch (err) { out = String(err.stdout || ''); if (!out.trim().startsWith('[')) throw err; }
  const results = JSON.parse(out);
  const errors = results.reduce((n, r) => n + r.errorCount, 0);
  const warnings = results.reduce((n, r) => n + r.warningCount, 0);
  if (errors) throw new Error(`${errors} lint errors`);
  return `${results.length} files, 0 errors, ${warnings} warnings`;
});

step('tests', 'node --test tests/', () => {
  const out = run('node', ['--test', 'tests/']);
  const pass = (out.match(/^# pass (\d+)/m) || [])[1];
  const fail = (out.match(/^# fail (\d+)/m) || [])[1];
  if (fail && fail !== '0') throw new Error(`${fail} failing tests`);
  return `${pass} passing`;
});

// The AHK bridge script is the one artefact here that no JS test can execute, and this repo has
// already shipped one that would not load. Run the real AutoHotkey parser over it. Exit 2 means the
// Wine toolchain is absent, which is not a release failure - the note says the check was skipped.
step('ahk syntax', 'tools/validate-ahk.sh', () => {
  let out;
  try { out = run('bash', ['tools/validate-ahk.sh']); }
  catch (err) {
    if (err.status === 2) return 'skipped (no AutoHotkey toolchain in this sandbox)';
    throw new Error(String(err.stdout || err.stderr || err.message).trim().split('\n').pop());
  }
  const ok = (out.match(/^ahk ok/gm) || []).length;
  return `${ok} script${ok === 1 ? '' : 's'} parse`;
});

step('fixtures clean', 'git diff tests/fixtures', () => {
  const out = run('git', ['diff', '--name-only', '--', 'tests/fixtures']);
  if (out.trim()) {
    throw new Error(
      'golden fixtures are modified but not committed:\n' +
        out.trim() +
        '\nIf the change is deliberate, commit it with the reason in the message. If not, `git checkout -- tests/fixtures`.'
    );
  }
  return 'no uncommitted fixture drift';
});

step('browser QA', 'tools/qa-browser.js', () => {
  const out = run('node', ['tools/qa-browser.js']);
  const line = out.trim().split('\n').filter((l) => l.includes('checks')).pop();
  return line ? line.trim() : out.trim().split('\n').pop();
});

step('build', 'tools/build.js', () => {
  const out = run('node', ['tools/build.js']);
  return out.trim().split('\n').pop();
});

step('artefacts untracked', 'node_modules, dist, analysis', () => {
  const tracked = run('git', ['ls-files', 'node_modules', 'dist', 'analysis']).trim();
  if (tracked) throw new Error('build artefacts are tracked again:\n' + tracked.split('\n').slice(0, 5).join('\n'));
  return 'clean';
});

if (!skipArchive) {
  step('source archive', 'git archive HEAD', () => {
    mkdirSync(join(root, 'analysis'), { recursive: true });
    const version = run('git', ['rev-parse', '--short', 'HEAD']).trim();
    const out = join(root, 'analysis', `signout-app-${version}.zip`);
    execSync(`git archive --format=zip -o "${out}" HEAD`, { cwd: root });
    const mb = (statSync(out).size / 1024 / 1024).toFixed(1);
    const files = run('git', ['ls-files']).trim().split('\n').length;
    return `${mb} MB, ${files} tracked files → analysis/signout-app-${version}.zip`;
  });
}

const failed = steps.filter((s) => !s.ok);
process.stdout.write('------------\n');
if (failed.length) {
  process.stdout.write(`${failed.length} of ${steps.length} steps failed: ${failed.map((s) => s.name).join(', ')}\n\n`);
  process.exit(1);
}
process.stdout.write(`all ${steps.length} steps passed — safe to deploy and publish\n\n`);
