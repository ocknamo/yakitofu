<script lang="ts">
import { onMount } from 'svelte';
import BadgeAwardForm from './lib/components/BadgeAwardForm.svelte';
import BadgeDefinitionForm from './lib/components/BadgeDefinitionForm.svelte';
import LanguageSwitch from './lib/components/LanguageSwitch.svelte';
import LoginButton from './lib/components/LoginButton.svelte';
import RelaySettings from './lib/components/RelaySettings.svelte';
import { authStore } from './lib/stores/auth';
import { t } from './lib/stores/i18n';

type Tab = 'create' | 'award' | 'relay';
const activeTab: Tab = $state('create');

onMount(() => {
  // Check for window.nostr after a short delay to ensure extension is loaded
  setTimeout(() => {
    authStore.checkExtension();
  }, 100);
});
</script>

<main>
  <header>
    <div class="header-content">
      <div class="title-section">
        <h1>{$t('appTitle')}</h1>
        <p class="subtitle">{$t('appDescription')}</p>
      </div>
      <LanguageSwitch />
    </div>
  </header>

  <div class="container">
    <LoginButton />

    <div class="tabs">
      <button
        class="tab"
        class:active={activeTab === 'create'}
        onclick={() => activeTab = 'create'}
      >
        {$t('createBadge')}
      </button>
      <button
        class="tab"
        class:active={activeTab === 'award'}
        onclick={() => activeTab = 'award'}
      >
        {$t('awardBadge')}
      </button>
      <button
        class="tab"
        class:active={activeTab === 'relay'}
        onclick={() => activeTab = 'relay'}
      >
        {$t('relaySettings')}
      </button>
    </div>

    <div class="tab-content">
      {#if activeTab === 'create'}
        <BadgeDefinitionForm />
      {:else if activeTab === 'award'}
        <BadgeAwardForm />
      {:else if activeTab === 'relay'}
        <RelaySettings />
      {/if}
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background: #fafafa;
  }

  main {
    min-height: 100vh;
  }

  header {
    background: linear-gradient(135deg, #ff3e00 0%, #ff6b35 100%);
    color: white;
    padding: 2em 1em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2em;
  }

  .title-section {
    flex: 1;
  }

  h1 {
    margin: 0;
    font-size: 2.5em;
    font-weight: 700;
  }

  .subtitle {
    margin: 0.5em 0 0 0;
    font-size: 1.1em;
    opacity: 0.9;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2em 1em;
  }

  .tabs {
    display: flex;
    gap: 0.5em;
    margin-bottom: 2em;
    border-bottom: 2px solid #ddd;
  }

  .tab {
    padding: 0.8em 1.5em;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 1em;
    color: #666;
    transition: all 0.2s;
  }

  .tab:hover {
    color: #ff3e00;
    background: #f9f9f9;
  }

  .tab.active {
    color: #ff3e00;
    border-bottom-color: #ff3e00;
    font-weight: 600;
  }

  .tab-content {
    background: white;
    padding: 2em;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }

    h1 {
      font-size: 2em;
    }

    .tabs {
      flex-direction: column;
      border-bottom: none;
    }

    .tab {
      border-bottom: 1px solid #ddd;
      border-left: 3px solid transparent;
    }

    .tab.active {
      border-bottom-color: #ddd;
      border-left-color: #ff3e00;
    }

    .tab-content {
      padding: 1em;
    }
  }
</style>
