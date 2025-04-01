# S3ARS - CDK TypeScript Project

This is a CDK project for creating AWS infrastructure with TypeScript.

## Project Structure

This project uses a monorepo structure with npm workspaces:

```
s3ars/
├── packages/
│   └── cdk/           # CDK infrastructure code
│       ├── bin/       # CDK app entry point
│       ├── lib/       # CDK stacks and constructs
│       └── test/      # Tests for CDK code
└── package.json       # Root package.json with workspace configuration
```

## Useful Commands

* `npm run cdk:build`         Compile TypeScript to JavaScript
* `npm run cdk:watch`         Watch for changes and compile
* `npm run cdk:test`          Perform Jest unit tests
* `npm run cdk:deploy`        Deploy this stack to your default AWS account/region
* `npm run cdk:deploy:hotswap` Deploy with hotswap
* `npm run cdk:destroy`       Destroy the deployed stack

## Architecture

This project creates:

1. A VPC with private subnets (2 AZs)
2. An EC2 instance in a private subnet
3. An EC2 Instance Connect Endpoint for connecting to the instance

### Connecting to the EC2 Instance

After deployment, you can connect to the EC2 instance using:

```bash
# Get the instance ID from the CDK output
INSTANCE_ID=<instance-id-from-output>

# Connect using EC2 Instance Connect
aws ec2-instance-connect ssh --instance-id $INSTANCE_ID
```

### Architecture Features

- **Security**: EC2 instance is placed in a private subnet with no direct internet access
- **Connectivity**: EC2 Instance Connect Endpoint allows secure connection without internet or NAT gateways
- **Cost Efficiency**: No NAT gateway required, reducing costs
