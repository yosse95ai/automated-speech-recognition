# transcribe.ps1 ファイル移動と文字化け修正計画

## 目的
1. `transcribe.ps1` ファイルを同じ階層の ps1 フォルダに移動し、参照している箇所も修正する
2. PS1ファイルの文字化け問題を解決するためにエンコーディングを適切に設定する
3. transcribe.ps1 のコメントを日本語から英語に変更する

## 実行ステップ

1. [x] **現在の状態を確認**
   - transcribe.ps1 ファイルの現在の場所: `/packages/cdk/lib/script/transcribe.ps1`
   - 参照している箇所: `/packages/cdk/lib/constructor/onprem/ec2-instance.ts` の `transcribeScriptPath` 変数

2. [x] **transcribe.ps1 ファイルを ps1 フォルダに移動し、エンコーディングを修正**
   - 移動元: `/packages/cdk/lib/script/transcribe.ps1`
   - 移動先: `/packages/cdk/lib/script/ps1/transcribe.ps1`
   - ファイルを UTF-8 (BOMなし) で保存し直す

3. [x] **ec2-instance.ts ファイルの参照パスを更新**
   - 変更前: `const transcribeScriptPath = path.join(__dirname, "../../script", "transcribe.ps1");`
   - 変更後: `const transcribeScriptPath = path.join(__dirname, "../../script/ps1", "transcribe.ps1");`

4. [x] **ec2-instance.ts のユーザーデータスクリプト部分を修正**
   - Windows EC2インスタンスでスクリプトを保存する際のエンコーディング設定を確認
   - 必要に応じて、UTF-8 (BOMなし) でファイルを書き込むように修正
   - 確認の結果、既に `$Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False` と `[System.IO.File]::WriteAllText()` を使用して適切に設定されていました

5. [x] **transcribe.ps1 のコメントを日本語から英語に変更**
   - すべての日本語コメントを英語に翻訳
   - ファイルを UTF-8 (BOMなし) で保存

6. [x] **変更の確認**
   - ファイルが正しく移動されたことを確認
   - 参照パスが正しく更新されたことを確認
   - エンコーディングが適切に設定されていることを確認
   - コメントが英語に変更されていることを確認

## 注意事項
- PowerShellスクリプトは UTF-8 (BOMなし) で保存するのが最適
- Windows環境では、デフォルトでShift-JISやUTF-16が使われることがあるため、明示的にUTF-8を指定する
- EC2インスタンスでのファイル書き込み時にも適切なエンコーディングを指定する
