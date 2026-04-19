<script lang="ts">
  import { tick } from 'svelte';

  let { value, type, width, onchange }: {
    value: string;
    type: 'future' | 'now' | 'gap';
    width: number;
    onchange?: (newValue: string) => void;
  } = $props();

  let editing = $state(false);
  let editValue = $state('');
  let inputEl = $state<HTMLInputElement | null>(null);

  const color = $derived(
    type === 'gap'
      ? 'var(--text-muted)'
      : type === 'now'
        ? 'var(--text-muted)'
        : 'var(--text-normal)'
  );

  function startEdit() {
    if (!onchange || editing) return;
    editing = true;
    editValue = value;
    void focusInput();
  }

  async function focusInput() {
    await tick();
    inputEl?.focus();
    inputEl?.select();
  }

  function commitEdit() {
    if (editing && editValue !== value) {
      onchange?.(editValue);
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
  <div class="metric-cell editing" style:min-width="{width}px" style:max-width="{width}px">
    <input
      class="metric-input"
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
    class="metric-cell"
    class:editable={!!onchange}
    style:color={color}
    style:min-width="{width}px"
    style:max-width="{width}px"
    title={value}
    onclick={startEdit}
    onkeydown={handleStartEditKeydown}
  >
    <span class="metric-text">{value}</span>
  </button>
{/if}

<style>
  .metric-cell {
    appearance: none;
    -webkit-appearance: none;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: none !important;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: var(--chronostra-row-height);
    margin: 0;
    padding: 0 8px;
    font-size: 11px;
    background: inherit !important;
    font-family: inherit;
    box-sizing: border-box;
    overflow: hidden;
    text-align: left;
  }
  .metric-cell.editable {
    cursor: text;
  }
  .metric-cell.editable:hover {
    background: var(--background-secondary) !important;
  }
  .metric-cell:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
  .metric-text {
    white-space: normal;
    word-break: break-word;
    line-height: 1.4;
  }
  .metric-cell.editing {
    padding: 2px 4px;
  }
  .metric-input {
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
  .metric-input:focus {
    border-color: color-mix(in srgb, var(--interactive-accent) 30%, var(--chronostra-editor-border)) !important;
    box-shadow: 0 0 0 2px var(--chronostra-editor-ring) !important;
  }
</style>
