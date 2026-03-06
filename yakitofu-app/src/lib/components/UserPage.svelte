<script lang="ts">
import { getUserBadgeDefinitions, getUserProfiles, waitForConnection } from '../services/nostr';
import { getCachedProfiles, setCachedProfile } from '../services/indexedDbCache';
import ProgressiveImage from './ProgressiveImage.svelte';
import { t } from '../stores/i18n';
import { parseBadgeEvent, type BadgeDefinition } from '../utils/badgeEventParser';
import { hexToNpub } from '../utils/npubConverter';
import { parseUserProfile, type UserProfile } from '../utils/userProfileParser';

let { pubkey }: { pubkey: string } = $props();

let badges: BadgeDefinition[] = $state([]);
let loadingBadges = $state(true);
let profile: UserProfile | null = $state(null);
let loadingProfile = $state(true);

let npub = $derived(hexToNpub(pubkey));

// Fetch user profile
$effect(() => {
  let cancelled = false;
  profile = null;
  loadingProfile = true;

  // Try IndexedDB cache first
  getCachedProfiles([pubkey])
    .then((cached) => {
      if (cancelled) return;
      const cachedProfile = cached.get(pubkey);
      if (cachedProfile) {
        profile = cachedProfile;
        loadingProfile = false;
      }
    })
    .catch(console.error);

  const { observable, req, filters } = getUserProfiles([pubkey]);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const subscription = observable.subscribe({
    next: (packet) => {
      if (cancelled) return;
      const parsed = parseUserProfile(packet.event);
      if (parsed.pubkey === pubkey) {
        profile = parsed;
        loadingProfile = false;
        setCachedProfile(parsed).catch(console.error);
      }
    },
    complete: () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      loadingProfile = false;
    },
    error: () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      loadingProfile = false;
    },
  });

  waitForConnection().then(() => {
    if (cancelled) return;
    timeoutId = setTimeout(() => {
      loadingProfile = false;
    }, 5000);
    req.emit(filters);
  });

  return () => {
    cancelled = true;
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
});

// Fetch user's badge definitions
$effect(() => {
  let cancelled = false;
  badges = [];
  loadingBadges = true;

  const { observable, req, filters } = getUserBadgeDefinitions(pubkey);
  const seen = new Map<string, BadgeDefinition>();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const subscription = observable.subscribe({
    next: (packet) => {
      if (cancelled) return;
      const event = packet.event;
      if (event.pubkey !== pubkey) return;
      const parsed = parseBadgeEvent(event);
      seen.set(parsed.dTag, parsed);
    },
    complete: () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      badges = [...seen.values()];
      loadingBadges = false;
    },
    error: () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      badges = [...seen.values()];
      loadingBadges = false;
    },
  });

  waitForConnection().then(() => {
    if (cancelled) return;
    timeoutId = setTimeout(() => {
      badges = [...seen.values()];
      loadingBadges = false;
    }, 5000);
    req.emit(filters);
  });

  return () => {
    cancelled = true;
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
});

function shortNpub(n: string): string {
  return `${n.slice(0, 12)}...${n.slice(-6)}`;
}
</script>

<div class="max-w-2xl mx-auto">
  <!-- Back button -->
  <button
    class="mb-6 flex items-center gap-2 text-orange-500 hover:text-orange-600 transition-colors font-medium"
    onclick={() => (window.location.hash = '')}
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    {$t('backToApp')}
  </button>

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
        <img
          src={profile.picture}
          alt={profile.displayName || profile.name || ''}
          class="w-20 h-20 rounded-full object-cover mx-auto mb-3"
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
            href="#/badge/{npub}:{badge.dTag}"
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
