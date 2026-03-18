<script lang="ts">
import BadgePage from '$lib/components/BadgePage.svelte';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  {#if data.badge}
    <title>{data.badge.name} - Yakitofu</title>
    <meta name="description" content={data.badge.description || 'NIP-58 Badge on Nostr'} />
    <meta property="og:title" content={data.badge.name} />
    <meta property="og:description" content={data.badge.description || 'NIP-58 Badge on Nostr'} />
    <meta property="og:type" content="article" />
    <meta property="og:image" content={data.badge.imageUrl} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={data.badge.name} />
    <meta name="twitter:description" content={data.badge.description || 'NIP-58 Badge on Nostr'} />
    <meta name="twitter:image" content={data.badge.imageUrl} />
  {:else}
    <title>Yakitofu - NIP-58 Badge App</title>
    <meta name="description" content="Create and award NIP-58 badges on Nostr" />
    <meta property="og:title" content="Yakitofu - NIP-58 Badge App" />
    <meta property="og:description" content="Create and award NIP-58 badges on Nostr" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://yakitofu.pages.dev/ogp.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Yakitofu - NIP-58 Badge App" />
    <meta name="twitter:description" content="Create and award NIP-58 badges on Nostr" />
    <meta name="twitter:image" content="https://yakitofu.pages.dev/ogp.png" />
  {/if}
</svelte:head>

<div class="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-8">
  <div class="p-4 md:p-8">
    <BadgePage pubkey={data.pubkey} dTag={data.dTag} />
  </div>
</div>
