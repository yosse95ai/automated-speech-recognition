import { IValidation } from 'aws-cdk-lib';
import { validateVpcCidr } from '../utils/cidr-validation';

/**
 * Environment configuration validator
 * Validates environment properties at stack synthesis time
 */
export interface EnvironmentValidatorProps {
  apiVpcCidr: string;
  onpremiseCidr: string;
}

/**
 * Validator for environment configuration
 * Implements CDK IValidation interface for early validation
 */
export class EnvironmentValidator implements IValidation {
  private readonly props: EnvironmentValidatorProps;

  constructor(props: EnvironmentValidatorProps) {
    this.props = props;
  }

  /**
   * Validates environment configuration
   * Returns array of error messages (empty array if valid)
   */
  validate(): string[] {
    const errors: string[] = [];

    // Validate API VPC CIDR
    const apiVpcValidation = validateVpcCidr(this.props.apiVpcCidr, 'API VPC');
    if (!apiVpcValidation.isValid) {
      errors.push(apiVpcValidation.errorMessage!);
    }

    // Validate Onpremise VPC CIDR
    const onpremValidation = validateVpcCidr(this.props.onpremiseCidr, 'オンプレミス VPC');
    if (!onpremValidation.isValid) {
      errors.push(onpremValidation.errorMessage!);
    }

    return errors;
  }
}
