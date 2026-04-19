<script lang="ts">
  import { tick } from 'svelte';
  import type { CellNavigationDirection, ItemStatus } from '../types';

  let { value, width, autoEdit = false, onStatusChange, onautoedited, onnavigate }: {
    value?: ItemStatus;
    width: number;
    autoEdit?: boolean;
    onStatusChange?: (newValue: ItemStatus) => void;
    onautoedited?: () => void;
    onnavigate?: (direction: CellNavigationDirection) => void;
  } = $props();
  let selectEl = $state<HTMLSelectElement | null>(null);
  let focusedValue = $state<ItemStatus>('todo');

  function handleChange(e: Event) {
    if (!onStatusChange) return;
    const raw = (e.currentTarget as HTMLSelectElement).value as ItemStatus;
    onStatusChange(raw);
  }

  const current = $derived(value ?? 'todo');

  $effect(() => {
    if (autoEdit && selectEl) {
      void focusSelect();
      onautoedited?.();
    }
  });

  async function focusSelect() {
    await tick();
    selectEl?.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault();
      onnavigate?.(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onnavigate?.(e.shiftKey ? 'up' : 'down');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (current !== focusedValue) {
        onStatusChange?.(focusedValue);
      }
      selectEl?.blur();
    }
  }
</script>

<div
  class="status-shell"
  class:status-todo={current === 'todo'}
  class:status-in-progress={current === 'in-progress'}
  class:status-done={current === 'done'}
  style:min-width="{width}px"
  style:max-width="{width}px"
>
  <select
    class="status-select"
    value={current}
    bind:this={selectEl}
    onchange={handleChange}
    onfocus={() => {
      focusedValue = current;
    }}
    onkeydown={handleKeydown}
    disabled={!onStatusChange}
    title="Status"
  >
    <option value="todo">To do</option>
    <option value="in-progress">In progress</option>
    <option value="done">Done</option>
  </select>
</div>

<style>
  .status-shell {
    display: flex;
    align-items: center;
    height: var(--chronostra-body-row-height);
    padding: 0 4px;
    background: inherit;
    box-sizing: border-box;
    overflow: visible;
  }

  .status-select {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    width: 100%;
    height: calc(var(--chronostra-body-row-height) - 12px);
    padding: 0 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0;
    color: inherit;
    font-size: 10px;
    letter-spacing: 0.04em;
    cursor: pointer;
    outline: none;
    box-shadow: none;
  }

  .status-select:hover {
    border-color: var(--background-modifier-border);
    background: var(--background-secondary);
  }

  .status-select:focus {
    border-color: var(--interactive-accent);
    background: var(--background-secondary);
  }

  .status-select:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .status-todo .status-select {
    color: var(--text-faint);
  }

  .status-in-progress .status-select {
    color: var(--text-normal);
    font-weight: 500;
  }

  .status-done .status-select {
    color: var(--text-muted);
    text-decoration: line-through;
  }
</style>
