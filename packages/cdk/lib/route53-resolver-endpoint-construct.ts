import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as route53resolver from 'aws-cdk-lib/aws-route53resolver';

/**
 * Route 53 Resolver Endpoint Construct Props
 */
export interface Route53ResolverEndpointConstructProps {
  vpc: ec2.Vpc;
  name: string;
  sourceCidr: string; // DNSトラフィックを許可するソースCIDR
}

/**
 * Route 53 Resolver Endpoint Construct
 * Creates a Route 53 Resolver Inbound Endpoint with appropriate security group
 */
export class Route53ResolverEndpointConstruct extends Construct {
  public readonly inboundEndpoint: route53resolver.CfnResolverEndpoint;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: Route53ResolverEndpointConstructProps) {
    super(scope, id);

    // DNSトラフィック用のセキュリティグループを作成
    this.securityGroup = new ec2.SecurityGroup(this, `${props.name}Route53SecurityGroup`, {
      vpc: props.vpc,
      description: `Allow DNS traffic from ${props.sourceCidr}`,
      securityGroupName: `${cdk.Stack.of(this).stackName}-${props.name}Route53SG`,
      allowAllOutbound: true,
    });

    // セキュリティグループにタグを追加
    cdk.Tags.of(this.securityGroup).add('Name', `s3asr-${props.name}Route53SecurityGroup`);
    
    // DNS通信用のポートを許可（TCP/UDP 53番ポート）
    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.sourceCidr),
      ec2.Port.tcp(53),
      `Allow DNS (TCP) traffic from ${props.sourceCidr}`
    );
    
    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.sourceCidr),
      ec2.Port.udp(53),
      `Allow DNS (UDP) traffic from ${props.sourceCidr}`
    );

    // プライベートサブネットを取得（少なくとも2つのAZが必要）
    const privateSubnets = props.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    }).subnetIds;

    // Route 53 Resolver インバウンドエンドポイントを作成
    this.inboundEndpoint = new route53resolver.CfnResolverEndpoint(this, `${props.name}Route53InboundEndpoint`, {
      direction: 'INBOUND',
      ipAddresses: privateSubnets.slice(0, 2).map(subnetId => ({ subnetId })),
      securityGroupIds: [this.securityGroup.securityGroupId],
      name: `${props.name}-inbound-endpoint`,
    });

    // エンドポイントにタグを追加
    cdk.Tags.of(this.inboundEndpoint).add('Name', `s3asr-${props.name}Route53InboundEndpoint`);

    // エンドポイントのARNを出力
    new cdk.CfnOutput(this, `${props.name}Route53InboundEndpointArn`, {
      value: this.inboundEndpoint.attrArn,
      description: `The ARN of the Route 53 Resolver Inbound Endpoint in ${props.name} VPC`,
    });

    // エンドポイントIPアドレス取得コマンドを出力
    new cdk.CfnOutput(this, `${props.name}GetEndpointIpsCommand`, {
      value: `aws route53resolver list-resolver-endpoint-ip-addresses --resolver-endpoint-id \${${props.name}Route53InboundEndpointId}`,
      description: `Command to get the IP addresses of the Route 53 Resolver Inbound Endpoint in ${props.name} VPC`,
    });
  }
}
