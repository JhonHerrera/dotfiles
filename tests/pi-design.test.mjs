import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { applyEdits, sourceEdits, patchBundle } from '../dotfiles/pi/outline-patch.mjs';
import { install } from '../scripts/install-pi-design.mjs';

// Renderer excerpts from the unmodified Pi 1.5.0 npm package, MIT licensed.
const source = readFileSync(new URL('./fixtures/pi-1.5.0/user-message.txt', import.meta.url), 'utf8');
const bundle = readFileSync(new URL('./fixtures/pi-1.5.0/bundle-renderer.txt', import.meta.url), 'utf8');

test('patches original source and bundle, and repeated application changes nothing', () => {
  const patchedSource = applyEdits(source, sourceEdits);
  const patchedBundle = patchBundle(bundle);
  assert.notEqual(patchedSource, source);
  assert.notEqual(patchedBundle, bundle);
  assert.equal(applyEdits(patchedSource, sourceEdits), patchedSource);
  assert.equal(patchBundle(patchedBundle), patchedBundle);
  assert.match(patchedBundle, /╭/);
  assert.doesNotMatch(patchedBundle, /bgColor:/);
});

test('rejects unfamiliar and partially patched renderers', () => {
  assert.throws(() => patchBundle(bundle.replace('render(width)', 'render(columns)')), /Unrecognized/);
  assert.throws(() => patchBundle(bundle.replace(',bgColor:content=>theme.bg("userMessageBg",content)', '')), /Unrecognized/);
  assert.throws(() => patchBundle('different bundle layout'), /Cannot identify/);
});

function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'pi-design-test-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'pi');
  const agentDir = join(base, 'agent');
  const put = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };
  put(join(root, 'package.json'), JSON.stringify({ name: '@earendil-works/pi-coding-agent', version: '1.5.0', type: 'module' }));
  put(join(root, 'dist/modes/interactive/components/user-message.js'), source);
  put(join(root, 'dist/bundle/chunks/renamed-after-update.js'), bundle);
  // The real installed validator is also exercised by install-pi-design.mjs --check.
  put(join(root, 'dist/modes/interactive/theme/theme-schema.js'), 'export function validateThemeJson() {}');
  put(join(agentDir, 'settings.json'), '{"theme":"dark","defaultModel":"keep-me"}\n');
  put(join(agentDir, 'themes/prompt-blue.json'), 'old-theme');
  return { root, agentDir };
}

test('dry run writes nothing; install preserves settings, backs up, and is repeatable', async t => {
  const options = fixture(t);
  const path = join(options.agentDir, 'settings.json');
  const before = readFileSync(path, 'utf8');
  assert.equal(await install({ ...options, check: true }), 4);
  assert.equal(readFileSync(path, 'utf8'), before);
  assert.deepEqual(readdirSync(options.agentDir).sort(), ['settings.json', 'themes']);
  assert.equal(await install({ ...options, check: false }), 4);
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { theme: 'prompt-blue', defaultModel: 'keep-me' });
  const backup = readdirSync(options.agentDir).find(name => name.startsWith('settings.json.before-outline-'));
  assert.equal(readFileSync(join(options.agentDir, backup), 'utf8'), before);
  assert.equal(await install({ ...options, check: false }), 0);
});

test('unknown bundle stops installation before any files change', async t => {
  const options = fixture(t);
  writeFileSync(join(options.root, 'dist/bundle/chunks/renamed-after-update.js'), bundle.replace('render(width)', 'render(columns)'));
  await assert.rejects(install({ ...options, check: false }), /Unrecognized/);
  assert.equal(readFileSync(join(options.root, 'dist/modes/interactive/components/user-message.js'), 'utf8'), source);
  assert.equal(JSON.parse(readFileSync(join(options.agentDir, 'settings.json'), 'utf8')).theme, 'dark');
  assert(!readdirSync(options.agentDir).some(name => name.includes('before-outline')));
});
