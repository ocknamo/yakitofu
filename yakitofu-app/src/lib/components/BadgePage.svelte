<script lang="ts">
import { resolveBadgeDefinition } from '../services/badgeDefinitionResolver';
import { resolveBadgeAwardees } from '../services/badgeAwardeeResolver';
import { resolveProfiles } from '../services/profileResolver';
import ProfileAvatar from './ProfileAvatar.svelte';
import ProgressiveImage from './ProgressiveImage.svelte';
import ImageModal from './ImageModal.svelte';
import { languageStore, t } from '../stores/i18n';
import type { BadgeDefinition } from '../utils/badgeEventParser';
import { hexToNpub } from '../utils/npubConverter';
import type { UserProfile } from '../utils/userProfileParser';
import type { Subscription } from 'rxjs';

let { pubkey, dTag }: { pubkey: string; dTag: string } = $props();

interface AwardeeEntry {
  pubkey: string;
  createdAt: number;
  profile: UserProfile | null;
}

let profileSubscription: Subscription | null = null;
const profileCache = new Map<string, UserProfile>();

let badge: BadgeDefinition | null = $state(null);
let loadingBadge = $state(true);
let badgeError = $state('');
let awardees: AwardeeEntry[] = $state([]);
let loadingAwardees = $state(true);
let linkCopied = $state(false);
let showImageModal = $state(false);

function openImageModal() {
  if (badge?.imageUrl) {
    showImageModal = true;
  }
}

function closeImageModal() {
  showImageModal = false;
}

let sortedAwardees = $derived([...awardees].sort((a, b) => b.createdAt - a.createdAt));

let shareUrl = $derived(
  `${window.location.origin}${window.location.pathname}#/badge/${hexToNpub(pubkey)}:${dTag}`,
);

function fetchProfiles(pubkeys: string[]) {
  if (profileSubscription) profileSubscription.unsubscribe();

  profileSubscription = resolveProfiles(pubkeys).subscribe((profiles) => {
    // Check if any profiles actually changed
    let changed = false;
    for (const [pk, profile] of profiles) {
      const existing = profileCache.get(pk);
      if (!existing || existing.createdAt !== profile.createdAt) {
        profileCache.set(pk, profile);
        changed = true;
      }
    }
    
    // Only update awardees if profiles actually changed
    if (changed) {
      const updated = awardees.map((a) => ({ ...a, profile: profileCache.get(a.pubkey) ?? null }));
      awardees = updated;
    }
  });
}

// Fetch badge definition
$effect(() => {
  loadingBadge = true;
  badgeError = '';
  let foundBadge = false;

  const timeoutId = setTimeout(() => {
    loadingBadge = false;
    if (!foundBadge) {
      badge = null;
      badgeError = $t('badgeNotFound');
    }
  }, 8000);

  const subscription = resolveBadgeDefinition(pubkey, dTag).subscribe({
    next: (resolved) => {
      if (resolved) {
        badge = resolved;
        loadingBadge = false;
        foundBadge = true;
        clearTimeout(timeoutId);
      }
    },
    error: () => {
      clearTimeout(timeoutId);
      loadingBadge = false;
      if (!foundBadge) {
        badge = null;
        badgeError = $t('badgeNotFound');
      }
    },
  });

  return () => {
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
});

// Fetch badge awardees
$effect(() => {
  loadingAwardees = true;
  awardees = [];

  const subscription = resolveBadgeAwardees(pubkey, dTag).subscribe({
    next: (awardeeMap) => {
      loadingAwardees = false;
      const entries: AwardeeEntry[] = [...awardeeMap.entries()].map(([pk, createdAt]) => ({
        pubkey: pk,
        createdAt,
        profile: profileCache.get(pk) ?? null,
      }));
      awardees = entries;
      if (entries.length > 0) fetchProfiles(entries.map((e) => e.pubkey));
    },
    error: (err) => {
      console.error('Error fetching awardees:', err);
      loadingAwardees = false;
    },
  });

  return () => {
    subscription.unsubscribe();
    if (profileSubscription) profileSubscription.unsubscribe();
  };
});

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat($languageStore, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp * 1000));
}

function shortNpub(npub: string): string {
  return `${npub.slice(0, 12)}...${npub.slice(-6)}`;
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl);
    linkCopied = true;
    setTimeout(() => {
      linkCopied = false;
    }, 2000);
  } catch {
    // Clipboard not available
  }
}

function getDisplayName(entry: AwardeeEntry): string {
  if (!entry.profile) return $t('unknownUser');
  return entry.profile.displayName || entry.profile.name || $t('unknownUser');
}

function getInitial(entry: AwardeeEntry): string {
  const name = getDisplayName(entry);
  if (name === $t('unknownUser')) return '?';
  return name.charAt(0).toUpperCase();
}
</script>

