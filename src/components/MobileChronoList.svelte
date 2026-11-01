<script lang="ts">
  import { presentDetails } from '../actions/present-details';
  import { translator, type Locale } from '../i18n';
  import PlanSchedule from './PlanSchedule.svelte';
  import type { ItemPlan } from '../types';
  import type { Commitment, FlatRow, ItemStatus } from '../types';
  import { MAX_DEPTH, effectiveScope } from '../types';

  type QuickCaptureType = 'task' | 'idea' | 'project' | 'goal';

  let {
    locale = 'en',
    rows,
    disclosureStyle = 'plain',
    allRows: suppliedAllRows,
    matchingRows: suppliedMatchingRows,
    showSummaryMeta = false,
    timelineStartYear,
    timelineEndYear,
    ontoggle,
    onlabelchange,
    onmetricchange,
    onstatuschange,
    oncommitmentchange,
    ontimelinechange,
    onplanchange,
    onaddchild,
    onaddsibling,
    onduplicate,
    ondelete,
    onquickcapture,
    onfocus,
    onnoteclick,
    onunlinknote,
  }: {
    locale?: Locale;
    rows: FlatRow[];
    disclosureStyle?: 'plain' | 'circle' | 'label';
    allRows?: FlatRow[];
    matchingRows?: FlatRow[];
    showSummaryMeta?: boolean;
    timelineStartYear: number;
    timelineEndYear: number;
    ontoggle: (id: string) => void;
    onlabelchange?: (id: string, newLabel: string) => void;
    onmetricchange?: (id: string, type: 'future' | 'now' | 'gap', value: string) => void;
    onstatuschange?: (id: string, value: ItemStatus) => void;
    oncommitmentchange?: (id: string, next: Commitment | undefined) => void;
    onplanchange?: (id: string, plan: ItemPlan) => void;
    ontimelinechange?: (id: string, year: number, text: string) => void;
    onaddchild?: (id: string) => void;
    onaddsibling?: (id: string) => void;
    onduplicate?: (id: string) => void;
    ondelete?: (id: string) => void;
    onquickcapture?: (draft: { label: string; type: QuickCaptureType }) => void;
    onfocus?: (id: string) => void;
    onnoteclick?: (id: string) => void;
    onunlinknote?: (id: string) => void;
  } = $props();

  const allRows = $derived(suppliedAllRows ?? rows);
  const matchingRows = $derived(suppliedMatchingRows ?? allRows);
  const t = $derived(translator(locale));

  let section = $state<'must' | 'plan' | 'inbox'>('must');

  function focusRow(id: string) {
    openRowId = null;
    section = 'plan';
    onfocus?.(id);
  }

  let openRowId = $state<string | null>(null);
  let confirmDeleteId = $state<string | null>(null);
  let timelineDraftYears = $state<Record<string, number>>({});
  let timelineDraftTexts = $state<Record<string, string>>({});
  let captureOpen = $state(false);
  let captureText = $state('');
  let captureType = $state<QuickCaptureType>('task');

  const startYear = $derived(Math.min(timelineStartYear, timelineEndYear));
  const endYear = $derived(Math.max(timelineStartYear, timelineEndYear));
  const inboxRows = $derived(matchingRows.filter((row) => isInboxRow(row) && row.depth > 0));
  const mustRows = $derived(matchingRows.filter((row) => row.commitment === 'must'));
  const displayedRows = $derived(section === 'must' ? mustRows : section === 'inbox' ? inboxRows : rows);
  const sectionTitle = $derived(section === 'must' ? t('priorities') : section === 'inbox' ? t('inbox') : t('all'));

  const detailRow = $derived(allRows.find((row) => row.id === openRowId));

  function openDetails(id: string) {
    openRowId = id;
    confirmDeleteId = null;
  }

  function commitLabel(row: FlatRow, value: string) {
    const next = value.trim();
    if (next && next !== row.label) {
      onlabelchange?.(row.id, next);
    }
  }

  function commitMetric(row: FlatRow, type: 'future' | 'now' | 'gap', value: string) {
    if (value !== row.metrics[type]) {
      onmetricchange?.(row.id, type, value);
    }
  }

  function commitTimeline(row: FlatRow, year: number, value: string) {
    ontimelinechange?.(row.id, year, value);
  }

  function addTimelineEntry(row: FlatRow) {
    const year = timelineDraftYears[row.id] ?? startYear;
    const text = (timelineDraftTexts[row.id] ?? '').trim();
    if (!text) return;
    ontimelinechange?.(row.id, year, text);
    timelineDraftTexts[row.id] = '';
  }

  function requestDelete(id: string) {
    if (confirmDeleteId === id) {
      ondelete?.(id);
      openRowId = null;
      confirmDeleteId = null;
      return;
    }
    confirmDeleteId = id;
  }

  function scopeLabel(row: FlatRow): string {
    if (row.depth === 0) return t('category');
    const scope = effectiveScope(row.depth, row.scope) ?? 'goal';
    if (scope === 'vision') return t('goal');
    if (scope === 'goal') return t('project');
    return t('task');
  }

  function rowKind(row: FlatRow): 'category' | 'vision' | 'goal' | 'step' {
    return row.depth === 0 ? 'category' : (effectiveScope(row.depth, row.scope) ?? 'goal');
  }

  function summaryText(row: FlatRow): string {
    if (!row.summary) return '';
    const descendants = Math.max(row.summary.subtreeCount - 1, 0);
    return t('summary', { count: descendants, progress: row.summary.statusCounts['in-progress'], done: row.summary.statusCounts.done, notes: row.summary.linkedNotes });
  }

  function isInboxRow(row: FlatRow): boolean {
    return /^90(\b|[\s_-])/i.test(row.path[0]?.trim() ?? '');
  }

  function contextText(row: FlatRow): string {
    const context = row.path.slice(0, -1);
    if (context.length === 0) return scopeLabel(row);
    return context.slice(-3).join(' / ');
  }

  function toggleDone(row: FlatRow, checked: boolean) {
    onstatuschange?.(row.id, checked ? 'done' : 'todo');
  }

  function submitCapture() {
    const label = captureText.trim();
    if (!label) return;
    onquickcapture?.({ label, type: captureType });
    captureText = '';
    captureType = 'task';
    captureOpen = false;
  }

  function syncCaptureViewport(node: HTMLElement) {
    const viewport = window.visualViewport;

    const update = () => {
      const top = viewport?.offsetTop ?? 0;
      const height = viewport?.height ?? window.innerHeight;
      node.style.setProperty('--capture-viewport-top', `${top}px`);
      node.style.setProperty('--capture-viewport-height', `${height}px`);
    };

    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return {
      destroy() {
        viewport?.removeEventListener('resize', update);
        viewport?.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
      },
    };
  }

