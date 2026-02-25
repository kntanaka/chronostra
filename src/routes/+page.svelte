<script lang="ts">
  import ChronoTable from '$lib/components/ChronoTable.svelte';
  import { generateDummyData, countAllNodes } from '$lib/data/dummy-data';

  const data = generateDummyData();
  console.log(`Chronostra loaded: ${countAllNodes(data)} total nodes`);
</script>

<svelte:head>
  <title>Chronostra</title>
</svelte:head>

<ChronoTable {data} />
