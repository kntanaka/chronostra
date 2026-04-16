<script lang="ts">
  import type { Commitment } from '../types';

  let { value, width, empty, needsDeadline, onchange }: {
    value?: Commitment;
    width: number;
    empty?: boolean;
    needsDeadline?: boolean;
    onchange?: (next: Commitment | undefined) => void;
  } = $props();

  function handleChange(e: Event) {
    if (!onchange) return;
    const raw = (e.currentTarget as HTMLSelectElement).value;
    const next = raw === '' ? undefined : (raw as Commitment);
    onchange(next);
  }

  const current = $derived(value ?? '');
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
      value={current}
      onchange={handleChange}
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
      <option value="must">★ Must</option>
      <option value="wish">☆ Wish</option>
    </select>
  {/if}
</div>

<style>
  .commitment-cell {
    display: flex;
    align-items: center;
    height: var(--chronostra-row-height);
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
    height: calc(var(--chronostra-row-height) - 10px);
    padding: 0 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    color: inherit;
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
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