<div class="max-w-2xl mx-auto">
  {#if badge}
    <!-- Badge info -->
    <div class="mb-8">
      <!-- Badge image -->
      <div class="flex justify-center mb-6">
        {#if badge.imageUrl}
          <button
            type="button"
            class="cursor-pointer bg-transparent border-0 p-0"
            onclick={openImageModal}
            aria-label="View larger image"
          >
            <ProgressiveImage
              src={badge.imageUrl}
              placeholderSrc={badge.thumbnails.xs || badge.thumbnails.s || badge.thumbnails.m || ''}
              alt={badge.name}
              class="w-72 h-72 rounded-lg hover:opacity-90 transition-opacity"
            />
          </button>
        {:else}
          <div class="w-72 h-72 flex items-center justify-center text-8xl bg-gray-50 rounded-lg">
            📛
          </div>
        {/if}
      </div>

      <!-- Badge name and description -->
      <h2 class="text-2xl font-bold text-gray-900 text-center mb-2">{badge.name}</h2>
      {#if badge.description}
        <p class="text-gray-600 text-center mb-6">{badge.description}</p>
      {/if}

      <!-- Meta info -->
      <div class="w-72 mx-auto space-y-2 text-sm text-gray-500">
        <div class="flex gap-2">
          <span class="font-medium text-gray-700">ID:</span>
          {#if badge.dTag === ''}
            <span class="text-gray-400">{$t('noBadgeId')}</span>
          {:else}
            <span class="font-mono truncate" title={badge.dTag}>{badge.dTag.length > 40 ? badge.dTag.slice(0, 40) + '...' : badge.dTag}</span>
          {/if}
        </div>
        <div class="flex gap-2 flex-wrap items-baseline">
          <span class="font-medium text-gray-700">{$t('badgeCreator')}:</span>
          <a href="#/user/{hexToNpub(pubkey)}" class="font-mono text-xs break-all text-orange-500 hover:text-orange-600 transition-colors">{shortNpub(hexToNpub(pubkey))}</a>
        </div>
      </div>

      <!-- Copy link button -->
      <div class="mt-4 flex justify-center">
        <button
          class="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
          onclick={copyLink}
        >
          {#if linkCopied}
            <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {$t('linkCopied')}
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {$t('copyLink')}
          {/if}
        </button>
      </div>
    </div>

    <!-- Awardees section -->
    <div>
      <h3 class="text-lg font-semibold text-gray-900 mb-4">{$t('badgeAwardees')}</h3>

      {#if loadingAwardees}
        <ul class="divide-y divide-gray-100">
          {#each Array(3) as _}
            <li class="py-4 flex items-center gap-4 animate-pulse">
              <div class="w-10 h-10 rounded-full bg-gray-200 shrink-0"></div>
              <div class="flex-1 min-w-0 space-y-2">
                <div class="h-4 w-32 bg-gray-200 rounded"></div>
                <div class="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
              <div class="h-4 w-20 bg-gray-200 rounded shrink-0"></div>
            </li>
          {/each}
        </ul>
      {:else if sortedAwardees.length === 0}
        <div class="text-center py-8 text-gray-500">{$t('noAwardees')}</div>
      {:else}
        <ul class="divide-y divide-gray-100">
          {#each sortedAwardees as entry (entry.pubkey)}
            <li class="py-4 flex items-center gap-4">
              <!-- Avatar -->
              {#if entry.profile?.picture}
                <a href="#/user/{hexToNpub(entry.pubkey)}" class="shrink-0 hover:opacity-80 transition-opacity">
                  <ProfileAvatar
                    src={entry.profile.picture}
                    alt={getDisplayName(entry)}
                    class="w-10 h-10"
                  />
                </a>
              {:else}
                <a href="#/user/{hexToNpub(entry.pubkey)}" class="shrink-0 hover:opacity-80 transition-opacity">
                  <div
                    class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold"
                  >
                    {getInitial(entry)}
                  </div>
                </a>
              {/if}

              <!-- User info -->
              <a href="#/user/{hexToNpub(entry.pubkey)}" class="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <p class="font-medium text-gray-900 truncate">{getDisplayName(entry)}</p>
                <p class="text-xs text-gray-400 font-mono truncate">{shortNpub(hexToNpub(entry.pubkey))}</p>
              </a>

              <!-- Date -->
              <div class="text-sm text-gray-400 shrink-0">
                {formatDate(entry.createdAt)}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {:else if loadingBadge}
    <!-- Badge skeleton -->
    <div class="mb-8 animate-pulse">
      <div class="flex justify-center mb-6">
        <div class="w-72 h-72 bg-gray-200 rounded-lg"></div>
      </div>
      <div class="flex justify-center mb-2">
        <div class="h-8 w-48 bg-gray-200 rounded"></div>
      </div>
      <div class="flex justify-center mb-6">
        <div class="h-5 w-72 bg-gray-200 rounded"></div>
      </div>
      <div class="w-72 mx-auto space-y-2">
        <div class="h-4 w-32 bg-gray-200 rounded"></div>
        <div class="h-4 w-48 bg-gray-200 rounded"></div>
      </div>
      <div class="mt-4 flex justify-center">
        <div class="h-9 w-36 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
    <!-- Awardees skeleton -->
    <div>
      <div class="h-6 w-32 bg-gray-200 rounded mb-4 animate-pulse"></div>
      <ul class="divide-y divide-gray-100">
        {#each Array(3) as _}
          <li class="py-4 flex items-center gap-4 animate-pulse">
            <div class="w-10 h-10 rounded-full bg-gray-200 shrink-0"></div>
            <div class="flex-1 min-w-0 space-y-2">
              <div class="h-4 w-32 bg-gray-200 rounded"></div>
              <div class="h-3 w-24 bg-gray-200 rounded"></div>
            </div>
            <div class="h-4 w-20 bg-gray-200 rounded shrink-0"></div>
          </li>
        {/each}
      </ul>
    </div>
  {:else if badgeError}
    <div class="text-center py-12 text-gray-500">{badgeError}</div>
  {/if}
</div>

{#if showImageModal && badge?.imageUrl}
  <ImageModal src={badge.imageUrl} alt={badge.name} onClose={closeImageModal} />
{/if}
