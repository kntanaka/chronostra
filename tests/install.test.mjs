import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installPlugin } from '../scripts/install-plugin.mjs';
const root = await mkdtemp(join(tmpdir(),'chronostra-install-test-'));
try {
  const dist=join(root,'dist'), target=join(root,'plugin');
  await mkdir(dist); await mkdir(target);
  const settings='{"targetFilePath":"Custom.md","expandedIds":["keep"]}';
  await writeFile(join(target,'data.json'),settings);
  for (const name of ['main.js','styles.css','manifest.json']) {
    await writeFile(join(dist,name),'new '+name); await writeFile(join(target,name),'old '+name);
  }
  await installPlugin(dist,target);
  assert.equal(await readFile(join(target,'data.json'),'utf8'),settings);
  assert.equal(await readFile(join(target,'main.js'),'utf8'),'new main.js');
  await rm(join(dist,'manifest.json')); await writeFile(join(dist,'main.js'),'partial');
  await assert.rejects(installPlugin(dist,target));
  assert.equal(await readFile(join(target,'main.js'),'utf8'),'new main.js');
  assert.equal(await readFile(join(target,'data.json'),'utf8'),settings);
  assert(!(await readdir(target)).some(name=>name.startsWith('.install-')));
} finally { await rm(root,{recursive:true,force:true}); }
console.log('Installer regressions passed: settings preserved and missing assets leave installed files untouched.');
