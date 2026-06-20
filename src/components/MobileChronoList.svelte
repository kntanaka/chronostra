<script lang="ts">
  import type { Commitment, FlatRow, ItemStatus } from '../types';
  import { MAX_DEPTH, effectiveScope } from '../types';

  type QuickCaptureType = 'task' | 'idea' | 'project' | 'goal';

  let {
    rows,
    allRows = rows,
    showSummaryMeta = false,
    timelineStartYear,
    timelineEndYear,
    ontoggle,
    onlabelchange,
    onmetricchange,
    onstatuschange,
    oncommitmentchange,
    ontimelinechange,
    onaddchild,
    onaddsibling,
    onduplicate,
    ondelete,
    onquickcapture,
    onfocus,
    onnoteclick,
    onunlinknote,
  }: {
    rows: FlatRow[];
    allRows?: FlatRow[];
    showSummaryMeta?: boolean;
    timelineStartYear: number;
    timelineEndYear: number;
    ontoggle: (id: string) => void;
    onlabelchange?: (id: string, newLabel: string) => void;
    onmetricchange?: (id: string, type: 'future' | 'now' | 'gap', value: string) => void;
    onstatuschange?: (id: string, value: ItemStatus) => void;
    oncommitmentchange?: (id: string, next: Commitment | undefined) => void;
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

  let openRowId = $state<string | null>(null);
  let confirmDeleteId = $state<string | null>(null);
  let timelineDraftYears = $state<Record<string, number>>({});
  let timelineDraftTexts = $state<Record<string, string>>({});
  let captureOpen = $state(false);
  let captureText = $state('');
  let captureType = $state<QuickCaptureType>('task');

  const startYear = $derived(Math.min(timelineStartYear, timelineEndYear));
  const endYear = $derived(Math.max(timelineStartYear, timelineEndYear));
  const todayRows = $derived(allRows.filter(isTodayCandidate).slice(0, 6));
  const inboxRows = $derived(allRows.filter(isInboxRow));
  const planRows = $derived(rows.filter((row) => !isInboxRow(row)));
  const mobileRows = $derived([...inboxRows, ...planRows]);

  function toggleDetails(id: string) {
    openRowId = openRowId === id ? null : id;
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
      confirmDeleteId = null;
      return;
    }
    confirmDeleteId = id;
  }

  function scopeLabel(row: FlatRow): string {
    if (row.depth === 0) return 'Category';
    const scope = effectiveScope(row.depth, row.scope) ?? 'goal';
    if (scope === 'vision') return 'Goal';
    if (scope === 'goal') return 'Project';
    return 'Task';
  }

  function rowKind(row: FlatRow): 'category' | 'vision' | 'goal' | 'step' {
    return row.depth === 0 ? 'category' : (effectiveScope(row.depth, row.scope) ?? 'goal');
  }

  function summaryText(row: FlatRow): string {
    if (!row.summary) return '';
    const descendants = Math.max(row.summary.subtreeCount - 1, 0);
    return `${descendants} items / ${row.summary.statusCounts['in-progress']} wip / ${row.summary.statusCounts.done} done / ${row.summary.linkedNotes} notes`;
  }

  function isInboxRow(row: FlatRow): boolean {
    return /^90(\b|[\s_-])/i.test(row.path[0]?.trim() ?? '');
  }

  function isTodayCandidate(row: FlatRow): boolean {
    if (row.depth === 0 || isInboxRow(row)) return false;
    if ((row.status ?? 'todo') === 'done') return false;
    return !row.hasChildren || row.status === 'in-progress' || row.depth >= 2;
  }

  function contextText(row: FlatRow): string {
    const context = row.path.slice(0, -1);
    if (context.length === 0) return scopeLabel(row);
    return context.slice(-3).join(' / ');
  }

  function timelineText(row: FlatRow): string {
    const entries = row.timeline
      .filter((entry) => entry.text.trim())
      .sort((a, b) => a.year - b.year);
    if (entries.length === 0) return '';

    const currentYear = new Date().getFullYear();
    const next = entries.find((entry) => entry.year >= currentYear) ?? entries[entries.length - 1];
    return `${next.year}: ${next.text}`;
  }

  function metaText(row: FlatRow): string {
    const parts = [contextText(row)];
    const timeline = timelineText(row);
    if (timeline) parts.push(timeline);
    if (row.commitment) parts.push(row.commitment);
    return parts.filter(Boolean).join(' / ');
  }

  function quietMetaText(row: FlatRow): string {
    const parts: string[] = [];
    if (row.status === 'in-progress') parts.push('In progress');
    const timeline = timelineText(row);
    if (timeline) parts.push(timeline);
    if (row.commitment) parts.push(row.commitment);
    return parts.join(' / ');
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
</script>

<div class="mobile-list">
  <section class="mobile-section-group mobile-tree-group">
    <div class="mobile-section-heading">
      <span>Plan</span>
      <span>{todayRows.length} today · {Math.max(inboxRows.length - 1, 0)} inbox</span>
    </div>
    {#each mobileRows as row (row.id)}
      {@const isOpen = openRowId === row.id}
      {@const timelineEntries = row.timeline.filter((entry) => entry.text.trim()).sort((a, b) => a.year - b.year)}
      <article
        class="mobile-row kind-{rowKind(row)}"
        class:is-open={isOpen}
        class:is-child={row.depth > 0}
        class:is-leaf={!row.hasChildren}
        class:kind-category={row.depth === 0}
        style:--depth={Math.min(row.depth, 2)}
      >
        {#if row.hasChildren || row.depth === 0}
          <span class="mobile-folder-mark"></span>
        {:else}
          <button
            type="button"
            class="mobile-check"
            class:is-done={(row.status ?? 'todo') === 'done'}
            aria-label={(row.status ?? 'todo') === 'done' ? 'Mark as todo' : 'Mark as done'}
            onclick={(e) => {
              e.stopPropagation();
              toggleDone(row, (row.status ?? 'todo') !== 'done');
            }}
          ></button>
        {/if}

        <div class="mobile-row-body">
          {#if row.depth === 0 || row.status === 'in-progress' || row.commitment}
            <div class="mobile-row-kicker">
              {#if row.depth === 0}
                <span>{scopeLabel(row)}</span>
              {/if}
              {#if row.status === 'in-progress'}
                <span>In progress</span>
              {/if}
              {#if row.commitment}
                <span>{row.commitment}</span>
              {/if}
            </div>
          {/if}
          <button type="button" class="mobile-label-button" onclick={() => toggleDetails(row.id)}>
            {row.label}
          </button>
          {#if isOpen && quietMetaText(row)}
            <div class="mobile-row-meta">{quietMetaText(row)}</div>
          {/if}
          {#if isOpen && row.depth === 0 && showSummaryMeta && row.summary}
            <div class="mobile-summary">{summaryText(row)}</div>
          {/if}
        </div>

        <div class="mobile-head-actions">
          {#if row.hasChildren}
            <button type="button" class="mobile-disclosure" title={row.isExpanded ? 'Collapse' : 'Expand'} onclick={() => ontoggle(row.id)}>
              {row.isExpanded ? '^' : 'v'}
            </button>
          {/if}
        </div>

        {#if isOpen && timelineEntries.length > 0}
          <div class="mobile-timeline-peek">
            {#each timelineEntries.slice(0, 3) as entry (entry.year)}
              <span>{entry.year}: {entry.text}</span>
            {/each}
          </div>
        {/if}

        {#if isOpen}
          <div class="mobile-details">
            <label class="mobile-field mobile-field-full">
              <span>Plan</span>
              <textarea rows="2" value={row.label} onchange={(e) => commitLabel(row, (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
            </label>

            <div class="mobile-field-grid">
              <label class="mobile-field">
                <span>Status</span>
                <select value={row.status ?? 'todo'} onchange={(e) => onstatuschange?.(row.id, (e.currentTarget as HTMLSelectElement).value as ItemStatus)}>
                  <option value="todo">To do</option>
                  <option value="in-progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </label>
              {#if row.depth > 0}
                <label class="mobile-field">
                  <span>Focus</span>
                  <select value={row.commitment ?? ''} onchange={(e) => {
                    const value = (e.currentTarget as HTMLSelectElement).value;
                    oncommitmentchange?.(row.id, value === '' ? undefined : value as Commitment);
                  }}>
                    <option value="">None</option>
                    <option value="must">Must</option>
                    <option value="wish">Wish</option>
                  </select>
                </label>
              {/if}
            </div>

            <div class="mobile-metrics">
              <label class="mobile-field mobile-field-full">
                <span>Future</span>
                <textarea rows="2" value={row.metrics.future} onchange={(e) => commitMetric(row, 'future', (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
              </label>
              <label class="mobile-field mobile-field-full">
                <span>Now</span>
                <textarea rows="2" value={row.metrics.now} onchange={(e) => commitMetric(row, 'now', (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
              </label>
              <label class="mobile-field mobile-field-full">
                <span>Gap</span>
                <textarea rows="2" value={row.metrics.gap} onchange={(e) => commitMetric(row, 'gap', (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
              </label>
            </div>

            <section class="mobile-section">
              <div class="mobile-section-title">Timeline</div>
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
                <div class="mobile-empty-line">No timeline entries.</div>
              {/if}
              <div class="mobile-add-timeline">
                <input
                  type="number"
                  min={startYear}
                  max={endYear}
                  value={timelineDraftYears[row.id] ?? startYear}
                  onchange={(e) => {
                    timelineDraftYears[row.id] = parseInt((e.currentTarget as HTMLInputElement).value, 10) || startYear;
                  }}
                />
                <input
                  type="text"
                  placeholder="Add milestone"
                  value={timelineDraftTexts[row.id] ?? ''}
                  oninput={(e) => {
                    timelineDraftTexts[row.id] = (e.currentTarget as HTMLInputElement).value;
                  }}
                />
                <button type="button" onclick={() => addTimelineEntry(row)}>Add</button>
              </div>
            </section>

            <div class="mobile-actions">
              <button type="button" onclick={() => onaddchild?.(row.id)} disabled={row.depth >= MAX_DEPTH}>Child</button>
              <button type="button" onclick={() => onaddsibling?.(row.id)}>Sibling</button>
              <button type="button" onclick={() => onduplicate?.(row.id)}>Duplicate</button>
              <button type="button" onclick={() => onfocus?.(row.id)}>Focus</button>
              {#if onnoteclick}
                <button type="button" onclick={() => onnoteclick(row.id)}>
                  {row.notePath ? 'Open note' : 'Create note'}
                </button>
              {/if}
              {#if row.notePath && onunlinknote}
                <button type="button" onclick={() => onunlinknote(row.id)}>Unlink note</button>
              {/if}
              <button type="button" class="danger" onclick={() => requestDelete(row.id)}>
                {confirmDeleteId === row.id ? 'Tap again to delete' : 'Delete'}
              </button>
            </div>
          </div>
        {/if}
      </article>
    {/each}
  </section>

  {#if rows.length === 0}
    <div class="mobile-empty-state">No rows match the current filters.</div>
  {/if}

  <div class="mobile-capture-dock">
    <button type="button" class="mobile-capture-button" onclick={() => { captureOpen = true; }}>
      <span>+</span>
      <strong>Capture</strong>
      <small>90 Inbox</small>
    </button>
  </div>
</div>

{#if captureOpen}
  <div class="mobile-capture-backdrop" role="presentation">
    <form
      class="mobile-capture-sheet"
      onsubmit={(e) => {
        e.preventDefault();
        submitCapture();
      }}
    >
      <div class="mobile-capture-heading">
        <span>Quick capture</span>
        <button type="button" onclick={() => { captureOpen = false; }}>Close</button>
      </div>
      <textarea
        rows="3"
        placeholder="Write a task, idea, project, or goal..."
        bind:value={captureText}
      ></textarea>
      <div class="mobile-capture-controls">
        <label>
          <span>Type</span>
          <select bind:value={captureType}>
            <option value="task">Task</option>
            <option value="idea">Idea</option>
            <option value="project">Project</option>
            <option value="goal">Goal</option>
          </select>
        </label>
        <label>
          <span>Destination</span>
          <input value="90 Inbox" readonly />
        </label>
      </div>
      <button type="submit" class="mobile-capture-save" disabled={!captureText.trim()}>
        Save to 90 Inbox
      </button>
    </form>
  </div>
{/if}

<style>
  .mobile-list {
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    max-height: calc(100dvh - 132px);
    min-height: 0;
    padding: 0 10px calc(82px + env(safe-area-inset-bottom, 0px));
    background: var(--background-primary);
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    touch-action: pan-y;
    scrollbar-width: none;
  }

  .mobile-list::-webkit-scrollbar {
    display: none;
  }

  .mobile-list *,
  .mobile-capture-backdrop *,
  .mobile-capture-sheet * {
    box-sizing: border-box;
  }

  .mobile-list button,
  .mobile-capture-backdrop button {
    appearance: none !important;
    -webkit-appearance: none !important;
    min-width: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    font: inherit;
    text-transform: none;
    letter-spacing: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-section-group {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-top: 0;
  }

  .mobile-tree-group {
    border-top: 1px solid var(--background-modifier-border);
  }

  .mobile-section-heading {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 28px;
    padding: 0 2px;
    border-bottom: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    color: var(--text-faint);
    font-size: 9px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mobile-section-heading span:first-child {
    color: var(--text-faint);
    font-weight: 600;
  }

  .mobile-row {
    --indent: calc(var(--depth) * 18px);
    position: relative;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    column-gap: 7px;
    align-items: center;
    min-height: 44px;
    border-bottom: 1px solid var(--background-modifier-border);
    padding: 5px 0 5px calc(2px + var(--indent));
    background: var(--chronostra-bg-goal);
    transition: background 0.08s ease;
  }

  .mobile-row.is-child::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(var(--indent) - 8px);
    width: 1px;
    background: var(--background-modifier-border);
    opacity: 0.7;
  }

  .mobile-row.is-child::after {
    content: '';
    position: absolute;
    top: 21px;
    left: calc(var(--indent) - 8px);
    width: 8px;
    height: 1px;
    background: var(--background-modifier-border);
    opacity: 0.7;
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

  .mobile-row-compact {
    min-height: 44px;
  }

  .mobile-row.kind-category {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    min-height: 46px;
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .mobile-row-body {
    min-width: 0;
  }

  .mobile-row-kicker {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 1px;
    color: var(--text-faint);
    font-size: 9px;
    line-height: 1.1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mobile-label-button {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    min-height: 32px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
    color: var(--text-normal) !important;
    font: inherit;
    font-size: 12.5px;
    font-weight: inherit;
    line-height: 1.25;
    overflow: hidden;
    text-align: left !important;
    word-break: break-word;
  }

  .mobile-row.kind-category .mobile-label-button,
  .mobile-row.kind-vision .mobile-label-button {
    font-size: 13px;
  }

  .mobile-row.kind-step .mobile-label-button {
    font-size: 12px;
    color: var(--text-muted);
  }

  .mobile-row-meta,
  .mobile-summary,
  .mobile-empty-line,
  .mobile-empty-state {
    color: var(--text-faint);
    font-size: 10px;
    line-height: 1.35;
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
    padding: 10px 0 12px;
  }

  .mobile-check,
  .mobile-folder-mark,
  .mobile-disclosure {
    appearance: none;
    -webkit-appearance: none;
    border: 1px solid var(--background-modifier-border);
    background: transparent;
    box-shadow: none;
    color: var(--text-muted);
  }

  .mobile-check {
    width: 24px !important;
    height: 24px !important;
    padding: 0 !important;
    margin-top: 0 !important;
    border-radius: 50%;
    position: relative;
    border-color: transparent;
  }

  .mobile-check::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 5px;
    width: 12px;
    height: 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 50%;
  }

  .mobile-check.is-done {
    border-color: transparent;
    background: transparent;
  }

  .mobile-check.is-done::before {
    border-color: var(--interactive-accent);
  }

  .mobile-check.is-done::after {
    content: '';
    position: absolute;
    left: 10px;
    top: 7px;
    width: 4px;
    height: 7px;
    border: solid var(--interactive-accent);
    border-width: 0 1px 1px 0;
    transform: rotate(45deg);
  }

  .mobile-folder-mark {
    width: 13px;
    height: 9px;
    margin: 0 0 0 5px;
    border-radius: 1px;
    border-color: var(--text-faint);
    opacity: 0.7;
  }

  .mobile-head-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .mobile-disclosure {
    width: 30px !important;
    min-width: 30px !important;
    height: 30px !important;
    padding: 0 !important;
    border-color: transparent;
    border-radius: 5px;
    font: inherit;
    color: var(--text-faint);
    font-size: 12px;
    line-height: 1;
  }

  .mobile-disclosure:hover,
  .mobile-disclosure:focus {
    border-color: var(--background-modifier-border);
    background: var(--background-secondary);
  }

  .mobile-timeline-peek {
    grid-column: 2 / -1;
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 8px 0 0;
  }

  .mobile-timeline-peek span {
    flex: 0 0 auto;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
    font-size: 11px;
    border-left: 1px solid var(--background-modifier-border);
    padding-left: 8px;
  }

  .mobile-details {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 9px 0 4px calc(18px + var(--indent));
    border-top: 1px solid var(--background-modifier-border);
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
  .mobile-timeline-edit span,
  .mobile-capture-controls span {
    color: var(--text-faint);
    font-size: 10px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .mobile-field textarea,
  .mobile-timeline-edit textarea,
  .mobile-field select,
  .mobile-add-timeline input,
  .mobile-capture-sheet textarea,
  .mobile-capture-sheet select,
  .mobile-capture-sheet input {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background: var(--background-secondary);
    color: var(--text-normal);
    font: inherit;
    font-size: 13px;
    line-height: 1.35;
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
  .mobile-add-timeline input,
  .mobile-capture-sheet select,
  .mobile-capture-sheet input {
    height: 40px;
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
    min-height: 40px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background: var(--background-secondary);
    color: var(--text-muted);
    box-shadow: none;
    font: inherit;
    font-size: 12px;
  }

  .mobile-capture-empty {
    width: 100%;
    color: var(--text-muted);
    text-align: left;
    padding: 0 12px;
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

  .mobile-capture-dock {
    position: sticky;
    left: auto;
    right: auto;
    bottom: calc(7px + env(safe-area-inset-bottom, 0px));
    z-index: 1200;
    display: flex;
    justify-content: stretch;
    padding: 12px 0 0;
    margin-top: 6px;
    border-top: none;
    background: linear-gradient(to top, var(--background-primary) 68%, transparent);
    pointer-events: auto;
  }

  .mobile-capture-button {
    appearance: none;
    -webkit-appearance: none;
    pointer-events: auto;
    width: 100%;
    min-height: 40px !important;
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0 12px !important;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    background: var(--background-secondary);
    color: var(--text-muted);
    box-shadow: none;
    font: inherit;
    text-align: left;
  }

  .mobile-capture-button span {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: transparent;
    color: var(--interactive-accent);
    font-size: 16px;
    line-height: 1;
  }

  .mobile-capture-button strong {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
  }

  .mobile-capture-button small {
    margin-left: auto;
    color: var(--text-faint);
    font-size: 10px;
    line-height: 1.2;
  }

  .mobile-capture-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1300;
    display: flex;
    align-items: flex-end;
    background: color-mix(in srgb, var(--background-primary) 30%, transparent);
  }

  .mobile-capture-sheet {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 12px calc(var(--safe-area-inset-bottom, 0px) + 12px);
    border-top: 1px solid var(--background-modifier-border);
    border-radius: 0;
    background: var(--background-primary);
  }

  .mobile-capture-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-normal);
    font-size: 12px;
    font-weight: 600;
  }

  .mobile-capture-heading button {
    min-height: 26px;
    padding: 0 8px;
    border-color: transparent;
  }

  .mobile-capture-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .mobile-capture-controls label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
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

  @media (max-width: 420px) {
    .mobile-field-grid,
    .mobile-add-timeline,
    .mobile-capture-controls {
      grid-template-columns: 1fr;
    }

    .mobile-timeline-edit {
      grid-template-columns: 1fr;
    }
  }

  :global(.workspace-leaf-content[data-type="chronostra-view"]) .mobile-list {
    height: 100%;
    max-height: none;
    flex: 1 1 auto;
  }
</style>
