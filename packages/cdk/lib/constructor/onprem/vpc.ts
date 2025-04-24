import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface VpcProps {
  cidr: string;
  name: string;
}

export class Vpc extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly privateRouteTable: ec2.CfnRouteTable;

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    // VPCを作成（サブネット設定あり）
    this.vpc = new ec2.Vpc(this, `${props.name}VPC`, {
      ipAddresses: ec2.IpAddresses.cidr(props.cidr),
      maxAzs: 1,
      // プライベートサブネットのみを作成
      subnetConfiguration: [
        {
          name: `${props.name.toLowerCase()}-private`,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      natGateways: 0,
      restrictDefaultSecurityGroup: false,
    });

    // 明示的に作成されたプライベートサブネットを取得
    this.privateSubnets = this.vpc.isolatedSubnets;

    // サブネットにタグを追加
    this.privateSubnets.forEach((subnet, index) => {
      cdk.Tags.of(subnet).add('Name', `s3asr-${props.name}-private-subnet-${index+1}`);
      cdk.Tags.of(subnet).add('Network', 'Private');
    });

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
    this.privateSubnets.forEach((subnet, index) => {
      new ec2.CfnSubnetRouteTableAssociation(this, `${props.name}PrivateSubnetRouteTableAssociation${index+1}`, {
        routeTableId: this.privateRouteTable.ref,
        subnetId: subnet.subnetId,
      });
    });
  }
}
