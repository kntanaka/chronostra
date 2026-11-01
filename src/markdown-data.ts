import { parseDate, periodBounds } from './planning';
import type { FlatItem } from './types';

/** A note currently supports one editable block; ambiguity must never overwrite data. */
export function readFutureDataBlock(content: string): string {
  const blocks = [...content.matchAll(/^```future-data[^\S\r\n]*\r?\n([\s\S]*?)^```[^\S\r\n]*\r?$/gm)];
  if (blocks.length !== 1) throw new Error('Expected exactly one future-data block. Original file was not changed.');
  return blocks[0][1].trim();
}

export function parseFlatItems(json: string): FlatItem[] {
  const items: unknown = JSON.parse(json);
  if (!Array.isArray(items)) throw new Error('Plan data must be an array.');
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id)
      || !Array.isArray(item.path) || !item.path.length || item.path.length > 4
      || !item.path.every((part: unknown) => typeof part === 'string' && part.length > 0)
      || paths.has(JSON.stringify(item.path)) || !item.metrics
      || !['future', 'now', 'gap'].every(key => typeof item.metrics[key] === 'string')
      || !Array.isArray(item.timeline)) throw new Error('Invalid plan item. Original file was not changed.');
    ids.add(item.id); paths.add(JSON.stringify(item.path));
    if (!item.timeline.every((entry: { year?: unknown; text?: unknown } | null) => entry && typeof entry.year === 'number' && Number.isFinite(entry.year) && typeof entry.text === 'string')) throw new Error('Invalid timeline.');
    if (item.plan !== undefined) {
      if (!item.plan || !Array.isArray(item.plan.steps)) throw new Error('Invalid planned steps.');
      if (item.plan.dueDate !== undefined && (typeof item.plan.dueDate !== 'string' || !parseDate(item.plan.dueDate))) throw new Error('Invalid deadline.');
      const stepIds = new Set<string>();
      for (const step of item.plan.steps) {
        if (!step || typeof step.id !== 'string' || !step.id || stepIds.has(step.id)
          || typeof step.title !== 'string' || typeof step.date !== 'string'
          || !['date', 'week', 'month'].includes(step.period) || !['todo', 'in-progress', 'done'].includes(step.status)
          || (step.notes !== undefined && typeof step.notes !== 'string')
          || !periodBounds(step)) throw new Error('Invalid planned step.');
        if (step.startDate !== undefined || step.endDate !== undefined) {
          if (typeof step.startDate !== 'string' || typeof step.endDate !== 'string'
            || !parseDate(step.startDate) || !parseDate(step.endDate) || step.startDate > step.endDate) throw new Error('Invalid planned date range.');
        }
        stepIds.add(step.id);
      }
    }
  }
  for (const item of items) {
    if (item.path.length > 1 && !paths.has(JSON.stringify(item.path.slice(0, -1)))) throw new Error('Missing parent category or item.');
  }
  return items as FlatItem[];
}

/** Insert serialized JSON literally; dollar tokens are not replacement instructions. */
export function replaceFutureDataBlock(content: string, json: string): string {
  readFutureDataBlock(content);
  return content.replace(/^```future-data[^\S\r\n]*\r?\n[\s\S]*?^```[^\S\r\n]*\r?$/m, () => '```future-data\n' + json + '\n```');
}
