import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface TranscribeVpcEndpointProps {
  vpc: ec2.Vpc;
  name: string;
  subnets: ec2.ISubnet[];
  souceCidr: string;
}

export class TranscribeVpcEndpoint extends Construct {
  public readonly endpoint: ec2.InterfaceVpcEndpoint;

  constructor(scope: Construct, id: string, props: TranscribeVpcEndpointProps) {
    super(scope, id);

    // Create a security group for the Transcribe VPC endpoint
    const endpointSecurityGroup = new ec2.SecurityGroup(
      this,
      `${props.name}SG`,
      {
        vpc: props.vpc,
        description: `Security group for Transcribe VPC Endpoint in ${props.name} VPC`,
        allowAllOutbound: true,
      }
    );

    // Add Name tag to the security group
    cdk.Tags.of(endpointSecurityGroup).add("Name", `s3asr-${props.name}SG`);

    // Allow HTTPS traffic from within the VPC
    endpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.souceCidr),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic from within the VPC"
    );

    // Create an interface VPC endpoint for Transcribe
    this.endpoint = new ec2.InterfaceVpcEndpoint(
      this,
      `${props.name}TranscribeEndpoint`,
      {
        vpc: props.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.TRANSCRIBE,
        subnets: {
          subnets: props.subnets,
        },
        securityGroups: [endpointSecurityGroup],
        privateDnsEnabled: true,
      }
    );

    cdk.Tags.of(this.endpoint).add(
      "Name",
      `s3asr-${props.name}TranscribeEndpoint`
    );
  }
}
