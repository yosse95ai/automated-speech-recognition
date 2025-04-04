import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface Ec2InstanceConstructProps {
  vpc: ec2.Vpc;
  name: string;
}

export class Ec2InstanceConstruct extends Construct {
  public readonly instance: ec2.Instance;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly eicEndpointSG: ec2.SecurityGroup;
  public readonly ec2InstanceConnectEndpoint: ec2.CfnInstanceConnectEndpoint;

  constructor(scope: Construct, id: string, props: Ec2InstanceConstructProps) {
    super(scope, id);

    // Create an IAM role for EC2 Instance Connect
    const ec2Role = new iam.Role(this, `${props.name}EC2InstanceConnectRole`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Create a security group for the EC2 instance
    this.securityGroup = new ec2.SecurityGroup(this, `${props.name}EC2SecurityGroup`, {
      vpc: props.vpc,
      description: `Allow EC2 Instance Connect for ${props.name}`,
      allowAllOutbound: true,
    });

    cdk.Tags.of(this.securityGroup).add('Name', `s3arc-${props.name}EC2SecurityGroup`);


    // Create a separate security group for the EC2 Instance Connect Endpoint
    this.eicEndpointSG = new ec2.SecurityGroup(this, `${props.name}EICEndpointSecurityGroup`, {
      vpc: props.vpc,
      description: `Security group for EC2 Instance Connect Endpoint for ${props.name}`,
      allowAllOutbound: true,
    });

    cdk.Tags.of(this.eicEndpointSG).add('Name', `s3arc-${props.name}EICEndpointSecurityGroup`);

    // Allow inbound SSH from the EC2 Instance Connect Endpoint to the EC2 instance
    this.securityGroup.addIngressRule(
      this.eicEndpointSG,
      ec2.Port.tcp(22),
      `Allow SSH access from EC2 Instance Connect Endpoint for ${props.name}`
    );

    // Create an EC2 instance in one of the private subnets
    this.instance = new ec2.Instance(this, `${props.name}PrivateEC2Instance`, {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: this.securityGroup,
      role: ec2Role,
    });

    // Enable EC2 Instance Connect Endpoint in the VPC
    this.ec2InstanceConnectEndpoint = new ec2.CfnInstanceConnectEndpoint(this, `${props.name}EC2InstanceConnectEndpoint`, {
      subnetId: props.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }).subnetIds[0],
      securityGroupIds: [this.eicEndpointSG.securityGroupId],
    });
    cdk.Tags.of(this.ec2InstanceConnectEndpoint).add('Name', `s3arc-${props.name}EC2InstanceConnectEndpoint`);

    // Output the instance ID for reference
    new cdk.CfnOutput(this, `${props.name}InstanceId`, {
      key: `${props.name}InstanceId`,
      value: this.instance.instanceId,
      description: `The ID of the ${props.name} EC2 instance`,
    });

    new cdk.CfnOutput(this, "InstanceConnectCommand", {
      key: `InstanceConnectCommand`,
      value: `aws ec2-instance-connect ssh --instance-id ${this.instance.instanceId} --eice-options maxTunnelDuration=3600,endpointId=${this.ec2InstanceConnectEndpoint.attrId} --os-user ec2-user `,
      description: `The command to connect to the ${props.name} EC2 instance`
    })
  }
}
