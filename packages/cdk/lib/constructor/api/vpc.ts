import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface VpcProps {
  cidr: string;
  name: string;
  maxAzs?: number;
}

export class Vpc extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    // VPCを作成（サブネット設定あり）
    this.vpc = new ec2.Vpc(this, `${props.name}VPC`, {
      ipAddresses: ec2.IpAddresses.cidr(props.cidr),
      maxAzs: props.maxAzs || 2,
      // プライベートサブネットとパブリックサブネットを作成
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
      natGatewayProvider: ec2.NatProvider.instanceV2({
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T4G,
          ec2.InstanceSize.NANO
        ),
        associatePublicIpAddress: true,
      }),
      natGateways: 1,
      restrictDefaultSecurityGroup: false,
    });
    cdk.Tags.of(this.vpc).add("Name", `s3asr-${props.name}VPC`);

    // 明示的に作成されたサブネットを取得
    this.privateSubnets = this.vpc.privateSubnets;
    this.publicSubnets = this.vpc.publicSubnets;

    // サブネットにタグを追加
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
