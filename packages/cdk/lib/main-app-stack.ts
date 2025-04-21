import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcConstruct } from './constructor/vpc-construct';
import { Ec2InstanceConstruct } from './constructor/ec2-instance-construct';
import { VpcPeeringConstruct } from './constructor/vpc-peering-construct';
import { S3BucketConstruct } from './constructor/s3-bucket-construct';
import { S3VpcEndpointConstruct } from './constructor/s3-vpc-endpoint-construct';
import { TranscribeVpcEndpointConstruct } from './constructor/transcribe-vpc-endpoint-construct';
import { Route53ResolverEndpointConstruct } from './constructor/route53-resolver-endpoint-construct';
import { EnvironmentProps } from '../bin/environment';

export interface MainAppStackProps extends cdk.StackProps, Omit<EnvironmentProps, 'awsRegion' | 'awsAccount'>{}
export class MainAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainAppStackProps) {
    super(scope, id, props);

    // Create the Onprem VPC with EC2 instance (1 AZ)
    const OnpremVpc = new VpcConstruct(this, 'OnpremVpc', {
      cidr: props.onpremiseCidr,
      name: 'Onprem',
      maxAzs: 1 // OnpremVPCは1つのAZのみを使用
    });

    // Create EC2 instance in the Onprem VPC
    new Ec2InstanceConstruct(this, 'OnpremEc2Instance', {
      vpc: OnpremVpc.vpc,
      name: 'Onprem'
    });

    // Create the API VPC with 2 AZs
    const apiVpc = new VpcConstruct(this, 'ApiVpc', {
      cidr: props.apiVpcCidr,
      name: 'Api',
      maxAzs: 2 // API VPCは2つのAZを使用
    });

    // Create VPC Peering between Onprem VPC and API VPC
    const vpcPeering = new VpcPeeringConstruct(this, 'OnpremToApiVpcPeering', {
      sourceVpc: OnpremVpc.vpc,
      targetVpc: apiVpc.vpc,
      sourceName: 'Onprem',
      targetName: 'Api'
    });
    
    // Create S3 VPC Endpoint in API VPC
    const s3Endpoint = new S3VpcEndpointConstruct(this, 'ApiS3VpcEndpoint', {
      vpc: apiVpc.vpc,
      name: 'Api'
    });
    
    // Create Transcribe VPC Endpoint in API VPC
    const transcribeEndpoint = new TranscribeVpcEndpointConstruct(this, 'ApiTranscribeVpcEndpoint', {
      vpc: apiVpc.vpc,
      name: 'Api'
    });
    
    // Create S3 bucket with policy allowing access via VPC endpoint
    new S3BucketConstruct(this, 'S3AsrBucket', {
      bucketName: props.bucketName,
      vpcEndpointId: s3Endpoint.endpoint.vpcEndpointId,
      objectExpirationDays: 1 // 1日後にオブジェクトを自動削除
    });
    
    // Create Route 53 Resolver Inbound Endpoint in API VPC
    new Route53ResolverEndpointConstruct(this, "ApiRoute53InboundEndpoint", {
      vpc: apiVpc.vpc,
      name: "Api",
      sourceCidr: '10.0.0.0/16' // OnpremVPCからのDNSトラフィックを許可
    });
  }
}
