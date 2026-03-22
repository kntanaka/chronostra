<script lang="ts">
  const TIMELINE_START = 2025;
  const TIMELINE_END = 2050;
  const years = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i);

  const metricLabels = ['Future', 'Now', 'Gap'];

  let {
    hierarchyWidth,
    metricWidths,
    metricFrozen,
    onhierarchyresize,
    onresize,
    ontogglefreeze,
  }: {
    hierarchyWidth: number;
    metricWidths: number[];
    metricFrozen: boolean[];
    onhierarchyresize: (width: number) => void;
    onresize: (index: number, width: number) => void;
    ontogglefreeze: (index: number) => void;
  } = $props();

  // Compute sticky left offsets — only for frozen columns, and only if all preceding columns are also frozen
  const stickyOffsets = $derived(
    metricWidths.map((_, i) => {
      const allPriorFrozen = metricFrozen.slice(0, i).every(Boolean);
      if (!metricFrozen[i] || !allPriorFrozen) return null;
      return hierarchyWidth + metricWidths.slice(0, i).reduce((s, w) => s + w, 0);
    })
  );

  // Unified resize state: target is 'hierarchy' or metric index
  let resizing = $state<{ target: 'hierarchy' | number; startX: number; startW: number } | null>(null);

  function onPointerDown(e: PointerEvent, target: 'hierarchy' | number) {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const startW = target === 'hierarchy' ? hierarchyWidth : metricWidths[target];
    resizing = { target, startX: e.clientX, startW };
  }

  function onPointerMove(e: PointerEvent) {
    if (!resizing) return;
    const delta = e.clientX - resizing.startX;
    if (resizing.target === 'hierarchy') {
      onhierarchyresize(resizing.startW + delta);
    } else {
      onresize(resizing.target, resizing.startW + delta);
    }
  }

  function onPointerUp() {
    resizing = null;
  }

  // Context menu state
  let contextMenu = $state<{ index: number; x: number; y: number } | null>(null);

  function onContextMenu(e: MouseEvent, index: number) {
    e.preventDefault();
    contextMenu = { index, x: e.clientX, y: e.clientY };
  }

  function handleToggleFreeze() {
    if (contextMenu) {
      ontogglefreeze(contextMenu.index);
      contextMenu = null;
    }
  }

  function closeContextMenu() {
    contextMenu = null;
  }
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} onclick={closeContextMenu} />

<div class="table-header">
  <div
    class="header-cell hierarchy-header"
    style:min-width="{hierarchyWidth}px"
    style:max-width="{hierarchyWidth}px"
  >
    Plan
    <div
      class="resize-handle"
      class:active={resizing?.target === 'hierarchy'}
      onpointerdown={(e) => onPointerDown(e, 'hierarchy')}
    ></div>
  </div>

  {#each metricLabels as label, i}
    {@const offset = stickyOffsets[i]}
    <div
      class="header-cell metric-header"
      class:frozen={offset != null}
      style:left={offset != null ? `${offset}px` : 'auto'}
      style:position={offset != null ? 'sticky' : 'relative'}
      style:min-width="{metricWidths[i]}px"
      style:max-width="{metricWidths[i]}px"
      oncontextmenu={(e) => onContextMenu(e, i)}
    >
      {label}
      {#if offset == null}
        <span class="unfreeze-icon" title="Unfrozen">⇔</span>
      {/if}
      <div
        class="resize-handle"
        class:active={resizing?.target === i}
        onpointerdown={(e) => onPointerDown(e, i)}
      ></div>
    </div>
  {/each}

  {#each years as year}
    <div class="header-cell timeline-header">{year}</div>
  {/each}
</div>

{#if contextMenu}
  <div
    class="context-menu"
    style:left="{contextMenu.x}px"
    style:top="{contextMenu.y}px"
  >
    <button class="context-item" onclick={handleToggleFreeze}>
      {metricFrozen[contextMenu.index] ? '☐ Unfreeze column' : '☑ Freeze column'}
    </button>
  </div>
{/if}

<style>
  .table-header {
    display: flex;
    width: max-content;
    min-width: 100%;
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg-base);
    border-bottom: 2px solid var(--border-subtle);
  }
  .header-cell {
    display: flex;
    align-items: center;
    height: var(--row-height);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    box-sizing: border-box;
    position: relative;
  }
  .hierarchy-header {
    position: sticky;
    left: 0;
    z-index: 3;
    padding: 0 12px;
    background: var(--bg-base);
    user-select: none;
  }
  .metric-header {
    z-index: 2;
    justify-content: flex-start;
    padding: 0 10px;
    background: var(--bg-base);
    user-select: none;
    gap: 4px;
  }
  .metric-header.frozen {
    z-index: 2;
  }
  .unfreeze-icon {
    font-size: 9px;
    opacity: 0.4;
  }
  .timeline-header {
    min-width: var(--col-timeline-w);
    max-width: var(--col-timeline-w);
    justify-content: center;
  }
  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    cursor: col-resize;
    background: transparent;
    transition: background 0.15s;
  }
  .resize-handle:hover,
  .resize-handle.active {
    background: var(--accent);
  }
  .context-menu {
    position: fixed;
    z-index: 100;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 4px 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    min-width: 160px;
  }
  .context-item {
    display: block;
    width: 100%;
    padding: 6px 14px;
    font-size: 12px;
    color: var(--text-primary);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  .context-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }
</style>
