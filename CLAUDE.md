# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う際に Claude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要

Yakitofu は NIP-58 準拠の Nostr バッジ作成・付与 Web アプリケーションです。ユーザーはバッジを定義（kind 30009 イベント）し、他のユーザーへ付与（kind 8 イベント）できます。認証は NIP-07 ブラウザ拡張機能（`window.nostr`）を使用します。

アプリのディレクトリは `yakitofu-app/` です。以下のコマンドはすべてそのサブディレクトリで実行してください。

## コマンド

```bash
cd yakitofu-app

npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド（.svelte-kit/cloudflare/ に出力）
npm run preview      # 本番ビルドのローカルプレビュー

npm run check        # svelte-kit sync + TypeScript + svelte-check による型チェック
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
- **SvelteKit 2** + **@sveltejs/adapter-cloudflare**：SSR 対応のファイルベースルーティング。Cloudflare Pages + Workers にデプロイ
- **Svelte 5** のルーン記法（`$state`, `$derived`, `$effect`）をコンポーネントで使用。`stores/` 配下は `writable`/`derived`（svelte/store）による従来のストア API を使用するハイブリッド方式
- **TypeScript**（strict モード）
- **Vite 7** + TailwindCSS 4 + `@tailwindcss/vite` プラグイン
- **rx-nostr**：RxJS ベースのリアクティブな Nostr リレー通信（クライアントサイドのみ）
- **Biome**：リントとフォーマット（ESLint/Prettier は使用しない）

### ルーティング（`src/routes/`）

SvelteKit のファイルベースルーティングを使用。旧ハッシュ URL（`#/badge/...`）は `+layout.svelte` でパスベース URL にリダイレクトされる。

| URL | ファイル | 説明 |
|-----|---------|------|
| `/` | `+page.svelte` | ホーム（バッジ作成・付与・設定タブ） |
| `/badge/[id]` | `badge/[id]/+page.svelte` | バッジ詳細。`id` = `npub1xxx:encodedDTag` |
| `/user/[npub]` | `user/[npub]/+page.svelte` | ユーザープロフィール |
| `/search/[query]` | `search/[query]/+page.svelte` | バッジ検索結果 |

**SSR（OGP 対応）：**
- `badge/[id]/+page.server.ts` — サーバー側でバッジ定義（kind 30009）を取得し、バッジ名・説明・画像を OGP メタタグに設定
- `user/[npub]/+page.server.ts` — サーバー側でユーザープロフィール（kind 0）を取得し、ユーザー名・アイコンを OGP メタタグに設定
- SSR 取得失敗時（リレー接続エラー・タイムアウト）はデフォルト OGP にフォールバック

### 主なアーキテクチャパターン

**サーバーサイドユーティリティ（`src/lib/server/`）**：
- `nostrFetch.ts` — Cloudflare Workers 環境で動作する軽量 WebSocket Nostr クライアント。ブラウザ固有 API（IndexedDB・window.nostr）不使用。`fetchBadgeDefinitionSSR()` と `fetchUserProfileSSR()` を提供する

**Nostr サービス（`src/lib/services/`）**：クライアントサイド専用
- `nostr.ts` — モジュールレベルのシングルトンとして `rxNostr` インスタンスを `connectionStrategy: 'aggressive'` で初期化。`publishEvent()` でイベント送信、`subscribeToEvents()` でライブ購読、`fetchPastEvents()` で過去イベント取得（backward req）。さらに `getUserBadgeDefinitions()`、`getBadgeDefinition()`、`getBadgeAwardees()`、`getUserProfiles()`、`searchBadgesByDTag()`、`waitForConnection()`、`cleanup()` も提供する
- `badgeDefinitionResolver.ts` — メモリ → IndexedDB → リレーの 3 層キャッシュでバッジ定義（kind 30009）を取得する
- `badgeAwardeeResolver.ts` — 同上の 3 層キャッシュでバッジ受賞者（kind 8）を取得する
- `profileResolver.ts` — 同上の 3 層キャッシュ（24 時間 TTL）でユーザープロフィール（kind 0）を取得する
- `indexedDbCache.ts` — 複数のオブジェクトストアを持つ IndexedDB キャッシュ DB を管理する

**ストア（`src/lib/stores/`）：**
- `auth.ts` — `authStore` が NIP-07 のログイン/ログアウトをラップし、`window.nostr` の存在を確認する
- `relay.ts` — `relayStore` がデフォルト付きのリレーリストを管理。変更時は `+layout.svelte` の `$effect` によりリレーを再初期化する
- `i18n.ts` — `languageStore` と派生した `t` 関数で英語/日本語の翻訳を管理。`localStorage` に言語設定を保存する

**バッジイベントのフロー：**
1. `BadgeDefinitionForm.svelte` が `buildBadgeTags()` でタグを構築 → kind 30009 イベントを生成 → `window.nostr.signEvent()` で署名 → `publishEvent()` で公開
2. `BadgeAwardForm.svelte` が受取人の npub を `npubConverter.ts` で hex に変換 → kind 8 イベントを生成 → 署名して公開
3. 両フォームとも `getUserBadgeDefinitions()` の backward req 戦略で既存バッジを取得する

**ユーティリティ（`src/lib/utils/`）：**
- `badgeTagBuilder.ts` — kind 30009 イベントの `tags` 配列を構築する
- `badgeEventParser.ts` — kind 30009 イベントを `BadgeDefinition` オブジェクトにパース。サムネイルはピクセル面積でソートされる
- `userProfileParser.ts` — kind 0 イベントを `UserProfile` オブジェクトにパースする
- `npubConverter.ts` — npub↔hex 変換のカスタム bech32 実装（外部ライブラリなし）
- `validation.ts` — バッジ ID（空白なし任意 Unicode）・URL・WebSocket URL・npub 形式のバリデーション
- `imageUtils.ts` — 画像サイズの取得とフォーマット

**Nostr 型定義（`src/types/nostr.d.ts`）**：`NostrEvent` と `WindowNostr` インターフェースを定義し、`Window` に `nostr?` プロパティを拡張する。

### サーバーサイドコードの制約

`src/lib/server/` および `+page.server.ts` では以下を使用禁止：
- `rx-nostr`（クライアントサイド専用）
- `IndexedDB`（ブラウザ専用）
- `window.nostr`（ブラウザ専用）

### NIP 準拠
- バッジ定義：kind **30009**（パラメータ化可能な置換型）、`d` タグ = バッジ ID
- バッジ付与：kind **8**、`a` タグでバッジ定義を参照、`p` タグが受取人の hex 公開鍵
- 認証：NIP-07 ブラウザ拡張機能のみ

### デプロイ
Cloudflare Pages + Workers にデプロイ。GitHub リポジトリと Cloudflare Pages を連携し、push 時に自動ビルド・デプロイ。

**Cloudflare Pages ビルド設定：**
- Root directory: `yakitofu-app`
- Build command: `npm run build`
- Build output directory: `.svelte-kit/cloudflare`

CI は Node.js 22.x と 24.x で実行。Volta が `package.json` で Node.js 24.13.1 を固定している。

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
