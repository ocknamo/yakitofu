<script lang="ts">
import './app.css';
import { onMount } from 'svelte';
import BadgeAwardForm from './lib/components/BadgeAwardForm.svelte';
import BadgeDefinitionForm from './lib/components/BadgeDefinitionForm.svelte';
import BadgePage from './lib/components/BadgePage.svelte';
import LanguageSwitch from './lib/components/LanguageSwitch.svelte';
import LoginButton from './lib/components/LoginButton.svelte';
import RelaySettings from './lib/components/RelaySettings.svelte';
import UserPage from './lib/components/UserPage.svelte';
import { initializeRelays } from './lib/services/nostr';
import { authStore } from './lib/stores/auth';
import { t } from './lib/stores/i18n';
import { relayStore } from './lib/stores/relay';
import { npubToHex } from './lib/utils/npubConverter';

type Tab = 'create' | 'award' | 'settings';

let activeTab: Tab = $state('create');

// Hash routing: #/badge/<npub>:<dTag>
// npub = npub1 + 58 bech32 chars = 63 chars total
// dTag = [a-z0-9-]+
function parseBadgeRoute(hash: string): { pubkey: string; dTag: string } | null {
  const match = hash.match(
    /^#\/badge\/(npub1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}):([a-z0-9-]+)$/
  );
  if (!match) return null;
  try {
    const pubkey = npubToHex(match[1]);
    return { pubkey, dTag: match[2] };
  } catch {
    return null;
  }
}

// Hash routing: #/user/<npub>
function parseUserRoute(hash: string): { pubkey: string } | null {
  const match = hash.match(/^#\/user\/(npub1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58})$/);
  if (!match) return null;
  try {
    const pubkey = npubToHex(match[1]);
    return { pubkey };
  } catch {
    return null;
  }
}

let currentHash = $state(window.location.hash);
let badgeRoute = $derived(parseBadgeRoute(currentHash));
let userRoute = $derived(parseUserRoute(currentHash));

$effect(() => {
  const onHashChange = () => {
    currentHash = window.location.hash;
  };
  window.addEventListener('hashchange', onHashChange);
  return () => window.removeEventListener('hashchange', onHashChange);
});

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

<main class="min-h-screen bg-gray-50 flex flex-col">
	<header class="bg-liner-to-br from-orange-500 to-orange-600 text-white">
		<!-- モバイル表示では縦に並べる -->
		<div class="max-w-7xl mx-auto px-4 py-6 md:py-8 flex items-center justify-between gap-4">
			<div class="flex-1">
				<h1 class="text-2xl md:text-4xl font-bold text-gray-900">📛 {$t('appTitle')}</h1>
				<p class="mt-2 text-sm md:text-base text-gray-900">{$t('appDescription')}</p>
			</div>

			<div class="max-w-xs items-center gap-2 hidden sm:flex">
				<LoginButton />
			</div>
			<LanguageSwitch />
		</div>
	</header>

	{#if !badgeRoute && !userRoute}
	<div class="flex place-content-center sm:hidden p-2border-b border-gray-200">
		<LoginButton />
	</div>
	{/if}

	{#if badgeRoute}
		<div class="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-8">
			<div class="p-4 md:p-8">
				<BadgePage pubkey={badgeRoute.pubkey} dTag={badgeRoute.dTag} />
			</div>
		</div>
	{:else if userRoute}
		<div class="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-8">
			<div class="p-4 md:p-8">
				<UserPage pubkey={userRoute.pubkey} />
			</div>
		</div>
	{:else}
		<div class="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-8">
			<div class="mb-6 md:mb-8 border-b-2 border-gray-200">
				<div class="flex gap-0">
					<button
						class="px-4 py-3 md:px-6 md:py-4 text-gray-600 transition-all border-b-3 {activeTab === 'create'
							? 'border-b-orange-500 text-orange-500 font-semibold'
							: 'border-transparent hover:text-orange-500'}"
						onclick={() => activeTab = 'create'}
					>
						{$t('createBadge')}
					</button>

					<button
						class="px-4 py-3 md:px-6 md:py-4 text-gray-600 transition-all border-b-3 {activeTab === 'award'
							? 'border-b-orange-500 text-orange-500 font-semibold'
							: 'border-transparent hover:text-orange-500'}"
						onclick={() => activeTab = 'award'}
					>
						{$t('awardBadge')}
					</button>

					<button
						class="px-4 py-3 md:px-6 md:py-4 text-gray-600 transition-all border-b-3 {activeTab === 'settings'
							? 'border-b-orange-500 text-orange-500 font-semibold'
							: 'border-transparent hover:text-orange-500'}"
						onclick={() => activeTab = 'settings'}
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
	{/if}

	<footer class="bg-gray-100 border-t border-gray-200 py-4 mt-8">
		<div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600">
			<a 
				href="https://github.com/ocknamo/yakitofu"
				target="_blank" 
				rel="noopener noreferrer"
				class="hover:text-orange-500 transition-colors flex items-center gap-1"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
				</svg>
				{$t('viewOnGitHub')}
			</a>
			<span class="text-gray-400 hidden sm:block">|</span>
			<a 
				href="https://github.com/nostr-protocol/nips/blob/master/58.md" 
				target="_blank" 
				rel="noopener noreferrer"
				class="hover:text-orange-500 transition-colors"
			>
				{$t('nip58Spec')}
			</a>
		</div>
	</footer>
</main>
