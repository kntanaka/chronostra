<script lang="ts">
  import { tick } from 'svelte';
  import type { CellNavigationDirection, TimelineEntry } from '../types';

  let {
    entry,
    onpopup,
    focused,
    autoEdit = false,
    onchange,
    onautoedited,
    onnavigate
  }: {
    entry: TimelineEntry;
    onpopup: (text: string | null, x: number, y: number) => void;
    focused?: boolean;
    autoEdit?: boolean;
    onchange?: (year: number, text: string) => void;
    onautoedited?: () => void;
    onnavigate?: (direction: CellNavigationDirection) => void;
  } = $props();

  let editing = $state(false);
  let editValue = $state('');
  let skipBlurCommit = $state(false);
  let shellEl = $state<HTMLElement | null>(null);
  let inputEl = $state<HTMLTextAreaElement | null>(null);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let editorTop = $state(0);
  let editorLeft = $state(0);
  let editorWidth = $state(0);
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;

  const statusColor = $derived(() => {
    if (!entry.status || !entry.text) return 'transparent';
    switch (entry.status) {
      case 'completed': return 'var(--text-normal)';
      case 'active': return 'var(--text-muted)';
      case 'at-risk': return 'var(--text-muted)';
      case 'planned': return 'var(--text-faint)';
      default: return 'transparent';
    }
  });

  $effect(() => {
    if (autoEdit && !editing && onchange) {
      startEdit();
      onautoedited?.();
    }
  });

  function onMouseEnter(e: MouseEvent) {
    if (!entry.text || editing) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hoverTimeout = setTimeout(() => {
      onpopup(entry.text, rect.left, rect.bottom + 4);
    }, 300);
  }

  function onMouseLeave() {
    clearTimeout(hoverTimeout);
    onpopup(null, 0, 0);
  }

  function startEdit() {
    if (!onchange || editing) return;
    clearTimeout(hoverTimeout);
    onpopup(null, 0, 0);
    updateEditorFrame();
    editing = true;
    editValue = entry.text;
    void focusInput();
  }

  function updateEditorFrame() {
    if (!shellEl) return;
    const rect = shellEl.getBoundingClientRect();
    const anchorRect = getFixedAnchorRect(shellEl);
    editorTop = rect.top - anchorRect.top + 4;
    editorLeft = rect.left - anchorRect.left + 4;
    editorWidth = Math.min(rect.width + 28, 360);
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
      editorLeft += desired.left + 4 - actual.left;
    });
  }

  function commitEdit() {
    if (skipBlurCommit) {
      skipBlurCommit = false;
      return;
    }
    if (editing && editValue !== entry.text) {
      onchange?.(entry.year, editValue);
    }
    editing = false;
  }

  async function focusTrigger() {
    await tick();
    triggerEl?.focus();
  }

  function cancelEdit() {
    skipBlurCommit = true;
    editValue = entry.text;
    editing = false;
    void focusTrigger();
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
      e.preventDefault();
      cancelEdit();
    }
  }

  function handleStartEditKeydown(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'F2') {
      e.preventDefault();
      startEdit();
      return;
    }

    const direction =
      e.key === 'ArrowUp'
        ? 'up'
        : e.key === 'ArrowDown'
          ? 'down'
          : e.key === 'ArrowLeft'
            ? 'left'
            : e.key === 'ArrowRight'
              ? 'right'
              : null;

    if (direction) {
      e.preventDefault();
      onnavigate?.(direction);
    }
  }
</script>

<svelte:window onresize={editing ? updateEditorFrame : undefined} />

<div class="timeline-shell" bind:this={shellEl}>
{#if editing}
  <div class="timeline-cell editing">
    <textarea
      class="timeline-input"
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
  </div>
{:else}
  <button
    type="button"
    class="timeline-cell"
    class:editable={!!onchange}
    class:focused={focused}
    bind:this={triggerEl}
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
    onclick={startEdit}
    onkeydown={handleStartEditKeydown}
  >
    {#if entry.text}
      <div class="status-dot" style:background={statusColor()}></div>
      <span class="text">{entry.text}</span>
    {/if}
  </button>
{/if}
</div>

<style>
  .timeline-shell {
    position: relative;
    width: 100%;
    overflow: visible;
  }
  .timeline-cell {
    appearance: none;
    -webkit-appearance: none;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: none !important;
    display: flex;
    align-items: flex-start;
    gap: 5px;
    width: 100%;
    min-width: 0;
    max-width: none;
    height: var(--chronostra-body-row-height);
    margin: 0;
    padding: 7px 6px;
    font-size: 11px;
    color: var(--text-muted);
    background: inherit !important;
    font-family: inherit;
    box-sizing: border-box;
    overflow: hidden;
    cursor: default;
    text-align: left;
  }
  .timeline-cell.editable {
    cursor: text;
  }
  .timeline-cell.editable:hover {
    background: var(--background-secondary) !important;
  }
  .timeline-cell:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
  .timeline-cell.focused {
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-normal);
  }
  .timeline-cell.editing {
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    max-width: none;
    height: var(--chronostra-body-row-height);
    padding: 0;
    box-sizing: border-box;
    position: relative;
    overflow: visible;
    z-index: 120;
  }
  .status-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 5px;
  }
  .text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    word-break: break-word;
    line-height: 1.4;
    min-width: 0;
  }
  .timeline-input {
    position: fixed;
    min-height: 72px;
    max-height: 220px;
    box-sizing: border-box;
    appearance: none !important;
    -webkit-appearance: none !important;
    font-size: 11px;
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
  .timeline-input:focus {
    border-color: color-mix(in srgb, var(--interactive-accent) 30%, var(--chronostra-editor-border)) !important;
    box-shadow: 0 0 0 2px var(--chronostra-editor-ring), 0 10px 28px rgba(0, 0, 0, 0.16) !important;
  }
</style>
