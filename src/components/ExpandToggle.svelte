<script lang="ts">
  let { expanded = false, onclick }: { expanded: boolean; onclick: () => void } = $props();
</script>

<button
  class="expand-toggle"
  class:expanded
  onclick={onclick}
  aria-label={expanded ? 'Collapse' : 'Expand'}
>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M5 3L9 7L5 11"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>

<style>
  .expand-toggle {
    appearance: none;
    -webkit-appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-faint);
    cursor: pointer;
    padding: 0;
    border-radius: 0;
    box-shadow: none;
    transition: transform 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
  }
  .expand-toggle:hover {
    color: var(--text-muted);
  }
  .expand-toggle.expanded {
    transform: rotate(90deg);
  }
</style>
