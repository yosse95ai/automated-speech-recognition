import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export interface S3BucketConstructProps {
  bucketName: string;
  vpcEndpointId?: string;
  /**
   * オブジェクトの有効期間（日数）。デフォルトは1日。
   */
  objectExpirationDays?: number;
}

export class S3BucketConstruct extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3BucketConstructProps) {
    super(scope, id);

    // デフォルトの有効期間は1日
    const expirationDays = props.objectExpirationDays ?? 1;

    // Create S3 bucket with lifecycle rule
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用
      autoDeleteObjects: true, // 開発環境用
      
      // ライフサイクルルールの追加
      lifecycleRules: [
        {
          id: 'ExpireAfterOneDay',
          enabled: true,
          expiration: Duration.days(expirationDays),
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        },
      ],
    });

    // If VPC endpoint ID is provided, add bucket policy to allow access via the endpoint
    if (props.vpcEndpointId) {
      const bucketPolicy = new s3.BucketPolicy(this, 'BucketPolicy', {
        bucket: this.bucket,
      });

      bucketPolicy.document.addStatements(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.AnyPrincipal()],
          actions: ['s3:*'],
          resources: [
            this.bucket.bucketArn,
            `${this.bucket.bucketArn}/*`
          ],
          conditions: {
            'StringEquals': {
              'aws:sourceVpce': props.vpcEndpointId
            }
          }
        })
      );
    }

    // Output the bucket name and ARN
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'The name of the S3 bucket',
    });
  }
}
