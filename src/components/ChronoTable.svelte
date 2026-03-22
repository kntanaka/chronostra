<script lang="ts">
  import type { ChronoData } from '../types';
  import { TreeState } from '../stores/tree-state.svelte';
  import { flattenTree } from '../stores/flat-rows.svelte';
  import { createVirtualizer } from '../virtualizer/create-virtualizer.svelte';
  import TableHeader from './TableHeader.svelte';
  import TableRow from './TableRow.svelte';
  import CellPopup from './CellPopup.svelte';

  let {
    data,
    initialExpandedIds = [],
    onExpandChange,
  }: {
    data: ChronoData;
    initialExpandedIds?: string[];
    onExpandChange?: (expandedIds: string[]) => void;
  } = $props();

  const treeState = new TreeState();

  // Restore persisted expand state
  $effect(() => {
    if (initialExpandedIds.length > 0) {
      treeState.expanded = new Set(initialExpandedIds);
    } else {
      // Default: expand categories
      const categoryIds = data.categories.map((c) => c.id);
      treeState.expanded = new Set(categoryIds);
    }
  });

  let flatRows = $derived(flattenTree(data.categories, treeState));

  let scrollContainer: HTMLDivElement | undefined = $state();

  const virt = createVirtualizer<HTMLDivElement>(() => ({
    count: flatRows.length,
    getScrollElement: () => scrollContainer ?? null,
    estimateSize: () => 36,
    overscan: 10
  }));

  function handleToggle(id: string) {
    treeState.toggle(id);
    onExpandChange?.([...treeState.expanded]);
  }

  function expandAll() {
    treeState.expandAll(data.categories);
    onExpandChange?.([...treeState.expanded]);
  }

  function collapseAll() {
    treeState.collapseAll();
    onExpandChange?.([...treeState.expanded]);
  }

  let hierarchyWidth = $state(320);
  let metricWidths = $state([200, 200, 200]);
  let metricFrozen = $state([true, true, true]);

  function handleHierarchyResize(width: number) {
    hierarchyWidth = Math.max(150, width);
  }

  function handleMetricResize(index: number, width: number) {
    metricWidths[index] = Math.max(80, width);
  }

  function handleToggleFreeze(index: number) {
    metricFrozen[index] = !metricFrozen[index];
  }

  // Track horizontal scroll for frozen columns in data rows
  // (sticky doesn't work inside position:absolute virtual rows)
  let scrollLeft = $state(0);

  function handleScroll() {
    if (scrollContainer) {
      scrollLeft = scrollContainer.scrollLeft;
    }
  }

  let popupText = $state<string | null>(null);
  let popupX = $state(0);
  let popupY = $state(0);

  function handlePopup(text: string | null, x: number, y: number) {
    popupText = text;
    popupX = x;
    popupY = y;
  }
</script>

<div class="chrono-wrapper">
  <div class="toolbar">
    <span class="title">Chronostra</span>
    <span class="row-count">{flatRows.length} rows</span>
    <button class="tool-btn" onclick={expandAll}>Expand All</button>
    <button class="tool-btn" onclick={collapseAll}>Collapse All</button>
  </div>

  <div class="scroll-container" bind:this={scrollContainer} onscroll={handleScroll}>
    <TableHeader {hierarchyWidth} {metricWidths} {metricFrozen} onhierarchyresize={handleHierarchyResize} onresize={handleMetricResize} ontogglefreeze={handleToggleFreeze} />

    {#if virt.instance}
      <div
        class="virtual-list"
        style:height="{virt.instance.getTotalSize()}px"
        style:position="relative"
        style:width="max-content"
        style:min-width="100%"
      >
        {#each virt.instance.getVirtualItems() as virtualRow (flatRows[virtualRow.index]?.id ?? virtualRow.index)}
          {@const row = flatRows[virtualRow.index]}
          {#if row}
            <div
              class="virtual-row"
              style:position="absolute"
              style:top="{virtualRow.start}px"
              style:width="max-content"
              style:min-width="100%"
              style:height="{virtualRow.size}px"
            >
              <TableRow {row} {hierarchyWidth} {metricWidths} {metricFrozen} {scrollLeft} ontoggle={handleToggle} onpopup={handlePopup} />
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  {#if popupText}
    <CellPopup text={popupText} x={popupX} y={popupY} />
  {/if}
</div>

<style>
  .chrono-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--background-primary);
    overflow: hidden;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: var(--background-secondary);
    border-bottom: 1px solid var(--background-modifier-border);
    flex-shrink: 0;
  }
  .title {
    font-weight: 700;
    font-size: 15px;
    color: var(--text-normal);
    letter-spacing: -0.3px;
  }
  .row-count {
    font-size: 11px;
    color: var(--text-faint);
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }
  .tool-btn {
    font-size: 11px;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid var(--background-modifier-border);
    padding: 3px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .tool-btn:hover {
    color: var(--text-normal);
    background: rgba(255, 255, 255, 0.05);
  }
  .scroll-container {
    flex: 1;
    overflow: auto;
    position: relative;
  }
  .virtual-list {
  }
  .virtual-row {
  }
</style>
