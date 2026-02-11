<script lang="ts">
  import { languageStore, type Language } from '../stores/i18n';

  function switchLanguage(lang: Language) {
    languageStore.setLanguage(lang);
  }
</script>

<div class="flex gap-2">
  <button
    class="px-3 py-1.5 md:px-4 md:py-2 rounded-md text-sm md:text-base transition-colors {$languageStore === 'en' ? 'bg-white text-orange-500 font-medium' : 'bg-orange-400 text-white hover:bg-white hover:text-orange-500'}"
    onclick={() => switchLanguage('en')}
  >
    EN
  </button>
  <button
    class="px-3 py-1.5 md:px-4 md:py-2 rounded-md text-sm md:text-base transition-colors {$languageStore === 'ja' ? 'bg-white text-orange-500 font-medium' : 'bg-orange-400 text-white hover:bg-white hover:text-orange-500'}"
    onclick={() => switchLanguage('ja')}
  >
    日本語
  </button>
</div>
