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
  public readonly privateRouteTable: ec2.CfnRouteTable;

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

    // 共通のルートテーブルを作成
    this.privateRouteTable = new ec2.CfnRouteTable(this, `${props.name}PrivateRouteTable`, {
      vpcId: this.vpc.vpcId,
      tags: [
        {
          key: 'Name',
          value: `s3asr-${props.name}-private-route-table`,
        },
      ],
    });

    // すべてのプライベートサブネットに同じルートテーブルを関連付け
    const privateSubnetIds = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    }).subnets.map(subnet => subnet.subnetId);

    privateSubnetIds.forEach((subnetId, index) => {
      new ec2.CfnSubnetRouteTableAssociation(this, `${props.name}PrivateSubnetRouteTableAssociation${index}`, {
        routeTableId: this.privateRouteTable.ref,
        subnetId: subnetId,
      });
    });
  }
}
