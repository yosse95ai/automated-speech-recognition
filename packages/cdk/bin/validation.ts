import { z } from 'zod';
import { baseSchema } from './environment';

const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

const vpcCidrSchema = z.string()
  .regex(cidrRegex, 'CIDR形式が正しくありません')
  .refine((cidr) => {
    const [ip, prefix] = cidr.split('/');
    const prefixNum = parseInt(prefix, 10);
    const octets = ip.split('.').map(Number);
    
    if (octets.some(octet => octet < 0 || octet > 255)) return false;
    return prefixNum >= 8 && prefixNum <= 25;
  }, 'VPC CIDRは/8から/25までの範囲で指定してください');

const subnetCidrShema = z.number().refine((cidr) => {
  return cidr >= 8 && cidr <= 27;
}, "サブネットのCIDRは/8から/27までの範囲で指定してください");

export const environmentSchema = baseSchema.extend({
  apiVpcCidr: vpcCidrSchema,
  onpremiseCidr: vpcCidrSchema,
  apiVpcSubnetCidr: subnetCidrShema,
}).refine((data) => {
  const vpcPrefix = parseInt(data.apiVpcCidr.split('/')[1], 10);
  return data.apiVpcSubnetCidr > vpcPrefix;
}, {
  message: 'サブネットCIDRはVPC CIDRより小さい範囲である必要があります',
  path: ['apiVpcSubnetCidr']
});

export type EnvironmentProps = z.infer<typeof environmentSchema>;