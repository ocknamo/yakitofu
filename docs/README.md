# docs/

このフォルダは GitHub Pages のソースとして使用します。  
アプリ本体（`yakitofu-app/`）は [yakitofu.org](https://yakitofu.org/) に移転したため、旧 URL からのリダイレクト専用ページを配置しています。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | `ocknamo.github.io/yakitofu/` へのアクセスを `yakitofu.org/` にリダイレクト |
| `404.html` | サブパスへのアクセスをパスを保持して転送（例: `/yakitofu/badge/xxx` → `yakitofu.org/badge/xxx`） |
| `.nojekyll` | GitHub Pages の Jekyll 処理を無効化 |

## リダイレクト先

| 旧 URL | 新 URL |
|---|---|
| `ocknamo.github.io/yakitofu/` | `yakitofu.org/` |
| `ocknamo.github.io/yakitofu/badge/xxx` | `yakitofu.org/badge/xxx` |
| `ocknamo.github.io/yakitofu/user/npub1xxx` | `yakitofu.org/user/npub1xxx` |
| `ocknamo.github.io/yakitofu/search/foo` | `yakitofu.org/search/foo` |

## GitHub Pages の設定

リポジトリの **Settings > Pages** で以下に設定してください：

- Source: `Deploy from a branch`
- Branch: `main` / Folder: `/docs`
