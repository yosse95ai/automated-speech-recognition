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

    // Get all route tables from source VPC
    const sourceRouteTables = this.getVpcRouteTables(props.sourceVpc);
    
    // Get all route tables from target VPC
    const targetRouteTables = this.getVpcRouteTables(props.targetVpc);

    // Create routes from source VPC to target VPC
    sourceRouteTables.forEach((routeTable, index) => {
      new ec2.CfnRoute(this, `${props.sourceName}To${props.targetName}Route${index}`, {
        routeTableId: routeTable,
        destinationCidrBlock: props.targetVpc.vpcCidrBlock,
        vpcPeeringConnectionId: this.peeringConnection.ref
      });
    });

    // Create routes from target VPC to source VPC
    targetRouteTables.forEach((routeTable, index) => {
      new ec2.CfnRoute(this, `${props.targetName}To${props.sourceName}Route${index}`, {
        routeTableId: routeTable,
        destinationCidrBlock: props.sourceVpc.vpcCidrBlock,
        vpcPeeringConnectionId: this.peeringConnection.ref
      });
    });

    // Output the VPC Peering Connection ID
    new cdk.CfnOutput(this, `${props.sourceName}To${props.targetName}PeeringConnectionId`, {
      value: this.peeringConnection.ref,
      description: `The ID of the VPC Peering Connection between ${props.sourceName} and ${props.targetName}`
    });
  }

  // Helper method to get all route tables from a VPC
  private getVpcRouteTables(vpc: ec2.Vpc): string[] {
    const routeTables: string[] = [];
    
    // Get private subnets route tables
    vpc.privateSubnets.forEach(subnet => {
      // Use reflection to access the protected routeTable property
      // This is a workaround as the routeTable property is protected
      const routeTable = (subnet as any).routeTable;
      if (routeTable && routeTable.routeTableId) {
        routeTables.push(routeTable.routeTableId);
      }
    });
    
    return routeTables;
  }
}
