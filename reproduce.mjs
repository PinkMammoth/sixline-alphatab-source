#!/usr/bin/env node
// Reproduces, from public upstream sources, the modified alphaTab 1.8.4 distributed with SixLine, and checks
// the result byte for byte against the files and hashes in this package.
//
//   node reproduce.mjs              verify the source change and the distributed dist/alphaTab.core.mjs
//   node reproduce.mjs --archive    also write out/alphaTab-1.8.4-sixline-source.tar.gz: the complete,
//                                   modified alphaTab 1.8.4 source tree
//
// Needs Node.js 18+, git, npm and tar on PATH (all present on current Windows, macOS and Linux setups).
// Everything is written under ./work and ./out; nothing else is touched.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const here = import.meta.dirname;
const work = path.join(here, 'work'), out = path.join(here, 'out');
const UPSTREAM = {
  repo: 'https://github.com/CoderLine/alphaTab.git',
  tag: 'v1.8.4',
  commit: '022a45c8e42370f9e12e68949d11eada370da83d',
  npm: '@coderline/alphatab@1.8.4',
  npmIntegrity: 'sha512-VN5rfTZZWgA63Ny1aDKCp02k3Qm9CHhg4Q9AnK0kHm7G+fNDNZo36TeToPDFoJ6VpB9+AHcCrHwHFUP1tKqdsw==',
  coreSha256: '7330a805eab246bd329927e895ac46eb8eae1da4d27375c66e223c91dd1a5817',
};
const MODIFIED_CORE_SHA256 = '57b2fbdc665ba6af9d9b9ec8c07186304262fa1f1016d5ba276a3a3f99d8b12e';
const SOURCE_FILE = 'packages/alphatab/src/rendering/layout/ScoreLayout.ts';

const run = (cmd, args, cwd, env) => execFileSync(cmd, args, { cwd, env: { ...process.env, ...env }, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'], shell: process.platform === 'win32' && cmd === 'npm' }).toString().trim();
const sha = (alg, buf, enc = 'hex') => crypto.createHash(alg).update(buf).digest(enc);
const ok = (msg) => console.log(`  ok  ${msg}`);
function check(cond, msg) { if (!cond) { console.error(`  FAIL ${msg}`); process.exit(1); } ok(msg); }
const lf = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); // tolerate a CRLF checkout of this package

/** Apply a unified diff (exact context, each hunk matching once). Used for the npm file, which is not a git tree. */
function applyUnifiedDiff(text, diff) {
  const lines = diff.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('@@')) continue;
    const before = [], after = [];
    for (i++; i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('--- '); i++) {
      const tag = lines[i][0], rest = lines[i].slice(1);
      if (tag === ' ' || tag === undefined) { before.push(rest); after.push(rest); }
      else if (tag === '-') before.push(rest);
      else if (tag === '+') after.push(rest);
    }
    i--;
    while (before.length && before.at(-1) === '' && after.at(-1) === '') { before.pop(); after.pop(); }
    const from = before.join('\n'), at = text.indexOf(from);
    if (at < 0 || text.indexOf(from, at + 1) >= 0) throw new Error('patch hunk does not match exactly once');
    text = text.slice(0, at) + after.join('\n') + text.slice(at + from.length);
  }
  return text;
}

fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });

console.log(`1. Source Code Form: alphaTab ${UPSTREAM.tag} + patches/alphatab-1.8.4-src.patch`);
const clone = path.join(work, 'alphaTab');
run('git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--branch', UPSTREAM.tag, '-c', 'core.autocrlf=false', UPSTREAM.repo, clone]);
check(run('git', ['rev-parse', 'HEAD'], clone) === UPSTREAM.commit, `upstream ${UPSTREAM.tag} is commit ${UPSTREAM.commit}`);
fs.writeFileSync(path.join(work, 'src.patch'), lf(path.join(here, 'patches/alphatab-1.8.4-src.patch')));
run('git', ['apply', '--whitespace=nowarn', path.join(work, 'src.patch')], clone);
check(fs.readFileSync(path.join(clone, SOURCE_FILE), 'utf8') === lf(path.join(here, 'source', SOURCE_FILE)), `${SOURCE_FILE} equals source/${SOURCE_FILE}`);
check(run('git', ['diff', '--stat'], clone).includes('1 file changed, 6 insertions(+)'), 'the change is 6 added lines in one file, nothing removed');

