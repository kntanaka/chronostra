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
  let actionRowId = $state<string | null>(null);
  let swipedRowId = $state<string | null>(null);
  let suppressNextClickId = $state<string | null>(null);
  let rowGesture = $state<{
    id: string;
    startX: number;
    startY: number;
    moved: boolean;
    longPressTimer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const startYear = $derived(Math.min(timelineStartYear, timelineEndYear));
  const endYear = $derived(Math.max(timelineStartYear, timelineEndYear));
  const todayRows = $derived(allRows.filter(isTodayCandidate).slice(0, 6));
  const inboxRows = $derived(allRows.filter(isInboxRow));
  const planRows = $derived(rows.filter((row) => !isInboxRow(row)));
  const actionRow = $derived(actionRowId ? allRows.find((row) => row.id === actionRowId) : undefined);

  function toggleDetails(id: string) {
    openRowId = openRowId === id ? null : id;
    confirmDeleteId = null;
    swipedRowId = null;
  }

  function handleLabelClick(row: FlatRow, action: () => void) {
    if (suppressNextClickId === row.id) {
      suppressNextClickId = null;
      return;
    }
    action();
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
      actionRowId = null;
      swipedRowId = null;
      return;
    }
    confirmDeleteId = id;
  }

  function deleteImmediately(id: string) {
    ondelete?.(id);
    if (openRowId === id) openRowId = null;
    if (confirmDeleteId === id) confirmDeleteId = null;
    if (actionRowId === id) actionRowId = null;
    if (swipedRowId === id) swipedRowId = null;
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

  function isGestureIgnored(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && !!target.closest(
      'input, textarea, select, .mobile-check, .mobile-disclosure, .mobile-swipe-delete, .mobile-actions, .mobile-capture-button'
    );
  }

  function clearRowGesture() {
    if (rowGesture) {
      clearTimeout(rowGesture.longPressTimer);
      rowGesture = null;
    }
  }

  function handleRowPointerDown(e: PointerEvent, row: FlatRow) {
    if (e.pointerType === 'mouse' || isGestureIgnored(e.target)) return;
    clearRowGesture();
    const timer = setTimeout(() => {
      actionRowId = row.id;
      swipedRowId = null;
      suppressNextClickId = row.id;
      confirmDeleteId = null;
      if ('vibrate' in navigator) navigator.vibrate?.(8);
    }, 520);
    rowGesture = {
      id: row.id,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      longPressTimer: timer,
    };
  }

  function handleRowPointerMove(e: PointerEvent, row: FlatRow) {
    if (!rowGesture || rowGesture.id !== row.id) return;
    const dx = e.clientX - rowGesture.startX;
    const dy = e.clientY - rowGesture.startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      rowGesture.moved = true;
      clearTimeout(rowGesture.longPressTimer);
    }
    if (Math.abs(dy) > 36) return;
    if (dx < -44) {
      swipedRowId = row.id;
      confirmDeleteId = null;
    } else if (dx > 24 && swipedRowId === row.id) {
      swipedRowId = null;
    }
  }

  function handleRowPointerUp() {
    clearRowGesture();
  }

  function closeActionSheet() {
    suppressNextClickId = null;
    actionRowId = null;
    confirmDeleteId = null;
  }

  function handleActionBackdropClick(e: MouseEvent) {
    if (e.currentTarget === e.target) closeActionSheet();
  }

  function runAction(action: () => void) {
    action();
    closeActionSheet();
    swipedRowId = null;
  }
</script>

