<script lang="ts">
import UserPage from '$lib/components/UserPage.svelte';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const displayName = $derived(
  data.profile?.displayName || data.profile?.name || data.npub.slice(0, 12) + '...'
);
</script>

<svelte:head>
  {#if data.profile}
    <title>{displayName} - Yakitofu</title>
    <meta name="description" content="{displayName}'s badges on Nostr" />
    <meta property="og:title" content="{displayName} - Yakitofu" />
    <meta property="og:description" content="{displayName}'s badges on Nostr" />
    <meta property="og:type" content="profile" />
    {#if data.profile.picture}
      <meta property="og:image" content={data.profile.picture} />
      <meta name="twitter:image" content={data.profile.picture} />
    {:else}
      <meta property="og:image" content="https://yakitofu.pages.dev/ogp.png" />
      <meta name="twitter:image" content="https://yakitofu.pages.dev/ogp.png" />
    {/if}
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="{displayName} - Yakitofu" />
    <meta name="twitter:description" content="{displayName}'s badges on Nostr" />
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
    <UserPage pubkey={data.pubkey} />
  </div>
</div>