</script>

<div class="mobile-list">
  <nav class="mobile-sections" aria-label={t('sections')}>
    <button type="button" aria-pressed={section === 'must'} onclick={() => { section = 'must'; }}>{t('priorities')}</button>
    <button type="button" aria-pressed={section === 'plan'} onclick={() => { section = 'plan'; }}>{t('all')}</button>
    <button type="button" aria-pressed={section === 'inbox'} onclick={() => { section = 'inbox'; }}>{t('inbox')}</button>
  </nav>
  <section class="mobile-section-group">
    <div class="mobile-section-heading">
      <span>{sectionTitle}</span>
      <span>{t('itemCount', { count: displayedRows.length })}</span>
    </div>
    {#each displayedRows as row (row.id)}
      <article
        class="mobile-row kind-{rowKind(row)}"
        class:kind-category={row.depth === 0}
        style:--depth={section === 'plan' ? Math.min(row.depth, 2) : 0}
      >
        {#if row.depth > 0}
          <button
            type="button"
            class="mobile-check"
            aria-pressed={(row.status ?? 'todo') === 'done'}
            class:is-done={(row.status ?? 'todo') === 'done'}
            aria-label={(row.status ?? 'todo') === 'done' ? t('markTodo') : t('markDone')}
            onclick={(e) => {
              e.stopPropagation();
              toggleDone(row, (row.status ?? 'todo') !== 'done');
            }}
          ></button>
        {/if}

        <div class="mobile-row-body">
          {#if row.status === 'in-progress'}
            <div class="mobile-row-kicker">{t('inProgress')}</div>
          {/if}
          <button type="button" class="mobile-label-button" aria-haspopup="dialog" onclick={() => openDetails(row.id)}>
            {row.label}
          </button>
          {#if section !== 'plan'}<div class="mobile-row-meta">{contextText(row)}</div>{:else if row.commitment === 'must'}<div class="mobile-row-meta">{t('priorities')}</div>{/if}
          {#if showSummaryMeta && row.summary}
            <div class="mobile-summary">{summaryText(row)}</div>
          {/if}
        </div>

        <div class="mobile-head-actions">
          {#if section === 'plan' && row.hasChildren}
            <button type="button" class="mobile-disclosure mobile-expand" class:expand-circle={disclosureStyle === 'circle'} class:expand-label={disclosureStyle === 'label'} aria-label={row.isExpanded ? t('close') : t('open')} aria-expanded={row.isExpanded} onclick={() => ontoggle(row.id)}>
              <span class="expand-surface">
                  {#if disclosureStyle === 'label'}
                    <span>{row.isExpanded ? t('close') : t('open')}</span>
                  {/if}
                  <svg class:is-expanded={row.isExpanded} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
                </span>
            </button>
          {/if}

          {#if section !== 'plan'}
            <button type="button" class="mobile-disclosure" aria-label={t('viewDetails')} aria-haspopup="dialog" onclick={() => openDetails(row.id)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </button>
          {/if}
        </div>

      </article>
    {/each}
  </section>

  {#if displayedRows.length === 0}
    <div class="mobile-empty-state">
      {section === 'must' ? t('emptyPriorities') : section === 'inbox' ? t('emptyInbox') : t('emptyResults')}
    </div>
  {/if}

  <div class="mobile-capture-dock" class:detail-open={openRowId !== null}>
    <button type="button" class="mobile-capture-button" onclick={() => { captureOpen = true; }}>
      <span aria-hidden="true">+</span>
      <strong>{t('add')}</strong>
    </button>
  </div>
</div>


{#if detailRow}
  {@const row = detailRow}
  {@const descendants = allRows.filter((child) => child.parentIds.includes(row.id))}
  {@const timelineEntries = row.timeline.filter((entry) => entry.text.trim()).sort((a, b) => a.year - b.year)}
  <dialog class="mobile-detail-screen" aria-label={row.label} use:presentDetails onclose={() => { openRowId = null; confirmDeleteId = null; }}>
    <header class="mobile-detail-nav">
      <button type="button" class="mobile-back" onclick={() => { openRowId = null; confirmDeleteId = null; }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
        {t('back', { section: sectionTitle })}
      </button>
      <span>{t('details')}</span>
    </header>
    <div class="mobile-detail-content">
      <div class="mobile-detail-context">{contextText(row)}</div>
      <h2>{row.label}</h2>
      <div class="mobile-detail-status">{row.status === 'done' ? t('done') : row.status === 'in-progress' ? t('inProgress') : t('todo')}{row.commitment === 'must' ? ` · ${t('priorities')}` : ''}</div>
          <div class="mobile-details">
            {#key row.id}<PlanSchedule plan={row.plan} {locale} onchange={(plan) => onplanchange?.(row.id, plan)} />{/key}
            <dl class="mobile-reading">
              <div><dt>{t('future')}</dt><dd>{row.metrics.future || t('notWritten')}</dd></div>
              <div><dt>{t('now')}</dt><dd>{row.metrics.now || t('notWritten')}</dd></div>
              <div><dt>{t('gap')}</dt><dd>{row.metrics.gap || t('notWritten')}</dd></div>
            </dl>
            {#if timelineEntries.length > 0}
              <section class="mobile-reading">
                <h3>{t('timeline')}</h3>
                {#each timelineEntries as entry (entry.year)}
                  <p><strong>{entry.year}</strong><br />{entry.text}</p>
                {/each}
              </section>
            {/if}
            {#if descendants.length > 0}
              <section class="mobile-reading">
                <h3>{t('children')}</h3>
                <ul>{#each descendants as child (child.id)}
                  <li><span>{child.status === 'done' ? t('done') : child.status === 'in-progress' ? t('inProgress') : t('todo')}</span> {child.label}</li>
                {/each}</ul>
              </section>
            {/if}
            {#if row.notePath && onnoteclick}
              <button type="button" class="mobile-note-button" onclick={() => onnoteclick?.(row.id)}>{t('relatedNote')}</button>
            {/if}
            <details class="mobile-edit-fields">
              <summary>{t('edit')}</summary>
            <label class="mobile-field mobile-field-full">
              <span>{t('itemName')}</span>
              <textarea rows="2" value={row.label} onchange={(e) => commitLabel(row, (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
            </label>

            <div class="mobile-field-grid">
              <label class="mobile-field">
                <span>{t('status')}</span>
                <select value={row.status ?? 'todo'} onchange={(e) => onstatuschange?.(row.id, (e.currentTarget as HTMLSelectElement).value as ItemStatus)}>
                  <option value="todo">{t('todo')}</option>
                  <option value="in-progress">{t('inProgress')}</option>
                  <option value="done">{t('done')}</option>
                </select>
              </label>
              {#if row.depth > 0}
                <label class="mobile-field">
                  <span>{t('priority')}</span>
                  <select value={row.commitment ?? ''} onchange={(e) => {
                    const value = (e.currentTarget as HTMLSelectElement).value;
                    oncommitmentchange?.(row.id, value === '' ? undefined : value as Commitment);
                  }}>
                    <option value="">{t('none')}</option>
                    <option value="must">{t('priorities')}</option>
                    <option value="wish">{t('wish')}</option>
                  </select>
                </label>
              {/if}
            </div>

            <div class="mobile-metrics">
              <label class="mobile-field mobile-field-full">
                <span>{t('future')}</span>
                <textarea rows="2" value={row.metrics.future} onchange={(e) => commitMetric(row, 'future', (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
              </label>
              <label class="mobile-field mobile-field-full">
                <span>{t('now')}</span>
                <textarea rows="2" value={row.metrics.now} onchange={(e) => commitMetric(row, 'now', (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
              </label>
              <label class="mobile-field mobile-field-full">
                <span>{t('gap')}</span>
                <textarea rows="2" value={row.metrics.gap} onchange={(e) => commitMetric(row, 'gap', (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
              </label>
            </div>

            <section class="mobile-section">
              <div class="mobile-section-title">{t('timeline')}</div>
              {#if timelineEntries.length > 0}
                <div class="mobile-timeline-list">
                  {#each timelineEntries as entry (entry.year)}
                    <label class="mobile-timeline-edit">
                      <span>{entry.year}</span>
                      <textarea rows="2" value={entry.text} onchange={(e) => commitTimeline(row, entry.year, (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
                    </label>
                  {/each}
                </div>
              {:else}
                <div class="mobile-empty-line">{t('emptyTimeline')}</div>
              {/if}
              <div class="mobile-add-timeline">
                <input
                  type="number"
                  aria-label={t('milestoneYear')}
                  min={startYear}
                  max={endYear}
                  value={timelineDraftYears[row.id] ?? startYear}
                  onchange={(e) => {
                    timelineDraftYears[row.id] = parseInt((e.currentTarget as HTMLInputElement).value, 10) || startYear;
                  }}
                />
                <input
                  type="text"
                  aria-label={t('milestoneText')}
                  placeholder={t('addMilestone')}
                  value={timelineDraftTexts[row.id] ?? ''}
                  oninput={(e) => {
                    timelineDraftTexts[row.id] = (e.currentTarget as HTMLInputElement).value;
                  }}
                />
                <button type="button" onclick={() => addTimelineEntry(row)}>{t('add')}</button>
              </div>
            </section>

            <div class="mobile-actions">
              <button type="button" onclick={() => onaddchild?.(row.id)} disabled={row.depth >= MAX_DEPTH}>{t('addChild')}</button>
              <button type="button" onclick={() => onaddsibling?.(row.id)}>{t('addSibling')}</button>
              <button type="button" onclick={() => onduplicate?.(row.id)}>{t('duplicate')}</button>
              <button type="button" onclick={() => focusRow(row.id)}>{t('focusItem')}</button>
              {#if onnoteclick}
                <button type="button" onclick={() => onnoteclick(row.id)}>
                  {row.notePath ? t('openNote') : t('createNote')}
                </button>
              {/if}
              {#if row.notePath && onunlinknote}
                <button type="button" onclick={() => onunlinknote(row.id)}>{t('unlinkNote')}</button>
              {/if}
              <button type="button" class="danger" onclick={() => requestDelete(row.id)}>
                {confirmDeleteId === row.id ? t('confirmDelete') : t('delete')}
              </button>
            </div>
            </details>
          </div>

    </div>
  </dialog>
{/if}

{#if captureOpen}
  <div class="mobile-capture-backdrop" role="presentation" use:syncCaptureViewport>
    <form
      class="mobile-capture-sheet"
      onsubmit={(e) => {
        e.preventDefault();
        submitCapture();
      }}
    >
      <div class="mobile-capture-heading">
        <span>{t('captureTitle')}</span>
        <button type="button" onclick={() => { captureOpen = false; }}>{t('close')}</button>
      </div>
      <textarea
        rows="3"
        aria-label={t('captureLabel')}
        placeholder={t('capturePlaceholder')}
        bind:value={captureText}
      ></textarea>
      <p class="mobile-capture-hint">{t('captureHint')}</p>
      <button type="submit" class="mobile-capture-save" disabled={!captureText.trim()}>
        {t('addToInbox')}
      </button>
    </form>
  </div>
{/if}

<style>
  .mobile-detail-screen {
    position: fixed;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    max-width: none;
    max-height: none;
    border: none;
    border-radius: 0;
    background: var(--background-primary);
    color: var(--text-normal);
    overflow: clip;
    font-family: var(--font-interface);
  }
  .mobile-detail-screen[open] { display: flex; flex-direction: column; }
  .mobile-detail-screen::backdrop { background: transparent; }
  :global(.preview-active) .mobile-detail-screen { border-radius: 24px; }
  .mobile-detail-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 16px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .mobile-detail-nav > span { color: var(--text-muted); font-size: 13px; }
  .mobile-back {
    display: flex; align-items: center; gap: 4px;
    min-height: 44px; padding: 0;
    background: transparent; border: none; box-shadow: none;
    color: var(--interactive-accent); font-size: 15px;
  }
  .mobile-detail-content {
    flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
    padding: 24px 20px calc(32px + env(safe-area-inset-bottom, 0px));
  }
  .mobile-detail-content h2 { margin: 8px 0 12px; font-size: 24px; line-height: 1.4; overflow-wrap: anywhere; }
  .mobile-detail-context, .mobile-detail-status { color: var(--text-muted); font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
  .mobile-detail-status { margin-bottom: 24px; }

  .mobile-sections {
    display: grid;
    grid-template-columns: 1.3fr 1fr 1fr;
    gap: 3px;
    padding: 3px;
    border-radius: 12px;
    background: var(--background-modifier-border);
  }
  .mobile-sections button {
    min-height: 44px;
    padding: 0 8px;
    border: none;
    border-radius: 9px;
    background: transparent;
    box-shadow: none;
    color: var(--text-muted);
    font-size: 15px;
    font-weight: 600;
  }
  .mobile-sections button[aria-pressed="true"] {
    background: var(--background-primary);
    color: var(--text-normal);
    box-shadow: 0 1px 3px var(--background-modifier-box-shadow);
  }
  .mobile-list {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 16px 88px;
    background: var(--background-secondary);
  }

  :global(body.is-phone) .mobile-list {
    padding-bottom: calc(88px + var(--navbar-height, 0px) + var(--navbar-bottom-offset, 0px));
  }

  .mobile-section-group {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-top: 0;
    border: 1px solid var(--background-modifier-border);
    border-radius: 16px;
    overflow: hidden;
    background: var(--background-primary);
  }

  .mobile-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 48px;
    padding: 0 16px;
    border-bottom: 1px solid var(--background-modifier-border);
    color: var(--text-faint);
    font-size: 12px;
    letter-spacing: normal;
    text-transform: none;
  }

  .mobile-section-heading span:first-child {
    color: var(--text-faint);
    font-weight: 600;
  }

  .mobile-row {
    --indent: calc(var(--depth) * 8px);
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    column-gap: 4px;
    align-items: start;
    border-bottom: 1px solid var(--background-modifier-border);
    padding: 8px 8px 8px calc(4px + var(--indent));
    background: var(--chronostra-bg-goal);
    transition: background 0.08s ease;
  }

  .mobile-row:hover,
  .mobile-row:focus-within {
    background: var(--background-secondary);
  }

  .mobile-row.kind-category {
    background: var(--chronostra-bg-category);
    font-weight: 700;
  }

  .mobile-row.kind-vision {
    background: var(--chronostra-bg-vision);
    font-weight: 600;
  }

  .mobile-row.kind-goal {
    background: var(--chronostra-bg-goal);
    font-weight: 500;
  }

  .mobile-row.kind-step {
    background: var(--chronostra-bg-step);
    font-weight: 400;
  }

  .mobile-row.kind-category {
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 10px 8px 10px 16px;
  }

  .mobile-row-body {
    min-width: 0;
  }

  .mobile-row-kicker {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 2px;
    color: var(--text-faint);
    font-size: 11px;
    letter-spacing: normal;
    text-transform: none;
  }

  .mobile-label-button {
    display: block;
    height: auto;
    white-space: normal;
    overflow-wrap: anywhere;
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    min-height: 44px;
    padding: 0;
    border: none;
    border-radius: 10px;
    box-shadow: none;
    background: transparent;
    color: var(--text-normal);
    font: inherit;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.5;
    text-align: left;
    word-break: break-word;
  }

  .mobile-row.kind-category .mobile-label-button,
  .mobile-row.kind-vision .mobile-label-button {
    font-size: 17px;
    font-weight: 600;
  }

  .mobile-row.kind-step .mobile-label-button {
    font-size: 17px;
    color: var(--text-normal);
  }

  .mobile-row-meta,
  .mobile-summary,
  .mobile-empty-line,
  .mobile-empty-state {
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.45;
  }

  .mobile-row-meta {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mobile-empty-line,
  .mobile-empty-state {
    padding: 16px;
  }

  .mobile-check,
  .mobile-disclosure {
    appearance: none;
    -webkit-appearance: none;
    border: 1px solid var(--background-modifier-border);
    background: transparent;
    box-shadow: none;
    color: var(--text-muted);
  }

  .mobile-check {
    position: relative;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: 12px;
  }

  .mobile-check::before {
    content: '';
    position: absolute;
    inset: 11px;
    border: 1.5px solid var(--text-faint);
    border-radius: 50%;
  }

  .mobile-check.is-done::before {
    border-color: var(--interactive-accent);
    background: var(--interactive-accent);
  }

  .mobile-check.is-done::after {
    content: '';
    position: absolute;
    left: 19px;
    top: 15px;
    width: 5px;
    height: 9px;
    border: solid var(--text-on-accent);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .mobile-head-actions {
    align-self: center;
    display: flex;
    flex-direction: column;
    gap: 0;
    flex-shrink: 0;
  }

  .mobile-disclosure {
    min-width: 44px;
    height: 44px;
    border-color: transparent;
    border-radius: 10px;
    font: inherit;
    font-size: 11px;
  }

  .mobile-disclosure:hover,
  .mobile-disclosure:focus {
    border-color: var(--background-modifier-border);
    background: var(--background-secondary);
  }

  .mobile-expand {
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    color: var(--text-muted);
  }
  .expand-surface {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .expand-surface svg {
    flex: 0 0 auto;
  }
  .expand-surface svg.is-expanded {
    transform: rotate(90deg);
  }
  .expand-circle .expand-surface {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--background-modifier-hover);
  }
  .expand-label {
    padding-inline: 8px;
    color: var(--interactive-accent);
    font-size: 13px;
  }

  .mobile-reading { margin: 0; color: var(--text-normal); font-size: 16px; line-height: 1.6; }
  .mobile-reading div + div { margin-top: 16px; }
  .mobile-reading dt, .mobile-reading h3 { margin: 0 0 6px; color: var(--text-muted); font-size: 13px; font-weight: 600; }
  .mobile-reading dd, .mobile-reading p { margin: 0 0 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .mobile-reading ul { margin: 0; padding-left: 20px; }
  .mobile-reading li { margin-bottom: 10px; overflow-wrap: anywhere; }
  .mobile-reading li span { color: var(--text-muted); font-size: 12px; }
  .mobile-edit-fields summary { min-height: 44px; padding-block: 12px; color: var(--interactive-accent); }
  .mobile-edit-fields[open] > :global(*) { margin-bottom: 12px; }
  .mobile-note-button { min-height: 44px; white-space: normal; }
  .mobile-capture-hint { margin: 0; color: var(--text-muted); font-size: 13px; line-height: 1.5; }
  .mobile-details {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px 0 4px;
  }

  .mobile-field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .mobile-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  .mobile-field-full {
    grid-column: 1 / -1;
  }

  .mobile-field span,
  .mobile-section-title,
  .mobile-timeline-edit span {
    color: var(--text-faint);
    font-size: 12px;
    letter-spacing: 0.05em;
    text-transform: none;
  }

  .mobile-field textarea,
  .mobile-timeline-edit textarea,
  .mobile-field select,
  .mobile-add-timeline input,
  .mobile-capture-sheet textarea {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;
    background: var(--background-primary);
    color: var(--text-normal);
    font: inherit;
    font-size: 16px;
    line-height: 1.5;
    box-shadow: none;
    outline: none;
  }

  .mobile-field textarea,
  .mobile-timeline-edit textarea,
  .mobile-capture-sheet textarea {
    min-height: 68px;
    padding: 7px 8px;
    resize: vertical;
  }

  .mobile-field select,
  .mobile-add-timeline input {
    height: 44px;
    padding: 0 8px;
  }

  .mobile-metrics,
  .mobile-section,
  .mobile-timeline-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .mobile-timeline-edit {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 8px;
    align-items: start;
  }

  .mobile-add-timeline {
    display: grid;
    grid-template-columns: 74px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .mobile-add-timeline button,
  .mobile-actions button,
  .mobile-capture-heading button,
  .mobile-capture-empty,
  .mobile-capture-save {
    appearance: none;
    -webkit-appearance: none;
    min-height: 44px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;
    background: transparent;
    color: var(--text-muted);
    box-shadow: none;
    font: inherit;
    font-size: 12px;
  }

  .mobile-capture-empty {
    width: 100%;
    color: var(--text-muted);
    text-align: left;
    padding: 0 16px;
    border-color: transparent;
  }

  .mobile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mobile-actions .danger {
    color: var(--text-error, var(--text-muted));
  }

  .mobile-actions button:disabled {
    opacity: 0.4;
  }

  .mobile-capture-dock.detail-open { visibility: hidden; pointer-events: none; }

  .mobile-capture-dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1200;
    display: flex;
    justify-content: stretch;
    padding: 10px 16px calc(var(--safe-area-inset-bottom, 0px) + 6px);
    border-top: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    pointer-events: auto;
  }

  :global(body.is-phone) .mobile-capture-dock {
    bottom: max(
      0px,
      calc(var(--navbar-height, 0px) + var(--navbar-bottom-offset, 0px) - var(--keyboard-height, 0px) - 2px)
    );
    padding-bottom: 6px;
  }

  .mobile-capture-button {
    appearance: none;
    -webkit-appearance: none;
    pointer-events: auto;
    width: 100%;
    min-height: 48px;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;
    background: transparent;
    color: var(--text-muted);
    box-shadow: none;
    font: inherit;
    text-align: center;
  }

  .mobile-capture-button span {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 10px;
    background: transparent;
    color: var(--interactive-accent);
    font-size: 16px;
    line-height: 1;
  }

  .mobile-capture-button strong {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
  }

  .mobile-capture-backdrop {
    position: fixed;
    top: var(--capture-viewport-top, 0px);
    right: 0;
    left: 0;
    height: var(--capture-viewport-height, 100dvh);
    z-index: 1300;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
    background: color-mix(in srgb, var(--background-primary) 30%, transparent);
  }

  .mobile-capture-sheet {
    width: 100%;
    box-sizing: border-box;
    max-height: calc(var(--capture-viewport-height, 100dvh) - 8px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scroll-padding-bottom: 12px;
    padding: 20px 16px calc(var(--safe-area-inset-bottom, 0px) + 12px);
    border-top: 1px solid var(--background-modifier-border);
    border-radius: 24px 24px 0 0;
    background: var(--background-primary);
  }

  .mobile-capture-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-normal);
    font-size: 18px;
    font-weight: 600;
  }

  .mobile-capture-heading button {
    min-height: 44px;
    padding: 0 8px;
    border-color: transparent;
  }

  .mobile-capture-save {
    background: transparent;
    color: var(--text-normal);
    border-color: var(--background-modifier-border);
    font-weight: 500;
  }

  .mobile-capture-save:disabled {
    opacity: 0.45;
  }

  .mobile-capture-button,
  .mobile-capture-save {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: transparent;
  }

  .mobile-capture-button span {
    color: inherit;
  }

  .mobile-list button:focus-visible,
  .mobile-details :is(input, textarea, select):focus-visible,
  .mobile-capture-sheet :is(button, input, textarea, select):focus-visible {
    outline: 2px solid var(--interactive-accent);
    outline-offset: 2px;
  }

  .mobile-row:last-child {
    border-bottom: none;
  }

  @container (max-width: 360px) {
    .mobile-field-grid,
    .mobile-add-timeline,
    .mobile-timeline-edit {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 360px) {
    .mobile-field-grid,
    .mobile-add-timeline {
      grid-template-columns: 1fr;
    }

    .mobile-timeline-edit {
      grid-template-columns: 1fr;
    }
  }
</style>
