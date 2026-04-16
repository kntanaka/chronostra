<script lang="ts">
  import type { FlatRow } from '../types';
  import ExpandToggle from './ExpandToggle.svelte';

  let { row, width, autoEdit, isDragging, ontoggle, onlabelchange, onautoedited, ondragstart, onnoteclick }: {
    row: FlatRow;
    width: number;
    autoEdit?: boolean;
    isDragging?: boolean;
    ontoggle: (id: string) => void;
    onlabelchange?: (id: string, newLabel: string) => void;
    onautoedited?: () => void;
    ondragstart?: (e: PointerEvent) => void;
    onnoteclick?: () => void;
  } = $props();

  const summaryText = $derived.by(() => {
    if (!row.summary || !row.hasChildren) return '';

    const descendants = Math.max(row.summary.subtreeCount - 1, 0);
    const parts: string[] = [`${descendants} items`];

    if (row.summary.statusCounts['in-progress'] > 0) {
      parts.push(`${row.summary.statusCounts['in-progress']} wip`);
    }
    if (row.summary.statusCounts.done > 0) {
      parts.push(`${row.summary.statusCounts.done} done`);
    }
    if (row.summary.linkedNotes > 0) {
      parts.push(`${row.summary.linkedNotes} notes`);
    }

    return parts.join(' · ');
  });

  let editing = $state(false);
  let editValue = $state('');

  $effect(() => {
    if (autoEdit && onlabelchange && !editing) {
      editing = true;
      editValue = row.label;
      onautoedited?.();
    }
  });

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

  <div class="label-stack">
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
      <div class="label-line">
        <span
          class="label"
          class:editable={!!onlabelchange}
          title={row.label}
          ondblclick={startEdit}
        >{row.label}</span>
        {#if onnoteclick}
          <button
            class="note-link"
            class:is-linked={!!row.notePath}
            title={row.notePath ? row.notePath : 'Create note'}
            onclick={(e) => {
              e.stopPropagation();
              onnoteclick();
            }}
          >
            {row.notePath ? 'note' : '+'}
          </button>
        {/if}
      </div>
      {#if summaryText}
        <div class="summary" title={summaryText}>{summaryText}</div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .hierarchy-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: var(--chronostra-row-height);
    overflow: hidden;
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
  .label {
    min-width: 0;
    white-space: normal;
    word-break: break-word;
    line-height: 1.4;
  }
  .label-stack {
    min-width: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
    padding: 5px 0;
  }
  .label-line {
    display: flex;
    align-items: center;
    gap: 6px;
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
  .note-link {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    flex-shrink: 0;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: transparent;
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 6px;
    margin: -4px 0;
    text-decoration: underline;
    box-shadow: none;
    transition: color 0.1s, background 0.1s;
  }
  .hierarchy-cell:hover .note-link {
    color: var(--text-faint);
  }
  .note-link.is-linked {
    color: var(--interactive-accent);
  }
  .note-link:hover {
    color: var(--text-normal) !important;
    background: var(--background-modifier-hover, var(--background-secondary));
  }
  .summary {
    min-width: 0;
    font-size: 9px;
    line-height: 1.35;
    color: var(--text-faint);
    letter-spacing: 0.03em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
