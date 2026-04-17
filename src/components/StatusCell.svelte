<script lang="ts">
  import type { ItemStatus } from '../types';

  let { value, width, onStatusChange }: {
    value?: ItemStatus;
    width: number;
    /** Renamed from `onchange` — avoids any ambiguity with DOM `change` in Svelte 5. */
    onStatusChange?: (newValue: ItemStatus) => void;
  } = $props();

  function handleChange(e: Event) {
    if (!onStatusChange) return;
    const raw = (e.currentTarget as HTMLSelectElement).value as ItemStatus;
    onStatusChange(raw);
  }

  const current = $derived(value ?? 'todo');
</script>

<!-- Same pattern as CommitmentCell: native <select> + change — reliable in Obsidian WebView. -->
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
    onchange={handleChange}
    disabled={!onStatusChange}
    title="Status"
  >
    <option value="todo">To do</option>
    <option value="in-progress">WIP</option>
    <option value="done">Done</option>
  </select>
</div>

<style>
  .status-shell {
    display: flex;
    align-items: center;
    height: var(--chronostra-row-height);
    padding: 0 4px;
    background: inherit;
    box-sizing: border-box;
    overflow: hidden;
  }

  .status-select {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    width: 100%;
    height: calc(var(--chronostra-row-height) - 10px);
    padding: 0 6px;
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
