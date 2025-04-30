import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface S3VpcEndpointProps {
  vpc: ec2.Vpc;
  name: string;
  subnets: ec2.ISubnet[];
  souceCidr: string;
}

export class S3VpcEndpoint extends Construct {
  public readonly endpoint: ec2.InterfaceVpcEndpoint;

  constructor(scope: Construct, id: string, props: S3VpcEndpointProps) {
    super(scope, id);

    // Create a security group for the VPC endpoint
    const endpointSecurityGroup = new ec2.SecurityGroup(this, `${props.name}S3EndpointSG`, {
      vpc: props.vpc,
      description: `Security group for S3 VPC Endpoint in ${props.name} VPC`,
      allowAllOutbound: true,
    });
    
    // Add Name tag to the security group
    cdk.Tags.of(endpointSecurityGroup).add('Name', `s3asr-${props.name}S3EndpointSG`);

    // Allow HTTPS traffic from within the VPC
    endpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.souceCidr),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from within the VPC'
    );

    // Create an interface VPC endpoint for S3
    this.endpoint = new ec2.InterfaceVpcEndpoint(this, `${props.name}S3Endpoint`, {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.S3,
      subnets: {
        subnets: props.subnets,
      },
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: false,
    });

    cdk.Tags.of(this.endpoint).add('Name', `s3asr-${props.name}S3Endpoint`);

    // Output the VPC endpoint ID
    new cdk.CfnOutput(this, `${props.name}S3EndpointId`, {
      key: `${props.name}S3EndpointId`,
      value: this.endpoint.vpcEndpointId,
      description: `The ID of the S3 VPC Endpoint in ${props.name} VPC`,
    });
  }
}
