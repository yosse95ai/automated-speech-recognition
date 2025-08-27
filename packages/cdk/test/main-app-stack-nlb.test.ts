import { describe, beforeEach, test } from '@jest/globals';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { MainAppStack } from '../lib/main-app-stack';

describe('MainAppStack NLB Integration', () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
  });

  test('useInternalNlb=true でNLBリソースが作成される', () => {
    // WHEN
    const stack = new MainAppStack(app, 'TestStack', {
      env: { region: 'ap-northeast-1', account: '123456789012' },
      bucketName: 'test-bucket',
      apiVpcCidr: '10.0.0.0/16',
      onpremiseCidr: '10.128.0.0/16',
      debugMode: false,
      difySetup: false,
      useTranscribe: false,
      useBedrockAgents: false,
      useS3OnpremDirectly: false,
      useR53ResolverEndpoint: true,
      useInternalNlb: true, // NLB を有効化
    });

    // THEN
    const template = Template.fromStack(stack);
    
    // NLB リソースの作成を確認
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Type: 'network',
      Scheme: 'internal',
    });
    
    // Elastic IP の作成を確認（内部 NLB では作成されない）
    template.resourceCountIs('AWS::EC2::EIP', 0);
    
    // ターゲットグループの作成を確認
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      TargetType: 'alb',
    });
  });

  test('useInternalNlb=false でNLBリソースが作成されない', () => {
    // WHEN
    const stack = new MainAppStack(app, 'TestStack', {
      env: { region: 'ap-northeast-1', account: '123456789012' },
      bucketName: 'test-bucket',
      apiVpcCidr: '10.0.0.0/16',
      onpremiseCidr: '10.128.0.0/16',
      debugMode: false,
      difySetup: false,
      useTranscribe: false,
      useBedrockAgents: false,
      useS3OnpremDirectly: false,
      useR53ResolverEndpoint: true,
      useInternalNlb: false, // NLB を無効化
    });

    // THEN
    const template = Template.fromStack(stack);
    
    // NLB リソースが作成されないことを確認
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0);
    template.resourceCountIs('AWS::EC2::EIP', 0);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 0);
  });

  test('debugMode=true と useInternalNlb=true の組み合わせが正常に動作する', () => {
    // WHEN
    const stack = new MainAppStack(app, 'TestStack', {
      env: { region: 'ap-northeast-1', account: '123456789012' },
      bucketName: 'test-bucket',
      apiVpcCidr: '10.0.0.0/16',
      onpremiseCidr: '10.128.0.0/16',
      debugMode: true, // デバッグモード有効
      difySetup: false,
      useTranscribe: false,
      useBedrockAgents: false,
      useS3OnpremDirectly: false,
      useR53ResolverEndpoint: true,
      useInternalNlb: true, // NLB も有効
    });

    // THEN
    const template = Template.fromStack(stack);
    
    // 両方のリソースが作成されることを確認
    // Onprem VPC リソース
    template.resourceCountIs('AWS::EC2::VPC', 2); // API VPC + Onprem VPC
    template.hasResourceProperties('AWS::EC2::Instance', {}); // Windows EC2
    
    // NLB リソース
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Type: 'network',
    });
  });
});
