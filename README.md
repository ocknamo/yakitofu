# Yakitofu

**Nostr NIP-58 Badge Creation & Award Application**

Yakitofuは、Nostrプロトコルの[NIP-58](https://github.com/nostr-protocol/nips/blob/master/58.md)バッジシステムを実装したWebアプリケーションです。ユーザーはバッジを定義し、他のユーザーにバッジを授与できます。

## 主な機能

- **NIP-07認証**: ブラウザ拡張機能による安全なログイン
- **バッジ定義作成**: カスタムバッジの作成と管理（kind 30009）
- **バッジ付与**: npub形式でユーザーにバッジを授与（kind 8）
- **リレー管理**: カスタムリレーサーバーの追加・削除
- **多言語対応**: 日本語・英語の切り替え
- **画像プレビュー**: バッジ画像の検証とプレビュー（推奨1024x1024px）

## クイックスタート

### 前提条件

- Node.js 18以上
- NIP-07対応のNostr拡張機能（nos2x, Alby等）

### セットアップと起動

```bash
# リポジトリのクローン
git clone https://github.com/ocknamo/yakitofu.git
cd yakitofu

# アプリケーションディレクトリに移動
cd yakitofu-app

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:5173 を開いてください。

## プロジェクト構成

```
yakitofu/
├── README.md                    # 本ファイル（プロジェクト概要）
├── AGENTS.md                    # AIエージェント向けガイド
├── .gitignore                   # Git除外設定
│
├── docs/                        # ドキュメント
│   ├── SVELTE_INIT.md          # Svelteプロジェクトセットアップガイド
│   ├── nips/                   # Nostr Implementation Possibilities仕様書
│   └── rx-nostr/               # rx-nostrライブラリのドキュメント
│
├── .github/                     # GitHub設定
│   ├── workflows/              # GitHub Actions CI/CD
│   │   ├── ci.yml             # テスト・ビルド自動化
│   │   └── deploy.yml         # GitHub Pagesデプロイ
│   └── README.md               # GitHub Actions説明
│
└── yakitofu-app/               # メインアプリケーション
    ├── README.md               # アプリ固有のREADME
    ├── package.json            # 依存関係とスクリプト
    ├── vite.config.ts          # Viteビルド設定
    ├── biome.json              # Biomeリント・フォーマット設定
    ├── src/                    # ソースコード
    │   ├── lib/
    │   │   ├── components/     # UIコンポーネント
    │   │   ├── stores/         # 状態管理（auth, relay, i18n）
    │   │   ├── services/       # Nostr通信サービス
    │   │   └── utils/          # ユーティリティ関数
    │   └── types/              # TypeScript型定義
    └── public/                 # 静的ファイル
```

## 技術スタック

### コア技術
- **Svelte 5.45.2** - Runes構文（`$state()`, `$derived()`, `$effect()`）
- **TypeScript 5.9.3** - 型安全な開発
- **Vite 7.3.1** - 高速ビルドツール
- **Tailwind CSS 4.1.18** - ユーティリティファーストCSS

### Nostr関連
- **rx-nostr 3.6.2** - Nostrクライアント・リレー通信
- **rx-nostr-crypto 3.1.3** - 暗号化・署名処理

### 開発ツール
- **Biome 2.3.14** - リント・フォーマット
- **Vitest 4.0.18** - テストランナー
- **svelte-check 4.3.4** - Svelte型チェック

## ドキュメント

- **[yakitofu-app/README.md](./yakitofu-app/README.md)** - アプリケーションの詳細な使い方
- **[AGENTS.md](./AGENTS.md)** - AIエージェント向けの開発ガイド
- **[docs/SVELTE_INIT.md](./docs/SVELTE_INIT.md)** - Svelteプロジェクトのセットアップ手順
- **[.github/README.md](./.github/README.md)** - CI/CDパイプラインの説明
- **[NIP-58仕様](https://github.com/nostr-protocol/nips/blob/master/58.md)** - バッジシステムの公式仕様

## 開発コマンド

```bash
cd yakitofu-app

# 開発サーバー起動
npm run dev

# TypeScript型チェック
npm run check

# リント実行
npm run lint

# フォーマット確認
npm run format:check

# フォーマット自動修正
npm run format

# テスト実行
npm run test

# ビルド
npm run build

# プレビュー（本番ビルド確認）
npm run preview
```

## デプロイ

GitHub Pagesへのデプロイは、`main`ブランチへのプッシュ時に自動的に実行されます。

詳細は [.github/README.md](./.github/README.md) を参照してください。

## 貢献

プルリクエストを歓迎します！以下の手順で貢献できます：

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### コーディング規約

- Svelte 5のrunes構文を使用
- Biomeのルールに従う（`npm run lint`で確認）
- TypeScript型定義を明示的に記述
- コンポーネントはPascalCase命名

## NIP-58について

NIP-58は、Nostrプロトコルでバッジを定義・授与・表示するための仕様です：

- **Badge Definition (kind 30009)**: バッジの定義
- **Badge Award (kind 8)**: バッジの授与
- **Profile Badges (kind 30008)**: プロフィールでのバッジ表示

詳細は [NIP-58仕様書](https://github.com/nostr-protocol/nips/blob/master/58.md) を参照してください。

## ライセンス

MIT License - 詳細は [yakitofu-app/LICENSE](./yakitofu-app/LICENSE) を参照してください。

## 問題報告

バグや機能要望は [GitHub Issues](https://github.com/ocknamo/yakitofu/issues) で報告してください。

## 作者

[@ocknamo](https://github.com/ocknamo)

---

**最終更新**: 2026/02/12  
**バージョン**: v0.0.0  
**Node.js**: 22+
