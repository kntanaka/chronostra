<script lang="ts">
  import type { ScheduledStep } from '../types';
  import { translator, type Locale } from '../i18n';
  import { localDate, parseDate, periodBounds, timelineColumns, timelinePosition, timelineBar, timelineDateAt, dayOrdinal, resizeScheduledStep, moveScheduledStep, shiftScheduledDate, rescheduleDate } from '../planning';
  let { steps, dueDate, today, selectedId, locale, onselect, oncreate, onmove }: {
    steps: ScheduledStep[]; dueDate?: string; today: string; selectedId: string | null; locale: Locale;
    onselect: (step: ScheduledStep) => void; oncreate: (date: string, period: 'month' | 'week' | 'date') => void;
    onmove: (step: ScheduledStep, commit: boolean) => void;
  } = $props();
  const t = $derived(translator(locale));
  let zoom = $state<'month' | 'week' | 'date'>('month');
  let anchor = $state((() => today)());
  let fit = $state(false);
  const allDates = $derived([today, ...steps.flatMap(step => periodBounds(step) ?? []), ...(dueDate ? [dueDate] : [])].sort());
  const columns = $derived.by(() => {
    if (!fit) return timelineColumns(anchor, zoom, zoom === 'month' ? 6 : zoom === 'week' ? 8 : 14);
    const first = parseDate(allDates[0])!;
    const last = parseDate(allDates[allDates.length - 1])!;
    const months = (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth() + 1;
    return timelineColumns(allDates[0], 'month', months);
  });
  const currentZoom = $derived(fit ? 'month' : zoom);
  const first = $derived(columns[0]?.start ?? today);
  const last = $derived(columns.at(-1)?.end ?? today);
  function move(direction: number) {
    const date = parseDate(first)!;
    if (currentZoom === 'month') date.setMonth(date.getMonth() + direction * 6);
    else date.setDate(date.getDate() + direction * (currentZoom === 'week' ? 56 : 14));
    anchor = localDate(date); zoom = currentZoom; fit = false;
  }
  function switchZoom(next: 'month' | 'week' | 'date') {
    anchor = steps.find(step => step.id === selectedId)?.date ?? first;
    if (anchor.length === 7) anchor += '-01';
    zoom = next; fit = false;
  }
  function label(value: string) {
    const date = parseDate(value)!;
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', ...(currentZoom !== 'month' ? { day: 'numeric' } as const : {}) }).format(date);
  }
  let drag = $state<{ step: ScheduledStep; original: ScheduledStep; x: number; width: number; start: number; moved: boolean; edge?: 'start' | 'end' } | null>(null);
  let suppressClick = false;
  function startDrag(event: PointerEvent, step: ScheduledStep, edge?: 'start' | 'end') {
    if (event.button !== 0) return;
    event.stopPropagation();
    const button = event.currentTarget as HTMLButtonElement;
    const track = button.closest('.time-track') as HTMLElement;
    onselect(step);
    const rect = track.getBoundingClientRect();
    drag = { step, original: step, x: event.clientX, width: rect.width, start: (event.clientX - rect.left) / rect.width * 100, moved: false, edge };
    button.setPointerCapture(event.pointerId);
    suppressClick = false;
  }
  function moveDrag(event: PointerEvent) {
    if (!drag) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) < 5) return;
    drag.moved = true;
    const target = timelineDateAt(drag.start + delta / drag.width * 100, columns);
    if (drag.edge) {
      const endpoint = parseDate(periodBounds(drag.original)![drag.edge === 'start' ? 0 : 1])!;
      endpoint.setDate(endpoint.getDate() + dayOrdinal(target) - dayOrdinal(timelineDateAt(drag.start, columns)));
      drag.step = resizeScheduledStep(drag.original, drag.edge, localDate(endpoint));
    } else drag.step = moveScheduledStep(drag.original, shiftScheduledDate(drag.original, timelineDateAt(drag.start, columns), target));
    onmove(drag.step, false);
  }
  function finishDrag(cancel = false) {
    if (!drag) return;
    const current = drag;
    drag = null;
    suppressClick = current.moved;
    if (cancel) onmove(current.original, false);
    else if (current.moved) onmove(current.step, true);
  }
  function barKey(event: KeyboardEvent, step: ScheduledStep) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const value = parseDate(periodBounds(step)![0])!;
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    if (step.period === 'month') value.setMonth(value.getMonth() + direction);
    else value.setDate(value.getDate() + direction * (step.period === 'week' ? 7 : 1));
    const moved = moveScheduledStep(step, rescheduleDate(step, localDate(value)));
    onselect(step); onmove(moved, true);
  }

