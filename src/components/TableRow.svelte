<script lang="ts">
  import type { FlatRow } from '../types';
  import HierarchyCell from './HierarchyCell.svelte';
  import MetricCell from './MetricCell.svelte';
  import TimelineCell from './TimelineCell.svelte';

  let { row, hierarchyWidth, metricWidths, metricFrozen, scrollLeft, ontoggle, onpopup, onmetricchange, onlabelchange, onrowcontextmenu }: {
    row: FlatRow;
    hierarchyWidth: number;
    metricWidths: number[];
    metricFrozen: boolean[];
    scrollLeft: number;
    ontoggle: (id: string) => void;
    onpopup: (text: string | null, x: number, y: number) => void;
    onmetricchange?: (id: string, type: 'future' | 'now' | 'gap', value: string) => void;
    onlabelchange?: (id: string, newLabel: string) => void;
    onrowcontextmenu?: (e: MouseEvent, rowId: string) => void;
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
    <HierarchyCell {row} width={hierarchyWidth} {ontoggle} {onlabelchange} />
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
    <TimelineCell {entry} {onpopup} />
  {/each}
</div>

<style>
  .table-row {
    display: flex;
    width: max-content;
    min-width: 100%;
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .table-row:hover {
    background: var(--background-secondary) !important;
  }
  .hierarchy-wrap {
    z-index: 2;
    flex-shrink: 0;
  }
  .metric-col {
    z-index: 0;
    flex-shrink: 0;
  }
  .frozen {
    z-index: 2;
  }
</style>
