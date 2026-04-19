/** Maximum tree depth: Category (0) → Vision/Goal/Step layers (1-3). */
export const MAX_DEPTH = 3;

export type Scope = 'vision' | 'goal' | 'step';

export type Commitment = 'must' | 'wish';

export type TimelineStatus = 'planned' | 'active' | 'completed' | 'at-risk';

export type ItemStatus = 'todo' | 'in-progress' | 'done';

/** Default scope for a given tree depth when the item omits an explicit scope.
 *  depth 0 is Category (no scope). */
export function defaultScopeForDepth(depth: number): Scope | undefined {
  if (depth <= 0) return undefined;
  if (depth === 1) return 'vision';
  if (depth === 2) return 'goal';
  return 'step';
}

/** Resolve the effective scope of a node: explicit if set, otherwise depth-based default. */
export function effectiveScope(
  depth: number,
  explicit?: Scope
): Scope | undefined {
  return explicit ?? defaultScopeForDepth(depth);
}

export interface StatusCounts {
  todo: number;
  'in-progress': number;
  done: number;
}

export interface NodeSummary {
  directChildren: number;
  subtreeCount: number;
  linkedNotes: number;
  timelineEntries: number;
  statusCounts: StatusCounts;
}

export interface TimelineEntry {
  year: number;
  text: string;
  status?: TimelineStatus;
}

export interface Metrics {
  future: string;
  now: string;
  gap: string;
}

export interface TreeNode {
  id: string;
  label: string;
  depth: number;
  scope?: Scope;
  commitment?: Commitment;
  metrics: Metrics;
  status?: ItemStatus;
  notePath?: string;
  timeline: TimelineEntry[];
  children?: TreeNode[];
}

export interface FlatRow {
  id: string;
  label: string;
  depth: number;
  scope?: Scope;
  commitment?: Commitment;
  metrics: Metrics;
  status?: ItemStatus;
  notePath?: string;
  timeline: TimelineEntry[];
  summary?: NodeSummary;
  isExpanded: boolean;
  hasChildren: boolean;
  isLastChild: boolean;
  parentIds: string[];
}

export type CellColumnKey =
  | 'hierarchy'
  | 'metric:future'
  | 'metric:now'
  | 'metric:gap'
  | 'status'
  | 'commitment'
  | `timeline:${number}`;

export type CellNavigationDirection = 'up' | 'down' | 'left' | 'right';

export interface ChronoData {
  categories: TreeNode[];
}

/** Storage format: flat array with path-based hierarchy */
export interface FlatItem {
  id: string;
  path: string[];
  scope?: Scope;
  commitment?: Commitment;
  metrics: Metrics;
  status?: ItemStatus;
  notePath?: string;
  timeline: TimelineEntry[];
}
