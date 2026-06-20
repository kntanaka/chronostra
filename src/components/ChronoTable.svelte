<script lang="ts">
  import { tick } from 'svelte';
  import type { CellColumnKey, CellNavigationDirection, ChronoData, TreeNode, ItemStatus, FlatRow, Scope, Commitment } from '../types';
  import { effectiveScope, MAX_DEPTH } from '../types';
  import type { TimelineDisplay } from '../settings';
  import { TreeState } from '../stores/tree-state.svelte';
  import { flattenTree } from '../stores/flat-rows.svelte';
  import TableHeader from './TableHeader.svelte';
  import TableRow from './TableRow.svelte';
  import CellPopup from './CellPopup.svelte';
  import DropdownSelect from './DropdownSelect.svelte';
  import MobileChronoList from './MobileChronoList.svelte';

  type StatusFilter = 'all' | ItemStatus;
  type ScopeFilter = 'all' | 'category' | Scope;
  type CommitmentFilter = 'all' | Commitment;
  type NoteFilter = 'all' | 'linked' | 'unlinked';
  type RowMenuState = { id: string; x: number; y: number } | null;
  type QuickCaptureType = 'task' | 'idea' | 'project' | 'goal';
  type QuickCaptureDraft = { label: string; type: QuickCaptureType };

  interface TemplateDraft {
    label: string;
    children?: TemplateDraft[];
  }

  interface RootTemplate {
    id: string;
    label: string;
    nodes: TemplateDraft[];
  }

  const ROW_HEIGHT = 64;
  const HISTORY_LIMIT = 50;
  const INBOX_CATEGORY_LABEL = '90 Inbox';
  const EXPANDED_TREE_STATE = { isExpanded: () => true } as TreeState;
  const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'All status' },
    { value: 'todo', label: 'To do' },
    { value: 'in-progress', label: 'WIP' },
    { value: 'done', label: 'Done' },
  ];
  const SCOPE_FILTER_OPTIONS = [
    { value: 'all', label: 'All scopes' },
    { value: 'category', label: 'Category' },
    { value: 'vision', label: 'Vision' },
    { value: 'goal', label: 'Goal' },
    { value: 'step', label: 'Step' },
  ];
  const COMMITMENT_FILTER_OPTIONS = [
    { value: 'all', label: 'All focus' },
    { value: 'must', label: 'Must ★' },
    { value: 'wish', label: 'Wish ☆' },
  ];
  const NOTE_FILTER_OPTIONS = [
    { value: 'all', label: 'All notes' },
    { value: 'linked', label: 'Linked note' },
    { value: 'unlinked', label: 'No note' },
  ];
  const TIMELINE_DISPLAY_OPTIONS = [
    { value: 'year', label: 'Year' },
    { value: 'age', label: 'Age' },
    { value: 'both', label: 'Year + age' },
  ];

  const ROOT_TEMPLATES: RootTemplate[] = [
    {
      id: 'life-areas',
      label: 'Life areas',
      nodes: [
        { label: 'Health' },
        { label: 'Work' },
        { label: 'Relationships' },
        { label: 'Money' },
        { label: 'Learning' },
        { label: 'Home' },
      ],
    },
    {
      id: 'goal-stack',
      label: 'Goal stack',
      nodes: [
        {
          label: 'Flagship vision',
          children: [
            {
              label: 'Supporting goal',
              children: [{ label: 'Next step' }],
            },
          ],
        },
      ],
    },
    {
      id: 'annual-reset',
      label: 'Annual reset',
      nodes: [
        {
          label: 'Year vision',
          children: [
            { label: 'Theme goal' },
            { label: 'Project step' },
            { label: 'Habit step' },
          ],
        },
      ],
    },
  ];

  function getOwnerWindow(el?: HTMLElement | null): Window {
    return el?.ownerDocument.defaultView ?? window;
  }

  let {
    data: initialData,
    initialExpandedIds = [],
    birthDate = '',
    timelineDisplay: initialTimelineDisplay = 'year' as TimelineDisplay,
    timelineStartYear: initialTimelineStartYear = 2025,
    timelineEndYear: initialTimelineEndYear = 2050,
    showRowBorders: initialShowRowBorders = true,
    showSummaryMeta = false,
    zenMode: initialZenMode = false,
    sourcePath = '',
    onExpandChange,
    onDataChange,
    onSettingsChange,
    onEnsureNote,
  }: {
    data: ChronoData;
    initialExpandedIds?: string[];
    birthDate?: string;
    timelineDisplay?: TimelineDisplay;
    timelineStartYear?: number;
    timelineEndYear?: number;
    showRowBorders?: boolean;
    showSummaryMeta?: boolean;
    zenMode?: boolean;
    sourcePath?: string;
    onExpandChange?: (expandedIds: string[]) => void;
    onDataChange?: (data: ChronoData) => void;
    onSettingsChange?: (key: string, value: unknown) => void;
    onEnsureNote?: (payload: {
      notePath?: string;
      sourcePath: string;
      hierarchyPath: string[];
    }) => Promise<string | null>;
  } = $props();

  function getInitialTimelineDisplay() {
    return initialTimelineDisplay;
  }

  function getInitialTimelineStartYear() {
    return initialTimelineStartYear;
  }

  function getInitialTimelineEndYear() {
    return initialTimelineEndYear;
  }

  function getInitialShowRowBorders() {
    return initialShowRowBorders;
  }

  function getInitialZenMode() {
    return initialZenMode;
  }

  function getInitialData() {
    return structuredClone(initialData);
  }

  function getInitialExpandedIds() {
    return initialExpandedIds.length > 0
      ? initialExpandedIds
      : initialData.categories.map((c) => c.id);
  }

  let timelineDisplay = $state<TimelineDisplay>(getInitialTimelineDisplay());
  let timelineStartYear = $state(getInitialTimelineStartYear());
  let timelineEndYear = $state(getInitialTimelineEndYear());
  let showBorders = $state(getInitialShowRowBorders());
  let zenMode = $state(getInitialZenMode());

  let searchQuery = $state('');
  let statusFilter = $state<StatusFilter>('all');
  let scopeFilter = $state<ScopeFilter>('all');
  let commitmentFilter = $state<CommitmentFilter>('all');
  let noteFilter = $state<NoteFilter>('all');
  let focusId = $state<string | null>(null);
  let selectedCategoryIds = $state<string[]>([]);
  let showTemplateMenu = $state(false);
  let revealRowId = $state<string | null>(null);
  let lastFilterKey = $state('');

  // Mutable copy of the data tree
  let data = $state<ChronoData>(getInitialData());
  const treeState = new TreeState();
  treeState.expanded = new Set(getInitialExpandedIds());

  const hasCategorySelection = $derived(selectedCategoryIds.length > 0);

  const focusedCategories = $derived.by(() => {
    if (focusId) {
      const node = findNode(data.categories, focusId);
      return node ? [node] : data.categories;
    }
    if (hasCategorySelection) {
      return data.categories.filter((category) => selectedCategoryIds.includes(category.id));
    }
    return data.categories;
  });

  const visibleRows = $derived(flattenTree(focusedCategories, treeState));
  const expandedRows = $derived(flattenTree(focusedCategories, EXPANDED_TREE_STATE));
  const overviewRows = $derived(
    flattenTree(data.categories, { isExpanded: () => false } as TreeState)
  );

  const activeOverviewIds = $derived.by(() => {
    if (hasCategorySelection) {
      return new Set(selectedCategoryIds);
    }
    if (!focusId) {
      return new Set<string>();
    }

    const categoryId = findCategoryIdForNode(data.categories, focusId);
    return categoryId ? new Set([categoryId]) : new Set<string>();
  });

  const hasOverviewSelection = $derived(activeOverviewIds.size > 0);

  const hasActiveFilters = $derived(
    searchQuery.trim().length > 0 ||
      statusFilter !== 'all' ||
      scopeFilter !== 'all' ||
      commitmentFilter !== 'all' ||
      noteFilter !== 'all'
  );

  const filterKey = $derived(
    [
      searchQuery.trim(),
      statusFilter,
      scopeFilter,
      commitmentFilter,
      noteFilter,
    ].join('\u0000')
  );

  const zenStatusText = $derived.by(() => {
    const parts: string[] = [];
    if (searchQuery.trim()) parts.push('search');
    if (statusFilter !== 'all') parts.push(statusFilter);
    if (scopeFilter !== 'all') parts.push(scopeFilter);
    if (commitmentFilter !== 'all') parts.push(commitmentFilter);
    if (noteFilter !== 'all') parts.push(noteFilter);
    if (focusId || hasCategorySelection) parts.push('focused');
    return parts.length > 0 ? parts.join(' / ') : 'all rows';
  });

  const flatRows = $derived.by((): FlatRow[] => {
    if (!hasActiveFilters) return visibleRows;

    const visibleIds = new Set<string>();
    for (const row of expandedRows) {
      if (matchesRowFilters(row) || row.id === revealRowId) {
        visibleIds.add(row.id);
        for (const parentId of row.parentIds) {
          visibleIds.add(parentId);
        }
      }
    }

    return expandedRows.filter((row) => visibleIds.has(row.id));
  });

  $effect(() => {
    const nextKey = filterKey;
    if (lastFilterKey && nextKey !== lastFilterKey) {
      revealRowId = null;
    }
    lastFilterKey = nextKey;
  });

  const birthYear = $derived.by(() => {
    if (!birthDate) return null;
    const digits = birthDate.replace(/\D/g, '');
    if (digits.length < 4) return null;
    return parseInt(digits.substring(0, 4), 10);
  });

  function matchesRowFilters(row: FlatRow): boolean {
    const search = searchQuery.trim().toLowerCase();
    if (search) {
      const haystack = [
        row.label,
        row.metrics.future,
        row.metrics.now,
        row.metrics.gap,
        row.notePath ?? '',
        ...row.timeline.map((entry) => entry.text),
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (statusFilter !== 'all' && (row.status ?? 'todo') !== statusFilter) {
      return false;
    }

    if (scopeFilter !== 'all') {
      const rowKind = row.depth === 0 ? 'category' : (effectiveScope(row.depth, row.scope) ?? 'goal');
      if (rowKind !== scopeFilter) return false;
    }

    if (commitmentFilter !== 'all' && row.commitment !== commitmentFilter) {
      return false;
    }

    if (noteFilter === 'linked' && !row.notePath) {
      return false;
    }

    if (noteFilter === 'unlinked' && row.notePath) {
      return false;
    }

    return true;
  }

  function updateTimelineDisplay(next: string) {
    timelineDisplay = next as TimelineDisplay;
    onSettingsChange?.('timelineDisplay', timelineDisplay);
  }

  function normalizeTimelineRange(start: number, end: number) {
    const safeStart = Math.max(1900, Math.min(start, end));
    const safeEnd = Math.min(2200, Math.max(start, end));
    timelineStartYear = safeStart;
    timelineEndYear = safeEnd;
    onSettingsChange?.('timelineStartYear', safeStart);
    onSettingsChange?.('timelineEndYear', safeEnd);
  }

  function toggleZenMode() {
    zenMode = !zenMode;
    showTemplateMenu = false;
    closeRowMenu();
    onSettingsChange?.('zenMode', zenMode);
  }

  let wrapperEl: HTMLDivElement | undefined = $state();
  let scrollContainer: HTMLDivElement | undefined = $state();
  let rowListEl: HTMLDivElement | undefined = $state();
  let contentWidth = $state(1024);
  const isMobileLayout = $derived(contentWidth <= 760);

  $effect(() => {
    if (!wrapperEl) return;

    const updateWidth = () => {
      contentWidth = wrapperEl?.clientWidth ?? 1024;
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(wrapperEl);
    return () => observer.disconnect();
  });

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

  let hierarchyWidth = $state(280);
  let metricWidths = $state([180, 180, 180, 92, 92]);
  let metricFrozen = $state([false, false, false, false, false]);

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

  function handleScroll() {
    // Reserved for future scroll-linked behavior.
  }

  let popupText = $state<string | null>(null);
  let popupX = $state(0);
  let popupY = $state(0);
  let activeRowId = $state<string | null>(null);

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

  function snapshotData(): ChronoData {
    return structuredClone($state.snapshot(data));
  }

  let undoStack = $state<ChronoData[]>([]);
  let redoStack = $state<ChronoData[]>([]);
  let saveIndicator = $state(false);
  let pendingEditId = $state<string | null>(null);
  let pendingEditColumn = $state<CellColumnKey | null>(null);

  function getColumnOrder(): CellColumnKey[] {
    const years = Array.from(
      { length: Math.max(timelineEndYear, timelineStartYear) - Math.min(timelineStartYear, timelineEndYear) + 1 },
      (_, i) => Math.min(timelineStartYear, timelineEndYear) + i
    );
    return [
      'hierarchy',
      'metric:future',
      'metric:now',
      'metric:gap',
      'status',
      'commitment',
      ...years.map((year) => `timeline:${year}` as const),
    ];
  }

  function queueEditTarget(rowId: string, column: CellColumnKey) {
    pendingEditId = rowId;
    pendingEditColumn = column;
    activeRowId = rowId;
    void scrollCellIntoView(rowId, column);
  }

  function queueCreatedRow(rowId: string) {
    revealRowId = rowId;
    queueEditTarget(rowId, 'hierarchy');
  }

  function clearEditTarget() {
    pendingEditId = null;
    pendingEditColumn = null;
  }

  async function scrollCellIntoView(rowId: string, column: CellColumnKey) {
    await tick();
    if (!scrollContainer) return;

    const target = scrollContainer.querySelector<HTMLElement>(
      `[data-row-id="${rowId}"][data-column-key="${column}"]`
    );
    if (!target) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const padding = 16;

    if (targetRect.left < containerRect.left + padding) {
      scrollContainer.scrollLeft -= containerRect.left + padding - targetRect.left;
    } else if (targetRect.right > containerRect.right - padding) {
      scrollContainer.scrollLeft += targetRect.right - (containerRect.right - padding);
    }

    if (targetRect.top < containerRect.top + padding) {
      scrollContainer.scrollTop -= containerRect.top + padding - targetRect.top;
    } else if (targetRect.bottom > containerRect.bottom - padding) {
      scrollContainer.scrollTop += targetRect.bottom - (containerRect.bottom - padding);
    }
  }

  function handleCellNavigate(rowId: string, column: CellColumnKey, direction: CellNavigationDirection) {
    const rowIndex = flatRows.findIndex((row) => row.id === rowId);
    if (rowIndex === -1) return;

    const columns = getColumnOrder();
    const columnIndex = columns.indexOf(column);
    if (columnIndex === -1) return;

    let nextRowIndex = rowIndex;
    let nextColumnIndex = columnIndex;

    if (direction === 'up') nextRowIndex -= 1;
    if (direction === 'down') nextRowIndex += 1;
    if (direction === 'left') {
      if (columnIndex === 0) {
        nextRowIndex -= 1;
        nextColumnIndex = columns.length - 1;
      } else {
        nextColumnIndex -= 1;
      }
    }
    if (direction === 'right') {
      if (columnIndex === columns.length - 1) {
        nextRowIndex += 1;
        nextColumnIndex = 0;
      } else {
        nextColumnIndex += 1;
      }
    }

    if (nextRowIndex < 0 || nextRowIndex >= flatRows.length) return;
    if (nextColumnIndex < 0 || nextColumnIndex >= columns.length) return;

    queueEditTarget(flatRows[nextRowIndex].id, columns[nextColumnIndex]);
  }

  function emitChange() {
    data = { ...data };
    onDataChange?.(data);
    saveIndicator = true;
    getOwnerWindow(wrapperEl).setTimeout(() => {
      saveIndicator = false;
    }, 800);
  }

  function commitMutation(mutator: () => boolean | void) {
    const before = snapshotData();
    const changed = mutator();
    if (changed === false) return;

    undoStack = [...undoStack, before].slice(-HISTORY_LIMIT);
    redoStack = [];
    emitChange();
  }

  function applySnapshot(snapshot: ChronoData, mode: 'undo' | 'redo') {
    if (mode === 'undo') {
      redoStack = [...redoStack, snapshotData()].slice(-HISTORY_LIMIT);
    } else {
      undoStack = [...undoStack, snapshotData()].slice(-HISTORY_LIMIT);
    }
    data = structuredClone(snapshot);
    emitChange();
  }

  function undo() {
    const snapshot = undoStack[undoStack.length - 1];
    if (!snapshot) return;
    undoStack = undoStack.slice(0, -1);
    applySnapshot(snapshot, 'undo');
  }

  function redo() {
    const snapshot = redoStack[redoStack.length - 1];
    if (!snapshot) return;
    redoStack = redoStack.slice(0, -1);
    applySnapshot(snapshot, 'redo');
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );
  }

  function handleWindowKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !isEditableTarget(e.target)) {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y' && !isEditableTarget(e.target)) {
      e.preventDefault();
      redo();
      return;
    }

    if (e.key === 'Escape' && (dragPending || dragState)) {
      dragPending = null;
      dragState = null;
      removeDragGhost();
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

  function findCategoryIdForNode(nodes: TreeNode[], id: string): string | null {
    for (const node of nodes) {
      if (node.id === id) return node.depth === 0 ? node.id : null;
      if (node.children && containsNode(node.children, id)) {
        return node.id;
      }
    }
    return null;
  }

  function containsNode(nodes: TreeNode[], id: string): boolean {
    for (const node of nodes) {
      if (node.id === id) return true;
      if (node.children && containsNode(node.children, id)) {
        return true;
      }
    }
    return false;
  }

  function findPathToNode(nodes: TreeNode[], id: string, path: string[] = []): string[] | null {
    for (const node of nodes) {
      const nextPath = [...path, node.label];
      if (node.id === id) return nextPath;
      if (node.children) {
        const found = findPathToNode(node.children, id, nextPath);
        if (found) return found;
      }
    }
    return null;
  }

  function findParentAndIndex(nodes: TreeNode[], id: string): { parent: TreeNode[]; index: number } | null {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return { parent: nodes, index: i };
      if (nodes[i].children) {
        const found = findParentAndIndex(nodes[i].children!, id);
        if (found) return found;
      }
    }
    return null;
  }

  function computeParentStatus(node: TreeNode): ItemStatus | undefined {
    if (!node.children || node.children.length === 0) return undefined;
    const statuses = node.children.map((child) => child.status ?? 'todo');
    if (statuses.every((status) => status === 'done')) return 'done';
    if (statuses.some((status) => status === 'in-progress' || status === 'done')) return 'in-progress';
    return 'todo';
  }

  function findAncestorChain(nodes: TreeNode[], id: string, chain: TreeNode[] = []): TreeNode[] | null {
    for (const node of nodes) {
      if (node.id === id) return chain;
      if (node.children) {
        const found = findAncestorChain(node.children, id, [...chain, node]);
        if (found) return found;
      }
    }
    return null;
  }

  function updateAncestors(id: string) {
    const ancestors = findAncestorChain(data.categories, id);
    if (!ancestors) return;
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const newStatus = computeParentStatus(ancestors[i]);
      if (newStatus) ancestors[i].status = newStatus;
    }
  }

  function handleMetricChange(id: string, type: 'future' | 'now' | 'gap', value: string) {
    commitMutation(() => {
      const node = findNode(data.categories, id);
      if (!node || node.metrics[type] === value) return false;
      node.metrics[type] = value;
      return true;
    });
  }

  function handleStatusChange(id: string, value: ItemStatus) {
    commitMutation(() => {
      const node = findNode(data.categories, id);
      if (!node || node.status === value) return false;
      node.status = value;
      updateAncestors(id);
      return true;
    });
  }

  function handleTimelineChange(id: string, year: number, text: string) {
    commitMutation(() => {
      const node = findNode(data.categories, id);
      if (!node) return false;
      const cleanText = text.trim();
      const existing = node.timeline.find((entry) => entry.year === year);

      if (existing) {
        if (existing.text === cleanText) return false;
        if (cleanText) {
          existing.text = cleanText;
        } else {
          node.timeline = node.timeline.filter((entry) => entry.year !== year);
        }
        return true;
      }

      if (!cleanText) return false;
      node.timeline.push({ year, text: cleanText });
      node.timeline.sort((a, b) => a.year - b.year);
      return true;
    });
  }

  function handleScopeChange(id: string, scope: Scope | undefined) {
    commitMutation(() => {
      const node = findNode(data.categories, id);
      if (!node || node.scope === scope) return false;
      node.scope = scope;
      return true;
    });
  }

  function handleCommitmentChange(id: string, commitment: Commitment | undefined) {
    commitMutation(() => {
      const node = findNode(data.categories, id);
      if (!node || node.commitment === commitment) return false;
      node.commitment = commitment;
      return true;
    });
  }

  function handleLabelChange(id: string, newLabel: string) {
    commitMutation(() => {
      const node = findNode(data.categories, id);
      if (!node || node.label === newLabel) return false;
      node.label = newLabel;
      return true;
    });
  }

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function createNode(label: string, depth: number): TreeNode {
    return {
      id: generateId(),
      label,
      depth,
      metrics: { future: '', now: '', gap: '' },
      timeline: [],
    };
  }

  function isInboxCategory(label: string): boolean {
    return /^90(\b|[\s_-])/i.test(label.trim());
  }

  function findInboxCategory(): TreeNode | undefined {
    return data.categories.find((category) => isInboxCategory(category.label));
  }

  function scopeForQuickCaptureType(type: QuickCaptureType): Scope {
    if (type === 'goal') return 'vision';
    if (type === 'project') return 'goal';
    return 'step';
  }

  function cloneNode(node: TreeNode, isRoot = true): TreeNode {
    return {
      ...structuredClone(node),
      id: generateId(),
      label: isRoot ? `${node.label} copy` : node.label,
      notePath: undefined,
      children: node.children?.map((child) => cloneNode(child, false)),
    };
  }

  function createTemplateNodes(drafts: TemplateDraft[], depth: number): TreeNode[] {
    return drafts.map((draft) => ({
      id: generateId(),
      label: draft.label,
      depth,
      metrics: { future: '', now: '', gap: '' },
      timeline: [],
      children: draft.children ? createTemplateNodes(draft.children, depth + 1) : undefined,
    }));
  }

  function addCategory() {
    const newNode = createNode('New category', 0);
    commitMutation(() => {
      data.categories.push(newNode);
      return true;
    });
    pendingEditId = newNode.id;
  }

  function quickCaptureToInbox(draft: QuickCaptureDraft) {
    const label = draft.label.trim();
    if (!label) return;

    const newId = generateId();
    commitMutation(() => {
      let inbox = findInboxCategory();
      if (!inbox) {
        inbox = createNode(INBOX_CATEGORY_LABEL, 0);
        data.categories.push(inbox);
      }

      if (!inbox.children) inbox.children = [];

      const item = createNode(label, 1);
      item.id = newId;
      item.scope = scopeForQuickCaptureType(draft.type);
      item.status = 'todo';
      inbox.children.unshift(item);
      treeState.expand(inbox.id);
      return true;
    });

    selectedCategoryIds = [];
    focusId = null;
    pendingEditId = newId;
  }

  function addChild(parentId: string) {
    const newId = generateId();
    let didCreate = false;
    commitMutation(() => {
      const node = findNode(data.categories, parentId);
      if (!node) return false;
      if (node.depth >= MAX_DEPTH) return false;
      if (!node.children) node.children = [];
      const child = createNode('New item', node.depth + 1);
      child.id = newId;
      node.children.push(child);
      treeState.expand(parentId);
      didCreate = true;
      return true;
    });
    if (didCreate) queueCreatedRow(newId);
  }

  function addSibling(id: string) {
    const newId = generateId();
    let didCreate = false;
    let shouldFocusCreatedRow = false;
    commitMutation(() => {
      const loc = findParentAndIndex(data.categories, id);
      if (!loc) return false;
      const sibling = loc.parent[loc.index];
      const next = createNode('New item', sibling.depth);
      next.id = newId;
      loc.parent.splice(loc.index + 1, 0, next);
      shouldFocusCreatedRow = focusId !== null || (hasCategorySelection && sibling.depth === 0);
      didCreate = true;
      return true;
    });
    if (didCreate) {
      if (shouldFocusCreatedRow) {
        selectedCategoryIds = [];
        focusId = newId;
      }
      queueCreatedRow(newId);
    }
  }

  function deleteRow(id: string) {
    commitMutation(() => {
      const loc = findParentAndIndex(data.categories, id);
      if (!loc) return false;
      loc.parent.splice(loc.index, 1);
      return true;
    });
  }

  function duplicateRow(id: string) {
    const newId = generateId();
    commitMutation(() => {
      const loc = findParentAndIndex(data.categories, id);
      if (!loc) return false;
      const duplicate = cloneNode(loc.parent[loc.index]);
      duplicate.id = newId;
      loc.parent.splice(loc.index + 1, 0, duplicate);
      return true;
    });
    pendingEditId = newId;
  }

  function insertStarterChain(parentId: string) {
    const parent = findNode(data.categories, parentId);
    if (!parent || parent.depth >= MAX_DEPTH) return;

    const maxDepth = Math.min(parent.depth + 3, MAX_DEPTH);
    const drafts: TemplateDraft[] = [
      {
        label: 'Starter vision',
        children:
          maxDepth >= parent.depth + 2
            ? [
                {
                  label: 'Starter goal',
                  children: maxDepth >= parent.depth + 3 ? [{ label: 'Starter step' }] : undefined,
                },
              ]
            : undefined,
      },
    ];

    commitMutation(() => {
      const node = findNode(data.categories, parentId);
      if (!node) return false;
      if (!node.children) node.children = [];
      node.children.push(...createTemplateNodes(drafts, node.depth + 1));
      treeState.expand(parentId);
      return true;
    });
  }

  function insertRootTemplate(templateId: string) {
    const template = ROOT_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    const nodes = createTemplateNodes(template.nodes, 0);
    const firstId = nodes[0]?.id ?? null;
    commitMutation(() => {
      data.categories.push(...nodes);
      return true;
    });
    pendingEditId = firstId;
    showTemplateMenu = false;
  }

  async function handleNoteClick(id: string) {
    if (!onEnsureNote) return;

    const node = findNode(data.categories, id);
    if (!node) return;

    const hierarchyPath = findPathToNode(data.categories, id);
    if (!hierarchyPath) return;

    const notePath = await onEnsureNote({
      notePath: node.notePath,
      sourcePath,
      hierarchyPath,
    });

    if (!notePath || notePath === node.notePath) return;

    commitMutation(() => {
      const current = findNode(data.categories, id);
      if (!current || current.notePath === notePath) return false;
      current.notePath = notePath;
      return true;
    });
  }

  function unlinkNote(id: string) {
    commitMutation(() => {
      const node = findNode(data.categories, id);
      if (!node || !node.notePath) return false;
      node.notePath = undefined;
      return true;
    });
  }

  // --- Drag and drop ---
  const DRAG_THRESHOLD = 5;
  const AUTO_SCROLL_ZONE = 40;
  const AUTO_SCROLL_MAX_SPEED = 12;

  let dragState = $state<{
    draggedId: string;
    targetId: string | null;
    position: 'before' | 'after' | 'inside';
  } | null>(null);
  let dragGhost: HTMLElement | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragPending = $state<{ rowId: string; startX: number; startY: number; rowEl: HTMLElement | null } | null>(null);
  let autoScrollRaf = 0;
  let lastDropTargetId = $state<string | null>(null);

  function handleDragStart(e: PointerEvent, rowId: string) {
    const rowEl = (e.target as HTMLElement).closest('.row-wrapper') as HTMLElement | null;
    dragPending = { rowId, startX: e.clientX, startY: e.clientY, rowEl };
  }

  function createGhost(rowEl: HTMLElement, e: PointerEvent) {
    const rect = rowEl.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    const clone = rowEl.cloneNode(true) as HTMLElement;
    clone.classList.add('chronostra-drag-ghost');
    clone.setCssProps({
      '--ghost-width': `${rect.width}px`,
      '--ghost-height': `${rect.height}px`,
      '--ghost-left': `${rect.left}px`,
      '--ghost-top': `${rect.top}px`,
    });
    rowEl.ownerDocument.body.appendChild(clone);
    dragGhost = clone;
  }

  function startAutoScroll(clientY: number) {
    const ownerWindow = getOwnerWindow(scrollContainer);
    ownerWindow.cancelAnimationFrame(autoScrollRaf);
    if (!scrollContainer) return;

    const rect = scrollContainer.getBoundingClientRect();
    const topDist = clientY - rect.top;
    const bottomDist = rect.bottom - clientY;
    let speed = 0;

    if (topDist < AUTO_SCROLL_ZONE && topDist > 0) {
      speed = -AUTO_SCROLL_MAX_SPEED * (1 - topDist / AUTO_SCROLL_ZONE);
    } else if (bottomDist < AUTO_SCROLL_ZONE && bottomDist > 0) {
      speed = AUTO_SCROLL_MAX_SPEED * (1 - bottomDist / AUTO_SCROLL_ZONE);
    }

    if (speed !== 0) {
      const scroll = () => {
        if (!scrollContainer || !dragState) return;
        scrollContainer.scrollTop += speed;
        autoScrollRaf = ownerWindow.requestAnimationFrame(scroll);
      };
      autoScrollRaf = ownerWindow.requestAnimationFrame(scroll);
    }
  }

  function handleDragMove(e: PointerEvent) {
    if (dragPending && !dragState) {
      const dx = e.clientX - dragPending.startX;
      const dy = e.clientY - dragPending.startY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

      dragState = { draggedId: dragPending.rowId, targetId: null, position: 'after' };
      if (dragPending.rowEl) {
        createGhost(dragPending.rowEl, e);
      }
      dragPending = null;
    }

    if (!dragState || !scrollContainer) return;

    if (dragGhost) {
      dragGhost.setCssProps({
        '--ghost-left': `${e.clientX - dragOffsetX}px`,
        '--ghost-top': `${e.clientY - dragOffsetY}px`,
      });
    }

    startAutoScroll(e.clientY);

    const scrollRect = scrollContainer.getBoundingClientRect();
    const rowListOffset = rowListEl?.offsetTop ?? 0;
    const y = e.clientY - scrollRect.top + scrollContainer.scrollTop - rowListOffset;

    let targetRow: FlatRow | null = null;
    let pos: 'before' | 'after' | 'inside' = 'after';

    const rowIndex = Math.floor(y / ROW_HEIGHT);
    if (rowIndex >= 0 && rowIndex < flatRows.length) {
      targetRow = flatRows[rowIndex];
      const relY = y - rowIndex * ROW_HEIGHT;
      const quarter = ROW_HEIGHT * 0.25;
      if (relY < quarter) {
        pos = 'before';
      } else if (relY > ROW_HEIGHT - quarter) {
        pos = 'after';
      } else {
        pos = 'inside';
      }
    } else if (y >= flatRows.length * ROW_HEIGHT && flatRows.length > 0) {
      targetRow = flatRows[flatRows.length - 1];
    }

    if (targetRow && targetRow.id !== dragState.draggedId) {
      if (!isDescendant(dragState.draggedId, targetRow.id)) {
        dragState = { ...dragState, targetId: targetRow.id, position: pos };
      } else {
        dragState = { ...dragState, targetId: null, position: 'after' };
      }
    }
  }

  function removeDragGhost() {
    if (dragGhost) {
      dragGhost.remove();
      dragGhost = null;
    }
    getOwnerWindow(scrollContainer).cancelAnimationFrame(autoScrollRaf);
  }

  function handleDragEnd() {
    removeDragGhost();

    if (dragPending) {
      dragPending = null;
      return;
    }

    if (!dragState || !dragState.targetId) {
      dragState = null;
      return;
    }

    const { draggedId, targetId, position } = dragState;
    dragState = null;

    if (draggedId === targetId) return;

    lastDropTargetId = targetId;
    getOwnerWindow(scrollContainer).setTimeout(() => {
      lastDropTargetId = null;
    }, 400);

    commitMutation(() => {
      const srcLoc = findParentAndIndex(data.categories, draggedId);
      if (!srcLoc) return false;
      const [draggedNode] = srcLoc.parent.splice(srcLoc.index, 1);

      if (position === 'inside') {
        const targetNode = findNode(data.categories, targetId);
        if (!targetNode) {
          srcLoc.parent.splice(srcLoc.index, 0, draggedNode);
          return false;
        }
        if (!targetNode.children) targetNode.children = [];
        updateDepth(draggedNode, targetNode.depth + 1 - draggedNode.depth);
        targetNode.children.push(draggedNode);
        treeState.expand(targetId);
        return true;
      }

      const dstLoc = findParentAndIndex(data.categories, targetId);
      if (!dstLoc) {
        srcLoc.parent.splice(srcLoc.index, 0, draggedNode);
        return false;
      }

      const insertIndex = position === 'before' ? dstLoc.index : dstLoc.index + 1;
      const targetNode = dstLoc.parent[dstLoc.index] ?? dstLoc.parent[dstLoc.parent.length - 1];
      updateDepth(draggedNode, (targetNode?.depth ?? 0) - draggedNode.depth);
      dstLoc.parent.splice(insertIndex, 0, draggedNode);
      return true;
    });
  }

  function isDescendant(ancestorId: string, nodeId: string): boolean {
    const ancestor = findNode(data.categories, ancestorId);
    if (!ancestor?.children) return false;
    for (const child of ancestor.children) {
      if (child.id === nodeId) return true;
      if (child.children && isDescendant(child.id, nodeId)) return true;
    }
    return false;
  }

  function updateDepth(node: TreeNode, delta: number) {
    node.depth += delta;
    if (node.children) {
      for (const child of node.children) {
        updateDepth(child, delta);
      }
    }
  }

  let rowMenu = $state<RowMenuState>(null);

  function handleRowContextMenu(e: MouseEvent, rowId: string) {
    e.preventDefault();
    showTemplateMenu = false;
    if (scrollContainer) {
      const scrollRect = scrollContainer.getBoundingClientRect();
      rowMenu = {
        id: rowId,
        x: e.clientX - scrollRect.left + scrollContainer.scrollLeft,
        y: e.clientY - scrollRect.top + scrollContainer.scrollTop,
      };
    }
  }

  function closeRowMenu() {
    rowMenu = null;
  }

  function closeTransientMenus() {
    closeRowMenu();
    showTemplateMenu = false;
  }

  function resetFilters() {
    searchQuery = '';
    statusFilter = 'all';
    scopeFilter = 'all';
    commitmentFilter = 'all';
    noteFilter = 'all';
    revealRowId = null;
  }

  function toggleCategorySelection(categoryId: string) {
    focusId = null;
    selectedCategoryIds = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
    showTemplateMenu = false;
  }

  function clearFocusSelection() {
    focusId = null;
    selectedCategoryIds = [];
  }
