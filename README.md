# S3Arc - VPC with Private Subnet, EC2 Instance Connect, and S3 VPC Endpoint

このCDKプロジェクトでは、以下のリソースを作成します：

1. プライベートサブネットのみを持つ2つのVPC：
   - OnpremVPC：EC2インスタンスを含む（1つのAZ）
   - API VPC：将来のAPIリソース用（2つのAZ）
2. OnpremVPCとAPI VPC間のVPCピアリング接続
3. OnpremVPC内のプライベートサブネットにEC2インスタンス
4. EC2インスタンスコネクトエンドポイント（インスタンスへの接続用）
5. API VPC内のS3インターフェースVPCエンドポイント
6. VPCエンドポイント経由でのみアクセス可能なS3バケット

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

## S3バケットへのアクセス

S3バケットには、API VPC内のS3インターフェースVPCエンドポイント経由でのみアクセスできます。
バケットポリシーにより、指定されたVPCエンドポイントからのアクセスのみが許可されています。

## アーキテクチャの特徴

- **セキュリティ**: インターネットからの直接アクセスができないプライベートサブネットにEC2インスタンスを配置
- **接続性**: EC2インスタンスコネクトエンドポイントを使用して、インターネットゲートウェイやNATゲートウェイなしでもインスタンスに安全に接続可能
- **VPCピアリング**: OnpremVPCとAPI VPC間の通信を可能にする
- **S3プライベートアクセス**: VPCエンドポイント経由でのみS3バケットにアクセス可能
- **コスト効率**: NATゲートウェイを使用しないため、コストを削減
- **モジュール性**: コンストラクトを使用して、コードの再利用性と保守性を向上
