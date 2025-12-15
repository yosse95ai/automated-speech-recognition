import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { validateVpcCidr, validateSubnetCidr } from '../../utils/cidr-validation';

export interface VpcProps {
  cidr: string;
  name: string;
}

export class Vpc extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    // Validate VPC CIDR block
    const vpcCidrValidation = validateVpcCidr(props.cidr, `${props.name} VPC`);
    if (!vpcCidrValidation.isValid) {
      throw new Error(vpcCidrValidation.errorMessage);
    }

    // Validate subnet CIDR mask
    const privateCidrMask = 24;
    const privateSubnetValidation = validateSubnetCidr(privateCidrMask, `${props.name} プライベートサブネット`);
    if (!privateSubnetValidation.isValid) {
      throw new Error(privateSubnetValidation.errorMessage);
    }

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
    cdk.Tags.of(this.vpc).add('Name', `s3asr-${props.name}VPC`);
  }
}
