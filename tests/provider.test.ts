import assert from 'node:assert/strict';
import { DataProvider } from '../src/data-provider';
import { TFile } from 'obsidian';
import { buildTreeFromFlatItems } from '../src/parser';
const block = (value: string) => 'Before\n```future-data\n' + value + '\n```\nAfter';
const item = (id: string) => ({ id, path: [id], metrics: { future: '', now: '', gap: '' }, timeline: [] });
const data = (id: string) => buildTreeFromFlatItems([item(id)]);
function host(initial: string) {
  let content = initial;
  const file = new TFile(); file.path = 'Future Plan.md';
  const vault = { getAbstractFileByPath: () => file, read: async () => content,
    process: async (_file: TFile, update: (s: string) => string) => { content = update(content); } };
  const provider = new DataProvider({ settings: { targetFilePath: file.path }, app: { vault } } as never);
  return { provider, vault, file, get: () => content, set: (s: string) => { content = s; } };
}
for (const invalid of ['not JSON', '{}', '[{"id":"x","path":null}]', '[{"id":"x","path":["x"],"metrics":{},"timeline":[]}]']) {
  const original = block(invalid), h = host(original);
  await assert.rejects(h.provider.load());
  await assert.rejects(h.provider.save(data('new')));
  assert.equal(h.get(), original);
}
{
  const original = block(JSON.stringify([item('first')])) + '\n' + block(JSON.stringify([item('second')]));
  const h = host(original);
  await assert.rejects(h.provider.load());
  // Embedded views also refuse ambiguous source at save, even if initialized directly.
  h.provider.initialize(JSON.stringify([item('second')]));
  await assert.rejects(h.provider.save(data('second-edited')));
  assert.equal(h.get(), original);
}
{
  const h = host(block(JSON.stringify([item('A')])));
  await h.provider.load(); await h.provider.save(data('A'));
  const external = block(JSON.stringify([item('external')])); h.set(external);
  // No event has reached us yet: compare-and-save must still protect the disk.
  await assert.rejects(h.provider.save(data('local')));
  assert.equal(h.get(), external);
  let errors = 0;
  await h.provider.handleFileChange(h.file, () => assert.fail('Would discard unsaved edits'), () => errors++);
  assert.equal(errors, 1);
  await h.provider.load(); await h.provider.save(data('resolved'));
  assert(h.get().includes('resolved'));
}
{
  const h = host(block(JSON.stringify([item('A')])));
  await h.provider.load(); await h.provider.save(data('A'));
  h.set(block(JSON.stringify([item('external')])));
  let updates = 0;
  await h.provider.handleFileChange(h.file, d => { assert.equal(d.categories[0].id, 'external'); updates++; });
  assert.equal(updates, 1); // No 500 ms suppression.
}
{
  const h = host(block(JSON.stringify([item('A')]))); await h.provider.load();
  const original = h.get(), process = h.vault.process;
  h.vault.process = async () => { throw new Error('Disk full'); };
  await assert.rejects(h.provider.save(data('retry')), /Disk full/);
  assert.equal(h.get(), original);
  h.vault.process = process;
  await h.provider.save(data('retry')); assert(h.get().includes('retry'));
  h.set(block(JSON.stringify([item('external')])));
  let updates = 0; await h.provider.handleFileChange(h.file, () => updates++); assert.equal(updates, 1);
}
{
  const h = host(block(JSON.stringify([item('A')]))); await h.provider.load();
  await Promise.all([h.provider.save(data('B')), h.provider.save(data('C'))]);
  assert(h.get().includes('C'));
  // An external refresh already queued before a stale local save invalidates that save.
  const external = block(JSON.stringify([item('external')])); h.set(external);
  const refresh = h.provider.handleFileChange(h.file, () => {});
  const save = h.provider.save(data('stale'));
  await refresh; await assert.rejects(save); assert.equal(h.get(), external);
}
console.log('Provider regressions passed: invalid input, ambiguous blocks, conflicts, immediate sync, failed-save recovery and queued saves preserve disk data.');
{
  const h = host(block(JSON.stringify([item('A')]))); await h.provider.load();
  const process = h.vault.process;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  h.vault.process = async (f, update) => { started(); await gate; await process(f, update); };
  const saving = h.provider.save(data('local'));
  await entered;
  const external = block(JSON.stringify([item('external-during-save')])); h.set(external);
  let errors = 0;
  const event = h.provider.handleFileChange(h.file, () => assert.fail('Local edits must remain'), () => errors++);
  release(); await assert.rejects(saving); await event;
  assert.equal(errors, 1); assert.equal(h.get(), external);
}
{
  const h = host(block(JSON.stringify([item('A')]))); await h.provider.load();
  const process = h.vault.process;
  let event: Promise<void> | undefined;
  let updates = 0;
  h.vault.process = async (f, update) => {
    await process(f, update);
    event = h.provider.handleFileChange(h.file, () => updates++);
  };
  await h.provider.save(data('B')); await event;
  assert.equal(updates, 0); // Own changes do not remount the UI.
}
// A filesystem-backed host checks byte preservation rather than only in-memory state.
{
  const { mkdtemp, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'chronostra-data-test-'));
  try {
    const path = join(dir, 'Future Plan.md');
    const h = host('');
    h.vault.read = async () => readFile(path, 'utf8');
    h.vault.process = async (_f, update) => {
      const current = await readFile(path, 'utf8');
      const next = update(current); // No disk write if validation or conflict detection fails.
      await writeFile(path, next);
    };
    const corrupt = block('{incomplete'); await writeFile(path, corrupt);
    await assert.rejects(h.provider.load()); await assert.rejects(h.provider.save(data('new')));
    assert.equal(await readFile(path, 'utf8'), corrupt);
    await writeFile(path, block(JSON.stringify([item('A')]))); await h.provider.load();
    const external = block(JSON.stringify([item('external')])); await writeFile(path, external);
    await assert.rejects(h.provider.save(data('stale')));
    assert.equal(await readFile(path, 'utf8'), external);
    await h.provider.load(); await h.provider.save(data('recovered'));
    assert.equal((await h.provider.load()).categories[0].id, 'recovered');
  } finally { await rm(dir, { recursive: true, force: true }); }
}
console.log('In-flight external edits, own-write events and filesystem-backed preservation/reload checks passed.');
{
  const h = host(block(JSON.stringify([item('A')]))); await h.provider.load();
  const external = block(JSON.stringify([item('external')])); h.set(external);
  let errors = 0;
  await h.provider.handleFileChange(h.file, () => false, () => errors++);
  assert.equal(errors, 1);
  await assert.rejects(h.provider.save(data('draft')));
  assert.equal(h.get(), external);
}
console.log('A view retaining an unsubmitted draft cannot adopt a new disk baseline and overwrite external changes.');
