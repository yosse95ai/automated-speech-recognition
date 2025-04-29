# EC2 インスタンス接続スクリプト実装計画

## 目的
Windows Server インスタンスへの接続手順を簡略化するために、npm スクリプトを作成する。

## 実装計画

- [x] 1. 現在の package.json の構成を確認
- [x] 2. output.json から必要なコマンドを確認
- [x] 3. 以下の npm スクリプトを package.json に追加
  - [x] `debug:get-pem`: 01GetOnpremKeyPairName コマンドを実行して PEM ファイルを取得
  - [x] `debug:pw`: 02OnpremGetPasswordCommand コマンドを実行してパスワードを取得
  - [x] `debug:rdp`: 03OnpremRdpTunnelCommand コマンドを実行して RDP トンネルを確立
- [x] 4. スクリプトの動作確認

## 実装内容

package.json に以下のスクリプトを追加しました：

```json
"debug:get-pem": "node -e \"const output = require('./packages/cdk/output.json'); const cmd = output.S3AsrStack['01GetOnpremKeyPairName']; console.log(cmd); require('child_process').execSync(cmd, {stdio: 'inherit'});\"",
"debug:pw": "node -e \"const output = require('./packages/cdk/output.json'); const cmd = output.S3AsrStack['02OnpremGetPasswordCommand']; console.log(cmd); require('child_process').execSync(cmd, {stdio: 'inherit'});\"",
"debug:rdp": "node -e \"const output = require('./packages/cdk/output.json'); const cmd = output.S3AsrStack['03OnpremRdpTunnelCommand']; console.log(cmd); require('child_process').execSync(cmd, {stdio: 'inherit'});\""
```

これにより、以下のコマンドで簡単に EC2 インスタンスに接続できるようになります：

1. `npm run debug:get-pem` - キーペアを取得
2. `npm run debug:pw` - Windows パスワードを取得
3. `npm run debug:rdp` - RDP トンネルを確立

その後、RDP クライアントで localhost:13389 に接続することで Windows Server インスタンスにアクセスできます。
