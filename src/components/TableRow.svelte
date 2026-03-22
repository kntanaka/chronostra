<script lang="ts">
  import type { FlatRow } from '../types';
  import HierarchyCell from './HierarchyCell.svelte';
  import MetricCell from './MetricCell.svelte';
  import TimelineCell from './TimelineCell.svelte';

  let { row, hierarchyWidth, metricWidths, metricFrozen, scrollLeft, ontoggle, onpopup }: {
    row: FlatRow;
    hierarchyWidth: number;
    metricWidths: number[];
    metricFrozen: boolean[];
    scrollLeft: number;
    ontoggle: (id: string) => void;
    onpopup: (text: string | null, x: number, y: number) => void;
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

  const metricTypes = ['future', 'now', 'gap'] as const;

  // Compute frozen state for metric columns
  const frozenFlags = $derived(
    metricWidths.map((_: number, i: number) => {
      const allPriorFrozen = metricFrozen.slice(0, i).every(Boolean);
      return metricFrozen[i] && allPriorFrozen;
    })
  );
</script>

<div
  class="table-row"
  style:background={bgMap[row.level]}
  style:font-weight={fontWeightMap[row.level]}
>
  <!-- Hierarchy cell: use transform to simulate sticky -->
  <div
    class="hierarchy-wrap frozen"
    style:transform="translateX({scrollLeft}px)"
    style:min-width="{hierarchyWidth}px"
    style:max-width="{hierarchyWidth}px"
    style:background={bgMap[row.level]}
  >
    <HierarchyCell {row} width={hierarchyWidth} {ontoggle} />
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
      <MetricCell value={row.metrics[type]} {type} width={metricWidths[i]} />
    </div>
  {/each}

  {#each row.timeline as entry (entry.year)}
    <TimelineCell {entry} {onpopup} />
  {/each}
</div>

<style>
  .table-row {
    display: flex;
    width: max-content;
    min-width: 100%;
    border-bottom: 1px solid var(--background-modifier-border);
    transition: filter 0.1s ease;
  }
  .table-row:hover {
    filter: brightness(1.1);
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
