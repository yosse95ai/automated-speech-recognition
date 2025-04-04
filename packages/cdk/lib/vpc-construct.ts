import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface VpcConstructProps {
  cidr: string;
  name: string;
  maxAzs?: number; // オプションのAZ数パラメータを追加
}

export class VpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: string[];

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    // Create a VPC with only private subnets
    this.vpc = new ec2.Vpc(this, `${props.name}VPC`, {
      ipAddresses: ec2.IpAddresses.cidr(props.cidr),
      maxAzs: props.maxAzs || 2, // デフォルトは2、指定があればその値を使用
      subnetConfiguration: [
        {
          name: `${props.name}Private`,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      // No NAT gateways since we're using only private subnets
      natGateways: 0,
      // Disable default security group rules to avoid permission issues
      restrictDefaultSecurityGroup: false,
    });

    // Get private subnet IDs
    this.privateSubnets = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    }).subnetIds;
  }
}
