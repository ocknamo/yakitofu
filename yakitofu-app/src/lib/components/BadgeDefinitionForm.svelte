<script lang="ts">
  import { onDestroy } from 'svelte';
  import { authStore } from '../stores/auth';
  import { t } from '../stores/i18n';
  import { isValidBadgeId, isValidUrl } from '../utils/validation';
  import { publishEvent } from '../services/nostr';
  import { resolveBadgeDefinitionsByPubkey } from '../services/badgeDefinitionResolver';
  import { type ImageSize } from '../utils/imageUtils';
  import type { BadgeDefinition } from '../utils/badgeEventParser';
  import { buildBadgeTags } from '../utils/badgeTagBuilder';
  import ImagePreview from './ImagePreview.svelte';
  import type { NostrEvent } from '../../types/nostr';
  import type { Subscription } from 'rxjs';

  let editMode = $state(false);
  let badges: BadgeDefinition[] = $state([]);
  let selectedBadgeForEdit = $state('');
  let loadingBadges = $state(false);
  
  let badgeId = $state('');
  let badgeName = $state('');
  let description = $state('');
  let imageUrl = $state('');
  let thumbnailXlUrl = $state('');
  let thumbnailLUrl = $state('');
  let thumbnailMUrl = $state('');
  let thumbnailSUrl = $state('');
  let thumbnailXsUrl = $state('');
  let mainImageSize = $state<ImageSize | null>(null);
  let thumbnailXlSize = $state<ImageSize | null>(null);
  let thumbnailLSize = $state<ImageSize | null>(null);
  let thumbnailMSize = $state<ImageSize | null>(null);
  let thumbnailSSize = $state<ImageSize | null>(null);
  let thumbnailXsSize = $state<ImageSize | null>(null);
  let submitting = $state(false);
  let message = $state('');
  let messageType: 'success' | 'error' = $state('success');
  let badgeSubscription: Subscription | null = null;

  onDestroy(() => {
    if (badgeSubscription) {
      badgeSubscription.unsubscribe();
    }
  });

  function loadMyBadges() {
    if (!$authStore.pubkey) return;

    if (badgeSubscription) {
      badgeSubscription.unsubscribe();
    }

    loadingBadges = true;
    badges = [];

    badgeSubscription = resolveBadgeDefinitionsByPubkey($authStore.pubkey).subscribe({
      next: (badgeMap) => {
        badges = [...badgeMap.values()];
        loadingBadges = false;
      },
      error: (error: Error) => {
        console.error('Error loading badges:', error);
        loadingBadges = false;
      },
    });

    setTimeout(() => {
      loadingBadges = false;
    }, 3000);
  }

  function switchToEditMode() {
    editMode = true;
    loadMyBadges();
  }

  function switchToCreateMode() {
    editMode = false;
    selectedBadgeForEdit = '';
    resetForm();
  }

  function selectBadgeForEdit(dTag: string) {
    const badge = badges.find(b => b.dTag === dTag);
    if (badge) {
      badgeId = badge.dTag;
      badgeName = badge.name;
      description = badge.description;
      imageUrl = badge.imageUrl;
      thumbnailXlUrl = badge.thumbnails.xl || '';
      thumbnailLUrl = badge.thumbnails.l || '';
      thumbnailMUrl = badge.thumbnails.m || '';
      thumbnailSUrl = badge.thumbnails.s || '';
      thumbnailXsUrl = badge.thumbnails.xs || '';
      selectedBadgeForEdit = dTag;
    }
  }

  function resetForm() {
    badgeId = '';
    badgeName = '';
    description = '';
    imageUrl = '';
    thumbnailXlUrl = '';
    thumbnailLUrl = '';
    thumbnailMUrl = '';
    thumbnailSUrl = '';
    thumbnailXsUrl = '';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!$authStore.isLoggedIn || !$authStore.pubkey) {
      message = $t('loginRequired');
      messageType = 'error';
      return;
    }

    if (!isValidBadgeId(badgeId)) {
      message = 'Invalid badge ID. Use lowercase letters, numbers, and hyphens only.';
      messageType = 'error';
      return;
    }

    if (!isValidUrl(imageUrl)) {
      message = 'Invalid image URL';
      messageType = 'error';
      return;
    }

    // Validate all thumbnail URLs
    const thumbnailUrls = [
      { url: thumbnailXlUrl, name: 'XL' },
      { url: thumbnailLUrl, name: 'L' },
      { url: thumbnailMUrl, name: 'M' },
      { url: thumbnailSUrl, name: 'S' },
      { url: thumbnailXsUrl, name: 'XS' },
    ];

    for (const thumb of thumbnailUrls) {
      if (thumb.url && !isValidUrl(thumb.url)) {
        message = `Invalid ${thumb.name} thumbnail URL`;
        messageType = 'error';
        return;
      }
    }

    submitting = true;
    message = '';

    try {
      const tags = buildBadgeTags({
        badgeId,
        badgeName,
        description,
        imageUrl,
        mainImageSize,
        thumbnails: [
          { url: thumbnailXlUrl, size: thumbnailXlSize, defaultSize: '512x512' },
          { url: thumbnailLUrl, size: thumbnailLSize, defaultSize: '256x256' },
          { url: thumbnailMUrl, size: thumbnailMSize, defaultSize: '64x64' },
          { url: thumbnailSUrl, size: thumbnailSSize, defaultSize: '32x32' },
          { url: thumbnailXsUrl, size: thumbnailXsSize, defaultSize: '16x16' },
        ],
      });

      const event: NostrEvent = {
        created_at: Math.floor(Date.now() / 1000),
        kind: 30009,
        tags,
        content: '',
      };

      const signedEvent = await window.nostr!.signEvent(event);
      await publishEvent(signedEvent);

      message = editMode ? 'Badge updated successfully!' : $t('badgeCreated');
      messageType = 'success';

      resetForm();
      if (editMode) {
        setTimeout(() => loadMyBadges(), 1000);
      }
    } catch (error) {
      message = error instanceof Error ? error.message : 'Failed to create/update badge';
      messageType = 'error';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="max-w-2xl">
  <div class="mb-6 flex flex-wrap gap-3">
    <button
      class="px-4 py-2 rounded-md transition-colors {!editMode ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
      onclick={switchToCreateMode}
    >
      {$t('createNewBadge')}
    </button>
    <button
      class="px-4 py-2 rounded-md transition-colors {editMode ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
      onclick={switchToEditMode}
    >
      {$t('editMode')}
    </button>
  </div>

  {#if editMode}
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 class="font-medium text-blue-900 mb-3">{$t('selectBadgeToEdit')}</h3>
      {#if loadingBadges}
        <p class="text-blue-800">Loading badges...</p>
      {:else if badges.length === 0}
        <p class="text-blue-800">{$t('noBadgesFound')}</p>
      {:else}
        <div class="space-y-2">
          {#each badges as badge}
            <button
              class="w-full text-left p-3 rounded-md transition-colors {selectedBadgeForEdit === badge.dTag ? 'bg-blue-200 border-2 border-blue-400' : 'bg-white hover:bg-blue-100 border border-blue-200'}"
              onclick={() => selectBadgeForEdit(badge.dTag)}
            >
              <div class="font-medium text-gray-900">{badge.name}</div>
              <div class="text-sm text-gray-600">ID: {badge.dTag}</div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-4">
    <div>
      <label for="badgeId" class="block mb-2 font-medium text-gray-700">
        {$t('badgeId')} *
      </label>
      <input
        id="badgeId"
        type="text"
        bind:value={badgeId}
        placeholder={$t('badgeIdPlaceholder')}
        required
        pattern="[a-z0-9-]+"
        disabled={editMode && selectedBadgeForEdit !== ''}
        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>

    <div>
      <label for="badgeName" class="block mb-2 font-medium text-gray-700">
        {$t('badgeName')} *
      </label>
      <input
        id="badgeName"
        type="text"
        bind:value={badgeName}
        placeholder={$t('badgeNamePlaceholder')}
        required
        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
    </div>

    <div>
      <label for="description" class="block mb-2 font-medium text-gray-700">
        {$t('badgeDescription')} *
      </label>
      <textarea
        id="description"
        bind:value={description}
        placeholder={$t('badgeDescriptionPlaceholder')}
        required
        rows="4"
        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
      ></textarea>
    </div>

    <div>
      <label for="imageUrl" class="block mb-2 font-medium text-gray-700">
        {$t('imageUrl')} *
      </label>
      <input
        id="imageUrl"
        type="url"
        bind:value={imageUrl}
        placeholder={$t('imageUrlPlaceholder')}
        required
        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
      <p class="mt-1 text-sm text-gray-600">
        {$t('imageUploadHint')} (<a href="https://lokuyow.github.io/ehagaki/" target="_blank" rel="noopener noreferrer" class="text-orange-500 hover:text-orange-600 underline">ehagaki</a>)
      </p>
    </div>

    {#if imageUrl && isValidUrl(imageUrl)}
      <ImagePreview url={imageUrl} onSizeLoaded={(size) => mainImageSize = size} recommendedSize={{ width: 1024, height: 1024 }} />
    {/if}

    <!-- Thumbnails Section -->
    <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
      <div>
        <h3 class="font-medium text-gray-900 mb-1">{$t('thumbnailsSection')}</h3>
        <p class="text-sm text-gray-600">{$t('thumbnailsHint')}</p>
      </div>

      <div>
        <label for="thumbnailXl" class="block mb-2 font-medium text-gray-700">
          {$t('thumbnailXl')}
        </label>
        <input
          id="thumbnailXl"
          type="url"
          bind:value={thumbnailXlUrl}
          placeholder={$t('thumbnailUrlPlaceholder')}
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {#if thumbnailXlUrl && isValidUrl(thumbnailXlUrl)}
          <ImagePreview url={thumbnailXlUrl} onSizeLoaded={(size) => thumbnailXlSize = size} recommendedSize={{ width: 512, height: 512 }} />
        {/if}
      </div>

      <div>
        <label for="thumbnailL" class="block mb-2 font-medium text-gray-700">
          {$t('thumbnailL')}
        </label>
        <input
          id="thumbnailL"
          type="url"
          bind:value={thumbnailLUrl}
          placeholder={$t('thumbnailUrlPlaceholder')}
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {#if thumbnailLUrl && isValidUrl(thumbnailLUrl)}
          <ImagePreview url={thumbnailLUrl} onSizeLoaded={(size) => thumbnailLSize = size} recommendedSize={{ width: 256, height: 256 }} />
        {/if}
      </div>

      <div>
        <label for="thumbnailM" class="block mb-2 font-medium text-gray-700">
          {$t('thumbnailM')}
        </label>
        <input
          id="thumbnailM"
          type="url"
          bind:value={thumbnailMUrl}
          placeholder={$t('thumbnailUrlPlaceholder')}
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {#if thumbnailMUrl && isValidUrl(thumbnailMUrl)}
          <ImagePreview url={thumbnailMUrl} onSizeLoaded={(size) => thumbnailMSize = size} recommendedSize={{ width: 64, height: 64 }} />
        {/if}
      </div>

      <div>
        <label for="thumbnailS" class="block mb-2 font-medium text-gray-700">
          {$t('thumbnailS')}
        </label>
        <input
          id="thumbnailS"
          type="url"
          bind:value={thumbnailSUrl}
          placeholder={$t('thumbnailUrlPlaceholder')}
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {#if thumbnailSUrl && isValidUrl(thumbnailSUrl)}
          <ImagePreview url={thumbnailSUrl} onSizeLoaded={(size) => thumbnailSSize = size} recommendedSize={{ width: 32, height: 32 }} />
        {/if}
      </div>

      <div>
        <label for="thumbnailXs" class="block mb-2 font-medium text-gray-700">
          {$t('thumbnailXs')}
        </label>
        <input
          id="thumbnailXs"
          type="url"
          bind:value={thumbnailXsUrl}
          placeholder={$t('thumbnailUrlPlaceholder')}
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {#if thumbnailXsUrl && isValidUrl(thumbnailXsUrl)}
          <ImagePreview url={thumbnailXsUrl} onSizeLoaded={(size) => thumbnailXsSize = size} recommendedSize={{ width: 16, height: 16 }} />
        {/if}
      </div>
    </div>

    <button 
      type="submit" 
      disabled={submitting || !$authStore.isLoggedIn}
      class="w-full md:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium"
    >
      {submitting ? '...' : editMode ? $t('updateBadgeButton') : $t('createBadgeButton')}
    </button>

    {#if message}
      <div class="p-4 rounded-md {messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}">
        {message}
      </div>
    {/if}
  </form>
</div>
