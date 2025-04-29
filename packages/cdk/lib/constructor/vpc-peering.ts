import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface VpcPeeringProps {
  sourceVpc: ec2.Vpc;
  targetVpc: ec2.Vpc;
  sourceName: string;
  targetName: string;
}

export class VpcPeering extends Construct {
  public readonly peeringConnection: ec2.CfnVPCPeeringConnection;

  constructor(scope: Construct, id: string, props: VpcPeeringProps) {
    super(scope, id);

    // Create VPC Peering Connection
    this.peeringConnection = new ec2.CfnVPCPeeringConnection(this, `${props.sourceName}To${props.targetName}PeeringConnection`, {
      vpcId: props.sourceVpc.vpcId,
      peerVpcId: props.targetVpc.vpcId,
      tags: [
        {
          key: 'Name',
          value: `${props.sourceName}-to-${props.targetName}-peering`
        }
      ]
    });

    // VPCピアリング接続のIDを出力
    new cdk.CfnOutput(this, `${props.sourceName}To${props.targetName}PeeringConnectionId`, {
      value: this.peeringConnection.ref,
      description: `The ID of the VPC Peering Connection between ${props.sourceName} and ${props.targetName}`
    });

    // ソースVPCのCIDRを出力
    new cdk.CfnOutput(this, `${props.sourceName}VpcCidr`, {
      value: props.sourceVpc.vpcCidrBlock,
      description: `The CIDR block of the ${props.sourceName} VPC`
    });

    // ターゲットVPCのCIDRを出力
    new cdk.CfnOutput(this, `${props.targetName}VpcCidr`, {
      value: props.targetVpc.vpcCidrBlock,
      description: `The CIDR block of the ${props.targetName} VPC`
    });
  }
}