</script>

<svelte:window
  onclick={closeTransientMenus}
  onpointermove={(dragPending || dragState) ? handleDragMove : undefined}
  onpointerup={(dragPending || dragState) ? handleDragEnd : undefined}
  onkeydown={handleWindowKeydown}
/>

<div
  class="chrono-wrapper"
  class:is-dragging={!!dragState}
  class:is-mobile-layout={isMobileLayout}
  bind:this={wrapperEl}
>
  <div class="sticky-chrome">
    <div class="toolbar" class:mobile-toolbar={isMobileLayout} class:zen-toolbar={zenMode}>
      {#if zenMode}
        <div class="zen-toolbar-row">
          <div class="zen-title-stack">
            <span class="title">Chronostra</span>
            <span class="row-count">{flatRows.length} rows · {zenStatusText}</span>
            {#if saveIndicator}
              <span class="save-indicator">Saved</span>
            {/if}
          </div>
          <input
            class="search-input zen-search-input"
            type="search"
            placeholder="Search"
            bind:value={searchQuery}
          />
          {#if hasActiveFilters}
            <button class="tool-link" onclick={resetFilters}>Clear</button>
          {/if}
          {#if focusId || hasCategorySelection}
            <button class="tool-link tool-active" onclick={clearFocusSelection}>All</button>
          {/if}
          <button class="tool-link" onclick={undo} disabled={undoStack.length === 0}>Undo</button>
          <button class="tool-link" onclick={redo} disabled={redoStack.length === 0}>Redo</button>
          <button class="add-btn" onclick={addCategory}>+ Add</button>
          <button class="tool-link tool-active zen-toggle" onclick={toggleZenMode}>Exit Zen</button>
        </div>
      {:else if isMobileLayout}
        <div class="mobile-toolbar-row mobile-toolbar-primary">
          <div class="mobile-title-stack">
            <span class="title">Chronostra</span>
            <span class="row-count">{flatRows.length} rows</span>
          </div>
          {#if saveIndicator}
            <span class="save-indicator">Saved</span>
          {/if}
          <button class="add-btn" onclick={addCategory}>+ Category</button>
        </div>

        <input
          class="search-input"
          type="search"
          placeholder="Search"
          bind:value={searchQuery}
        />

        <div class="mobile-filter-strip">
          <DropdownSelect
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            variant="mobile"
            minWidth={126}
            onchange={(next) => { statusFilter = next as StatusFilter; }}
          />
          <DropdownSelect
            value={scopeFilter}
            options={SCOPE_FILTER_OPTIONS}
            variant="mobile"
            minWidth={126}
            onchange={(next) => { scopeFilter = next as ScopeFilter; }}
          />
          <DropdownSelect
            value={commitmentFilter}
            options={COMMITMENT_FILTER_OPTIONS}
            variant="mobile"
            minWidth={118}
            onchange={(next) => { commitmentFilter = next as CommitmentFilter; }}
          />
          <DropdownSelect
            value={noteFilter}
            options={NOTE_FILTER_OPTIONS}
            variant="mobile"
            minWidth={120}
            onchange={(next) => { noteFilter = next as NoteFilter; }}
          />
          {#if hasActiveFilters}
            <button class="mobile-clear-button" onclick={resetFilters}>Clear</button>
          {/if}
        </div>

        <div class="mobile-toolbar-row mobile-toolbar-secondary">
          <button class="tool-link" onclick={undo} disabled={undoStack.length === 0}>Undo</button>
          <button class="tool-link" onclick={redo} disabled={redoStack.length === 0}>Redo</button>
          <button class="tool-link" onclick={expandAll} title="Expand all">Expand</button>
          <button class="tool-link" onclick={collapseAll} title="Collapse all">Collapse</button>
          {#if focusId || hasCategorySelection}
            <button class="tool-link tool-active" onclick={clearFocusSelection}>All</button>
          {/if}
          <div class="toolbar-menu-anchor" role="presentation" onpointerdown={(e) => e.stopPropagation()}>
            <button class="tool-link" class:tool-active={showTemplateMenu} onclick={() => { showTemplateMenu = !showTemplateMenu; closeRowMenu(); }}>
              Templates
            </button>
            {#if showTemplateMenu}
              <div class="chronostra-menu toolbar-menu" role="presentation" onpointerdown={(e) => e.stopPropagation()}>
                {#each ROOT_TEMPLATES as template}
                  <button
                    type="button"
                    class="chronostra-menu-item"
                    onclick={() => { insertRootTemplate(template.id); showTemplateMenu = false; }}
                  >
                    {template.label}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="mobile-toolbar-row mobile-timeline-row">
          <DropdownSelect
            value={timelineDisplay}
            options={TIMELINE_DISPLAY_OPTIONS}
            variant="mobile"
            minWidth={118}
            onchange={updateTimelineDisplay}
          />
          <div class="range-control">
            <span>Timeline</span>
            <input
              class="range-input"
              type="number"
              value={timelineStartYear}
              onchange={(e) => normalizeTimelineRange(parseInt((e.currentTarget as HTMLInputElement).value, 10) || timelineStartYear, timelineEndYear)}
            />
            <span>to</span>
            <input
              class="range-input"
              type="number"
              value={timelineEndYear}
              onchange={(e) => normalizeTimelineRange(timelineStartYear, parseInt((e.currentTarget as HTMLInputElement).value, 10) || timelineEndYear)}
            />
          </div>
        </div>
      {:else}
        <div class="desktop-toolbar-row desktop-toolbar-primary">
          <div class="desktop-title-stack">
            <span class="title">Chronostra</span>
            <span class="row-count">{flatRows.length} rows</span>
            {#if saveIndicator}
              <span class="save-indicator">Saved</span>
            {/if}
          </div>
          <div class="desktop-action-group">
            <button class="tool-link" onclick={undo} disabled={undoStack.length === 0}>Undo</button>
            <button class="tool-link" onclick={redo} disabled={redoStack.length === 0}>Redo</button>
            <button class="tool-link" onclick={expandAll} title="Expand all">Expand</button>
            <button class="tool-link" onclick={collapseAll} title="Collapse all">Collapse</button>
            {#if focusId || hasCategorySelection}
              <button class="tool-link tool-active" onclick={clearFocusSelection}>All rows</button>
            {/if}
          </div>
          <button class="add-btn" onclick={addCategory}>+ Add category</button>
          <button class="tool-link zen-toggle" onclick={toggleZenMode}>Zen</button>
        </div>

        <div class="desktop-toolbar-row desktop-toolbar-filters">
          <input
            class="search-input"
            type="search"
            placeholder="Search"
            bind:value={searchQuery}
          />
          <DropdownSelect
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            minWidth={116}
            onchange={(next) => { statusFilter = next as StatusFilter; }}
          />
          <DropdownSelect
            value={scopeFilter}
            options={SCOPE_FILTER_OPTIONS}
            minWidth={116}
            onchange={(next) => { scopeFilter = next as ScopeFilter; }}
          />
          <DropdownSelect
            value={commitmentFilter}
            options={COMMITMENT_FILTER_OPTIONS}
            minWidth={110}
            onchange={(next) => { commitmentFilter = next as CommitmentFilter; }}
          />
          <DropdownSelect
            value={noteFilter}
            options={NOTE_FILTER_OPTIONS}
            minWidth={112}
            onchange={(next) => { noteFilter = next as NoteFilter; }}
          />
          {#if hasActiveFilters}
            <button class="tool-link" onclick={resetFilters}>Clear</button>
          {/if}
          <div class="desktop-toolbar-spacer"></div>
          <DropdownSelect
            value={timelineDisplay}
            options={TIMELINE_DISPLAY_OPTIONS}
            minWidth={104}
            onchange={updateTimelineDisplay}
          />
          <div class="range-control">
            <span>Timeline</span>
            <input
              class="range-input"
              type="number"
              value={timelineStartYear}
              onchange={(e) => normalizeTimelineRange(parseInt((e.currentTarget as HTMLInputElement).value, 10) || timelineStartYear, timelineEndYear)}
            />
            <span>to</span>
            <input
              class="range-input"
              type="number"
              value={timelineEndYear}
              onchange={(e) => normalizeTimelineRange(timelineStartYear, parseInt((e.currentTarget as HTMLInputElement).value, 10) || timelineEndYear)}
            />
          </div>
          <div class="toolbar-menu-anchor" role="presentation" onpointerdown={(e) => e.stopPropagation()}>
            <button class="tool-link" class:tool-active={showTemplateMenu} onclick={() => { showTemplateMenu = !showTemplateMenu; closeRowMenu(); }}>
              Templates
            </button>
            {#if showTemplateMenu}
              <div class="chronostra-menu toolbar-menu" role="presentation" onpointerdown={(e) => e.stopPropagation()}>
                {#each ROOT_TEMPLATES as template}
                  <button
                    type="button"
                    class="chronostra-menu-item"
                    onclick={() => { insertRootTemplate(template.id); showTemplateMenu = false; }}
                  >
                    {template.label}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    {#if !zenMode && !isMobileLayout && overviewRows.length > 0}
      <div class="overview-strip">
        {#each overviewRows as row (row.id)}
          <button
            class="overview-card"
            class:is-focused={activeOverviewIds.has(row.id)}
            class:is-dimmed={hasOverviewSelection && !activeOverviewIds.has(row.id)}
            onclick={() => { toggleCategorySelection(row.id); }}
          >
            <span class="overview-title">{row.label}</span>
            {#if showSummaryMeta && row.summary}
              <span class="overview-meta">
                {Math.max(row.summary.subtreeCount - 1, 0)} items ·
                {row.summary.statusCounts['in-progress']} wip ·
                {row.summary.statusCounts.done} done ·
                {row.summary.linkedNotes} notes
              </span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if isMobileLayout}
    <MobileChronoList
      rows={flatRows}
      {showSummaryMeta}
      {timelineStartYear}
      {timelineEndYear}
      ontoggle={handleToggle}
      onlabelchange={handleLabelChange}
      onmetricchange={handleMetricChange}
      onstatuschange={handleStatusChange}
      oncommitmentchange={handleCommitmentChange}
      ontimelinechange={handleTimelineChange}
      onaddchild={addChild}
      onaddsibling={addSibling}
      onduplicate={duplicateRow}
      ondelete={deleteRow}
      onquickcapture={quickCaptureToInbox}
      onfocus={(id) => { selectedCategoryIds = []; focusId = id; }}
      onnoteclick={(id) => { void handleNoteClick(id); }}
      onunlinknote={unlinkNote}
    />
  {:else}
    <div
      class="scroll-container"
      bind:this={scrollContainer}
      onscroll={handleScroll}
    >
      <TableHeader
        {hierarchyWidth}
        {metricWidths}
        {metricFrozen}
        {focusYear}
        {timelineDisplay}
        {birthYear}
        {timelineStartYear}
        {timelineEndYear}
        onhierarchyresize={handleHierarchyResize}
        onresize={handleMetricResize}
        ontogglefreeze={handleToggleFreeze}
        onfocusyear={(y) => { focusYear = y; }}
      />

      <div
        class="row-list"
        class:no-borders={!showBorders}
        bind:this={rowListEl}
        style:width="max-content"
        style:min-width="100%"
      >
        {#each flatRows as row (row.id)}
          <div
            class="row-wrapper"
            class:active-layer={activeRowId === row.id}
            role="presentation"
            onpointerdown={() => { activeRowId = row.id; }}
          >
            <TableRow
              {row}
              {hierarchyWidth}
              {metricWidths}
              {metricFrozen}
              {birthYear}
              {focusYear}
              {timelineStartYear}
              {timelineEndYear}
              {showSummaryMeta}
              autoEditColumn={pendingEditId === row.id ? pendingEditColumn : null}
              isDragged={dragState?.draggedId === row.id}
              isDropTarget={dragState?.targetId === row.id}
              dropPosition={dragState?.targetId === row.id ? dragState.position : undefined}
              justDropped={lastDropTargetId === row.id}
              ontoggle={handleToggle}
              onpopup={handlePopup}
              onmetricchange={handleMetricChange}
              onstatuschange={handleStatusChange}
              onlabelchange={handleLabelChange}
              ontimelinechange={handleTimelineChange}
              onrowcontextmenu={handleRowContextMenu}
              onautoedited={clearEditTarget}
              ondragstart={handleDragStart}
              onnoteclick={handleNoteClick}
              oncommitmentchange={handleCommitmentChange}
              onnavigate={handleCellNavigate}
            />
          </div>
        {/each}
        {#if flatRows.length === 0}
          <div class="empty-state">No rows match the current filters.</div>
        {/if}
      </div>

      {#if rowMenu}
        <div
          class="row-context-menu"
          role="presentation"
          style:left="{rowMenu.x}px"
          style:top="{rowMenu.y}px"
          onpointerdown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            class="context-item"
            disabled={(findNode(data.categories, rowMenu.id)?.depth ?? MAX_DEPTH) >= MAX_DEPTH}
            onclick={() => { addChild(rowMenu!.id); closeRowMenu(); }}
          >
            + Add child
          </button>
          <button type="button" class="context-item" onclick={() => { addSibling(rowMenu!.id); closeRowMenu(); }}>
            + Add sibling
          </button>
          <button type="button" class="context-item" onclick={() => { duplicateRow(rowMenu!.id); closeRowMenu(); }}>
            Duplicate subtree
          </button>
          <button type="button" class="context-item" onclick={() => { insertStarterChain(rowMenu!.id); closeRowMenu(); }}>
            Insert starter chain
          </button>
          {#if (findNode(data.categories, rowMenu.id)?.depth ?? 0) > 0}
            {@const menuNode = findNode(data.categories, rowMenu.id)}
            <div class="context-divider"></div>
            <div class="context-section-label">Scope</div>
            <button
              type="button"
              class="context-item"
              class:context-item-active={menuNode?.scope === 'vision'}
              onclick={() => { handleScopeChange(rowMenu!.id, 'vision'); closeRowMenu(); }}
            >
              Set as vision
            </button>
            <button
              type="button"
              class="context-item"
              class:context-item-active={menuNode?.scope === 'goal'}
              onclick={() => { handleScopeChange(rowMenu!.id, 'goal'); closeRowMenu(); }}
            >
              Set as goal
            </button>
            <button
              type="button"
              class="context-item"
              class:context-item-active={menuNode?.scope === 'step'}
              onclick={() => { handleScopeChange(rowMenu!.id, 'step'); closeRowMenu(); }}
            >
              Set as step
            </button>
            {#if menuNode?.scope}
              <button type="button" class="context-item" onclick={() => { handleScopeChange(rowMenu!.id, undefined); closeRowMenu(); }}>
                Reset scope (auto)
              </button>
            {/if}
            <div class="context-divider"></div>
          {/if}
          <button type="button" class="context-item" onclick={() => { void handleNoteClick(rowMenu!.id); closeRowMenu(); }}>
            {findNode(data.categories, rowMenu.id)?.notePath ? 'Open linked note' : 'Create linked note'}
          </button>
          {#if findNode(data.categories, rowMenu.id)?.notePath}
            <button type="button" class="context-item" onclick={() => { unlinkNote(rowMenu!.id); closeRowMenu(); }}>
              Remove note link
            </button>
          {/if}
          <button type="button" class="context-item" onclick={() => { selectedCategoryIds = []; focusId = rowMenu!.id; closeRowMenu(); }}>
            Focus
          </button>
          <button type="button" class="context-item danger" onclick={() => { deleteRow(rowMenu!.id); closeRowMenu(); }}>
            Delete
          </button>
        </div>
      {/if}
    </div>
  {/if}

  {#if popupText}
    <CellPopup text={popupText} x={popupX} y={popupY} />
  {/if}
</div>

<style>
  .chrono-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    height: fit-content;
    background: var(--background-primary);
    overflow: visible;
    position: relative;
  }
  :global(.workspace-leaf-content[data-type="chronostra-view"]) .chrono-wrapper {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
  :global(.workspace-leaf-content[data-type="chronostra-view"]) .chrono-wrapper.is-mobile-layout {
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .chrono-wrapper.is-dragging {
    cursor: grabbing;
    user-select: none;
  }
  .sticky-chrome {
    position: sticky;
    top: var(--chronostra-sticky-top, 0px);
    z-index: 900;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
    background: var(--background-primary);
    isolation: isolate;
    /* Avoid creating a scrollport here; it can confuse sticky stacking in nested layouts. */
    overflow: visible;
    pointer-events: none;
  }
  .toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--background-modifier-border);
    flex-shrink: 0;
    background: var(--background-primary);
    pointer-events: auto;
  }
  .toolbar:not(.mobile-toolbar) {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px;
  }
  .toolbar.zen-toolbar {
    align-items: center;
    flex-direction: row;
    gap: 0;
    padding: 4px 8px;
  }
  .zen-toolbar-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    width: 100%;
  }
  .zen-title-stack {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 148px;
    flex: 0 1 auto;
  }
  .zen-title-stack .row-count {
    white-space: nowrap;
  }
  .toolbar.zen-toolbar .tool-link {
    min-height: 24px;
    padding: 0 7px;
    border-radius: 4px;
    font-size: 10px;
  }
  .toolbar.zen-toolbar .add-btn {
    min-height: 24px;
    padding: 0 8px;
    border-radius: 4px;
    font-size: 10px;
    white-space: nowrap;
  }
  .zen-search-input {
    flex: 1 1 180px;
    min-width: 120px;
  }
  .toolbar.zen-toolbar .zen-search-input {
    height: 24px;
    width: auto;
    border-radius: 4px;
  }
  .zen-toggle {
    white-space: nowrap;
  }
  .desktop-toolbar-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .desktop-toolbar-primary {
    justify-content: space-between;
  }
  .desktop-title-stack,
  .desktop-action-group {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .desktop-action-group {
    flex-wrap: wrap;
    justify-content: center;
  }
  .desktop-toolbar-filters {
    flex-wrap: wrap;
    row-gap: 8px;
  }
  .desktop-toolbar-spacer {
    flex: 1 1 16px;
    min-width: 8px;
  }
  .toolbar.mobile-toolbar {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px 12px 12px;
  }
  .toolbar.mobile-toolbar.zen-toolbar {
    gap: 0;
    padding: 4px 8px;
  }
  .mobile-toolbar-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .mobile-toolbar-primary {
    justify-content: space-between;
  }
  .mobile-title-stack {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }
  .mobile-filter-strip {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }
  .mobile-filter-strip::-webkit-scrollbar {
    display: none;
  }
  .mobile-toolbar-secondary {
    flex-wrap: wrap;
    row-gap: 8px;
  }
  .mobile-timeline-row {
    flex-wrap: wrap;
    color: var(--text-faint);
  }
  .title {
    font-weight: 600;
    font-size: 13px;
    color: var(--text-normal);
    letter-spacing: 0.02em;
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
    animation: fade-in-out 0.8s ease forwards;
  }
  @keyframes fade-in-out {
    0% { opacity: 0; }
    20% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
  .tool-link {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    font-size: 10px;
    color: var(--text-faint);
    background: none;
    border: none;
    border-radius: 0;
    outline: none;
    padding: 0;
    cursor: pointer;
    letter-spacing: 0.06em;
    text-decoration: underline;
    box-shadow: none;
  }
  .tool-link:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .tool-link.tool-active {
    color: var(--interactive-accent);
  }
  .tool-link:hover {
    color: var(--text-normal);
  }
  .toolbar:not(.mobile-toolbar) .tool-link {
    min-height: 26px;
    display: inline-flex;
    align-items: center;
    padding: 0 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 5px;
    color: var(--text-muted);
    text-decoration: none;
  }
  .toolbar:not(.mobile-toolbar) .tool-link:hover,
  .toolbar:not(.mobile-toolbar) .tool-link.tool-active {
    border-color: var(--background-modifier-border-hover, var(--text-faint));
    color: var(--text-normal);
    background: var(--background-secondary);
  }
  .search-input,
  .range-input {
    appearance: none;
    -webkit-appearance: none;
    height: 24px;
    font-size: 11px;
    font-family: inherit;
    color: var(--text-normal);
    background: transparent;
    border: 1px solid var(--background-modifier-border);
    border-radius: 0;
    box-shadow: none;
    padding: 0 8px;
    outline: none;
  }
  .search-input:focus,
  .range-input:focus {
    border-color: var(--text-muted);
  }
  .search-input {
    min-width: 160px;
  }
  .toolbar:not(.mobile-toolbar) .search-input {
    width: 220px;
    max-width: 100%;
    height: 28px;
    border-radius: 5px;
  }
  .mobile-toolbar .search-input {
    width: 100%;
    min-width: 0;
    height: 40px;
    font-size: 14px;
    border-radius: 6px;
  }
  .mobile-toolbar .tool-link {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    padding: 0 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    text-decoration: none;
    font-size: 11px;
    color: var(--text-muted);
  }
  .mobile-clear-button {
    appearance: none;
    -webkit-appearance: none;
    flex: 0 0 auto;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background: transparent;
    box-shadow: none;
    color: var(--text-muted);
    font: inherit;
    font-size: 11px;
  }
  .range-control {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: var(--text-faint);
    letter-spacing: 0.06em;
  }
  .range-input {
    width: 74px;
    text-transform: none;
    letter-spacing: normal;
  }
  .toolbar:not(.mobile-toolbar) .range-input {
    height: 28px;
    border-radius: 5px;
  }
  .mobile-toolbar .range-control {
    flex-wrap: wrap;
    min-width: 0;
  }
  .mobile-toolbar .range-input {
    width: 88px;
    height: 36px;
    border-radius: 6px;
    font-size: 13px;
  }
  .toolbar-menu-anchor {
    position: relative;
  }
  .add-btn {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    margin-left: auto;
    font-size: 11px;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-radius: 0;
    outline: none;
    padding: 0;
    cursor: pointer;
    letter-spacing: 0.02em;
    text-decoration: underline;
    box-shadow: none;
  }
  .toolbar:not(.mobile-toolbar) .add-btn {
    flex: 0 0 auto;
    margin-left: 0;
    min-height: 28px;
    padding: 0 10px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 5px;
    color: var(--text-normal);
    text-decoration: none;
  }
  .toolbar:not(.mobile-toolbar) .add-btn:hover {
    border-color: var(--background-modifier-border-hover, var(--text-faint));
    background: var(--background-secondary);
  }
  .mobile-toolbar .add-btn {
    flex: 0 0 auto;
    margin-left: 0;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    color: var(--text-normal);
    text-decoration: none;
    font-size: 12px;
  }
  .add-btn:hover {
    color: var(--text-normal);
  }
  .toolbar-menu {
    top: calc(100% + 6px);
    left: 0;
    min-width: 180px;
  }
  .overview-strip {
    display: flex;
    gap: 6px;
    padding: 8px 14px;
    overflow-x: auto;
    border-bottom: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    pointer-events: auto;
  }
  .overview-card {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    min-width: 132px;
    max-width: 190px;
    min-height: 38px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    padding: 6px 10px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 5px;
    box-shadow: none;
    background: transparent;
    color: var(--text-normal);
    text-align: left;
    cursor: pointer;
  }
  .overview-card.is-focused {
    border-color: var(--text-normal);
    background: var(--background-secondary);
  }
  .overview-card.is-dimmed {
    opacity: 0.38;
  }
  .overview-card:hover {
    border-color: var(--text-normal);
    opacity: 1;
  }
  .overview-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    word-break: break-word;
    line-height: 1.4;
  }
  .overview-meta {
    font-size: 9px;
    color: var(--text-faint);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    word-break: break-word;
  }
  .scroll-container {
    flex: 0 0 auto;
    overflow: auto;
    position: relative;
    z-index: 0;
  }
  :global(.workspace-leaf-content[data-type="chronostra-view"]) .scroll-container {
    flex: 1 1 auto;
    min-height: 0;
  }
  .scroll-container:focus-within {
    z-index: 1;
  }
  .row-list {
  }
  .row-list.no-borders :global(.table-row) {
    border-bottom: none;
  }
  .row-wrapper {
    min-height: var(--chronostra-body-row-height);
    position: relative;
    overflow: visible;
    z-index: 0;
  }
  .row-wrapper.active-layer {
    z-index: 2;
  }
  .empty-state {
    padding: 18px 16px;
    font-size: 11px;
    color: var(--text-faint);
    letter-spacing: 0.06em;
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
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    display: block;
    width: 100%;
    padding: 5px 12px;
    font-size: 11px;
    color: var(--text-normal);
    background: none;
    border: none;
    border-radius: 0;
    box-shadow: none;
    cursor: pointer;
    text-align: left;
    letter-spacing: 0.01em;
  }
  .context-item:hover {
    background: var(--background-secondary);
  }
  .context-item:disabled {
    color: var(--text-faint);
    cursor: default;
    opacity: 0.55;
  }
  .context-item:disabled:hover {
    background: none;
  }
  .context-item.danger {
    color: var(--text-muted);
  }
  .context-item.danger:hover {
    color: var(--text-normal);
  }
  .context-item-active {
    color: var(--interactive-accent);
  }
  .context-divider {
    height: 1px;
    background: var(--background-modifier-border);
    margin: 4px 0;
  }
  .context-section-label {
    padding: 4px 12px 2px;
    font-size: 9px;
    color: var(--text-faint);
    letter-spacing: 0.08em;
  }
  :global(.chronostra-drag-ghost) {
    position: fixed;
    pointer-events: none;
    opacity: 0.65;
    z-index: 1000;
    width: var(--ghost-width);
    height: var(--ghost-height);
    left: var(--ghost-left);
    top: var(--ghost-top);
    box-shadow: 0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15);
    border-radius: 4px;
    overflow: hidden;
    transform: scale(1.01);
    transition: box-shadow 0.15s ease;
  }
</style>
