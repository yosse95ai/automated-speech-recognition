import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc as OnpremVpcConstruct } from './constructor/onprem/vpc';
import { Ec2Instance } from './constructor/onprem/ec2-instance';
import { VpcPeering } from './constructor/vpc-peering';
import { S3Bucket } from './constructor/api/s3-bucket';
import { S3VpcEndpoint } from './constructor/api/s3-vpc-endpoint';
import { TranscribeVpcEndpoint } from './constructor/api/transcribe-vpc-endpoint';
import { Route53ResolverEndpoint } from './constructor/api/route53-resolver-endpoint';
import { DifyVpcEndpoints } from './constructor/api/dify-vpc-endpoints';
import { Vpc as ApiVpcConstruct } from './constructor/api/vpc';
import { EnvironmentProps } from '../bin/environment';

export interface MainAppStackProps extends cdk.StackProps, Omit<EnvironmentProps, 'awsRegion' | 'awsAccount'>{}
export class MainAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainAppStackProps) {
    super(scope, id, props);

    // Create the Onprem VPC with EC2 instance (1 AZ)
    const onpremVpc = new OnpremVpcConstruct(this, 'OnpremVpc', {
      cidr: props.onpremiseCidr,
      name: 'Onprem',
    });

    // Create EC2 instance in the Onprem VPC
    new Ec2Instance(this, 'OnpremEc2Instance', {
      vpc: onpremVpc.vpc,
      name: 'Onprem'
    });

    // Create the API VPC with 2 AZs and explicit subnets
    const apiVpc = new ApiVpcConstruct(this, 'ApiVpc', {
      cidr: props.apiVpcCidr,
      name: 'Api',
      maxAzs: 2
    });

    // Create VPC Peering between Onprem VPC and API VPC
    const vpcPeering = new VpcPeering(this, 'OnpremToApiVpcPeering', {
      sourceVpc: onpremVpc.vpc,
      targetVpc: apiVpc.vpc,
      sourceName: 'Onprem',
      targetName: 'Api'
    });
    
    // Create S3 VPC Endpoint in API VPC
    const s3Endpoint = new S3VpcEndpoint(this, 'ApiS3VpcEndpoint', {
      vpc: apiVpc.vpc,
      name: 'Api',
      subnets: apiVpc.privateSubnets,
      souceCidr: props.onpremiseCidr
    });
    
    // Create Transcribe VPC Endpoint in API VPC
    const transcribeEndpoint = new TranscribeVpcEndpoint(this, 'ApiTranscribeVpcEndpoint', {
      vpc: apiVpc.vpc,
      name: 'Api',
      subnets: apiVpc.privateSubnets,
      souceCidr: props.onpremiseCidr
    });
    
    // Create Transcribe Bucket
    const s3Bucket = new S3Bucket(this, 'S3AsrBucket', {
      bucketName: props.bucketName,
      vpcEndpointId: s3Endpoint.endpoint.vpcEndpointId
    });
    
    // Create Route 53 Resolver Inbound Endpoint in API VPC
    const route53Endpoint = new Route53ResolverEndpoint(this, "ApiRoute53InboundEndpoint", {
      vpc: apiVpc.vpc,
      name: "Api",
      sourceCidr: props.onpremiseCidr, // OnpremVPCからのDNSトラフィックを許可
      subnets: apiVpc.privateSubnets
    });
    
    // Create all necessary VPC endpoints for Dify deployment in API VPC
    new DifyVpcEndpoints(this, "ApiDifyVpcEndpoints", {
      vpc: apiVpc.vpc,
      name: "Api",
      subnets: apiVpc.privateSubnets,
    });
  }
}
