<script lang="ts">
import { NosskeyIframeError } from 'nosskey-iframe';
import { authStore } from '../stores/auth';
import { t } from '../stores/i18n';

let { open = $bindable(false), onLoggedIn }: { open?: boolean; onLoggedIn?: () => void } = $props();

let loading = $state<'nip07' | 'nosskey' | null>(null);
let error = $state('');

function close() {
  if (loading) return;
  open = false;
  error = '';
}

function handleClickOutside(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    close();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close();
  }
}

function mapError(e: unknown): string {
  if (e instanceof NosskeyIframeError) {
    if (e.code === 'NO_KEY') return $t('nosskeyNoKey');
    if (e.code === 'USER_REJECTED') return $t('nosskeyUserRejected');
  }
  return e instanceof Error ? e.message : $t('loginFailed');
}

async function loginNip07() {
  loading = 'nip07';
  error = '';
  try {
    await authStore.login();
    open = false;
    onLoggedIn?.();
  } catch (e) {
    error = mapError(e);
  } finally {
    loading = null;
  }
}

async function loginNosskey() {
  loading = 'nosskey';
  error = '';
  try {
    await authStore.loginNosskey();
    open = false;
    onLoggedIn?.();
  } catch (e) {
    error = mapError(e);
  } finally {
    loading = null;
  }
}
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onclick={handleClickOutside}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-label={$t('loginModalTitle')}
    tabindex="-1"
  >
    <div class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
      <h2 class="mb-4 text-lg font-semibold text-gray-900">{$t('loginModalTitle')}</h2>

      <div class="flex flex-col gap-3">
        <!-- NIP-07 -->
        <div>
          <button
            onclick={loginNip07}
            disabled={!$authStore.hasNostrExtension || loading !== null}
            class="w-full rounded-md bg-orange-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'nip07' ? '...' : $t('loginWithNip07')}
          </button>
          {#if !$authStore.hasNostrExtension}
            <p class="mt-1 text-xs text-gray-500">{$t('noExtension')}</p>
          {/if}
        </div>

        <!-- nosskey.app -->
        <div>
          <button
            onclick={loginNosskey}
            disabled={loading !== null}
            class="w-full rounded-md border border-orange-500 bg-white px-4 py-3 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'nosskey' ? '...' : $t('loginWithNosskey')}
          </button>
          <p class="mt-1 text-xs text-gray-500">{$t('loginNosskeyDescription')}</p>
        </div>
      </div>

      {#if error}
        <p class="mt-3 text-sm text-red-600">{error}</p>
      {/if}

      <button
        onclick={close}
        disabled={loading !== null}
        class="mt-4 w-full rounded-md px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
      >
        {$t('cancel')}
      </button>
    </div>
  </div>
{/if}
