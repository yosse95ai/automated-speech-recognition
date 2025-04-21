import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface TranscribeVpcEndpointConstructProps {
  vpc: ec2.Vpc;
  name: string;
}

export class TranscribeVpcEndpointConstruct extends Construct {
  public readonly endpoint: ec2.InterfaceVpcEndpoint;

  constructor(scope: Construct, id: string, props: TranscribeVpcEndpointConstructProps) {
    super(scope, id);

    // Create a security group for the Transcribe VPC endpoint
    const endpointSecurityGroup = new ec2.SecurityGroup(this, `${props.name}TranscribeEndpointSG`, {
      vpc: props.vpc,
      description: `Security group for Transcribe VPC Endpoint in ${props.name} VPC`,
      allowAllOutbound: true,
    });
    
    // Add Name tag to the security group
    cdk.Tags.of(endpointSecurityGroup).add('Name', `s3asr-${props.name}TranscribeEndpointSG`);

    // Allow HTTPS traffic from within the VPC
    endpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4("10.0.0.0/16"),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from within the VPC'
    );

    // Create an interface VPC endpoint for Transcribe
    this.endpoint = new ec2.InterfaceVpcEndpoint(this, `${props.name}TranscribeEndpoint`, {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.TRANSCRIBE,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: true, // Transcribeでは通常プライベートDNSを有効にします
    });

    cdk.Tags.of(this.endpoint).add('Name', `s3asr-${props.name}TranscribeEndpoint`);

    // Output the VPC endpoint ID
    new cdk.CfnOutput(this, `${props.name}TranscribeEndpointId`, {
      key: `${props.name}TranscribeEndpointId`,
      value: this.endpoint.vpcEndpointId,
      description: `The ID of the Transcribe VPC Endpoint in ${props.name} VPC`,
    });
  }
}
