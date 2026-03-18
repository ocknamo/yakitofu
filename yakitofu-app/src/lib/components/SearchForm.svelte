<script lang="ts">
import { goto } from '$app/navigation';
import { t } from '../stores/i18n';
import { isValidBadgeId, isValidNpub } from '../utils/validation';

let query = $state('');
let errorMessage = $state('');

function handleSearch() {
  const trimmed = query.trim();
  if (!trimmed) return;

  errorMessage = '';

  if (isValidNpub(trimmed)) {
    goto(`/user/${trimmed}`);
    query = '';
    return;
  }

  if (isValidBadgeId(trimmed)) {
    goto(`/search/${encodeURIComponent(trimmed)}`);
    query = '';
    return;
  }

  errorMessage = $t('invalidSearchQuery');
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleSearch();
  }
}
</script>

<div class="relative flex items-center gap-1">
  <input
    type="text"
    bind:value={query}
    placeholder={$t('searchPlaceholder')}
    onkeydown={handleKeydown}
    class="flex-1 min-w-0 sm:w-56 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
  />
  <button
    onclick={handleSearch}
    class="shrink-0 p-1.5 rounded-lg text-gray-700 hover:bg-orange-100 transition-colors"
    aria-label={$t('search')}
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </button>
  {#if errorMessage}
    <div class="absolute top-full left-0 mt-1 text-xs text-red-600 bg-white rounded shadow px-2 py-1 whitespace-nowrap z-10">
      {errorMessage}
    </div>
  {/if}
</div>
