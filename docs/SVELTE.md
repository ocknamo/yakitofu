# シンプルなsvleteアプリケーションのセットアップ手順

チェックに失敗した場合は通るまで繰り返し修正を行う

## 1. 準備

```
# .git がない場合
git init
git branch -m main

# Nodejs, npm を最新化する

volta install node@24
```

## 2.Viteによるセットアップ


```
# app-nameが不明な場合はユーザに確認する
npm create vite@latest app-name -- --template svelte-ts --no-interactive
```

### チェック

```
npm run build
npm run check
```


## linter

biomeを使用する

```
# Install
npm install --save-dev --save-exact @biomejs/biome

# 設定
npx @biomejs/biome init
```

### 設定例

$schemaなどは生成されたテンプレートから変更しなくてよい。
他の設定値は修正して以下のように設定する。

```json
{
  "$schema": "<url>",
  "organizeImports": {
    "enabled": true
  },
  "files": {
    "include": ["./src/*", "./examples/*"],
    "ignore": [
      "./dist",
      "./node_modules"
    ]
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "useLiteralKeys": "off"
      },
      "correctness": {
        "useImportExtensions": {
          "level": "error",
          "options": {
            "suggestedExtensions": {
              "ts": {
                "module": "js",
                "component": "js"
              }
            }
          }
        }
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  }
}
```


以下のスクリプトをpackage.jsonに設定

```
    "format": "biome format --write && biome check --write",
    "format:check": "biome check ./src",
    "lint": "biome check",
    "lint:fix": "biome check --write",
```

以下を実行してフォーマットができることを確認してください

```
npm run format
```

### チェック

```
npm run build
npm run check
npm run format:check
npm run lint:check
```

