<script lang="ts">
  import { tick } from 'svelte';
  import type { CellNavigationDirection, Commitment } from '../types';

  let { value, width, empty, needsDeadline, autoEdit = false, onchange, onautoedited, onnavigate }: {
    value?: Commitment;
    width: number;
    empty?: boolean;
    needsDeadline?: boolean;
    autoEdit?: boolean;
    onchange?: (next: Commitment | undefined) => void;
    onautoedited?: () => void;
    onnavigate?: (direction: CellNavigationDirection) => void;
  } = $props();
  let selectEl = $state<HTMLSelectElement | null>(null);
  let focusedValue = $state<Commitment | ''>('');

  function handleChange(e: Event) {
    if (!onchange) return;
    const raw = (e.currentTarget as HTMLSelectElement).value;
    const next = raw === '' ? undefined : (raw as Commitment);
    onchange(next);
  }

  const current = $derived(value ?? '');

  $effect(() => {
    if (autoEdit && !empty && selectEl) {
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
        onchange?.(focusedValue === '' ? undefined : focusedValue);
      }
      selectEl?.blur();
    }
  }
</script>

<div
  class="commitment-cell"
  class:is-must={value === 'must'}
  class:is-wish={value === 'wish'}
  class:is-none={!value}
  class:needs-deadline={needsDeadline}
  class:empty={empty}
  style:min-width="{width}px"
  style:max-width="{width}px"
>
  {#if !empty}
    <select
      class="commitment-select"
      bind:this={selectEl}
      value={current}
      onchange={handleChange}
      onfocus={() => {
        focusedValue = current;
      }}
      onkeydown={handleKeydown}
      disabled={!onchange}
      title={
        value === 'must'
          ? (needsDeadline ? 'Must — set a year on the timeline' : 'Must — committed with deadline')
          : value === 'wish'
            ? 'Wish — nice to have, no deadline'
            : 'Set focus'
      }
    >
      <option value="">—</option>
      <option value="must">Must ★</option>
      <option value="wish">Wish ☆</option>
    </select>
  {/if}
</div>

<style>
  .commitment-cell {
    display: flex;
    align-items: center;
    height: var(--chronostra-body-row-height);
    padding: 0 4px;
    background: inherit;
    box-sizing: border-box;
    overflow: hidden;
  }
  .commitment-select {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    width: 100%;
    height: calc(var(--chronostra-body-row-height) - 12px);
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
  .commitment-select:hover {
    border-color: var(--background-modifier-border);
    background: var(--background-secondary);
  }
  .commitment-select:focus {
    border-color: var(--interactive-accent);
  }
  .commitment-select:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .is-none .commitment-select {
    color: var(--text-faint);
  }
  .is-must .commitment-select {
    color: var(--interactive-accent);
    font-weight: 600;
  }
  .is-wish .commitment-select {
    color: var(--text-muted);
  }
  .needs-deadline .commitment-select {
    color: var(--text-error, #d33);
  }
</style>
