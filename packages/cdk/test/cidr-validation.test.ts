import { validateVpcCidr, validateSubnetCidr } from '../lib/utils/cidr-validation';

describe('VPC CIDR Validation', () => {
  describe('Valid VPC CIDRs', () => {
    test('accepts /16 CIDR', () => {
      const result = validateVpcCidr('10.0.0.0/16', 'Test VPC');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /24 CIDR', () => {
      const result = validateVpcCidr('10.0.0.0/24', 'Test VPC');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /25 CIDR (boundary case)', () => {
      const result = validateVpcCidr('10.0.0.0/25', 'Test VPC');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /20 CIDR', () => {
      const result = validateVpcCidr('192.168.0.0/20', 'Test VPC');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe('Invalid VPC CIDRs - Prefix Length', () => {
    test('rejects /26 CIDR', () => {
      const result = validateVpcCidr('10.0.0.0/26', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Test VPC');
      expect(result.errorMessage).toContain('/26');
      expect(result.errorMessage).toContain('/25 以下');
    });

    test('rejects /27 CIDR', () => {
      const result = validateVpcCidr('10.0.0.0/27', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/27');
      expect(result.errorMessage).toContain('/25 以下');
    });

    test('rejects /28 CIDR', () => {
      const result = validateVpcCidr('10.0.0.0/28', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/28');
      expect(result.errorMessage).toContain('/25 以下');
    });

    test('rejects /29 CIDR', () => {
      const result = validateVpcCidr('10.0.0.0/29', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/29');
    });

    test('rejects /30 CIDR', () => {
      const result = validateVpcCidr('10.0.0.0/30', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/30');
    });

    test('rejects /32 CIDR', () => {
      const result = validateVpcCidr('10.0.0.0/32', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/32');
    });
  });

  describe('Invalid VPC CIDRs - Format', () => {
    test('rejects CIDR without prefix', () => {
      const result = validateVpcCidr('10.0.0.0', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('形式が不正');
    });

    test('rejects invalid CIDR format', () => {
      const result = validateVpcCidr('invalid', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('形式が不正');
    });

    test('rejects CIDR with invalid prefix length', () => {
      const result = validateVpcCidr('10.0.0.0/abc', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('形式が不正');
    });

    test('rejects CIDR with negative prefix length', () => {
      const result = validateVpcCidr('10.0.0.0/-1', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('形式が不正');
    });

    test('rejects CIDR with prefix length > 32', () => {
      const result = validateVpcCidr('10.0.0.0/33', 'Test VPC');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('形式が不正');
    });
  });
});

describe('Subnet CIDR Validation', () => {
  describe('Valid Subnet CIDRs', () => {
    test('accepts /16 CIDR mask', () => {
      const result = validateSubnetCidr(16, 'Test Subnet');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /24 CIDR mask', () => {
      const result = validateSubnetCidr(24, 'Test Subnet');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /27 CIDR mask (boundary case)', () => {
      const result = validateSubnetCidr(27, 'Test Subnet');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('accepts /20 CIDR mask', () => {
      const result = validateSubnetCidr(20, 'Test Subnet');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe('Invalid Subnet CIDRs - Too Large', () => {
    test('rejects /28 CIDR mask', () => {
      const result = validateSubnetCidr(28, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Test Subnet');
      expect(result.errorMessage).toContain('/28');
      expect(result.errorMessage).toContain('/27 以下');
    });

    test('rejects /29 CIDR mask', () => {
      const result = validateSubnetCidr(29, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/29');
      expect(result.errorMessage).toContain('/27 以下');
    });

    test('rejects /30 CIDR mask', () => {
      const result = validateSubnetCidr(30, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/30');
      expect(result.errorMessage).toContain('/27 以下');
    });

    test('rejects /32 CIDR mask', () => {
      const result = validateSubnetCidr(32, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/32');
    });
  });

  describe('Invalid Subnet CIDRs - Too Small', () => {
    test('rejects /8 CIDR mask', () => {
      const result = validateSubnetCidr(8, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/8');
      expect(result.errorMessage).toContain('/16 以上');
    });

    test('rejects /15 CIDR mask (boundary case)', () => {
      const result = validateSubnetCidr(15, 'Test Subnet');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('/15');
      expect(result.errorMessage).toContain('/16 以上');
    });
  });
});

describe('Error Message Content', () => {
  test('VPC CIDR error message includes resource name', () => {
    const result = validateVpcCidr('10.0.0.0/26', 'My Custom VPC');
    expect(result.errorMessage).toContain('My Custom VPC');
  });

  test('VPC CIDR error message includes current prefix length', () => {
    const result = validateVpcCidr('10.0.0.0/27', 'Test VPC');
    expect(result.errorMessage).toContain('/27');
  });

  test('VPC CIDR error message mentions invalid prefix examples', () => {
    const result = validateVpcCidr('10.0.0.0/28', 'Test VPC');
    expect(result.errorMessage).toContain('/26');
    expect(result.errorMessage).toContain('/27');
    expect(result.errorMessage).toContain('/28');
  });

  test('Subnet CIDR error message includes resource name', () => {
    const result = validateSubnetCidr(28, 'My Private Subnet');
    expect(result.errorMessage).toContain('My Private Subnet');
  });

  test('Subnet CIDR error message includes current prefix length', () => {
    const result = validateSubnetCidr(29, 'Test Subnet');
    expect(result.errorMessage).toContain('/29');
  });

  test('Subnet CIDR error message mentions invalid prefix examples', () => {
    const result = validateSubnetCidr(30, 'Test Subnet');
    expect(result.errorMessage).toContain('/28');
    expect(result.errorMessage).toContain('/29');
    expect(result.errorMessage).toContain('/30');
  });
});
