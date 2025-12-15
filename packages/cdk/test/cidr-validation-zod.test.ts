/**
 * Unit tests for Zod-enhanced CIDR validation utilities
 */

import {
  validateVpcCidrWithZod,
  validateSubnetCidrWithZod,
  vpcCidrSchema,
  subnetCidrMaskSchema,
} from '../lib/utils/cidr-validation';

describe('Zod-based VPC CIDR Validation', () => {
  describe('Valid VPC CIDRs with Zod', () => {
    test('accepts /16 CIDR', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/16', 'Test VPC');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /24 CIDR', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/24', 'Test VPC');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /25 CIDR (boundary case)', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/25', 'Test VPC');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /20 CIDR', () => {
      const result = validateVpcCidrWithZod('192.168.0.0/20', 'Test VPC');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts various valid IP ranges', () => {
      const validCidrs = [
        '172.31.0.0/16',
        '192.168.1.0/24',
        '10.10.10.0/25',
      ];

      validCidrs.forEach(cidr => {
        const result = validateVpcCidrWithZod(cidr, 'Test VPC');
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Invalid VPC CIDRs - Prefix Length with Zod', () => {
    test('rejects /26 CIDR', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/26', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Test VPC');
      expect(result.errorMessage).toContain('/25');
    });

    test('rejects /27 CIDR', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/27', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/27');
    });

    test('rejects /28 CIDR', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/28', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/28');
    });

    test('rejects /32 CIDR', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/32', 'Test VPC');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Invalid VPC CIDRs - Format with Zod', () => {
    test('rejects CIDR without prefix', () => {
      const result = validateVpcCidrWithZod('10.0.0.0', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('形式');
    });

    test('rejects invalid CIDR format', () => {
      const result = validateVpcCidrWithZod('invalid', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('形式');
    });

    test('rejects CIDR with invalid prefix length', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/abc', 'Test VPC');
      expect(result.isValid).toBe(false);
    });

    test('rejects CIDR with negative prefix', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/-1', 'Test VPC');
      expect(result.isValid).toBe(false);
    });

    test('rejects CIDR with prefix > 32', () => {
      const result = validateVpcCidrWithZod('10.0.0.0/33', 'Test VPC');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Direct Zod Schema Usage', () => {
    test('vpcCidrSchema validates directly', () => {
      const validResult = vpcCidrSchema.safeParse('10.0.0.0/16');
      expect(validResult.success).toBe(true);

      const invalidResult = vpcCidrSchema.safeParse('10.0.0.0/26');
      expect(invalidResult.success).toBe(false);
    });

    test('vpcCidrSchema provides Japanese error messages', () => {
      const result = vpcCidrSchema.safeParse('10.0.0.0/26');
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('VPC');
        expect(result.error.errors[0].message).toContain('/25');
      }
    });
  });
});

describe('Zod-based Subnet CIDR Validation', () => {
  describe('Valid Subnet CIDRs with Zod', () => {
    test('accepts /16 CIDR mask', () => {
      const result = validateSubnetCidrWithZod(16, 'Test Subnet');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /24 CIDR mask', () => {
      const result = validateSubnetCidrWithZod(24, 'Test Subnet');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /27 CIDR mask (boundary case)', () => {
      const result = validateSubnetCidrWithZod(27, 'Test Subnet');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /20 CIDR mask', () => {
      const result = validateSubnetCidrWithZod(20, 'Test Subnet');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts range of valid masks', () => {
      for (let mask = 16; mask <= 27; mask++) {
        const result = validateSubnetCidrWithZod(mask, 'Test Subnet');
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('Invalid Subnet CIDRs - Too Large with Zod', () => {
    test('rejects /28 CIDR mask', () => {
      const result = validateSubnetCidrWithZod(28, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Test Subnet');
      expect(result.errorMessage).toContain('/28');
      expect(result.errorMessage).toContain('/27');
    });

    test('rejects /29 CIDR mask', () => {
      const result = validateSubnetCidrWithZod(29, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/29');
    });

    test('rejects /30 CIDR mask', () => {
      const result = validateSubnetCidrWithZod(30, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/30');
    });

    test('rejects /32 CIDR mask', () => {
      const result = validateSubnetCidrWithZod(32, 'Test Subnet');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Invalid Subnet CIDRs - Too Small with Zod', () => {
    test('rejects /8 CIDR mask', () => {
      const result = validateSubnetCidrWithZod(8, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/16');
    });

    test('rejects /15 CIDR mask (boundary case)', () => {
      const result = validateSubnetCidrWithZod(15, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/16');
    });
  });

  describe('Direct Zod Schema Usage for Subnet', () => {
    test('subnetCidrMaskSchema validates directly', () => {
      const validResult = subnetCidrMaskSchema.safeParse(24);
      expect(validResult.success).toBe(true);

      const invalidResult = subnetCidrMaskSchema.safeParse(28);
      expect(invalidResult.success).toBe(false);
    });

    test('subnetCidrMaskSchema provides Japanese error messages', () => {
      const result = subnetCidrMaskSchema.safeParse(28);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('/27');
      }
    });
  });
});

describe('Error Message Consistency', () => {
  test('VPC CIDR error includes resource name', () => {
    const result = validateVpcCidrWithZod('10.0.0.0/26', 'My Custom VPC');
    expect(result.errorMessage).toContain('My Custom VPC');
  });

  test('Subnet CIDR error includes resource name', () => {
    const result = validateSubnetCidrWithZod(28, 'My Private Subnet');
    expect(result.errorMessage).toContain('My Private Subnet');
  });

  test('All error messages are in Japanese', () => {
    const vpcResult = validateVpcCidrWithZod('10.0.0.0/26', 'Test');
    const subnetResult = validateSubnetCidrWithZod(28, 'Test');
    const formatResult = validateVpcCidrWithZod('invalid', 'Test');

    expect(vpcResult.errorMessage).toMatch(/[ぁ-ん]|[ァ-ン]|[一-龯]/);
    expect(subnetResult.errorMessage).toMatch(/[ぁ-ん]|[ァ-ン]|[一-龯]/);
    expect(formatResult.errorMessage).toMatch(/[ぁ-ん]|[ァ-ン]|[一-龯]/);
  });
});

describe('Backward Compatibility', () => {
  test('Zod validation returns same structure as legacy', () => {
    const zodResult = validateVpcCidrWithZod('10.0.0.0/16', 'Test');
    
    expect(zodResult).toHaveProperty('isValid');
    expect(typeof zodResult.isValid).toBe('boolean');
    
    if (!zodResult.isValid) {
      expect(zodResult).toHaveProperty('errorMessage');
      expect(typeof zodResult.errorMessage).toBe('string');
    }
  });

  test('Success result matches legacy format', () => {
    const result = validateVpcCidrWithZod('10.0.0.0/16', 'Test');
    expect(result).toEqual({ isValid: true });
  });

  test('Error result matches legacy format', () => {
    const result = validateVpcCidrWithZod('10.0.0.0/26', 'Test');
    expect(result.isValid).toBe(false);
    expect(typeof result.errorMessage).toBe('string');
    expect(result.errorMessage!.length).toBeGreaterThan(0);
  });
});
