---
inclusion: always
---

# Git Commit Message Conventions

## Language
All commit messages must be written in Japanese (日本語).

## Commit Message Format
Use emoji prefixes to categorize commits:

- 🐛 `:bug:` - バグ修正 (Bug fixes)
- 👍 `:+1:` - 機能改善 (Feature improvements)
- ✨ `:sparkles:` - 部分的な機能追加 (Partial feature additions)
- 🎉 `:tada:` - 盛大に祝うべき大きな機能追加 (Major feature additions)
- ♻️ `:recycle:` - リファクタリング (Refactoring)
- 🚿 `:shower:` - 不要な機能・使われなくなった機能の削除 (Removing deprecated features)
- 💚 `:green_heart:` - テストやCIの修正・改善 (Test/CI fixes and improvements)
- 👕 `:shirt:` - Lintエラーの修正やコードスタイルの修正 (Lint/style fixes)
- 🚀 `:rocket:` - パフォーマンス改善 (Performance improvements)
- 🆙 `:up:` - 依存パッケージなどのアップデート (Dependency updates)
- 🔒 `:lock:` - 新機能の公開範囲の制限 (Feature access restrictions)
- 👮 `:cop:` - セキュリティ関連の改善 (Security improvements)
- 📋 `:clipboard:` - ドキュメント作成・更新 (Documentation)

末尾に `(#Issue number)` として、現在取り組み中のイシュー番号を付与すること。

## Usage
When creating commits, select the appropriate emoji prefix and write the message in Japanese. Example:
```
✨ ユーザー認証機能を追加 (#1)
```