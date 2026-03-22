import type { FlatItem, TreeNode, ChronoData, HierarchyLevel } from './types';

const LEVEL_MAP: HierarchyLevel[] = ['category', 'goal', 'project', 'task'];

/** Build tree from flat items sorted by path */
export function buildTreeFromFlatItems(items: FlatItem[]): ChronoData {
  const sorted = [...items].sort((a, b) => {
    for (let i = 0; i < Math.max(a.path.length, b.path.length); i++) {
      if (i >= a.path.length) return -1;
      if (i >= b.path.length) return 1;
      const cmp = a.path[i].localeCompare(b.path[i]);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });

  const root: TreeNode[] = [];

  for (const item of sorted) {
    const depth = item.path.length - 1;
    const level = LEVEL_MAP[Math.min(depth, LEVEL_MAP.length - 1)];
    const label = item.path[item.path.length - 1];

    const node: TreeNode = {
      id: item.id,
      label,
      level,
      depth,
      metrics: item.metrics,
      timeline: item.timeline,
    };

    // Find parent by traversing the path
    let parent = root;
    for (let i = 0; i < item.path.length - 1; i++) {
      const parentLabel = item.path[i];
      const found = parent.find((n) => n.label === parentLabel);
      if (found) {
        if (!found.children) found.children = [];
        parent = found.children;
      }
    }
    parent.push(node);
  }

  return { categories: root };
}

/** Flatten tree back to flat items for storage */
export function flattenTreeToItems(data: ChronoData): FlatItem[] {
  const items: FlatItem[] = [];

  function walk(nodes: TreeNode[], parentPath: string[]) {
    for (const node of nodes) {
      const path = [...parentPath, node.label];
      items.push({
        id: node.id,
        path,
        metrics: node.metrics,
        timeline: node.timeline,
      });
      if (node.children) {
        walk(node.children, path);
      }
    }
  }

  walk(data.categories, []);
  return items;
}