</script>
<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && drag) { e.preventDefault(); finishDrag(true); } }} />
<div class="plan-timeline">
  <div class="timeline-tools">
    <div class="zoom" aria-label={t('timelineZoom')}>
      <button type="button" aria-pressed={currentZoom === 'date'} onclick={() => switchZoom('date')}>{t('daily')}</button>
      <button type="button" aria-pressed={currentZoom === 'week'} onclick={() => switchZoom('week')}>{t('weekly')}</button>
      <button type="button" aria-pressed={currentZoom === 'month'} onclick={() => switchZoom('month')}>{t('monthly')}</button>
    </div>
    <button type="button" onclick={() => { anchor = today; fit = false; }}>{t('today')}</button>
    <button type="button" onclick={() => { fit = true; }}>{t('fitPlan')}</button>
    <div class="range-nav"><button type="button" aria-label={t('previousPeriod')} onclick={() => move(-1)}>‹</button><button type="button" aria-label={t('nextPeriod')} onclick={() => move(1)}>›</button></div>
  </div>
  <p class="range-caption">{label(first)} – {label(last)}</p>
  <p class="timeline-help">{t('timelineHelp')}</p>
  <div class="timeline-scroll" role="region" aria-label={t('planTimeline')}>
    <div class="timeline-grid" style:--track-width={Math.max(480, columns.length * (currentZoom === 'month' ? 100 : 110)) + 'px'}>
      <div class="timeline-row header"><div class="row-label">{t('schedule')}</div><div class="time-track column-headers" style:grid-template-columns={`repeat(${columns.length}, 1fr)`}>
        {#each columns as column}<button type="button" aria-label={t('addInPeriod', { period: label(column.start) })} onclick={() => oncreate(currentZoom === 'month' ? column.start.slice(0,7) : column.start, currentZoom)}>{label(column.start)}<span>+</span></button>{/each}
      </div></div>
      {#each steps as step (step.id)}
        {@const bar = timelineBar(drag?.step.id === step.id ? drag.step : step, columns)}
        <div class="timeline-row" class:selected={selectedId === step.id}>
          <button type="button" class="row-label step-label" onclick={() => onselect(step)} title={step.title}>{step.title}{#if step.status === 'done'}<small class="completion-label">✓ {t('done')}</small>{/if}<small>{t(step.period)} · {drag?.step.id === step.id ? (drag.step.startDate ? `${drag.step.startDate} – ${drag.step.endDate}` : drag.step.date) : step.startDate ? `${step.startDate} – ${step.endDate}` : step.date}</small></button>
          <div class="time-track" style:--column-count={columns.length}>
            {#if bar}
              <button type="button" class="plan-bar" class:dragging={drag?.step.id === step.id && drag.moved} class:done={step.status === 'done'} class:active={step.status === 'in-progress'} aria-pressed={selectedId === step.id} aria-label={`${t('selectScheduled', { title: step.title, date: step.date })} · ${t(step.status === 'done' ? 'done' : step.status === 'in-progress' ? 'inProgress' : 'todo')}`} title={`${step.title} · ${step.date}`} style:left={bar.left+'%'} style:width={`max(10px, ${bar.width}%)`} onpointerdown={(e) => startDrag(e, step)} onpointermove={moveDrag} onpointerup={() => finishDrag()} onpointercancel={() => finishDrag(true)} onlostpointercapture={() => finishDrag(true)} onkeydown={(e) => barKey(e, step)} onclick={() => { if (!suppressClick) onselect(step); suppressClick = false; }}></button>
              <button type="button" class="resize-handle start" aria-label={t('resizeStart', { title: step.title })} style:left={bar.left+'%'} onpointerdown={(e) => startDrag(e, step, 'start')} onpointermove={moveDrag} onpointerup={() => finishDrag()} onpointercancel={() => finishDrag(true)} onlostpointercapture={() => finishDrag(true)} onkeydown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d=parseDate(periodBounds(step)![0])!; d.setDate(d.getDate()+(e.key === 'ArrowRight' ? 1 : -1)); onselect(step); onmove(resizeScheduledStep(step,'start',localDate(d)),true); }
              }}></button>
              <button type="button" class="resize-handle end" aria-label={t('resizeEnd', { title: step.title })} style:left={`calc(${bar.left+bar.width}% - 8px)`} onpointerdown={(e) => startDrag(e, step, 'end')} onpointermove={moveDrag} onpointerup={() => finishDrag()} onpointercancel={() => finishDrag(true)} onlostpointercapture={() => finishDrag(true)} onkeydown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d=parseDate(periodBounds(step)![1])!; d.setDate(d.getDate()+(e.key === 'ArrowRight' ? 1 : -1)); onselect(step); onmove(resizeScheduledStep(step,'end',localDate(d)),true); }
              }}></button>
            {/if}
            {#if today >= first && today <= last}<span class="today-marker" style:left={timelinePosition(today, columns)+'%'}></span>{/if}
            {#if dueDate && dueDate >= first && dueDate <= last}<span class="due-marker" style:left={timelinePosition(dueDate, columns)+'%'}></span>{/if}
          </div>
        </div>
      {/each}
      {#if !steps.length}<div class="timeline-empty">{t('emptySchedule')}</div>{/if}
    </div>
  </div>
  <div aria-live="polite" class="timeline-help">{drag?.moved ? drag.step.date : t('dragHelp')}</div>
  <div class="timeline-legend"><span class="today-key">{t('today')}: {today}</span>{#if dueDate}<span class="due-key">{t('deadline')}: {dueDate}</span>{/if}</div>
</div>
<style>
.plan-timeline { min-width: 0; margin-top: 16px; }
.timeline-tools,.zoom,.range-nav { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.timeline-tools button { min-height:36px; padding:6px 10px; box-shadow:none; }
.zoom button[aria-pressed="true"] { background:var(--interactive-accent); color:var(--text-on-accent,white); }
.range-nav { margin-left:auto; }
.range-nav button { font-size:22px; min-width:36px; }
.range-caption { font-size:14px; font-weight:600; margin:14px 0 6px; }
.timeline-help,.timeline-legend { font-size:12px; color:var(--text-muted); line-height:1.5; }
.timeline-scroll { overflow:auto; max-height:60vh; border:1px solid var(--background-modifier-border); border-radius:10px; }
.timeline-grid { width:calc(180px + var(--track-width)); min-width:100%; }
.timeline-row { display:grid; grid-template-columns:180px minmax(0,1fr); min-height:68px; }
.header { position:sticky; top:0; z-index:3; min-height:56px; }
.row-label { position:sticky; left:0; z-index:2; background:var(--background-primary); border:0; border-right:1px solid var(--background-modifier-border); border-bottom:1px solid var(--background-modifier-border); padding:10px 12px; border-radius:0; text-align:left; white-space:normal; height:auto; margin:0; box-shadow:none; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:5px; font-size:13px; overflow-wrap:anywhere; }
.header .row-label { background:var(--background-secondary); }
.step-label small { font-size:11px; color:var(--text-muted); }
.selected .row-label { box-shadow:inset 3px 0 var(--interactive-accent); }
.time-track { position:relative; overflow:hidden; border-bottom:1px solid var(--background-modifier-border); background:repeating-linear-gradient(to right, transparent 0,transparent calc(100% / var(--column-count) - 1px),var(--background-modifier-border) calc(100% / var(--column-count) - 1px),var(--background-modifier-border) calc(100% / var(--column-count))); }
.column-headers { display:grid; background:var(--background-secondary); }
.column-headers button { border:0; border-right:1px solid var(--background-modifier-border); border-radius:0; font-size:12px; min-height:56px; height:auto; padding:8px; white-space:normal; box-shadow:none; }
.column-headers span { display:block; color:var(--text-accent); }
.plan-bar { touch-action:none; cursor:grab; user-select:none; position:absolute; top:14px; min-height:36px; height:36px; padding:0 6px; border:1px solid var(--interactive-accent); background:var(--interactive-accent); color:var(--text-on-accent,white); border-radius:6px; box-shadow:none; overflow:hidden; text-align:left; z-index:1; }
.plan-bar[aria-pressed="true"] { outline:2px solid var(--text-normal); outline-offset:-3px; }
.resize-handle { position:absolute; top:14px; width:8px; min-width:0; height:36px; padding:0; border:0; border-radius:3px; background:var(--text-normal); opacity:.7; z-index:3; cursor:ew-resize; touch-action:none; box-shadow:none; }
.resize-handle:focus-visible { outline:2px solid var(--text-accent); }
.plan-bar.dragging { cursor:grabbing; opacity:.8; }
.plan-bar.done { opacity:.65; background: repeating-linear-gradient(135deg, var(--interactive-accent), var(--interactive-accent) 6px, var(--background-secondary) 6px, var(--background-secondary) 8px); }
.completion-label { color: var(--text-accent); font-weight: 600; }
.plan-bar.active { border-bottom:4px solid var(--text-normal); }
.today-marker,.due-marker { position:absolute; top:0; bottom:0; width:1px; background:var(--text-accent); pointer-events:none; z-index:2; }
.due-marker { background:var(--text-error); }
.timeline-legend { display:flex; flex-wrap:wrap; gap:16px; margin-top:10px; }
.today-key { border-left:2px solid var(--text-accent); padding-left:6px; }
.due-key { border-left:2px solid var(--text-error); padding-left:6px; }
.timeline-empty { padding:24px; color:var(--text-muted); font-size:14px; }
</style>
