import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface S3VpcEndpointConstructProps {
  vpc: ec2.Vpc;
  name: string;
}

export class S3VpcEndpointConstruct extends Construct {
  public readonly endpoint: ec2.InterfaceVpcEndpoint;

  constructor(scope: Construct, id: string, props: S3VpcEndpointConstructProps) {
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
      ec2.Peer.ipv4("10.0.0.0/16"),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from within the VPC'
    );

    // Create an interface VPC endpoint for S3
    this.endpoint = new ec2.InterfaceVpcEndpoint(this, `${props.name}S3Endpoint`, {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.S3,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
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
