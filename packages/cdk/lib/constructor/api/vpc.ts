import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface VpcProps {
  cidr: string;
  name: string;
  difySetup?: boolean; // difySetup パラメータを追加
}

export class Vpc extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    const natConfig = props.difySetup
      ? {
          natGatewayProvider: ec2.NatProvider.instanceV2({
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.T4G,
              ec2.InstanceSize.NANO
            ),
            associatePublicIpAddress: true,
          }),
          natGateways: 1,
        }
      : {
          natGateways: 0,
        };

    this.vpc = new ec2.Vpc(this, `${props.name}VPC`, {
      ipAddresses: ec2.IpAddresses.cidr(props.cidr),
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: `${props.name.toLowerCase()}-private`,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: `${props.name.toLowerCase()}-public`,
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
          mapPublicIpOnLaunch: true,
        },
      ],
      ...(natConfig),
      restrictDefaultSecurityGroup: false,
    });
    cdk.Tags.of(this.vpc).add("Name", `s3asr-${props.name}VPC`);

    this.privateSubnets = this.vpc.privateSubnets;
    this.publicSubnets = this.vpc.publicSubnets;

    this.privateSubnets.forEach((subnet, index) => {
      cdk.Tags.of(subnet).add(
        "Name",
        `s3asr-${props.name}-private-subnet-${index + 1}`
      );
      cdk.Tags.of(subnet).add("Network", "Private");
    });

    this.publicSubnets.forEach((subnet, index) => {
      cdk.Tags.of(subnet).add(
        "Name",
        `s3asr-${props.name}-public-subnet-${index + 1}`
      );
      cdk.Tags.of(subnet).add("Network", "Public");
    });

    new cdk.CfnOutput(this, `${props.name}VpcID`, {
      value: this.vpc.vpcId,
      description: `API VPC ID. You can use Dify environment param in cdk.ts `,
    });
  }
}
