<script lang="ts">
  const TIMELINE_START = 2025;
  const TIMELINE_END = 2050;
  const years = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i);

  const stickyMetricOffsets = [320, 400, 480];
  const metricLabels = ['Future', 'Now', 'Gap'];
</script>

<div class="table-header">
  <!-- Hierarchy column header -->
  <div class="header-cell hierarchy-header">Plan</div>

  <!-- Metric column headers -->
  {#each metricLabels as label, i}
    <div class="header-cell metric-header" style:left="{stickyMetricOffsets[i]}px">
      {label}
    </div>
  {/each}

  <!-- Timeline column headers -->
  {#each years as year}
    <div class="header-cell timeline-header">{year}</div>
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
    background: var(--bg-base);
    border-bottom: 2px solid var(--border-subtle);
  }
  .header-cell {
    display: flex;
    align-items: center;
    height: var(--row-height);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    box-sizing: border-box;
  }
  .hierarchy-header {
    position: sticky;
    left: 0;
    z-index: 3;
    min-width: var(--col-hierarchy-w);
    max-width: var(--col-hierarchy-w);
    padding: 0 12px;
    background: var(--bg-base);
  }
  .metric-header {
    position: sticky;
    z-index: 2;
    min-width: var(--col-metric-w);
    max-width: var(--col-metric-w);
    justify-content: flex-end;
    padding: 0 10px;
    background: var(--bg-base);
  }
  .timeline-header {
    min-width: var(--col-timeline-w);
    max-width: var(--col-timeline-w);
    justify-content: center;
  }
</style>
