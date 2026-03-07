# Yakitofu

NIP-58 Badge Creation & Award Application

## 概要

Yakitofuは、Nostrプロトコルの[NIP-58](https://github.com/nostr-protocol/nips/blob/master/58.md)に準拠したバッジ作成・付与アプリケーションです。

## 機能

- **NIP-07ログイン**: ブラウザ拡張機能を使用した安全なログイン
- **バッジ定義作成**: kind 30009イベントでバッジを定義
- **バッジ付与**: kind 8イベントでユーザーにバッジを授与
- **画像プレビュー**: バッジ画像のプレビューとサイズ検証（推奨: 1024x1024px）
- **リレー設定**: カスタムリレーの追加・削除
- **多言語対応**: 日本語・英語の切り替え

## 技術スタック

- **フレームワーク**: Svelte 5 + TypeScript
- **ビルドツール**: Vite
- **Nostrライブラリ**: rx-nostr, rx-nostr-crypto
- **コード品質**: Biome (フォーマット・リント)

## セットアップ

### 前提条件

- Node.js 18以上
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

## デフォルトリレー

以下のリレーをデフォルトで使用:
- wss://yabu.me
- wss://relay.damus.io
- wss://r.kojira.io
- wss://relay.rodbishop.nz
- wss://nostr.bitcoiner.social
- wss://nostr.land
- wss://nostr.mom

## NIP-58について

NIP-58は、Nostrプロトコルでバッジを定義・授与・表示するための仕様です。

- **Badge Definition (kind 30009)**: バッジの定義
- **Badge Award (kind 8)**: バッジの授与
- **Profile Badges (kind 30008)**: プロフィールでのバッジ表示

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

## 貢献

プルリクエストを歓迎します！

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
