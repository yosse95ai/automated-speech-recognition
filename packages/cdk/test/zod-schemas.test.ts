/**
 * Comprehensive unit tests for Zod-based validation schemas
 */

import {
  validateEnvironmentProps,
  safeValidateEnvironmentProps,
  environmentPropsSchema,
} from '../lib/schemas/environment.schema';

import {
  validateTranscribeInput,
  safeValidateTranscribeInput,
  validateTranscribeOutput,
} from '../lib/schemas/transcribe.schema';

import {
  validateS3BucketProps,
  safeValidateS3BucketProps,
  validateS3Event,
} from '../lib/schemas/s3.schema';

import {
  validateTranscribeVpcEndpointProps,
  safeValidateTranscribeVpcEndpointProps,
  validateS3VpcEndpointProps,
} from '../lib/schemas/vpc-endpoint.schema';

describe('Environment Schema Validation', () => {
  describe('Valid Environment Configuration', () => {
    test('accepts valid complete configuration', () => {
      const validConfig = {
        awsRegion: 'ap-northeast-1',
        awsAccount: '123456789012',
        bucketName: 'my-test-bucket-123',
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
        debugMode: false,
        difySetup: false,
        useTranscribe: true,
        useBedrockAgents: false,
        useS3OnpremDirectly: false,
        useR53ResolverEndpoint: true,
        useInternalNlb: false,
      };

      const result = validateEnvironmentProps(validConfig);
      expect(result).toEqual(validConfig);
    });

    test('accepts configuration with default boolean values', () => {
      const minimalConfig = {
        awsRegion: 'us-east-1',
        awsAccount: '123456789012',
        bucketName: 'test-bucket',
        apiVpcCidr: '10.0.0.0/24',
        onpremiseCidr: '10.1.0.0/24',
      };

      const result = validateEnvironmentProps(minimalConfig);
      expect(result.debugMode).toBe(false);
      expect(result.useR53ResolverEndpoint).toBe(true);
    });

    test('accepts /25 CIDR (boundary case)', () => {
      const config = {
        awsRegion: 'us-east-1',
        awsAccount: '123456789012',
        bucketName: 'test-bucket',
        apiVpcCidr: '10.0.0.0/25',
        onpremiseCidr: '192.168.0.0/25',
      };

      expect(() => validateEnvironmentProps(config)).not.toThrow();
    });
  });

  describe('Invalid Environment Configuration', () => {
    test('rejects invalid AWS account ID', () => {
      const config = {
        awsRegion: 'us-east-1',
        awsAccount: '12345', // Too short
        bucketName: 'test-bucket',
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
      };

      expect(() => validateEnvironmentProps(config)).toThrow();
      const result = safeValidateEnvironmentProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('12桁');
      }
    });

    test('rejects CIDR with prefix > 25', () => {
      const config = {
        awsRegion: 'us-east-1',
        awsAccount: '123456789012',
        bucketName: 'test-bucket',
        apiVpcCidr: '10.0.0.0/26',
        onpremiseCidr: '10.1.0.0/16',
      };

      const result = safeValidateEnvironmentProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('/25');
      }
    });

    test('rejects invalid bucket name with uppercase', () => {
      const config = {
        awsRegion: 'us-east-1',
        awsAccount: '123456789012',
        bucketName: 'TestBucket', // Uppercase not allowed
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
      };

      const result = safeValidateEnvironmentProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('小文字');
      }
    });

    test('rejects bucket name with consecutive dots', () => {
      const config = {
        awsRegion: 'us-east-1',
        awsAccount: '123456789012',
        bucketName: 'test..bucket',
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
      };

      const result = safeValidateEnvironmentProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('連続');
      }
    });

    test('rejects empty AWS region', () => {
      const config = {
        awsRegion: '',
        awsAccount: '123456789012',
        bucketName: 'test-bucket',
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
      };

      expect(() => validateEnvironmentProps(config)).toThrow();
    });
  });
});

