export interface EnvironmentProps {
  /**
   * The AWS region where you want to deploy this system.
   * @example 'us-east-1'
   */
  awsRegion: string;

  /**
   * You need to explicitly set AWS account ID when you look up an existing VPC or set a custom domain name.
   * @example '123456789012'
   */
  awsAccount: string;

  /**
   * Unique name for s3 bucket
   * @example 's3-asr-bucket'
   */
  bucketName: string;

  /**
   * CIDR of API VPC
   * @example '10.0.0.0/16'
   */
  apiVpcCidr: string;

  /**
   * CIDR of on-premise
   * @example '10.1.0.0/16'
   */
  onpremiseCidr: string;

  /**
   * True if you want to enable debug mode.
   * @example false
   */
  debugMode: boolean;

  /**
   * True if you want to setup dify packages and first deployment.
   * @example false
   */
  difySetup: boolean;

  /**
   * True if you want to use AWS Transcribe　to use transcription usecase
   * @example false
   */
  useTranscribe: boolean;

  /**
   * True if you want to use Bedrock Anget　to use agent usecase
   * @example false
   */
  useBedrockAgents: boolean;
  
  /**
   * True if you want to use S3 from on-premise directly
   * @example false
   */
  useS3OnpremDirectly: boolean;
}
