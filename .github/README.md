# GitHub Actions CI/CD

このディレクトリには、Yaki-TofuプロジェクトのGitHub Actions CI/CDワークフローが含まれています。

## ワークフロー

### 1. CI (Continuous Integration) - `ci.yml`

**トリガー条件:**
- `main`ブランチへのプッシュ
- `main`ブランチへのプルリクエスト

**実行内容:**
- Node.js 18.x, 20.x, 22.x でのマトリックスビルド
- 依存関係のインストール
- コードフォーマットチェック (`npm run format:check`)
- リント (`npm run lint`)
- 型チェック (`npm run check`)
- ビルド (`npm run build`)
- テスト実行 (`npm run test`)

### 2. CD (Continuous Deployment) - `deploy.yml`

**トリガー条件:**
- `main`ブランチへのプッシュ
- 手動実行 (workflow_dispatch)

**実行内容:**
1. **ビルドジョブ:**
   - Node.js 20でビルド
   - GitHub Pages用の成果物をアップロード
   
2. **デプロイジョブ:**
   - GitHub Pagesへデプロイ

**必要な設定:**
- リポジトリの Settings > Pages で GitHub Pages を有効化
- Source を "GitHub Actions" に設定

## デプロイURL

デプロイ後、以下のURLでアクセス可能になります：
- `https://<USERNAME>.github.io/yaki-tofu/`

カスタムドメインを使用する場合は、`yaki-tofu-app/vite.config.ts` の `base` 設定を変更してください。

## ローカルでの確認

CIと同様のチェックをローカルで実行：

```bash
cd yaki-tofu-app

# フォーマットチェック
npm run format:check

# リント
npm run lint

# 型チェック
npm run check

# ビルド
npm run build

# テスト
npm run test
```

## トラブルシューティング

### デプロイが失敗する場合

1. GitHub Pagesが有効化されているか確認
2. リポジトリの Settings > Actions > General で「Read and write permissions」が有効か確認
3. ビルド出力ディレクトリ (`dist`) が正しく生成されているか確認

### ベースパスの設定

GitHub Pagesへのデプロイ時、アプリは `/yaki-tofu/` パスでホストされます。  
`vite.config.ts` で以下の設定が行われています：

```typescript
base: process.env.NODE_ENV === 'production' ? '/yaki-tofu/' : '/',
```

カスタムドメインを使用する場合は、この設定を `/` に変更してください。
