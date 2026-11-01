#!/usr/bin/env node
/**
 * Copy dist/ into a vault's .obsidian/plugins/chronostra (Obsidian often ignores symlinks outside the vault).
 *
 * Usage:
 *   OBSIDIAN_VAULT=/path/to/vault npm run link:vault
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { installPlugin } from './install-plugin.mjs';

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

await installPlugin(dist, target);
console.log(`Copied ${dist} → ${target}`);
console.log('Reload Obsidian, then enable Chronostra under Settings → Community plugins → Installed plugins.');
