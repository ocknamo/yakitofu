<script lang="ts">
import './app.css';
import { onMount } from 'svelte';
import BadgeAwardForm from './lib/components/BadgeAwardForm.svelte';
import BadgeDefinitionForm from './lib/components/BadgeDefinitionForm.svelte';
import LanguageSwitch from './lib/components/LanguageSwitch.svelte';
import LoginButton from './lib/components/LoginButton.svelte';
import RelaySettings from './lib/components/RelaySettings.svelte';
import { initializeRelays } from './lib/services/nostr';
import { authStore } from './lib/stores/auth';
import { t } from './lib/stores/i18n';
import { relayStore } from './lib/stores/relay';

type Tab = 'create' | 'award' | 'relay';

let activeTab: Tab = $state('create');

// Initialize relays when relay settings change
$effect(() => {
  initializeRelays($relayStore.relays, (relay: string, connected: boolean) => {
    relayStore.setConnected(relay, connected);
  });
});

onMount(() => {
  // Check for window.nostr after a short delay to ensure extension is loaded
  setTimeout(() => {
    authStore.checkExtension();
  }, 100);
});
</script>

<main class="min-h-screen bg-gray-50">
	<header
		class="bg-liner-to-br from-orange-500 to-orange-600 text-white shadow-md"
	>
		<div
			class="max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
		>
			<div class="flex-1">
				<h1 class="text-3xl md:text-4xl font-bold">📛 {$t('appTitle')}</h1>
				<p class="mt-2 text-sm md:text-base opacity-90">{$t('appDescription')}</p>
			</div>

			<LanguageSwitch />
		</div>
	</header>

	<div class="max-w-7xl mx-auto px-4 py-6 md:py-8">
		<LoginButton />

		<div class="mb-6 md:mb-8 border-b-2 border-gray-200">
			<div class="flex flex-col md:flex-row gap-2 md:gap-0">
				<button
					class="px-4 py-3 md:px-6 md:py-4 text-gray-600 transition-all border-b-3 md:border-l-3 md:border-b-0 {activeTab === 'create'
						? 'border-b-orange-500 md:border-l-orange-500 md:border-b-transparent text-orange-500 font-semibold bg-gray-50 md:bg-transparent'
						: 'border-transparent hover:text-orange-500 hover:bg-gray-50'}"
					onclick={() => activeTab = 'create'}
				>
					{$t('createBadge')}
				</button>

				<button
					class="px-4 py-3 md:px-6 md:py-4 text-gray-600 transition-all border-b-3 md:border-l-3 md:border-b-0 {activeTab === 'award'
						? 'border-b-orange-500 md:border-l-orange-500 md:border-b-transparent text-orange-500 font-semibold bg-gray-50 md:bg-transparent'
						: 'border-transparent hover:text-orange-500 hover:bg-gray-50'}"
					onclick={() => activeTab = 'award'}
				>
					{$t('awardBadge')}
				</button>

				<button
					class="px-4 py-3 md:px-6 md:py-4 text-gray-600 transition-all border-b-3 md:border-l-3 md:border-b-0 {activeTab === 'relay'
						? 'border-b-orange-500 md:border-l-orange-500 md:border-b-transparent text-orange-500 font-semibold bg-gray-50 md:bg-transparent'
						: 'border-transparent hover:text-orange-500 hover:bg-gray-50'}"
					onclick={() => activeTab = 'relay'}
				>
					{$t('relaySettings')}
				</button>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-sm p-4 md:p-8">
			{#if activeTab === 'create'}
				<BadgeDefinitionForm />
			{:else if activeTab === 'award'}
				<BadgeAwardForm />
			{:else if activeTab === 'relay'}
				<RelaySettings />
			{/if}
		</div>
	</div>
</main>
