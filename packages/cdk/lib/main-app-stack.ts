import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcConstruct } from './vpc-construct';
import { Ec2InstanceConstruct } from './ec2-instance-construct';
import { VpcPeeringConstruct } from './vpc-peering-construct';
import { S3BucketConstruct } from './s3-bucket-construct';
import { S3VpcEndpointConstruct } from './s3-vpc-endpoint-construct';
import { DnsSecurityGroupConstruct } from './dns-security-group-construct';

export class MainAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Onprem VPC with EC2 instance (1 AZ)
    const OnpremVpc = new VpcConstruct(this, 'OnpremVpc', {
      cidr: '10.0.0.0/16',
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
      cidr: '10.1.0.0/16',
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
    
    // Create S3 bucket with policy allowing access via VPC endpoint
    new S3BucketConstruct(this, 'S3ArcBucket', {
      bucketName: 's3-arc-bucket',
      vpcEndpointId: s3Endpoint.endpoint.vpcEndpointId
    });
    
    // Create DNS Security Group in API VPC to allow DNS traffic from OnpremVPC
    new DnsSecurityGroupConstruct(this, 'OnpremToAwsDnsSecurityGroup', {
      vpc: apiVpc.vpc,
      sourceCidr: '10.0.0.0/16',
      name: 'onpre2awsDNS'
    });
  }
}
