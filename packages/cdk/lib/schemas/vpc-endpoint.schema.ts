import { z } from 'zod';

/**
 * CIDR block validation
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
 * Transcribe VPC Endpoint configuration schema
 */
export const transcribeVpcEndpointPropsSchema = z.object({
  vpc: z.object({
    vpcId: z.string().regex(/^vpc-[a-f0-9]{8,17}$/, {
      message: 'VPC IDの形式が不正です (vpc-xxxxxxxxx)',
    }),
  }).passthrough(), // Allow additional VPC properties from CDK
  name: z.string()
    .min(1, { message: '名前は必須です' })
    .max(255, { message: '名前は255文字以下である必要があります' })
    .regex(/^[a-zA-Z0-9-_]+$/, {
      message: '名前は英数字、ハイフン、アンダースコアのみ使用できます',
    }),
  subnets: z.array(z.object({
    subnetId: z.string().regex(/^subnet-[a-f0-9]{8,17}$/, {
      message: 'サブネットIDの形式が不正です (subnet-xxxxxxxxx)',
    }),
  }).passthrough()).min(1, {
    message: '少なくとも1つのサブネットが必要です',
  }),
  souceCidr: cidrBlockSchema,
});

/**
 * S3 VPC Endpoint configuration schema
 */
export const s3VpcEndpointPropsSchema = z.object({
  vpc: z.object({
    vpcId: z.string().regex(/^vpc-[a-f0-9]{8,17}$/, {
      message: 'VPC IDの形式が不正です (vpc-xxxxxxxxx)',
    }),
  }).passthrough(),
  name: z.string()
    .min(1, { message: '名前は必須です' })
    .max(255, { message: '名前は255文字以下である必要があります' }),
  routeTables: z.array(z.object({
    routeTableId: z.string().regex(/^rtb-[a-f0-9]{8,17}$/, {
      message: 'ルートテーブルIDの形式が不正です (rtb-xxxxxxxxx)',
    }),
  }).passthrough()).optional(),
});

/**
 * VPC endpoint type
 */
export const vpcEndpointTypeSchema = z.enum([
  'Interface',
  'Gateway',
  'GatewayLoadBalancer',
], {
  errorMap: () => ({ message: 'サポートされていないVPCエンドポイントタイプです' }),
});

/**
 * VPC endpoint service
 */
export const vpcEndpointServiceSchema = z.object({
  name: z.string(),
  port: z.number().int().min(1).max(65535).optional(),
  privateDnsEnabled: z.boolean().optional().default(true),
});

/**
 * Infer TypeScript types from schemas
 */
export type TranscribeVpcEndpointProps = z.infer<typeof transcribeVpcEndpointPropsSchema>;
export type S3VpcEndpointProps = z.infer<typeof s3VpcEndpointPropsSchema>;
export type VpcEndpointType = z.infer<typeof vpcEndpointTypeSchema>;
export type VpcEndpointService = z.infer<typeof vpcEndpointServiceSchema>;

/**
 * Validates Transcribe VPC endpoint configuration
 * @param data - Raw configuration
 * @returns Validated configuration
 * @throws ZodError with Japanese error messages if validation fails
 */
export function validateTranscribeVpcEndpointProps(data: unknown): TranscribeVpcEndpointProps {
  return transcribeVpcEndpointPropsSchema.parse(data);
}

/**
 * Validates S3 VPC endpoint configuration
 * @param data - Raw configuration
 * @returns Validated configuration
 * @throws ZodError with Japanese error messages if validation fails
 */
export function validateS3VpcEndpointProps(data: unknown): S3VpcEndpointProps {
  return s3VpcEndpointPropsSchema.parse(data);
}

/**
 * Safely validates Transcribe VPC endpoint configuration without throwing
 * @param data - Raw configuration
 * @returns Success result with data or error result with messages
 */
export function safeValidateTranscribeVpcEndpointProps(data: unknown) {
  const result = transcribeVpcEndpointPropsSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
    return { success: false as const, errors };
  }
  
  return { success: true as const, data: result.data };
}

/**
 * Safely validates S3 VPC endpoint configuration without throwing
 * @param data - Raw configuration
 * @returns Success result with data or error result with messages
 */
export function safeValidateS3VpcEndpointProps(data: unknown) {
  const result = s3VpcEndpointPropsSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
    return { success: false as const, errors };
  }
  
  return { success: true as const, data: result.data };
}
