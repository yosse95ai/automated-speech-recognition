import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface Ec2InstanceProps {
  vpc: ec2.Vpc;
  name: string;
}

export class Ec2Instance extends Construct {
  public readonly instance: ec2.Instance;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly eicEndpointSG: ec2.SecurityGroup;
  public readonly ec2InstanceConnectEndpoint: cdk.aws_ec2.CfnInstanceConnectEndpoint;
  public readonly keyPair: ec2.CfnKeyPair;

  constructor(scope: Construct, id: string, props: Ec2InstanceProps) {
    super(scope, id);

    // Create a key pair for Windows RDP authentication with a unique name
    this.keyPair = new ec2.CfnKeyPair(this, `${props.name}WindowsKeyPair`, {
      keyName: `${props.name}-windows-key-pair`,
    });
    this.keyPair.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // Create an IAM role for EC2 Instance Connect and SSM
    const ec2Role = new iam.Role(this, `${props.name}EC2InstanceConnectRole`, {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });

    // Create a security group for the EC2 instance
    this.securityGroup = new ec2.SecurityGroup(
      this,
      `${props.name}EC2SecurityGroup`,
      {
        vpc: props.vpc,
        description: `Allow EC2 Instance Connect for ${props.name}`,
        allowAllOutbound: true,
      }
    );

    cdk.Tags.of(this.securityGroup).add(
      "Name",
      `s3asr-${props.name}EC2SecurityGroup`
    );

    // Create a separate security group for the EC2 Instance Connect Endpoint
    this.eicEndpointSG = new ec2.SecurityGroup(
      this,
      `${props.name}EICEndpointSecurityGroup`,
      {
        vpc: props.vpc,
        description: `Security group for EC2 Instance Connect Endpoint for ${props.name}`,
        allowAllOutbound: true,
      }
    );

    cdk.Tags.of(this.eicEndpointSG).add(
      "Name",
      `s3asr-${props.name}EICEndpointSecurityGroup`
    );

    // Allow inbound RDP from the EC2 Instance Connect Endpoint to the EC2 instance
    this.securityGroup.addIngressRule(
      this.eicEndpointSG,
      ec2.Port.tcp(3389),
      `Allow RDP access from EC2 Instance Connect Endpoint for ${props.name}`
    );



    // Create a Windows Server EC2 instance in one of the private subnets
    this.instance = new ec2.Instance(this, `${props.name}PrivateEC2Instance`, {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.XLARGE
      ), 
      machineImage: ec2.MachineImage.latestWindows(
        ec2.WindowsVersion.WINDOWS_SERVER_2022_JAPANESE_FULL_BASE
      ),
      securityGroup: this.securityGroup,
      role: ec2Role,
      keyPair: ec2.KeyPair.fromKeyPairName(
        this,
        `${props.name}ImportedKeyPair`,
        cdk.Token.asString(this.keyPair.ref)
      ),
    });

    cdk.Tags.of(this.instance).add("Name", `s3asr-${props.name}EC2Instance`)

    // Enable EC2 Instance Connect Endpoint in the VPC
    this.ec2InstanceConnectEndpoint = new ec2.CfnInstanceConnectEndpoint(
      this,
      `${props.name}EC2InstanceConnectEndpoint`,
      {
        subnetId: props.vpc.isolatedSubnets.length > 0
          ? props.vpc.isolatedSubnets[0].subnetId
          : "",
        securityGroupIds: [this.eicEndpointSG.securityGroupId],
      }
    );
    cdk.Tags.of(this.ec2InstanceConnectEndpoint).add(
      "Name",
      `s3asr-${props.name}EC2InstanceConnectEndpoint`
    );

    // Output the key pair name
    new cdk.CfnOutput(this, `${props.name}GetKeyPair`, {
      key: `01Get${props.name}KeyPairName`,
      value: `aws ssm get-parameter --name /ec2/keypair/${this.keyPair.getAtt("KeyPairId")} --region ${this.keyPair.stack.region} --with-decryption --query Parameter.Value --output text > ./${this.keyPair.keyName}.pem`,
      description: `Command to get ${props.name}KeyPairName for Windows instance`,
    });

    // Output the command to retrieve the password
    new cdk.CfnOutput(this, `${props.name}GetPasswordCommand`, {
      key: `02${props.name}GetPasswordCommand`,
      value: `aws ec2 get-password-data --instance-id ${this.instance.instanceId} --priv-launch-key ./${this.keyPair.keyName}.pem`,
      description: `Command to get the Windows password (replace /path/to/downloaded/ with your actual path)`,
    });

    // Output the command to establish RDP tunnel via EC2 Instance Connect
    new cdk.CfnOutput(this, "RdpTunnelCommand", {
      key: `03${props.name}RdpTunnelCommand`,
      value: `aws ec2-instance-connect open-tunnel --instance-id ${this.instance.instanceId} --remote-port 3389 --local-port 13389`,
      description: `Command to establish RDP tunnel to the ${props.name} Windows instance (connect to localhost:13389 with your RDP client)`,
    });
  }
}
