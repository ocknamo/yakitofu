<script lang="ts">
import { getBadgeAwardees, getBadgeDefinition, getUserProfiles, waitForConnection } from '../services/nostr';
import {
  getCachedBadgeDefinition,
  getCachedProfiles,
  setCachedBadgeDefinition,
  setCachedProfile,
} from '../services/indexedDbCache';
import ProgressiveImage from './ProgressiveImage.svelte';
import { languageStore, t } from '../stores/i18n';
import { parseBadgeEvent, type BadgeDefinition } from '../utils/badgeEventParser';
import { hexToNpub } from '../utils/npubConverter';
import { parseUserProfile, type UserProfile } from '../utils/userProfileParser';

let { pubkey, dTag }: { pubkey: string; dTag: string } = $props();

interface AwardeeEntry {
  pubkey: string;
  createdAt: number;
  profile: UserProfile | null;
}

// Module-scoped profile cache to avoid re-fetching within a session
const profileCache = new Map<string, UserProfile>();

let badge: BadgeDefinition | null = $state(null);
let loadingBadge = $state(true);
let badgeError = $state('');
let awardees: AwardeeEntry[] = $state([]);
let loadingAwardees = $state(true);
let linkCopied = $state(false);

let sortedAwardees = $derived([...awardees].sort((a, b) => b.createdAt - a.createdAt));

let shareUrl = $derived(
  `${window.location.origin}${window.location.pathname}#/badge/${hexToNpub(pubkey)}:${dTag}`,
);

async function fetchProfiles(pubkeys: string[]) {
  const uncachedPubkeys = pubkeys.filter((pk) => !profileCache.has(pk));

  if (uncachedPubkeys.length === 0) {
    awardees = awardees.map((a) => ({ ...a, profile: profileCache.get(a.pubkey) ?? null }));
    return;
  }

  // IndexedDB キャッシュから取得してインメモリに昇格
  const idbCached = await getCachedProfiles(uncachedPubkeys).catch(() => new Map<string, UserProfile>());
  for (const [pk, profile] of idbCached) {
    profileCache.set(pk, profile);
  }
  awardees = awardees.map((a) => ({ ...a, profile: profileCache.get(a.pubkey) ?? null }));

  const stillUncached = uncachedPubkeys.filter((pk) => !profileCache.has(pk));
  if (stillUncached.length === 0) return;

  const { observable, req, filters } = getUserProfiles(stillUncached);

  const timeoutId = setTimeout(() => {
    req.emit(filters);
  }, 0);

  await new Promise<void>((resolve) => {
    const timeoutResolve = setTimeout(resolve, 3000);

    observable.subscribe({
      next: (packet) => {
        const profile = parseUserProfile(packet.event);
        profileCache.set(profile.pubkey, profile);
        setCachedProfile(profile).catch(console.error);
      },
      error: () => {
        clearTimeout(timeoutResolve);
        resolve();
      },
      complete: () => {
        clearTimeout(timeoutResolve);
        resolve();
      },
    });

    req.emit(filters);
    clearTimeout(timeoutId);
  });

  awardees = awardees.map((a) => ({ ...a, profile: profileCache.get(a.pubkey) ?? null }));
}

// Fetch badge definition
$effect(() => {
  let cancelled = false;
  // badge をリセットしない — 遷移中も古いコンテンツを表示してちらつきを防ぐ
  // 未発見確定時（タイムアウト・エラー）にのみ null にする
  loadingBadge = true;
  badgeError = '';

  const { observable, req, filters } = getBadgeDefinition(pubkey, dTag);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  // このeffect実行でバッジが見つかったかを追跡
  let foundBadge = false;

  // IndexedDB キャッシュを先に確認して即表示
  getCachedBadgeDefinition(pubkey, dTag)
    .then((cached) => {
      if (cancelled) return;
      if (cached) {
        badge = cached;
        loadingBadge = false;
        foundBadge = true;
      }
    })
    .catch(console.error);

  const subscription = observable.subscribe({
    next: (packet) => {
      if (cancelled) return;
      const event = packet.event;
      // Client-side validation: ensure pubkey and dTag match
      if (event.pubkey !== pubkey) return;
      const eventDTag = event.tags.find((tag: string[]) => tag[0] === 'd')?.[1];
      if (eventDTag !== dTag) return;

      const parsed = parseBadgeEvent(event);
      setCachedBadgeDefinition(pubkey, parsed).catch(console.error);
      // 同一イベントがリレーから返ってきた場合は再レンダリングをスキップ（ちらつき防止）
      if (!badge || badge.id !== parsed.id) {
        badge = parsed;
      }
      loadingBadge = false;
      foundBadge = true;
      clearTimeout(timeoutId);
    },
    error: () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      loadingBadge = false;
      if (!foundBadge) {
        badge = null;
        badgeError = $t('badgeNotFound');
      }
    },
    complete: () => {
      if (cancelled) return;
      // バッジが見つかった場合のみタイムアウトをキャンセルして終了
      // 見つかっていない場合はタイムアウトに判定を委ねる（EOSEが早期に来た可能性）
      if (foundBadge) {
        clearTimeout(timeoutId);
        loadingBadge = false;
      }
    },
  });

  // リレー接続を待ってからリクエストを送信する
  waitForConnection().then(() => {
    if (cancelled) return;
    timeoutId = setTimeout(() => {
      loadingBadge = false;
      if (!foundBadge) {
        badge = null;
        badgeError = $t('badgeNotFound');
      }
    }, 5000);
    req.emit(filters);
  });

  return () => {
    cancelled = true;
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
});

