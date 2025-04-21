import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface VpcPeeringConstructProps {
  sourceVpc: ec2.Vpc;
  targetVpc: ec2.Vpc;
  sourceName: string;
  targetName: string;
}

export class VpcPeeringConstruct extends Construct {
  public readonly peeringConnection: ec2.CfnVPCPeeringConnection;

  constructor(scope: Construct, id: string, props: VpcPeeringConstructProps) {
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

    // カスタムルートテーブルを取得
    const sourceVpcInstance = props.sourceVpc as any;
    const targetVpcInstance = props.targetVpc as any;
    
    // ソースVPCのルートテーブル取得
    const sourceRouteTable = sourceVpcInstance.privateRouteTable.ref;
    
    // ターゲットVPCのルートテーブル取得
    const targetRouteTable = targetVpcInstance.privateRouteTable.ref;

    // Create route from source VPC to target VPC
    new ec2.CfnRoute(this, `${props.sourceName}To${props.targetName}Route`, {
      routeTableId: sourceRouteTable,
      destinationCidrBlock: props.targetVpc.vpcCidrBlock,
      vpcPeeringConnectionId: this.peeringConnection.ref
    });
    
    // Log the route table configuration for verification
    new cdk.CfnOutput(this, `${props.sourceName}RouteTableConfig`, {
      value: `Route table ${sourceRouteTable} configured to route ${props.targetVpc.vpcCidrBlock} traffic to peering connection ${this.peeringConnection.ref}`,
      description: `Route configuration for ${props.sourceName} VPC`
    });

    // Create route from target VPC to source VPC
    new ec2.CfnRoute(this, `${props.targetName}To${props.sourceName}Route`, {
      routeTableId: targetRouteTable,
      destinationCidrBlock: props.sourceVpc.vpcCidrBlock,
      vpcPeeringConnectionId: this.peeringConnection.ref
    });
    
    // Log the route table configuration for verification
    new cdk.CfnOutput(this, `${props.targetName}RouteTableConfig`, {
      value: `Route table ${targetRouteTable} configured to route ${props.sourceVpc.vpcCidrBlock} traffic to peering connection ${this.peeringConnection.ref}`,
      description: `Route configuration for ${props.targetName} VPC`
    });

    // Output the VPC Peering Connection ID
    new cdk.CfnOutput(this, `${props.sourceName}To${props.targetName}PeeringConnectionId`, {
      value: this.peeringConnection.ref,
      description: `The ID of the VPC Peering Connection between ${props.sourceName} and ${props.targetName}`
    });
  }
}
