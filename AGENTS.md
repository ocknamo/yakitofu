# AGENTS.md

AIエージェント向けプロジェクトガイド

## 概要

**Yakitofu（やきとーふ）** は、Nostrプロトコルの[NIP-58](https://github.com/nostr-protocol/nips/blob/master/58.md)バッジシステムを実装したWebアプリケーションです。ユーザーはバッジを定義（kind 30009）し、他のユーザーにバッジを授与（kind 8）できます。認証はNIP-07ブラウザ拡張機能（`window.nostr`）を使用します。

アプリのディレクトリは `yakitofu-app/` です。以下のコマンドはすべてそのサブディレクトリで実行してください。

### 主な機能

- **NIP-07認証**: ブラウザ拡張機能による安全なログイン
- **バッジ定義作成**: カスタムバッジの作成と管理（kind 30009）
- **バッジ付与**: npub形式でユーザーにバッジを授与（kind 8）
- **プロフィールバッジ管理**: 受け取ったバッジをプロフィールに表示（kind 10008）
- **バッジ検索**: バッジID（dTag）またはnpubでバッジ・ユーザーを検索
- **OGP対応**: バッジ・ユーザーページごとにSSRでOGPメタタグを動的生成
- **リレー管理**: カスタムリレーサーバーの追加・削除
- **多言語対応**: 日本語・英語の切り替え（i18nストア実装）
- **画像プレビュー**: バッジ画像の検証とプレビュー（推奨1024x1024px）

## 使用スタック

### コア技術

- **フレームワーク**: SvelteKit 2 + **@sveltejs/adapter-cloudflare** — SSR対応ファイルベースルーティング。Cloudflare Pages + Workersにデプロイ
- **UIライブラリ**: Svelte 5（Runes構文: `$state()`, `$derived()`, `$effect()`）。`stores/` 配下は `writable`/`derived`（svelte/store）によるハイブリッド方式
- **言語**: TypeScript（strictモード）
- **ビルドツール**: Vite 7 + `@tailwindcss/vite` プラグイン
- **スタイリング**: Tailwind CSS 4

### Nostr関連

- **rx-nostr**: RxJSベースのリアクティブなNostrリレー通信（クライアントサイドのみ）
- **rx-nostr-crypto**: 暗号化・署名処理

### 開発ツール

- **Biome**: リント・フォーマット（ESLint/Prettierは使用しない）
- **svelte-check**: Svelte型チェック
- **Vitest**: テストランナー

### Node.js環境

- Node.js 22以上（Voltaで24.13.1を固定）

## コマンド

```bash
cd yakitofu-app

npm run dev          # 開発サーバー起動（http://localhost:5173）
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
npx vitest run src/lib/utils/badgeTagBuilder.spec.ts
```

## 変更後の検証（必須）

コード変更後は以下をすべて実行して問題がないことを確認する：

```bash
cd yakitofu-app

npm run check        # 型チェック
npm run lint         # リント
npm run build        # ビルド
npm run test         # テスト
```

## アーキテクチャ

### ルーティング（`src/routes/`）

SvelteKitのファイルベースルーティングを使用。旧ハッシュURL（`#/badge/...`）は `+layout.svelte` でパスベースURLにリダイレクトされる。

| URL | ファイル | 説明 |
|-----|---------|------|
| `/` | `+page.svelte` | ホーム（バッジ作成・付与・設定タブ） |
| `/badge/[id]` | `badge/[id]/+page.svelte` | バッジ詳細。`id` = `npub1xxx:encodedDTag` |
| `/user/[npub]` | `user/[npub]/+page.svelte` | ユーザープロフィール |
| `/search/[query]` | `search/[query]/+page.svelte` | バッジ検索結果 |

**SSR（OGP対応）：**
- `badge/[id]/+page.server.ts` — サーバー側でバッジ定義（kind 30009）を取得し、バッジ名・説明・画像をOGPメタタグに設定
- `user/[npub]/+page.server.ts` — サーバー側でユーザープロフィール（kind 0）を取得し、ユーザー名・アイコンをOGPメタタグに設定
- SSR取得失敗時（リレー接続エラー・タイムアウト）はデフォルトOGPにフォールバック

### 主なアーキテクチャパターン

**サーバーサイドユーティリティ（`src/lib/server/`）**：
- `nostrFetch.ts` — Cloudflare Workers環境で動作する軽量WebSocket Nostrクライアント。ブラウザ固有API（IndexedDB・window.nostr）不使用。`fetchBadgeDefinitionSSR()` と `fetchUserProfileSSR()` を提供する

**Nostrサービス（`src/lib/services/`）**：クライアントサイド専用
- `nostr.ts` — モジュールレベルのシングルトンとして `rxNostr` インスタンスを `connectionStrategy: 'aggressive'` で初期化。`publishEvent()` でイベント送信、`subscribeToEvents()` でライブ購読、`fetchPastEvents()` で過去イベント取得（backward req）。さらに `getUserBadgeDefinitions()`、`getBadgeDefinition()`、`getBadgeAwardees()`、`getUserReceivedBadgeAwards()`、`getUserProfiles()`、`searchBadgesByDTag()`、`waitForConnection()`、`cleanup()` も提供する
- `badgeDefinitionResolver.ts` — メモリ → IndexedDB → リレーの3層キャッシュでバッジ定義（kind 30009）を取得する
- `badgeAwardeeResolver.ts` — 同上の3層キャッシュでバッジ受賞者（kind 8: 特定バッジの授与先）を取得する
- `badgeAwardResolver.ts` — 同上の3層キャッシュでユーザーが受け取ったバッジ（kind 8: 特定ユーザーへの授与）を取得する
- `profileBadgesResolver.ts` — 同上の3層キャッシュでプロフィールバッジ（kind 10008）を取得する
- `profileResolver.ts` — 同上の3層キャッシュ（24時間TTL）でユーザープロフィール（kind 0）を取得する
- `indexedDbCache.ts` — 複数のオブジェクトストアを持つIndexedDBキャッシュDBを管理する

**ストア（`src/lib/stores/`）：**
- `auth.ts` — `authStore` がNIP-07のログイン/ログアウトをラップし、`window.nostr` の存在を確認する
- `relay.ts` — `relayStore` がデフォルト付きのリレーリストを管理。変更時は `+layout.svelte` の `$effect` によりリレーを再初期化する
- `i18n.ts` — `languageStore` と派生した `t` 関数で英語/日本語の翻訳を管理。`localStorage` に言語設定を保存する

**バッジイベントのフロー：**
1. `BadgeDefinitionForm.svelte` が `buildBadgeTags()` でタグを構築 → kind 30009イベントを生成 → `window.nostr.signEvent()` で署名 → `publishEvent()` で公開
2. `BadgeAwardForm.svelte` が受取人のnpubを `npubConverter.ts` でhexに変換 → kind 8イベントを生成 → 署名して公開
3. 両フォームとも `getUserBadgeDefinitions()` のbackward req戦略で既存バッジを取得する

**ユーティリティ（`src/lib/utils/`）：**
- `badgeTagBuilder.ts` — kind 30009イベントの `tags` 配列を構築する
- `badgeEventParser.ts` — kind 30009イベントを `BadgeDefinition` オブジェクトにパース。サムネイルはピクセル面積でソートされる
- `profileBadgesParser.ts` — kind 10008イベントをパースし、プロフィールバッジ情報を取得する
- `userProfileParser.ts` — kind 0イベントを `UserProfile` オブジェクトにパースする
- `npubConverter.ts` — npub↔hex変換のカスタムbech32実装（外部ライブラリなし）
- `validation.ts` — バッジID（空白なし任意Unicode）・URL・WebSocket URL・npub形式のバリデーション
- `imageUtils.ts` — 画像サイズの取得とフォーマット

**Nostr型定義（`src/types/nostr.d.ts`）**：`NostrEvent` と `WindowNostr` インターフェースを定義し、`Window` に `nostr?` プロパティを拡張する。

### サーバーサイドコードの制約

`src/lib/server/` および `+page.server.ts` では以下を使用禁止：
- `rx-nostr`（クライアントサイド専用）
- `IndexedDB`（ブラウザ専用）
- `window.nostr`（ブラウザ専用）

### NIP準拠

- バッジ定義：kind **30009**（パラメータ化可能な置換型）、`d` タグ = バッジID
- バッジ付与：kind **8**、`a` タグでバッジ定義を参照、`p` タグが受取人のhex公開鍵
- プロフィールバッジ：kind **10008**、受け取ったバッジをプロフィールに表示する
- 認証：NIP-07ブラウザ拡張機能のみ（nos2x, Alby等）

## ファイル構成

アプリ本体は `yakitofu-app/src/` 配下。主要ディレクトリ：

- `routes/` — SvelteKitファイルベースルーティング（`+page.svelte` / `+page.server.ts`）
- `lib/server/` — サーバーサイド専用（SSR用軽量Nostrクライアント `nostrFetch.ts`）
- `lib/components/` — UIコンポーネント（PascalCase.svelte）
- `lib/stores/` — Svelteストア（`auth.ts`, `relay.ts`, `i18n.ts`）
- `lib/services/` — クライアント専用ビジネスロジック（rx-nostrシングルトン・3層キャッシュリゾルバー群）
- `lib/utils/` — ユーティリティ・パーサー（テストは `.spec.ts`）
- `types/nostr.d.ts` — `NostrEvent` / `WindowNostr` 型定義

ルート直下：`docs/` にNIP仕様書・rx-nostrドキュメント、`.github/workflows/ci.yml` にCI設定。

## 重要な実装詳細

### Svelte 5 Runesの使用

コンポーネントはSvelte 5の新しいrunes構文を使用する：
- `$state()`: リアクティブな状態管理（`let` での宣言が必須）
- `$derived()`: 派生状態の計算
- `$effect()`: 副作用の実行

`stores/` 配下のみ従来の `writable`/`derived`（svelte/store）APIを使用するハイブリッド方式。

**Biome設定で以下のルールを無効化済み：**
- `noUnusedImports`: テンプレート内の使用を検知できないため
- `noUnusedVariables`: `$state()`変数の誤検知を防止
- `useConst`: `$state()`は`let`での宣言が必須

### NIP-07認証フロー

1. ユーザーがログインボタンをクリック
2. `window.nostr.getPublicKey()` で公開鍵取得
3. `auth.ts` ストアに認証情報を保存
4. イベント署名時は `window.nostr.signEvent()` を使用

### 3層キャッシュパターン

サービス層（`badgeDefinitionResolver.ts` 等）はメモリ → IndexedDB → リレーの順でデータを取得する：
1. **メモリキャッシュ**: `BehaviorSubject` ベースのインメモリキャッシュ（TTL付き）
2. **IndexedDBキャッシュ**: `indexedDbCache.ts` による永続キャッシュ
3. **リレー取得**: `nostr.ts` 経由でNostrリレーからフェッチ

### rx-nostrの基本パターン

```typescript
import { createRxNostr } from 'rx-nostr';

const rxNostr = createRxNostr({ connectionStrategy: 'aggressive' });
rxNostr.setRelays(relays);

// イベント送信
rxNostr.send(event).subscribe({
  next: (packet) => console.log('Success:', packet),
  error: (err) => console.error('Error:', err)
});
```

### バリデーション

- バッジID: 空白文字を含まない任意のUnicode文字（絵文字含む）、または空文字列
- npub形式の検証: `utils/npubConverter.ts`
- 画像サイズ: 1024x1024px推奨

## コードスタイル（Biome）

- シングルクォート、インデント2スペース、最大行幅100文字、末尾カンマ（ES5スタイル）
- インポートはBiome assistにより自動整理される
- テストファイルは `.spec.ts` 拡張子を使用

## デプロイ

Cloudflare Pages + Workersにデプロイ。GitHubリポジトリとCloudflare Pagesを連携し、`main` ブランチへのpush時に自動ビルド・デプロイ。

**Cloudflare Pagesビルド設定：**
- Root directory: `yakitofu-app`
- Build command: `npm run build`
- Build output directory: `.svelte-kit/cloudflare`

CIはNode.js 22.xと24.xで実行。Voltaが `package.json` でNode.js 24.13.1を固定している。

---

**最終更新**: 2026/04/10
**Node.js**: 22+
