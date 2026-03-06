<script lang="ts">
import { searchBadgesByDTag, getUserProfiles, waitForConnection } from '../services/nostr';
import ProgressiveImage from './ProgressiveImage.svelte';
import { t } from '../stores/i18n';
import { parseBadgeEvent, type BadgeDefinition } from '../utils/badgeEventParser';
import { hexToNpub } from '../utils/npubConverter';
import { parseUserProfile, type UserProfile } from '../utils/userProfileParser';
import type { NostrEvent } from '../../types/nostr';

let { dTag }: { dTag: string } = $props();

interface BadgeResult extends BadgeDefinition {
  pubkey: string;
}

let results: BadgeResult[] = $state([]);
let loading = $state(true);
let profiles: Map<string, UserProfile> = $state(new Map());

// Fetch badge definitions matching dTag
$effect(() => {
  let cancelled = false;
  results = [];
  loading = true;
  profiles = new Map();

  const { observable, req, filters } = searchBadgesByDTag(dTag);
  const seen = new Map<string, BadgeResult>();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const subscription = observable.subscribe({
    next: (packet) => {
      if (cancelled) return;
      const event = packet.event as NostrEvent;
      const pubkey = event.pubkey ?? '';
      if (!pubkey) return;
      const parsed = parseBadgeEvent(event);
      const key = `${pubkey}:${parsed.dTag}`;
      seen.set(key, { ...parsed, pubkey });
    },
    complete: () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      results = [...seen.values()];
      loading = false;
      fetchProfiles([...seen.values()].map((r) => r.pubkey));
    },
    error: () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      results = [...seen.values()];
      loading = false;
    },
  });

  waitForConnection().then(() => {
    if (cancelled) return;
    timeoutId = setTimeout(() => {
      results = [...seen.values()];
      loading = false;
      fetchProfiles([...seen.values()].map((r) => r.pubkey));
    }, 5000);
    req.emit(filters);
  });

  function fetchProfiles(pubkeys: string[]) {
    if (pubkeys.length === 0) return;
    const unique = [...new Set(pubkeys)];
    const { observable: profObs, req: profReq, filters: profFilters } = getUserProfiles(unique);

    profObs.subscribe({
      next: (packet) => {
        if (cancelled) return;
        const parsed = parseUserProfile(packet.event as NostrEvent);
        profiles = new Map(profiles).set(parsed.pubkey, parsed);
      },
    });

    waitForConnection().then(() => {
      if (!cancelled) profReq.emit(profFilters);
    });
  }

  return () => {
    cancelled = true;
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
});

function shortNpub(npub: string): string {
  return `${npub.slice(0, 12)}...${npub.slice(-6)}`;
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

  <h2 class="text-xl font-bold text-gray-900 mb-4">
    {$t('searchResults')}: <span class="font-mono text-orange-600">{dTag}</span>
  </h2>

  {#if loading}
    <div class="text-center py-8 text-gray-500">{$t('searchingBadges')}</div>
  {:else if results.length === 0}
    <div class="text-center py-8 text-gray-500">{$t('noSearchResults')}</div>
  {:else}
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {#each results as badge (`${badge.pubkey}:${badge.dTag}`)}
        {@const npub = hexToNpub(badge.pubkey)}
        {@const profile = profiles.get(badge.pubkey)}
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
          <p class="text-xs text-gray-400 mt-1 truncate">
            {profile?.displayName || profile?.name || shortNpub(npub)}
          </p>
        </a>
      {/each}
    </div>
  {/if}
</div>
