import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface S3BucketProps {
  bucketName: string;
  /**
   * オブジェクトの有効期間（日数）。デフォルトは1日。
   */
  objectExpirationDays?: number;
  vpcEndpointId: string;
}

/**
 * S3バケットを作成するコンストラクト
 * バケットポリシーは別のコンストラクトで管理し、関心を分離する
 */
export class S3Bucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3BucketProps) {
    super(scope, id);

    // Create S3 bucket with lifecycle rule
    this.bucket = new s3.Bucket(this, "Bucket", {
      bucketName: props.bucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,

      // ライフサイクルルールの追加
      lifecycleRules: [
        {
          id: "ExpireAfterOneDay",
          enabled: true,
          expiration: Duration.days(props.objectExpirationDays || 1),
          abortIncompleteMultipartUploadAfter: Duration.days(1),
          noncurrentVersionExpiration: Duration.days(1),
        },
      ],
    });

    // VPCエンドポイント経由のアクセスのみを許可するポリシー
    this.bucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        sid: "RestrictAccessToVPCEndpoint",
        effect: cdk.aws_iam.Effect.ALLOW,
        principals: [new cdk.aws_iam.AnyPrincipal()],
        actions: ["s3:*"],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            "aws:sourceVpce": props.vpcEndpointId,
          },
        },
      })
    );

    // Output the bucket name and ARN
    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      description: "The name of the S3 bucket",
    });
  }
}
