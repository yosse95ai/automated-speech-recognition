import { z } from 'zod';

/**
 * S3 bucket encryption type
 */
export const s3EncryptionTypeSchema = z.enum([
  'S3_MANAGED',
  'KMS',
  'KMS_MANAGED',
], {
  errorMap: () => ({ message: 'サポートされていない暗号化タイプです' }),
});

/**
 * S3 bucket configuration schema
 */
export const s3BucketPropsSchema = z.object({
  bucketName: z.string()
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
    ),
  objectExpirationDays: z.number()
    .int({ message: '有効期限は整数である必要があります' })
    .positive({ message: '有効期限は正の数である必要があります' })
    .max(3650, { message: '有効期限は3650日以下である必要があります' })
    .optional()
    .default(1),
  vpcEndpointId: z.string().regex(/^vpce-[a-f0-9]{8,17}$/, {
    message: 'VPCエンドポイントIDの形式が不正です (vpce-xxxxxxxxx)',
  }),
});

/**
 * S3 object metadata schema
 */
export const s3ObjectMetadataSchema = z.object({
  bucket: z.string(),
  key: z.string(),
  size: z.number().int().nonnegative(),
  etag: z.string().optional(),
  contentType: z.string().optional(),
  lastModified: z.date().or(z.string()).optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * S3 event notification record
 */
export const s3EventRecordSchema = z.object({
  eventVersion: z.string(),
  eventSource: z.literal('aws:s3'),
  awsRegion: z.string(),
  eventTime: z.string(),
  eventName: z.string(),
  s3: z.object({
    s3SchemaVersion: z.string(),
    configurationId: z.string().optional(),
    bucket: z.object({
      name: z.string(),
      arn: z.string(),
    }),
    object: z.object({
      key: z.string(),
      size: z.number(),
      eTag: z.string().optional(),
      versionId: z.string().optional(),
      sequencer: z.string().optional(),
    }),
  }),
});

/**
 * S3 event notification
 */
export const s3EventSchema = z.object({
  Records: z.array(s3EventRecordSchema),
});

/**
 * Infer TypeScript types from schemas
 */
export type S3BucketProps = z.infer<typeof s3BucketPropsSchema>;
export type S3ObjectMetadata = z.infer<typeof s3ObjectMetadataSchema>;
export type S3EventRecord = z.infer<typeof s3EventRecordSchema>;
export type S3Event = z.infer<typeof s3EventSchema>;
export type S3EncryptionType = z.infer<typeof s3EncryptionTypeSchema>;

/**
 * Validates S3 bucket configuration
 * @param data - Raw bucket configuration
 * @returns Validated bucket configuration
 * @throws ZodError with Japanese error messages if validation fails
 */
export function validateS3BucketProps(data: unknown): S3BucketProps {
  return s3BucketPropsSchema.parse(data);
}

/**
 * Validates S3 event notification
 * @param data - Raw event data
 * @returns Validated S3 event
 * @throws ZodError if validation fails
 */
export function validateS3Event(data: unknown): S3Event {
  return s3EventSchema.parse(data);
}

/**
 * Safely validates S3 bucket configuration without throwing
 * @param data - Raw bucket configuration
 * @returns Success result with data or error result with messages
 */
export function safeValidateS3BucketProps(data: unknown) {
  const result = s3BucketPropsSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
    return { success: false as const, errors };
  }
  
  return { success: true as const, data: result.data };
}
