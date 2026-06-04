#!/usr/bin/env node
/**
 * Copy dist/ into a vault's .obsidian/plugins/chronostra (Obsidian often ignores symlinks outside the vault).
 *
 * Usage:
 *   OBSIDIAN_VAULT=/path/to/vault npm run link:vault
 */
import { cp, mkdir, rm, access } from 'fs/promises';
import { constants } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const defaultVault = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../obsidian-vault'
);

const vault = process.env.OBSIDIAN_VAULT ?? defaultVault;
if (!vault) {
  console.error('Set OBSIDIAN_VAULT to your Obsidian vault path, e.g.:');
  console.error('  OBSIDIAN_VAULT=~/path/to/vault npm run link:vault');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const target = resolve(vault, '.obsidian/plugins/chronostra');

try {
  await access(dist, constants.R_OK);
} catch {
  console.error('dist/ not found. Run npm run build first.');
  process.exit(1);
}

await mkdir(resolve(vault, '.obsidian/plugins'), { recursive: true });

try {
  await rm(target, { recursive: true, force: true });
} catch {
  // ignore
}

await cp(dist, target, { recursive: true });
console.log(`Copied ${dist} → ${target}`);
console.log('Reload Obsidian, then enable Chronostra under Settings → Community plugins → Installed plugins.');
