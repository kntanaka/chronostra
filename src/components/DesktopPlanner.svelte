<script lang="ts">
  import type { FlatRow, ItemPlan } from '../types';
  import { translator, type Locale } from '../i18n';
  import PlanSchedule from './PlanSchedule.svelte';
  let { rows, locale, onplanchange }: { rows: FlatRow[]; locale: Locale; onplanchange: (id: string, plan: ItemPlan) => void } = $props();
  const t = $derived(translator(locale));
  let selectedId = $state<string | null>(null);
  const selected = $derived(rows.find(row => row.id === selectedId));
</script>
<div class="desktop-planner">
  <nav aria-label={t('planningItems')}>
    <h3>{t('planningItems')}</h3>
    {#each rows as row (row.id)}
      <button type="button" class:selected={selectedId === row.id} onclick={() => { selectedId = row.id; }}>
        <small>{row.path.slice(0, -1).join(' / ')}</small><strong>{row.label}</strong>
        <span>{row.plan?.dueDate ?? t('noDeadline')} · {t('scheduledCount', { count: row.plan?.steps.length ?? 0 })}</span>
      </button>
    {/each}
    {#if !rows.length}<p>{t('emptyResults')}</p>{/if}
  </nav>
  <main>
    {#if selected}
      <header><small>{selected.path.slice(0, -1).join(' / ')}</small><h2>{selected.label}</h2><p>{selected.metrics.future}</p></header>
      {#key selected.id}<PlanSchedule plan={selected.plan} {locale} desktop onchange={(plan) => onplanchange(selected.id, plan)} />{/key}
    {:else}<h2>{t('selectPlan')}</h2><p>{t('planHelp')}</p>{/if}
  </main>
</div>
<style>
  .desktop-planner { flex: 1; min-height: 0; display: grid; grid-template-columns: 280px minmax(0, 1fr); overflow: hidden; }
  nav, main { overflow: auto; min-width: 0; padding: 20px; }
  nav { border-right: 1px solid var(--background-modifier-border); }
  nav h3 { font-size: 14px; margin-top: 0; }
  nav button { display: flex; flex-direction: column; align-items: stretch; width: 100%; gap: 8px; text-align: left; height: auto; min-height: 64px; padding: 14px; margin-bottom: 8px; background: var(--background-secondary); border: 1px solid transparent; border-radius: 10px; white-space: normal; overflow-wrap: anywhere; box-shadow: none; }
  nav button.selected { border-color: var(--interactive-accent); }
  small, nav span { font-size: 12px; color: var(--text-muted); }
  h2 { margin: 8px 0; }
  main header p { color: var(--text-muted); line-height: 1.6; white-space: pre-wrap; }
</style>
