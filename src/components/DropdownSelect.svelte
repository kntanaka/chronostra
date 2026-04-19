<script lang="ts">
  export interface DropdownOption {
    value: string;
    label: string;
  }

  let {
    value,
    options,
    placeholder = '',
    variant = 'toolbar',
    disabled = false,
    minWidth = 120,
    title = '',
    onchange,
  }: {
    value: string;
    options: DropdownOption[];
    placeholder?: string;
    variant?: 'toolbar' | 'cell';
    disabled?: boolean;
    minWidth?: number;
    title?: string;
    onchange?: (next: string) => void;
  } = $props();

  let open = $state(false);
  let rootEl = $state<HTMLDivElement | null>(null);

  const selectedOption = $derived(
    options.find((option) => option.value === value) ?? null
  );

  function toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    open = !open;
  }

  function closeMenu() {
    open = false;
  }

  function handleSelect(next: string) {
    if (!disabled && next !== value) {
      onchange?.(next);
    }
    open = false;
  }

  function handleWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (!open || !rootEl) return;
    const target = e.target;
    if (target instanceof Node && rootEl.contains(target)) return;
    open = false;
  }
</script>

<svelte:window onclick={open ? handleWindowClick : undefined} onkeydown={open ? handleWindowKeydown : undefined} />

<div
  bind:this={rootEl}
  class={`dropdown-select ${variant}`}
  class:is-open={open}
  style={`--dropdown-min-width: ${minWidth}px;`}
>
  <button
    type="button"
    class="dropdown-trigger"
    class:is-open={open}
    disabled={disabled}
    {title}
    aria-haspopup="menu"
    aria-expanded={open}
    onpointerdown={(e) => e.stopPropagation()}
    onclick={toggleMenu}
  >
    <span class="dropdown-label">{selectedOption?.label ?? placeholder}</span>
    <span class="dropdown-caret">▾</span>
  </button>

  {#if open}
    <div class="context-menu dropdown-menu" onpointerdown={(e) => e.stopPropagation()}>
      {#each options as option}
        <button
          type="button"
          class="context-item"
          class:context-item-active={option.value === value}
          onclick={() => handleSelect(option.value)}
        >
          <span>{option.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dropdown-select {
    position: relative;
    flex-shrink: 0;
    min-width: var(--dropdown-min-width);
  }
  .dropdown-select.is-open {
    z-index: 220;
  }
  .dropdown-trigger {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: 1px solid transparent;
    border-radius: 0;
    outline: none;
    box-shadow: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }
  .toolbar .dropdown-trigger {
    height: 24px;
    padding: 0 10px;
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--text-faint);
    border-color: var(--background-modifier-border);
  }
  .cell .dropdown-trigger {
    height: calc(var(--chronostra-row-height) - 10px);
    padding: 0 6px;
    font-size: 10px;
    letter-spacing: 0.04em;
    color: inherit;
  }
  .dropdown-trigger:hover,
  .dropdown-trigger.is-open {
    border-color: var(--background-modifier-border);
    background: var(--background-secondary);
    color: var(--text-normal);
  }
  .dropdown-trigger:focus-visible {
    border-color: var(--interactive-accent);
    background: var(--background-secondary);
  }
  .dropdown-trigger:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .dropdown-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dropdown-caret {
    flex-shrink: 0;
    font-size: 9px;
    color: var(--text-faint);
  }
  .dropdown-menu {
    top: calc(100% + 6px);
    left: 0;
    min-width: max(100%, var(--dropdown-min-width));
  }
  .context-menu {
    position: absolute;
    z-index: 220;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    padding: 4px 0;
  }
  .context-item {
    appearance: none;
    -webkit-appearance: none;
    font-family: inherit;
    display: block;
    width: 100%;
    padding: 5px 12px;
    font-size: 11px;
    color: var(--text-normal);
    background: none;
    border: none;
    border-radius: 0;
    box-shadow: none;
    cursor: pointer;
    text-align: left;
    letter-spacing: 0.01em;
  }
  .context-item:hover {
    background: var(--background-secondary);
  }
  .context-item-active {
    color: var(--interactive-accent);
  }
</style>