console.log(`2. Distributed file: npm ${UPSTREAM.npm} + patches/alphatab-1.8.4-dist.patch`);
const tgz = run('npm', ['pack', UPSTREAM.npm, '--silent', '--pack-destination', work], work).split('\n').pop();
check(`sha512-${sha('sha512', fs.readFileSync(path.join(work, tgz)), 'base64')}` === UPSTREAM.npmIntegrity, `${tgz} matches the npm registry integrity`);
run('tar', ['-xzf', tgz], work);
const core = path.join(work, 'package/dist/alphaTab.core.mjs');
check(sha('sha256', fs.readFileSync(core)) === UPSTREAM.coreSha256, 'published dist/alphaTab.core.mjs is the expected upstream file');
const modified = applyUnifiedDiff(fs.readFileSync(core, 'utf8'), lf(path.join(here, 'patches/alphatab-1.8.4-dist.patch')));
fs.writeFileSync(core, modified);
check(sha('sha256', Buffer.from(modified, 'utf8')) === MODIFIED_CORE_SHA256, `modified dist/alphaTab.core.mjs has SHA-256 ${MODIFIED_CORE_SHA256} (the file SixLine bundles)`);

if (process.argv.includes('--archive')) {
  console.log('3. Complete modified source archive');
  fs.mkdirSync(out, { recursive: true });
  const archive = path.join(out, `alphaTab-1.8.4-sixline-source.tar.gz`);
  // a commit with fixed metadata, so the archive's file times and pax header are the same on every run
  const when = '2026-10-17T00:00:00Z', who = 'SixLine source package', mail = 'source-package@sixline.invalid';
  const env = { GIT_AUTHOR_NAME: who, GIT_AUTHOR_EMAIL: mail, GIT_AUTHOR_DATE: when, GIT_COMMITTER_NAME: who, GIT_COMMITTER_EMAIL: mail, GIT_COMMITTER_DATE: when };
  run('git', ['add', '-A'], clone);
  run('git', ['-c', 'commit.gpgsign=false', 'commit', '--quiet', '--no-verify', '-m', 'Add opt-in display.sixlineOmitInScoreAttribution (SixLine)'], clone, env);
  run('git', ['archive', '--format=tar.gz', '--prefix=alphaTab-1.8.4-sixline/', '-o', archive, 'HEAD'], clone);
  ok(`${path.relative(here, archive)} (${(fs.statSync(archive).size / 1e6).toFixed(1)} MB, SHA-256 ${sha('sha256', fs.readFileSync(archive))})`);

  // what the archive holds: exactly upstream's files, only ScoreLayout.ts changed, nothing from this machine
  const upstreamFiles = run('git', ['ls-tree', '-r', '--name-only', UPSTREAM.commit], clone).split('\n').sort();
  const listed = run('tar', ['-tzf', archive]).split(/\r?\n/).filter((p) => p && !p.endsWith('/'));
  check(listed.every((p) => p.startsWith('alphaTab-1.8.4-sixline/')), 'every archive entry is under alphaTab-1.8.4-sixline/');
  const files = listed.map((p) => p.slice('alphaTab-1.8.4-sixline/'.length)).filter((p) => p !== 'pax_global_header').sort();
  check(JSON.stringify(files) === JSON.stringify(upstreamFiles), `the archive holds exactly the ${upstreamFiles.length} files of upstream ${UPSTREAM.tag}, nothing added or removed`);
  check(run('git', ['diff', '--name-only', UPSTREAM.commit, 'HEAD'], clone) === SOURCE_FILE, `the only file whose content differs from upstream is ${SOURCE_FILE}`);
  const extracted = path.join(work, 'archive-check');
  fs.mkdirSync(extracted, { recursive: true });
  run('tar', ['-xzf', archive, '-C', extracted]);
  const local = [here, os.homedir(), os.userInfo().username].filter((s) => s.length >= 4).map((s) => Buffer.from(s));
  const leaks = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { const buf = fs.readFileSync(p); if (local.some((n) => buf.includes(n))) leaks.push(path.relative(extracted, p)); } } };
  walk(extracted);
  check(leaks.length === 0, `no local path, home directory or user name in the archive${leaks.length ? `: ${leaks.join(', ')}` : ''}`);
}
console.log('Reproduced. Work files are in ./work (safe to delete).');
