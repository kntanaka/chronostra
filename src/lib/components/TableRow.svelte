<script lang="ts">
  import type { FlatRow } from '$lib/types';
  import HierarchyCell from './HierarchyCell.svelte';
  import MetricCell from './MetricCell.svelte';
  import TimelineCell from './TimelineCell.svelte';

  let { row, hierarchyWidth, metricWidths, metricFrozen, ontoggle, onpopup }: {
    row: FlatRow;
    hierarchyWidth: number;
    metricWidths: number[];
    metricFrozen: boolean[];
    ontoggle: (id: string) => void;
    onpopup: (text: string | null, x: number, y: number) => void;
  } = $props();

  const bgMap = {
    category: 'var(--bg-category)',
    goal: 'var(--bg-goal)',
    project: 'var(--bg-project)',
    task: 'var(--bg-task)'
  };

  const fontWeightMap = {
    category: '700',
    goal: '600',
    project: '500',
    task: '400'
  };

  const stickyOffsets = $derived(
    metricWidths.map((_: number, i: number) => {
      const allPriorFrozen = metricFrozen.slice(0, i).every(Boolean);
      if (!metricFrozen[i] || !allPriorFrozen) return null;
      return hierarchyWidth + metricWidths.slice(0, i).reduce((s: number, w: number) => s + w, 0);
    })
  );

  const metricTypes = ['future', 'now', 'gap'] as const;
</script>

<div
  class="table-row"
  style:background={bgMap[row.level]}
  style:font-weight={fontWeightMap[row.level]}
>
  <HierarchyCell {row} width={hierarchyWidth} {ontoggle} />

  {#each metricTypes as type, i}
    {@const offset = stickyOffsets[i]}
    <div
      class="metric-col"
      class:frozen={offset != null}
      style:left={offset != null ? `${offset}px` : 'auto'}
      style:position={offset != null ? 'sticky' : 'relative'}
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
    border-bottom: 1px solid var(--border-subtle);
    transition: filter 0.1s ease;
  }
  .table-row:hover {
    filter: brightness(1.1);
  }
  .metric-col {
    z-index: 0;
  }
  .metric-col.frozen {
    z-index: 1;
  }
</style>
