import { EC2Client, paginateDescribeSubnets } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

export type SubnetModel = {
  id: string
  name: string | undefined
  vpcId: string
  az: string
  v4Cidr: string
  availableIps: number
}
export async function getAllSubnets(): Promise<SubnetModel[]> {
  const response = await combineAllPages(paginateDescribeSubnets({ client }, {}), it => it.Subnets)
  return (
    response.map(subnet => ({
      id: subnet.SubnetId ?? 'unknown-subnet',
      name: subnet.Tags?.find(it => it.Key == 'Name')?.Value,
      vpcId: subnet.VpcId ?? '?vpc',
      az: subnet.AvailabilityZone ?? '?az',
      v4Cidr: subnet.CidrBlock ?? 'cidrv4',
      availableIps: subnet.AvailableIpAddressCount ?? 0,
    })) ?? []
  )
}