describe('Transcribe Schema Validation', () => {
  describe('Valid Transcribe Input', () => {
    test('accepts valid minimal input', () => {
      const input = {
        s3Uri: 's3://my-bucket/audio.mp3',
        languageCode: 'ja-JP' as const,
      };

      const result = validateTranscribeInput(input);
      expect(result).toEqual(input);
    });

    test('accepts valid complete input', () => {
      const input = {
        s3Uri: 's3://my-bucket/folder/audio.wav',
        languageCode: 'en-US' as const,
        mediaFormat: 'wav' as const,
        mediaSampleRateHertz: 16000,
        showSpeakerLabels: true,
        maxSpeakerLabels: 5,
      };

      const result = validateTranscribeInput(input);
      expect(result).toEqual(input);
    });
  });

  describe('Invalid Transcribe Input', () => {
    test('rejects invalid S3 URI format', () => {
      const input = {
        s3Uri: 'https://example.com/audio.mp3',
        languageCode: 'ja-JP',
      };

      const result = safeValidateTranscribeInput(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('s3://');
      }
    });

    test('rejects unsupported language code', () => {
      const input = {
        s3Uri: 's3://my-bucket/audio.mp3',
        languageCode: 'invalid-lang',
      };

      expect(() => validateTranscribeInput(input)).toThrow();
    });

    test('rejects invalid sample rate (too low)', () => {
      const input = {
        s3Uri: 's3://my-bucket/audio.mp3',
        languageCode: 'ja-JP',
        mediaSampleRateHertz: 7000,
      };

      const result = safeValidateTranscribeInput(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('8000Hz');
      }
    });

    test('rejects invalid speaker count', () => {
      const input = {
        s3Uri: 's3://my-bucket/audio.mp3',
        languageCode: 'ja-JP',
        maxSpeakerLabels: 15, // Too many
      };

      const result = safeValidateTranscribeInput(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('10人');
      }
    });
  });

  describe('Transcribe Output Validation', () => {
    test('accepts valid output', () => {
      const output = {
        jobName: 'test-job',
        accountId: '123456789012',
        status: 'COMPLETED' as const,
        results: {
          transcripts: [
            {
              transcript: 'Hello, world!',
            },
          ],
        },
      };

      expect(() => validateTranscribeOutput(output)).not.toThrow();
    });

    test('accepts output without results', () => {
      const output = {
        jobName: 'test-job',
        accountId: '123456789012',
        status: 'IN_PROGRESS' as const,
      };

      expect(() => validateTranscribeOutput(output)).not.toThrow();
    });
  });
});

describe('S3 Schema Validation', () => {
  describe('Valid S3 Bucket Configuration', () => {
    test('accepts valid bucket configuration', () => {
      const config = {
        bucketName: 'my-test-bucket',
        objectExpirationDays: 7,
        vpcEndpointId: 'vpce-0123456789abcdef0',
      };

      const result = validateS3BucketProps(config);
      expect(result).toEqual(config);
    });

    test('uses default expiration if not provided', () => {
      const config = {
        bucketName: 'my-test-bucket',
        vpcEndpointId: 'vpce-12345678',
      };

      const result = validateS3BucketProps(config);
      expect(result.objectExpirationDays).toBe(1);
    });
  });

  describe('Invalid S3 Bucket Configuration', () => {
    test('rejects bucket name too short', () => {
      const config = {
        bucketName: 'ab',
        vpcEndpointId: 'vpce-12345678',
      };

      const result = safeValidateS3BucketProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('3文字');
      }
    });

    test('rejects invalid VPC endpoint ID format', () => {
      const config = {
        bucketName: 'my-bucket',
        vpcEndpointId: 'invalid-id',
      };

      const result = safeValidateS3BucketProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('vpce-');
      }
    });

    test('rejects negative expiration days', () => {
      const config = {
        bucketName: 'my-bucket',
        objectExpirationDays: -1,
        vpcEndpointId: 'vpce-12345678',
      };

      expect(() => validateS3BucketProps(config)).toThrow();
    });
  });

  describe('S3 Event Validation', () => {
    test('accepts valid S3 event', () => {
      const event = {
        Records: [
          {
            eventVersion: '2.1',
            eventSource: 'aws:s3' as const,
            awsRegion: 'us-east-1',
            eventTime: '2023-01-01T00:00:00.000Z',
            eventName: 's3:ObjectCreated:Put',
            s3: {
              s3SchemaVersion: '1.0',
              bucket: {
                name: 'my-bucket',
                arn: 'arn:aws:s3:::my-bucket',
              },
              object: {
                key: 'test.txt',
                size: 1024,
              },
            },
          },
        ],
      };

      expect(() => validateS3Event(event)).not.toThrow();
    });
  });
});

