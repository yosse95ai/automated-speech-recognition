import { z } from 'zod';

/**
 * CIDR block validation with Japanese error messages
 */
const cidrBlockSchema = z.string().refine(
  (value) => {
    const parts = value.split('/');
    if (parts.length !== 2) return false;
    
    const prefixLength = parseInt(parts[1], 10);
    if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) return false;
    
    // Validate IP address format
    const ipParts = parts[0].split('.');
    if (ipParts.length !== 4) return false;
    
    return ipParts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  },
  {
    message: 'CIDRブロック形式が不正です。正しい形式: 10.0.0.0/16',
  }
);

/**
 * VPC CIDR validation - rejects prefix length > 25
 */
const vpcCidrSchema = cidrBlockSchema.refine(
  (value) => {
    const prefixLength = parseInt(value.split('/')[1], 10);
    return prefixLength <= 25;
  },
  {
    message: 'VPCのCIDRブロックのプレフィックス長は /25 以下である必要があります。/26、/27、/28 などのプレフィックスは使用できません。',
  }
);

/**
 * AWS Region validation
 */
const awsRegionSchema = z.string().min(1, {
  message: 'AWSリージョンは必須です',
});

/**
 * AWS Account ID validation (12 digits)
 */
const awsAccountSchema = z.string().regex(/^\d{12}$/, {
  message: 'AWSアカウントIDは12桁の数字である必要があります',
});

/**
 * S3 Bucket Name validation
 */
const bucketNameSchema = z.string()
  .min(3, { message: 'バケット名は3文字以上である必要があります' })
  .max(63, { message: 'バケット名は63文字以下である必要があります' })
  .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, {
    message: 'バケット名は小文字の英数字、ドット、ハイフンのみ使用できます',
  })
  .refine(
    (value) => !value.includes('..') && !value.includes('.-') && !value.includes('-.'),
    {
      message: 'バケット名に連続するドットやドット-ハイフンの組み合わせは使用できません',
    }
  );

/**
 * Environment configuration schema
 */
export const environmentPropsSchema = z.object({
  awsRegion: awsRegionSchema,
  awsAccount: awsAccountSchema,
  bucketName: bucketNameSchema,
  apiVpcCidr: vpcCidrSchema.describe('API VPC'),
  onpremiseCidr: vpcCidrSchema.describe('オンプレミス VPC'),
  debugMode: z.boolean().default(false),
  difySetup: z.boolean().default(false),
  useTranscribe: z.boolean().default(false),
  useBedrockAgents: z.boolean().default(false),
  useS3OnpremDirectly: z.boolean().default(false),
  useR53ResolverEndpoint: z.boolean().default(true),
  useInternalNlb: z.boolean().default(false),
});

/**
 * Infer TypeScript type from schema
 */
export type EnvironmentProps = z.infer<typeof environmentPropsSchema>;

/**
 * Validates environment configuration and returns parsed data
 * @param data - Raw environment configuration
 * @returns Validated and typed environment configuration
 * @throws ZodError with detailed Japanese error messages if validation fails
 */
export function validateEnvironmentProps(data: unknown): EnvironmentProps {
  return environmentPropsSchema.parse(data);
}

/**
 * Safely validates environment configuration without throwing
 * @param data - Raw environment configuration
 * @returns Success result with data or error result with formatted messages
 */
export function safeValidateEnvironmentProps(data: unknown) {
  const result = environmentPropsSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
    return { success: false as const, errors };
  }
  
  return { success: true as const, data: result.data };
}
