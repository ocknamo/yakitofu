import { derived, writable } from 'svelte/store';

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
  noBadgeId: {
    en: 'No ID',
    ja: 'IDなし',
  },
  badgeIdPlaceholder: {
    en: 'e.g., bravery or 🎉',
    ja: '例: bravery または 🎉',
  },
  invalidBadgeId: {
    en: 'Invalid badge ID. Spaces are not allowed.',
    ja: 'バッジIDが無効です。空白文字は使用できません。',
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
  thumbnailsSection: {
    en: 'Thumbnails (optional)',
    ja: 'サムネイル (任意)',
  },
  thumbnailsHint: {
    en: 'Recommended sizes: 512x512 (xl), 256x256 (l), 64x64 (m), 32x32 (s), 16x16 (xs)',
    ja: '推奨サイズ: 512x512 (xl), 256x256 (l), 64x64 (m), 32x32 (s), 16x16 (xs)',
  },
  thumbnailXl: {
    en: 'Thumbnail XL (512x512)',
    ja: 'サムネイル XL (512x512)',
  },
  thumbnailL: {
    en: 'Thumbnail L (256x256)',
    ja: 'サムネイル L (256x256)',
  },
  thumbnailM: {
    en: 'Thumbnail M (64x64)',
    ja: 'サムネイル M (64x64)',
  },
  thumbnailS: {
    en: 'Thumbnail S (32x32)',
    ja: 'サムネイル S (32x32)',
  },
  thumbnailXs: {
    en: 'Thumbnail XS (16x16)',
    ja: 'サムネイル XS (16x16)',
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

  // Badge creator
  badgeCreator: {
    en: 'Creator',
    ja: '発行者',
  },

  // Badge detail page
  badgeDetailTitle: {
    en: 'Badge Detail',
    ja: 'バッジ詳細',
  },
  badgeAwardees: {
    en: 'Awardees',
    ja: '受賞者',
  },
  loadingBadge: {
    en: 'Loading badge...',
    ja: 'バッジを読み込み中...',
  },
  loadingAwardees: {
    en: 'Loading awardees...',
    ja: '受賞者を読み込み中...',
  },
  noAwardees: {
    en: 'No awardees yet.',
    ja: 'まだ受賞者はいません。',
  },
  badgeNotFound: {
    en: 'Badge not found.',
    ja: 'バッジが見つかりませんでした。',
  },
  unknownUser: {
    en: 'Unknown User',
    ja: '不明なユーザー',
  },
  copyLink: {
    en: 'Copy Link',
    ja: 'リンクをコピー',
  },
  linkCopied: {
    en: 'Copied!',
    ja: 'コピーしました！',
  },

  // User page
  userBadges: {
    en: 'Badges',
    ja: 'バッジ一覧',
  },
  noBadgesCreated: {
    en: 'No badges created yet.',
    ja: 'まだバッジを作成していません。',
  },
  receivedBadges: {
    en: 'Received Badges',
    ja: '保有バッジ',
  },
  noReceivedBadges: {
    en: 'No badges received yet.',
    ja: 'まだバッジを受け取っていません。',
  },

  // Profile Badges (kind 10008)
  profileBadges: {
    en: 'Profile Badges',
    ja: 'プロフィールバッジ',
  },
  noProfileBadges: {
    en: 'No profile badges selected.',
    ja: 'プロフィールバッジが選択されていません。',
  },
  manageProfileBadges: {
    en: 'Manage Profile Badges',
    ja: 'プロフィールバッジを管理',
  },
  saveProfileBadges: {
    en: 'Save',
    ja: '保存',
  },
  profileBadgesUpdated: {
    en: 'Profile badges updated.',
    ja: 'プロフィールバッジを更新しました。',
  },
  profileBadgesUpdateFailed: {
    en: 'Failed to update profile badges.',
    ja: 'プロフィールバッジの更新に失敗しました。',
  },
  moveUp: {
    en: 'Move up',
    ja: '上へ',
  },
  moveDown: {
    en: 'Move down',
    ja: '下へ',
  },

  myPage: {
    en: 'My Page',
    ja: 'マイページ',
  },

  // Search
  searchPlaceholder: {
    en: 'npub or Badge ID',
    ja: 'npubまたはバッジID',
  },
  search: {
    en: 'Search',
    ja: '検索',
  },
  searchResults: {
    en: 'Search Results',
    ja: '検索結果',
  },
  noSearchResults: {
    en: 'No results found.',
    ja: '検索結果がありません。',
  },
  searchingBadges: {
    en: 'Searching badges...',
    ja: 'バッジを検索中...',
  },
  invalidSearchQuery: {
    en: 'Please enter a valid npub or Badge ID (no spaces).',
    ja: '有効なnpubまたはバッジID（空白文字は不可）を入力してください。',
  },
};

function createI18nStore() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  const storedLang: Language = stored === 'en' || stored === 'ja' ? stored : 'en';

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
