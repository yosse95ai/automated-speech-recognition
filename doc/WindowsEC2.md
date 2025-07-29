# デバッグモード
以降の手順は、`debugMode: true` の場合の検証方法です。以下のリソースが追加で立ち上がります。（[構成図](./architecture.png)左側相当）

1. OnpremVPC：Private サブネットに Windows Serverインスタンスを含む（1つのAZ）
2. OnpremVPCとAPI VPC間のVPCピアリング接続
3. OnpremVPC内のプライベートサブネットにWindows Serverインスタンス
4. EC2インスタンスコネクトエンドポイント（インスタンスへのRDP接続用）

このモードではデプロイ後に以下を行う必要があります。以下のセットアップをマネジメントコンソール上で行うことにより、検証用 EC2 (Windows Server) から S3 や Transcribe、Dify への VPC を跨いだ通信ができるようになります。

1. Peeringごとのルートテーブルの設定
    - OnpremVPC のルートテーブル 1 つ編集 (s3asr-Onprem-private-subnet-1)
    ![alt text](rtb-onprem.png) 
    - API VPC のルートテーブル 2 つ編集 (s3asr-Api-private-subnet-{1,2})
    ![alt text](rtb-api.png)
2. DHCPオプションセットを作成
    - CDKで作成された[Route 53 インバウンドエンドポイントのIP](https://ap-northeast-1.console.aws.amazon.com/route53resolver/home?region=ap-northeast-1#/inbound-endpoints)を確認し、新規のDHCPオプションを作成時、ドメインネームサーバーの部分に登録
    ![alt text](dhcp-op.png)
3. OnpremVPC の DHCP オプションを作成したものに変更
    - 「VPC > VPCの設定を編集」からDHCP設定を変更
    ![alt text](dhcp.png)

## Windows Serverインスタンスへの RDP トンネル確立

デプロイ後、以下の手順でローカル端末から Windows Server インスタンスに接続できます：

1. キーペアの取得
    ```bash
    npm run debug:get-pem
    ```

2. Windowsパスワードの取得
    ```bash
    npm run debug:pw
    ```

3. RDPトンネルの確立
    ```bash
    npm run debug:rdp
    ```

## RDPクライアントで接続

トンネルを確立した端末の Windows Apps などを利用してリモートデスクトップ接続できます。

EC2 は完全閉域にデプロイされるため、インターネットへ接続できません。そのため、事前にローカルへ AWS CLI v2 ダウンロードしておき、ローカルのフォルダをリモート先にマウントし、参照できるようにします。これにより、インターネットに接続できない EC2 に[AWS CLI v2 for Windows の msi](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/getting-started-install.html) をダウンロードします。（ローカルからコピー）

ローカルのRDPクライアントを起動し、以下の情報で接続します：
- ホスト: `localhost:13389`
- ユーザー名: `Administrator`
- パスワード: 手順2で取得したパスワード

接続後、ローカルから AWS CLI v2 をリモートにコピーして、インストールを行います。同梱している PS1 ファイルは AWS CLI v2 を利用する前提で、スクリプトが組まれています。
