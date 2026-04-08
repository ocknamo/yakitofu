<script lang="ts">
import type { Subscription } from 'rxjs';
import { onDestroy } from 'svelte';
import type { NostrEvent } from '../../types/nostr';
import {
  type BadgeDefinitionWithPubkey,
  resolveBadgeDefinitionsByPubkey,
} from '../services/badgeDefinitionResolver';
import { publishEvent } from '../services/nostr';
import { authStore } from '../stores/auth';
import { t } from '../stores/i18n';
import { npubToHex } from '../utils/npubConverter';
import { isValidNpub } from '../utils/validation';

let badges: BadgeDefinitionWithPubkey[] = $state([]);
let selectedBadge = $state('');
let recipientNpub = $state('');
let submitting = $state(false);
let loading = $state(false);
let message = $state('');
let messageType: 'success' | 'error' = $state('success');
let badgeSubscription: Subscription | null = null;

// Get selected badge details
let selectedBadgeDetails = $derived(badges.find((b) => b.dTag === selectedBadge));

// Load user's badges when logged in
$effect(() => {
  if ($authStore.isLoggedIn && $authStore.pubkey) {
    loadBadges();
  } else {
    badges = [];
    if (badgeSubscription) {
      badgeSubscription.unsubscribe();
      badgeSubscription = null;
    }
  }
});

// Cleanup on component destroy
onDestroy(() => {
  if (badgeSubscription) {
    badgeSubscription.unsubscribe();
  }
});

function loadBadges() {
  if (!$authStore.pubkey) return;

  if (badgeSubscription) {
    badgeSubscription.unsubscribe();
  }

  loading = true;
  badges = [];

  badgeSubscription = resolveBadgeDefinitionsByPubkey($authStore.pubkey).subscribe({
    next: (badgeMap) => {
      badges = [...badgeMap.values()];
      loading = false;
    },
    error: (error: Error) => {
      console.error('Error loading badges:', error);
      loading = false;
    },
  });

  setTimeout(() => {
    loading = false;
  }, 3000);
}

async function handleSubmit(e: Event) {
  e.preventDefault();

  if (!$authStore.isLoggedIn || !$authStore.pubkey) {
    message = $t('loginRequired');
    messageType = 'error';
    return;
  }

  if (!selectedBadge) {
    message = 'Please select a badge';
    messageType = 'error';
    return;
  }

  if (!isValidNpub(recipientNpub)) {
    message = 'Invalid npub format';
    messageType = 'error';
    return;
  }

  submitting = true;
  message = '';

  try {
    // Convert npub to hex
    const recipientHex = npubToHex(recipientNpub);

    // Create badge award event (kind 8)
    const event: NostrEvent = {
      created_at: Math.floor(Date.now() / 1000),
      kind: 8,
      tags: [
        ['a', `30009:${$authStore.pubkey}:${selectedBadge}`],
        ['p', recipientHex],
      ],
      content: '',
    };

    // Sign with NIP-07
    const signedEvent = await window.nostr!.signEvent(event);

    // Publish to relays
    await publishEvent(signedEvent);

    message = $t('badgeAwarded');
    messageType = 'success';

    // Reset form
    recipientNpub = '';
  } catch (error) {
    message = error instanceof Error ? error.message : 'Failed to award badge';
    messageType = 'error';
  } finally {
    submitting = false;
  }
}
</script>

<div class="max-w-2xl">
  {#if !$authStore.isLoggedIn}
    <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <p class="text-yellow-800">{$t('pleaseLoginFirst')}</p>
    </div>
  {:else if loading}
    <p class="text-gray-600">Loading badges...</p>
  {:else if badges.length === 0}
    <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-blue-800">{$t('noBadgesFound')}</p>
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="space-y-6">
      <div>
        <label for="badge" class="block mb-2 font-medium text-gray-700">
          {$t('selectBadge')} *
        </label>
        <select 
          id="badge" 
          bind:value={selectedBadge} 
          required
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">-- Select --</option>
          {#each badges as badge}
            <option value={badge.dTag}>
              {badge.name} ({badge.dTag})
            </option>
          {/each}
        </select>
      </div>

      {#if selectedBadgeDetails}
        <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 class="font-medium text-gray-900 mb-3">Selected Badge Details</h4>
          <div class="flex flex-col md:flex-row gap-4">
            {#if selectedBadgeDetails.imageUrl}
              <div class="flex-shrink-0">
                <img
                  src={selectedBadgeDetails.thumbnails.s || selectedBadgeDetails.thumbnails.xs || selectedBadgeDetails.imageUrl}
                  alt={selectedBadgeDetails.name}
                  class="w-24 h-24 md:w-32 md:h-32 object-cover rounded-md border border-gray-300"
                />
              </div>
            {/if}
            <div class="flex-1">
              <h5 class="font-semibold text-gray-900 text-lg mb-2">{selectedBadgeDetails.name}</h5>
              <p class="text-gray-700 text-sm mb-2">{selectedBadgeDetails.description}</p>
              <p class="text-gray-600 text-xs font-mono">ID: {selectedBadgeDetails.dTag}</p>
            </div>
          </div>
        </div>
      {/if}

      <div>
        <label for="recipient" class="block mb-2 font-medium text-gray-700">
          {$t('recipientNpub')} *
        </label>
        <input
          id="recipient"
          type="text"
          bind:value={recipientNpub}
          placeholder={$t('recipientNpubPlaceholder')}
          required
          pattern="npub1[a-z0-9]+"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
        />
      </div>

      <button 
        type="submit" 
        disabled={submitting || !$authStore.isLoggedIn}
        class="w-full md:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium"
      >
        {submitting ? '...' : $t('awardBadgeButton')}
      </button>

      {#if message}
        <div class="p-4 rounded-md {messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}">
          {message}
        </div>
      {/if}
    </form>
  {/if}
</div>
