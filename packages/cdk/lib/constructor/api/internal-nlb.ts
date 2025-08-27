import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export interface InternalNlbProps {
  vpc: ec2.IVpc;
  name: string;
  subnets: ec2.ISubnet[];
  sourceCidr: string; // オンプレミス CIDR
  port?: number; // デフォルト: 80
}

export class InternalNlb extends Construct {
  public readonly nlb: elbv2.NetworkLoadBalancer;
  public readonly targetGroup: elbv2.NetworkTargetGroup;

  constructor(scope: Construct, id: string, props: InternalNlbProps) {
    super(scope, id);

    const port = props.port ?? 80;

    // デプロイ時検証
    if (props.subnets.length < 2) {
      throw new Error(
        `Internal NLB requires at least 2 subnets in different AZs for high availability. ` +
        `Provided: ${props.subnets.length} subnets. ` +
        `Please ensure your VPC has subnets in at least 2 Availability Zones.`
      );
    }

    // サブネットが異なる AZ にあることを確認
    const availabilityZones = new Set(props.subnets.map(subnet => subnet.availabilityZone));
    if (availabilityZones.size < 2) {
      throw new Error(
        `Internal NLB requires subnets in at least 2 different Availability Zones. ` +
        `Provided subnets are in ${availabilityZones.size} AZ(s): ${Array.from(availabilityZones).join(', ')}. ` +
        `Please ensure your VPC configuration includes subnets across multiple AZs.`
      );
    }

    // セキュリティグループの作成
    const nlbSecurityGroup = new ec2.SecurityGroup(this, `${props.name}NlbSecurityGroup`, {
      vpc: props.vpc,
      description: 'Security group for Internal NLB - allows traffic from on-premise only',
      allowAllOutbound: true,
    });

    // オンプレミス CIDR からのインバウンドルールを追加
    nlbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.sourceCidr),
      ec2.Port.tcp(port),
      'Allow traffic from on-premise CIDR'
    );

    cdk.Tags.of(nlbSecurityGroup).add('Name', `s3asr-${props.name}-nlb-security-group`);

    // Network Load Balancer の作成（内部向け、動的 IP）
    this.nlb = new elbv2.NetworkLoadBalancer(this, `${props.name}InternalNlb`, {
      vpc: props.vpc,
      internetFacing: false, // 内部向けに変更
      vpcSubnets: {
        subnets: props.subnets,
      },
      securityGroups: [nlbSecurityGroup], // セキュリティグループを関連付け
    });

    cdk.Tags.of(this.nlb).add('Name', `s3asr-${props.name}-internal-nlb`);

    // ターゲットグループの作成（ALB タイプ）
    this.targetGroup = new elbv2.NetworkTargetGroup(this, `${props.name}NlbTargetGroup`, {
      vpc: props.vpc,
      port: port,
      protocol: elbv2.Protocol.TCP,
      targetType: elbv2.TargetType.ALB,
      healthCheck: {
        protocol: elbv2.Protocol.HTTP,
        path: '/',
        port: port.toString(),
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(6),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
      },
    });

    cdk.Tags.of(this.targetGroup).add('Name', `s3asr-${props.name}-nlb-target-group`);

    // リスナーの作成
    this.nlb.addListener(`${props.name}NlbListener`, {
      port: port,
      protocol: elbv2.Protocol.TCP,
      defaultTargetGroups: [this.targetGroup],
    });
  }
}
