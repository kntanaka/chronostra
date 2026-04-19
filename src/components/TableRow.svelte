<script lang="ts">
  import type { CellColumnKey, CellNavigationDirection, FlatRow, ItemStatus } from '../types';
  import { effectiveScope } from '../types';
  import HierarchyCell from './HierarchyCell.svelte';
  import MetricCell from './MetricCell.svelte';
  import StatusCell from './StatusCell.svelte';
  import CommitmentCell from './CommitmentCell.svelte';
  import TimelineCell from './TimelineCell.svelte';

  import type { Commitment } from '../types';

  let { row, hierarchyWidth, metricWidths, metricFrozen, birthYear, focusYear, timelineStartYear, timelineEndYear, showSummaryMeta = false, autoEditColumn, isDragged, isDropTarget, dropPosition, justDropped, ontoggle, onpopup, onmetricchange, onstatuschange, onlabelchange, ontimelinechange, onrowcontextmenu, onautoedited, ondragstart, onnoteclick, oncommitmentchange, onnavigate }: {
    row: FlatRow;
    hierarchyWidth: number;
    metricWidths: number[];
    metricFrozen: boolean[];
    birthYear?: number | null;
    focusYear?: number | null;
    timelineStartYear: number;
    timelineEndYear: number;
    showSummaryMeta?: boolean;
    autoEditColumn?: CellColumnKey | null;
    isDragged?: boolean;
    isDropTarget?: boolean;
    dropPosition?: 'before' | 'after' | 'inside';
    justDropped?: boolean;
    ontoggle: (id: string) => void;
    onpopup: (text: string | null, x: number, y: number) => void;
    onmetricchange?: (id: string, type: 'future' | 'now' | 'gap', value: string) => void;
    onstatuschange?: (id: string, value: ItemStatus) => void;
    onlabelchange?: (id: string, newLabel: string) => void;
    ontimelinechange?: (id: string, year: number, text: string) => void;
    onrowcontextmenu?: (e: MouseEvent, rowId: string) => void;
    onautoedited?: () => void;
    ondragstart?: (e: PointerEvent, rowId: string) => void;
    onnoteclick?: (id: string) => void;
    oncommitmentchange?: (id: string, next: Commitment | undefined) => void;
    onnavigate?: (rowId: string, column: CellColumnKey, direction: CellNavigationDirection) => void;
  } = $props();

  type DisplayKind = 'category' | 'vision' | 'goal' | 'step';

  const bgMap: Record<DisplayKind, string> = {
    category: 'var(--chronostra-bg-category)',
    vision: 'var(--chronostra-bg-vision)',
    goal: 'var(--chronostra-bg-goal)',
    step: 'var(--chronostra-bg-step)'
  };

  const fontWeightMap: Record<DisplayKind, string> = {
    category: '700',
    vision: '600',
    goal: '500',
    step: '400'
  };

  const displayKind = $derived<DisplayKind>(
    row.depth === 0 ? 'category' : (effectiveScope(row.depth, row.scope) ?? 'goal')
  );

  const years = $derived.by(() => {
    const start = Math.min(timelineStartYear, timelineEndYear);
    const end = Math.max(timelineStartYear, timelineEndYear);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  // Map timeline entries by year for O(1) lookup
  const timelineByYear = $derived(
    new Map(row.timeline.map(e => [e.year, e]))
  );

  const MILESTONE_AGES = new Set([20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]);

  const metricTypes = ['future', 'now', 'gap'] as const;
  const STATUS_COL_INDEX = 3;
  const FOCUS_COL_INDEX = 4;

  const frozenFlags = $derived(
    metricWidths.map((_: number, i: number) => {
      const allPriorFrozen = metricFrozen.slice(0, i).every(Boolean);
      return metricFrozen[i] && allPriorFrozen;
    })
  );

  // Compute sticky left offsets for frozen metric columns (same logic as header)
  const stickyOffsets = $derived(
    metricWidths.map((_: number, i: number) => {
      if (!frozenFlags[i]) return null;
      return hierarchyWidth + metricWidths.slice(0, i).reduce((s: number, w: number) => s + w, 0);
    })
  );

  const commitmentMissingDeadline = $derived(
    row.commitment === 'must' && row.timeline.filter((entry) => entry.text.trim()).length === 0
  );

  function handleContextMenu(e: MouseEvent) {
    onrowcontextmenu?.(e, row.id);
  }

  function handleNavigate(column: CellColumnKey, direction: CellNavigationDirection) {
    onnavigate?.(row.id, column, direction);
  }
</script>

<div
  class="table-row kind-{displayKind}"
  class:dragged={isDragged}
  class:drop-before={isDropTarget && dropPosition === 'before'}
  class:drop-after={isDropTarget && dropPosition === 'after'}
  class:drop-inside={isDropTarget && dropPosition === 'inside'}
  class:just-dropped={justDropped}
  style:background={bgMap[displayKind]}
  style:font-weight={fontWeightMap[displayKind]}
  oncontextmenu={handleContextMenu}
>
  <div
    class="hierarchy-wrap frozen"
    data-row-id={row.id}
    data-column-key="hierarchy"
    style:position="sticky"
    style:left="0px"
    style:min-width="{hierarchyWidth}px"
    style:max-width="{hierarchyWidth}px"
    style:background={bgMap[displayKind]}
  >
    <HierarchyCell
      {row}
      width={hierarchyWidth}
      {showSummaryMeta}
      autoEdit={autoEditColumn === 'hierarchy'}
      isDragging={isDragged}
      {ontoggle}
      {onlabelchange}
      {onautoedited}
      ondragstart={ondragstart ? (e) => ondragstart(e, row.id) : undefined}
      onnoteclick={onnoteclick ? () => onnoteclick(row.id) : undefined}
      onnavigate={(direction) => handleNavigate('hierarchy', direction)}
    />
  </div>

  {#each metricTypes as type, i}
    {@const isFrozen = frozenFlags[i]}
    {@const offset = stickyOffsets[i]}
    <div
      class="metric-col"
      data-row-id={row.id}
      data-column-key={`metric:${type}`}
      class:frozen={isFrozen}
      style:position={isFrozen ? 'sticky' : 'relative'}
      style:left={offset != null ? `${offset}px` : 'auto'}
      style:background={bgMap[displayKind]}
      style:min-width="{metricWidths[i]}px"
      style:max-width="{metricWidths[i]}px"
    >
      <MetricCell
        value={row.metrics[type]}
        {type}
        width={metricWidths[i]}
        autoEdit={autoEditColumn === `metric:${type}`}
        onchange={onmetricchange ? (v) => onmetricchange(row.id, type, v) : undefined}
        onautoedited={onautoedited}
        onnavigate={(direction) => handleNavigate(`metric:${type}`, direction)}
      />
    </div>
  {/each}

  <div
    class="metric-col metric-col-status"
    data-row-id={row.id}
    data-column-key="status"
    class:frozen={frozenFlags[STATUS_COL_INDEX]}
    style:position={frozenFlags[STATUS_COL_INDEX] ? 'sticky' : 'relative'}
    style:left={stickyOffsets[STATUS_COL_INDEX] != null ? `${stickyOffsets[STATUS_COL_INDEX]}px` : 'auto'}
    style:background={bgMap[displayKind]}
    style:min-width="{metricWidths[STATUS_COL_INDEX]}px"
    style:max-width="{metricWidths[STATUS_COL_INDEX]}px"
  >
    <StatusCell
      value={row.status}
      width={metricWidths[STATUS_COL_INDEX]}
      autoEdit={autoEditColumn === 'status'}
      onStatusChange={onstatuschange ? (v) => onstatuschange(row.id, v) : undefined}
      onautoedited={onautoedited}
      onnavigate={(direction) => handleNavigate('status', direction)}
    />
  </div>

  <div
    class="metric-col"
    data-row-id={row.id}
    data-column-key="commitment"
    class:frozen={frozenFlags[FOCUS_COL_INDEX]}
    class:timeline-start-divider={true}
    style:position={frozenFlags[FOCUS_COL_INDEX] ? 'sticky' : 'relative'}
    style:left={stickyOffsets[FOCUS_COL_INDEX] != null ? `${stickyOffsets[FOCUS_COL_INDEX]}px` : 'auto'}
    style:background={bgMap[displayKind]}
    style:min-width="{metricWidths[FOCUS_COL_INDEX]}px"
    style:max-width="{metricWidths[FOCUS_COL_INDEX]}px"
  >
    <CommitmentCell
      value={row.commitment}
      width={metricWidths[FOCUS_COL_INDEX]}
      empty={row.depth === 0}
      needsDeadline={commitmentMissingDeadline}
      autoEdit={autoEditColumn === 'commitment'}
      onchange={oncommitmentchange ? (next) => oncommitmentchange(row.id, next) : undefined}
      onautoedited={onautoedited}
      onnavigate={(direction) => handleNavigate('commitment', direction)}
    />
  </div>

  {#each years as year (year)}
    {@const entry = timelineByYear.get(year) ?? { year, text: '' }}
    {@const milestone = birthYear != null && MILESTONE_AGES.has(year - birthYear)}
    <div
      class="timeline-wrap"
      data-row-id={row.id}
      data-column-key={`timeline:${year}`}
      class:milestone-col={milestone}
    >
      <TimelineCell
        {entry}
        {onpopup}
        focused={focusYear === year}
        autoEdit={autoEditColumn === `timeline:${year}`}
        onchange={ontimelinechange ? (year, text) => ontimelinechange(row.id, year, text) : undefined}
        onautoedited={onautoedited}
        onnavigate={(direction) => handleNavigate(`timeline:${year}`, direction)}
      />
    </div>
  {/each}
</div>

<style>
  .table-row {
    display: flex;
    width: max-content;
    min-width: 100%;
    position: relative;
    isolation: isolate;
    border-bottom: 1px solid var(--background-modifier-border);
    transition: background 0.08s ease;
  }
  .table-row:hover {
    background: var(--background-secondary) !important;
  }
  .table-row:focus-within {
    z-index: 90;
  }
  .table-row:hover :global(.hierarchy-cell),
  .table-row:hover :global(.metric-cell),
  .table-row:hover :global(.timeline-cell) {
    background: inherit !important;
  }
  .hierarchy-wrap {
    z-index: 2;
    flex-shrink: 0;
    transition: background 0.08s ease;
    overflow: visible;
  }
  .hierarchy-wrap:focus-within {
    z-index: 95;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--interactive-accent) 45%, transparent);
    background: color-mix(in srgb, var(--background-secondary) 72%, transparent) !important;
  }
  .table-row:hover .hierarchy-wrap,
  .table-row:hover .metric-col.frozen {
    background: var(--background-secondary) !important;
  }
  .metric-col {
    z-index: 1;
    flex-shrink: 0;
    transition: background 0.08s ease;
    overflow: visible;
  }
  .metric-col:focus-within {
    z-index: 95 !important;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--interactive-accent) 45%, transparent);
    background: color-mix(in srgb, var(--background-secondary) 72%, transparent) !important;
  }
  /* Status sits before Focus in DOM; if columns overlap (sticky/subpixel), later sibling
     would steal clicks. Keep Status above Focus so the hit target matches the label. */
  .metric-col.metric-col-status {
    z-index: 3;
  }
  .metric-col.metric-col-status.frozen {
    z-index: 4;
  }
  .metric-col.frozen {
    z-index: 2;
  }
  .metric-col.timeline-start-divider {
    box-shadow: inset -1px 0 0 0 var(--chronostra-timeline-divider);
  }
  .timeline-wrap {
    position: relative;
    display: flex;
    align-items: stretch;
    min-width: var(--chronostra-col-timeline-w);
    max-width: var(--chronostra-col-timeline-w);
    flex-shrink: 0;
    z-index: 0;
    overflow: visible;
  }
  .timeline-wrap:focus-within {
    z-index: 95;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--interactive-accent) 45%, transparent);
    background: color-mix(in srgb, var(--background-secondary) 72%, transparent) !important;
  }
  .milestone-col :global(.timeline-cell) {
    border-left: 1px solid var(--chronostra-milestone-line);
  }
  .table-row.dragged {
    opacity: 0.2;
  }
  .table-row.drop-before {
    box-shadow: 0 -2px 0 0 var(--interactive-accent) inset;
  }
  .table-row.drop-after {
    box-shadow: 0 2px 0 0 var(--interactive-accent) inset;
  }
  .table-row.drop-inside {
    outline: 2px solid var(--interactive-accent);
    outline-offset: -2px;
    background: var(--background-secondary) !important;
  }
  .table-row.just-dropped {
    animation: drop-flash 0.4s ease;
  }
  @keyframes drop-flash {
    0% { background: var(--interactive-accent); opacity: 0.7; }
    100% { opacity: 1; }
  }
</style>
