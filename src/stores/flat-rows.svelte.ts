import type { TreeNode, FlatRow, NodeSummary, StatusCounts } from '../types';
import type { TreeState } from './tree-state.svelte';

function emptyStatusCounts(): StatusCounts {
  return {
    todo: 0,
    'in-progress': 0,
    done: 0,
  };
}

function summarizeNode(node: TreeNode): NodeSummary {
  const summary: NodeSummary = {
    directChildren: node.children?.length ?? 0,
    subtreeCount: 1,
    linkedNotes: node.notePath ? 1 : 0,
    timelineEntries: node.timeline.filter((entry) => entry.text.trim()).length,
    statusCounts: emptyStatusCounts(),
  };

  summary.statusCounts[node.status ?? 'todo'] += 1;

  if (!node.children) {
    return summary;
  }

  for (const child of node.children) {
    const childSummary = summarizeNode(child);
    summary.subtreeCount += childSummary.subtreeCount;
    summary.linkedNotes += childSummary.linkedNotes;
    summary.timelineEntries += childSummary.timelineEntries;
    summary.statusCounts.todo += childSummary.statusCounts.todo;
    summary.statusCounts['in-progress'] += childSummary.statusCounts['in-progress'];
    summary.statusCounts.done += childSummary.statusCounts.done;
  }

  return summary;
}

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
      status: node.status,
      notePath: node.notePath,
      timeline: node.timeline,
      summary: hasChildren ? summarizeNode(node) : undefined,
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
