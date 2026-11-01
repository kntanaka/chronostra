<script lang="ts">
  import PlanTimeline from './PlanTimeline.svelte';
  import { onMount } from 'svelte';
  import type { ItemPlan, ScheduledStep } from '../types';
  import { translator, type Locale } from '../i18n';
  import { localDate, monday, parseDate, periodBounds, planningBucket } from '../planning';
  let { plan, locale = 'en', desktop = false, onchange }: {
    plan?: ItemPlan; locale?: Locale; desktop?: boolean; onchange: (plan: ItemPlan) => void;
  } = $props();
  const t = $derived(translator(locale));
  let today = $state(localDate());
  onMount(() => {
    const timer = window.setInterval(() => { today = localDate(); }, 60_000);
    return () => window.clearInterval(timer);
  });
  let editing = $state(false);
  let completedOpen = $state(false);
  let stepId = $state<string | null>(null);
  let title = $state('');
  let period = $state<ScheduledStep['period']>('date');
  let date = $state(localDate());
  let startDate = $state('');
  let endDate = $state('');
  let status = $state<ScheduledStep['status']>('todo');
  let notes = $state('');
  let error = $state(false);
  let removeId = $state<string | null>(null);
  const steps = $derived([...(plan?.steps ?? [])].sort((a, b) => (periodBounds(a)?.[0] ?? a.date).localeCompare(periodBounds(b)?.[0] ?? b.date)));
  const buckets = ['overdue', 'thisWeek', 'thisMonth', 'upcoming', 'completed'] as const;
  const groupedSteps = $derived.by(() => {
    const groups: Record<(typeof buckets)[number], ScheduledStep[]> = {
      overdue: [], thisWeek: [], thisMonth: [], upcoming: [], completed: [],
    };
    for (const step of steps) groups[planningBucket(step, today)].push(step);
    return groups;
  });
  function revealEditor(node: HTMLElement) {
    if (!desktop) node.scrollIntoView({ block: 'nearest' });
  }
  function edit(step?: ScheduledStep) {
    stepId = step?.id ?? null;
    title = step?.title ?? '';
    period = step?.period ?? 'date';
    date = step?.date ?? today;
    startDate = step?.startDate ?? '';
    endDate = step?.endDate ?? '';
    status = step?.status ?? 'todo';
    notes = step?.notes ?? '';
    error = false;
    removeId = null;
    editing = true;
  }
  function changePeriod(next: ScheduledStep['period']) {
    date = next === 'month' ? date.slice(0, 7) : date.length === 7 ? `${date}-01` : date;
    period = next;
    startDate = ''; endDate = '';
  }
  function save() {
    if (!title.trim() || !periodBounds({ period, date }) || ((startDate || endDate) && (!parseDate(startDate) || !parseDate(endDate) || startDate > endDate))) { error = true; return; }
    const step: ScheduledStep = {
      id: stepId ?? crypto.randomUUID(), title: title.trim(), period,
      date: startDate || (period === 'week' ? monday(date) : date), status,
      ...(startDate && endDate ? { period: 'date' as const, startDate, endDate } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    onchange({ ...plan, steps: stepId ? (plan?.steps ?? []).map(s => s.id === stepId ? step : s) : [...(plan?.steps ?? []), step] });
    editing = false;
  }
  function toggleDone(step: ScheduledStep) {
    const nextStatus = step.status === 'done' ? 'todo' : 'done';
    if (stepId === step.id) status = nextStatus;
    onchange({ ...plan, steps: (plan?.steps ?? []).map(s => s.id === step.id ? { ...s, status: nextStatus } : s) });
  }
  function remove(id: string) {
    if (removeId !== id) { removeId = id; return; }
    onchange({ ...plan, steps: (plan?.steps ?? []).filter(s => s.id !== id) });
    editing = false;
    removeId = null;
  }
  function displayDate(value: string) {
    const parsed = parseDate(value);
    return parsed ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(parsed) : value;
  }
  function dateLabel(step: ScheduledStep) {
    return step.startDate && step.endDate ? `${step.startDate} – ${step.endDate}` : step.period === 'week' ? t('weekOf', { date: monday(step.date) }) : step.date;
  }
</script>
<section class="plan-schedule" class:desktop>
  <div class="deadline">
    <label><span>{t('deadline')}</span><input aria-label={t('deadline')} type="date" value={plan?.dueDate ?? ''}
      onchange={(e) => { const value = e.currentTarget.value; if (!value || parseDate(value)) onchange({ steps: plan?.steps ?? [], ...(value ? { dueDate: value } : {}) }); }} /></label>
    {#if !plan?.dueDate}<small>{t('noDeadline')}</small>{:else if plan.dueDate < today}<small class="late">{t('deadlinePast')}</small>{/if}
  </div>
  <div class="planning-columns">
    <div class="agenda">
      <div class="schedule-heading"><h3>{t('schedule')}</h3><button type="button" onclick={() => edit()}>{t('newStep')}</button></div>
      {#if steps.length === 0}<p class="muted">{t('emptySchedule')}</p>{/if}
      {#if desktop}
        <PlanTimeline {steps} dueDate={plan?.dueDate} {today} selectedId={editing ? stepId : null} {locale} onselect={(step) => { if (!editing || stepId !== step.id) edit(step); }} onmove={(step, commit) => {
          if (stepId === step.id) { date = step.date; period = step.period; startDate = step.startDate ?? ''; endDate = step.endDate ?? ''; }
          if (commit) onchange({ ...plan, steps: (plan?.steps ?? []).map(existing => existing.id === step.id ? { ...existing, date: step.date, period: step.period, startDate: step.startDate, endDate: step.endDate } : existing) });
        }} oncreate={(value, unit) => { edit(); date = value; period = unit; }} />
      {:else}
      {#each buckets as bucket}
        {@const entries = groupedSteps[bucket]}
        {#if entries.length || bucket === 'thisWeek' || bucket === 'thisMonth'}
          <section class="period-group" class:completed-group={bucket === 'completed'}>
            {#if bucket === 'completed'}
              <h4><button type="button" class="completed-toggle" aria-expanded={completedOpen} onclick={() => { completedOpen = !completedOpen; }}>
                <span class="chevron" class:expanded={completedOpen} aria-hidden="true">›</span>{t(bucket)} <span>{entries.length}</span>
              </button></h4>
            {:else}<h4 class:late={bucket === 'overdue'}>{t(bucket)} <span>{entries.length}</span></h4>{/if}
            {#if bucket !== 'completed' || completedOpen}
            {#if !entries.length}<p class="muted">{t('emptyPeriod')}</p>{/if}
            {#each entries as step (step.id)}
              <div class="planned-card" class:selected={editing && stepId === step.id}>
              <button type="button" class="planned-step" onclick={() => edit(step)}>
                <strong>{step.title}</strong>
                {#if step.startDate && step.endDate}
                  <span class="range-dates">
                    <span><small>{t('startDate')}</small><time datetime={step.startDate}>{displayDate(step.startDate)}</time></span>
                    <span><small>{t('endDate')}</small><time datetime={step.endDate}>{displayDate(step.endDate)}</time></span>
                  </span>
                  {#if step.status !== 'done' && step.startDate <= today && step.endDate >= today}<small class="period-current">{t('currentPeriod')}</small>{/if}
                {:else}<small>{t(step.period)} · {dateLabel(step)}</small>{/if}
                <span>{t(step.status === 'done' ? 'done' : step.status === 'in-progress' ? 'inProgress' : 'todo')}</span>
                {#if step.notes}<p>{step.notes}</p>{/if}
              </button>
              <button type="button" class="complete-step" aria-label={`${t(step.status === 'done' ? 'markTodo' : 'markDone')}: ${step.title}`} onclick={() => toggleDone(step)}>
                <span aria-hidden="true">{step.status === 'done' ? '✓' : '○'}</span>{t(step.status === 'done' ? 'markTodo' : 'markDone')}
              </button>
              </div>
            {/each}
            {/if}
          </section>
        {/if}
      {/each}
      {/if}
    </div>
    {#if editing}
      <form class="step-editor" use:revealEditor onsubmit={(e) => { e.preventDefault(); save(); }}>
        <h3>{t(stepId ? 'editStep' : 'newStep')}</h3>
        <label>{t('stepTitle')}<textarea rows="2" bind:value={title} required></textarea></label>
        <div class="field-pair">
          <label>{t('period')}<select value={period} onchange={(e) => changePeriod(e.currentTarget.value as ScheduledStep['period'])}>
            <option value="month">{t('month')}</option><option value="week">{t('week')}</option><option value="date">{t('date')}</option>
          </select></label>
          {#if !startDate && !endDate}<label>{t('date')}{#if period === 'month'}<input type="month" bind:value={date} required />{:else}<input type="date" bind:value={date} required />{/if}</label>{/if}
        </div>
        <div class="field-pair">
          <label>{t('startDate')}<input type="date" value={startDate} oninput={(e) => { startDate = e.currentTarget.value; }} onchange={(e) => { startDate = e.currentTarget.value; }} /></label>
          <label>{t('endDate')}<input type="date" value={endDate} oninput={(e) => { endDate = e.currentTarget.value; }} onchange={(e) => { endDate = e.currentTarget.value; }} min={startDate || undefined} /></label>
        </div>
        <small>{t('rangeHint')}</small>
        {#if period === 'week'}<small>{t('weekHint')}</small>{/if}
        <label>{t('status')}<select bind:value={status}><option value="todo">{t('todo')}</option><option value="in-progress">{t('inProgress')}</option><option value="done">{t('done')}</option></select></label>
        <label>{t('stepNotes')}<textarea rows="4" bind:value={notes}></textarea></label>
        {#if error}<p class="late" role="alert">{t('invalidStep')}</p>{/if}
        <div class="editor-actions"><button type="submit" class="mod-cta">{t('saveStep')}</button><button type="button" onclick={() => { editing = false; }}>{t('cancel')}</button></div>
        {#if stepId}<button type="button" class="late" onclick={() => remove(stepId!)}>{t(removeId === stepId ? 'confirmDelete' : 'removeStep')}</button>{/if}
      </form>
    {:else if desktop}<aside class="editor-placeholder">{t('selectStep')}</aside>
    {/if}
  </div>
</section>
<style>
  .plan-schedule { margin: 24px 0; min-width: 0; }
  .deadline { padding: 16px; border: 1px solid var(--background-modifier-border); border-radius: 12px; margin-bottom: 24px; }
  label { display: flex; flex-direction: column; gap: 8px; min-width: 0; font-size: 14px; }
  .deadline label { font-weight: 600; }
  input, select, textarea { width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; font: inherit; }
  .plan-schedule:not(.desktop) input, .plan-schedule:not(.desktop) select, .plan-schedule:not(.desktop) textarea { font-size: 16px; }
  input, select, button { min-height: 44px; }
  input[type="date"], input[type="month"] { appearance: none; -webkit-appearance: none; display: block; }
  input::-webkit-date-and-time-value { min-width: 0; text-align: left; }
  textarea { resize: vertical; padding: 10px; }
  .planning-columns { display: flex; flex-direction: column; gap: 24px; }
  .desktop .planning-columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(240px, 300px); align-items: start; }
  .editor-placeholder { padding: 20px; border: 1px dashed var(--background-modifier-border); border-radius: 12px; color: var(--text-muted); font-size: 14px; line-height: 1.6; }
  .agenda { min-width: 0; }
  .schedule-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  h3 { margin: 0; font-size: 18px; }
  h4 { display: flex; gap: 8px; margin: 20px 0 10px; font-size: 14px; }
  h4 span, .muted, small { color: var(--text-muted); }
  .muted { font-size: 14px; line-height: 1.5; }
  .completed-group { margin-top: 24px; border-top: 1px solid var(--background-modifier-border); }
  .completed-group h4 { margin: 8px 0; }
  .completed-toggle { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 0; border: 0; background: transparent; box-shadow: none; text-align: left; font: inherit; color: var(--text-muted); }
  .chevron { display: inline-block; font-size: 22px; line-height: 1; }
  .chevron.expanded { transform: rotate(90deg); }
  .planned-card { margin: 8px 0; border: 1px solid var(--background-modifier-border); border-radius: 10px; overflow: hidden; background: var(--background-secondary); }
  .complete-step { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: 0; border-top: 1px solid var(--background-modifier-border); border-radius: 0; box-shadow: none; background: transparent; color: var(--text-accent); font-size: 14px; }
  .planned-step { display: flex; flex-direction: column; align-items: stretch; gap: 6px; text-align: left; width: 100%; height: auto; padding: 14px; margin: 0; white-space: normal; overflow-wrap: anywhere; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
  .planned-step .range-dates { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; margin: 4px 0; padding: 10px 0; border-top: 1px solid var(--background-modifier-border); border-bottom: 1px solid var(--background-modifier-border); }
  .range-dates > span { display: flex; flex-direction: column; gap: 4px; }
  .range-dates small { font-size: 11px; }
  .range-dates time { font-size: 14px; line-height: 1.5; color: var(--text-normal); font-weight: 500; }
  .period-current { color: var(--text-accent); }
  .planned-card.selected { border-color: var(--interactive-accent); }
  .planned-step strong { font-size: 16px; font-weight: 600; }
  .planned-step span { font-size: 12px; color: var(--text-muted); }
  .planned-step p { margin: 0; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
  .step-editor { display: flex; flex-direction: column; gap: 16px; padding: 16px; background: var(--background-secondary); border-radius: 12px; min-width: 0; }
  .step-editor { order: -1; }
  .desktop .step-editor { order: 0; position: sticky; top: 0; }
  .field-pair { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .editor-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .late { color: var(--text-error); }
  button { white-space: normal; height: auto; }
</style>
