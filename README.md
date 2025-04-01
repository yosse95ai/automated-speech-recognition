# MainApp - VPC with Private Subnet and EC2 Instance Connect

このCDKプロジェクトでは、以下のリソースを作成します：

1. プライベートサブネットのみを持つ2つのVPC（各VPCに2つのAZ）：
   - メインVPC：EC2インスタンスを含む
   - API VPC：将来のAPIリソース用
2. メインVPCとAPI VPC間のVPCピアリング接続
3. メインVPC内のプライベートサブネットにEC2インスタンス
4. EC2インスタンスコネクトエンドポイント（インスタンスへの接続用）

## アーキテクチャ構成図

![architecture](./architecture.png)

## デプロイ方法

```bash
# 依存関係のインストール
npm install

# TypeScriptのコンパイルとデプロイ
npm run cdk:deploy
```

または、ホットスワップデプロイを使用する場合：

```bash
npm run cdk:deploy:hotswap
```

## EC2インスタンスへの接続方法

デプロイ後、以下のコマンドでEC2インスタンスに接続できます：

```bash
# CDK出力からインスタンスIDとエンドポイントIDを取得
INSTANCE_ID=<出力から取得したインスタンスID>
ENDPOINT_ID=<出力から取得したエンドポイントID>

# EC2インスタンスコネクトを使用して接続
aws ec2-instance-connect ssh \
    --instance-id $INSTANCE_ID \
    --eice-options maxTunnelDuration=3600,endpointId=$ENDPOINT_ID \
    --os-user ec2-user 
```

## アーキテクチャの特徴

- **セキュリティ**: インターネットからの直接アクセスができないプライベートサブネットにEC2インスタンスを配置
- **接続性**: EC2インスタンスコネクトエンドポイントを使用して、インターネットゲートウェイやNATゲートウェイなしでもインスタンスに安全に接続可能
- **VPCピアリング**: メインVPCとAPI VPC間の通信を可能にする
- **コスト効率**: NATゲートウェイを使用しないため、コストを削減
- **モジュール性**: コンストラクトを使用して、コードの再利用性と保守性を向上
