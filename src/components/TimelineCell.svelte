<script lang="ts">
  import { tick } from 'svelte';
  import type { TimelineEntry } from '../types';

  let {
    entry,
    onpopup,
    focused,
    onchange
  }: {
    entry: TimelineEntry;
    onpopup: (text: string | null, x: number, y: number) => void;
    focused?: boolean;
    onchange?: (year: number, text: string) => void;
  } = $props();

  let editing = $state(false);
  let editValue = $state('');
  let inputEl = $state<HTMLInputElement | null>(null);
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
    editing = true;
    editValue = entry.text;
    void focusInput();
  }

  async function focusInput() {
    await tick();
    inputEl?.focus();
    inputEl?.select();
  }

  function commitEdit() {
    if (editing && editValue !== entry.text) {
      onchange?.(entry.year, editValue);
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

  function handleStartEditKeydown(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startEdit();
    }
  }
</script>

{#if editing}
  <div class="timeline-cell editing">
    <input
      class="timeline-input"
      type="text"
      bind:value={editValue}
      bind:this={inputEl}
      onblur={commitEdit}
      onkeydown={handleKeydown}
    />
  </div>
{:else}
  <button
    type="button"
    class="timeline-cell"
    class:editable={!!onchange}
    class:focused={focused}
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

<style>
  .timeline-cell {
    appearance: none;
    -webkit-appearance: none;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: none !important;
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    min-width: 0;
    max-width: none;
    height: var(--chronostra-row-height);
    margin: 0;
    padding: 0 6px;
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
    height: var(--chronostra-row-height);
    padding: 2px;
    box-sizing: border-box;
  }
  .status-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .timeline-input {
    width: 100%;
    height: calc(var(--chronostra-row-height) - 8px);
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
    box-shadow: none !important;
    padding: 0 8px !important;
    outline: none !important;
    transition: border-color 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
  }
  .timeline-input:focus {
    border-color: color-mix(in srgb, var(--interactive-accent) 30%, var(--chronostra-editor-border)) !important;
    box-shadow: 0 0 0 2px var(--chronostra-editor-ring) !important;
  }
</style>
