<script lang="ts">
  import DropdownSelect from './DropdownSelect.svelte';
  import type { Commitment } from '../types';

  const COMMITMENT_OPTIONS = [
    { value: '', label: '—' },
    { value: 'must', label: 'Must ★' },
    { value: 'wish', label: 'Wish ☆' },
  ];

  let { value, width, empty, needsDeadline, onchange }: {
    value?: Commitment;
    width: number;
    empty?: boolean;
    needsDeadline?: boolean;
    onchange?: (next: Commitment | undefined) => void;
  } = $props();

  function handleChange(raw: string) {
    if (!onchange) return;
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
    <DropdownSelect
      value={current}
      options={COMMITMENT_OPTIONS}
      variant="cell"
      minWidth={72}
      disabled={!onchange}
      title={
        value === 'must'
          ? (needsDeadline ? 'Must — set a year on the timeline' : 'Must — committed with deadline')
          : value === 'wish'
            ? 'Wish — nice to have, no deadline'
            : 'Set focus'
      }
      onchange={handleChange}
    />
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
  :global(.commitment-cell .dropdown-select) {
    width: 100%;
  }
  .is-none :global(.dropdown-trigger) {
    color: var(--text-faint);
  }
  .is-must :global(.dropdown-trigger) {
    color: var(--interactive-accent);
    font-weight: 600;
  }
  .is-wish :global(.dropdown-trigger) {
    color: var(--text-muted);
  }
  .needs-deadline :global(.dropdown-trigger) {
    color: var(--text-error, #d33);
  }
</style>
