<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../stores/auth';
  import { relayStore } from '../stores/relay';
  import { t } from '../stores/i18n';
  import { isValidNpub } from '../utils/validation';
  import { npubToHex } from '../utils/npubConverter';
  import { publishEvent, getUserBadgeDefinitions, initializeRelays } from '../services/nostr';
  import type { NostrEvent } from '../../types/nostr';

  interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    dTag: string;
  }

  let badges: BadgeDefinition[] = $state([]);
  let selectedBadge = $state('');
  let recipientNpub = $state('');
  let submitting = $state(false);
  let loading = $state(false);
  let message = $state('');
  let messageType: 'success' | 'error' = $state('success');

  // Initialize relays when component mounts
  $effect(() => {
    initializeRelays($relayStore.relays, (relay, connected) => {
      relayStore.setConnected(relay, connected);
    });
  });

  // Load user's badges when logged in
  $effect(() => {
    if ($authStore.isLoggedIn && $authStore.pubkey) {
      loadBadges();
    } else {
      badges = [];
    }
  });

  async function loadBadges() {
    if (!$authStore.pubkey) return;

    loading = true;
    badges = [];

    try {
      const { observable, req, filters } = getUserBadgeDefinitions($authStore.pubkey);
      
      // Subscribe first, then emit
      observable.subscribe({
        next: (packet: any) => {
          const event = packet.event;
          const dTag = event.tags.find((t: any) => t[0] === 'd')?.[1] || '';
          const name = event.tags.find((t: any) => t[0] === 'name')?.[1] || dTag;
          const description = event.tags.find((t: any) => t[0] === 'description')?.[1] || '';

          // Check if badge already exists in list
          if (!badges.some(b => b.dTag === dTag)) {
            badges = [...badges, {
              id: event.id || '',
              name,
              description,
              dTag,
            }];
          }
        },
        error: (error: any) => {
          console.error('Error loading badges:', error);
          loading = false;
        },
        complete: () => {
          console.log('Badge loading complete');
          loading = false;
        },
      });
      
      // Emit the request after subscribing
      req.emit(filters);

      // Auto-complete after 3 seconds as fallback
      setTimeout(() => {
        loading = false;
      }, 3000);
    } catch (error: any) {
      console.error('Failed to load badges:', error);
      loading = false;
    }
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

<form onsubmit={handleSubmit}>
  {#if loading}
    <p>Loading badges...</p>
  {:else if badges.length === 0}
    <p class="info">No badges found. Create a badge first!</p>
  {:else}
    <div class="form-group">
      <label for="badge">{$t('selectBadge')} *</label>
      <select id="badge" bind:value={selectedBadge} required>
        <option value="">-- Select --</option>
        {#each badges as badge}
          <option value={badge.dTag}>
            {badge.name} ({badge.dTag})
          </option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label for="recipient">{$t('recipientNpub')} *</label>
      <input
        id="recipient"
        type="text"
        bind:value={recipientNpub}
        placeholder={$t('recipientNpubPlaceholder')}
        required
        pattern="npub1[a-z0-9]+"
      />
    </div>

    <button type="submit" disabled={submitting || !$authStore.isLoggedIn}>
      {submitting ? '...' : $t('awardBadgeButton')}
    </button>
  {/if}

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
  select {
    width: 100%;
    padding: 0.5em;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1em;
    font-family: inherit;
  }

  input:focus,
  select:focus {
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

  .info {
    padding: 1em;
    background: #e7f3ff;
    border: 1px solid #2196f3;
    border-radius: 4px;
    color: #0d47a1;
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
