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

  let wrapperEl: HTMLDivElement | undefined = $state();
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

  let focusYear = $state<number | null>(null);
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
    if (wrapperEl && text) {
      const wrapperRect = wrapperEl.getBoundingClientRect();
      popupX = x - wrapperRect.left;
      popupY = y - wrapperRect.top;
    } else {
      popupX = x;
      popupY = y;
    }
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

  let saveIndicator = $state(false);
  let pendingEditId = $state<string | null>(null);

  function emitChange() {
    data = { ...data };
    onDataChange?.(data);
    saveIndicator = true;
    setTimeout(() => { saveIndicator = false; }, 800);
  }

  function handleMetricChange(id: string, type: 'future' | 'now' | 'gap', value: string) {
    const node = findNode(data.categories, id);
    if (node) {
      node.metrics[type] = value;
      emitChange();
    }
  }

  function handleTimelineChange(id: string, year: number, text: string) {
    const node = findNode(data.categories, id);
    if (node) {
      const existing = node.timeline.find(e => e.year === year);
      if (existing) {
        if (text) {
          existing.text = text;
        } else {
          node.timeline = node.timeline.filter(e => e.year !== year);
        }
      } else if (text) {
        node.timeline.push({ year, text });
      }
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
    const newId = generateId();
    node.children.push({
      id: newId,
      label: 'New Item',
      level: childLevel,
      depth: node.depth + 1,
      metrics: { future: '', now: '', gap: '' },
      timeline: [],
    });
    treeState.expanded.add(parentId);
    emitChange();
    pendingEditId = newId;
  }

  function addSibling(id: string) {
    const loc = findParentAndIndex(data.categories, id);
    if (!loc) return;
    const sibling = loc.parent[loc.index];
    const newId = generateId();
    loc.parent.splice(loc.index + 1, 0, {
      id: newId,
      label: 'New Item',
      level: sibling.level,
      depth: sibling.depth,
      metrics: { future: '', now: '', gap: '' },
      timeline: [],
    });
    emitChange();
    pendingEditId = newId;
  }

  function deleteRow(id: string) {
    const loc = findParentAndIndex(data.categories, id);
    if (!loc) return;
    loc.parent.splice(loc.index, 1);
    emitChange();
  }

  // --- Drag and drop ---
  let dragState = $state<{
    draggedId: string;
    targetId: string | null;
    position: 'before' | 'after';
  } | null>(null);

  function handleDragStart(e: PointerEvent, rowId: string) {
    dragState = { draggedId: rowId, targetId: null, position: 'after' };
  }

  function handleDragMove(e: PointerEvent) {
    if (!dragState || !scrollContainer) return;
    const scrollRect = scrollContainer.getBoundingClientRect();
    const y = e.clientY - scrollRect.top + scrollContainer.scrollTop;

    // Find which row the pointer is over using virtualizer
    if (!virt.instance) return;
    const items = virt.instance.getVirtualItems();
    let targetRow: typeof flatRows[number] | null = null;
    let pos: 'before' | 'after' = 'after';

    for (const item of items) {
      if (y >= item.start && y < item.start + item.size) {
        targetRow = flatRows[item.index];
        const mid = item.start + item.size / 2;
        pos = y < mid ? 'before' : 'after';
        break;
      }
    }

    // If below all items, target the last row
    if (!targetRow && items.length > 0) {
      const last = items[items.length - 1];
      if (y >= last.start + last.size) {
        targetRow = flatRows[last.index];
        pos = 'after';
      }
    }

    if (targetRow && targetRow.id !== dragState.draggedId) {
      // Don't allow dropping onto own descendants
      if (!isDescendant(dragState.draggedId, targetRow.id)) {
        dragState = { ...dragState, targetId: targetRow.id, position: pos };
      }
    }
  }

  function handleDragEnd() {
    if (!dragState || !dragState.targetId) {
      dragState = null;
      return;
    }

    const { draggedId, targetId, position } = dragState;
    dragState = null;

    if (draggedId === targetId) return;

    // Remove dragged node from tree
    const srcLoc = findParentAndIndex(data.categories, draggedId);
    if (!srcLoc) return;
    const [draggedNode] = srcLoc.parent.splice(srcLoc.index, 1);

    // Find target location (after removal, indices may have shifted)
    const dstLoc = findParentAndIndex(data.categories, targetId);
    if (!dstLoc) {
      // Target vanished — put dragged node back
      srcLoc.parent.splice(srcLoc.index, 0, draggedNode);
      return;
    }

    const insertIndex = position === 'before' ? dstLoc.index : dstLoc.index + 1;
    const targetNode = dstLoc.parent[dstLoc.index] ?? dstLoc.parent[dstLoc.parent.length - 1];

    // Update depth/level to match new siblings
    const depthDelta = (targetNode?.depth ?? 0) - draggedNode.depth;
    updateDepth(draggedNode, depthDelta);

    dstLoc.parent.splice(insertIndex, 0, draggedNode);
    emitChange();
  }

  function isDescendant(ancestorId: string, nodeId: string): boolean {
    const ancestor = findNode(data.categories, ancestorId);
    if (!ancestor || !ancestor.children) return false;
    for (const child of ancestor.children) {
      if (child.id === nodeId) return true;
      if (child.children && isDescendant(child.id, nodeId)) return true;
    }
    return false;
  }

  const LEVEL_ORDER: ('category' | 'goal' | 'project' | 'task')[] = ['category', 'goal', 'project', 'task'];

  function updateDepth(node: TreeNode, delta: number) {
    node.depth += delta;
    node.level = LEVEL_ORDER[Math.min(Math.max(node.depth, 0), LEVEL_ORDER.length - 1)];
    if (node.children) {
      for (const child of node.children) {
        updateDepth(child, delta);
      }
    }
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

<svelte:window
  onclick={closeRowMenu}
  onpointermove={dragState ? handleDragMove : undefined}
  onpointerup={dragState ? handleDragEnd : undefined}
/>

<div class="chrono-wrapper" class:is-dragging={!!dragState} bind:this={wrapperEl}>
  <div class="toolbar">
    <span class="title">Chronostra</span>
    <span class="row-count">{flatRows.length} rows</span>
    {#if saveIndicator}
      <span class="save-indicator">saved</span>
    {/if}
    <button class="tool-link" onclick={expandAll}>expand</button>
    <span class="tool-sep">/</span>
    <button class="tool-link" onclick={collapseAll}>collapse</button>
    <button class="add-btn" onclick={() => {
      const newId = generateId();
      data.categories.push({
        id: newId,
        label: 'New Category',
        level: 'category',
        depth: 0,
        metrics: { future: '', now: '', gap: '' },
        timeline: [],
      });
      emitChange();
      pendingEditId = newId;
    }}>+ Add Category</button>
  </div>

  <div class="scroll-container" bind:this={scrollContainer} onscroll={handleScroll}>
    <TableHeader {hierarchyWidth} {metricWidths} {metricFrozen} {focusYear} onhierarchyresize={handleHierarchyResize} onresize={handleMetricResize} ontogglefreeze={handleToggleFreeze} onfocusyear={(y) => { focusYear = y; }} />

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
                {focusYear}
                autoEdit={pendingEditId === row.id}
                isDragged={dragState?.draggedId === row.id}
                isDropTarget={dragState?.targetId === row.id}
                dropPosition={dragState?.targetId === row.id ? dragState.position : undefined}
                ontoggle={handleToggle}
                onpopup={handlePopup}
                onmetricchange={handleMetricChange}
                onlabelchange={handleLabelChange}
                ontimelinechange={handleTimelineChange}
                onrowcontextmenu={handleRowContextMenu}
                onautoedited={() => { pendingEditId = null; }}
                ondragstart={handleDragStart}
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
  .chrono-wrapper.is-dragging {
    cursor: grabbing;
    user-select: none;
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
  .save-indicator {
    font-size: 9px;
    color: var(--text-faint);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    animation: fade-in-out 0.8s ease forwards;
  }
  @keyframes fade-in-out {
    0% { opacity: 0; }
    20% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
  .tool-link {
    font-size: 10px;
    color: var(--text-faint);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .tool-link:hover {
    color: var(--text-normal);
  }
  .tool-sep {
    font-size: 10px;
    color: var(--text-faint);
    opacity: 0.4;
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
