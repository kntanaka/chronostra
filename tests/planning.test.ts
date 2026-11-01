import assert from 'node:assert/strict';
import { resizeScheduledStep, moveScheduledStep, shiftScheduledDate, timelineDateAt, rescheduleDate, timelineColumns, timelineBar, dayOrdinal, monday, periodBounds, planningBucket, parseDate } from '../src/planning';
import { buildTreeFromFlatItems, flattenTreeToItems } from '../src/parser';
import type { FlatItem, ScheduledStep } from '../src/types';
const step = (period: ScheduledStep['period'], date: string, status: ScheduledStep['status'] = 'todo'): ScheduledStep => ({ id: 's', title: 'Make a draft', period, date, status });
assert.equal(monday('2026-01-01'), '2025-12-29');
assert.deepEqual(periodBounds(step('week', '2026-03-29')), ['2026-03-23','2026-03-29']);
assert.deepEqual(periodBounds(step('month', '2028-02')), ['2028-02-01','2028-02-29']);
assert.equal(parseDate('2026-02-30'), null);
assert.equal(periodBounds(step('month', '2026-13')), null);
assert.equal(planningBucket(step('date','2026-10-12'),'2026-10-13'),'overdue');
assert.equal(planningBucket(step('week','2026-10-12'),'2026-10-13'),'thisWeek');
assert.equal(planningBucket(step('month','2026-10'),'2026-10-13'),'thisMonth');
assert.equal(planningBucket(step('date','2026-10-25'),'2026-10-13'),'thisMonth');
assert.equal(planningBucket(step('date','2026-11-01'),'2026-10-13'),'upcoming');
assert.equal(planningBucket(step('date','2026-10-01','done'),'2026-10-13'),'completed');
assert.equal(planningBucket(step('week','2026-09-28'),'2026-10-01'),'thisWeek');
const old: FlatItem = { id:'a',path:['Art'],metrics:{future:'',now:'',gap:''},timeline:[{year:2026,text:'Publish'}] };
const planned: FlatItem = { ...old, plan:{dueDate:'2026-12-31',steps:[step('month','2026-10'), {...step('week','2026-10-12'), id:'w', notes:'Three sketches'}, {...step('date','2026-10-16'),id:'d'}]} };
for (const item of [old,planned]) {
 const roundTrip = JSON.parse(JSON.stringify(flattenTreeToItems(buildTreeFromFlatItems([item]))));
 assert.deepEqual(roundTrip,[item]);
}
console.log('Calendar boundaries, grouping, and legacy/new JSON round trips passed.');

const months = timelineColumns('2026-12-15', 'month', 3);
assert.deepEqual(months.map(c=>c.start), ['2026-12-01','2027-01-01','2027-02-01']);
assert.deepEqual(timelineColumns('2026-01-01','week',2), [{start:'2025-12-29',end:'2026-01-04'},{start:'2026-01-05',end:'2026-01-11'}]);
assert.equal(dayOrdinal('2026-03-30')-dayOrdinal('2026-03-29'),1);
const monthBar = timelineBar(step('month','2027-01'),months)!;
assert.ok(Math.abs(monthBar.left-100/3)<0.0001);
assert.ok(Math.abs(monthBar.width-100/3)<0.0001);
assert.equal(timelineBar(step('date','2026-11-30'),months),null);
const crossingBar=timelineBar(step('week','2026-12-28'),months)!;
assert.ok(crossingBar.left<100/3 && crossingBar.left+crossingBar.width>100/3);
console.log('Month/week columns, cross-year and DST-safe timeline geometry passed.');

const daily=timelineColumns('2026-12-30','date',4);
assert.deepEqual(daily.map(c=>c.start),['2026-12-30','2026-12-31','2027-01-01','2027-01-02']);
assert.equal(timelineDateAt(49.9,daily),'2027-01-01');
assert.equal(rescheduleDate(step('week','2026-10-12'),'2026-10-21'),'2026-10-19');
assert.equal(rescheduleDate(step('month','2026-10'),'2027-01-02'),'2027-01');
console.log('Daily columns and drag date snapping passed.');

assert.equal(shiftScheduledDate(step('month','2026-09'),'2026-10-15','2026-11-15'),'2026-10');
assert.equal(shiftScheduledDate(step('week','2026-10-12'),'2026-10-15','2026-10-22'),'2026-10-19');
assert.equal(shiftScheduledDate(step('date','2026-12-31'),'2026-12-31','2027-01-02'),'2027-01-02');

const ranged=resizeScheduledStep(step('week','2026-10-12'),'end','2026-10-22');
assert.deepEqual(periodBounds(ranged),['2026-10-12','2026-10-22']);
assert.deepEqual(periodBounds(resizeScheduledStep(ranged,'start','2026-10-15')),['2026-10-15','2026-10-22']);
assert.deepEqual(periodBounds(resizeScheduledStep(ranged,'start','2026-11-01')),['2026-10-22','2026-10-22']);
assert.deepEqual(periodBounds(moveScheduledStep(ranged,'2026-12-28')),['2026-12-28','2027-01-07']);
const rangeItem={...old,plan:{steps:[ranged]}};
assert.deepEqual(JSON.parse(JSON.stringify(flattenTreeToItems(buildTreeFromFlatItems([rangeItem])))),[rangeItem]);
console.log('Range resizing, minimum duration, moving and persistence passed.');

const range = (startDate:string,endDate:string,status:ScheduledStep['status']='todo'):ScheduledStep => ({...step('date',startDate,status),startDate,endDate});
assert.equal(planningBucket(range('2026-10-10','2026-10-20'),'2026-10-13'),'thisWeek');
assert.equal(planningBucket(range('2026-09-28','2026-10-15'),'2026-10-13'),'thisWeek');
assert.equal(planningBucket(range('2026-10-25','2026-11-05'),'2026-10-13'),'thisMonth');
assert.equal(planningBucket(range('2026-11-01','2026-11-15'),'2026-10-13'),'upcoming');
assert.equal(planningBucket(range('2026-10-01','2026-10-12'),'2026-10-13'),'overdue');
assert.equal(planningBucket(range('2026-10-01','2026-10-20','done'),'2026-10-13'),'completed');
assert.equal(planningBucket({...range('2026-10-10','2026-10-20'),period:'month'},'2026-10-13'),'thisWeek');
console.log('Explicit date ranges group correctly across weeks and months.');
