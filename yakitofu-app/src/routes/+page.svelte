<script lang="ts">
import BadgeAwardForm from '$lib/components/BadgeAwardForm.svelte';
import BadgeDefinitionForm from '$lib/components/BadgeDefinitionForm.svelte';
import LoginButton from '$lib/components/LoginButton.svelte';
import RelaySettings from '$lib/components/RelaySettings.svelte';
import { t } from '$lib/stores/i18n';

type Tab = 'create' | 'award' | 'settings';

let activeTab: Tab = $state('create');
</script>

<svelte:head>
  <title>Yakitofu - NIP-58 Badge App</title>
  <meta name="description" content="Create and award NIP-58 badges on Nostr" />
  <meta property="og:title" content="Yakitofu - NIP-58 Badge App" />
  <meta property="og:description" content="Create and award NIP-58 badges on Nostr" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://yakitofu.pages.dev/" />
  <meta property="og:image" content="https://yakitofu.pages.dev/ogp.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Yakitofu - NIP-58 Badge App" />
  <meta name="twitter:description" content="Create and award NIP-58 badges on Nostr" />
  <meta name="twitter:image" content="https://yakitofu.pages.dev/ogp.png" />
</svelte:head>

<div class="flex place-content-center sm:hidden p-2 border-b border-gray-200">
  <LoginButton />
</div>

<div class="flex-1 w-full px-4 py-6 md:py-8">
  <div class="max-w-2xl mx-auto">
    <div class="mb-6 md:mb-8 border-b-2 border-gray-200">
      <div class="flex gap-0 justify-center">
        <button
          class="px-4 py-3 md:px-6 md:py-4 text-gray-600 transition-all border-b-3 {activeTab === 'create'
            ? 'border-b-orange-500 text-orange-500 font-semibold'
            : 'border-transparent hover:text-orange-500'}"
          onclick={() => (activeTab = 'create')}
        >
          {$t('createBadge')}
        </button>

        <button
          class="px-4 py-3 md:px-6 md:py-4 text-gray-600 transition-all border-b-3 {activeTab === 'award'
            ? 'border-b-orange-500 text-orange-500 font-semibold'
            : 'border-transparent hover:text-orange-500'}"
          onclick={() => (activeTab = 'award')}
        >
          {$t('awardBadge')}
        </button>

        <button
          class="px-4 py-3 md:px-6 md:py-4 text-gray-600 transition-all border-b-3 {activeTab === 'settings'
            ? 'border-b-orange-500 text-orange-500 font-semibold'
            : 'border-transparent hover:text-orange-500'}"
          onclick={() => (activeTab = 'settings')}
        >
          {$t('settings')}
        </button>
      </div>
    </div>

    <div class="p-4 md:p-8">
      {#if activeTab === 'create'}
        <BadgeDefinitionForm />
      {:else if activeTab === 'award'}
        <BadgeAwardForm />
      {:else if activeTab === 'settings'}
        <RelaySettings />
      {/if}
    </div>
  </div>
</div>
