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
    background: #2a2a3d;
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    color: var(--text-primary);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    pointer-events: none;
  }
</style>
