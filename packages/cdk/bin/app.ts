#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainAppStack } from '../lib/main-app-stack';
import { EnvironmentProps } from "./environment";

export const props: EnvironmentProps = {
  awsRegion: 'us-west-2',
  awsAccount: process.env.CDK_DEFAULT_ACCOUNT!,
  bucketName: "s3-asr-bucket", // change your bucket name
  apiVpcCidr: '10.1.0.0/16',
  onpremiseCidr: '10.0.0.0/16'
};

const app = new cdk.App();

// Deploy the unified stack with both VPCs and EC2 instance
new MainAppStack(app, 'S3AsrStack', {
  env: { region: props.awsRegion, account: props.awsAccount },
  ...props
});
