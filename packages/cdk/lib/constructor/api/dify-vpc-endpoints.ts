import { Construct } from 'constructs';
import { 
  GatewayVpcEndpoint,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
  IVpc,
  ISubnet,
  SubnetSelection,
  CfnRouteTable
} from 'aws-cdk-lib/aws-ec2';

export interface DifyVpcEndpointsProps {
  /**
   * VPC to create endpoints in
   */
  vpc: IVpc;
  
  /**
   * Name prefix for the resources
   */
  name: string;

  /**
   * Subnets to place the endpoints in
   */
  subnets: ISubnet[];

  /**
   * Route table to add gateway endpoint routes to
   */
  routeTable?: CfnRouteTable;
}

/**
 * Construct for creating all necessary VPC endpoints for Dify deployment in a private VPC
 */
export class DifyVpcEndpoints extends Construct {
  constructor(scope: Construct, id: string, props: DifyVpcEndpointsProps) {
    super(scope, id);

    // Create all required interface VPC endpoints for Dify
    const serviceList: { service: InterfaceVpcEndpointAwsService }[] = [
      // for ECS Fargate
      {
        service: InterfaceVpcEndpointAwsService.ECR,
      },
      {
        service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
      },
      {
        service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      },
      {
        service: InterfaceVpcEndpointAwsService.SSM,
      },
      {
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      },
      // for Dify app
      {
        service: InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
      },
      {
        service: InterfaceVpcEndpointAwsService.BEDROCK_AGENT_RUNTIME,
      },
      // for debugging
      {
        service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      },
    ];

    serviceList.forEach((item) => {
      new InterfaceVpcEndpoint(this, item.service.shortName, {
        vpc: props.vpc,
        service: item.service,
        subnets: {
          subnets: props.subnets,
        },
      });
    });

    // for ECS Fargate and Dify app
    new GatewayVpcEndpoint(this, 'S3', {
      vpc: props.vpc,
      service: GatewayVpcEndpointAwsService.S3,
    });
  }
}
