<script lang="ts">
  import type { FlatRow } from '$lib/types';
  import ExpandToggle from './ExpandToggle.svelte';

  let { row, ontoggle }: { row: FlatRow; ontoggle: (id: string) => void } = $props();

  const levelLabels = {
    category: 'CAT',
    goal: 'GOAL',
    project: 'PROJ',
    task: 'TASK'
  };
</script>

<div class="hierarchy-cell" style:padding-left="{row.depth * 20 + 8}px">
  <!-- Indent guides -->
  {#each Array(row.depth) as _, i}
    <div
      class="indent-guide"
      style:left="{i * 20 + 18}px"
    ></div>
  {/each}

  {#if row.hasChildren}
    <ExpandToggle expanded={row.isExpanded} onclick={() => ontoggle(row.id)} />
  {:else}
    <span class="toggle-spacer"></span>
  {/if}

  <span class="level-badge level-{row.level}">{levelLabels[row.level]}</span>
  <span class="label" title={row.label}>{row.label}</span>
</div>

<style>
  .hierarchy-cell {
    position: sticky;
    left: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: var(--col-hierarchy-w);
    max-width: var(--col-hierarchy-w);
    height: var(--row-height);
    overflow: hidden;
    white-space: nowrap;
    box-sizing: border-box;
    background: inherit;
  }
  .indent-guide {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--border-subtle);
    opacity: 0.4;
  }
  .toggle-spacer {
    display: inline-block;
    width: 20px;
    flex-shrink: 0;
  }
  .level-badge {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.5px;
    padding: 1px 4px;
    border-radius: 3px;
    flex-shrink: 0;
    opacity: 0.7;
  }
  .level-badge.level-category {
    background: rgba(124, 111, 239, 0.2);
    color: var(--accent);
  }
  .level-badge.level-goal {
    background: rgba(74, 222, 128, 0.15);
    color: var(--gap-positive);
  }
  .level-badge.level-project {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }
  .level-badge.level-task {
    background: rgba(136, 136, 160, 0.15);
    color: var(--text-secondary);
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
</style>
