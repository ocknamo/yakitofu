<script lang="ts">
import BadgePage from '$lib/components/BadgePage.svelte';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const ogImage = $derived(
  data.badge
    ? (data.badge.thumbnails.xl ?? data.badge.thumbnails.l ?? data.badge.imageUrl)
    : 'https://share.yabu.me/26bb2ebed6c552d670c804b0d655267b3c662b21e026d6e48ac93a6070530958/ca0f150a01392cdd123507ff929b730842e744b46e849708fc189c5b4c509b66.png'
);
</script>

<svelte:head>
  {#if data.badge}
    <title>{data.badge.name} - Yakitofu</title>
    <meta name="description" content={data.badge.description || 'NIP-58 Badge on Nostr'} />
    <meta property="og:title" content={data.badge.name} />
    <meta property="og:description" content={data.badge.description || 'NIP-58 Badge on Nostr'} />
    <meta property="og:type" content="article" />
    <meta property="og:image" content={ogImage} />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content={data.badge.name} />
    <meta name="twitter:description" content={data.badge.description || 'NIP-58 Badge on Nostr'} />
    <meta name="twitter:image" content={ogImage} />
  {:else}
    <title>Yakitofu - NIP-58 Badge App</title>
    <meta name="description" content="Create and award NIP-58 badges on Nostr" />
    <meta property="og:title" content="Yakitofu - NIP-58 Badge App" />
    <meta property="og:description" content="Create and award NIP-58 badges on Nostr" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content={ogImage} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Yakitofu - NIP-58 Badge App" />
    <meta name="twitter:description" content="Create and award NIP-58 badges on Nostr" />
    <meta name="twitter:image" content={ogImage} />
  {/if}
</svelte:head>

<div class="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-8">
  <div class="p-4 md:p-8">
    <BadgePage pubkey={data.pubkey} dTag={data.dTag} />
  </div>
</div>
