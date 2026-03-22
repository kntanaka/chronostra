<script lang="ts">
  let { text, x, y }: { text: string; x: number; y: number } = $props();
</script>

<div
  class="cell-popup"
  style:left="{x}px"
  style:top="{y}px"
>
  {text}
</div>

<style>
  .cell-popup {
    position: fixed;
    z-index: 100;
    max-width: 320px;
    padding: 8px 12px;
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    color: var(--text-normal);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    pointer-events: none;
  }
</style>
