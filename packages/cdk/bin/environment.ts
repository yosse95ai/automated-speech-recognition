import { z } from 'zod';

export const baseSchema = z.object({
  /**
   * The AWS region where you want to deploy this system.
   * @example 'us-east-1'
   */
  awsRegion: z.string(),

  /**
   * You need to explicitly set AWS account ID when you look up an existing VPC or set a custom domain name.
   * @example '123456789012'
   */
  awsAccount: z.string(),

  /**
   * Unique name for s3 bucket
   * @example 's3-asr-bucket'
   */
  bucketName: z.string(),

  /**
   * CIDR of API VPC
   * @example '10.0.0.0/16'
   */
  apiVpcCidr: z.string(),

  /**
   * CIDR of API VPC
   * @example '24'
   */
  apiVpcSubnetCidr: z.number(),
  
  /**
   * CIDR of on-premise
   * @example '10.1.0.0/16'
   */
  onpremiseCidr: z.string(),

  /**
   * True if you want to enable debug mode.
   * @example false
   */
  debugMode: z.boolean(),

  /**
   * True if you want to setup dify packages and first deployment.
   * @example false
   */
  difySetup: z.boolean(),

  /**
   * True if you want to use AWS Transcribe　to use transcription usecase
   * @example false
   */
  useTranscribe: z.boolean(),

  /**
   * True if you want to use Bedrock Anget　to use agent usecase
   * @example false
   */
  useBedrockAgents: z.boolean(),
  
  /**
   * True if you want to use S3 from on-premise directly
   * @example false
   */
  useS3OnpremDirectly: z.boolean(),

  /**
   * True is you want to use Route 53 resolver inbound endpoint
   * @example true
   */
  useR53ResolverEndpoint: z.boolean(),

  /**
   * True if you want to deploy Internal NLB
   * @example false
   */
  useInternalNlb: z.boolean()
});

export type EnvironmentProps = z.infer<typeof baseSchema>;
