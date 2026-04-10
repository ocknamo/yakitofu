# Yakitofu

NIP-58 Badge Creation & Award Application

## 概要

Yakitofuは、Nostrプロトコルの[NIP-58](https://github.com/nostr-protocol/nips/blob/master/58.md)に準拠したバッジ作成・付与アプリケーションです。SvelteKit SSRにより、バッジ・ユーザーページごとにOGPメタタグを動的生成し、Cloudflare Pages + Workersにデプロイされます。

## 機能

- **NIP-07ログイン**: ブラウザ拡張機能を使用した安全なログイン
- **バッジ定義作成**: kind 30009イベントでバッジを定義
- **バッジ付与**: kind 8イベントでユーザーにバッジを授与
- **プロフィールバッジ管理**: 受け取ったバッジをプロフィールに表示・管理（kind 10008）
- **バッジ検索**: バッジID（dTag）またはnpubでバッジ・ユーザーを検索
- **バッジ詳細ページ**: バッジの詳細情報と受賞者一覧を表示
- **ユーザーページ**: 指定ユーザーが定義したバッジ一覧を表示
- **OGP対応**: SSRでバッジ名・説明・画像を各ページのOGPメタタグに設定
- **画像プレビュー**: バッジ画像のプレビューとサイズ検証（推奨: 1024x1024px）
- **リレー設定**: カスタムリレーの追加・削除
- **多言語対応**: 日本語・英語の切り替え

## 技術スタック

- **フレームワーク**: SvelteKit 2 + @sveltejs/adapter-cloudflare
- **UIライブラリ**: Svelte 5（Runes構文）
- **言語**: TypeScript（strictモード）
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS 4
- **Nostrライブラリ**: rx-nostr, rx-nostr-crypto（クライアントサイド）
- **コード品質**: Biome（フォーマット・リント）
- **テスト**: Vitest

## セットアップ

### 前提条件

- Node.js 22以上（Voltaで24.13.1を固定）
- NIP-07対応のNostr拡張機能（例: nos2x, Alby, etc.）

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:5173/ を開きます。

### ビルド

```bash
npm run build
```

ビルド成果物は `.svelte-kit/cloudflare/` に出力されます。

### プレビュー

```bash
npm run preview
```

## 使い方

1. **ログイン**: NIP-07拡張機能でログイン
2. **バッジ作成**:
   - バッジID（空白文字を含まない任意の文字列・絵文字も使用可）
   - バッジ名
   - 説明
   - 画像URL
   を入力して作成
3. **バッジ付与**: 作成したバッジを選択し、受取人のnpubを入力して付与
4. **リレー設定**: 必要に応じてカスタムリレーを追加

## URL構造

| ページ | URL |
|--------|-----|
| ホーム | `/` |
| バッジ詳細 | `/badge/npub1xxx:encodedDTag` |
| ユーザー | `/user/npub1xxx` |
| 検索 | `/search/query` |

旧ハッシュURL（`#/badge/...` 等）は自動的に新URLへリダイレクトされます。

## デフォルトリレー

以下のリレーをデフォルトで使用:
- wss://yabu.me
- wss://relay.damus.io
- wss://r.kojira.io
- wss://nostr.bitcoiner.social
- wss://nostr.land
- wss://nostr.mom

## デプロイ

Cloudflare Pages + Workersを使用。GitHubリポジトリと連携し、`main`ブランチへのプッシュ時に自動ビルド・デプロイ。

**Cloudflare Pagesビルド設定:**
- Root directory: `yakitofu-app`
- Build command: `npm run build`
- Build output directory: `.svelte-kit/cloudflare`

## NIP-58について

NIP-58は、Nostrプロトコルでバッジを定義・授与・表示するための仕様です。

- **Badge Definition (kind 30009)**: バッジの定義
- **Badge Award (kind 8)**: バッジの授与
- **Profile Badges (kind 10008)**: プロフィールでのバッジ表示

詳細は [NIP-58仕様](https://github.com/nostr-protocol/nips/blob/master/58.md) を参照してください。

## ライセンス

MIT License

## 開発

### コードフォーマット

```bash
npm run format
```

### リント

```bash
npm run lint
```

### 型チェック

```bash
npm run check
```

### テスト

```bash
npm run test
```

## 貢献

プルリクエストを歓迎します！

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
