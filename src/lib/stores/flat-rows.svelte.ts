import type { TreeNode, FlatRow } from '$lib/types';
import type { TreeState } from './tree-state.svelte';

export function flattenTree(
  nodes: TreeNode[],
  treeState: TreeState,
  parentIds: string[] = []
): FlatRow[] {
  const rows: FlatRow[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = hasChildren && treeState.isExpanded(node.id);

    rows.push({
      id: node.id,
      label: node.label,
      level: node.level,
      depth: node.depth,
      metrics: node.metrics,
      timeline: node.timeline,
      isExpanded,
      hasChildren,
      isLastChild: i === nodes.length - 1,
      parentIds
    });

    if (hasChildren && isExpanded) {
      rows.push(...flattenTree(node.children!, treeState, [...parentIds, node.id]));
    }
  }
  return rows;
}
