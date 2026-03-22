export type HierarchyLevel = 'category' | 'goal' | 'project' | 'task';

export type TimelineStatus = 'planned' | 'active' | 'completed' | 'at-risk';

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
  timeline: TimelineEntry[];
  children?: TreeNode[];
}

export interface FlatRow {
  id: string;
  label: string;
  level: HierarchyLevel;
  depth: number;
  metrics: Metrics;
  timeline: TimelineEntry[];
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
  timeline: TimelineEntry[];
}
