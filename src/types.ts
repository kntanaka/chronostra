export type HierarchyLevel = 'category' | 'goal' | 'project' | 'task';

export type TimelineStatus = 'planned' | 'active' | 'completed' | 'at-risk';

export type ItemStatus = 'todo' | 'in-progress' | 'done';

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
  level: HierarchyLevel;
  depth: number;
  metrics: Metrics;
  status?: ItemStatus;
  notePath?: string;
  timeline: TimelineEntry[];
  children?: TreeNode[];
}

export interface FlatRow {
  id: string;
  label: string;
  level: HierarchyLevel;
  depth: number;
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

export interface ChronoData {
  categories: TreeNode[];
}

/** Storage format: flat array with path-based hierarchy */
export interface FlatItem {
  id: string;
  path: string[];
  metrics: Metrics;
  status?: ItemStatus;
  notePath?: string;
  timeline: TimelineEntry[];
}
