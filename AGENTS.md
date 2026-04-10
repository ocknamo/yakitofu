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

SvelteKitのファイルベースルーティング。旧ハッシュURL（`#/badge/...`）は `+layout.svelte` でパスベースURLにリダイレクト。

| URL | 説明 |
|-----|------|
| `/` | ホーム（バッジ作成・付与・設定タブ） |
| `/badge/[id]` | バッジ詳細。`id` = `npub1xxx:encodedDTag` |
| `/user/[npub]` | ユーザープロフィール |
| `/search/[query]` | バッジ検索結果 |

`badge/[id]/+page.server.ts`、`user/[npub]/+page.server.ts` でSSR時にOGPメタタグを生成。取得失敗時はデフォルトOGPにフォールバック。

### サービス層（`src/lib/services/`）

クライアントサイド専用。`nostr.ts` が rx-nostr シングルトンとしてリレー通信を担う。各リゾルバー（`badgeDefinitionResolver.ts` 等）はメモリ → IndexedDB → リレーの3層キャッシュでデータを取得する。`indexedDbCache.ts` がキャッシュDBを管理。

### サーバーサイド（`src/lib/server/`）

`nostrFetch.ts` は Cloudflare Workers 環境向けの軽量 WebSocket Nostr クライアント。`rx-nostr`・IndexedDB・`window.nostr` は使用不可。

### NIP準拠

- kind **30009**: バッジ定義（`d` タグ = バッジID）
- kind **8**: バッジ付与（`a` タグでバッジ参照、`p` タグが受取人hex公開鍵）
- kind **10008**: プロフィールバッジ
- 認証: NIP-07ブラウザ拡張機能のみ（nos2x, Alby等）

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
