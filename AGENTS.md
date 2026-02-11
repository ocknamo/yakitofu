# AGENTS.md

AIエージェント向けプロジェクトガイド

## 概要

**Yakitofu（やきとーふ）** は、Nostrプロトコルの[NIP-58](https://github.com/nostr-protocol/nips/blob/master/58.md)バッジシステムを実装したWebアプリケーションです。ユーザーはバッジを定義（kind 30009）し、他のユーザーにバッジを授与（kind 8）できます。

### 主な機能
- **NIP-07認証**: ブラウザ拡張機能による安全なログイン
- **バッジ定義作成**: カスタムバッジの作成と管理
- **バッジ付与**: npub形式でユーザーにバッジを授与
- **リレー管理**: カスタムリレーサーバーの追加・削除
- **多言語対応**: 日本語・英語の切り替え（i18nストア実装）
- **画像プレビュー**: バッジ画像の検証とプレビュー（推奨1024x1024px）

### プロジェクトの特徴
- Svelte 5のrunes構文（`$state()`, `$derived()`, `$effect()`）を使用
- rx-nostrによる非同期イベント処理
- Tailwind CSS v4によるスタイリング
- TypeScript完全対応

## 使用スタック

### コア技術
- **フレームワーク**: Svelte 5.45.2 + TypeScript 5.9.3
- **ビルドツール**: Vite 7.3.1
- **スタイリング**: Tailwind CSS 4.1.18 + @tailwindcss/forms

### Nostr関連
- **rx-nostr**: 3.6.2（Nostrクライアント・リレー通信）
- **rx-nostr-crypto**: 3.1.3（暗号化・署名処理）

### 開発ツール
- **Biome**: 2.3.14（リント・フォーマット）
- **svelte-check**: 4.3.4（型チェック）
- **Vitest**: 4.0.18（テストランナー）

### Node.js環境
- Node.js 18以上推奨
- npm パッケージマネージャー

## 主要なドキュメントの場所

### プロジェクトドキュメント
```
/yaki-tofu-app/README.md          # アプリケーションの基本説明・使い方
/docs/SVELTE_INIT.md              # Svelteプロジェクトのセットアップ手順
/AGENTS.md                        # 本ファイル（AI向けガイド）
```

### NIP仕様書
```
/docs/nips/                       # Nostr Implementation Possibilities仕様
  - NIP-58: バッジ定義・授与・表示の仕様
  - NIP-07: ブラウザ拡張機能による署名
```

### rx-nostr関連
```
/docs/rx-nostr/                   # rx-nostrライブラリのドキュメント
```

### 設定ファイル
```
/yaki-tofu-app/package.json       # 依存関係とスクリプト
/yaki-tofu-app/biome.json         # Biome設定（Svelte 5対応済み）
/yaki-tofu-app/vite.config.ts     # Viteビルド設定
/yaki-tofu-app/tsconfig.json      # TypeScript設定
/yaki-tofu-app/svelte.config.js   # Svelte設定
```

## ファイル構成

```
yaki-tofu/
├── AGENTS.md                     # 本ファイル
├── .gitignore                    # Git除外設定（ルート）
├── docs/                         # ドキュメント
│   ├── SVELTE_INIT.md           # Svelteセットアップガイド
│   ├── nips/                    # NIP仕様書
│   └── rx-nostr/                # rx-nostrドキュメント
│
└── yaki-tofu-app/               # メインアプリケーション
    ├── package.json             # 依存関係定義
    ├── vite.config.ts           # Viteビルド設定
    ├── tsconfig.json            # TypeScript設定
    ├── biome.json               # Biome設定
    ├── index.html               # エントリーポイント
    ├── README.md                # アプリREADME
    ├── LICENSE                  # MITライセンス
    │
    ├── public/                  # 静的ファイル
    │   ├── vite.svg
    │   └── yakitofu.svg         # アプリアイコン
    │
    └── src/                     # ソースコード
        ├── main.ts              # アプリエントリーポイント
        ├── app.css              # Tailwindインポート
        ├── App.svelte           # ルートコンポーネント
        │
        ├── assets/              # SVGアセット
        │   ├── delete.svg
        │   └── lang.svg
        │
        ├── lib/
        │   ├── components/      # UIコンポーネント
        │   │   ├── BadgeDefinitionForm.svelte  # バッジ作成フォーム
        │   │   ├── BadgeAwardForm.svelte       # バッジ授与フォーム
        │   │   ├── LoginButton.svelte          # NIP-07ログインボタン
        │   │   ├── RelaySettings.svelte        # リレー設定UI
        │   │   ├── ImagePreview.svelte         # 画像プレビュー
        │   │   └── LanguageSwitch.svelte       # 言語切替
        │   │
        │   ├── stores/          # Svelteストア
        │   │   ├── auth.ts      # 認証状態管理（NIP-07）
        │   │   ├── relay.ts     # リレー設定管理
        │   │   └── i18n.ts      # 多言語対応ストア
        │   │
        │   ├── services/        # ビジネスロジック
        │   │   └── nostr.ts     # Nostr通信（rx-nostr）
        │   │
        │   └── utils/           # ユーティリティ
        │       ├── imageUtils.ts       # 画像処理
        │       ├── npubConverter.ts    # npub<->hex変換
        │       └── validation.ts       # バリデーション
        │
        └── types/               # 型定義
            └── nostr.d.ts       # Nostr型定義（NIP-07 window.nostr）
```

## 重要な実装詳細

### Svelte 5 Runesの使用
本プロジェクトはSvelte 5の新しいrunes構文を使用しています：
- `$state()`: リアクティブな状態管理
- `$derived()`: 派生状態の計算
- `$effect()`: 副作用の実行

**注意**: Biome設定で以下のルールを無効化済み：
- `noUnusedImports`: テンプレート内の使用を検知できないため
- `noUnusedVariables`: `$state()`変数の誤検知を防止
- `useConst`: `$state()`は`let`での宣言が必須

### NIP-07認証フロー
1. ユーザーがログインボタンをクリック
2. `window.nostr.getPublicKey()`で公開鍵取得
3. `auth.ts`ストアに認証情報を保存
4. イベント署名時は`window.nostr.signEvent()`を使用

### rx-nostrの基本パターン
```typescript
import { createRxNostr } from 'rx-nostr';

const rxNostr = createRxNostr();
rxNostr.setRelays(relays);

// イベント送信
rxNostr.send(event).subscribe({
  next: (packet) => console.log('Success:', packet),
  error: (err) => console.error('Error:', err)
});
```

## タスク実行後のチェックコマンド

### 基本チェック（必須）
```bash
cd yaki-tofu-app

# 依存関係のインストール確認
npm install

# TypeScript型チェック
npm run check

# Biomeによるコード品質チェック
npm run lint

# Biomeフォーマットチェック
npm run format:check

# ビルドテスト
npm run build
```

### 開発サーバー起動
```bash
cd yaki-tofu-app
npm run dev
# ブラウザで http://localhost:5173 を開く
```

### プレビュー（本番ビルドの確認）
```bash
cd yaki-tofu-app
npm run preview
```

### テスト実行
```bash
cd yaki-tofu-app
npm run test
```

### コードの自動修正
```bash
cd yaki-tofu-app

# フォーマットとリント自動修正
npm run format

# またはリントのみ自動修正
npm run lint:fix
```

## 開発時の注意事項

### 1. インポートパスの拡張子
- Svelteファイルは`.svelte`拡張子を明示
- SVGファイルは`.svg`拡張子を明示

### 2. Tailwind CSS v4の特殊構文
- `src/app.css`で`@import "tailwindcss"`を使用
- `@plugin "@tailwindcss/forms"`でフォームスタイル拡張

### 3. NIP-07前提
- ユーザーはNIP-07対応ブラウザ拡張機能が必要（nos2x, Alby等）
- `window.nostr`が存在しない場合のエラーハンドリングを実装

### 4. バリデーション
- バッジID: 英数字とハイフン（`^[a-zA-Z0-9-]+$`）
- npub形式の検証: `utils/npubConverter.ts`
- 画像サイズ: 1024x1024px推奨

## よくあるタスク

### 新しいコンポーネント追加
```bash
# 場所: /yaki-tofu-app/src/lib/components/
# 命名: PascalCase.svelte
# Svelte 5のrunes構文を使用
```

### 新しいストア追加
```bash
# 場所: /yaki-tofu-app/src/lib/stores/
# writable, derived等のsvelte/storeを使用
```

### 多言語対応の追加
```typescript
// src/lib/stores/i18n.ts を編集
// 日本語と英語の両方を追加
```

### リレーのデフォルト変更
```typescript
// src/lib/stores/relay.ts の defaultRelays を編集
```

---

**最終更新**: 2026/02/12  
**対象バージョン**: yaki-tofu-app v0.0.0  
**Svelte**: 5.45.2  
**Node.js**: 18+