describe('VPC Endpoint Schema Validation', () => {
  describe('Valid Transcribe VPC Endpoint', () => {
    test('accepts valid configuration', () => {
      const config = {
        vpc: {
          vpcId: 'vpc-12345678',
        },
        name: 'transcribe-endpoint',
        subnets: [
          { subnetId: 'subnet-12345678' },
          { subnetId: 'subnet-abcdef01' },
        ],
        souceCidr: '10.0.0.0/16',
      };

      const result = validateTranscribeVpcEndpointProps(config);
      expect(result.name).toBe('transcribe-endpoint');
    });

    test('accepts name with underscores and hyphens', () => {
      const config = {
        vpc: { vpcId: 'vpc-12345678' },
        name: 'test_endpoint-1',
        subnets: [{ subnetId: 'subnet-12345678' }],
        souceCidr: '10.0.0.0/16',
      };

      expect(() => validateTranscribeVpcEndpointProps(config)).not.toThrow();
    });
  });

  describe('Invalid Transcribe VPC Endpoint', () => {
    test('rejects invalid VPC ID format', () => {
      const config = {
        vpc: { vpcId: 'invalid-vpc' },
        name: 'test-endpoint',
        subnets: [{ subnetId: 'subnet-12345678' }],
        souceCidr: '10.0.0.0/16',
      };

      const result = safeValidateTranscribeVpcEndpointProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('VPC ID');
      }
    });

    test('rejects invalid subnet ID format', () => {
      const config = {
        vpc: { vpcId: 'vpc-12345678' },
        name: 'test-endpoint',
        subnets: [{ subnetId: 'invalid-subnet' }],
        souceCidr: '10.0.0.0/16',
      };

      const result = safeValidateTranscribeVpcEndpointProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('サブネットID');
      }
    });

    test('rejects empty subnet array', () => {
      const config = {
        vpc: { vpcId: 'vpc-12345678' },
        name: 'test-endpoint',
        subnets: [],
        souceCidr: '10.0.0.0/16',
      };

      const result = safeValidateTranscribeVpcEndpointProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('少なくとも1つ');
      }
    });

    test('rejects name with special characters', () => {
      const config = {
        vpc: { vpcId: 'vpc-12345678' },
        name: 'test@endpoint',
        subnets: [{ subnetId: 'subnet-12345678' }],
        souceCidr: '10.0.0.0/16',
      };

      const result = safeValidateTranscribeVpcEndpointProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('英数字');
      }
    });

    test('rejects invalid CIDR format', () => {
      const config = {
        vpc: { vpcId: 'vpc-12345678' },
        name: 'test-endpoint',
        subnets: [{ subnetId: 'subnet-12345678' }],
        souceCidr: 'invalid-cidr',
      };

      const result = safeValidateTranscribeVpcEndpointProps(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]).toContain('CIDR');
      }
    });
  });

  describe('Valid S3 VPC Endpoint', () => {
    test('accepts valid configuration', () => {
      const config = {
        vpc: { vpcId: 'vpc-12345678' },
        name: 's3-endpoint',
        routeTables: [
          { routeTableId: 'rtb-12345678' },
        ],
      };

      const result = validateS3VpcEndpointProps(config);
      expect(result.name).toBe('s3-endpoint');
    });

    test('accepts configuration without route tables', () => {
      const config = {
        vpc: { vpcId: 'vpc-12345678' },
        name: 's3-endpoint',
      };

      expect(() => validateS3VpcEndpointProps(config)).not.toThrow();
    });
  });

  describe('Invalid S3 VPC Endpoint', () => {
    test('rejects invalid route table ID format', () => {
      const config = {
        vpc: { vpcId: 'vpc-12345678' },
        name: 's3-endpoint',
        routeTables: [{ routeTableId: 'invalid-rtb' }],
      };

      expect(() => validateS3VpcEndpointProps(config)).toThrow();
    });
  });
});

describe('Error Message Localization', () => {
  test('all error messages are in Japanese', () => {
    const testCases = [
      {
        schema: environmentPropsSchema,
        input: { awsAccount: 'invalid' },
        expectedKeyword: '12桁',
      },
      {
        schema: environmentPropsSchema,
        input: { 
          awsRegion: 'us-east-1',
          awsAccount: '123456789012',
          bucketName: 'TestBucket',
          apiVpcCidr: '10.0.0.0/16',
          onpremiseCidr: '10.1.0.0/16',
        },
        expectedKeyword: '小文字',
      },
    ];

    testCases.forEach(({ schema, input, expectedKeyword }) => {
      const result = schema.safeParse(input);
      if (!result.success) {
        const errorMessage = result.error.errors[0].message;
        expect(errorMessage).toContain(expectedKeyword);
      }
    });
  });
});
