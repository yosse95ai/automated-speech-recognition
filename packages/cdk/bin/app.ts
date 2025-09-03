#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { MainAppStack } from '../lib/main-app-stack';

import { EnvironmentProps } from "./environment";

export const props: EnvironmentProps = {
  awsRegion: "ap-northeast-1",
  awsAccount: process.env.CDK_DEFAULT_ACCOUNT!,
  bucketName: "s3-asr-bucket",
  apiVpcCidr: "10.0.0.0/16",
  onpremiseCidr: "10.128.0.0/16",

  // true if you are deploying and/or setting up a dify package for the first time
  difySetup: true,

  // for debug
  debugMode: false,

  // usecase options
  useTranscribe: false,
  useBedrockAgents: false,
  useS3OnpremDirectly: false,
  useR53ResolverEndpoint: true,
  useInternalNlb: false
};

const app = new cdk.App();

// Deploy the unified stack with both VPCs and EC2 instance
new MainAppStack(app, 'S3AsrStack', {
  env: { region: props.awsRegion, account: props.awsAccount },
  ...props
});
