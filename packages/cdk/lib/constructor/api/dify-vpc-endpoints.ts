import * as cdk from "aws-cdk-lib";
import {
  GatewayVpcEndpoint,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
  IVpc,
  ISubnet,
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

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
   * Debug mode flag
   */
  debugMode: boolean;

  /**
   * Bedrock Agents flag
   */
  useBedrockAgents: boolean;
}

/**
 * Construct for creating all necessary VPC endpoints for Dify deployment in a private VPC
 */
export class DifyVpcEndpoints extends Construct {
  constructor(scope: Construct, id: string, props: DifyVpcEndpointsProps) {
    super(scope, id);

    // Create all required interface VPC endpoints for Dify
    const serviceList: { service: InterfaceVpcEndpointAwsService }[] = [
      // for Dify app
      {
        service: InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
      },
    ];

    // Add Bedrock Agents endpoint
    if (props.useBedrockAgents) {
      serviceList.push({
        service: InterfaceVpcEndpointAwsService.BEDROCK_AGENT_RUNTIME,
      });
    }

    // Add SSM_MESSAGES endpoint only in debug mode
    if (props.debugMode) {
      serviceList.push({
        service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      });
    }

    serviceList.forEach((item) => {
      const endpoint = new InterfaceVpcEndpoint(this, item.service.shortName, {
        vpc: props.vpc,
        service: item.service,
        subnets: {
          subnets: props.subnets,
        },
      });
      cdk.Tags.of(endpoint).add(
        "Name",
        `s3asr-${item.service.shortName}Endpoint`
      );
    });

    // for ECS Fargate and Dify app
    const gwVpce = new GatewayVpcEndpoint(this, "S3", {
      vpc: props.vpc,
      service: GatewayVpcEndpointAwsService.S3,
    });
    cdk.Tags.of(gwVpce).add("Name", `s3asr-s3-gatewayEndpoint`);
  }
}
