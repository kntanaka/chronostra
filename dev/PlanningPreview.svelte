<script lang="ts">
  import { onMount } from 'svelte';
  import DesktopPlanner from '../src/components/DesktopPlanner.svelte';
  import MobileChronoList from '../src/components/MobileChronoList.svelte';
  import { localDate, monday } from '../src/planning';
  import type { FlatRow, ItemPlan } from '../src/types';
  import type { Locale } from '../src/i18n';
  const today = localDate();
  const initial: FlatRow = { id:'art-demo',label:'Create and publish an artwork',path:['Creative work','Create and publish an artwork'],depth:1,commitment:'must',metrics:{future:'Publish a finished artwork and explain the process.',now:'Collecting references.',gap:'Choose a theme, make studies, then produce the final work.'},timeline:[],isExpanded:false,hasChildren:false,isLastChild:true,parentIds:[],plan:{dueDate:`${today.slice(0,4)}-12-31`,steps:[{id:'monthly',title:'Choose the theme and composition',period:'month',date:today.slice(0,7),status:'in-progress'},{id:'weekly',title:'Collect five references and draw three sketches',period:'week',date:monday(today),status:'todo',notes:'Compare the strongest directions before choosing one.'},{id:'dated',title:'Review the sketches',period:'date',date:today,status:'todo'}]}};
  let rows = $state<FlatRow[]>([initial]);
  let mode = $state('desktop');
  let width = $state('320');
  let locale = $state<Locale>('en');
  let saved = $state('');
  let textSize = $state('100');
  $effect(() => {
    const root = document.documentElement;
    const previous = root.style.fontSize;
    root.style.fontSize = `${Number(textSize) / 100 * 16}px`;
    return () => { root.style.fontSize = previous; };
  });
  onMount(() => { const stored=localStorage.getItem('chronostra-planning-demo'); if(stored) rows=JSON.parse(stored); });
  function update(id:string, plan:ItemPlan) { rows=rows.map(row=>row.id===id?{...row,plan}:row); localStorage.setItem('chronostra-planning-demo',JSON.stringify(rows)); saved='Saved locally'; }
</script>
<div class="demo-controls"><strong>Planning preview · sample data only</strong><button onclick={()=>mode='desktop'}>Desktop</button><button onclick={()=>mode='mobile'}>Mobile</button><select aria-label="Width" bind:value={width}><option>320</option><option>390</option></select><select aria-label="Language" bind:value={locale}><option value="en">English</option><option value="ja">日本語</option></select><select aria-label="Text size" bind:value={textSize}><option value="100">Text 100%</option><option value="150">Text 150%</option><option value="200">Text 200%</option></select><span role="status">{saved}</span></div>
{#if mode === 'desktop'}<DesktopPlanner {rows} {locale} onplanchange={update} />{:else}<div class="preview-active" style:width={width+'px'}><MobileChronoList saveAnnouncement={saved} onquickcapture={({label}) => { rows = [...rows, {...initial, id: crypto.randomUUID(), label, path: ['90 Inbox', label], commitment: undefined, plan: undefined}]; localStorage.setItem('chronostra-planning-demo', JSON.stringify(rows)); saved='Saved locally'; }} {rows} {locale} timelineStartYear={2026} timelineEndYear={2050} ontoggle={()=>{}} onplanchange={update} /></div>{/if}
<style>
:global(html),:global(body),:global(#app) { height:100%; margin:0; }
:global(body) { font:16px -apple-system,BlinkMacSystemFont,sans-serif; background:#1e1e1e; color:#ddd; --background-primary:#1e1e1e; --background-secondary:#262626; --background-modifier-border:#3a3a3a; --text-normal:#ddd; --text-muted:#aaa; --text-error:#ff8585; --interactive-accent:#8b5cf6; --text-accent:#a78bfa; --interactive-normal:#333; --background-modifier-hover:#333; }
:global(#app) { display:flex; flex-direction:column; }
:global(input),:global(select),:global(textarea),:global(button) { font:inherit; color:inherit; background:#303030; border:1px solid #444; border-radius:6px; padding:8px; }
:global(button) { cursor:pointer; }
:global(.mod-cta) { background:#7950df; }
.demo-controls { display:flex; gap:12px; padding:16px; align-items:center; flex-wrap:wrap; border-bottom:1px solid #444; }
.preview-active { margin:16px auto; max-width:100%; flex:1; min-height:0; overflow:auto; border:1px solid #444; border-radius:24px; }
</style>
