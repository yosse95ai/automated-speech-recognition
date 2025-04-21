import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface DnsSecurityGroupConstructProps {
  vpc: ec2.Vpc;
  sourceCidr: string;
  name: string;
}

export class DnsSecurityGroupConstruct extends Construct {
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DnsSecurityGroupConstructProps) {
    super(scope, id);

    // Create a security group for DNS traffic
    this.securityGroup = new ec2.SecurityGroup(this, `${props.name}SecurityGroup`, {
      vpc: props.vpc,
      description: `Allow DNS traffic from ${props.sourceCidr}`,
      securityGroupName: `${cdk.Stack.of(this).stackName}-${props.name}`,
      allowAllOutbound: true,
    });

    cdk.Tags.of(this.securityGroup).add('Name', `s3asr-${props.name}SecurityGroup`);
    

    // Allow DNS traffic (UDP port 53) from the source CIDR
    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.sourceCidr),
      ec2.Port.udp(53),
      `Allow DNS (UDP) traffic from ${props.sourceCidr}`
    );

    // Allow DNS traffic (TCP port 53) from the source CIDR
    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.sourceCidr),
      ec2.Port.tcp(53),
      `Allow DNS (TCP) traffic from ${props.sourceCidr}`
    );
  }
}
