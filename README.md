# Automated Speech Recognition w/ Dify on AWS with CDK

![architecture](doc/architecture.png)

> [!Note]
> `debugMode: false` の場合、API VPC のリソースのみ作成されます。
> `difySetup: true` の場合のみ、NAT インスタンスが作成されます。

> [!Important]
> オンプレミスと接続する場合は、別途 Site-to-Site VPN などの設定をご自身で行なっていただく必要がございます。

## 前提条件
- [Node.js](https://nodejs.org/en/download/) (v18 or newer)
- [docker](https://docs.docker.com/get-docker/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and IAM profile with Administrator policy

## 準備
リポジトリのクローン。

```bash
# 本リポジトリのみクローン
git clone https://github.com/yosse95ai/automated-speech-recognition.git

# もしくは
# Dify on AWS with CDK　のリポジトリも含めてクローン
git clone --recurse-submodules https://github.com/yosse95ai/automated-speech-recognition.git
```

## デプロイ方法

このCDKプロジェクトでは、[packages/bin/app.ts](./packages/cdk/bin/app.ts) のパラメータ設定により、立ち上げるリソースを変更することができます。詳しくは[設定](#設定)を確認ください。

### 設定
[packages/cdk/bin/app.ts](packages/cdk/bin/app.ts) を編集します。この設定により、デプロイされるリソースやその設定が決定します。
```ts
export const props: EnvironmentProps = {
  awsRegion: "ap-northeast-1", // s3asr の構築リージョン
  awsAccount: process.env.CDK_DEFAULT_ACCOUNT!,
  bucketName: "<your-bucket-name>", // オンプレから直接 S3 を呼び出したい場合の指定バケット
  apiVpcCidr: "10.0.0.0/16", // 作成する API　VPC の CIDR
  onpremiseCidr: "10.128.0.0/16", // オンプレの CIDR

  // true if you are deploying and/or setting up a dify package for the first time
  difySetup: false,

  // for debug
  debugMode: false,

  // usecase options
  useTranscribe: false, // 音声書き起こしで Transcribe を利用する場合 (true)
  useBedrockAgents: false, // Bedrock Agents を利用する場合 (true)
  useS3OnpremDirectly: false, // オンプレから直接 S3 を呼び出したい場合 (true)
};
```

> [!Warning]
> S3 バケットの名前は一意なものをつけてください。

#### debugMode: `false` の場合：
以下のリソースが立ち上がります。

1. API VPC (Multi-AZ)：
   - プライベートサブネット: Dify　のリソースと Amazon Transcribe, Amazon S3 の VPC エンドポイントが立ちます。
   - パブリックサブネット: Dify 初回セットアップ用
4. API VPC内のTranscribeインターフェースVPCエンドポイント
5. Dify セットアップ用のNATインスタンス (`difySetup: true` の場合)
   - セットアップ完了後に `false` にすることでNATインスタンスを消去可能
6. DNS通信用のセキュリティグループ

#### debugMode: `true` の場合：
オンプレミス想定の Windows EC2 から 閉域の Dify の動作確認するためのセットアップ方法はこちらをご覧ください。([Windows EC2 インスタンスでデバッグをする方法](doc/WindowsEC2.md))

### デプロイ
設定完了後、以下のコマンドでデプロイします。

```bash
# 依存関係のインストール
npm ci

# bootstrap the AWS account (required only once per account and region)
npx -w packages/cdk cdk bootstrap

# デプロイ
npm run cdk:deploy
```
デプロイ中にエラーが発生した場合は、[エラー対応](#エラー対応)を確認してください。

デプロイが完了すると、[packages/cdk/output.json](packages/cdk/output.json) にデプロイの出力パラメータが保存されます。`ApiVpcApiVpcID**` のようなキーを持つパラメーターは、VPC ID (e.g. `vpc-xxxxxxx`) が記載され、Dify のデプロイ時に利用します。各リソースは基本的に、`s3asr` という prefix が付与されています。

デプロイ完了後、[Dify on AWS with CDK](https://github.com/aws-samples/dify-self-hosted-on-aws) を [Dify のセットアップとデプロイ](#dify-のセットアップとデプロイ)に従ってデプロイします。


### Dify のセットアップとデプロイ
[Dify on AWS with CDK](https://github.com/aws-samples/dify-self-hosted-on-aws) リポジトリをご自身、もしくは[準備](#準備)手順に従いクローンしておきます。

以下のように、[dify-self-hosted-on-aws/bin/cdk.ts](dify-self-hosted-on-aws/bin/cdk.ts)のパラメータを設定します。

```ts
// 上略
export const props: EnvironmentProps = {
  awsRegion: 'ap-northeast-1', // 本プロジェクトをデプロイしたのと同じリージョンに変更
  awsAccount: process.env.CDK_DEFAULT_ACCOUNT!,
  // Set Dify version
  difyImageTag: '1.4.3',
  // Set plugin-daemon version to stable release
  difyPluginDaemonImageTag: '0.1.2-local',

  // 以下を追記します。
  useCloudFront: false,
  internalAlb: true,
  vpcId: "vpc-xxxxxxx" // packages/cdk/output.json に記載の VPC　ID の値
};

const app = new cdk.App();

// 以下略
```

編集完了後、ディレクトリを移動して、以下のコマンドでデプロイを開始します。

```sh
pushd dify-self-hosted-on-aws/
npm ci
npx cdk deploy --all
popd
```

詳しい閉域 Dify のデプロイ方法は、[dify-self-hosted-on-aws #Deploying to a closed network (a.k.a 閉域要件)](https://github.com/aws-samples/dify-self-hosted-on-aws?tab=readme-ov-file#deploying-to-a-closed-network-aka-%E9%96%89%E5%9F%9F%E8%A6%81%E4%BB%B6) をご確認ください。


## エラー対応
### EC2 Instance (NAT Instance) のデプロイに失敗した場合
AWS アカウントによっては、Validation エラーが発生する場合があります。お手数ですが、1度スタックを全て削除してから数分間隔を空けてデプロイを再実行してください。

```
14:55:32 | CREATE_FAILED        | AWS::EC2::Instance                     | ApiVpcApiVPCapipub...atInstanceD7D61BFE
Resource handler returned message: "Your request for accessing resources in this region is being validated, and you will not be able to launch add
itional resources in this region until the validation is complete. We will notify you by email once your request has been validated. While normall
y resolved within minutes, please allow up to 4 hours for this process to complete. If the issue still persists, then open a support case.
[https://support.console.aws.amazon.com/support/home?region=us-east-1#/case/create?issueType=customer-service&serviceCode=account-management&categ
oryCode=account-verification] (Service: Ec2, Status Code: 400, Request ID: 1afaae05-99a3-4c7f-83f8-da3aeec73ed2) (SDK Attempt Count: 2)" (RequestT
oken: aef78f85-5dea-3c42-7d9b-bcfa46247bd0, HandlerErrorCode: InvalidRequest)
```

## 閉域網の S3 へのアップロードがタイムアウトになる
閉域を想定している場合、S3へアクセスする端末から、S3 の名前解決結果が VPC エンドポイントになっていること確認してください。[# Windows (PowerShell)>>](#windows-powershell)

名前解決結果としてグローバル IP が返却されている可能性があります。以下のようなグローバル IP が返却される場合は、名前解決の設定をご確認ください。

(※デバッグモードの場合 DHCP オプションの反映まで数分かかります。)

```
> nslookup s3.ap-northeast-1.amazonaws.com

サーバー:  ip-10-128-0-2.ap-northeast-1.compute.internal
Address:  10.128.0.2

名前:    s3.ap-northeast-1.amazonaws.com
Addresses:  3.5.156.34
	  52.219.136.240
	  3.5.158.89
	  52.219.172.0
	  52.219.162.48
	  3.5.158.16
	  52.219.162.108
	  52.219.151.116 
```

## ライセンス
このプロジェクトは MIT-0 ライセンスの下で公開されています。詳細は [LICENSE](./LICENSE) ファイルをご覧ください。
