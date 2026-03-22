<script lang="ts">
  import type { TimelineEntry } from '../types';

  let {
    entry,
    onpopup
  }: {
    entry: TimelineEntry;
    onpopup: (text: string | null, x: number, y: number) => void;
  } = $props();

  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;

  const statusColor = $derived(() => {
    if (!entry.status || !entry.text) return 'transparent';
    switch (entry.status) {
      case 'completed': return 'var(--text-normal)';
      case 'active': return 'var(--text-muted)';
      case 'at-risk': return 'var(--text-muted)';
      case 'planned': return 'var(--text-faint)';
      default: return 'transparent';
    }
  });

  function onMouseEnter(e: MouseEvent) {
    if (!entry.text) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hoverTimeout = setTimeout(() => {
      onpopup(entry.text, rect.left, rect.bottom + 4);
    }, 300);
  }

  function onMouseLeave() {
    clearTimeout(hoverTimeout);
    onpopup(null, 0, 0);
  }
</script>

<div
  class="timeline-cell"
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
>
  {#if entry.text}
    <div class="status-dot" style:background={statusColor()}></div>
    <span class="text">{entry.text}</span>
  {/if}
</div>

<style>
  .timeline-cell {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: var(--chronostra-col-timeline-w);
    max-width: var(--chronostra-col-timeline-w);
    height: var(--chronostra-row-height);
    padding: 0 6px;
    font-size: 11px;
    color: var(--text-faint);
    box-sizing: border-box;
    overflow: hidden;
    cursor: default;
  }
  .status-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
</style>
