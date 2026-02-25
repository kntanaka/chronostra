<script lang="ts">
  import type { TimelineEntry } from '$lib/types';

  let { entry }: { entry: TimelineEntry } = $props();

  const statusColor = $derived(() => {
    if (!entry.status || entry.value === null) return 'transparent';
    switch (entry.status) {
      case 'completed': return 'var(--gap-positive)';
      case 'active': return 'var(--accent)';
      case 'at-risk': return 'var(--gap-negative)';
      case 'planned': return 'var(--text-muted)';
      default: return 'transparent';
    }
  });
</script>

<div class="timeline-cell">
  {#if entry.value !== null}
    <div class="status-dot" style:background={statusColor()}></div>
    <span class="value">{entry.value}</span>
  {:else}
    <span class="empty">—</span>
  {/if}
</div>

<style>
  .timeline-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: var(--col-timeline-w);
    max-width: var(--col-timeline-w);
    height: var(--row-height);
    font-variant-numeric: tabular-nums;
    font-size: 11px;
    color: var(--text-secondary);
    box-sizing: border-box;
  }
  .status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .empty {
    color: var(--text-muted);
    opacity: 0.3;
  }
  .value {
    min-width: 20px;
    text-align: right;
  }
</style>
