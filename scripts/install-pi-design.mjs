#!/usr/bin/env node
import { accessSync, constants, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, copyFileSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyEdits, sourceEdits, bundleMarker, patchBundle } from '../dotfiles/pi/outline-patch.mjs';

export const designDir = fileURLToPath(new URL('../dotfiles/pi/', import.meta.url));

export function findPiRoot() {
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    const executable = join(directory, 'pi');
    try { accessSync(executable, constants.X_OK); } catch { continue; }
    let root = dirname(realpathSync(executable));
    while (dirname(root) !== root) {
      const manifest = join(root, 'package.json');
      if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name === '@earendil-works/pi-coding-agent') return root;
      root = dirname(root);
    }
  }
  throw new Error('Cannot locate an npm Pi installation on PATH. Use --pi-root PATH.');
}

export function parseArgs(args) {
  const options = { check: false, root: undefined, agentDir: process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi/agent') };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') options.check = true;
    else if (arg === '--pi-root' || arg === '--agent-dir') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing path after ${arg}`);
      options[arg === '--pi-root' ? 'root' : 'agentDir'] = resolve(args[++i]);
    } else throw new Error(`Unknown option: ${arg}`);
  }
  options.root ??= findPiRoot();
  return options;
}

export function rendererFiles(root) {
  const chunks = join(root, 'dist/bundle/chunks');
  const files = readdirSync(chunks).filter(name => name.endsWith('.js')).map(name => join(chunks, name))
    .filter(path => readFileSync(path, 'utf8').includes(bundleMarker));
  if (files.length === 0) throw new Error('No compatible bundled user-message renderer found. No files changed.');
  return files;
}

export async function install({ root, agentDir, check }) {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (manifest.name !== '@earendil-works/pi-coding-agent') throw new Error('The selected directory is not Pi.');
  const sourcePath = join(root, 'dist/modes/interactive/components/user-message.js');
  const source = readFileSync(sourcePath, 'utf8');
  // Build and validate the entire plan before changing any files.
  const updates = [{ path: sourcePath, before: source, after: applyEdits(source, sourceEdits) }];
  for (const path of rendererFiles(root)) {
    const before = readFileSync(path, 'utf8');
    updates.push({ path, before, after: patchBundle(before) });
  }
  const themeText = readFileSync(join(designDir, 'themes/prompt-blue.json'), 'utf8');
  const validator = await import(pathToFileURL(join(root, 'dist/modes/interactive/theme/theme-schema.js')));
  validator.validateThemeJson('prompt-blue', JSON.parse(themeText));
  const themePath = join(agentDir, 'themes/prompt-blue.json');
  updates.push({ path: themePath, before: existsSync(themePath) ? readFileSync(themePath, 'utf8') : null, after: themeText });
  const settingsPath = join(agentDir, 'settings.json');
  const before = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : null;
  const settings = before === null ? {} : JSON.parse(before);
  if (!settings || Array.isArray(settings) || typeof settings !== 'object') throw new Error('Pi settings must be a JSON object.');
  if (settings.theme !== 'prompt-blue') {
    settings.theme = 'prompt-blue';
    updates.push({ path: settingsPath, before, after: JSON.stringify(settings, null, 2) + '\n' });
  }
  const changes = updates.filter(entry => entry.before !== entry.after);
  console.log(`Pi ${manifest.version}: ${changes.length} file(s) ${check ? 'would change' : 'to update'}.`);
  const stamp = new Date().toISOString().replaceAll(':', '-');
  for (const { path, before, after } of changes) {
    console.log(`${check ? 'Would update' : 'Updating'} ${path}`);
    if (check) continue;
    mkdirSync(dirname(path), { recursive: true });
    if (before !== null) copyFileSync(path, `${path}.before-outline-${stamp}`, constants.COPYFILE_EXCL);
    writeFileSync(path, after);
  }
  if (!check) console.log('Design installed. Restart Pi, or use pi -c to continue your session.');
  return changes.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await install(parseArgs(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
