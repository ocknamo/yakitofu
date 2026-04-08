<script lang="ts">
import { page } from '$app/stores';
import SearchResultPage from '$lib/components/SearchResultPage.svelte';

const dTag = $derived(decodeURIComponent($page.params.query ?? ''));
</script>

<svelte:head>
  <title>Search: {dTag} - Yakitofu</title>
  <meta name="description" content="Nostr badges matching '{dTag}'" />
  <meta property="og:title" content="Search: {dTag} - Yakitofu" />
  <meta property="og:description" content="Nostr badges matching '{dTag}'" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://share.yabu.me/26bb2ebed6c552d670c804b0d655267b3c662b21e026d6e48ac93a6070530958/ca0f150a01392cdd123507ff929b730842e744b46e849708fc189c5b4c509b66.png" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-8">
  <div class="p-4 md:p-8">
    <SearchResultPage {dTag} />
  </div>
</div>
