<script lang="ts">
  import { onDestroy } from 'svelte';
  import { authStore } from '../stores/auth';
  import { t } from '../stores/i18n';
  import { isValidBadgeId, isValidUrl } from '../utils/validation';
  import { publishEvent, getUserBadgeDefinitions } from '../services/nostr';
  import ImagePreview from './ImagePreview.svelte';
  import type { NostrEvent } from '../../types/nostr';
  import type { Subscription } from 'rxjs';

  interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    thumbnailUrl?: string;
    dTag: string;
  }

  let editMode = $state(false);
  let badges: BadgeDefinition[] = $state([]);
  let selectedBadgeForEdit = $state('');
  let loadingBadges = $state(false);
  
  let badgeId = $state('');
  let badgeName = $state('');
  let description = $state('');
  let imageUrl = $state('');
  let thumbnailUrl = $state('');
  let submitting = $state(false);
  let message = $state('');
  let messageType: 'success' | 'error' = $state('success');
  let badgeSubscription: Subscription | null = null;

  onDestroy(() => {
    if (badgeSubscription) {
      badgeSubscription.unsubscribe();
    }
  });

  async function loadMyBadges() {
    if (!$authStore.pubkey) return;

    if (badgeSubscription) {
      badgeSubscription.unsubscribe();
    }

    loadingBadges = true;
    badges = [];

    try {
      const { observable, req, filters } = getUserBadgeDefinitions($authStore.pubkey);

      badgeSubscription = observable.subscribe({
        next: (packet: any) => {
          const event = packet.event;
          const dTag = event.tags.find((t: string[]) => t[0] === 'd')?.[1] || '';
          const name = event.tags.find((t: string[]) => t[0] === 'name')?.[1] || dTag;
          const description = event.tags.find((t: string[]) => t[0] === 'description')?.[1] || '';
          const imageTag = event.tags.find((t: string[]) => t[0] === 'image');
          const imageUrl = imageTag?.[1] || '';
          const thumbnailTag = event.tags.find((t: string[]) => t[0] === 'thumb');
          const thumbnailUrl = thumbnailTag?.[1] || '';

          if (!badges.some((b) => b.dTag === dTag)) {
            badges = [
              ...badges,
              {
                id: event.id || '',
                name,
                description,
                imageUrl,
                thumbnailUrl,
                dTag,
              },
            ];
          }
        },
        error: (error: Error) => {
          console.error('Error loading badges:', error);
          loadingBadges = false;
        },
        complete: () => {
          loadingBadges = false;
        },
      });

      req.emit(filters);

      setTimeout(() => {
        loadingBadges = false;
      }, 3000);
    } catch (error) {
      console.error('Failed to load badges:', error);
      loadingBadges = false;
    }
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
      thumbnailUrl = badge.thumbnailUrl || '';
      selectedBadgeForEdit = dTag;
    }
  }

  function resetForm() {
    badgeId = '';
    badgeName = '';
    description = '';
    imageUrl = '';
    thumbnailUrl = '';
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

    if (thumbnailUrl && !isValidUrl(thumbnailUrl)) {
      message = 'Invalid thumbnail URL';
      messageType = 'error';
      return;
    }

    submitting = true;
    message = '';

    try {
      const tags: string[][] = [
        ['d', badgeId],
        ['name', badgeName],
        ['description', description],
        ['image', imageUrl, '1024x1024'],
      ];

      if (thumbnailUrl) {
        tags.push(['thumb', thumbnailUrl, '256x256']);
      }

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

    <div>
      <label for="thumbnailUrl" class="block mb-2 font-medium text-gray-700">
        {$t('thumbnailUrl')}
      </label>
      <input
        id="thumbnailUrl"
        type="url"
        bind:value={thumbnailUrl}
        placeholder={$t('thumbnailUrlPlaceholder')}
        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
    </div>

    {#if imageUrl && isValidUrl(imageUrl)}
      <ImagePreview url={imageUrl} />
    {/if}

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
