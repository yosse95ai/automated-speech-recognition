#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainAppStack } from '../lib/main-app-stack';

const app = new cdk.App();

// Deploy the unified stack with both VPCs and EC2 instance
new MainAppStack(app, 'MainAppStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
