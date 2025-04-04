# アーキテクチャ図の修正について

このプロジェクトのアーキテクチャ図は以下の構成を反映しています：

1. プライベートサブネットのみを持つ2つのVPC：
   - OnpremVPC：EC2インスタンスを含む（1つのAZ）
   - API VPC：将来のAPIリソース用（2つのAZ）

2. OnpremVPCとAPI VPC間のVPCピアリング接続

3. OnpremVPC内のプライベートサブネットにEC2インスタンス

4. EC2インスタンスコネクトエンドポイント（インスタンスへの接続用）

## アーキテクチャ図の修正方法

1. `architecture.drawio` ファイルを使用して修正
   - [draw.io](https://app.diagrams.net/)で開く
   - または、VS Codeの[Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio)拡張機能を使用

2. 修正後、PNGとして書き出し
   ```bash
   # draw.ioから直接エクスポート
   # または、以下のコマンドでdrawio CLIを使用（インストールされている場合）
   drawio -x -f png -o architecture.png architecture.drawio
   ```

## 現在のアーキテクチャ図の特徴

- プライベートサブネットのみのVPC構成
- EC2インスタンスコネクトエンドポイントによる安全な接続
- VPCピアリングによる2つのVPC間の通信
- インターネットゲートウェイやNATゲートウェイを使用しないコスト効率の良い設計
