<script lang="ts">
  let { value, type }: { value: number; type: 'future' | 'now' | 'gap' } = $props();

  const gapColor = $derived(
    type === 'gap'
      ? value > 0
        ? 'var(--gap-negative)'
        : value < 0
          ? 'var(--gap-positive)'
          : 'var(--gap-zero)'
      : 'var(--text-secondary)'
  );
</script>

<div class="metric-cell" style:color={gapColor}>
  {#if type === 'gap'}
    {value > 0 ? `+${value}` : value}
  {:else}
    {value}
  {/if}
</div>

<style>
  .metric-cell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: var(--col-metric-w);
    max-width: var(--col-metric-w);
    height: var(--row-height);
    padding: 0 10px;
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    background: inherit;
    box-sizing: border-box;
  }
</style>
