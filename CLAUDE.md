# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う際に Claude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要

Yakitofu は NIP-58 準拠の Nostr バッジ作成・付与 Web アプリケーションです。ユーザーはバッジを定義（kind 30009 イベント）し、他のユーザーへ付与（kind 8 イベント）できます。認証は NIP-07 ブラウザ拡張機能（`window.nostr`）を使用します。

アプリのディレクトリは `yakitofu-app/` です。以下のコマンドはすべてそのサブディレクトリで実行してください。

## コマンド

```bash
cd yakitofu-app

npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド（dist/ に出力）
npm run preview      # 本番ビルドのローカルプレビュー

npm run check        # TypeScript + svelte-check による型チェック
npm run lint         # Biome によるリントチェック
npm run lint:fix     # Biome による自動修正付きリント
npm run format       # Biome によるフォーマット + リント（書き込み）
npm run format:check # Biome によるフォーマットチェックのみ（CI で使用）

npm run test         # 全テストの実行（Vitest、run モード）
```

単一のテストファイルを実行する場合：
```bash
npx vitest run src/lib/utils/badgeTagBuilder.test.ts
```

## アーキテクチャ

### 技術スタック
- **Svelte 5** のルーン記法（`$state`, `$derived`, `$effect`）— Svelte 4 のストアベースのリアクティビティ構文は使用しない
- **TypeScript**（strict モード）
- **Vite 7** + TailwindCSS 4 + `@tailwindcss/vite` プラグイン
- **rx-nostr**：RxJS ベースのリアクティブな Nostr リレー通信
- **Biome**：リントとフォーマット（ESLint/Prettier は使用しない）

### 主なアーキテクチャパターン

**Nostr サービス（`src/lib/services/nostr.ts`）**：モジュールレベルのシングルトンとして `rxNostr` インスタンスを `connectionStrategy: 'aggressive'` で初期化。イベントの送信には `publishEvent()`、過去イベントの取得には backward req 戦略を使った `getUserBadgeDefinitions()`、ライブ購読には `subscribeToEvents()` を使用する。

**ストア（`src/lib/stores/`）：**
- `auth.ts` — `authStore` が NIP-07 のログイン/ログアウトをラップし、`window.nostr` の存在を確認する
- `relay.ts` — `relayStore` がデフォルト付きのリレーリストを管理。変更時は App.svelte の `$effect` によりリレーを再初期化する
- `i18n.ts` — `languageStore` と派生した `t` 関数で英語/日本語の翻訳を管理。`localStorage` に言語設定を保存する

**バッジイベントのフロー：**
1. `BadgeDefinitionForm.svelte` が `buildBadgeTags()` でタグを構築 → kind 30009 イベントを生成 → `window.nostr.signEvent()` で署名 → `publishEvent()` で公開
2. `BadgeAwardForm.svelte` が受取人の npub を `npubConverter.ts` で hex に変換 → kind 8 イベントを生成 → 署名して公開
3. 両フォームとも `getUserBadgeDefinitions()` の backward req 戦略で既存バッジを取得する

**ユーティリティ（`src/lib/utils/`）：**
- `badgeTagBuilder.ts` — kind 30009 イベントの `tags` 配列を構築する
- `badgeEventParser.ts` — kind 30009 イベントを `BadgeDefinition` オブジェクトにパース。サムネイルはピクセル面積でソートされる
- `npubConverter.ts` — npub↔hex 変換のカスタム bech32 実装（外部ライブラリなし）
- `validation.ts` — バッジ ID・URL・WebSocket URL・npub 形式のバリデーション
- `imageUtils.ts` — 画像サイズの取得とフォーマット

**Nostr 型定義（`src/types/nostr.d.ts`）**：`NostrEvent` と `WindowNostr` インターフェースを定義し、`Window` に `nostr?` プロパティを拡張する。

### NIP 準拠
- バッジ定義：kind **30009**（パラメータ化可能な置換型）、`d` タグ = バッジ ID
- バッジ付与：kind **8**、`a` タグでバッジ定義を参照、`p` タグが受取人の hex 公開鍵
- 認証：NIP-07 ブラウザ拡張機能のみ

### デプロイ
GitHub Pages にデプロイ。ベースパスは `/yakitofu/`（`vite.config.ts` 内で `NODE_ENV` によって切り替え）。CI は Node.js 22.x と 24.x で実行。Volta が `package.json` で Node.js 24.13.1 を固定している。

### コードスタイル（Biome）
- シングルクォート、インデント 2 スペース、最大行幅 100 文字、末尾カンマ（ES5 スタイル）
- インポートは Biome assist により自動整理される

## 変更後の検証

コード変更後は以下をすべて実行して問題がないことを確認する：

```bash
cd yakitofu-app

npm run check        # 型チェック
npm run lint         # リント
npm run build        # ビルド
npm run test         # テスト
```
