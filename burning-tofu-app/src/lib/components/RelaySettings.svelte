<script lang="ts">
  import { relayStore } from '../stores/relay';
  import { t } from '../stores/i18n';
  import { isValidWebSocketUrl } from '../utils/validation';

  let newRelay = $state('');
  let error = $state('');

  function handleAddRelay() {
    error = '';
    
    if (!newRelay) {
      return;
    }

    if (!isValidWebSocketUrl(newRelay)) {
      error = 'Invalid WebSocket URL. Must start with wss:// or ws://';
      return;
    }

    relayStore.addRelay(newRelay);
    newRelay = '';
  }

  function handleRemoveRelay(relay: string) {
    relayStore.removeRelay(relay);
  }
</script>

<div class="max-w-2xl">
  <h3 class="text-xl font-semibold text-gray-800 mb-4">{$t('currentRelays')}</h3>
  
  <div class="space-y-2 mb-8">
    {#each $relayStore.relays as relay}
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <span class="flex-1 font-mono text-xs md:text-sm text-gray-700 break-all">{relay}</span>
        <span class="px-2 py-1 rounded text-xs {$relayStore.connected.has(relay) ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'} whitespace-nowrap self-start sm:self-auto">
          {$relayStore.connected.has(relay) ? $t('connected') : $t('disconnected')}
        </span>
        <button 
          onclick={() => handleRemoveRelay(relay)}
          class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          {$t('remove')}
        </button>
      </div>
    {/each}
  </div>

  <div>
    <h4 class="text-lg font-medium text-gray-800 mb-3">{$t('addRelay')}</h4>
    <div class="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        bind:value={newRelay}
        placeholder={$t('relayUrlPlaceholder')}
        onkeydown={(e) => e.key === 'Enter' && handleAddRelay()}
        class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
      <button 
        onclick={handleAddRelay}
        class="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors whitespace-nowrap"
      >
        Add
      </button>
    </div>
    {#if error}
      <p class="mt-2 text-red-600 text-sm">{error}</p>
    {/if}
  </div>
</div>
