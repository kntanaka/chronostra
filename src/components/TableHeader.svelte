<script lang="ts">
  import type { TimelineDisplay } from '../settings';

  const metricLabels = ['Future', 'Now', 'Gap', 'Status'];

  let {
    hierarchyWidth,
    metricWidths,
    metricFrozen,
    focusYear,
    timelineDisplay = 'year' as TimelineDisplay,
    birthYear = null as number | null,
    timelineStartYear,
    timelineEndYear,
    onhierarchyresize,
    onresize,
    ontogglefreeze,
    onfocusyear,
  }: {
    hierarchyWidth: number;
    metricWidths: number[];
    metricFrozen: boolean[];
    focusYear: number | null;
    timelineDisplay?: TimelineDisplay;
    birthYear?: number | null;
    timelineStartYear: number;
    timelineEndYear: number;
    onhierarchyresize: (width: number) => void;
    onresize: (index: number, width: number) => void;
    ontogglefreeze: (index: number) => void;
    onfocusyear: (year: number | null) => void;
  } = $props();

  const years = $derived.by(() => {
    const start = Math.min(timelineStartYear, timelineEndYear);
    const end = Math.max(timelineStartYear, timelineEndYear);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  // Milestone ages for life markers
  const MILESTONE_AGES = new Set([20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]);

  function yearLabel(year: number): string {
    if (birthYear != null) {
      const age = year - birthYear;
      if (timelineDisplay === 'age') return String(age);
      if (timelineDisplay === 'both') return `${year}(${age})`;
    }
    return String(year);
  }

  function isMilestone(year: number): boolean {
    if (birthYear == null) return false;
    return MILESTONE_AGES.has(year - birthYear);
  }

  // Compute sticky left offsets — only for frozen columns, and only if all preceding columns are also frozen
  const stickyOffsets = $derived(
    metricWidths.map((_, i) => {
      const allPriorFrozen = metricFrozen.slice(0, i).every(Boolean);
      if (!metricFrozen[i] || !allPriorFrozen) return null;
      return hierarchyWidth + metricWidths.slice(0, i).reduce((s, w) => s + w, 0);
    })
  );

  // Unified resize state: target is 'hierarchy' or metric index
  let resizing = $state<{ target: 'hierarchy' | number; startX: number; startW: number } | null>(null);

  function onPointerDown(e: PointerEvent, target: 'hierarchy' | number) {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const startW = target === 'hierarchy' ? hierarchyWidth : metricWidths[target];
    resizing = { target, startX: e.clientX, startW };
  }

  function onPointerMove(e: PointerEvent) {
    if (!resizing) return;
    const delta = e.clientX - resizing.startX;
    if (resizing.target === 'hierarchy') {
      onhierarchyresize(resizing.startW + delta);
    } else {
      onresize(resizing.target, resizing.startW + delta);
    }
  }

  function onPointerUp() {
    resizing = null;
  }

  // Context menu state — just tracks which column index is open
  let contextMenuIndex = $state<number | null>(null);

  function onContextMenu(e: MouseEvent, index: number) {
    e.preventDefault();
    contextMenuIndex = index;
  }

  function handleToggleFreeze() {
    if (contextMenuIndex != null) {
      ontogglefreeze(contextMenuIndex);
      contextMenuIndex = null;
    }
  }

  function closeContextMenu() {
    contextMenuIndex = null;
  }
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} onclick={closeContextMenu} />

<div class="table-header">
  <div
    class="header-cell hierarchy-header"
    style:min-width="{hierarchyWidth}px"
    style:max-width="{hierarchyWidth}px"
  >
    Plan
    <div
      class="resize-handle"
      class:active={resizing?.target === 'hierarchy'}
      onpointerdown={(e) => onPointerDown(e, 'hierarchy')}
    ></div>
  </div>

  {#each metricLabels as label, i}
    {@const offset = stickyOffsets[i]}
    <div
      class="header-cell metric-header"
      class:frozen={offset != null}
      style:left={offset != null ? `${offset}px` : 'auto'}
      style:position={offset != null ? 'sticky' : 'relative'}
      style:min-width="{metricWidths[i]}px"
      style:max-width="{metricWidths[i]}px"
      oncontextmenu={(e) => onContextMenu(e, i)}
    >
      {label}
      {#if offset == null}
        <span class="unfreeze-icon" title="Unfrozen">⇔</span>
      {/if}
      <div
        class="resize-handle"
        class:active={resizing?.target === i}
        onpointerdown={(e) => onPointerDown(e, i)}
      ></div>
      {#if contextMenuIndex === i}
        <div class="context-menu">
          <button class="context-item" onclick={handleToggleFreeze}>
            {metricFrozen[i] ? '☐ Unfreeze column' : '☑ Freeze column'}
          </button>
        </div>
      {/if}
    </div>
  {/each}

  {#each years as year}
    <div
      class="header-cell timeline-header"
      class:year-focused={focusYear === year}
      class:milestone={isMilestone(year)}
      ondblclick={() => onfocusyear(focusYear === year ? null : year)}
    >{yearLabel(year)}</div>
  {/each}
</div>


<style>
  .table-header {
    display: flex;
    width: max-content;
    min-width: 100%;
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--background-primary);
    border-bottom: 1px solid var(--text-faint);
  }
  .header-cell {
    display: flex;
    align-items: center;
    height: var(--chronostra-row-height);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    box-sizing: border-box;
    position: relative;
  }
  .hierarchy-header {
    position: sticky;
    left: 0;
    z-index: 3;
    padding: 0 12px;
    background: var(--background-primary);
    user-select: none;
  }
  .metric-header {
    z-index: 2;
    justify-content: flex-start;
    padding: 0 10px;
    background: var(--background-primary);
    user-select: none;
    gap: 4px;
  }
  .metric-header.frozen {
    z-index: 2;
  }
  .unfreeze-icon {
    font-size: 8px;
    opacity: 0.3;
  }
  .timeline-header {
    min-width: var(--chronostra-col-timeline-w);
    max-width: var(--chronostra-col-timeline-w);
    justify-content: center;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }
  .timeline-header:hover {
    color: var(--text-normal);
  }
  .timeline-header.year-focused {
    color: var(--text-normal);
    font-weight: 700;
    border-bottom: 2px solid var(--text-normal);
  }
  .timeline-header.milestone {
    color: var(--text-normal);
    font-weight: 600;
    border-left: 2px solid var(--interactive-accent);
  }
  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    cursor: col-resize;
    background: transparent;
  }
  .resize-handle:hover,
  .resize-handle.active {
    background: var(--text-faint);
  }
  .context-menu {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 100;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    padding: 4px 0;
    min-width: 140px;
  }
  .context-item {
    display: block;
    width: 100%;
    padding: 5px 12px;
    font-size: 11px;
    color: var(--text-normal);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  .context-item:hover {
    background: var(--background-secondary);
  }
</style>
