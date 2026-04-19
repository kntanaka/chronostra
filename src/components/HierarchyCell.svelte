<script lang="ts">
  import { tick } from 'svelte';
  import type { CellNavigationDirection, FlatRow } from '../types';
  import ExpandToggle from './ExpandToggle.svelte';

  let { row, width, showSummaryMeta = false, autoEdit, isDragging, ontoggle, onlabelchange, onautoedited, ondragstart, onnoteclick, onnavigate }: {
    row: FlatRow;
    width: number;
    showSummaryMeta?: boolean;
    autoEdit?: boolean;
    isDragging?: boolean;
    ontoggle: (id: string) => void;
    onlabelchange?: (id: string, newLabel: string) => void;
    onautoedited?: () => void;
    ondragstart?: (e: PointerEvent) => void;
    onnoteclick?: () => void;
    onnavigate?: (direction: CellNavigationDirection) => void;
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
  let shellEl = $state<HTMLElement | null>(null);
  let inputEl = $state<HTMLTextAreaElement | null>(null);
  let editorTop = $state(0);
  let editorLeft = $state(0);
  let editorWidth = $state(0);

  $effect(() => {
    if (autoEdit && onlabelchange && !editing) {
      editing = true;
      editValue = row.label;
      onautoedited?.();
    }
  });

  function startEdit() {
    if (!onlabelchange || editing) return;
    updateEditorFrame();
    editing = true;
    editValue = row.label;
    void focusInput();
  }

  function updateEditorFrame() {
    if (!shellEl) return;
    const rect = shellEl.getBoundingClientRect();
    const anchorRect = getFixedAnchorRect(shellEl);
    editorTop = rect.top - anchorRect.top + 4;
    editorLeft = rect.left - anchorRect.left + 2;
    editorWidth = Math.min(rect.width + 36, 420);
  }

  function getFixedAnchorRect(el: HTMLElement): DOMRect {
    let current: HTMLElement | null = el.parentElement;
    while (current && current !== document.body) {
      const style = getComputedStyle(current);
      const createsContainingBlock =
        style.transform !== 'none' ||
        style.perspective !== 'none' ||
        style.filter !== 'none' ||
        style.backdropFilter !== 'none' ||
        style.contain.includes('paint') ||
        style.contain.includes('layout') ||
        style.willChange.includes('transform') ||
        style.willChange.includes('filter');
      if (createsContainingBlock) {
        return current.getBoundingClientRect();
      }
      current = current.parentElement;
    }
    return new DOMRect(0, 0, 0, 0);
  }

  async function focusInput() {
    await tick();
    inputEl?.focus();
    inputEl?.select();
    resizeEditor();
    correctEditorPosition();
  }

  function resizeEditor() {
    if (!inputEl) return;
    inputEl.style.height = '0px';
    inputEl.style.height = `${Math.max(inputEl.scrollHeight, 72)}px`;
  }

  function correctEditorPosition() {
    if (!shellEl || !inputEl) return;
    requestAnimationFrame(() => {
      if (!shellEl || !inputEl) return;
      const desired = shellEl.getBoundingClientRect();
      const actual = inputEl.getBoundingClientRect();
      editorTop += desired.top + 4 - actual.top;
      editorLeft += desired.left + 2 - actual.left;
    });
  }

  function commitEdit() {
    if (editing && editValue.trim() && editValue !== row.label) {
      onlabelchange?.(row.id, editValue.trim());
    }
    editing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      onnavigate?.(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Enter' && !e.altKey) {
      e.preventDefault();
      commitEdit();
      onnavigate?.(e.shiftKey ? 'up' : 'down');
    } else if (e.key === 'Escape') {
      editing = false;
    }
  }

  function handleStartEditKeydown(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startEdit();
    }
  }
</script>

<svelte:window onresize={editing ? updateEditorFrame : undefined} />

<div class="hierarchy-cell" style:padding-left="{row.depth * 20 + 8}px" style:min-width="{width}px" style:max-width="{width}px" bind:this={shellEl}>
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
      <textarea
        class="label-input"
        style:top={`${editorTop}px`}
        style:left={`${editorLeft}px`}
        style:width={`${editorWidth}px`}
        bind:value={editValue}
        bind:this={inputEl}
        onblur={commitEdit}
        onkeydown={handleKeydown}
        oninput={resizeEditor}
        rows="3"
      ></textarea>
    {:else}
      <div class="label-line">
        <button
          type="button"
          class="label"
          class:editable={!!onlabelchange}
          title={row.label}
          onclick={startEdit}
          onkeydown={handleStartEditKeydown}
        >{row.label}</button>
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
      {#if showSummaryMeta && summaryText}
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
    min-height: var(--chronostra-body-row-height);
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
    appearance: none;
    -webkit-appearance: none;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
    margin: 0;
    padding: 0;
    width: 100%;
    min-width: 0;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    word-break: break-word;
    line-height: 1.4;
    color: inherit;
    font: inherit;
    text-align: left;
  }
  .label-stack {
    min-width: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
    padding: 5px 0;
    position: relative;
    z-index: 120;
  }
  .label-line {
    display: flex;
    align-items: flex-start;
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
  .label:focus-visible {
    outline: none !important;
    box-shadow: none !important;
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .label-input {
    position: fixed;
    min-height: 72px;
    max-height: 240px;
    box-sizing: border-box;
    appearance: none !important;
    -webkit-appearance: none !important;
    font-size: inherit;
    font-weight: inherit;
    font-family: inherit;
    line-height: 1.35;
    color: var(--text-normal);
    background: var(--chronostra-editor-bg) !important;
    border: 1px solid var(--chronostra-editor-border) !important;
    border-radius: var(--chronostra-editor-radius) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
    padding: 8px 10px !important;
    outline: none !important;
    resize: none;
    overflow: auto;
    z-index: 620;
    transition: border-color 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
  }
  .label-input:focus {
    border-color: color-mix(in srgb, var(--interactive-accent) 30%, var(--chronostra-editor-border)) !important;
    box-shadow: 0 0 0 2px var(--chronostra-editor-ring), 0 10px 28px rgba(0, 0, 0, 0.16) !important;
  }
</style>
