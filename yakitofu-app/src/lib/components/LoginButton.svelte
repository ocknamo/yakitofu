<script lang="ts">
  import { getCachedProfiles, setCachedProfile } from '../services/indexedDbCache';
  import { getUserProfiles, waitForConnection } from '../services/nostr';
  import { authStore } from '../stores/auth';
  import { t } from '../stores/i18n';
  import { hexToNpub } from '../utils/npubConverter';
  import { parseUserProfile, type UserProfile } from '../utils/userProfileParser';

  let loading = $state(false);
  let error = $state('');
  let profile: UserProfile | null = $state(null);

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
    profile = null;
    authStore.logout();
  }

  let npubKey = $derived($authStore.pubkey ? hexToNpub($authStore.pubkey) : '');

  // Fetch profile when logged in
  $effect(() => {
    const pubkey = $authStore.pubkey;
    if (!pubkey) return;

    let cancelled = false;

    getCachedProfiles([pubkey])
      .then((cached) => {
        if (cancelled) return;
        const p = cached.get(pubkey);
        if (p) profile = p;
      })
      .catch(console.error);

    const { observable, req, filters } = getUserProfiles([pubkey]);

    const subscription = observable.subscribe({
      next: (packet) => {
        if (cancelled) return;
        const parsed = parseUserProfile(packet.event);
        if (parsed.pubkey === pubkey) {
          profile = parsed;
          setCachedProfile(parsed).catch(console.error);
        }
      },
    });

    waitForConnection().then(() => {
      if (!cancelled) req.emit(filters);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  });
</script>

{#if !$authStore.hasNostrExtension}
  <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <p class="text-yellow-800 text-sm md:text-base">{$t('noExtension')}</p>
  </div>
{:else if $authStore.isLoggedIn}
  <div class="flex items-center gap-3">
    <!-- Avatar link -->
    <a href="#/user/{npubKey}" class="shrink-0">
      {#if profile?.picture}
        <img
          src={profile.picture}
          alt={profile.displayName || profile.name || ''}
          class="w-9 h-9 rounded-full object-cover hover:ring-2 hover:ring-orange-300 transition-all"
        />
      {:else}
        <div
          class="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold hover:ring-2 hover:ring-orange-300 transition-all"
        >
          {profile?.displayName?.charAt(0).toUpperCase() || profile?.name?.charAt(0).toUpperCase() || '?'}
        </div>
      {/if}
    </a>

    <!-- npub (hidden on mobile) -->
    <a
      href="#/user/{npubKey}"
      class="hidden sm:block text-xs font-mono text-gray-700 hover:text-orange-500 transition-colors truncate max-w-36"
    >
      {npubKey.slice(0, 16)}...{npubKey.slice(-8)}
    </a>

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
