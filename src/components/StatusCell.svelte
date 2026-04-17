<script lang="ts">
  import type { ItemStatus } from '../types';

  let { value, width, onchange }: {
    value?: ItemStatus;
    width: number;
    onchange?: (newValue: ItemStatus) => void;
  } = $props();

  const STATUS_CYCLE: ItemStatus[] = ['todo', 'in-progress', 'done'];

  const STATUS_LABELS: Record<ItemStatus, string> = {
    'todo': 'To do',
    'in-progress': 'In progress',
    'done': 'Done',
  };

  function cycle() {
    if (!onchange) return;
    const current = value ?? 'todo';
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    onchange(next);
  }
</script>

<div
  class="status-cell"
  class:editable={!!onchange}
  class:status-todo={!value || value === 'todo'}
  class:status-in-progress={value === 'in-progress'}
  class:status-done={value === 'done'}
  style:min-width="{width}px"
  style:max-width="{width}px"
  role="button"
  tabindex="0"
  onclick={cycle}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') cycle(); }}
>
  <span class="status-dot"></span>
  <span class="status-text">{STATUS_LABELS[value ?? 'todo']}</span>
</div>

<style>
  .status-cell {
    display: flex;
    align-items: center;
    gap: 5px;
    height: var(--chronostra-row-height);
    padding: 0 8px;
    font-size: 10px;
    letter-spacing: 0.04em;
    background: inherit;
    box-sizing: border-box;
    overflow: hidden;
    user-select: none;
  }
  .status-cell.editable {
    cursor: pointer;
  }
  .status-cell.editable:hover {
    background: var(--background-secondary) !important;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-todo .status-dot {
    background: var(--text-faint);
  }
  .status-todo .status-text {
    color: var(--text-faint);
  }
  .status-in-progress .status-dot {
    background: var(--interactive-accent);
  }
  .status-in-progress .status-text {
    color: var(--text-normal);
  }
  .status-done .status-dot {
    background: var(--text-muted);
  }
  .status-done .status-text {
    color: var(--text-muted);
    text-decoration: line-through;
  }
  .status-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
