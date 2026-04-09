<script lang="ts">
import type { ReceivedBadge } from '../services/badgeAwardResolver';
import type { BadgeDefinitionWithPubkey } from '../services/badgeDefinitionResolver';
import { publishEvent } from '../services/nostr';
import { invalidateProfileBadgesCache } from '../services/profileBadgesResolver';
import { t } from '../stores/i18n';
import { hexToNpub } from '../utils/npubConverter';

let {
  receivedBadges,
  currentProfileBadges,
  pubkey,
  onSaved,
}: {
  receivedBadges: ReceivedBadge[];
  currentProfileBadges: BadgeDefinitionWithPubkey[] | null;
  pubkey: string;
  onSaved?: () => void;
} = $props();

// Build initial selection from currentProfileBadges
// Ordered list of selected badges (preserves order from currentProfileBadges)
let selected: ReceivedBadge[] = $state(
  (() => {
    // Start with currently-selected badges in their saved order
    const ordered: ReceivedBadge[] = [];
    for (const pb of currentProfileBadges ?? []) {
      const match = receivedBadges.find((rb) => rb.pubkey === pb.pubkey && rb.dTag === pb.dTag);
      if (match) ordered.push(match);
    }
    return ordered;
  })()
);

let saving = $state(false);
let saveError = $state('');
let saveSuccess = $state(false);

function isSelected(badge: ReceivedBadge): boolean {
  return selected.some((b) => b.pubkey === badge.pubkey && b.dTag === badge.dTag);
}

function toggleBadge(badge: ReceivedBadge): void {
  if (isSelected(badge)) {
    selected = selected.filter((b) => !(b.pubkey === badge.pubkey && b.dTag === badge.dTag));
  } else {
    selected = [...selected, badge];
  }
}

function moveUp(index: number): void {
  if (index === 0) return;
  const next = [...selected];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  selected = next;
}

function moveDown(index: number): void {
  if (index === selected.length - 1) return;
  const next = [...selected];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  selected = next;
}

async function save(): Promise<void> {
  if (!window.nostr) return;

  saving = true;
  saveError = '';
  saveSuccess = false;

  try {
    // Capture timestamp once so both events share the same created_at.
    // If Date.now() were called again after await publishEvent(), the tombstone
    // could get a later timestamp and be mistakenly picked as "newest".
    const now = Math.floor(Date.now() / 1000);

    // Build kind 10008 tags: ordered pairs of a/e for each selected badge
    const tags: string[][] = [];
    for (const badge of selected) {
      tags.push(['a', `30009:${badge.pubkey}:${badge.dTag}`]);
      tags.push(['e', badge.awardEventId]);
    }

    const event10008 = {
      kind: 10008,
      created_at: now,
      tags,
      content: '',
    };

    const signed10008 = await window.nostr.signEvent(event10008);
    await publishEvent(signed10008);

    // Tombstone old kind 30008 (d=profile_badges) to help relays clean up legacy data.
    // Reuse same created_at to prevent the tombstone from being picked as "newest".
    const event30008 = {
      kind: 30008,
      created_at: now,
      tags: [['d', 'profile_badges']],
      content: '',
    };
    const signed30008 = await window.nostr.signEvent(event30008);
    await publishEvent(signed30008);

    // Invalidate cache so UserPage refetches the updated kind 10008
    invalidateProfileBadgesCache(pubkey);

    saveSuccess = true;
    onSaved?.();
  } catch (err) {
    saveError = $t('profileBadgesUpdateFailed');
    console.error('[ProfileBadgesManager] save error', err);
  } finally {
    saving = false;
  }
}
</script>

<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
  {#if saveSuccess}
    <p class="text-sm text-green-600 mb-3">{$t('profileBadgesUpdated')}</p>
  {/if}
  {#if saveError}
    <p class="text-sm text-red-600 mb-3">{saveError}</p>
  {/if}

  <!-- Selected badges in order -->
  {#if selected.length > 0}
    <div class="mb-4">
      <p class="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
        {$t('profileBadges')} ({selected.length})
      </p>
      <ul class="space-y-1">
        {#each selected as badge, i (`${badge.pubkey}:${badge.dTag}`)}
          <li class="flex items-center gap-2 bg-white border border-gray-200 rounded px-3 py-1.5">
            {#if badge.thumbnails.xs || badge.thumbnails.s || badge.thumbnails.m || badge.imageUrl}
              <img
                src={badge.thumbnails.xs || badge.thumbnails.s || badge.thumbnails.m || badge.imageUrl}
                alt={badge.name}
                class="w-6 h-6 rounded-full object-cover shrink-0"
              />
            {:else}
              <span class="text-base shrink-0">📛</span>
            {/if}
            <span class="text-sm text-gray-800 flex-1 truncate">{badge.name}</span>
            <div class="flex items-center gap-1 shrink-0">
              <button
                onclick={() => moveUp(i)}
                disabled={i === 0}
                aria-label={$t('moveUp')}
                class="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
              >▲</button>
              <button
                onclick={() => moveDown(i)}
                disabled={i === selected.length - 1}
                aria-label={$t('moveDown')}
                class="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
              >▼</button>
              <button
                onclick={() => toggleBadge(badge)}
                class="text-gray-400 hover:text-red-500 p-0.5 ml-1"
                aria-label="Remove"
              >✕</button>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- All received badges (as toggleable checkboxes) -->
  {#if receivedBadges.length > 0}
    <p class="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
      {$t('receivedBadges')}
    </p>
    <div class="flex flex-wrap gap-2 mb-4">
      {#each receivedBadges as badge (`${badge.pubkey}:${badge.dTag}`)}
        {@const sel = isSelected(badge)}
        <button
          onclick={() => toggleBadge(badge)}
          title={badge.name}
          class="w-10 h-10 rounded-full overflow-hidden border-2 transition-all {sel
            ? 'border-orange-400 ring-2 ring-orange-200'
            : 'border-gray-200 opacity-50 hover:opacity-80'}"
        >
          {#if badge.thumbnails.m || badge.thumbnails.s || badge.thumbnails.xs || badge.imageUrl}
            <img
              src={badge.thumbnails.m || badge.thumbnails.s || badge.thumbnails.xs || badge.imageUrl}
              alt={badge.name}
              class="w-full h-full object-cover"
            />
          {:else}
            <span class="text-lg">📛</span>
          {/if}
        </button>
      {/each}
    </div>
  {:else}
    <p class="text-sm text-gray-500 mb-4">{$t('noReceivedBadges')}</p>
  {/if}

  <button
    onclick={save}
    disabled={saving}
    class="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
  >
    {saving ? '...' : $t('saveProfileBadges')}
  </button>
</div>
