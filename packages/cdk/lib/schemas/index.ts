/**
 * Zod-based validation schemas for automated-speech-recognition
 * 
 * This module provides comprehensive type-safe validation for:
 * - Environment configuration
 * - Transcribe input/output
 * - S3 bucket configuration
 * - VPC endpoint configuration
 * 
 * All error messages are provided in Japanese for consistency with the codebase.
 */

export * from './environment.schema';
export * from './transcribe.schema';
export * from './s3.schema';
export * from './vpc-endpoint.schema';
