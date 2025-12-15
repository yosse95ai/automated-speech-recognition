import { IValidation } from 'aws-cdk-lib';
import { validateVpcCidr, validateVpcCidrWithZod } from '../utils/cidr-validation';
import { z } from 'zod';
import { vpcCidrSchema } from '../utils/cidr-validation';

/**
 * Environment configuration validator
 * Validates environment properties at stack synthesis time
 * 
 * This validator now uses Zod for type-safe runtime validation
 * while maintaining backward compatibility with the CDK IValidation interface.
 */
export interface EnvironmentValidatorProps {
  apiVpcCidr: string;
  onpremiseCidr: string;
}

/**
 * Zod schema for environment validator props
 */
export const environmentValidatorPropsSchema = z.object({
  apiVpcCidr: vpcCidrSchema,
  onpremiseCidr: vpcCidrSchema,
});

/**
 * Validator for environment configuration
 * Implements CDK IValidation interface for early validation
 * 
 * This class now uses Zod-based validation internally while maintaining
 * the same external interface for backward compatibility.
 */
export class EnvironmentValidator implements IValidation {
  private readonly props: EnvironmentValidatorProps;

  constructor(props: EnvironmentValidatorProps) {
    this.props = props;
  }

  /**
   * Validates environment configuration using Zod
   * Returns array of error messages (empty array if valid)
   */
  validate(): string[] {
    const errors: string[] = [];

    // Validate using Zod schema
    const result = environmentValidatorPropsSchema.safeParse(this.props);
    
    if (!result.success) {
      result.error.errors.forEach(err => {
        const fieldName = err.path[0] === 'apiVpcCidr' ? 'API VPC' : 'オンプレミス VPC';
        errors.push(`${fieldName}の${err.message}`);
      });
      return errors;
    }

    // Legacy validation for additional checks (optional, can be removed if Zod covers everything)
    const apiVpcValidation = validateVpcCidr(this.props.apiVpcCidr, 'API VPC');
    if (!apiVpcValidation.isValid) {
      // Only add if not already reported by Zod
      if (!errors.some(e => e.includes('API VPC'))) {
        errors.push(apiVpcValidation.errorMessage!);
      }
    }

    const onpremValidation = validateVpcCidr(this.props.onpremiseCidr, 'オンプレミス VPC');
    if (!onpremValidation.isValid) {
      // Only add if not already reported by Zod
      if (!errors.some(e => e.includes('オンプレミス VPC'))) {
        errors.push(onpremValidation.errorMessage!);
      }
    }

    return errors;
  }

  /**
   * Static method to validate props and throw on error
   * Provides a more convenient API for validation
   */
  static validateProps(props: unknown): EnvironmentValidatorProps {
    return environmentValidatorPropsSchema.parse(props);
  }

  /**
   * Static method to safely validate props without throwing
   * Returns result object with success flag and data or errors
   */
  static safeValidateProps(props: unknown) {
    const result = environmentValidatorPropsSchema.safeParse(props);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => {
        const fieldName = err.path[0] === 'apiVpcCidr' ? 'API VPC' : 'オンプレミス VPC';
        return `${fieldName}の${err.message}`;
      });
      return { success: false as const, errors };
    }
    
    return { success: true as const, data: result.data };
  }
}