<div class="mobile-list">
  <section class="mobile-section-group">
    <div class="mobile-section-heading">
      <span>Today</span>
      <span>{todayRows.length} open</span>
    </div>
    {#if todayRows.length > 0}
      {#each todayRows as row (row.id)}
        <article
          class="mobile-row mobile-row-compact kind-{rowKind(row)}"
          class:is-swiped={swipedRowId === row.id}
          style:--depth={Math.min(row.depth, 2)}
          onpointerdown={(e) => handleRowPointerDown(e, row)}
          onpointermove={(e) => handleRowPointerMove(e, row)}
          onpointerup={handleRowPointerUp}
          onpointercancel={handleRowPointerUp}
        >
          <button type="button" class="mobile-swipe-delete" aria-label="Delete" onclick={() => deleteImmediately(row.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
            </svg>
          </button>
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
          <div class="mobile-row-body">
            <button type="button" class="mobile-label-button" onclick={() => handleLabelClick(row, () => onfocus?.(row.id))}>
              {row.label}
            </button>
            <div class="mobile-row-meta">{metaText(row)}</div>
          </div>
          <button type="button" class="mobile-disclosure" title="Focus row" onclick={() => onfocus?.(row.id)}>
            &gt;
          </button>
        </article>
      {/each}
    {:else}
      <div class="mobile-empty-line">No open next actions.</div>
    {/if}
  </section>

  <section class="mobile-section-group mobile-inbox-group">
    <div class="mobile-section-heading">
      <span>90 Inbox</span>
      <span>{Math.max(inboxRows.length - 1, 0)} captured</span>
    </div>
    {#if inboxRows.length > 0}
      {#each inboxRows as row (row.id)}
        <article
          class="mobile-row kind-{rowKind(row)}"
          class:is-swiped={swipedRowId === row.id}
          class:kind-category={row.depth === 0}
          style:--depth={Math.max(row.depth - 1, 0)}
          onpointerdown={(e) => handleRowPointerDown(e, row)}
          onpointermove={(e) => handleRowPointerMove(e, row)}
          onpointerup={handleRowPointerUp}
          onpointercancel={handleRowPointerUp}
        >
          <button type="button" class="mobile-swipe-delete" aria-label="Delete" onclick={() => deleteImmediately(row.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
            </svg>
          </button>
          {#if row.depth > 0}
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
          {:else}
            <span class="mobile-folder-mark"></span>
          {/if}
          <div class="mobile-row-body">
            <div class="mobile-row-kicker">
              <span>{scopeLabel(row)}</span>
              <span>{row.status ?? 'todo'}</span>
            </div>
            <button type="button" class="mobile-label-button" onclick={() => handleLabelClick(row, () => onfocus?.(row.id))}>
              {row.label}
            </button>
            {#if row.depth > 0}
              <div class="mobile-row-meta">{metaText(row)}</div>
            {:else if showSummaryMeta && row.summary}
              <div class="mobile-row-meta">{summaryText(row)}</div>
            {/if}
          </div>
          <div class="mobile-head-actions">
            {#if row.hasChildren}
              <button type="button" class="mobile-disclosure" title={row.isExpanded ? 'Collapse' : 'Expand'} onclick={() => ontoggle(row.id)}>
                {row.isExpanded ? '-' : '+'}
              </button>
            {/if}
            <button type="button" class="mobile-disclosure" title="Focus row" onclick={() => onfocus?.(row.id)}>
              &gt;
            </button>
          </div>
        </article>
      {/each}
    {:else}
      <button type="button" class="mobile-capture-empty" onclick={() => { captureOpen = true; }}>
        Capture a thought into 90 Inbox
      </button>
    {/if}
  </section>

  <section class="mobile-section-group">
    <div class="mobile-section-heading">
      <span>Plan</span>
      <span>{planRows.length} rows</span>
    </div>
    {#each planRows as row (row.id)}
      {@const isOpen = openRowId === row.id}
      {@const timelineEntries = row.timeline.filter((entry) => entry.text.trim()).sort((a, b) => a.year - b.year)}
      <article
        class="mobile-row kind-{rowKind(row)}"
        class:is-open={isOpen}
        class:is-swiped={swipedRowId === row.id}
        class:kind-category={row.depth === 0}
        style:--depth={Math.min(row.depth, 2)}
        onpointerdown={(e) => handleRowPointerDown(e, row)}
        onpointermove={(e) => handleRowPointerMove(e, row)}
        onpointerup={handleRowPointerUp}
        onpointercancel={handleRowPointerUp}
      >
        <button type="button" class="mobile-swipe-delete" aria-label="Delete" onclick={() => deleteImmediately(row.id)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
          </svg>
        </button>
        {#if row.depth > 0}
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
        {:else}
          <span class="mobile-folder-mark"></span>
        {/if}

        <div class="mobile-row-body">
          <div class="mobile-row-kicker">
            <span>{scopeLabel(row)}</span>
            <span>{row.status ?? 'todo'}</span>
            {#if row.commitment}
              <span>{row.commitment}</span>
            {/if}
          </div>
          <button type="button" class="mobile-label-button" onclick={() => handleLabelClick(row, () => toggleDetails(row.id))}>
            {row.label}
          </button>
          <div class="mobile-row-meta">{metaText(row)}</div>
          {#if showSummaryMeta && row.summary}
            <div class="mobile-summary">{summaryText(row)}</div>
          {/if}
        </div>

        <div class="mobile-head-actions">
          {#if row.hasChildren}
            <button type="button" class="mobile-disclosure" title={row.isExpanded ? 'Collapse' : 'Expand'} onclick={() => ontoggle(row.id)}>
              {row.isExpanded ? '-' : '+'}
            </button>
          {/if}
          <button type="button" class="mobile-disclosure" title={isOpen ? 'Close details' : 'Open details'} onclick={() => toggleDetails(row.id)}>
            {isOpen ? '^' : 'v'}
          </button>
        </div>

        {#if timelineEntries.length > 0}
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

{#if actionRow}
  <div class="mobile-action-backdrop" role="presentation" onclick={handleActionBackdropClick}>
    <div class="mobile-action-sheet" role="dialog" aria-modal="true" tabindex="-1">
      <div class="mobile-action-title">
        <span>{actionRow.label}</span>
        <button type="button" aria-label="Close" onclick={closeActionSheet}>Close</button>
      </div>
      <button
        type="button"
        disabled={actionRow.depth >= MAX_DEPTH}
        onclick={() => runAction(() => onaddchild?.(actionRow.id))}
      >
        Add child
      </button>
      <button type="button" onclick={() => runAction(() => onaddsibling?.(actionRow.id))}>
        Add sibling
      </button>
      <button type="button" onclick={() => runAction(() => onduplicate?.(actionRow.id))}>
        Duplicate
      </button>
      <button type="button" onclick={() => runAction(() => onfocus?.(actionRow.id))}>
        Focus
      </button>
      {#if onnoteclick}
        <button type="button" onclick={() => runAction(() => onnoteclick(actionRow.id))}>
          {actionRow.notePath ? 'Open note' : 'Create note'}
        </button>
      {/if}
      {#if actionRow.notePath && onunlinknote}
        <button type="button" onclick={() => runAction(() => onunlinknote(actionRow.id))}>
          Unlink note
        </button>
      {/if}
      <button type="button" class="danger" onclick={() => requestDelete(actionRow.id)}>
        {confirmDeleteId === actionRow.id ? 'Tap again to delete' : 'Delete'}
      </button>
    </div>
  </div>
{/if}

<style>
  .mobile-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0 0 56px;
    background: var(--background-primary);
  }

  .mobile-section-group {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-top: 0;
  }

  .mobile-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 30px;
    padding: 0 12px;
    border-bottom: 1px solid var(--background-modifier-border);
    color: var(--text-faint);
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .mobile-section-heading span:first-child {
    color: var(--text-faint);
    font-weight: 600;
  }

  .mobile-inbox-group {
    border-top: none;
    border-bottom: none;
    margin-top: 0;
    padding-bottom: 0;
  }

  .mobile-row {
    --indent: calc(var(--depth) * 16px);
    position: relative;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    column-gap: 6px;
    align-items: start;
    border-bottom: 1px solid var(--background-modifier-border);
    padding: 8px 8px 8px calc(12px + var(--indent));
    background: var(--chronostra-bg-goal);
    overflow: hidden;
    touch-action: pan-y;
    transition: background 0.08s ease, padding-right 0.14s ease;
  }

  .mobile-row.is-swiped {
    padding-right: 76px;
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
    min-height: 48px;
  }

  .mobile-row.kind-category {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .mobile-swipe-delete {
    appearance: none;
    -webkit-appearance: none;
    position: absolute;
    top: 0;
    right: -64px;
    bottom: 0;
    z-index: 5;
    display: grid;
    place-items: center;
    width: 64px;
    border: none;
    border-radius: 0;
    background: var(--text-error);
    color: var(--background-primary);
    box-shadow: none;
    transition: right 0.14s ease;
  }

  .mobile-row.is-swiped .mobile-swipe-delete {
    right: 0;
  }

  .mobile-swipe-delete svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
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
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .mobile-label-button {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    min-height: 26px;
    padding: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    color: var(--text-normal);
    font: inherit;
    font-size: 12px;
    font-weight: inherit;
    line-height: 1.35;
    text-align: left;
    word-break: break-word;
  }

  .mobile-row.kind-category .mobile-label-button,
  .mobile-row.kind-vision .mobile-label-button {
    font-size: 13px;
  }

  .mobile-row.kind-step .mobile-label-button {
    font-size: 11px;
    color: var(--text-muted);
  }

  .mobile-row-meta,
  .mobile-summary,
  .mobile-empty-line,
  .mobile-empty-state {
    color: var(--text-faint);
    font-size: 10px;
    line-height: 1.45;
  }

  .mobile-row-meta {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
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
    width: 14px;
    height: 14px;
    margin-top: 6px;
    border-radius: 50%;
  }

  .mobile-check.is-done {
    border-color: var(--interactive-accent);
    background: transparent;
    position: relative;
  }

  .mobile-check.is-done::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid var(--interactive-accent);
    border-width: 0 1px 1px 0;
    transform: rotate(45deg);
  }

  .mobile-folder-mark {
    width: 14px;
    height: 10px;
    margin-top: 8px;
    border-radius: 1px;
    border-color: var(--text-faint);
    opacity: 0.7;
  }

  .mobile-head-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .mobile-disclosure {
    min-width: 24px;
    height: 24px;
    border-color: transparent;
    border-radius: 0;
    font: inherit;
    font-size: 11px;
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
    padding: 6px 0 0;
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
    border-radius: 0;
    background: var(--background-primary);
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
  .mobile-action-title button,
  .mobile-capture-empty,
  .mobile-capture-save {
    appearance: none;
    -webkit-appearance: none;
    min-height: 40px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 0;
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
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1200;
    display: flex;
    justify-content: stretch;
    padding: 6px 8px calc(var(--safe-area-inset-bottom, 0px) + 6px);
    border-top: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    pointer-events: auto;
  }

  .mobile-capture-button {
    appearance: none;
    -webkit-appearance: none;
    pointer-events: auto;
    width: 100%;
    min-height: 34px;
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 0;
    background: transparent;
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
    border-radius: 0;
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

  .mobile-action-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1350;
    display: flex;
    align-items: flex-end;
    background: color-mix(in srgb, var(--background-primary) 34%, transparent);
  }

  .mobile-capture-sheet,
  .mobile-action-sheet {
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 10px 12px calc(var(--safe-area-inset-bottom, 0px) + 12px);
    border-top: 1px solid var(--background-modifier-border);
    border-radius: 0;
    background: var(--background-primary);
  }

  .mobile-capture-sheet {
    gap: 10px;
  }

  .mobile-action-sheet {
    gap: 0;
  }

  .mobile-capture-heading,
  .mobile-action-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-normal);
    font-size: 12px;
    font-weight: 600;
  }

  .mobile-action-title {
    min-height: 34px;
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .mobile-action-title span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-capture-heading button,
  .mobile-action-title button {
    min-height: 26px;
    padding: 0 8px;
    border-color: transparent;
  }

  .mobile-action-sheet > button {
    appearance: none;
    -webkit-appearance: none;
    min-height: 44px;
    border: none;
    border-bottom: 1px solid var(--background-modifier-border);
    border-radius: 0;
    background: transparent;
    color: var(--text-normal);
    box-shadow: none;
    font: inherit;
    font-size: 13px;
    text-align: left;
  }

  .mobile-action-sheet > button:disabled {
    color: var(--text-faint);
  }

  .mobile-action-sheet > button.danger {
    color: var(--text-error);
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
</style>
