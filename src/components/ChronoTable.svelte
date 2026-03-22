<script lang="ts">
  import type { ChronoData, TreeNode } from '../types';
  import { TreeState } from '../stores/tree-state.svelte';
  import { flattenTree } from '../stores/flat-rows.svelte';
  import { createVirtualizer } from '../virtualizer/create-virtualizer.svelte';
  import TableHeader from './TableHeader.svelte';
  import TableRow from './TableRow.svelte';
  import CellPopup from './CellPopup.svelte';

  let {
    data: initialData,
    initialExpandedIds = [],
    onExpandChange,
    onDataChange,
  }: {
    data: ChronoData;
    initialExpandedIds?: string[];
    onExpandChange?: (expandedIds: string[]) => void;
    onDataChange?: (data: ChronoData) => void;
  } = $props();

  // Mutable copy of the data tree
  let data = $state<ChronoData>(structuredClone(initialData));

  const treeState = new TreeState();

  $effect(() => {
    if (initialExpandedIds.length > 0) {
      treeState.expanded = new Set(initialExpandedIds);
    } else {
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

  // --- Data mutation helpers ---

  function findNode(nodes: TreeNode[], id: string): TreeNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  function findParentAndIndex(nodes: TreeNode[], id: string, parent: TreeNode[] | null = null): { parent: TreeNode[]; index: number } | null {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return { parent: nodes, index: i };
      if (nodes[i].children) {
        const found = findParentAndIndex(nodes[i].children!, id, nodes);
        if (found) return found;
      }
    }
    return null;
  }

  function emitChange() {
    data = { ...data };
    onDataChange?.(data);
  }

  function handleMetricChange(id: string, type: 'future' | 'now' | 'gap', value: string) {
    const node = findNode(data.categories, id);
    if (node) {
      node.metrics[type] = value;
      emitChange();
    }
  }

  function handleLabelChange(id: string, newLabel: string) {
    const node = findNode(data.categories, id);
    if (node) {
      node.label = newLabel;
      emitChange();
    }
  }

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function addChild(parentId: string) {
    const node = findNode(data.categories, parentId);
    if (!node) return;
    if (!node.children) node.children = [];
    const LEVEL_MAP = ['category', 'goal', 'project', 'task'] as const;
    const childLevel = LEVEL_MAP[Math.min(node.depth + 1, LEVEL_MAP.length - 1)];
    node.children.push({
      id: generateId(),
      label: 'New Item',
      level: childLevel,
      depth: node.depth + 1,
      metrics: { future: '', now: '', gap: '' },
      timeline: [],
    });
    treeState.expanded.add(parentId);
    emitChange();
  }

  function addSibling(id: string) {
    const loc = findParentAndIndex(data.categories, id);
    if (!loc) return;
    const sibling = loc.parent[loc.index];
    loc.parent.splice(loc.index + 1, 0, {
      id: generateId(),
      label: 'New Item',
      level: sibling.level,
      depth: sibling.depth,
      metrics: { future: '', now: '', gap: '' },
      timeline: [],
    });
    emitChange();
  }

  function deleteRow(id: string) {
    const loc = findParentAndIndex(data.categories, id);
    if (!loc) return;
    loc.parent.splice(loc.index, 1);
    emitChange();
  }

  // --- Row context menu ---
  let rowMenu = $state<{ id: string; x: number; y: number } | null>(null);

  function handleRowContextMenu(e: MouseEvent, rowId: string) {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    rowMenu = { id: rowId, x: e.clientX - rect.left, y: e.clientY - rect.top };
    // Position relative to scroll container
    if (scrollContainer) {
      const scrollRect = scrollContainer.getBoundingClientRect();
      rowMenu = { id: rowId, x: e.clientX - scrollRect.left + scrollContainer.scrollLeft, y: e.clientY - scrollRect.top + scrollContainer.scrollTop };
    }
  }

  function closeRowMenu() {
    rowMenu = null;
  }
</script>

<svelte:window onclick={closeRowMenu} />

<div class="chrono-wrapper">
  <div class="toolbar">
    <span class="title">Chronostra</span>
    <span class="row-count">{flatRows.length} rows</span>
    <div class="toolbar-actions">
      <button class="icon-btn" onclick={expandAll} title="Expand All">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 5.5L7 9.5L11 5.5" />
        </svg>
      </button>
      <button class="icon-btn" onclick={collapseAll} title="Collapse All">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 9.5L7 5.5L11 9.5" />
        </svg>
      </button>
    </div>
    <button class="add-btn" onclick={() => {
      data.categories.push({
        id: generateId(),
        label: 'New Category',
        level: 'category',
        depth: 0,
        metrics: { future: '', now: '', gap: '' },
        timeline: [],
      });
      emitChange();
    }}>+ Add Category</button>
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
              <TableRow
                {row}
                {hierarchyWidth}
                {metricWidths}
                {metricFrozen}
                {scrollLeft}
                ontoggle={handleToggle}
                onpopup={handlePopup}
                onmetricchange={handleMetricChange}
                onlabelchange={handleLabelChange}
                onrowcontextmenu={handleRowContextMenu}
              />
            </div>
          {/if}
        {/each}
      </div>
    {/if}

    {#if rowMenu}
      <div
        class="row-context-menu"
        style:left="{rowMenu.x}px"
        style:top="{rowMenu.y}px"
      >
        <button class="context-item" onclick={() => { addChild(rowMenu!.id); closeRowMenu(); }}>
          + Add Child
        </button>
        <button class="context-item" onclick={() => { addSibling(rowMenu!.id); closeRowMenu(); }}>
          + Add Sibling
        </button>
        <button class="context-item danger" onclick={() => { deleteRow(rowMenu!.id); closeRowMenu(); }}>
          Delete
        </button>
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
    gap: 16px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--background-modifier-border);
    flex-shrink: 0;
  }
  .title {
    font-weight: 600;
    font-size: 13px;
    color: var(--text-normal);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .row-count {
    font-size: 11px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .toolbar-actions {
    display: flex;
    gap: 2px;
  }
  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-faint);
    cursor: pointer;
    padding: 0;
    transition: color 0.1s, border-color 0.1s;
  }
  .icon-btn:hover {
    color: var(--text-normal);
    border-color: var(--background-modifier-border);
  }
  .add-btn {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-muted);
    background: transparent;
    border: none;
    padding: 4px 0;
    cursor: pointer;
    letter-spacing: 0.02em;
  }
  .add-btn:hover {
    color: var(--text-normal);
    text-decoration: underline;
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
  .row-context-menu {
    position: absolute;
    z-index: 100;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    padding: 4px 0;
    min-width: 140px;
  }
  .context-item {
    display: block;
    width: 100%;
    padding: 5px 12px;
    font-size: 11px;
    color: var(--text-normal);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    letter-spacing: 0.01em;
  }
  .context-item:hover {
    background: var(--background-secondary);
  }
  .context-item.danger {
    color: var(--text-muted);
  }
  .context-item.danger:hover {
    color: var(--text-normal);
  }
</style>
