<script lang="ts">
  import type { Commitment, FlatRow, ItemStatus } from '../types';
  import { effectiveScope } from '../types';

  let {
    rows,
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
    onfocus,
    onnoteclick,
    onunlinknote,
  }: {
    rows: FlatRow[];
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
    onfocus?: (id: string) => void;
    onnoteclick?: (id: string) => void;
    onunlinknote?: (id: string) => void;
  } = $props();

  let openRowId = $state<string | null>(null);
  let confirmDeleteId = $state<string | null>(null);
  let timelineDraftYears = $state<Record<string, number>>({});
  let timelineDraftTexts = $state<Record<string, string>>({});

  const startYear = $derived(Math.min(timelineStartYear, timelineEndYear));
  const endYear = $derived(Math.max(timelineStartYear, timelineEndYear));

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
    return effectiveScope(row.depth, row.scope) ?? 'Goal';
  }

  function summaryText(row: FlatRow): string {
    if (!row.summary) return '';
    const descendants = Math.max(row.summary.subtreeCount - 1, 0);
    return `${descendants} items / ${row.summary.statusCounts['in-progress']} wip / ${row.summary.statusCounts.done} done / ${row.summary.linkedNotes} notes`;
  }
</script>

<div class="mobile-list">
  {#each rows as row (row.id)}
    {@const isOpen = openRowId === row.id}
    {@const timelineEntries = row.timeline.filter((entry) => entry.text.trim()).sort((a, b) => a.year - b.year)}
    <article
      class="mobile-row"
      class:is-open={isOpen}
      class:kind-category={row.depth === 0}
      style:--depth={row.depth}
    >
      <header class="mobile-row-head">
        <div class="mobile-row-main">
          <div class="mobile-row-kicker">
            <span>{scopeLabel(row)}</span>
            <span>{row.status ?? 'todo'}</span>
            {#if row.commitment}
              <span>{row.commitment}</span>
            {/if}
          </div>
          <button type="button" class="mobile-label-button" onclick={() => toggleDetails(row.id)}>
            {row.label}
          </button>
          {#if showSummaryMeta && row.summary}
            <div class="mobile-summary">{summaryText(row)}</div>
          {/if}
        </div>
        <div class="mobile-head-actions">
          {#if row.hasChildren}
            <button type="button" class="icon-button" title={row.isExpanded ? 'Collapse' : 'Expand'} onclick={() => ontoggle(row.id)}>
              {row.isExpanded ? '-' : '+'}
            </button>
          {/if}
          <button type="button" class="icon-button" title={isOpen ? 'Close details' : 'Open details'} onclick={() => toggleDetails(row.id)}>
            {isOpen ? '^' : 'v'}
          </button>
        </div>
      </header>

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
            <button type="button" onclick={() => onaddchild?.(row.id)} disabled={row.depth >= 3}>Child</button>
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

  {#if rows.length === 0}
    <div class="mobile-empty-state">No rows match the current filters.</div>
  {/if}
</div>

<style>
  .mobile-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0 12px 20px;
    background: var(--background-primary);
  }

  .mobile-row {
    --indent: calc(var(--depth) * 10px);
    border-bottom: 1px solid var(--background-modifier-border);
    padding: 11px 0 12px var(--indent);
  }

  .mobile-row.kind-category {
    padding-top: 16px;
  }

  .mobile-row-head {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .mobile-row-main {
    min-width: 0;
    flex: 1;
  }

  .mobile-row-kicker {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 3px;
    color: var(--text-faint);
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mobile-label-button {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    min-height: 36px;
    padding: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    color: var(--text-normal);
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.35;
    text-align: left;
    word-break: break-word;
  }

  .mobile-summary,
  .mobile-empty-line,
  .mobile-empty-state {
    color: var(--text-faint);
    font-size: 11px;
    line-height: 1.45;
  }

  .mobile-head-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .icon-button {
    appearance: none;
    -webkit-appearance: none;
    width: 36px;
    height: 36px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    box-shadow: none;
    font: inherit;
  }

  .mobile-timeline-peek {
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
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 0 4px;
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
    font-size: 10px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .mobile-field textarea,
  .mobile-timeline-edit textarea,
  .mobile-field select,
  .mobile-add-timeline input {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background: var(--background-primary);
    color: var(--text-normal);
    font: inherit;
    font-size: 13px;
    line-height: 1.35;
    box-shadow: none;
    outline: none;
  }

  .mobile-field textarea,
  .mobile-timeline-edit textarea {
    min-height: 68px;
    padding: 8px 9px;
    resize: vertical;
  }

  .mobile-field select,
  .mobile-add-timeline input {
    height: 40px;
    padding: 0 9px;
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
  .mobile-actions button {
    appearance: none;
    -webkit-appearance: none;
    min-height: 40px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    box-shadow: none;
    font: inherit;
    font-size: 12px;
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

  @media (max-width: 420px) {
    .mobile-field-grid,
    .mobile-add-timeline {
      grid-template-columns: 1fr;
    }

    .mobile-timeline-edit {
      grid-template-columns: 1fr;
    }
  }
</style>
