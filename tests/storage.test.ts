import assert from 'node:assert/strict';
import { replaceFutureDataBlock } from '../src/markdown-data';

const prefix = '# Before\nKeep this paragraph.\n';
const suffix = '\n# After\nKeep this too.\n';
const original = prefix + '```future-data\n[]\n```' + suffix;
for (const value of ['$&', '$$', '$`', "$'", '$1 $<name>', '日本語\n二行目\n<script>alert(1)</script>', '```future-data\n[]\n```']) {
  const items = [{ id: 'test', path: ['Category', value], metrics: { future: value, now: '', gap: '' }, timeline: [], plan: { steps: [{ id: 'step', title: value, notes: value, date: '2026-11-01', period: 'date', status: 'todo' }] } }];
  const json = JSON.stringify(items, null, 2);
  const saved = replaceFutureDataBlock(original, json);
  assert.equal(saved, prefix + '```future-data\n' + json + '\n```' + suffix);
  const block = saved.match(/```future-data\s*\n([\s\S]*?)\n```/)!;
  assert.deepEqual(JSON.parse(block[1]), items);
  assert.equal(replaceFutureDataBlock(saved, json), saved);
}
assert.throws(() => replaceFutureDataBlock('No data block', '[]'));
const second = '\n```future-data\n[{"id":"untouched"}]\n```';
assert.throws(() => replaceFutureDataBlock(original + second, '[]'));
console.log('Markdown storage: dollar tokens, Unicode, multiline notes, surrounding content and repeat saves passed.');
