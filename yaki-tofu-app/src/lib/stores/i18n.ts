import { writable, derived } from 'svelte/store';

export type Language = 'en' | 'ja';

interface Translations {
  [key: string]: {
    en: string;
    ja: string;
  };
}

const translations: Translations = {
  // App
  appTitle: {
    en: 'Yakitofu',
    ja: 'Yakitofu',
  },
  appDescription: {
    en: 'NIP-58 Badge Creation & Award Application',
    ja: 'NIP-58 バッジ作成・付与アプリ',
  },
  
  // Auth
  login: {
    en: 'Login by NIP-07',
    ja: 'ログイン(NIP-07)',
  },
  logout: {
    en: 'Logout',
    ja: 'ログアウト',
  },
  noExtension: {
    en: 'Nostr extension not found. Please install a NIP-07 compatible extension.',
    ja: 'Nostr拡張機能が見つかりません。NIP-07対応の拡張機能をインストールしてください。',
  },
  loggedInAs: {
    en: 'Logged in as',
    ja: 'ログイン中',
  },
  
  // Tabs
  createBadge: {
    en: 'Create Badge',
    ja: 'バッジ作成',
  },
  awardBadge: {
    en: 'Award Badge',
    ja: 'バッジ付与',
  },
  settings: {
    en: 'Settings',
    ja: '設定',
  },
  
  // Badge Definition Form
  badgeId: {
    en: 'Badge ID',
    ja: 'バッジID',
  },
  badgeIdPlaceholder: {
    en: 'e.g., bravery',
    ja: '例: bravery',
  },
  badgeName: {
    en: 'Badge Name',
    ja: 'バッジ名',
  },
  badgeNamePlaceholder: {
    en: 'e.g., Medal of Bravery',
    ja: '例: 勇気のメダル',
  },
  badgeDescription: {
    en: 'Description',
    ja: '説明',
  },
  badgeDescriptionPlaceholder: {
    en: 'Describe the badge...',
    ja: 'バッジの説明を入力...',
  },
  imageUrl: {
    en: 'Image URL',
    ja: '画像URL',
  },
  imageUrlPlaceholder: {
    en: 'https://example.com/badge.png',
    ja: 'https://example.com/badge.png',
  },
  imageUploadHint: {
    en: 'e.g., You can upload images and get URLs using ehagaki',
    ja: 'eg. ehagakiで画像をアップロードしてURLを取得できます',
  },
  thumbnailUrl: {
    en: 'Thumbnail URL (optional)',
    ja: 'サムネイルURL (任意)',
  },
  thumbnailUrlPlaceholder: {
    en: 'https://example.com/thumbnail.png',
    ja: 'https://example.com/thumbnail.png',
  },
  imagePreview: {
    en: 'Image Preview',
    ja: '画像プレビュー',
  },
  imageSizeWarning: {
    en: 'Warning: Recommended size is 1024x1024px. Current size:',
    ja: '警告: 推奨サイズは1024x1024pxです。現在のサイズ:',
  },
  createBadgeButton: {
    en: 'Create Badge',
    ja: 'バッジを作成',
  },
  updateBadgeButton: {
    en: 'Update Badge',
    ja: 'バッジを更新',
  },
  editMode: {
    en: 'Edit Mode',
    ja: '編集',
  },
  createNewBadge: {
    en: 'Create new badge',
    ja: 'バッジを作成',
  },
  loadMyBadges: {
    en: 'Load My Badges',
    ja: 'バッジを読み込む',
  },
  selectBadgeToEdit: {
    en: 'Select badge',
    ja: 'バッジを選択',
  },
  
  // Badge Award Form
  selectBadge: {
    en: 'Select Badge',
    ja: 'バッジを選択',
  },
  recipientNpub: {
    en: 'Recipient npub',
    ja: '受取人のnpub',
  },
  recipientNpubPlaceholder: {
    en: 'npub1...',
    ja: 'npub1...',
  },
  awardBadgeButton: {
    en: 'Award Badge',
    ja: 'バッジを付与',
  },
  
  // Relay Settings
  currentRelays: {
    en: 'Current Relays',
    ja: '現在のリレー',
  },
  addRelay: {
    en: 'Add Relay',
    ja: 'リレーを追加',
  },
  relayUrlPlaceholder: {
    en: 'wss://relay.example.com',
    ja: 'wss://relay.example.com',
  },
  connected: {
    en: 'Connected',
    ja: '接続中',
  },
  disconnected: {
    en: 'Disconnected',
    ja: '未接続',
  },
  remove: {
    en: 'Remove',
    ja: '削除',
  },
  
  // Messages
  success: {
    en: 'Success!',
    ja: '成功！',
  },
  error: {
    en: 'Error',
    ja: 'エラー',
  },
  badgeCreated: {
    en: 'Badge created successfully!',
    ja: 'バッジが作成されました！',
  },
  badgeAwarded: {
    en: 'Badge awarded successfully!',
    ja: 'バッジが付与されました！',
  },
  loginRequired: {
    en: 'Please login first',
    ja: '先にログインしてください',
  },
  noBadgesFound: {
    en: 'No badges found. Create a badge first!',
    ja: 'バッジが見つかりません。先にバッジを作成してください！',
  },
  pleaseLoginFirst: {
    en: 'Please login first',
    ja: 'まずログインしてください',
  },
  
  // Footer
  viewOnGitHub: {
    en: 'View on GitHub',
    ja: 'GitHubで見る',
  },
  nip58Spec: {
    en: 'NIP-58 Specification',
    ja: 'NIP-58 仕様',
  },
};

function createI18nStore() {
  const storedLang = typeof window !== 'undefined' 
    ? (localStorage.getItem('language') as Language) || 'en'
    : 'en';
  
  const { subscribe, set } = writable<Language>(storedLang);

  return {
    subscribe,
    setLanguage: (lang: Language) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang);
      }
      set(lang);
    },
  };
}

export const languageStore = createI18nStore();

export const t = derived(languageStore, ($lang) => {
  return (key: string): string => {
    return translations[key]?.[$lang] || key;
  };
});
