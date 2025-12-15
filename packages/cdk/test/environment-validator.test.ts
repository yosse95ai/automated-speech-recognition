/**
 * Unit tests for Zod-based EnvironmentValidator
 */

import { EnvironmentValidator } from '../lib/validators/environment-validator';

describe('EnvironmentValidator with Zod', () => {
  describe('Valid Configurations', () => {
    test('validates correct CIDR blocks', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors).toEqual([]);
    });

    test('validates /24 CIDR blocks', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/24',
        onpremiseCidr: '192.168.1.0/24',
      });

      const errors = validator.validate();
      expect(errors).toEqual([]);
    });

    test('validates /25 CIDR blocks (boundary case)', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/25',
        onpremiseCidr: '172.16.0.0/25',
      });

      const errors = validator.validate();
      expect(errors).toEqual([]);
    });

    test('validates different valid CIDR ranges', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '172.31.0.0/20',
        onpremiseCidr: '192.168.0.0/22',
      });

      const errors = validator.validate();
      expect(errors).toEqual([]);
    });
  });

  describe('Invalid Configurations - CIDR Prefix Too Large', () => {
    test('rejects /26 API VPC CIDR', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/26',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('API VPC');
      expect(errors[0]).toContain('/25');
    });

    test('rejects /27 onpremise CIDR', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/27',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('オンプレミス VPC');
      expect(errors[0]).toContain('/25');
    });

    test('rejects /28 CIDR blocks', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/28',
        onpremiseCidr: '10.1.0.0/28',
      });

      const errors = validator.validate();
      expect(errors.length).toBe(2);
      errors.forEach(error => {
        expect(error).toContain('/25');
      });
    });

    test('rejects /32 CIDR block', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/32',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('API VPC');
    });
  });

  describe('Invalid Configurations - Format Errors', () => {
    test('rejects CIDR without prefix', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('API VPC');
      expect(errors[0]).toContain('形式');
    });

    test('rejects invalid CIDR format', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: 'invalid-cidr',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('API VPC');
    });

    test('rejects CIDR with invalid prefix length', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/abc',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThan(0);
    });

    test('rejects CIDR with negative prefix', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/-1',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThan(0);
    });

    test('rejects CIDR with prefix > 32', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/33',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('オンプレミス VPC');
    });
  });

  describe('Multiple Errors', () => {
    test('reports errors for both invalid CIDRs', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/26',
        onpremiseCidr: '10.1.0.0/27',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThanOrEqual(2);
      expect(errors.some(e => e.includes('API VPC'))).toBe(true);
      expect(errors.some(e => e.includes('オンプレミス VPC'))).toBe(true);
    });

    test('reports all format errors', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: 'invalid',
        onpremiseCidr: 'also-invalid',
      });

      const errors = validator.validate();
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Static Validation Methods', () => {
    test('validateProps succeeds with valid data', () => {
      const props = {
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
      };

      const result = EnvironmentValidator.validateProps(props);
      expect(result).toEqual(props);
    });

    test('validateProps throws with invalid data', () => {
      const props = {
        apiVpcCidr: '10.0.0.0/26',
        onpremiseCidr: '10.1.0.0/16',
      };

      expect(() => EnvironmentValidator.validateProps(props)).toThrow();
    });

    test('safeValidateProps returns success for valid data', () => {
      const props = {
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
      };

      const result = EnvironmentValidator.safeValidateProps(props);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(props);
      }
    });

    test('safeValidateProps returns errors for invalid data', () => {
      const props = {
        apiVpcCidr: '10.0.0.0/26',
        onpremiseCidr: '10.1.0.0/27',
      };

      const result = EnvironmentValidator.safeValidateProps(props);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.includes('API VPC'))).toBe(true);
        expect(result.errors.some(e => e.includes('オンプレミス VPC'))).toBe(true);
      }
    });
  });

  describe('Japanese Error Messages', () => {
    test('error messages are in Japanese', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/26',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors[0]).toMatch(/API VPC.*25.*以下/);
    });

    test('format error messages are in Japanese', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: 'invalid',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors[0]).toContain('形式');
    });
  });

  describe('Backward Compatibility', () => {
    test('maintains same interface as legacy validator', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
      });

      // Should have validate() method returning string[]
      expect(typeof validator.validate).toBe('function');
      const errors = validator.validate();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.every(e => typeof e === 'string')).toBe(true);
    });

    test('empty array indicates success like legacy validator', () => {
      const validator = new EnvironmentValidator({
        apiVpcCidr: '10.0.0.0/16',
        onpremiseCidr: '10.1.0.0/16',
      });

      const errors = validator.validate();
      expect(errors).toEqual([]);
    });
  });
});
