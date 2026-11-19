import type { ScheduledStep } from './types';

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return localDate(date) === value ? date : null;
}

export function monday(value: string): string {
  const date = parseDate(value);
  if (!date) return value;
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return localDate(date);
}

export function periodBounds(step: Pick<ScheduledStep, 'period' | 'date' | 'startDate' | 'endDate'>): [string, string] | null {
  if (step.startDate && step.endDate && parseDate(step.startDate) && parseDate(step.endDate) && step.startDate <= step.endDate) return [step.startDate, step.endDate];
  if (step.period === 'month') {
    if (!/^\d{4}-\d{2}$/.test(step.date)) return null;
    const start = parseDate(`${step.date}-01`);
    if (!start) return null;
    return [localDate(start), localDate(new Date(start.getFullYear(), start.getMonth() + 1, 0, 12))];
  }
  const start = parseDate(step.date);
  if (!start) return null;
  if (step.period === 'date') return [step.date, step.date];
  const first = monday(step.date);
  const end = parseDate(first)!;
  end.setDate(end.getDate() + 6);
  return [first, localDate(end)];
}

export function planningBucket(step: ScheduledStep, today = localDate()): 'overdue' | 'thisWeek' | 'thisMonth' | 'upcoming' | 'completed' {
  if (step.status === 'done') return 'completed';
  const bounds = periodBounds(step);
  if (!bounds) return 'upcoming';
  if (bounds[1] < today) return 'overdue';
  const week = periodBounds({ period: 'week', date: today })!;
  const month = periodBounds({ period: 'month', date: today.slice(0, 7) })!;
  // Month-sized commitments stay in the monthly section rather than crowding the week.
  if ((step.period !== 'month' || (step.startDate && step.endDate)) && bounds[0] <= week[1] && bounds[1] >= week[0]) return 'thisWeek';
  if (bounds[0] <= month[1] && bounds[1] >= month[0]) return 'thisMonth';
  return 'upcoming';
}

/** Calendar-day math uses UTC ordinals so DST cannot stretch timeline bars. */
export function dayOrdinal(value: string): number {
  const date = parseDate(value);
  return date ? Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000 : NaN;
}

export function timelineColumns(anchor: string, zoom: 'month' | 'week' | 'date', count: number): { start: string; end: string }[] {
  const date = parseDate(zoom === 'week' ? monday(anchor) : zoom === 'month' ? `${anchor.slice(0, 7)}-01` : anchor);
  if (!date) return [];
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(date);
    if (zoom === 'month') start.setMonth(start.getMonth() + index);
    else start.setDate(start.getDate() + index * (zoom === 'week' ? 7 : 1));
    const bounds = periodBounds({ period: zoom, date: zoom === 'month' ? localDate(start).slice(0, 7) : localDate(start) })!;
    return { start: bounds[0], end: bounds[1] };
  });
}

export function timelinePosition(value: string, columns: { start: string; end: string }[]): number {
  const day = dayOrdinal(value);
  for (let i = 0; i < columns.length; i++) {
    const start = dayOrdinal(columns[i].start);
    const end = dayOrdinal(columns[i].end) + 1;
    if (day < start) return i / columns.length * 100;
    if (day < end) return (i + (day - start) / (end - start)) / columns.length * 100;
  }
  return 100;
}

export function timelineBar(step: ScheduledStep, columns: { start: string; end: string }[]): { left: number; width: number } | null {
  const bounds = periodBounds(step);
  if (!bounds || !columns.length || bounds[1] < columns[0].start || bounds[0] > columns[columns.length - 1].end) return null;
  const after = parseDate(bounds[1])!;
  after.setDate(after.getDate() + 1);
  const left = timelinePosition(bounds[0], columns);
  return { left, width: timelinePosition(localDate(after), columns) - left };
}

/** Inverse of timelinePosition, including unequal month lengths. */
export function timelineDateAt(position: number, columns: { start: string; end: string }[]): string {
  const scaled = Math.max(0, Math.min(0.999999, position / 100)) * columns.length;
  const column = columns[Math.floor(scaled)];
  const date = parseDate(column.start)!;
  const days = dayOrdinal(column.end) - dayOrdinal(column.start) + 1;
  date.setDate(date.getDate() + Math.round((scaled % 1) * days));
  return localDate(date);
}

export function rescheduleDate(step: ScheduledStep, target: string): string {
  return step.period === 'month' ? target.slice(0, 7) : step.period === 'week' ? monday(target) : target;
}

/** Shift by the item's own unit, preserving the start of partially visible bars. */
export function shiftScheduledDate(step: ScheduledStep, from: string, to: string): string {
  const start = parseDate(periodBounds(step)![0])!;
  const origin = parseDate(from)!;
  const target = parseDate(to)!;
  if (step.period === 'month') {
    start.setMonth(start.getMonth() + (target.getFullYear() - origin.getFullYear()) * 12 + target.getMonth() - origin.getMonth());
  } else {
    const delta = dayOrdinal(to) - dayOrdinal(from);
    start.setDate(start.getDate() + (step.period === 'week' ? Math.round(delta / 7) * 7 : delta));
  }
  return rescheduleDate(step, localDate(start));
}


export function resizeScheduledStep(step: ScheduledStep, edge: 'start' | 'end', target: string): ScheduledStep {
  const [start, end] = periodBounds(step)!;
  const startDate = edge === 'start' ? (target > end ? end : target) : start;
  const endDate = edge === 'end' ? (target < start ? start : target) : end;
  return { ...step, period: 'date', date: startDate, startDate, endDate };
}

export function moveScheduledStep(step: ScheduledStep, target: string): ScheduledStep {
  if (!step.startDate || !step.endDate) return { ...step, date: target };
  const delta = dayOrdinal(target) - dayOrdinal(step.startDate);
  const end = parseDate(step.endDate)!;
  end.setDate(end.getDate() + delta);
  return { ...step, date: target, startDate: target, endDate: localDate(end) };
}
