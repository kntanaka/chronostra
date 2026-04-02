<script lang="ts">
  let { value, type, width, onchange }: {
    value: string;
    type: 'future' | 'now' | 'gap';
    width: number;
    onchange?: (newValue: string) => void;
  } = $props();

  let editing = $state(false);
  let editValue = $state('');

  const color = $derived(
    type === 'gap'
      ? 'var(--text-muted)'
      : type === 'now'
        ? 'var(--text-muted)'
        : 'var(--text-normal)'
  );

  function startEdit() {
    if (!onchange) return;
    editing = true;
    editValue = value;
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
</script>

{#if editing}
  <div class="metric-cell editing" style:min-width="{width}px" style:max-width="{width}px">
    <input
      class="metric-input"
      type="text"
      bind:value={editValue}
      onblur={commitEdit}
      onkeydown={handleKeydown}
      autofocus
    />
  </div>
{:else}
  <div
    class="metric-cell"
    class:editable={!!onchange}
    style:color={color}
    style:min-width="{width}px"
    style:max-width="{width}px"
    title={value}
    ondblclick={startEdit}
  >
    <span class="metric-text">{value}</span>
  </div>
{/if}

<style>
  .metric-cell {
    display: flex;
    align-items: center;
    min-height: var(--chronostra-row-height);
    padding: 0 8px;
    font-size: 11px;
    background: inherit;
    box-sizing: border-box;
    overflow: hidden;
  }
  .metric-cell.editable {
    cursor: text;
  }
  .metric-cell.editable:hover {
    background: var(--background-secondary) !important;
  }
  .metric-text {
    white-space: normal;
    word-break: break-word;
    line-height: 1.4;
  }
  .metric-cell.editing {
    padding: 0 4px;
  }
  .metric-input {
    width: 100%;
    height: calc(var(--chronostra-row-height) - 8px);
    font-size: 11px;
    font-family: inherit;
    color: var(--text-normal);
    background: var(--background-primary);
    border: 1px solid var(--interactive-accent);
    border-radius: 3px;
    padding: 0 4px;
    outline: none;
  }
</style>
