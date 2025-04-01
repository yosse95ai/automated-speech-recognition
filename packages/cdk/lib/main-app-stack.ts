import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcConstruct } from './vpc-construct';
import { Ec2InstanceConstruct } from './ec2-instance-construct';
import { VpcPeeringConstruct } from './vpc-peering-construct';

export class MainAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the first VPC with EC2 instance
    const mainVpc = new VpcConstruct(this, 'MainVpc', {
      cidr: '10.0.0.0/16',
      name: 'Main'
    });

    // Create EC2 instance in the main VPC
    new Ec2InstanceConstruct(this, 'MainEc2Instance', {
      vpc: mainVpc.vpc,
      name: 'Main'
    });

    // Create the API VPC (previously SecondVpc)
    const apiVpc = new VpcConstruct(this, 'ApiVpc', {
      cidr: '10.1.0.0/16',
      name: 'Api'
    });

    // Create VPC Peering between Main VPC and API VPC
    new VpcPeeringConstruct(this, 'MainToApiVpcPeering', {
      sourceVpc: mainVpc.vpc,
      targetVpc: apiVpc.vpc,
      sourceName: 'Main',
      targetName: 'Api'
    });
  }
}
