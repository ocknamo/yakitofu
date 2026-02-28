<script lang="ts">
  import { languageStore, type Language } from '../stores/i18n';
  import languageIcon from '../../assets/lang.svg';

  let currentLang = "";
  languageStore.subscribe(lang => {
    currentLang = lang;
  });

  function switchLanguage() {
    languageStore.setLanguage(currentLang === 'en' ? 'ja' : 'en');
  }
</script>

<div class="flex gap-1">
  <img src={languageIcon} alt="Language" class="w-4 h-6" />
  <button
  class="px-2 py-1 rounded text-xs transition-colors bg-orange-400 hover:bg-white hover:text-orange-500"
  onclick={() => switchLanguage()}
  >
  { currentLang.toUpperCase() }
  </button>
</div>
