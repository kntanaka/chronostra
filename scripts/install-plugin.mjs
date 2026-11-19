import { copyFile, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

/** Stage every asset before replacing anything; user settings are never touched. */
export async function installPlugin(dist, target) {
  await mkdir(target, { recursive: true });
  const stage = await mkdtemp(join(target, '.install-'));
  const assets = ['main.js', 'styles.css', 'manifest.json'];
  try {
    for (const name of assets) await copyFile(join(dist, name), join(stage, name));
    for (const name of assets) await rename(join(stage, name), join(target, name));
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
