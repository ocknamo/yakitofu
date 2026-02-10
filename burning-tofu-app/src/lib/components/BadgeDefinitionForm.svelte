<script lang="ts">
  import { authStore } from '../stores/auth';
  import { t } from '../stores/i18n';
  import { isValidBadgeId, isValidUrl } from '../utils/validation';
  import { publishEvent } from '../services/nostr';
  import ImagePreview from './ImagePreview.svelte';
  import type { NostrEvent } from '../../types/nostr';

  let badgeId = $state('');
  let badgeName = $state('');
  let description = $state('');
  let imageUrl = $state('');
  let submitting = $state(false);
  let message = $state('');
  let messageType: 'success' | 'error' = $state('success');

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

    submitting = true;
    message = '';

    try {
      // Create badge definition event (kind 30009)
      const event: NostrEvent = {
        created_at: Math.floor(Date.now() / 1000),
        kind: 30009,
        tags: [
          ['d', badgeId],
          ['name', badgeName],
          ['description', description],
          ['image', imageUrl, '1024x1024'],
        ],
        content: '',
      };

      // Sign with NIP-07
      const signedEvent = await window.nostr!.signEvent(event);

      // Publish to relays
      await publishEvent(signedEvent);

      message = $t('badgeCreated');
      messageType = 'success';

      // Reset form
      badgeId = '';
      badgeName = '';
      description = '';
      imageUrl = '';
    } catch (error) {
      message = error instanceof Error ? error.message : 'Failed to create badge';
      messageType = 'error';
    } finally {
      submitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <div class="form-group">
    <label for="badgeId">{$t('badgeId')} *</label>
    <input
      id="badgeId"
      type="text"
      bind:value={badgeId}
      placeholder={$t('badgeIdPlaceholder')}
      required
      pattern="[a-z0-9-]+"
    />
  </div>

  <div class="form-group">
    <label for="badgeName">{$t('badgeName')} *</label>
    <input
      id="badgeName"
      type="text"
      bind:value={badgeName}
      placeholder={$t('badgeNamePlaceholder')}
      required
    />
  </div>

  <div class="form-group">
    <label for="description">{$t('badgeDescription')} *</label>
    <textarea
      id="description"
      bind:value={description}
      placeholder={$t('badgeDescriptionPlaceholder')}
      required
      rows="4"
    ></textarea>
  </div>

  <div class="form-group">
    <label for="imageUrl">{$t('imageUrl')} *</label>
    <input
      id="imageUrl"
      type="url"
      bind:value={imageUrl}
      placeholder={$t('imageUrlPlaceholder')}
      required
    />
  </div>

  {#if imageUrl && isValidUrl(imageUrl)}
    <ImagePreview url={imageUrl} />
  {/if}

  <button type="submit" disabled={submitting || !$authStore.isLoggedIn}>
    {submitting ? '...' : $t('createBadgeButton')}
  </button>

  {#if message}
    <div class="message {messageType}">
      {message}
    </div>
  {/if}
</form>

<style>
  form {
    max-width: 600px;
  }

  .form-group {
    margin-bottom: 1em;
  }

  label {
    display: block;
    margin-bottom: 0.3em;
    font-weight: 500;
    color: #333;
  }

  input,
  textarea {
    width: 100%;
    padding: 0.5em;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1em;
    font-family: inherit;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #ff3e00;
  }

  button {
    padding: 0.7em 1.5em;
    background: #ff3e00;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    margin-top: 1em;
  }

  button:hover:not(:disabled) {
    background: #e63900;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .message {
    margin-top: 1em;
    padding: 0.8em;
    border-radius: 4px;
  }

  .message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #28a745;
  }

  .message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #dc3545;
  }
</style>
