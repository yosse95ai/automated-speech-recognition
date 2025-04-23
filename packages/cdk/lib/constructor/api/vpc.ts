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
  public readonly privateRouteTable: ec2.CfnRouteTable;

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    // VPCを作成（サブネットなし）
    this.vpc = new ec2.Vpc(this, `${props.name}VPC`, {
      ipAddresses: ec2.IpAddresses.cidr(props.cidr),
      maxAzs: props.maxAzs || 2,
      subnetConfiguration: [], // サブネット設定なし
      natGateways: 0,
      restrictDefaultSecurityGroup: false,
    });

    // AZの数を取得
    const availabilityZones = this.vpc.availabilityZones;
    const maxAzs = props.maxAzs || 2;
    const azCount = Math.min(maxAzs, availabilityZones.length);

    // プライベートサブネットを明示的に作成
    this.privateSubnets = [];
    for (let i = 0; i < azCount; i++) {
      // サブネットCIDRを計算（10.0.0.0/16 -> 10.0.0.0/24, 10.0.1.0/24, ...）
      const subnetCidr = `${props.cidr.split('/')[0].slice(0, -1)}${i}.0/24`;
      
      const subnet = new ec2.Subnet(this, `${props.name}PrivateSubnet${i+1}`, {
        vpcId: this.vpc.vpcId,
        availabilityZone: availabilityZones[i],
        cidrBlock: subnetCidr,
        mapPublicIpOnLaunch: false,
      });

      // サブネットにタグを追加
      cdk.Tags.of(subnet).add('Name', `s3asr-${props.name}-private-subnet-${i+1}`);
      cdk.Tags.of(subnet).add('Network', 'Private');
      
      this.privateSubnets.push(subnet);
    }

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
