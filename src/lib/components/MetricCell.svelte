<script lang="ts">
  let { value, type, width }: { value: string; type: 'future' | 'now' | 'gap'; width: number } = $props();

  const color = $derived(
    type === 'gap'
      ? 'var(--gap-negative)'
      : type === 'now'
        ? 'var(--text-secondary)'
        : 'var(--text-primary)'
  );
</script>

<div class="metric-cell" style:color={color} style:min-width="{width}px" style:max-width="{width}px" title={value}>
  <span class="metric-text">{value}</span>
</div>

<style>
  .metric-cell {
    display: flex;
    align-items: center;
    height: var(--row-height);
    padding: 0 8px;
    font-size: 11px;
    background: inherit;
    box-sizing: border-box;
    overflow: hidden;
  }
  .metric-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
