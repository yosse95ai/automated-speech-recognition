/**
 * CIDR validation utilities for VPC and subnet configurations
 */

export interface CidrValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates VPC CIDR block prefix length
 * Rejects CIDR blocks with prefix length greater than /25 (i.e., /26, /27, /28, etc.)
 * 
 * @param cidr - CIDR block to validate (e.g., "10.0.0.0/16")
 * @param resourceName - Name of the resource being validated (for error messages)
 * @returns Validation result with error message in Japanese if invalid
 */
export function validateVpcCidr(cidr: string, resourceName: string): CidrValidationResult {
  const prefixLength = extractPrefixLength(cidr);
  
  if (prefixLength === null) {
    return {
      isValid: false,
      errorMessage: `${resourceName}のCIDRブロック形式が不正です: ${cidr}。正しい形式: 10.0.0.0/16`
    };
  }
  
  // VPC CIDR validation: reject prefix length > 25 (i.e., /26, /27, /28, etc. are invalid)
  if (prefixLength > 25) {
    return {
      isValid: false,
      errorMessage: `${resourceName}のCIDRブロックのプレフィックス長が無効です: ${cidr}。` +
        `プレフィックス長は /25 以下である必要があります（現在: /${prefixLength}）。` +
        `/26、/27、/28 などのプレフィックスは使用できません。`
    };
  }
  
  return { isValid: true };
}

/**
 * Validates subnet CIDR mask
 * Rejects CIDR masks with prefix length greater than /27 (i.e., /28, /29, /30, etc.)
 * 
 * @param cidrMask - CIDR mask prefix length (e.g., 24 for /24)
 * @param resourceName - Name of the resource being validated (for error messages)
 * @returns Validation result with error message in Japanese if invalid
 */
export function validateSubnetCidr(cidrMask: number, resourceName: string): CidrValidationResult {
  // Subnet CIDR validation: reject prefix length > 27 (i.e., /28, /29, /30, etc. are invalid)
  if (cidrMask > 27) {
    return {
      isValid: false,
      errorMessage: `${resourceName}のサブネットCIDRマスクが無効です: /${cidrMask}。` +
        `サブネットのプレフィックス長は /27 以下である必要があります。` +
        `/28、/29、/30 などのプレフィックスは使用できません。`
    };
  }
  
  // Additional validation: subnet mask should be reasonable (not too small)
  if (cidrMask < 16) {
    return {
      isValid: false,
      errorMessage: `${resourceName}のサブネットCIDRマスクが無効です: /${cidrMask}。` +
        `サブネットのプレフィックス長は /16 以上である必要があります。`
    };
  }
  
  return { isValid: true };
}

/**
 * Extracts the prefix length from a CIDR block string
 * 
 * @param cidr - CIDR block (e.g., "10.0.0.0/16")
 * @returns Prefix length as number, or null if invalid format
 */
function extractPrefixLength(cidr: string): number | null {
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    return null;
  }
  
  const prefixLength = parseInt(parts[1], 10);
  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return null;
  }
  
  return prefixLength;
}

/**
 * Validates an IP address format
 * 
 * @param ip - IP address to validate
 * @returns true if valid IPv4 address format
 */
function isValidIpAddress(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return false;
  }
  
  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}