// Fetch badge awardees
$effect(() => {
  let cancelled = false;
  awardees = [];
  loadingAwardees = true;

  const { observable, req, filters } = getBadgeAwardees(pubkey, dTag);
  const seen = new Map<string, number>();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  function commitAwardees() {
    loadingAwardees = false;
    const entries: AwardeeEntry[] = [...seen.entries()].map(([pk, createdAt]) => ({
      pubkey: pk,
      createdAt,
      profile: profileCache.get(pk) ?? null,
    }));
    awardees = entries;
    if (entries.length > 0) fetchProfiles(entries.map((e) => e.pubkey));
  }

  const subscription = observable.subscribe({
    next: (packet) => {
      const event = packet.event;
      const awardee = event.pubkey;
      if (!awardee) return;

      // Extract all p-tag pubkeys from the award event
      const pTags = event.tags.filter((tag: string[]) => tag[0] === 'p').map((tag: string[]) => tag[1]);

      for (const pk of pTags) {
        const existing = seen.get(pk);
        if (!existing || event.created_at > existing) {
          seen.set(pk, event.created_at);
        }
      }
    },
    error: () => {
      clearTimeout(timeoutId);
      loadingAwardees = false;
    },
    complete: () => {
      // 受賞者が見つかった場合のみ早期コミット
      // 見つかっていない場合はタイムアウトに委ねる（EOSEが早期に来た可能性）
      if (seen.size > 0) {
        clearTimeout(timeoutId);
        commitAwardees();
      }
    },
  });

  // リレー接続を待ってからリクエストを送信する
  waitForConnection().then(() => {
    if (cancelled) return;
    timeoutId = setTimeout(() => {
      commitAwardees();
    }, 5000);
    req.emit(filters);
  });

  return () => {
    cancelled = true;
    subscription.unsubscribe();
    clearTimeout(timeoutId);
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

  {#if badge}
    <!-- Badge info -->
    <div class="mb-8">
      <!-- Badge image -->
      <div class="flex justify-center mb-6">
        {#if badge.imageUrl}
          <ProgressiveImage
            src={badge.imageUrl}
            placeholderSrc={badge.thumbnails.xs || badge.thumbnails.s || badge.thumbnails.m || ''}
            alt={badge.name}
            class="w-72 h-72 rounded-lg"
          />
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
          <span class="font-mono truncate" title={badge.dTag}>{badge.dTag.length > 40 ? badge.dTag.slice(0, 40) + '...' : badge.dTag}</span>
        </div>
        <div class="flex gap-2 flex-wrap">
          <span class="font-medium text-gray-700">{$t('badgeCreator')}:</span>
          <span class="font-mono text-xs break-all">{shortNpub(hexToNpub(pubkey))}</span>
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
                <img
                  src={entry.profile.picture}
                  alt={getDisplayName(entry)}
                  class="w-10 h-10 rounded-full object-cover shrink-0"
                />
              {:else}
                <div
                  class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold shrink-0"
                >
                  {getInitial(entry)}
                </div>
              {/if}

              <!-- User info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">{getDisplayName(entry)}</p>
                <p class="text-xs text-gray-400 font-mono truncate">{shortNpub(hexToNpub(entry.pubkey))}</p>
              </div>

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
