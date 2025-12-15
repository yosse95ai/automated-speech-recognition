# CDK Package - Automated Speech Recognition

This package contains AWS CDK infrastructure code for the automated speech recognition system with comprehensive Zod-based validation.

## Features

- AWS CDK infrastructure for speech recognition using Amazon Transcribe
- S3 bucket for audio file storage with lifecycle policies
- VPC configuration with private networking
- **Zod-based type-safe validation** for all configurations
- Japanese error messages for validation failures

## Zod Validation

This project implements comprehensive runtime validation using [Zod](https://github.com/colinhacks/zod), ensuring type safety and data integrity across all configuration inputs and API interactions.

### Available Schemas

#### 1. Environment Configuration (`environment.schema.ts`)

Validates environment variables and deployment configuration:

```typescript
import { validateEnvironmentProps, safeValidateEnvironmentProps } from './lib/schemas';

// Throwing validation
const config = validateEnvironmentProps({
  awsRegion: 'ap-northeast-1',
  awsAccount: '123456789012',
  bucketName: 'my-asr-bucket',
  apiVpcCidr: '10.0.0.0/16',
  onpremiseCidr: '10.1.0.0/16',
  debugMode: false,
  useTranscribe: true,
});

// Safe validation (no throw)
const result = safeValidateEnvironmentProps(data);
if (result.success) {
  console.log('Valid config:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

**Validations:**
- AWS Region: Non-empty string
- AWS Account: 12-digit numeric string
- Bucket Name: 3-63 characters, lowercase alphanumeric with dots and hyphens
- VPC CIDR: Valid CIDR format with prefix ≤ /25
- Boolean flags with defaults

#### 2. Transcribe Configuration (`transcribe.schema.ts`)

Validates Amazon Transcribe input and output:

```typescript
import { validateTranscribeInput, safeValidateTranscribeInput } from './lib/schemas';

// Validate input
const input = validateTranscribeInput({
  s3Uri: 's3://my-bucket/audio.mp3',
  languageCode: 'ja-JP',
  mediaFormat: 'mp3',
  mediaSampleRateHertz: 16000,
  showSpeakerLabels: true,
  maxSpeakerLabels: 3,
});

// Safe validation
const result = safeValidateTranscribeInput(data);
```

**Supported Language Codes:**
- `ja-JP`, `en-US`, `en-GB`, `es-US`, `fr-FR`, `de-DE`, `pt-BR`
- `zh-CN`, `ko-KR`, `it-IT`, `nl-NL`, `ru-RU`, `ar-SA`
- `hi-IN`, `th-TH`, `tr-TR`

**Media Formats:**
- `mp3`, `mp4`, `wav`, `flac`, `ogg`, `amr`, `webm`

**Validations:**
- S3 URI: Must match `s3://bucket/key` pattern
- Sample Rate: 8000-48000 Hz
- Speaker Count: 2-10 speakers

#### 3. S3 Configuration (`s3.schema.ts`)

Validates S3 bucket configuration and events:

```typescript
import { validateS3BucketProps, validateS3Event } from './lib/schemas';

// Validate bucket configuration
const bucketConfig = validateS3BucketProps({
  bucketName: 'my-asr-bucket',
  objectExpirationDays: 7,
  vpcEndpointId: 'vpce-0123456789abcdef0',
});

// Validate S3 event notification
const event = validateS3Event({
  Records: [{
    eventVersion: '2.1',
    eventSource: 'aws:s3',
    awsRegion: 'ap-northeast-1',
    eventTime: '2023-01-01T00:00:00.000Z',
    eventName: 's3:ObjectCreated:Put',
    s3: {
      s3SchemaVersion: '1.0',
      bucket: { name: 'my-bucket', arn: 'arn:aws:s3:::my-bucket' },
      object: { key: 'audio.mp3', size: 1024 },
    },
  }],
});
```

**Validations:**
- Bucket Name: Standard S3 naming rules
- Expiration Days: 1-3650 days (default: 1)
- VPC Endpoint ID: Must match `vpce-xxxxxxxxx` pattern

#### 4. VPC Endpoint Configuration (`vpc-endpoint.schema.ts`)

Validates VPC endpoint configurations:

```typescript
import { 
  validateTranscribeVpcEndpointProps,
  validateS3VpcEndpointProps 
} from './lib/schemas';

// Transcribe VPC Endpoint
const transcribeEndpoint = validateTranscribeVpcEndpointProps({
  vpc: { vpcId: 'vpc-12345678' },
  name: 'transcribe-endpoint',
  subnets: [
    { subnetId: 'subnet-12345678' },
    { subnetId: 'subnet-abcdef01' },
  ],
  souceCidr: '10.0.0.0/16',
});

// S3 VPC Endpoint
const s3Endpoint = validateS3VpcEndpointProps({
  vpc: { vpcId: 'vpc-12345678' },
  name: 's3-endpoint',
  routeTables: [{ routeTableId: 'rtb-12345678' }],
});
```

**Validations:**
- VPC ID: Must match `vpc-xxxxxxxxx` pattern
- Subnet ID: Must match `subnet-xxxxxxxxx` pattern
- Route Table ID: Must match `rtb-xxxxxxxxx` pattern
- Name: Alphanumeric with hyphens and underscores
- CIDR: Valid CIDR block format

### CIDR Validation

Enhanced CIDR validation with Zod integration:

```typescript
import { 
  validateVpcCidrWithZod,
  validateSubnetCidrWithZod,
  vpcCidrSchema,
  subnetCidrMaskSchema,
} from './lib/utils/cidr-validation';

// Validate VPC CIDR
const result = validateVpcCidrWithZod('10.0.0.0/16', 'API VPC');
if (!result.isValid) {
  console.error(result.errorMessage);
}

// Validate Subnet CIDR mask
const subnetResult = validateSubnetCidrWithZod(24, 'Private Subnet');

// Direct schema usage
const cidr = vpcCidrSchema.parse('10.0.0.0/16');
const mask = subnetCidrMaskSchema.parse(24);
```

**CIDR Rules:**
- VPC CIDR: Prefix length must be ≤ /25
- Subnet CIDR: Prefix length must be between /16 and /27
- All error messages provided in Japanese

### Environment Validator (CDK Integration)

Zod-based validator implementing CDK's `IValidation` interface:

```typescript
import { EnvironmentValidator } from './lib/validators/environment-validator';

// CDK validation (implements IValidation)
const validator = new EnvironmentValidator({
  apiVpcCidr: '10.0.0.0/16',
  onpremiseCidr: '10.1.0.0/16',
});

const errors = validator.validate(); // Returns string[]
if (errors.length > 0) {
  console.error('Validation failed:', errors);
}

// Static validation methods
const validated = EnvironmentValidator.validateProps(data); // Throws on error
const result = EnvironmentValidator.safeValidateProps(data); // Returns result object
```

## Error Messages

All validation error messages are provided in Japanese (日本語) for consistency with the codebase:

```typescript
// Example error messages:
// "AWSアカウントIDは12桁の数字である必要があります"
// "バケット名は小文字の英数字、ドット、ハイフンのみ使用できます"
// "VPCのCIDRブロックのプレフィックス長は /25 以下である必要があります"
// "サブネットのプレフィックス長は /27 以下である必要があります"
```

## Installation

```bash
npm install
```

This will install all dependencies including Zod (^3.23.8).

## Testing

Run the comprehensive test suite:

```bash
npm test
```

Test files:
- `test/zod-schemas.test.ts` - All schema validations
- `test/environment-validator.test.ts` - Environment validator
- `test/cidr-validation-zod.test.ts` - CIDR validation with Zod
- `test/cidr-validation.test.ts` - Legacy CIDR validation tests

## Build

```bash
npm run build
```

## Deployment

```bash
npm run deploy
```

Or with hotswap for faster development iterations:

```bash
npm run deploy:hotswap
```

## Project Structure

```
lib/
├── schemas/              # Zod validation schemas
│   ├── environment.schema.ts
│   ├── transcribe.schema.ts
│   ├── s3.schema.ts
│   ├── vpc-endpoint.schema.ts
│   └── index.ts
├── validators/           # CDK validators
│   └── environment-validator.ts
├── utils/               # Utility functions
│   └── cidr-validation.ts
├── constructor/         # CDK constructs
│   └── api/
└── main-app-stack.ts   # Main stack definition

test/                    # Test files
bin/                     # Entry points
```

## Type Safety

All schemas export TypeScript types that can be used throughout your codebase:

```typescript
import type {
  EnvironmentProps,
  TranscribeInput,
  TranscribeOutput,
  S3BucketProps,
  TranscribeVpcEndpointProps,
  S3VpcEndpointProps,
} from './lib/schemas';
```

These types are automatically inferred from Zod schemas, ensuring consistency between runtime validation and compile-time type checking.

## Best Practices

1. **Always validate external input**: Use schemas to validate any data coming from external sources
2. **Use safe validation for user-facing errors**: Use `safeValidate*` functions to handle errors gracefully
3. **Use throwing validation for internal errors**: Use `validate*` functions when validation failure should halt execution
4. **Type inference**: Leverage `z.infer<typeof schema>` to keep types in sync with validation
5. **Compose schemas**: Build complex validations by composing simpler schemas

## License

See LICENSE file in the root directory.
