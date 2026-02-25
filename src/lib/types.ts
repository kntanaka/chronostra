export type HierarchyLevel = 'category' | 'goal' | 'project' | 'task';

export type TimelineStatus = 'planned' | 'active' | 'completed' | 'at-risk';

export interface TimelineEntry {
  year: number;
  text: string;
  status?: TimelineStatus;
}

export interface Metrics {
  future: number;
  now: number;
  gap: number;
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
