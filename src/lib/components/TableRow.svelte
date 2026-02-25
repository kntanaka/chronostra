<script lang="ts">
  import type { FlatRow } from '$lib/types';
  import HierarchyCell from './HierarchyCell.svelte';
  import MetricCell from './MetricCell.svelte';
  import TimelineCell from './TimelineCell.svelte';

  let { row, ontoggle, onpopup }: {
    row: FlatRow;
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

  const stickyMetricOffsets = [320, 400, 480];
</script>

<div
  class="table-row"
  style:background={bgMap[row.level]}
  style:font-weight={fontWeightMap[row.level]}
>
  <HierarchyCell {row} {ontoggle} />

  <!-- Sticky metric cells -->
  <div class="metric-sticky" style:left="{stickyMetricOffsets[0]}px" style:background={bgMap[row.level]}>
    <MetricCell value={row.metrics.future} type="future" />
  </div>
  <div class="metric-sticky" style:left="{stickyMetricOffsets[1]}px" style:background={bgMap[row.level]}>
    <MetricCell value={row.metrics.now} type="now" />
  </div>
  <div class="metric-sticky" style:left="{stickyMetricOffsets[2]}px" style:background={bgMap[row.level]}>
    <MetricCell value={row.metrics.gap} type="gap" />
  </div>

  <!-- Timeline cells -->
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
  .metric-sticky {
    position: sticky;
    z-index: 1;
  }
</style>
