<script lang="ts">
  import type { FlatRow } from '../types';
  import HierarchyCell from './HierarchyCell.svelte';
  import MetricCell from './MetricCell.svelte';
  import TimelineCell from './TimelineCell.svelte';

  let { row, hierarchyWidth, metricWidths, metricFrozen, scrollLeft, focusYear, autoEdit, isDragged, isDropTarget, dropPosition, ontoggle, onpopup, onmetricchange, onlabelchange, ontimelinechange, onrowcontextmenu, onautoedited, ondragstart }: {
    row: FlatRow;
    hierarchyWidth: number;
    metricWidths: number[];
    metricFrozen: boolean[];
    scrollLeft: number;
    focusYear?: number | null;
    autoEdit?: boolean;
    isDragged?: boolean;
    isDropTarget?: boolean;
    dropPosition?: 'before' | 'after';
    ontoggle: (id: string) => void;
    onpopup: (text: string | null, x: number, y: number) => void;
    onmetricchange?: (id: string, type: 'future' | 'now' | 'gap', value: string) => void;
    onlabelchange?: (id: string, newLabel: string) => void;
    ontimelinechange?: (id: string, year: number, text: string) => void;
    onrowcontextmenu?: (e: MouseEvent, rowId: string) => void;
    onautoedited?: () => void;
    ondragstart?: (e: PointerEvent, rowId: string) => void;
  } = $props();

  const bgMap = {
    category: 'var(--chronostra-bg-category)',
    goal: 'var(--chronostra-bg-goal)',
    project: 'var(--chronostra-bg-project)',
    task: 'var(--chronostra-bg-task)'
  };

  const fontWeightMap = {
    category: '700',
    goal: '600',
    project: '500',
    task: '400'
  };

  const TIMELINE_START = 2025;
  const TIMELINE_END = 2050;
  const years = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i);

  // Map timeline entries by year for O(1) lookup
  const timelineByYear = $derived(
    new Map(row.timeline.map(e => [e.year, e]))
  );

  const metricTypes = ['future', 'now', 'gap'] as const;

  const frozenFlags = $derived(
    metricWidths.map((_: number, i: number) => {
      const allPriorFrozen = metricFrozen.slice(0, i).every(Boolean);
      return metricFrozen[i] && allPriorFrozen;
    })
  );

  function handleContextMenu(e: MouseEvent) {
    onrowcontextmenu?.(e, row.id);
  }
</script>

<div
  class="table-row"
  class:dragged={isDragged}
  class:drop-before={isDropTarget && dropPosition === 'before'}
  class:drop-after={isDropTarget && dropPosition === 'after'}
  style:background={bgMap[row.level]}
  style:font-weight={fontWeightMap[row.level]}
  oncontextmenu={handleContextMenu}
>
  <div
    class="hierarchy-wrap frozen"
    style:transform="translateX({scrollLeft}px)"
    style:min-width="{hierarchyWidth}px"
    style:max-width="{hierarchyWidth}px"
    style:background={bgMap[row.level]}
  >
    <HierarchyCell {row} width={hierarchyWidth} {autoEdit} isDragging={isDragged} {ontoggle} {onlabelchange} {onautoedited} ondragstart={ondragstart ? (e) => ondragstart(e, row.id) : undefined} />
  </div>

  {#each metricTypes as type, i}
    {@const isFrozen = frozenFlags[i]}
    <div
      class="metric-col"
      class:frozen={isFrozen}
      style:transform={isFrozen ? `translateX(${scrollLeft}px)` : 'none'}
      style:background={bgMap[row.level]}
      style:min-width="{metricWidths[i]}px"
      style:max-width="{metricWidths[i]}px"
    >
      <MetricCell
        value={row.metrics[type]}
        {type}
        width={metricWidths[i]}
        onchange={onmetricchange ? (v) => onmetricchange(row.id, type, v) : undefined}
      />
    </div>
  {/each}

  {#each years as year (year)}
    {@const entry = timelineByYear.get(year) ?? { year, text: '' }}
    <TimelineCell {entry} {onpopup} focused={focusYear === year} onchange={ontimelinechange ? (year, text) => ontimelinechange(row.id, year, text) : undefined} />
  {/each}
</div>

<style>
  .table-row {
    display: flex;
    width: max-content;
    min-width: 100%;
    border-bottom: 1px solid var(--background-modifier-border);
    transition: background 0.08s ease;
  }
  .table-row:hover {
    background: var(--background-secondary) !important;
  }
  .table-row:hover :global(.hierarchy-cell),
  .table-row:hover :global(.metric-cell),
  .table-row:hover :global(.timeline-cell) {
    background: inherit !important;
  }
  .hierarchy-wrap {
    z-index: 2;
    flex-shrink: 0;
    transition: background 0.08s ease;
  }
  .table-row:hover .hierarchy-wrap,
  .table-row:hover .metric-col.frozen {
    background: var(--background-secondary) !important;
  }
  .metric-col {
    z-index: 0;
    flex-shrink: 0;
    transition: background 0.08s ease;
  }
  .frozen {
    z-index: 2;
  }
  .table-row.dragged {
    opacity: 0.3;
  }
  .table-row.drop-before {
    box-shadow: 0 -2px 0 0 var(--text-normal) inset;
  }
  .table-row.drop-after {
    box-shadow: 0 2px 0 0 var(--text-normal) inset;
  }
</style>
