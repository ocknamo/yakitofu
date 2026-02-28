<script lang="ts">
  import { authStore } from '../stores/auth';
  import { t } from '../stores/i18n';
  import { hexToNpub } from '../utils/npubConverter';

  let loading = $state(false);
  let error = $state('');

  async function handleLogin() {
    loading = true;
    error = '';
    try {
      await authStore.login();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Login failed';
    } finally {
      loading = false;
    }
  }

  function handleLogout() {
    authStore.logout();
  }

  let npubKey = $derived($authStore.pubkey ? hexToNpub($authStore.pubkey) : '');
</script>

{#if !$authStore.hasNostrExtension}
  <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <p class="text-yellow-800 text-sm md:text-base">{$t('noExtension')}</p>
  </div>
{:else if $authStore.isLoggedIn}
  <div class="p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
    <p class="text-green-800 text-sm md:text-base flex-1">
      <span class="font-medium">{$t('loggedInAs')}:</span>
      <code class="ml-2 bg-white px-2 py-1 rounded text-xs md:text-sm font-mono break-all">
        {npubKey.slice(0, 16)}...{npubKey.slice(-8)}
      </code>
    </p>
    <button 
      onclick={handleLogout}
      class="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs transition-colors whitespace-nowrap"
    >
      {$t('logout')}
    </button>
  </div>
{:else}
  <div>
    <button 
      onclick={handleLogin} 
      disabled={loading}
      class="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors text-sm md:text-base font-medium"
    >
      {loading ? '...' : $t('login')}
    </button>
    {#if error}
      <p class="mt-2 text-red-600 text-sm">{error}</p>
    {/if}
  </div>
{/if}
