import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class S3ArsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC with only private subnets in 2 AZs
    const vpc = new ec2.Vpc(this, 'PrivateVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      // No NAT gateways since we're using only private subnets
      natGateways: 0,
    });

    // Create an IAM role for EC2 Instance Connect
    const ec2Role = new iam.Role(this, 'EC2InstanceConnectRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Create a security group for the EC2 instance
    const securityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc,
      description: 'Allow EC2 Instance Connect',
      allowAllOutbound: true,
    });

    // Create a separate security group for the EC2 Instance Connect Endpoint
    const eicEndpointSG = new ec2.SecurityGroup(this, 'EICEndpointSecurityGroup', {
      vpc,
      description: 'Security group for EC2 Instance Connect Endpoint',
      allowAllOutbound: true,
    });

    // Allow inbound SSH from the EC2 Instance Connect Endpoint to the EC2 instance
    securityGroup.addIngressRule(
      eicEndpointSG,
      ec2.Port.tcp(22),
      'Allow SSH access from EC2 Instance Connect Endpoint'
    );

    // Create an EC2 instance in one of the private subnets
    const instance = new ec2.Instance(this, 'PrivateEC2Instance', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: securityGroup,
      role: ec2Role,
    });

    // Enable EC2 Instance Connect Endpoint in the VPC
    // Use preserveLogicalIds: false to generate a new logical ID and avoid conflicts
    const ec2InstanceConnectEndpoint = new ec2.CfnInstanceConnectEndpoint(this, 'EC2InstanceConnectEndpoint' + Math.floor(Math.random() * 1000), {
      subnetId: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }).subnetIds[0],
      securityGroupIds: [eicEndpointSG.securityGroupId],
    });

    // Output the instance ID for reference
    new cdk.CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
      description: 'The ID of the EC2 instance',
    });

    // Output the VPC ID
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'The ID of the VPC',
    });

    // Output the EC2 Instance Connect Endpoint ID
    new cdk.CfnOutput(this, 'EC2InstanceConnectEndpointId', {
      value: ec2InstanceConnectEndpoint.attrId,
      description: 'The ID of the EC2 Instance Connect Endpoint',
    });
  }
}
