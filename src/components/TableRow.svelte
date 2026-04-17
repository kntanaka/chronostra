<script lang="ts">
  import type { FlatRow, ItemStatus } from '../types';
  import { effectiveScope } from '../types';
  import HierarchyCell from './HierarchyCell.svelte';
  import MetricCell from './MetricCell.svelte';
  import StatusCell from './StatusCell.svelte';
  import CommitmentCell from './CommitmentCell.svelte';
  import TimelineCell from './TimelineCell.svelte';

  import type { Commitment } from '../types';

  let { row, hierarchyWidth, metricWidths, metricFrozen, birthYear, focusYear, timelineStartYear, timelineEndYear, showSummaryMeta = false, autoEdit, isDragged, isDropTarget, dropPosition, justDropped, ontoggle, onpopup, onmetricchange, onstatuschange, onlabelchange, ontimelinechange, onrowcontextmenu, onautoedited, ondragstart, onnoteclick, oncommitmentchange }: {
    row: FlatRow;
    hierarchyWidth: number;
    metricWidths: number[];
    metricFrozen: boolean[];
    birthYear?: number | null;
    focusYear?: number | null;
    timelineStartYear: number;
    timelineEndYear: number;
    showSummaryMeta?: boolean;
    autoEdit?: boolean;
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
      {autoEdit}
      isDragging={isDragged}
      {ontoggle}
      {onlabelchange}
      {onautoedited}
      ondragstart={ondragstart ? (e) => ondragstart(e, row.id) : undefined}
      onnoteclick={onnoteclick ? () => onnoteclick(row.id) : undefined}
    />
  </div>

  {#each metricTypes as type, i}
    {@const isFrozen = frozenFlags[i]}
    {@const offset = stickyOffsets[i]}
    <div
      class="metric-col"
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
        onchange={onmetricchange ? (v) => onmetricchange(row.id, type, v) : undefined}
      />
    </div>
  {/each}

  <div
    class="metric-col"
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
      onchange={onstatuschange ? (v) => onstatuschange(row.id, v) : undefined}
    />
  </div>

  <div
    class="metric-col"
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
      onchange={oncommitmentchange ? (next) => oncommitmentchange(row.id, next) : undefined}
    />
  </div>

  {#each years as year (year)}
    {@const entry = timelineByYear.get(year) ?? { year, text: '' }}
    {@const milestone = birthYear != null && MILESTONE_AGES.has(year - birthYear)}
    <div class="timeline-wrap" class:milestone-col={milestone}>
      <TimelineCell {entry} {onpopup} focused={focusYear === year} onchange={ontimelinechange ? (year, text) => ontimelinechange(row.id, year, text) : undefined} />
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
  .table-row:hover :global(.hierarchy-cell),
  .table-row:hover :global(.metric-cell),
  .table-row:hover :global(.timeline-cell) {
    background: inherit !important;
  }
  .hierarchy-wrap {
    z-index: 2;
    flex-shrink: 0;
    transition: background 0.08s ease;
  }
  .table-row:hover .hierarchy-wrap,
  .table-row:hover .metric-col.frozen {
    background: var(--background-secondary) !important;
  }
  .metric-col {
    z-index: 0;
    flex-shrink: 0;
    transition: background 0.08s ease;
  }
  .metric-col.timeline-start-divider {
    box-shadow: inset -1px 0 0 0 var(--chronostra-timeline-divider);
  }
  .frozen {
    z-index: 2;
  }
  .timeline-wrap {
    position: relative;
    display: flex;
    align-items: stretch;
    min-width: var(--chronostra-col-timeline-w);
    max-width: var(--chronostra-col-timeline-w);
    flex-shrink: 0;
  }
  .milestone-col {
    position: relative;
  }
  .milestone-col::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--chronostra-milestone-line);
    pointer-events: none;
    z-index: 1;
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
