<script lang="ts">
import { resolveBadgeDefinitionsByPubkey, type BadgeDefinitionWithPubkey } from '../services/badgeDefinitionResolver';
import { resolveReceivedBadges } from '../services/badgeAwardResolver';
import { resolveProfiles } from '../services/profileResolver';
import ProfileAvatar from './ProfileAvatar.svelte';
import ProgressiveImage from './ProgressiveImage.svelte';
import { t } from '../stores/i18n';
import type { BadgeDefinition } from '../utils/badgeEventParser';
import { hexToNpub } from '../utils/npubConverter';
import type { UserProfile } from '../utils/userProfileParser';

let { pubkey }: { pubkey: string } = $props();

let badges: BadgeDefinition[] = $state([]);
let loadingBadges = $state(true);
let receivedBadges: BadgeDefinitionWithPubkey[] = $state([]);
let loadingReceivedBadges = $state(true);
let profile: UserProfile | null = $state(null);
let loadingProfile = $state(true);

let npub = $derived(hexToNpub(pubkey));

// Fetch user profile
$effect(() => {
  profile = null;
  loadingProfile = true;

  const timeoutId = setTimeout(() => {
    loadingProfile = false;
  }, 5000);

  const subscription = resolveProfiles([pubkey]).subscribe({
    next: (profiles) => {
      const p = profiles.get(pubkey);
      if (p) {
        profile = p;
        loadingProfile = false;
      }
    },
    error: () => {
      loadingProfile = false;
    },
  });

  return () => {
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
});

// Fetch badges received by this user
$effect(() => {
  receivedBadges = [];
  loadingReceivedBadges = true;

  const timeoutId = setTimeout(() => {
    loadingReceivedBadges = false;
  }, 40 * 1000);

  const subscription = resolveReceivedBadges(pubkey).subscribe({
    next: (b) => {
      receivedBadges = b;
      if(b.length > 0) {
        loadingReceivedBadges = false;
        clearTimeout(timeoutId);
      }
    },
    complete: () => {
      loadingReceivedBadges = false;
      clearTimeout(timeoutId);
    },
    error: () => {
      loadingReceivedBadges = false;
    },
  });

  return () => {
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
});

// Fetch user's badge definitions
$effect(() => {
  badges = [];
  loadingBadges = true;

  const timeoutId = setTimeout(() => {
    loadingBadges = false;
  }, 5000);

  const subscription = resolveBadgeDefinitionsByPubkey(pubkey).subscribe({
    next: (badgeMap) => {
      badges = [...badgeMap.values()];
      loadingBadges = false;
      clearTimeout(timeoutId);
    },
    error: () => {
      loadingBadges = false;
    },
  });

  return () => {
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
});

function shortNpub(n: string): string {
  return `${n.slice(0, 12)}...${n.slice(-6)}`;
}
</script>

<div class="max-w-2xl mx-auto">
  <!-- User profile -->
  <div class="mb-8 text-center">
    {#if loadingProfile && !profile}
      <div class="animate-pulse flex flex-col items-center gap-3">
        <div class="w-20 h-20 rounded-full bg-gray-200"></div>
        <div class="h-6 w-40 bg-gray-200 rounded"></div>
        <div class="h-4 w-56 bg-gray-200 rounded"></div>
      </div>
    {:else}
      {#if profile?.picture}
        <ProfileAvatar
          src={profile.picture}
          alt={profile.displayName || profile.name || ''}
          class="w-20 h-20 mx-auto mb-3"
        />
      {:else}
        <div
          class="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-3xl font-semibold mx-auto mb-3"
        >
          {profile?.displayName?.charAt(0).toUpperCase() || profile?.name?.charAt(0).toUpperCase() || '?'}
        </div>
      {/if}
      <h2 class="text-xl font-bold text-gray-900">
        {profile?.displayName || profile?.name || shortNpub(npub)}
      </h2>
      <p class="text-xs text-gray-400 font-mono mt-1">{shortNpub(npub)}</p>
    {/if}
  </div>

  <!-- Received badges section -->
  <div class="mb-8">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">{$t('receivedBadges')}</h3>

    {#if loadingReceivedBadges}
      <div class="flex flex-wrap gap-3">
        {#each Array(4) as _}
          <div class="w-14 h-14 rounded-full bg-gray-200 animate-pulse"></div>
        {/each}
      </div>
    {:else if receivedBadges.length === 0}
      <p class="text-sm text-gray-500">{$t('noReceivedBadges')}</p>
    {:else}
      <div class="flex flex-wrap gap-3">
        {#each receivedBadges as badge (`${badge.pubkey}:${badge.dTag}`)}
          <a
            href="#/badge/{hexToNpub(badge.pubkey)}:{encodeURIComponent(badge.dTag)}"
            title={badge.name}
            class="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200 hover:border-orange-300 transition-colors flex-shrink-0 bg-gray-50"
          >
            {#if badge.thumbnails.s || badge.thumbnails.xs || badge.imageUrl}
              <img
                src={badge.thumbnails.s || badge.thumbnails.xs || badge.imageUrl}
                alt={badge.name}
                class="w-full h-full object-cover"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center text-xl">📛</div>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Badges section -->
  <div>
    <h3 class="text-lg font-semibold text-gray-900 mb-4">{$t('userBadges')}</h3>

    {#if loadingBadges}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {#each Array(3) as _}
          <div class="animate-pulse">
            <div class="aspect-square bg-gray-200 rounded-lg mb-2"></div>
            <div class="h-4 w-3/4 bg-gray-200 rounded mb-1"></div>
            <div class="h-3 w-full bg-gray-200 rounded"></div>
          </div>
        {/each}
      </div>
    {:else if badges.length === 0}
      <div class="text-center py-8 text-gray-500">{$t('noBadgesCreated')}</div>
    {:else}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {#each badges as badge (badge.dTag)}
          <a
            href="#/badge/{npub}:{encodeURIComponent(badge.dTag)}"
            class="block rounded-lg border border-gray-200 p-3 hover:border-orange-300 hover:shadow-sm transition-all"
          >
            <div class="aspect-square mb-2 rounded-lg overflow-hidden bg-gray-50">
              {#if badge.imageUrl}
                <ProgressiveImage
                  src={badge.thumbnails.l || badge.thumbnails.xl || badge.imageUrl}
                  placeholderSrc={badge.thumbnails.xs || badge.thumbnails.s || ''}
                  alt={badge.name}
                  class="w-full h-full"
                />
              {:else}
                <div class="w-full h-full flex items-center justify-center text-4xl">
                  📛
                </div>
              {/if}
            </div>
            <p class="font-medium text-gray-900 text-sm truncate">{badge.name}</p>
            {#if badge.description}
              <p class="text-xs text-gray-500 truncate">{badge.description}</p>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
