# Automated Speech Recognition w/ Dify on AWS with CDK

![architecture](doc/img/architecture.svg)

> [!Note]
> `debugMode: false` の場合、API VPC のリソースのみ作成されます。
> `difySetup: true` の場合のみ、NAT インスタンスが作成されます。

> [!Important]
> オンプレミスと接続する場合は、別途 Site-to-Site VPN などの設定をご自身で行なっていただく必要がございます。

> [!Caution]
> 本リポジトリを利用して発生した損害に対しましては、一切の責任を負いかねます。

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

### パラメーター設定
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
  useR53ResolverEndpoint: true, // Route 53 resolver inbound endpoint を利用する場合 (true)
  useInternalNlb: false, // ALB の前段に NLB を設ける場合 (true)
};
```

> [!Warning]
> S3 バケットの名前は一意なものをつけてください。

[アーキテクチャ](doc/img/architecture.svg)右側の VPC (API VPC) に以下のリソースが立ち上がります。

- プライベートサブネット
  - Dify　のリソースと Amazon Bedrock VPC エンドポイント
  - Route 53 Resolver インバウンドエンドポイント (`useR53ResolverEndpoint: true`)
  - Amazon Transcribe インターフェース VPC エンドポイント (`useTranscribe: true`)
  - Systems Manager Session Manager インターフェース VPC エンドポイント (`debugMode: true`)
  - S3 インターフェース VPC エンドポイント (`useS3OnpremDirectly: true`)
  - Bedrock Agents インターフェース VPC エンドポイント (`useBedrockAgents: true`)
- パブリックサブネット
  - Dify セットアップ用のNATインスタンス (`difySetup: true`)
    - セットアップ完了後に `false` にすることでNATインスタンスを消去可能

![デフォルトアーキテクチャ](./doc/img/asr-default.svg)

> [!Note]
> NLB を利用する必要がある場合は`useInternalNlb: true` を設定する。
> 詳しくはこちらをご覧ください。([Internal NLB for Dify 設定手順書](doc/internal-nlb-setup.md))


`debugMode: true` とすることで、[アーキテクチャ](doc/img/architecture.svg)左側の VPC (Onprem VPC) に以下のリソースが立ち上がります。
- プライベートサブネット
  - EC2 インスタンス (Windows Server 2022)
  - EC2 Instace Connect エンドポイント (RDP 用)
  - VPC Peering (Onpurem VPC -- API VPC)
  
![debugMode: ture](./doc/img/debug-true.svg)

> [!Note]
> オンプレミス想定の Windows EC2 から 閉域の Dify の動作確認するためのセットアップ方法はこちらをご覧ください。([Windows EC2 インスタンスでデバッグをする方法](doc/WindowsEC2.md))

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
  difyImageTag: '1.7.1',
  // Set plugin-daemon version to stable release
  difyPluginDaemonImageTag: '0.2.0-local',

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

![dify-setup](./doc/img/dify-setup.svg)

> [!TIP]
> Dify にアップロード可能なファイルの上限サイズなどを変更する場合は、追加で [dify-self-hosted-on-aws/bin/cdk.ts](dify-self-hosted-on-aws/bin/cdk.ts) ファイルを以下のようにパラメータを設定します。（[参考](https://note.com/gamo_yoshihiro/n/n38562ebcdccb)）
> ```ts
> export const props: EnvironmentProps = {
>   // 上略。以下を設定。
>   additionalEnvironmentVariables: [
>     {
>       key: 'UPLOAD_FILE_SIZE_LIMIT',
>       value: '100',
>     },
>     {
>       key: 'UPLOAD_VIDEO_FILE_SIZE_LIMIT',
>       value: '2000',
>     },
>     {
>       key: 'UPLOAD_AUDIO_FILE_SIZE_LIMIT',
>       value: '1000',
>     },
>     {
>       key: 'TEXT_GENERATION_TIMEOUT_MS',
>       value: '1200000',
>     },
>   ],
> };
> ```

## リソース
- [Windows EC2 インスタンスでデバッグをする方法](doc/WindowsEC2.md)
- [Internal NLB for Dify 設定手順書](doc/internal-nlb-setup.md)
- [Amazon Transcribe を利用して音声書き起こしを行う](doc/useTranscribe.md)

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

## ライセンス
このプロジェクトは MIT-0 ライセンスの下で公開されています。詳細は [LICENSE](./LICENSE) ファイルをご覧ください。
