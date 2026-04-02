import type { TreeNode } from '../types';

export class TreeState {
  expanded = $state<Set<string>>(new Set());

  toggle(id: string) {
    const next = new Set(this.expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expanded = next;
  }

  isExpanded(id: string): boolean {
    return this.expanded.has(id);
  }

  expandAll(nodes: TreeNode[]) {
    const ids: string[] = [];
    function collect(ns: TreeNode[]) {
      for (const n of ns) {
        if (n.children && n.children.length > 0) {
          ids.push(n.id);
          collect(n.children);
        }
      }
    }
    collect(nodes);
    this.expanded = new Set(ids);
  }

  expand(id: string) {
    if (this.expanded.has(id)) return;
    const next = new Set(this.expanded);
    next.add(id);
    this.expanded = next;
  }

  collapseAll() {
    this.expanded = new Set();
  }
}
