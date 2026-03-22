<script lang="ts">
  import type { FlatRow } from '../types';
  import ExpandToggle from './ExpandToggle.svelte';

  let { row, width, autoEdit, isDragging, ontoggle, onlabelchange, onautoedited, ondragstart }: {
    row: FlatRow;
    width: number;
    autoEdit?: boolean;
    isDragging?: boolean;
    ontoggle: (id: string) => void;
    onlabelchange?: (id: string, newLabel: string) => void;
    onautoedited?: () => void;
    ondragstart?: (e: PointerEvent) => void;
  } = $props();

  let editing = $state(false);
  let editValue = $state('');

  $effect(() => {
    if (autoEdit && onlabelchange && !editing) {
      editing = true;
      editValue = row.label;
      onautoedited?.();
    }
  });

  const levelLabels = {
    category: 'CAT',
    goal: 'GOAL',
    project: 'PROJ',
    task: 'TASK'
  };

  function startEdit() {
    if (!onlabelchange) return;
    editing = true;
    editValue = row.label;
  }

  function commitEdit() {
    if (editing && editValue.trim() && editValue !== row.label) {
      onlabelchange?.(row.id, editValue.trim());
    }
    editing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      editing = false;
    }
  }
</script>

<div class="hierarchy-cell" style:padding-left="{row.depth * 20 + 8}px" style:min-width="{width}px" style:max-width="{width}px">
  {#if ondragstart}
    <span
      class="drag-handle"
      class:dragging={isDragging}
      onpointerdown={(e) => { e.preventDefault(); ondragstart(e); }}
    >
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
        <circle cx="3" cy="3" r="1.2"/><circle cx="7" cy="3" r="1.2"/>
        <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
        <circle cx="3" cy="11" r="1.2"/><circle cx="7" cy="11" r="1.2"/>
      </svg>
    </span>
  {/if}
  {#each Array(row.depth) as _, i}
    <div
      class="indent-guide"
      style:left="{i * 20 + 18}px"
    ></div>
  {/each}

  {#if row.hasChildren}
    <ExpandToggle expanded={row.isExpanded} onclick={() => ontoggle(row.id)} />
  {:else}
    <span class="toggle-spacer"></span>
  {/if}

  <span class="level-badge level-{row.level}">{levelLabels[row.level]}</span>

  {#if editing}
    <input
      class="label-input"
      type="text"
      bind:value={editValue}
      onblur={commitEdit}
      onkeydown={handleKeydown}
      autofocus
    />
  {:else}
    <span
      class="label"
      class:editable={!!onlabelchange}
      title={row.label}
      ondblclick={startEdit}
    >{row.label}</span>
  {/if}
</div>

<style>
  .hierarchy-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    height: var(--chronostra-row-height);
    overflow: hidden;
    white-space: nowrap;
    box-sizing: border-box;
    background: inherit;
    position: relative;
  }
  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    flex-shrink: 0;
    cursor: grab;
    color: transparent;
    transition: color 0.1s;
    margin-left: -2px;
  }
  .hierarchy-cell:hover .drag-handle {
    color: var(--text-faint);
  }
  .drag-handle:hover {
    color: var(--text-muted) !important;
  }
  .drag-handle.dragging {
    color: var(--text-normal) !important;
    cursor: grabbing;
  }
  .indent-guide {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--background-modifier-border);
    opacity: 0.4;
  }
  .toggle-spacer {
    display: inline-block;
    width: 20px;
    flex-shrink: 0;
  }
  .level-badge {
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.06em;
    padding: 0;
    flex-shrink: 0;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  .level-badge.level-category {
    color: var(--text-muted);
    font-weight: 600;
  }
  .level-badge.level-goal {
    color: var(--text-faint);
  }
  .level-badge.level-project {
    color: var(--text-faint);
  }
  .level-badge.level-task {
    color: var(--text-faint);
    font-size: 8px;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .label.editable {
    cursor: text;
  }
  .label.editable:hover {
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 2px;
  }
  .label-input {
    flex: 1;
    min-width: 0;
    height: calc(var(--chronostra-row-height) - 12px);
    font-size: inherit;
    font-weight: inherit;
    font-family: inherit;
    color: var(--text-normal);
    background: var(--background-primary);
    border: 1px solid var(--interactive-accent);
    border-radius: 3px;
    padding: 0 4px;
    outline: none;
  }
</style>
