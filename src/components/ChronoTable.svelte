<script lang="ts">
  import type { ChronoData, TreeNode, ItemStatus, FlatRow, Scope, Commitment } from '../types';
  import { effectiveScope, MAX_DEPTH } from '../types';
  import type { TimelineDisplay } from '../settings';
  import { TreeState } from '../stores/tree-state.svelte';
  import { flattenTree } from '../stores/flat-rows.svelte';
  import TableHeader from './TableHeader.svelte';
  import TableRow from './TableRow.svelte';
  import CellPopup from './CellPopup.svelte';
  import DropdownSelect from './DropdownSelect.svelte';

  type StatusFilter = 'all' | ItemStatus;
  type ScopeFilter = 'all' | 'category' | Scope;
  type CommitmentFilter = 'all' | Commitment;
  type NoteFilter = 'all' | 'linked' | 'unlinked';
  type RowMenuState = { id: string; x: number; y: number } | null;

  interface TemplateDraft {
    label: string;
    children?: TemplateDraft[];
  }

  interface RootTemplate {
    id: string;
    label: string;
    nodes: TemplateDraft[];
  }

  const ROW_HEIGHT = 36;
  const HISTORY_LIMIT = 50;
  const EXPANDED_TREE_STATE = { isExpanded: () => true } as TreeState;
  const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'All status' },
    { value: 'todo', label: 'To do' },
    { value: 'in-progress', label: 'In progress' },
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

  let {
    data: initialData,
    initialExpandedIds = [],
    birthDate = '',
    timelineDisplay: initialTimelineDisplay = 'year' as TimelineDisplay,
    timelineStartYear: initialTimelineStartYear = 2025,
    timelineEndYear: initialTimelineEndYear = 2050,
    showRowBorders: initialShowRowBorders = true,
    showSummaryMeta = false,
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

  let timelineDisplay = $state<TimelineDisplay>(initialTimelineDisplay);
  let timelineStartYear = $state(initialTimelineStartYear);
  let timelineEndYear = $state(initialTimelineEndYear);
  let showBorders = $state(initialShowRowBorders);

  let searchQuery = $state('');
  let statusFilter = $state<StatusFilter>('all');
  let scopeFilter = $state<ScopeFilter>('all');
  let commitmentFilter = $state<CommitmentFilter>('all');
  let noteFilter = $state<NoteFilter>('all');
  let focusId = $state<string | null>(null);
  let selectedCategoryIds = $state<string[]>([]);
  let showTemplateMenu = $state(false);

  // Mutable copy of the data tree
  let data = $state<ChronoData>(structuredClone(initialData));
  const treeState = new TreeState();

  if (initialExpandedIds.length > 0) {
    treeState.expanded = new Set(initialExpandedIds);
  } else {
    treeState.expanded = new Set(initialData.categories.map((c) => c.id));
  }

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

  const flatRows = $derived.by((): FlatRow[] => {
    if (!hasActiveFilters) return visibleRows;

    const visibleIds = new Set<string>();
    for (const row of expandedRows) {
      if (matchesRowFilters(row)) {
        visibleIds.add(row.id);
        for (const parentId of row.parentIds) {
          visibleIds.add(parentId);
        }
      }
    }

    return expandedRows.filter((row) => visibleIds.has(row.id));
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

  let wrapperEl: HTMLDivElement | undefined = $state();
  let headerScrollEl: HTMLDivElement | undefined = $state();
  let scrollContainer: HTMLDivElement | undefined = $state();
  let rowListEl: HTMLDivElement | undefined = $state();

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
  let metricWidths = $state([200, 200, 200, 100, 100]);
  let metricFrozen = $state([true, true, true, true, true]);

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
  let syncingHeaderScroll = false;
  let syncingBodyScroll = false;

  function handleScroll() {
    if (!scrollContainer || !headerScrollEl || syncingBodyScroll) return;
    syncingHeaderScroll = true;
    headerScrollEl.scrollLeft = scrollContainer.scrollLeft;
    queueMicrotask(() => {
      syncingHeaderScroll = false;
    });
  }

  function handleHeaderScroll() {
    if (!scrollContainer || !headerScrollEl || syncingHeaderScroll) return;
    syncingBodyScroll = true;
    scrollContainer.scrollLeft = headerScrollEl.scrollLeft;
    queueMicrotask(() => {
      syncingBodyScroll = false;
    });
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

  function snapshotData(): ChronoData {
    return structuredClone(data);
  }

  let undoStack = $state<ChronoData[]>([]);
  let redoStack = $state<ChronoData[]>([]);
  let saveIndicator = $state(false);
  let pendingEditId = $state<string | null>(null);

  function emitChange() {
    data = { ...data };
    onDataChange?.(data);
    saveIndicator = true;
    setTimeout(() => {
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

  function addChild(parentId: string) {
    const newId = generateId();
    commitMutation(() => {
      const node = findNode(data.categories, parentId);
      if (!node) return false;
      if (!node.children) node.children = [];
      const child = createNode('New item', node.depth + 1);
      child.id = newId;
      node.children.push(child);
      treeState.expand(parentId);
      return true;
    });
    pendingEditId = newId;
  }

  function addSibling(id: string) {
    const newId = generateId();
    commitMutation(() => {
      const loc = findParentAndIndex(data.categories, id);
      if (!loc) return false;
      const sibling = loc.parent[loc.index];
      const next = createNode('New item', sibling.depth);
      next.id = newId;
      loc.parent.splice(loc.index + 1, 0, next);
      return true;
    });
    pendingEditId = newId;
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
    document.body.appendChild(clone);
    dragGhost = clone;
  }

  function startAutoScroll(clientY: number) {
    cancelAnimationFrame(autoScrollRaf);
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
        autoScrollRaf = requestAnimationFrame(scroll);
      };
      autoScrollRaf = requestAnimationFrame(scroll);
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
    cancelAnimationFrame(autoScrollRaf);
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
    setTimeout(() => {
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

<div class="chrono-wrapper" class:is-dragging={!!dragState} bind:this={wrapperEl}>
  <div class="sticky-chrome">
    <div class="toolbar">
      <span class="title">Chronostra</span>
      <span class="row-count">{flatRows.length} rows</span>
      {#if saveIndicator}
        <span class="save-indicator">Saved</span>
      {/if}
      <button class="tool-link" onclick={undo} disabled={undoStack.length === 0}>Undo</button>
      <span class="tool-sep">/</span>
      <button class="tool-link" onclick={redo} disabled={redoStack.length === 0}>Redo</button>
      <span class="tool-sep">|</span>
      <button class="tool-link" onclick={expandAll} title="Expand all">⌄</button>
      <span class="tool-sep">/</span>
      <button class="tool-link" onclick={collapseAll} title="Collapse all">&gt;</button>
      <span class="tool-sep">|</span>
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
        <span class="tool-sep">|</span>
      {/if}
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
      <div class="toolbar-menu-anchor" onpointerdown={(e) => e.stopPropagation()}>
        <button class="tool-link" class:tool-active={showTemplateMenu} onclick={() => { showTemplateMenu = !showTemplateMenu; closeRowMenu(); }}>
          Templates
        </button>
        {#if showTemplateMenu}
          <div class="chronostra-menu toolbar-menu" onpointerdown={(e) => e.stopPropagation()}>
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
      {#if focusId || hasCategorySelection}
        <span class="tool-sep">|</span>
        <button class="tool-link tool-active" onclick={clearFocusSelection}>
          &larr; All
        </button>
      {/if}
      <button class="add-btn" onclick={addCategory}>+ Add category</button>
    </div>

    {#if overviewRows.length > 0}
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

    <div
      class="header-scroll"
      bind:this={headerScrollEl}
      onscroll={handleHeaderScroll}
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
    </div>
  </div>

  <div
    class="scroll-container"
    bind:this={scrollContainer}
    onscroll={handleScroll}
  >
    <div
      class="row-list"
      class:no-borders={!showBorders}
      bind:this={rowListEl}
      style:width="max-content"
      style:min-width="100%"
    >
      {#each flatRows as row (row.id)}
        <div class="row-wrapper">
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
            autoEdit={pendingEditId === row.id}
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
            onautoedited={() => { pendingEditId = null; }}
            ondragstart={handleDragStart}
            onnoteclick={handleNoteClick}
            oncommitmentchange={handleCommitmentChange}
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
        style:left="{rowMenu.x}px"
        style:top="{rowMenu.y}px"
        onpointerdown={(e) => e.stopPropagation()}
      >
        <button type="button" class="context-item" onclick={() => { addChild(rowMenu!.id); closeRowMenu(); }}>
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
  }
  .chrono-wrapper.is-dragging {
    cursor: grabbing;
    user-select: none;
  }
  .sticky-chrome {
    position: sticky;
    top: 0;
    z-index: 40;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
    background: var(--background-primary);
    isolation: isolate;
    /* Avoid creating a scrollport here; it can confuse sticky stacking in nested layouts. */
    overflow: visible;
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
  .tool-sep {
    font-size: 10px;
    color: var(--text-faint);
    opacity: 0.4;
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
    gap: 8px;
    padding: 10px 16px;
    overflow-x: auto;
    border-bottom: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
  }
  .header-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    background: var(--background-primary);
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .header-scroll::-webkit-scrollbar {
    display: none;
  }
  .overview-card {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    min-width: 180px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 0 8px 12px;
    border: none;
    border-left: 1px solid var(--background-modifier-border);
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    color: var(--text-normal);
    text-align: left;
    cursor: pointer;
  }
  .overview-card.is-focused {
    border-left: 2px solid var(--text-normal);
  }
  .overview-card.is-dimmed {
    opacity: 0.38;
  }
  .overview-card:hover {
    border-left-color: var(--text-normal);
    opacity: 1;
  }
  .overview-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .overview-meta {
    font-size: 10px;
    color: var(--text-faint);
    line-height: 1.4;
  }
  .scroll-container {
    flex: 0 0 auto;
    overflow-x: auto;
    overflow-y: clip;
    position: relative;
    z-index: 0;
  }
  .row-list {
  }
  .row-list.no-borders :global(.table-row) {
    border-bottom: none;
  }
  .row-wrapper {
    min-height: var(--chronostra-row-height);
    position: relative;
    overflow: clip;
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
