import { describe, beforeEach, test, expect } from '@jest/globals';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { InternalNlb } from '../lib/constructor/api/internal-nlb';

describe('InternalNlb', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let privateSubnets: ec2.ISubnet[];
  let publicSubnets: ec2.ISubnet[];

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    
    // テスト用 VPC を作成
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });
    
    privateSubnets = vpc.isolatedSubnets;
    publicSubnets = vpc.publicSubnets;
  });

  test('NLB が正しく作成される', () => {
    // WHEN
    new InternalNlb(stack, 'TestInternalNlb', {
      vpc,
      name: 'Test',
      subnets: privateSubnets,
      publicSubnets: publicSubnets,
    });

    // THEN
    const template = Template.fromStack(stack);
    
    // Network Load Balancer の作成を確認
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Type: 'network',
      Scheme: 'internet-facing',
    });
  });

  test('Elastic IP が正しく作成される', () => {
    // WHEN
    new InternalNlb(stack, 'TestInternalNlb', {
      vpc,
      name: 'Test',
      subnets: privateSubnets,
      publicSubnets: publicSubnets,
    });

    // THEN
    const template = Template.fromStack(stack);
    
    // Elastic IP の作成を確認（パブリックサブネット数分）
    template.resourceCountIs('AWS::EC2::EIP', publicSubnets.length);
    
    template.hasResourceProperties('AWS::EC2::EIP', {
      Domain: 'vpc',
    });
  });

  test('ターゲットグループが正しく作成される', () => {
    // WHEN
    new InternalNlb(stack, 'TestInternalNlb', {
      vpc,
      name: 'Test',
      subnets: privateSubnets,
      publicSubnets: publicSubnets,
    });

    // THEN
    const template = Template.fromStack(stack);
    
    // ターゲットグループの作成を確認
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      Port: 80,
      Protocol: 'TCP',
      TargetType: 'alb',
      HealthCheckProtocol: 'HTTP',
      HealthCheckPath: '/',
    });
  });

  test('リスナーが正しく作成される', () => {
    // WHEN
    new InternalNlb(stack, 'TestInternalNlb', {
      vpc,
      name: 'Test',
      subnets: privateSubnets,
      publicSubnets: publicSubnets,
    });

    // THEN
    const template = Template.fromStack(stack);
    
    // リスナーの作成を確認
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 80,
      Protocol: 'TCP',
    });
  });

  test('サブネット数が不足している場合エラーが発生する', () => {
    // WHEN & THEN
    expect(() => {
      new InternalNlb(stack, 'TestInternalNlb', {
        vpc,
        name: 'Test',
        subnets: privateSubnets,
        publicSubnets: [publicSubnets[0]], // 1つのサブネットのみ
      });
    }).toThrow('Internal NLB requires at least 2 subnets');
  });

  test('カスタムポートが正しく設定される', () => {
    // WHEN
    new InternalNlb(stack, 'TestInternalNlb', {
      vpc,
      name: 'Test',
      subnets: privateSubnets,
      publicSubnets: publicSubnets,
      port: 8080,
    });

    // THEN
    const template = Template.fromStack(stack);
    
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      Port: 8080,
    });
    
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 8080,
    });
  });
});
